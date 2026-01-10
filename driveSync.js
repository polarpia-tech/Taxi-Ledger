/* driveSync.js — Google Drive backup (optional)
   - Manual sign-in (NO auto popups on refresh)
   - Auto-sync only if enabled + token already present
*/

window.DriveSync = (() => {
  // ====== SET THESE ======
  const CLIENT_ID = "PUT_YOUR_CLIENT_ID.apps.googleusercontent.com";
  const API_KEY   = "PUT_YOUR_API_KEY";
  // =======================

  const SCOPES = "https://www.googleapis.com/auth/drive.appdata";
  const DISCOVERY = "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest";
  const FILE_NAME = "taxi-ledger-backup.json";

  let state = {
    enabled: JSON.parse(localStorage.getItem("tls_sync_enabled") || "false"),
    accessToken: null,
    expiresAt: 0,
    online: navigator.onLine,
    syncing: false,
    lastSyncAt: Number(localStorage.getItem("tls_lastSyncAt") || "0") || 0,
  };

  let tokenClient = null;
  let gsiLoaded = false;
  let gapiLoaded = false;
  let initPromise = null;

  function emit(name, detail){
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function setEnabled(v){
    state.enabled = !!v;
    localStorage.setItem("tls_sync_enabled", JSON.stringify(state.enabled));
    emit("taxiledger:syncStatus");
  }

  function getState(){
    return { ...state };
  }

  function setToken(token, expiresIn){
    state.accessToken = token;
    state.expiresAt = Date.now() + (expiresIn * 1000);
    emit("taxiledger:syncStatus");
  }

  function clearToken(){
    state.accessToken = null;
    state.expiresAt = 0;
    emit("taxiledger:syncStatus");
  }

  function isTokenValid(){
    return !!state.accessToken && Date.now() < (state.expiresAt - 20_000);
  }

  function loadScript(src){
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.defer = true;
      s.onload = () => resolve(true);
      s.onerror = () => reject(new Error("Failed to load: " + src));
      document.head.appendChild(s);
    });
  }

  async function init(){
    if (initPromise) return initPromise;

    initPromise = (async () => {
      // Load GSI + GAPI
      if (!gsiLoaded){
        await loadScript("https://accounts.google.com/gsi/client");
        gsiLoaded = true;
      }
      if (!gapiLoaded){
        await loadScript("https://apis.google.com/js/api.js");
        gapiLoaded = true;
      }

      await new Promise((resolve) => {
        window.gapi.load("client", resolve);
      });

      await window.gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: [DISCOVERY],
      });

      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (resp) => {
          if (resp && resp.access_token){
            setToken(resp.access_token, resp.expires_in || 3600);
          } else {
            emit("taxiledger:syncLog", { msg:"No token received", resp });
          }
        }
      });

      emit("taxiledger:syncStatus");
      return true;
    })();

    return initPromise;
  }

  async function signIn({ forcePrompt=false } = {}){
    await init();
    return new Promise((resolve) => {
      // prompt: "consent" forces account picker. We avoid it unless user explicitly wants.
      tokenClient.requestAccessToken({ prompt: forcePrompt ? "consent" : "" });
      // callback updates state
      setTimeout(() => resolve(true), 400);
    });
  }

  function signOut(){
    clearToken();
  }

  async function findOrCreateFileId(){
    // Search in appDataFolder
    const q = `name='${FILE_NAME.replace(/'/g,"\\'")}' and trashed=false`;
    const res = await window.gapi.client.drive.files.list({
      spaces: "appDataFolder",
      q,
      fields: "files(id,name,modifiedTime)"
    });
    const files = (res.result && res.result.files) || [];
    if (files.length) return files[0].id;

    // Create
    const createRes = await window.gapi.client.drive.files.create({
      resource: { name: FILE_NAME, parents: ["appDataFolder"] },
      fields: "id"
    });
    return createRes.result.id;
  }

  async function uploadJson(fileId, jsonText){
    const boundary = "-------314159265358979323846";
    const delimiter = "\r\n--" + boundary + "\r\n";
    const closeDelim = "\r\n--" + boundary + "--";

    const metadata = {
      name: FILE_NAME,
      mimeType: "application/json",
      parents: ["appDataFolder"]
    };

    const multipartRequestBody =
      delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      "Content-Type: application/json\r\n\r\n" +
      jsonText +
      closeDelim;

    const path = fileId
      ? `/upload/drive/v3/files/${fileId}?uploadType=multipart`
      : `/upload/drive/v3/files?uploadType=multipart`;

    const method = fileId ? "PATCH" : "POST";

    return window.gapi.client.request({
      path,
      method,
      headers: {
        "Content-Type": `multipart/related; boundary="${boundary}"`,
      },
      body: multipartRequestBody,
    });
  }

  async function downloadJson(fileId){
    const res = await window.gapi.client.drive.files.get({
      fileId,
      alt: "media"
    });
    // gapi returns parsed JSON sometimes; normalize to text
    if (typeof res.body === "string") return res.body;
    try { return JSON.stringify(res.body); } catch { return String(res.body); }
  }

  async function syncNow({ reason="manual" } = {}){
    await init();
    if (!isTokenValid()){
      emit("taxiledger:syncLog", { msg:"No valid token for sync" });
      return { ok:false, err:"no_token" };
    }

    state.syncing = true;
    emit("taxiledger:syncStatus");

    try{
      window.gapi.client.setToken({ access_token: state.accessToken });

      const days = await TaxiDB.getAllDays();
      const payload = {
        app: "TaxiLedger",
        version: 1,
        exportedAt: Date.now(),
        days
      };
      const jsonText = JSON.stringify(payload);

      const fileId = await findOrCreateFileId();
      await uploadJson(fileId, jsonText);

      state.lastSyncAt = Date.now();
      localStorage.setItem("tls_lastSyncAt", String(state.lastSyncAt));
      emit("taxiledger:syncLog", { msg:`Synced (${reason})`, count: days.length });
      return { ok:true };
    } catch(err){
      emit("taxiledger:syncLog", { msg:"Sync error", err: String(err) });
      return { ok:false, err:String(err) };
    } finally {
      state.syncing = false;
      emit("taxiledger:syncStatus");
    }
  }

  async function restoreNow(){
    await init();
    if (!isTokenValid()){
      return { ok:false, err:"no_token" };
    }

    state.syncing = true;
    emit("taxiledger:syncStatus");

    try{
      window.gapi.client.setToken({ access_token: state.accessToken });
      const fileId = await findOrCreateFileId();
      const body = await downloadJson(fileId);

      const data = JSON.parse(body || "{}");
      const days = Array.isArray(data.days) ? data.days : [];
      const mergedCount = await TaxiDB.mergeMany(days);

      emit("taxiledger:syncLog", { msg:"Restored", mergedCount });
      state.lastSyncAt = Date.now();
      localStorage.setItem("tls_lastSyncAt", String(state.lastSyncAt));
      return { ok:true, mergedCount };
    } catch(err){
      emit("taxiledger:syncLog", { msg:"Restore error", err: String(err) });
      return { ok:false, err:String(err) };
    } finally {
      state.syncing = false;
      emit("taxiledger:syncStatus");
    }
  }

  // schedule helper (used by app autosave)
  let timer = null;
  function scheduleSync(ms=1200, reason="auto"){
    if (!state.enabled) return;
    if (!isTokenValid()) return; // important: NO popup
    clearTimeout(timer);
    timer = setTimeout(() => syncNow({reason}), ms);
  }

  function refreshOnline(){
    state.online = navigator.onLine;
    emit("taxiledger:syncStatus");
  }
  window.addEventListener("online", refreshOnline);
  window.addEventListener("offline", refreshOnline);

  return {
    init,
    getState,
    setEnabled,
    signIn,
    signOut,
    syncNow,
    restoreNow,
    scheduleSync,
  };
})();