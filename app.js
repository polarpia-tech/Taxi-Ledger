/* ============================
   Taxi Ledger — app.js (PRO UI)
   Works with the new index.html
   Requires: db.js (TaxiDB) + drive-sync.js (DriveSync)
   ============================ */

"use strict";

/* ---------- Helpers ---------- */
const $ = (id) => document.getElementById(id);

function n(v){
  if (v === "" || v == null) return 0;
  const s = String(v).replace(",", ".");
  const num = Number(s);
  return Number.isFinite(num) ? num : 0;
}
function eur(x){
  return new Intl.NumberFormat("el-GR",{style:"currency",currency:"EUR"}).format(Number(x||0));
}
function todayISO(){
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0,10);
}
function nowTs(){ return Date.now(); }

let toastTimer = null;
function toast(msg, ms=2200){
  const el = $("toast");
  if (!el) return;
  el.textContent = msg;
  el.style.display = "block";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{ el.style.display = "none"; }, ms);
}

/* ---------- DOM refs ---------- */
const revenueEl = $("revenue");
const tip1El = $("tip1");
const tip2El = $("tip2");
const expensesTotalEl = $("expensesTotal");
const noteEl = $("note");
const dateInput = $("dateInput");

const kpiRevenue = $("kpiRevenue");
const kpiExtras  = $("kpiExtras");
const kpiTotal   = $("kpiTotal");
const kpiNet     = $("kpiNet");

const sumDays = $("sumDays");
const sumRevenue = $("sumRevenue");
const sumTip1 = $("sumTip1");
const sumTip2 = $("sumTip2");
const sumExpenses = $("sumExpenses");
const sumAllIn = $("sumAllIn");
const sumNet = $("sumNet");

const syncBtn = $("syncBtn");
const syncToggle = $("syncToggle");
const syncState = $("syncState");
const syncLoginBtn = $("syncLoginBtn");
const restoreBtn = $("restoreBtn");
const autosaveState = $("autosaveState");

/* ---------- State ---------- */
let expenses = [];
let autosaveTimer = null;
let autosaveDirty = false;
let lastLoadedDate = null;

/* ---------- Calculations ---------- */
function calc(){
  const revenue = n(revenueEl.value);
  const tip = n(tip1El.value);
  const other = n(tip2El.value);
  const exp = expenses.reduce((a,e)=> a + n(e.amount), 0);

  const extras = tip + other;
  const total = revenue + extras;
  const net = total - exp;

  expensesTotalEl.value = exp.toFixed(2);
  kpiRevenue.textContent = eur(revenue);
  kpiExtras.textContent  = eur(extras);
  kpiTotal.textContent   = eur(total);
  kpiNet.textContent     = eur(net);
}

/* ---------- Expenses UI ---------- */
function renderExpenses(){
  const box = $("expensesList");
  box.innerHTML = "";

  expenses.forEach((e,i)=>{
    const row = document.createElement("div");
    row.className = "expense-item";

    const l = document.createElement("input");
    l.className = "field";
    l.placeholder = "Περιγραφή (π.χ. καύσιμα)";
    l.value = e.label || "";
    l.addEventListener("input", ()=>{
      e.label = l.value;
      markDirty("edit");
    });

    const a = document.createElement("input");
    a.className = "field";
    a.type = "number";
    a.inputMode = "decimal";
    a.step = "0.01";
    a.placeholder = "€";
    a.value = e.amount ?? "";
    a.addEventListener("input", ()=>{
      e.amount = a.value;
      calc();
      markDirty("edit");
    });
    a.addEventListener("change", ()=>{
      e.amount = a.value;
      calc();
      markDirty("edit");
    });
    a.addEventListener("keydown", (ev)=>{ if(ev.key==="Enter") a.blur(); });

    const d = document.createElement("button");
    d.className = "miniBtn";
    d.textContent = "🗑️";
    d.addEventListener("click", ()=>{
      expenses.splice(i,1);
      renderExpenses();
      calc();
      markDirty("delete-expense");
    });

    row.append(l,a,d);
    box.append(row);
  });

  calc();
}

$("addExpenseBtn")?.addEventListener("click", ()=>{
  expenses.unshift({label:"", amount:""});
  renderExpenses();
  markDirty("add-expense");
});

/* ---------- Data load/save ---------- */
async function loadDay(date){
  const iso = date || todayISO();
  lastLoadedDate = iso;

  // remember last selected date
  try{ localStorage.setItem("taxiledger:lastDate", iso); }catch(_){}

  const d = await TaxiDB.getDay(iso);

  if (!d){
    revenueEl.value = "";
    tip1El.value = "";
    tip2El.value = "";
    noteEl.value = "";
    expenses = [];
    renderExpenses();
    calc();
    setAutosaveState("έτοιμο");
    return;
  }

  revenueEl.value = d.revenue ?? "";
  tip1El.value = d.tip1 ?? "";
  tip2El.value = d.tip2 ?? "";
  noteEl.value = d.note ?? "";

  expenses = Array.isArray(d.expenses)
    ? d.expenses.map(x=>({label:x.label||"", amount:(x.amount??"").toString()}))
    : [];

  renderExpenses();
  calc();
  setAutosaveState("έτοιμο");
}

async function saveDay({silent=false, reason="manual"} = {}){
  const iso = dateInput.value || todayISO();

  const revenue = n(revenueEl.value);
  const tip = n(tip1El.value);
  const other = n(tip2El.value);
  const expTotal = n(expensesTotalEl.value);

  const extras = tip + other;
  const total = revenue + extras;
  const net = total - expTotal;

  const day = {
    date: iso,
    revenue,
    tip1: tip,
    tip2: other,
    expenses: expenses
      .map(e=>({label:(e.label||"").trim(), amount:n(e.amount)}))
      .filter(e=>e.label || e.amount),
    expensesTotal: expTotal,
    gross: total,
    net,
    note: (noteEl.value||"").trim(),
    updatedAt: nowTs()
  };

  await TaxiDB.putDay(day);

  autosaveDirty = false;
  setAutosaveState("έτοιμο");

  if (!silent){
    toast("Αποθηκεύτηκε ✅");
  }

  // refresh history/summary (if user is on those tabs, still ok)
  await renderHistory();
  await renderSummary();

  // Drive autosync (only if DriveSync exists + enabled + signed-in OR will queue)
  if (window.DriveSync){
    try{
      // schedule light sync (15min window), do not force login popup here
      DriveSync.scheduleSync(900, reason);
      window.dispatchEvent(new Event("taxiledger:syncStatus"));
    }catch(_){}
  }
}

/* ---------- Auto-save ---------- */
function setAutosaveState(text){
  if (!autosaveState) return;
  autosaveState.textContent = text;
}

function markDirty(reason="edit"){
  autosaveDirty = true;
  setAutosaveState("γράφει…");

  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(async ()=>{
    try{
      await saveDay({silent:true, reason:`autosave:${reason}`});
      setAutosaveState("έτοιμο");
    }catch(err){
      console.error(err);
      setAutosaveState("σφάλμα");
      toast("Σφάλμα αποθήκευσης ❌", 2600);
    }
  }, 1200);
}

/* Live calc + Enter closes keyboard */
function bindMoneyInput(el){
  const handler = () => { calc(); markDirty("money"); };
  el.addEventListener("input", handler);
  el.addEventListener("change", handler);
  el.addEventListener("keyup", handler);
  el.addEventListener("keydown", (ev)=>{ if(ev.key==="Enter") el.blur(); });
}
bindMoneyInput(revenueEl);
bindMoneyInput(tip1El);
bindMoneyInput(tip2El);

noteEl.addEventListener("input", ()=> markDirty("note"));
dateInput.addEventListener("change", async ()=>{
  // if there are unsaved edits, save silently before switching
  if (autosaveDirty){
    try{ await saveDay({silent:true, reason:"switch-date"}); }catch(_){}
  }
  await loadDay(dateInput.value);
});

/* Manual save button */
$("saveBtn")?.addEventListener("click", async ()=>{
  try{
    setAutosaveState("γράφει…");
    await saveDay({silent:false, reason:"save"});
  }catch(err){
    console.error(err);
    setAutosaveState("σφάλμα");
    toast("Δεν αποθηκεύτηκε ❌", 2600);
  }
});

/* ---------- Tabs (new UI) ---------- */
function showTab(tab){
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
  const t = document.querySelector(`.tab[data-tab="${tab}"]`);
  if (t) t.classList.add("active");

  const views = ["entry","history","summary"];
  views.forEach(v=>{
    const el = $("view-"+v);
    if (!el) return;
    el.classList.toggle("active", v===tab);
    el.style.display = (v===tab ? "" : "none");
  });
}

document.querySelectorAll(".tab").forEach(t=>{
  t.addEventListener("click", async ()=>{
    const tab = t.dataset.tab;
    showTab(tab);
    if (tab==="history") await renderHistory();
    if (tab==="summary") await renderSummary();
  });
});

/* ---------- History ---------- */
async function renderHistory(){
  const list = $("historyList");
  if (!list) return;
  list.innerHTML = "";

  const all = (await TaxiDB.getAllDays()).sort((a,b)=> (b.date||"").localeCompare(a.date||""));

  if (!all.length){
    const p = document.createElement("div");
    p.style.color = "rgba(238,243,255,.66)";
    p.textContent = "Δεν υπάρχουν καταχωρήσεις ακόμα.";
    list.append(p);
    return;
  }

  all.forEach((d)=>{
    const item = document.createElement("div");
    item.className = "historyItem";

    const left = document.createElement("div");
    left.style.minWidth = "0";

    const date = document.createElement("div");
    date.style.fontWeight = "1000";
    date.textContent = d.date;

    const meta = document.createElement("div");
    meta.className = "historyMeta";

    const revenue = d.revenue || 0;
    const tip = d.tip1 || 0;
    const other = d.tip2 || 0;
    const extras = tip + other;
    const total = revenue + extras;

    meta.textContent =
      `Τζίρος: ${eur(revenue)} • Μπουρμπουάρ: ${eur(tip)} • Άλλα: ${eur(other)} • Σύνολο: ${eur(total)} • Έξοδα: ${eur(d.expensesTotal||0)}`;

    const net = document.createElement("div");
    net.className = "historyNet";
    net.textContent = eur(d.net||0);

    left.append(date, meta);
    item.append(left, net);

    item.addEventListener("click", async ()=>{
      dateInput.value = d.date;
      await loadDay(d.date);
      showTab("entry");
      toast("Φορτώθηκε ημέρα ✅");
    });

    list.append(item);
  });
}

/* ---------- Summary ---------- */
async function renderSummary(){
  const all = await TaxiDB.getAllDays();
  let t={r:0,tip:0,other:0,e:0,net:0};

  all.forEach(d=>{
    t.r += d.revenue || 0;
    t.tip += d.tip1 || 0;
    t.other += d.tip2 || 0;
    t.e += d.expensesTotal || 0;
    t.net += d.net || 0;
  });

  const total = t.r + t.tip + t.other;

  if (sumDays) sumDays.textContent = String(all.length);
  if (sumRevenue) sumRevenue.textContent = eur(t.r);
  if (sumTip1) sumTip1.textContent = eur(t.tip);
  if (sumTip2) sumTip2.textContent = eur(t.other);
  if (sumExpenses) sumExpenses.textContent = eur(t.e);
  if (sumAllIn) sumAllIn.textContent = eur(total);
  if (sumNet) sumNet.textContent = eur(t.net);
}

/* ---------- Drive Sync UI + hooks ---------- */
function driveAvailable(){
  return !!window.DriveSync;
}

function paintSyncUI(){
  if (!syncState || !syncToggle || !syncLoginBtn) return;

  if (!driveAvailable()){
    syncState.textContent = "⚠️ DriveSync δεν φορτώθηκε (έλεγξε ότι υπάρχει drive-sync.js και ότι δεν έχει error).";
    syncToggle.checked = false;
    syncToggle.disabled = true;
    syncLoginBtn.disabled = true;
    if (syncBtn) syncBtn.disabled = true;
    if (restoreBtn) restoreBtn.disabled = true;
    return;
  }

  const st = DriveSync.getState?.() || {};

  const online = st.online ? "🟢 Online" : "🔴 Offline";
  const enabled = st.enabled ? "✅ Sync ON" : "⛔ Sync OFF";
  const signed = st.accessToken ? "🔐 Google: OK" : "🔓 Google: όχι";

  let extra = "";
  if (st.syncing) extra = " • ⏳ Sync…";
  if (st.lastSyncAt) extra = ` • Τελευταίο: ${new Date(st.lastSyncAt).toLocaleString("el-GR")}`;

  syncState.textContent = `${online} • ${enabled} • ${signed}${extra}`;
  syncToggle.checked = !!st.enabled;

  syncLoginBtn.textContent = st.accessToken ? "Αποσύνδεση Google" : "Σύνδεση Google";
  syncLoginBtn.disabled = false;
  syncToggle.disabled = false;
  if (syncBtn) syncBtn.disabled = false;
  if (restoreBtn) restoreBtn.disabled = false;
}

// external events from DriveSync (if it dispatches)
window.addEventListener("taxiledger:syncStatus", paintSyncUI);
window.addEventListener("online", paintSyncUI);
window.addEventListener("offline", paintSyncUI);

syncToggle?.addEventListener("change", ()=>{
  if (!driveAvailable()) return;
  DriveSync.setEnabled?.(syncToggle.checked);
  paintSyncUI();
  toast(syncToggle.checked ? "Auto-sync ενεργό ✅" : "Auto-sync απενεργοποιήθηκε ⛔");
});

syncBtn?.addEventListener("click", async ()=>{
  if (!driveAvailable()) return;
  try{
    await DriveSync.syncNow?.({reason:"manual"});
    toast("Sync ξεκίνησε… ⏳", 1800);
    paintSyncUI();
  }catch(err){
    console.error(err);
    toast("Sync απέτυχε ❌", 2400);
  }
});

syncLoginBtn?.addEventListener("click", async ()=>{
  if (!driveAvailable()) return;

  const st = DriveSync.getState?.() || {};
  try{
    if (st.accessToken){
      DriveSync.signOut?.();
      toast("Αποσυνδέθηκες ✅");
    } else {
      // IMPORTANT: user-initiated => allow prompt
      await DriveSync.signIn?.({forcePrompt:true});
      toast("Σύνδεση OK ✅");
    }
  }catch(err){
    console.error(err);
    toast("Δεν έγινε σύνδεση ❌", 2400);
  }
  paintSyncUI();
});

restoreBtn?.addEventListener("click", async ()=>{
  if (!driveAvailable()) return;

  try{
    // Different implementations: try restoreNow -> restore -> syncNow({mode:"restore"})
    if (typeof DriveSync.restoreNow === "function"){
      await DriveSync.restoreNow({reason:"manual-restore"});
    } else if (typeof DriveSync.restore === "function"){
      await DriveSync.restore({reason:"manual-restore"});
    } else if (typeof DriveSync.syncNow === "function"){
      // fallback if your DriveSync supports mode flag
      await DriveSync.syncNow({reason:"manual-restore", mode:"restore"});
    } else {
      toast("Restore δεν υποστηρίζεται από το drive-sync.js ❌", 2800);
      return;
    }

    toast("Restore ολοκληρώθηκε ✅");
    // reload current day & aggregates after restore
    await loadDay(dateInput.value || todayISO());
    await renderHistory();
    await renderSummary();
  }catch(err){
    console.error(err);
    toast("Restore απέτυχε ❌", 2600);
  }
});

/* ---------- Boot ---------- */
(async function boot(){
  // ✅ Date init:
  // 1) prefer lastDate (so it won't look "stuck" until refresh)
  // 2) else today
  let initialDate = todayISO();
  try{
    const saved = localStorage.getItem("taxiledger:lastDate");
    if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) initialDate = saved;
  }catch(_){}

  dateInput.value = initialDate;

  // initial renders
  expenses = [];
  renderExpenses();
  calc();
  await loadDay(initialDate);
  await renderHistory();
  await renderSummary();

  // ✅ Drive UI
  paintSyncUI();

  // ✅ IMPORTANT:
  // Do NOT force Google prompt on every refresh.
  // If DriveSync supports silent sign-in, ask it WITHOUT prompt.
  // (If it can't, it will just fail silently; user can press "Σύνδεση Google")
  if (driveAvailable()){
    try{
      await DriveSync.signIn?.({forcePrompt:false});
    }catch(_){}
    paintSyncUI();
  }

  // nice: autosave state
  setAutosaveState("έτοιμο");
})();