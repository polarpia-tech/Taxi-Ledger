const $ = (id) => document.getElementById(id);

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

const autosaveState = $("autosaveState");
const toastEl = $("toast");

const syncToggle = $("syncToggle");
const syncState = $("syncState");
const syncLoginBtn = $("syncLoginBtn");
const syncNowBtn = $("syncNowBtn");
const restoreBtn = $("restoreBtn");

let expenses = [];
let userPickedDate = false;
let autosaveTimer = null;
let lastAutosaveAt = 0;

function n(v){
  if (v === "" || v == null) return 0;
  const s = String(v).replace(",", ".");
  const num = Number(s);
  return Number.isFinite(num) ? num : 0;
}
function eur(x){
  return new Intl.NumberFormat("el-GR",{style:"currency",currency:"EUR"}).format(Number(x||0));
}
function today(){
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0,10);
}

function toast(msg){
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(()=>toastEl.classList.remove("show"), 1200);
}

function ensureDateIsFresh(){
  if (!userPickedDate){
    const t = today();
    if (dateInput.value !== t) dateInput.value = t;
  }
}

dateInput.addEventListener("change", async ()=>{
  userPickedDate = true;
  await loadDay(dateInput.value);
});

document.addEventListener("visibilitychange", ()=>{
  if (!document.hidden) ensureDateIsFresh();
});
window.addEventListener("focus", ensureDateIsFresh);

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
    l.addEventListener("input", ()=>{ e.label = l.value; queueAutosave("expense"); });

    const a = document.createElement("input");
    a.className = "field";
    a.type = "number";
    a.inputMode = "decimal";
    a.step = "0.01";
    a.placeholder = "€";
    a.value = e.amount ?? "";
    a.addEventListener("input", ()=> { e.amount = a.value; calc(); queueAutosave("expense"); });
    a.addEventListener("change", ()=> { e.amount = a.value; calc(); queueAutosave("expense"); });
    a.addEventListener("keydown", (ev)=>{ if(ev.key==="Enter") a.blur(); });

    const d = document.createElement("button");
    d.className = "btn danger";
    d.textContent = "🗑️";
    d.addEventListener("click", ()=>{
      expenses.splice(i,1);
      renderExpenses();
      calc();
      queueAutosave("expense-del");
    });

    row.append(l,a,d);
    box.append(row);
  });

  calc();
}

$("addExpenseBtn").addEventListener("click", ()=>{
  expenses.unshift({label:"", amount:""});
  renderExpenses();
  queueAutosave("expense-add");
});

/* ---------- Save / Autosave ---------- */

function buildDayObject(){
  const revenue = n(revenueEl.value);
  const tip = n(tip1El.value);
  const other = n(tip2El.value);
  const expTotal = n(expensesTotalEl.value);

  const extras = tip + other;
  const total = revenue + extras;
  const net = total - expTotal;

  return {
    date: dateInput.value || today(),
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
    updatedAt: Date.now()
  };
}

async function saveNow({silent=false, reason="manual"} = {}){
  const day = buildDayObject();
  await TaxiDB.putDay(day);
  lastAutosaveAt = Date.now();

  if (!silent){
    toast("Αποθηκεύτηκε ✅");
  } else {
    autosaveState.textContent = "Auto-save: αποθηκεύτηκε ✅";
  }

  await renderHistory();
  await renderSummary();

  // Auto-sync μόνο αν:
  // 1) υπάρχει DriveSync
  // 2) είναι enabled
  // 3) υπάρχει έγκυρο token (χωρίς popup)
  if (window.DriveSync){
    DriveSync.scheduleSync(1200, reason);
  }
}

function queueAutosave(reason="auto"){
  autosaveState.textContent = "Auto-save: σε εξέλιξη…";
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(()=> saveNow({silent:true, reason}), 800);
}

$("saveBtn").addEventListener("click", ()=> saveNow({silent:false, reason:"manual"}));

/* Live calc + Enter closes keyboard */
function bindMoneyInput(el){
  const handler = () => { calc(); queueAutosave("input"); };
  el.addEventListener("input", handler);
  el.addEventListener("change", handler);
  el.addEventListener("keydown", (ev)=>{ if(ev.key==="Enter") el.blur(); });
}
bindMoneyInput(revenueEl);
bindMoneyInput(tip1El);
bindMoneyInput(tip2El);

noteEl.addEventListener("input", ()=> queueAutosave("note"));
noteEl.addEventListener("keydown", (ev)=>{ if(ev.key==="Enter") noteEl.blur(); });

/* ---------- History / Summary ---------- */

async function renderHistory(){
  const list = $("historyList");
  list.innerHTML = "";

  const all = (await TaxiDB.getAllDays()).sort((a,b)=> (b.date||"").localeCompare(a.date||""));

  if (!all.length){
    const p = document.createElement("div");
    p.style.color = "rgba(234,241,255,.65)";
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
    date.className = "d";
    date.textContent = d.date;

    const meta = document.createElement("div");
    meta.className = "m";

    const revenue = d.revenue || 0;
    const tip = d.tip1 || 0;
    const other = d.tip2 || 0;
    const exp = d.expensesTotal || 0;

    const extras = tip + other;
    const total = revenue + extras;

    meta.textContent =
      `Τζίρος: ${eur(revenue)} • Μπουρμπουάρ: ${eur(tip)} • Άλλα: ${eur(other)} • Έξοδα: ${eur(exp)} • Όλα μαζί: ${eur(total)}`;

    const net = document.createElement("div");
    net.className = "n";
    net.textContent = eur(d.net || 0);

    left.append(date, meta);
    item.append(left, net);

    item.addEventListener("click", async ()=>{
      userPickedDate = true;
      await loadDay(d.date);
      document.querySelector('.tab[data-tab="entry"]').click();
      toast("Φορτώθηκε ✅");
    });

    list.append(item);
  });
}

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

  sumDays.textContent = String(all.length);
  sumRevenue.textContent = eur(t.r);
  sumTip1.textContent = eur(t.tip);
  sumTip2.textContent = eur(t.other);
  sumExpenses.textContent = eur(t.e);
  sumAllIn.textContent = eur(total);
  sumNet.textContent = eur(t.net);
}

/* ---------- Load day ---------- */

async function loadDay(dateStr){
  const d = await TaxiDB.getDay(dateStr);
  dateInput.value = dateStr;

  if (!d){
    revenueEl.value = "";
    tip1El.value = "";
    tip2El.value = "";
    noteEl.value = "";
    expenses = [];
    renderExpenses();
    calc();
    autosaveState.textContent = "Auto-save: έτοιμο";
    return;
  }

  revenueEl.value = (d.revenue ?? "") === 0 ? "" : String(d.revenue ?? "");
  tip1El.value = (d.tip1 ?? "") === 0 ? "" : String(d.tip1 ?? "");
  tip2El.value = (d.tip2 ?? "") === 0 ? "" : String(d.tip2 ?? "");
  noteEl.value = d.note ?? "";

  expenses = Array.isArray(d.expenses)
    ? d.expenses.map(x=>({label:x.label||"", amount:(x.amount??"").toString()}))
    : [];

  renderExpenses();
  calc();
  autosaveState.textContent = "Auto-save: έτοιμο";
}

/* ---------- Tabs ---------- */

document.querySelectorAll(".tab").forEach(t=>{
  t.addEventListener("click", async ()=>{
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
    t.classList.add("active");

    ["entry","history","summary"].forEach(v=>{
      $("view-"+v).style.display = (t.dataset.tab===v ? "" : "none");
    });

    if (t.dataset.tab==="history") await renderHistory();
    if (t.dataset.tab==="summary") await renderSummary();
  });
});

/* ---------- Drive UI ---------- */

function paintSyncUI(){
  if (!window.DriveSync){
    syncState.textContent = "DriveSync: δεν φορτώθηκε";
    return;
  }
  const st = DriveSync.getState();
  const online = st.online ? "🟢 Online" : "🔴 Offline";
  const enabled = st.enabled ? "✅ Auto-sync ON" : "⛔ Auto-sync OFF";
  const signed = st.accessToken ? "🔐 Google: OK" : "🔓 Google: όχι";
  let extra = "";
  if (st.syncing) extra = " • ⏳ Sync…";
  if (st.lastSyncAt) extra = ` • Τελευταίο: ${new Date(st.lastSyncAt).toLocaleString("el-GR")}`;
  syncState.textContent = `${online} • ${enabled} • ${signed}${extra}`;

  syncToggle.checked = st.enabled;
  syncLoginBtn.textContent = st.accessToken ? "Αποσύνδεση Google" : "Σύνδεση Google";
}

window.addEventListener("taxiledger:syncStatus", paintSyncUI);

syncToggle.addEventListener("change", ()=>{
  DriveSync.setEnabled(syncToggle.checked);
  paintSyncUI();
});

syncLoginBtn.addEventListener("click", async ()=>{
  const st = DriveSync.getState();
  if (st.accessToken){
    DriveSync.signOut();
    toast("Έγινε αποσύνδεση");
  } else {
    // ΜΟΝΟ εδώ ανοίγει Google (και μόνο όταν το πατήσεις)
    await DriveSync.signIn({forcePrompt:false});
    toast("Συνδέθηκε ✅");
  }
  paintSyncUI();
});

syncNowBtn.addEventListener("click", async ()=>{
  const r = await DriveSync.syncNow({reason:"manual"});
  toast(r.ok ? "Sync OK ✅" : "Sync απέτυχε");
  paintSyncUI();
});

restoreBtn.addEventListener("click", async ()=>{
  const r = await DriveSync.restoreNow();
  if (r.ok){
    await renderHistory();
    await renderSummary();
    // φορτώνουμε ξανά την τρέχουσα ημερομηνία
    await loadDay(dateInput.value || today());
    toast("Restore OK ✅");
  } else {
    toast("Restore απέτυχε");
  }
  paintSyncUI();
});

/* ---------- Boot ---------- */

(async function boot(){
  ensureDateIsFresh();
  await loadDay(dateInput.value || today());
  await renderHistory();
  await renderSummary();

  // DriveSync init χωρίς login/popup
  if (window.DriveSync){
    try { await DriveSync.init(); } catch {}
    paintSyncUI();
  }
})();