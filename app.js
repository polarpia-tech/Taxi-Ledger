"use strict";

const $ = (id) => document.getElementById(id);

// Διόρθωση μετατροπής σε αριθμό για να μην γίνονται λάθη στα σύνολα
function n(v){
  if (v === "" || v == null) return 0;
  const s = String(v).replace(",", ".");
  const num = parseFloat(s);
  return isNaN(num) ? 0 : num;
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

const revenueEl = $("revenue"), tip1El = $("tip1"), tip2El = $("tip2");
const expensesTotalEl = $("expensesTotal"), noteEl = $("note"), dateInput = $("dateInput");
const kpiRevenue = $("kpiRevenue"), kpiExtras = $("kpiExtras"), kpiTotal = $("kpiTotal"), kpiNet = $("kpiNet");
const sumDays = $("sumDays"), sumRevenue = $("sumRevenue"), sumTip1 = $("sumTip1"), sumTip2 = $("sumTip2"), sumExpenses = $("sumExpenses"), sumNet = $("sumNet");
const syncBtn = $("syncBtn"), syncToggle = $("syncToggle"), syncState = $("syncState"), syncLoginBtn = $("syncLoginBtn"), restoreBtn = $("restoreBtn");

let expenses = [];
let autosaveTimer = null;

function calc(){
  const rev = n(revenueEl.value);
  const t1 = n(tip1El.value);
  const t2 = n(tip2El.value);
  const exp = expenses.reduce((a,e)=> a + n(e.amount), 0);
  
  const extras = t1 + t2;
  const total = rev + extras;
  const net = total - exp;

  if(expensesTotalEl) expensesTotalEl.value = exp.toFixed(2);
  if(kpiRevenue) kpiRevenue.textContent = eur(rev);
  if(kpiExtras) kpiExtras.textContent = eur(extras);
  if(kpiTotal) kpiTotal.textContent = eur(total);
  if(kpiNet) kpiNet.textContent = eur(net);
}

function renderExpenses(){
  const box = $("expensesList");
  if(!box) return;
  box.innerHTML = "";
  expenses.forEach((e,i)=>{
    const row = document.createElement("div");
    row.className = "expense-item";
    const l = document.createElement("input");
    l.className = "field"; l.placeholder = "Περιγραφή"; l.value = e.label || "";
    l.oninput = () => { e.label = l.value; markDirty(); };
    const a = document.createElement("input");
    a.className = "field"; a.type = "number"; a.value = e.amount ?? "";
    a.oninput = () => { e.amount = a.value; calc(); markDirty(); };
    const d = document.createElement("button");
    d.className = "miniBtn"; d.textContent = "🗑️";
    d.onclick = () => { expenses.splice(i,1); renderExpenses(); calc(); markDirty(); };
    row.append(l,a,d);
    box.append(row);
  });
  calc();
}

$("addExpenseBtn")?.addEventListener("click", ()=>{
  expenses.unshift({label:"", amount:""});
  renderExpenses();
});

async function loadDay(date){
  const iso = date || todayISO();
  const d = await TaxiDB.getDay(iso);
  if (!d){
    revenueEl.value = ""; tip1El.value = ""; tip2El.value = ""; noteEl.value = "";
    expenses = []; renderExpenses(); calc(); return;
  }
  revenueEl.value = d.revenue || "";
  tip1El.value = d.tip1 || "";
  tip2El.value = d.tip2 || "";
  noteEl.value = d.note || "";
  expenses = Array.isArray(d.expenses) ? d.expenses : [];
  renderExpenses(); calc();
}

async function saveDay({silent=false} = {}){
  const iso = dateInput.value || todayISO();
  const day = {
    date: iso, 
    revenue: n(revenueEl.value), 
    tip1: n(tip1El.value),
    tip2: n(tip2El.value), 
    expenses: expenses, 
    expensesTotal: n(expensesTotalEl.value),
    net: n(revenueEl.value) + n(tip1El.value) + n(tip2El.value) - n(expensesTotalEl.value),
    note: noteEl.value, 
    updatedAt: nowTs()
  };
  await TaxiDB.putDay(day);
  if (!silent) toast("Αποθηκεύτηκε ✅");
}

function markDirty(){
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(()=> saveDay({silent:true}), 1200);
}

[revenueEl, tip1El, tip2El].forEach(el => el?.addEventListener("input", () => { calc(); markDirty(); }));
dateInput?.addEventListener("change", () => loadDay(dateInput.value));

function showTab(tab){
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
  document.querySelector(`.tab[data-tab="${tab}"]`)?.classList.add("active");
  ["entry","history","summary","settings"].forEach(v=>{
    const el = $("view-"+v);
    if(el) el.classList.toggle("active", v===tab);
  });
}

document.querySelectorAll(".tab").forEach(t=>{
  t.onclick = async () => {
    const tab = t.dataset.tab;
    showTab(tab);
    if(tab==="history") await renderHistory();
    if(tab==="summary") await renderSummary();
  };
});

async function renderHistory(){
  const list = $("historyList"); if(!list) return;
  const all = (await TaxiDB.getAllDays()).sort((a,b)=> b.date.localeCompare(a.date));
  list.innerHTML = all.map(d => `
    <div class="historyItem" onclick="loadHistoryDay('${d.date}')">
      <div><strong>${d.date}</strong><div style="font-size:11px; color:gray">Τζίρος: ${eur(d.revenue)}</div></div>
      <div style="color:var(--ok); font-weight:bold">${eur(d.net)}</div>
    </div>
  `).join("");
}

window.loadHistoryDay = async (date) => {
  dateInput.value = date;
  await loadDay(date);
  showTab("entry");
};

async function renderSummary(){
  const all = await TaxiDB.getAllDays();
  let r=0, t1=0, t2=0, e=0, n_sum=0;
  all.forEach(d=>{ 
    r += n(d.revenue); t1 += n(d.tip1); t2 += n(d.tip2); 
    e += n(d.expensesTotal); n_sum += (n(d.revenue) + n(d.tip1) + n(d.tip2) - n(d.expensesTotal)); 
  });
  if(sumDays) sumDays.textContent = all.length;
  if(sumRevenue) sumRevenue.textContent = eur(r);
  if(sumTip1) sumTip1.textContent = eur(t1);
  if(sumTip2) sumTip2.textContent = eur(t2);
  if(sumExpenses) sumExpenses.textContent = eur(e);
  if(sumNet) sumNet.textContent = eur(n_sum);
}

// Drive Sync Logic
function paintSyncUI(){
  if(!syncState || !window.DriveSync) return;
  const st = DriveSync.getState();
  syncState.textContent = st.accessToken ? "🟢 Συνδεδεμένο" : "🔴 Offline";
  syncToggle.checked = st.enabled;
}

syncLoginBtn?.addEventListener("click", async () => { await DriveSync.signIn(); paintSyncUI(); });
syncBtn?.addEventListener("click", async () => { await DriveSync.syncNow(); paintSyncUI(); });
restoreBtn?.addEventListener("click", async () => { if(confirm("Επαναφορά δεδομένων;")) await DriveSync.restoreNow(); });

(async function boot(){
  dateInput.value = todayISO();
  await loadDay();
  setInterval(paintSyncUI, 3000); // Check sync status every 3s
})();
