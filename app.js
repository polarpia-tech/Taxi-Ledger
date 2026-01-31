"use strict";

const $ = (id) => document.getElementById(id);

// Μετατροπή κειμένου σε καθαρό αριθμό για σωστές προσθέσεις
function n(v) {
  if (v === "" || v == null) return 0;
  const num = parseFloat(String(v).replace(",", "."));
  return isNaN(num) ? 0 : num;
}

function eur(x) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(Number(x || 0));
}

// Βασικές μεταβλητές UI
const revenueEl = $("revenue"), tip1El = $("tip1"), tip2El = $("tip2");
const expensesTotalEl = $("expensesTotal"), noteEl = $("note"), dateInput = $("dateInput");

let expenses = [];

// Υπολογισμός Συνόλων (Διόρθωση για το λάθος 7.700€)
function calc() {
  const rev = n(revenueEl.value);
  const t1 = n(tip1El.value);
  const t2 = n(tip2El.value);
  const exp = expenses.reduce((a, e) => a + n(e.amount), 0);
  
  const totalNet = (rev + t1 + t2) - exp;

  if ($("kpiRevenue")) $("kpiRevenue").textContent = eur(rev);
  if ($("kpiNet")) $("kpiNet").textContent = eur(totalNet);
  if (expensesTotalEl) expensesTotalEl.value = exp.toFixed(2);
}

// Αποθήκευση Ημέρας
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
    alert("Αποθηκεύτηκε επιτυχώς! ✅");
  } catch (e) {
    alert("Σφάλμα αποθήκευσης ❌");
  }
}

// Σύνδεση Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  $("saveBtn")?.addEventListener("click", saveDay);
  [revenueEl, tip1El, tip2El].forEach(el => el?.addEventListener("input", calc));
  
  // Αρχική φόρτωση
  if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
  calc();
});
