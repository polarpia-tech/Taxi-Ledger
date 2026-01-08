// Google Drive Auto-Sync (AppDataFolder)
// Scope: https://www.googleapis.com/auth/drive.appdata
// Uses Google Identity Services token client (access token, renews as needed)

(function(){
  const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
  const FILE_NAME = "taxi-ledger-data.json";
  const API = "https://www.googleapis.com/drive/v3";
  const UPLOAD = "https://www.googleapis.com/upload/drive/v3";

  const state = {
    clientId: null,
    tokenClient: null,
    accessToken: null,
    fileId: null,
    enabled: true,
    lastSyncAt: 0,
    syncing: false,
    online: navigator.onLine
  };

  function now(){ return Date.now(); }

  function log(msg){
    window.dispatchEvent(new CustomEvent("taxiledger:syncLog",{detail:msg}));
  }
  function status(obj){
    window.dispatchEvent(new CustomEvent("taxiledger:syncStatus",{detail:obj}));
  }

  function setOnline(v){
    state.online = v;
    status({online:v});
  }

  window.addEventListener("online", ()=>setOnline(true));
  window.addEventListener("offline", ()=>setOnline(false));

  function authReady(){
    return !!(state.tokenClient && state.clientId);
  }

  async function ensureGisLoaded(){
    // script is loaded in index.html; this is just a guard
    if (window.google && window.google.accounts && window.google.accounts.oauth2) return;
    throw new Error("Google Identity Services δεν φορτώθηκε.");
  }

  function init({clientId}){
    state.clientId = clientId;

    // Allow user to toggle sync later (optional)
    const saved = localStorage.getItem("taxi_sync_enabled");
    if (saved === "0") state.enabled = false;

    ensureGisLoaded().then(()=>{
      state.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: state.clientId,
        scope: DRIVE_SCOPE,
        callback: (resp) => {
          if (resp && resp.access_token){
            state.accessToken = resp.access_token;
            log("Συνδέθηκες στο Google ✅");
            status({signedIn:true});
          } else {
            log("Απέτυχε η σύνδεση Google.");
          }
        }
      });

      status({ready:true, signedIn:false, enabled:state.enabled, online:state.online});
    });
  }

  function signIn({forcePrompt=false}={}){
    if (!authReady()) return;
    // prompt: '' tries silent if already granted; 'consent' forces UI
    state.tokenClient.requestAccessToken({ prompt: forcePrompt ? "consent" : "" });
  }

  function signOut(){
    state.accessToken = null;
    state.fileId = null;
    status({signedIn:false});
  }

  function setEnabled(v){
    state.enabled = !!v;
    localStorage.setItem("taxi_sync_enabled", state.enabled ? "1" : "0");
    status({enabled:state.enabled});
  }

  async function apiFetch(url, options={}){
    if (!state.accessToken) throw new Error("Δεν υπάρχει access token.");
    const headers = Object.assign({}, options.headers || {}, {
      "Authorization": `Bearer ${state.accessToken}`
    });
    return fetch(url, {...options, headers});
  }

  async function findOrCreateFile(){
    if (state.fileId) return state.fileId;

    // Search in appDataFolder by name
    const q = encodeURIComponent(`name='${FILE_NAME.replace(/'/g,"\\'")}' and trashed=false`);
    const url = `${API}/files?spaces=appDataFolder&fields=files(id,name,modifiedTime)&q=${q}`;

    const r = await apiFetch(url);
    if (!r.ok) throw new Error("Drive list failed");
    const j = await r.json();
    const f = (j.files || [])[0];

    if (f && f.id){
      state.fileId = f.id;
      return state.fileId;
    }

    // Create empty file in appDataFolder
    const meta = {
      name: FILE_NAME,
      parents: ["appDataFolder"]
    };

    const createUrl = `${API}/files?fields=id`;
    const cr = await apiFetch(createUrl, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(meta)
    });

    if (!cr.ok) throw new Error("Drive create failed");
    const cj = await cr.json();
    state.fileId = cj.id;
    return state.fileId;
  }

  async function downloadRemote(){
    const fileId = await findOrCreateFile();
    // alt=media returns file content
    const url = `${API}/files/${fileId}?alt=media`;
    const r = await apiFetch(url);

    // If brand new empty file, may return 404/empty; handle gracefully
    if (!r.ok){
      log("Δεν βρήκα δεδομένα στο Drive (θα ανέβουν τοπικά).");
      return null;
    }

    const text = await r.text();
    if (!text || !text.trim()) return null;

    try{
      return JSON.parse(text);
    }catch{
      return null;
    }
  }

  async function uploadRemote(payload){
    const fileId = await findOrCreateFile();
    const url = `${UPLOAD}/files/${fileId}?uploadType=media`;

    const r = await apiFetch(url, {
      method: "PATCH",
      headers: {"Content-Type":"application/json; charset=utf-8"},
      body: JSON.stringify(payload)
    });
    if (!r.ok) throw new Error("Drive upload failed");
  }

  function normalizePayload(remote){
    // Accept {version, data:[...]} or raw array
    if (!remote) return {version:1, data:[]};
    if (Array.isArray(remote)) return {version:1, data:remote};
    if (Array.isArray(remote.data)) return {version: remote.version || 1, data: remote.data};
    return {version:1, data:[]};
  }

  function mergeLocalRemote(localArr, remoteArr){
    // Merge by date, keep newer updatedAt
    const map = new Map();

    for (const d of remoteArr){
      if (!d || !d.date) continue;
      map.set(d.date, d);
    }
    for (const d of localArr){
      if (!d || !d.date) continue;
      const old = map.get(d.date);
      if (!old) { map.set(d.date, d); continue; }
      const a = Number(old.updatedAt||0);
      const b = Number(d.updatedAt||0);
      map.set(d.date, b >= a ? d : old);
    }

    const merged = Array.from(map.values()).sort((a,b)=> (a.date||"").localeCompare(b.date||""));
    return merged;
  }

  async function applyToLocalDB(merged){
    // Write merged into IndexedDB
    for (const d of merged){
      await TaxiDB.putDay(d);
    }
  }

  async function syncNow({reason="manual"}={}){
    if (!state.enabled) return;
    if (!state.online) return;
    if (!state.accessToken) return; // not signed in
    if (state.syncing) return;

    state.syncing = true;
    status({syncing:true, reason});
    log(`Sync… (${reason})`);

    try{
      const local = await TaxiDB.getAllDays();
      const remoteRaw = await downloadRemote();
      const remote = normalizePayload(remoteRaw);

      const merged = mergeLocalRemote(local, remote.data);
      const payload = {
        app: "Taxi Ledger",
        version: 1,
        updatedAt: now(),
        data: merged
      };

      // Apply merged to local first (to pull from Drive)
      await applyToLocalDB(merged);

      // Push merged to Drive
      await uploadRemote(payload);

      state.lastSyncAt = now();
      log("Sync OK ✅");
      status({syncing:false, lastSyncAt: state.lastSyncAt});
      window.dispatchEvent(new CustomEvent("taxiledger:syncDone",{detail:{ok:true}}));
    }catch(e){
      log("Sync failed ❌");
      status({syncing:false, error:String(e?.message||e)});
      window.dispatchEvent(new CustomEvent("taxiledger:syncDone",{detail:{ok:false,error:String(e?.message||e)}}));
    }finally{
      state.syncing = false;
    }
  }

  // Auto sync throttle
  let syncTimer = null;
  function scheduleSync(ms=1200, reason="autosave"){
    if (!state.enabled || !state.online || !state.accessToken) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(()=>syncNow({reason}), ms);
  }

  // Public API
  window.DriveSync = {
    init,
    signIn,
    signOut,
    setEnabled,
    syncNow,
    scheduleSync,
    getState: ()=>({...state})
  };
})();