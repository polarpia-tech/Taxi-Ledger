"use strict";

const DriveSync = (() => {
  // ΑΝΤΙΚΑΤΑΣΤΗΣΕ ΤΟ CLIENT_ID ΜΕ ΤΟ ΔΙΚΟ ΣΟΥ ΑΠΟ ΤΟ GOOGLE CLOUD CONSOLE
  const CLIENT_ID = "ΤΟ_ΔΙΚΟ_ΣΟΥ_CLIENT_ID.apps.googleusercontent.com";
  const SCOPES = "https://www.googleapis.com/auth/drive.appdata";
  const DISCOVERY_DOC = "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest";

  let tokenClient;
  let accessToken = localStorage.getItem("google_drive_token") || null;
  let syncEnabled = localStorage.getItem("google_drive_enabled") === "true";

  // Αρχικοποίηση του Google Identity Services
  function init() {
    try {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (resp) => {
          if (resp.error) return console.error(resp);
          accessToken = resp.access_token;
          localStorage.setItem("google_drive_token", accessToken); // Αποθήκευση για να μην χάνεται
          console.log("Σύνδεση επιτυχής!");
          if (window.paintSyncUI) window.paintSyncUI();
        },
      });
      
      // Φόρτωση του gapi για το Drive API
      gapi.load('client', async () => {
        await gapi.client.init({ discoveryDocs: [DISCOVERY_DOC] });
        if (accessToken) {
          gapi.client.setToken({ access_token: accessToken });
        }
      });
    } catch (e) {
      console.error("Google Auth Init Error:", e);
    }
  }

  async function signIn() {
    if (!tokenClient) init();
    tokenClient.requestAccessToken({ prompt: 'none' }); // Προσπάθεια χωρίς popup αν είναι ήδη εγκεκριμένο
  }

  function getState() {
    return {
      accessToken: accessToken,
      enabled: syncEnabled
    };
  }

  async function syncNow() {
    if (!accessToken) {
      tokenClient.requestAccessToken();
      return;
    }
    
    try {
      const data = await TaxiDB.getAllDays();
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      
      // Αναζήτηση αν υπάρχει ήδη το αρχείο στο Drive
      const res = await gapi.client.drive.files.list({
        q: "name = 'taxi_ledger_backup.json' and dipped = 'appDataFolder'",
        spaces: 'appDataFolder'
      });

      const fileId = res.result.files.length > 0 ? res.result.files[0].id : null;
      
      if (fileId) {
        // Ενημέρωση υπάρχοντος αρχείου
        await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${accessToken}` },
          body: blob
        });
      } else {
        // Δημιουργία νέου αρχείου
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
      console.error("Sync Error:", e);
      if (e.status === 401) { // Αν το token έληξε
        accessToken = null;
        localStorage.removeItem("google_drive_token");
        signIn();
      }
    }
  }

  // Εκκίνηση κατά τη φόρτωση του script
  setTimeout(init, 1000);

  return { signIn, syncNow, getState };
})();
