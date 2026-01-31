"use strict";

const $ = (id) => document.getElementById(id);

function n(v) {
  if (v === "" || v == null) return 0;
  const num = parseFloat(String(v).replace(",", "."));
  return isNaN(num) ? 0 : num;
}

function eur(x) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(Number(x || 0));
}

// Elements
const revenueEl = $("revenue"), tip1El = $("tip1"), tip2El = $("tip2");
const expensesTotalEl = $("expensesTotal"), noteEl = $("note"), dateInput = $("dateInput");

let expenses = [];

// Υπολογισμός και Ενημέρωση KPIs
function calc() {
  const rev = n(revenueEl.value);
  const t1 = n(tip1El.value);
  const t2 = n(tip2El.value);
  const exp = expenses.reduce((a, e) => a + n(e.amount), 0);
  
  const total = rev + t1 + t2;
  const net = total - exp;

  if ($("kpiRevenue")) $("kpiRevenue").textContent = eur(rev);
  if ($("kpiExtras")) $("kpiExtras").textContent = eur(t1 + t2);
  if ($("kpiTotal")) $("kpiTotal").textContent = eur(total);
  if ($("kpiNet")) $("kpiNet").textContent = eur(net);
  if (expensesTotalEl) expensesTotalEl.value = exp.toFixed(2);
}

// Διαχείριση Εξόδων
function renderExpenses() {
  const box = $("expensesList"); if (!box) return;
  box.innerHTML = "";
  expenses.forEach((e, i) => {
    const row = document.createElement("div");
    row.className = "expense-item";
    row.innerHTML = `
      <input class="field" placeholder="Περιγραφή" value="${e.label || ''}" oninput="expenses[${i}].label=this.value">
      <input class="field" type="number" placeholder="Ποσό" value="${e.amount || ''}" oninput="expenses[${i}].amount=this.value; calc()">
      <button class="miniBtn" onclick="removeExpense(${i})">🗑️</button>
    `;
    box.appendChild(row);
  });
  calc();
}

window.removeExpense = (i) => {
  expenses.splice(i, 1);
  renderExpenses();
};

$("addExpenseBtn")?.addEventListener("click", () => {
  expenses.push({ label: "", amount: "" });
  renderExpenses();
});

// Αποθήκευση
async function saveDay() {
  try {
    const iso = dateInput.value || new Date().toISOString().slice(0, 10);
    const day = {
      date: iso,
      revenue: n(revenueEl.value),
      tip1: n(tip1El.value),
      tip2: n(tip2El.value),
      expenses: expenses,
      expensesTotal: n(expensesTotalEl.value),
      net: n(revenueEl.value) + n(tip1El.value) + n(tip2El.value) - n(expensesTotalEl.value),
      note: noteEl.value,
      updatedAt: Date.now()
    };
    await TaxiDB.putDay(day);
    toast("Αποθηκεύτηκε! ✅");
  } catch (e) { toast("Σφάλμα! ❌"); }
}

// Φόρτωση Ημέρας
async function loadDay(date) {
  const d = await TaxiDB.getDay(date);
  if (d) {
    revenueEl.value = d.revenue || "";
    tip1El.value = d.tip1 || "";
    tip2El.value = d.tip2 || "";
    noteEl.value = d.note || "";
    expenses = d.expenses || [];
  } else {
    revenueEl.value = ""; tip1El.value = ""; tip2El.value = ""; noteEl.value = "";
    expenses = [];
  }
  renderExpenses();
}

// Tabs Navigation
function showTab(tab) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelector(`[data-tab="${tab}"]`)?.classList.add("active");
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  $(`view-${tab}`)?.classList.add("active");

  if (tab === "history") renderHistory();
  if (tab === "summary") renderSummary();
}

async function renderHistory() {
  const list = $("historyList"); if (!list) return;
  const all = await TaxiDB.getAllDays();
  list.innerHTML = all.sort((a,b) => b.date.localeCompare(a.date)).map(d => `
    <div class="historyItem" onclick="loadHistoryDay('${d.date}')">
      <div><strong>${d.date}</strong><br><small>${eur(d.revenue)}</small></div>
      <div style="color:var(--ok)">${eur(d.net)}</div>
    </div>
  `).join("");
}

window.loadHistoryDay = (date) => {
  dateInput.value = date;
  loadDay(date);
  showTab("entry");
};

async function renderSummary() {
  const all = await TaxiDB.getAllDays();
  let r=0, t1=0, t2=0, e=0, n_val=0;
  all.forEach(d => {
    r += n(d.revenue); t1 += n(d.tip1); t2 += n(d.tip2);
    e += n(d.expensesTotal); n_val += n(d.net);
  });
  $("sumDays").textContent = all.length;
  $("sumRevenue").textContent = eur(r);
  $("sumTip1").textContent = eur(t1);
  $("sumTip2").textContent = eur(t2);
  $("sumExpenses").textContent = eur(e);
  $("sumNet").textContent = eur(n_val);
}

// Toast Notification
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.style.display = "block";
  setTimeout(() => t.style.display = "none", 2000);
}

// Drive Sync UI Update
window.paintSyncUI = () => {
  const state = DriveSync.getState();
  const sBox = $("syncState");
  if (sBox) {
    sBox.textContent = state.accessToken ? "🟢 Συνδεδεμένο" : "🔴 Offline";
    sBox.style.color = state.accessToken ? "var(--ok)" : "var(--danger)";
  }
};

// Listeners
document.querySelectorAll(".tab").forEach(t => {
  t.addEventListener("click", () => showTab(t.dataset.tab));
});

$("saveBtn")?.addEventListener("click", saveDay);
$("syncLoginBtn")?.addEventListener("click", () => DriveSync.signIn());
$("syncBtn")?.addEventListener("click", () => DriveSync.syncNow());
dateInput?.addEventListener("change", () => loadDay(dateInput.value));
[revenueEl, tip1El, tip2El].forEach(el => el?.addEventListener("input", calc));

// Init
dateInput.value = new Date().toISOString().slice(0, 10);
loadDay(dateInput.value);
setInterval(window.paintSyncUI, 3000);
