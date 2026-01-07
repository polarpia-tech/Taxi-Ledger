/* IndexedDB wrapper (simple & reliable) */
(() => {
  const DB_NAME = "taxi_ledger_db";
  const DB_VERSION = 1;
  const STORE = "days";

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "date" }); // date: YYYY-MM-DD
          store.createIndex("date", "date", { unique: true });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function tx(mode, fn) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const store = t.objectStore(STORE);
      const result = fn(store);
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error);
    });
  }

  async function putDay(day) {
    return tx("readwrite", (s) => s.put(day));
  }

  async function getDay(date) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, "readonly");
      const s = t.objectStore(STORE);
      const req = s.get(date);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function deleteDay(date) {
    return tx("readwrite", (s) => s.delete(date));
  }

  async function getAllDays() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, "readonly");
      const s = t.objectStore(STORE);
      const req = s.getAll();
      req.onsuccess = () => resolve((req.result || []).sort((a,b)=> b.date.localeCompare(a.date)));
      req.onerror = () => reject(req.error);
    });
  }

  window.TaxiDB = { putDay, getDay, deleteDay, getAllDays };
})();