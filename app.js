(() => {
  const $ = (id) => document.getElementById(id);

  const views = {
    entry: $("view-entry"),
    history: $("view-history"),
    summary: $("view-summary"),
  };

  const dateInput = $("dateInput");
  const revenueEl = $("revenue");
  const tip1El = $("tip1");
  const tip2El = $("tip2");
  const expensesTotalEl = $("expensesTotal");
  const noteEl = $("note");

  const expensesListEl = $("expensesList");
  const addExpenseBtn = $("addExpenseBtn");

  const grossKpi = $("grossKpi");
  const netKpi = $("netKpi");

  const saveBtn = $("saveBtn");
  const resetBtn = $("resetBtn");

  const historyList = $("historyList");
  const historyEmpty = $("historyEmpty");
  const searchInput = $("searchInput");

  const periodSelect = $("periodSelect");
  const summaryUntil = $("summaryUntil");
  const sumRevenue = $("sumRevenue");
  const sumTip1 = $("sumTip1");
  const sumTip2 = $("sumTip2");
  const sumExpenses = $("sumExpenses");
  const sumGross = $("sumGross");
  const sumNet = $("sumNet");
  const sumMeta = $("sumMeta");

  const toast = $("toast");

  let currentExpenses = []; // [{id, label, amount}]
  let editingDate = null;

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    window.setTimeout(() => toast.classList.remove("show"), 1200);
  }

  function toNum(v) {
    if (v == null) return 0;
    const s = String(v).replace(",", ".").trim();
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }

  function eur(n) {
    const x = Number(n || 0);
    return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(x);
  }

  function todayISO() {
    const d = new Date();
    const tz = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return tz.toISOString().slice(0, 10);
  }

  function genId() {
    return Math.random().toString(16).slice(2) + Date.now().toString(16);
  }

  function computeTotals() {
    const revenue = toNum(revenueEl.value);
    const tip1 = toNum(tip1El.value);
    const tip2 = toNum(tip2El.value);
    const expenses = currentExpenses.reduce((a, e) => a + toNum(e.amount), 0);

    const gross = revenue + tip1 + tip2;
    const net = gross - expenses;

    expensesTotalEl.value = (Math.round(expenses * 100) / 100).toFixed(2);
    grossKpi.textContent = eur(gross);

    netKpi.textContent = eur(net);
    netKpi.classList.toggle("good", net >= 0);
    netKpi.classList.toggle("bad", net < 0);
  }

  function renderExpenses() {
    expensesListEl.innerHTML = "";

    if (currentExpenses.length === 0) {
      const p = document.createElement("div");
      p.className = "muted";
      p.style.padding = "6px 2px";
      p.textContent = "Δεν έχεις προσθέσει έξοδα ακόμα. Πάτα “Προσθήκη”.";
      expensesListEl.appendChild(p);
      computeTotals();
      return;
    }

    currentExpenses.forEach((ex) => {
      const row = document.createElement("div");
      row.className = "expense-item";

      const label = document.createElement("input");
      label.className = "field";
      label.placeholder = "Περιγραφή (π.χ. καύσιμα)";
      label.value = ex.label || "";
      label.addEventListener("input", () => {
        ex.label = label.value;
      });

      const amount = document.createElement("input");
      amount.className = "field";
      amount.placeholder = "€";
      amount.inputMode = "decimal";
      amount.value = ex.amount ?? "";
      amount.addEventListener("input", () => {
        ex.amount = amount.value;
        computeTotals();
      });

      const del = document.createElement("button");
      del.className = "btn danger";
      del.style.flex = "0 0 auto";
      del.textContent = "🗑️";
      del.title = "Διαγραφή εξόδου";
      del.addEventListener("click", () => {
        currentExpenses = currentExpenses.filter((x) => x.id !== ex.id);
        renderExpenses();
        computeTotals();
      });

      row.appendChild(label);
      row.appendChild(amount);
      row.appendChild(del);
      expensesListEl.appendChild(row);
    });

    computeTotals();
  }

  function resetForm(keepDate = true) {
    revenueEl.value = "";
    tip1El.value = "";
    tip2El.value = "";
    noteEl.value = "";
    currentExpenses = [];
    editingDate = null;
    if (!keepDate) dateInput.value = todayISO();
    renderExpenses();
    computeTotals();
  }

  function dayFromForm() {
    const date = dateInput.value || todayISO();
    const revenue = toNum(revenueEl.value);
    const tip1 = toNum(tip1El.value);
    const tip2 = toNum(tip2El.value);
    const expenses = currentExpenses
      .map(e => ({ id: e.id, label: (e.label || "").trim(), amount: toNum(e.amount) }))
      .filter(e => e.label.length > 0 || e.amount !== 0);

    const expensesTotal = expenses.reduce((a, e) => a + toNum(e.amount), 0);
    const gross = revenue + tip1 + tip2;
    const net = gross - expensesTotal;

    return {
      date,
      revenue,
      tip1,
      tip2,
      expenses,         // detailed
      expensesTotal,    // computed
      gross,            // computed
      net,              // computed
      note: (noteEl.value || "").trim(),
      updatedAt: Date.now(),
    };
  }

  async function loadDayIntoForm(date) {
    const day = await TaxiDB.getDay(date);
    if (!day) {
      resetForm(true);
      editingDate = null;
      computeTotals();
      return;
    }

    dateInput.value = day.date;
    revenueEl.value = day.revenue ?? "";
    tip1El.value = day.tip1 ?? "";
    tip2El.value = day.tip2 ?? "";
    noteEl.value = day.note ?? "";

    currentExpenses = (day.expenses || []).map(e => ({
      id: e.id || genId(),
      label: e.label || "",
      amount: (e.amount ?? "").toString(),
    }));

    editingDate = day.date;
    renderExpenses();
    computeTotals();
  }

  async function renderHistory(filterText = "") {
    const all = await TaxiDB.getAllDays();
    const f = filterText.trim().toLowerCase();

    const filtered = f.length === 0 ? all : all.filter(d => {
      const inDate = (d.date || "").toLowerCase().includes(f);
      const inNote = (d.note || "").toLowerCase().includes(f);
      return inDate || inNote;
    });

    historyList.innerHTML = "";
    historyEmpty.style.display = filtered.length ? "none" : "block";

    filtered.forEach((d) => {
      const item = document.createElement("div");
      item.className = "day";

      const left = document.createElement("div");
      left.className = "left";

      const date = document.createElement("div");
      date.className = "date";
      date.textContent = d.date;

      const meta = document.createElement("div");
      meta.className = "meta";

      const chip1 = document.createElement("span");
      chip1.className = "chip";
      chip1.textContent = `Τζίρος: ${eur(d.revenue || 0)}`;

      const chip2 = document.createElement("span");
      chip2.className = "chip";
      chip2.textContent = `Έξοδα: ${eur(d.expensesTotal || 0)}`;

      meta.appendChild(chip1);
      meta.appendChild(chip2);

      if (d.note) {
        const note = document.createElement("div");
        note.className = "muted";
        note.textContent = d.note;
        left.appendChild(date);
        left.appendChild(meta);
        left.appendChild(note);
      } else {
        left.appendChild(date);
        left.appendChild(meta);
      }

      const right = document.createElement("div");
      right.className = "right";

      const net = document.createElement("div");
      net.className = "v " + ((d.net ?? 0) >= 0 ? "good" : "bad");
      net.textContent = eur(d.net || 0);

      const btnRow = document.createElement("div");
      btnRow.style.display = "flex";
      btnRow.style.gap = "8px";

      const edit = document.createElement("button");
      edit.className = "btn primary";
      edit.textContent = "✏️";
      edit.title = "Επεξεργασία";
      edit.addEventListener("click", async () => {
        switchTab("entry");
        await loadDayIntoForm(d.date);
        showToast("Άνοιξε για επεξεργασία");
      });

      const del = document.createElement("button");
      del.className = "btn danger";
      del.textContent = "🗑️";
      del.title = "Διαγραφή";
      del.addEventListener("click", async () => {
        const ok = confirm(`Να διαγραφεί η καταχώρηση ${d.date};`);
        if (!ok) return;
        await TaxiDB.deleteDay(d.date);
        showToast("Διαγράφηκε");
        await renderHistory(searchInput.value || "");
        await renderSummary();
      });

      btnRow.appendChild(edit);
      btnRow.appendChild(del);

      right.appendChild(net);
      right.appendChild(btnRow);

      item.appendChild(left);
      item.appendChild(right);

      historyList.appendChild(item);
    });
  }

  function rangeFor(period, untilDateISO) {
    const until = new Date(untilDateISO + "T23:59:59");
    let start;

    if (period === "all") {
      start = new Date("1970-01-01T00:00:00");
    } else if (period === "year") {
      start = new Date(until);
      start.setMonth(0, 1);
      start.setHours(0,0,0,0);
    } else if (period === "month") {
      start = new Date(until);
      start.setDate(1);
      start.setHours(0,0,0,0);
    } else { // week
      start = new Date(until);
      const day = (start.getDay() + 6) % 7; // Monday=0
      start.setDate(start.getDate() - day);
      start.setHours(0,0,0,0);
    }

    return { start, until };
  }

  async function renderSummary() {
    const all = await TaxiDB.getAllDays();
    const untilISO = summaryUntil.value || todayISO();
    const period = periodSelect.value;

    const { start, until } = rangeFor(period, untilISO);

    const inRange = all.filter(d => {
      const t = new Date(d.date + "T12:00:00").getTime();
      return t >= start.getTime() && t <= until.getTime();
    });

    const totals = inRange.reduce((acc, d) => {
      acc.revenue += (d.revenue || 0);
      acc.tip1 += (d.tip1 || 0);
      acc.tip2 += (d.tip2 || 0);
      acc.expenses += (d.expensesTotal || 0);
      acc.gross += (d.gross || ((d.revenue||0)+(d.tip1||0)+(d.tip2||0)));
      acc.net += (d.net || 0);
      return acc;
    }, { revenue:0, tip1:0, tip2:0, expenses:0, gross:0, net:0 });

    sumRevenue.textContent = eur(totals.revenue);
    sumTip1.textContent = eur(totals.tip1);
    sumTip2.textContent = eur(totals.tip2);
    sumExpenses.textContent = eur(totals.expenses);
    sumGross.textContent = eur(totals.gross);
    sumNet.textContent = eur(totals.net);

    sumNet.classList.toggle("good", totals.net >= 0);
    sumNet.classList.toggle("bad", totals.net < 0);

    const fmt = (d) => d.toISOString().slice(0,10);
    sumMeta.textContent = `Καταχωρήσεις: ${inRange.length} • Περίοδος: ${fmt(start)} έως ${untilISO}`;
  }

  function switchTab(tab) {
    // views
    Object.keys(views).forEach(k => views[k].style.display = (k === tab ? "" : "none"));

    // active class
    document.querySelectorAll(".tab").forEach(t => {
      t.classList.toggle("active", t.dataset.tab === tab);
    });

    // refresh data when needed
    if (tab === "history") renderHistory(searchInput.value || "");
    if (tab === "summary") renderSummary();
  }

  function bindTabs() {
    document.querySelectorAll(".tab").forEach(t => {
      t.addEventListener("click", () => switchTab(t.dataset.tab));
    });
  }

  // Events
  function bindInputs() {
    [revenueEl, tip1El, tip2El].forEach(el => el.addEventListener("input", computeTotals));
    noteEl.addEventListener("input", () => {});
    dateInput.addEventListener("change", async () => {
      // if this date exists, load it (so you can edit quickly)
      await loadDayIntoForm(dateInput.value);
    });
  }

  addExpenseBtn.addEventListener("click", () => {
    currentExpenses.unshift({ id: genId(), label: "", amount: "" });
    renderExpenses();
    // focus first label input
    const first = expensesListEl.querySelector("input.field");
    if (first) first.focus();
  });

  saveBtn.addEventListener("click", async () => {
    const day = dayFromForm();
    if (!day.date) { showToast("Δώσε ημερομηνία"); return; }

    await TaxiDB.putDay(day);
    editingDate = day.date;
    showToast("Αποθηκεύτηκε ✅");

    await renderHistory(searchInput.value || "");
    await renderSummary();
  });

  resetBtn.addEventListener("click", () => {
    const ok = confirm("Να καθαρίσει η φόρμα; (Δεν σβήνει αποθηκευμένα δεδομένα)");
    if (!ok) return;
    resetForm(true);
    computeTotals();
  });

  searchInput.addEventListener("input", () => {
    renderHistory(searchInput.value || "");
  });

  periodSelect.addEventListener("change", renderSummary);
  summaryUntil.addEventListener("change", renderSummary);

  async function init() {
    bindTabs();
    bindInputs();

    dateInput.value = todayISO();
    summaryUntil.value = todayISO();

    resetForm(true);
    renderExpenses();
    computeTotals();

    // preload if day exists
    await loadDayIntoForm(dateInput.value);

    // first summary
    await renderSummary();
  }

  init();
})();