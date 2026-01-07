const $ = (id) => document.getElementById(id);

const revenueEl = $("revenue");
const tip1El = $("tip1");   // Μπουρμπουάρ
const tip2El = $("tip2");   // Άλλα
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

let expenses = [];

/* ---------- helpers ---------- */
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

/* ---------- calc (Τζίρος ξεχωριστά) ---------- */
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

/* ---------- expenses UI ---------- */
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
    l.addEventListener("input", ()=> e.label = l.value);

    const a = document.createElement("input");
    a.className = "field";
    a.type = "number";
    a.inputMode = "decimal";
    a.step = "0.01";
    a.placeholder = "€";
    a.value = e.amount ?? "";
    a.addEventListener("input", ()=> { e.amount = a.value; calc(); });
    a.addEventListener("change", ()=> { e.amount = a.value; calc(); });
    a.addEventListener("keydown", (ev)=>{ if(ev.key==="Enter") a.blur(); });

    const d = document.createElement("button");
    d.className = "btn danger";
    d.textContent = "🗑️";
    d.addEventListener("click", ()=>{
      expenses.splice(i,1);
      renderExpenses();
      calc();
    });

    row.append(l,a,d);
    box.append(row);
  });

  calc();
}

$("addExpenseBtn").addEventListener("click", ()=>{
  expenses.unshift({label:"", amount:""});
  renderExpenses();
});

/* ---------- History/Summary ---------- */
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
    item.style.border = "1px solid rgba(255,255,255,.10)";
    item.style.background = "rgba(255,255,255,.04)";
    item.style.borderRadius = "16px";
    item.style.padding = "12px";
    item.style.display = "flex";
    item.style.justifyContent = "space-between";
    item.style.gap = "12px";

    const left = document.createElement("div");
    left.style.minWidth = "0";

    const date = document.createElement("div");
    date.style.fontWeight = "800";
    date.textContent = d.date;

    const meta = document.createElement("div");
    meta.style.marginTop = "6px";
    meta.style.color = "rgba(234,241,255,.65)";
    meta.style.fontSize = "12px";

    const revenue = d.revenue || 0;
    const tip = d.tip1 || 0;
    const other = d.tip2 || 0;
    const extras = tip + other;
    const total = revenue + extras;

    meta.textContent = `Τζίρος: ${eur(revenue)} • Μπουρμπουάρ: ${eur(tip)} • Άλλα: ${eur(other)} • Σύνολο: ${eur(total)} • Έξοδα: ${eur(d.expensesTotal||0)}`;

    const net = document.createElement("div");
    net.style.fontWeight = "900";
    net.style.whiteSpace = "nowrap";
    net.textContent = eur(d.net||0);

    left.append(date, meta);
    item.append(left, net);

    item.addEventListener("click", async ()=>{
      dateInput.value = d.date;
      revenueEl.value = d.revenue ?? "";
      tip1El.value = d.tip1 ?? "";
      tip2El.value = d.tip2 ?? "";
      noteEl.value = d.note ?? "";
      expenses = Array.isArray(d.expenses)
        ? d.expenses.map(x=>({label:x.label||"", amount:(x.amount??"").toString()}))
        : [];
      renderExpenses();
      document.querySelector('.tab[data-tab="entry"]').click();
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

/* ---------- AUTO BACKUP (χωρίς κουμπί) ---------- */
/*
  Αποθηκεύουμε snapshot σε localStorage σε ΚΑΘΕ save.
  Αυτό δεν επιβιώνει αν κάνεις "Clear site data", αλλά:
  - σε crash/bug/κάτι που πάει στραβά, σε σώζει
  - και μπορούμε να κάνουμε auto-restore αν βρει backup και η DB είναι άδεια
*/
const LS_KEY = "taxi_ledger_autobackup_v1";

async function autoBackup(){
  try{
    const all = await TaxiDB.getAllDays();
    const payload = { exportedAt: new Date().toISOString(), data: all };
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
  }catch(_){}
}

async function autoRestoreIfNeeded(){
  try{
    const all = await TaxiDB.getAllDays();
    if (all && all.length) return;

    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return;

    const json = JSON.parse(raw);
    const rows = Array.isArray(json?.data) ? json.data : [];
    if(!rows.length) return;

    for(const d of rows){
      if(d && d.date) await TaxiDB.putDay(d);
    }
  }catch(_){}
}

/* ---------- Save ---------- */
$("saveBtn").addEventListener("click", async ()=>{
  const revenue = n(revenueEl.value);
  const tip = n(tip1El.value);
  const other = n(tip2El.value);
  const expTotal = n(expensesTotalEl.value);

  const extras = tip + other;
  const total = revenue + extras;
  const net = total - expTotal;

  const day = {
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

  await TaxiDB.putDay(day);

  // ✅ αυτόματο backup
  await autoBackup();

  alert("Αποθηκεύτηκε ✅");
  await renderHistory();
  await renderSummary();
});

/* Live calc + Enter closes keyboard */
function bindMoneyInput(el){
  const handler = () => calc();
  el.addEventListener("input", handler);
  el.addEventListener("change", handler);
  el.addEventListener("keyup", handler);
  el.addEventListener("keydown", (ev)=>{ if(ev.key==="Enter") el.blur(); });
}
bindMoneyInput(revenueEl);
bindMoneyInput(tip1El);
bindMoneyInput(tip2El);

/* Tabs */
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

/* boot */
dateInput.value = today();
await autoRestoreIfNeeded();
renderExpenses();
calc();
renderHistory();
renderSummary();