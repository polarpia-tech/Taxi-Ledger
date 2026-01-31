"use strict";

const DriveSync = (() => {
  const CLIENT_ID = "103553412574-688m910d6596u03b60i4qis7p1f03t5n.apps.googleusercontent.com";
  const SCOPES = "https://www.googleapis.com/auth/drive.appdata";
  const DISCOVERY_DOC = "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest";

  let tokenClient;
  let accessToken = localStorage.getItem("google_drive_token") || null;

  function init() {
    if (typeof google === 'undefined') {
      setTimeout(init, 500); // Ξαναδοκίμασε σε μισό δευτερόλεπτο αν η Google δεν είναι έτοιμη
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
          syncNow(); // Ξεκίνα το sync αμέσως μετά το login
        },
      });

      gapi.load('client', async () => {
        await gapi.client.init({ discoveryDocs: [DISCOVERY_DOC] });
        if (accessToken) {
          gapi.client.setToken({ access_token: accessToken });
          if (window.paintSyncUI) window.paintSyncUI();
        }
      });
    } catch (e) { console.error("Drive Init Error:", e); }
  }

  function signIn() {
    if (!tokenClient) {
      alert("Η υπηρεσία Google Drive φορτώνει... Δοκίμασε σε 2 δευτερόλεπτα.");
      init();
      return;
    }
    tokenClient.requestAccessToken({ prompt: accessToken ? '' : 'select_account' });
  }

  async function syncNow() {
    if (!accessToken) {
      signIn();
      return;
    }

    try {
      const data = await TaxiDB.getAllDays();
      if (!data.length) {
        alert("Δεν υπάρχουν δεδομένα για συγχρονισμό.");
        return;
      }

      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      
      const res = await gapi.client.drive.files.list({
        q: "name = 'taxi_ledger_backup.json' and spaces = 'appDataFolder'",
        spaces: 'appDataFolder'
      });

      const files = res.result.files;
      const fileId = files.length > 0 ? files[0].id : null;

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
          headers: { '
