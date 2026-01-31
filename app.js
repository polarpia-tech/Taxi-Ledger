"use strict";

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

let expenses = [];
let autosaveTimer = null;
let autosaveDirty = false;

function calc(){
  const revenue = n(revenueEl.value);
  const tip = n(tip1El.value);
  const other = n(tip2El.value);
  const exp = expenses.reduce((a,e)=> a + n(e.amount), 0);
  const extras = tip + other;
  const total = revenue + extras;
  const net = total - exp;
  if(expensesTotalEl) expensesTotalEl.value = exp.toFixed(2);
  if(kpiRevenue) kpiRevenue.textContent = eur(revenue);
  if(kpiExtras) kpiExtras.textContent  = eur(extras);
  if(kpiTotal) kpiTotal.textContent   = eur(total);
  if(kpiNet) kpiNet.textContent     = eur(net);
}

function renderExpenses(){
  const box = $("expensesList");
  if(!box) return;
  box.innerHTML = "";
  expenses.forEach((e,i)=>{
    const row = document.createElement("div");
    row.className = "expense-item";
    const l = document.createElement("input");
    l.className = "field";
    l.placeholder = "Περιγραφή";
    l.value = e.label || "";
    l.oninput = () => { e.label = l.value; markDirty(); };
    const a = document.createElement("input");
    a.className = "field";
    a.type = "number";
    a.value = e.amount ?? "";
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
  revenueEl.value = d.revenue ?? "";
  tip1El.value = d.tip1 ?? "";
  tip2El.value = d.tip2 ?? "";
  noteEl.value = d.note ?? "";
  expenses = Array.isArray(d.expenses) ? d.expenses : [];
  renderExpenses(); calc();
}

async function saveDay({silent=false} = {}){
  const iso = dateInput.value || todayISO();
  const day = {
    date: iso, revenue: n(revenueEl.value), tip1: n(tip1El.value),
    tip2: n(tip2El.value), expenses: expenses, 
    expensesTotal: n(expensesTotalEl.value),
    net: n(kpiNet.textContent.replace(/[^\d.-]/g, '')),
    note: noteEl.value, updatedAt: nowTs()
  };
  await TaxiDB.putDay(day);
  if (!silent) toast("Αποθηκεύτηκε ✅");
}

function markDirty(){
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(()=> saveDay({silent:true}), 1200);
}

revenueEl?.addEventListener("input", ()=>{ calc(); markDirty(); });
tip1El?.addEventListener("input", ()=>{ calc(); markDirty(); });
tip2El?.addEventListener("input", ()=>{ calc(); markDirty(); });
dateInput?.addEventListener("change", () => loadDay(dateInput.value));

/* TABS LOGIC - ΠΡΟΣΘΗΚΗ SETTINGS */
function showTab(tab){
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
  document.querySelector(`.tab[data-tab="${tab}"]`)?.classList.add("active");
  const views = ["entry","history","summary","settings"];
  views.forEach(v=>{
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
  const all = await TaxiDB.getAllDays();
  list.innerHTML = all.map(d => `
    <div class="historyItem" onclick="loadHistoryDay('${d.date}')">
      <div><strong>${d.date}</strong><div class="historyMeta">Τζίρος: ${eur(d.revenue)}</div></div>
      <div class="historyNet">${eur(d.net)}</div>
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
  let r=0, t1=0, t2=0, e=0, n=0;
  all.forEach(d=>{ r+=d.revenue; t1+=d.tip1; t2+=d.tip2; e+=d.expensesTotal; n+=d.net; });
  if(sumDays) sumDays.textContent = all.length;
  if(sumRevenue) sumRevenue.textContent = eur(r);
  if(sumTip1) sumTip1.textContent = eur(t1);
  if(sumTip2) sumTip2.textContent = eur(t2);
  if(sumExpenses) sumExpenses.textContent = eur(e);
  if(sumNet) sumNet.textContent = eur(n);
}

/* DRIVE SYNC HOOKS */
syncLoginBtn?.addEventListener("click", () => DriveSync.signIn());
syncBtn?.addEventListener("click", () => DriveSync.syncNow());

(async function boot(){
  dateInput.value = todayISO();
  await loadDay();
})();
