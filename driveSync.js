"use strict";

const DriveSync = (() => {
  const CLIENT_ID = "103553412574-688m910d6596u03b60i4qis7p1f03t5n.apps.googleusercontent.com";
  const SCOPES = "https://www.googleapis.com/auth/drive.appdata";
  const DISCOVERY_DOC = "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest";

  let tokenClient;
  let accessToken = localStorage.getItem("google_drive_token") || null;

  function init() {
    if (typeof google === 'undefined') {
      setTimeout(init, 1000);
      return;
    }
    try {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (resp) => {
          if (resp.error) return;
          accessToken = resp.access_token;
          localStorage.setItem("google_drive_token", accessToken);
          if (window.paintSyncUI) window.paintSyncUI();
        },
      });

      gapi.load('client', async () => {
        await gapi.client.init({ discoveryDocs: [DISCOVERY_DOC] });
        if (accessToken) gapi.client.setToken({ access_token: accessToken });
      });
    } catch (e) { console.error("Drive Init Error"); }
  }

  async function syncNow() {
    if (!accessToken) {
      if(tokenClient) tokenClient.requestAccessToken();
      return;
    }
    try {
      const data = await TaxiDB.getAllDays();
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      
      const res = await gapi.client.drive.files.list({
        q: "name = 'taxi_ledger_backup.json'",
        spaces: 'appDataFolder'
      });

      const fileId = res.result.files.length > 0 ? res.result.files[0].id : null;

      if (fileId) {
        await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${accessToken}` },
          body: blob
        });
      } else {
        const metadata = { name: 'taxi_ledger_backup.json', parents: ['appDataFolder'] };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', blob);

        await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}` },
          body: form
        });
      }
      alert("Ο συγχρονισμός ολοκληρώθηκε! ✅");
    } catch (e) {
      console.error(e);
      alert("Αποτυχία συγχρονισμού. Δοκίμασε πάλι τη Σύνδεση.");
    }
  }

  // Εκκίνηση
  setTimeout(init, 1500);

  return {
    signIn: () => { if(tokenClient) tokenClient.requestAccessToken(); },
    syncNow: syncNow,
    getState: () => ({ accessToken })
  };
})();
