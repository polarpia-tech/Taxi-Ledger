"use strict";

const $ = (id) => document.getElementById(id);

// Διόρθωση μαθηματικών: Μετατροπή σε αριθμό για να αποφύγουμε λάθη τύπου "2+2=22"
function n(v) {
  if (v === "" || v == null) return 0;
  const num = parseFloat(String(v).replace(",", "."));
  return isNaN(num) ? 0 : num;
}

function eur(x) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(Number(x || 0));
}

const revenueEl = $("revenue"), tip1El = $("tip1"), tip2El = $("tip2");
const expensesTotalEl = $("expensesTotal"), noteEl = $("note"), dateInput = $("dateInput");
let expenses = [];

// Υπολογισμός και ενημέρωση της οθόνης
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

// Ενημέρωση του Status για το Google Drive
window.paintSyncUI = () => {
  const state = DriveSync.getState ? DriveSync.getState() : { accessToken: null };
  const sBox = $("syncState");
  if (sBox) {
    sBox.textContent = state.accessToken ? "🟢 Συνδεδεμένο" : "🔴 Offline";
    sBox.style.color = state.accessToken ? "#34d399" : "#ff5b7a";
  }
};

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

function toast(msg) {
  const t = $("toast");
  if(!t) return;
  t.textContent = msg; t.style.display = "block";
  setTimeout(() => t.style.display = "none", 2000);
}

// Σύνδεση κουμπιών - Εδώ ήταν το πρόβλημα
document.addEventListener("DOMContentLoaded", () => {
  $("saveBtn")?.addEventListener("click", saveDay);
  $("syncLoginBtn")?.addEventListener("click", () => DriveSync.signIn());
  $("syncBtn")?.addEventListener("click", () => DriveSync.syncNow());
  
  [revenueEl, tip1El, tip2El].forEach(el => el?.addEventListener("input", calc));
  
  dateInput.value = new Date().toISOString().slice(0, 10);
  calc();
  // Έλεγχος σύνδεσης κάθε 3 δευτερόλεπτα
  setInterval(window.paintSyncUI, 3000);
});
