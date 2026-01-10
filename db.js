/* db.js — IndexedDB storage */

const TaxiDB = (() => {
  const DB_NAME = "taxi_ledger_db";
  const DB_VER = 2;
  const STORE = "days";
  let _db = null;

  function open(){
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VER);

      req.onupgradeneeded = (e) => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const st = db.createObjectStore(STORE, { keyPath: "date" });
          st.createIndex("updatedAt", "updatedAt", { unique:false });
        } else {
          const st = req.transaction.objectStore(STORE);
          if (!st.indexNames.contains("updatedAt")) st.createIndex("updatedAt", "updatedAt", { unique:false });
        }
      };

      req.onsuccess = () => { _db = req.result; resolve(_db); };
      req.onerror = () => reject(req.error);
    });
  }

  async function putDay(day){
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(day);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getDay(date){
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(date);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function getAllDays(){
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function deleteDay(date){
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(date);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function mergeMany(days){
    // Merge by date; keep newest updatedAt
    const existing = await getAllDays();
    const map = new Map(existing.map(d => [d.date, d]));
    for (const d of days){
      if (!d || !d.date) continue;
      const prev = map.get(d.date);
      if (!prev || (d.updatedAt || 0) >= (prev.updatedAt || 0)) {
        map.set(d.date, d);
      }
    }
    const merged = Array.from(map.values());
    for (const d of merged) await putDay(d);
    return merged.length;
  }

  return { putDay, getDay, getAllDays, deleteDay, mergeMany };
})();