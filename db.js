const DB_NAME = "taxi_ledger_db";
const STORE = "days";

function openDB(){
  return new Promise((res,rej)=>{
    const r = indexedDB.open(DB_NAME,1);
    r.onupgradeneeded=()=>r.result.createObjectStore(STORE,{keyPath:"date"});
    r.onsuccess=()=>res(r.result);
    r.onerror=()=>rej(r.error);
  });
}

async function putDay(d){
  const db=await openDB();
  const tx=db.transaction(STORE,"readwrite");
  tx.objectStore(STORE).put(d);
}

async function getAllDays(){
  const db=await openDB();
  return new Promise(res=>{
    const tx=db.transaction(STORE,"readonly");
    const r=tx.objectStore(STORE).getAll();
    r.onsuccess=()=>res(r.result||[]);
  });
}

async function deleteDay(date){
  const db=await openDB();
  const tx=db.transaction(STORE,"readwrite");
  tx.objectStore(STORE).delete(date);
}

window.TaxiDB={putDay,getAllDays,deleteDay}; 