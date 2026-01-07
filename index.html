<!doctype html>
<html lang="el">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#0b0f14" />
  <title>Taxi Ledger</title>

  <link rel="manifest" href="./manifest.webmanifest" />
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">

  <style>
    :root{
      --bg0:#070a0f; --bg1:#0b0f14;
      --card:rgba(255,255,255,.06);
      --line:rgba(255,255,255,.12);
      --text:#eaf1ff; --muted:rgba(234,241,255,.65);
      --good:rgba(48,209,88,.95);
      --bad:rgba(255,69,58,.95);
      --accent:rgba(10,132,255,.95);
      --shadow: 0 10px 30px rgba(0,0,0,.35);
      --radius: 18px;
    }
    *{ box-sizing:border-box; }
    html,body{ height:100%; }
    body{
      margin:0;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      background: radial-gradient(1200px 700px at 20% -10%, rgba(10,132,255,.16), transparent 45%),
                  radial-gradient(900px 600px at 90% 10%, rgba(48,209,88,.10), transparent 45%),
                  linear-gradient(180deg, var(--bg0), var(--bg1));
      color: var(--text);
    }
    .app{
      max-width: 520px;
      margin: 0 auto;
      padding: 16px 14px 84px; /* bottom space for tabs */
    }
    header{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      padding: 10px 6px 6px;
    }
    .title{
      display:flex; flex-direction:column;
      line-height:1.1;
    }
    .title h1{
      margin:0;
      font-size: 18px;
      letter-spacing:.2px;
    }
    .title small{
      color: var(--muted);
      font-size: 12px;
      margin-top:4px;
    }
    .pill{
      display:flex; align-items:center; gap:8px;
      padding: 10px 12px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: rgba(255,255,255,.04);
      box-shadow: var(--shadow);
    }
    .pill input{
      background:transparent;
      border:none;
      color:var(--text);
      font-size: 14px;
      outline:none;
      width: 132px;
    }
    .card{
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      padding: 14px;
      margin-top: 12px;
    }
    .grid{
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    label{
      display:flex;
      flex-direction:column;
      gap:6px;
      font-size: 12px;
      color: var(--muted);
    }
    input, button, select, textarea{
      font: inherit;
      color: var(--text);
    }
    .field{
      border: 1px solid var(--line);
      background: rgba(255,255,255,.03);
      border-radius: 14px;
      padding: 11px 12px;
      outline:none;
    }
    .field:focus{
      border-color: rgba(10,132,255,.65);
      box-shadow: 0 0 0 4px rgba(10,132,255,.12);
    }
    .row{
      display:flex;
      gap:10px;
      align-items:center;
    }
    .row > *{ flex:1; }
    .btn{
      border: 1px solid rgba(255,255,255,.14);
      background: rgba(255,255,255,.06);
      padding: 12px 14px;
      border-radius: 14px;
      cursor:pointer;
      transition: transform .04s ease, background .15s ease;
      user-select:none;
    }
    .btn:active{ transform: translateY(1px) scale(.995); }
    .btn.primary{
      background: rgba(10,132,255,.22);
      border-color: rgba(10,132,255,.40);
    }
    .btn.danger{
      background: rgba(255,69,58,.14);
      border-color: rgba(255,69,58,.30);
    }
    .btn.ghost{
      background: transparent;
      border-color: rgba(255,255,255,.10);
    }
    .summary{
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .kpi{
      padding: 12px;
      border-radius: 16px;
      background: rgba(255,255,255,.04);
      border: 1px solid rgba(255,255,255,.10);
    }
    .kpi .k{ font-size:12px; color:var(--muted); }
    .kpi .v{ margin-top:6px; font-size: 18px; font-weight: 700; letter-spacing:.2px; }
    .v.good{ color: rgba(48,209,88,.98); }
    .v.bad{ color: rgba(255,69,58,.98); }

    /* Expenses list */
    .expense-item{
      display:grid;
      grid-template-columns: 1.2fr .8fr auto;
      gap: 8px;
      align-items:center;
      margin-top: 8px;
    }
    .chip{
      display:inline-flex;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,.12);
      background: rgba(255,255,255,.04);
      font-size: 12px;
      color: var(--muted);
      gap:6px;
      align-items:center;
    }
    .muted{ color: var(--muted); }
    .list{
      display:flex;
      flex-direction:column;
      gap: 10px;
    }
    .day{
      padding: 12px;
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,.10);
      background: rgba(255,255,255,.04);
      display:flex;
      justify-content:space-between;
      gap: 12px;
      align-items:flex-start;
    }
    .day .left{ display:flex; flex-direction:column; gap:6px; }
    .day .date{ font-weight: 700; }
    .day .meta{ display:flex; gap:8px; flex-wrap:wrap; }
    .day .right{
      display:flex;
      flex-direction:column;
      align-items:flex-end;
      gap: 8px;
      min-width: 110px;
    }

    /* Tabs bottom */
    .tabs{
      position: fixed;
      left: 0; right: 0; bottom: 0;
      padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
      background: rgba(8,11,16,.82);
      backdrop-filter: blur(14px);
      border-top: 1px solid rgba(255,255,255,.10);
    }
    .tabs .bar{
      max-width: 520px;
      margin: 0 auto;
      display:grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
    }
    .tab{
      display:flex;
      gap:8px;
      align-items:center;
      justify-content:center;
      padding: 12px 10px;
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,.10);
      background: rgba(255,255,255,.04);
      cursor:pointer;
      user-select:none;
    }
    .tab.active{
      background: rgba(10,132,255,.18);
      border-color: rgba(10,132,255,.38);
    }

    .toast{
      position: fixed;
      left: 50%;
      bottom: 84px;
      transform: translateX(-50%);
      padding: 10px 12px;
      border-radius: 999px;
      background: rgba(0,0,0,.65);
      border: 1px solid rgba(255,255,255,.14);
      color: var(--text);
      font-size: 13px;
      opacity: 0;
      pointer-events:none;
      transition: opacity .2s ease, transform .2s ease;
    }
    .toast.show{
      opacity: 1;
      transform: translateX(-50%) translateY(-6px);
    }
    .hr{
      height:1px;
      background: rgba(255,255,255,.10);
      margin: 12px 0;
      border-radius: 99px;
    }

    @media (max-width: 420px){
      .grid{ grid-template-columns: 1fr; }
      .summary{ grid-template-columns: 1fr; }
      .expense-item{ grid-template-columns: 1fr 1fr auto; }
      .pill input{ width: 120px; }
    }
  </style>
</head>

<body>
  <div class="app">
    <header>
      <div class="title">
        <h1>Taxi Ledger</h1>
        <small class="muted">Τζίρος • Μπουρμπουάρ • Έξοδα (offline)</small>
      </div>

      <div class="pill" title="Ημερομηνία καταχώρησης">
        <span style="opacity:.85">📅</span>
        <input id="dateInput" type="date" />
      </div>
    </header>

    <!-- TAB: Entry -->
    <section id="view-entry">
      <div class="card">
        <div class="grid">
          <label>Τζίρος ημέρας (€)
            <input id="revenue" class="field" inputmode="decimal" placeholder="π.χ. 220" />
          </label>

          <label>Μπουρμπουάρ 1 (€)
            <input id="tip1" class="field" inputmode="decimal" placeholder="π.χ. 15" />
          </label>

          <label>Μπουρμπουάρ 2 (€)
            <input id="tip2" class="field" inputmode="decimal" placeholder="π.χ. 5" />
          </label>

          <label>Σύνολο εξόδων (€)
            <input id="expensesTotal" class="field" inputmode="decimal" placeholder="auto" disabled />
          </label>
        </div>

        <div class="hr"></div>

        <div class="row" style="margin-bottom:8px;">
          <div class="chip">🧾 Αναλυτικά έξοδα</div>
          <button id="addExpenseBtn" class="btn">+ Προσθήκη</button>
        </div>

        <div id="expensesList"></div>

        <div class="hr"></div>

        <label>Σημειώσεις
          <textarea id="note" class="field" rows="2" placeholder="π.χ. Βροχή, αεροδρόμιο, νυχτερινό..."></textarea>
        </label>

        <div class="hr"></div>

        <div class="summary">
          <div class="kpi">
            <div class="k">Σύνολο Ημέρας</div>
            <div id="grossKpi" class="v">€0.00</div>
          </div>
          <div class="kpi">
            <div class="k">Καθαρό</div>
            <div id="netKpi" class="v">€0.00</div>
          </div>
        </div>

        <div class="hr"></div>

        <div class="row">
          <button id="saveBtn" class="btn primary">💾 Αποθήκευση</button>
          <button id="resetBtn" class="btn ghost">↩️ Καθαρισμός</button>
        </div>
      </div>
    </section>

    <!-- TAB: History -->
    <section id="view-history" style="display:none;">
      <div class="card">
        <div class="row">
          <label style="flex:1;">Αναζήτηση (ημερομηνία/σημείωση)
            <input id="searchInput" class="field" placeholder="π.χ. 2026-01 ή αεροδρόμιο" />
          </label>
        </div>
        <div class="hr"></div>
        <div id="historyList" class="list"></div>
        <div id="historyEmpty" class="muted" style="display:none; padding: 8px 2px;">
          Δεν υπάρχουν καταχωρήσεις ακόμα.
        </div>
      </div>
    </section>

    <!-- TAB: Summary -->
    <section id="view-summary" style="display:none;">
      <div class="card">
        <div class="row">
          <label>Περίοδος
            <select id="periodSelect" class="field">
              <option value="week">Τρέχουσα εβδομάδα</option>
              <option value="month" selected>Τρέχων μήνας</option>
              <option value="year">Τρέχον έτος</option>
              <option value="all">Όλα</option>
            </select>
          </label>
          <label>Έως (ημερομηνία)
            <input id="summaryUntil" class="field" type="date" />
          </label>
        </div>

        <div class="hr"></div>

        <div class="summary">
          <div class="kpi"><div class="k">Τζίρος</div><div id="sumRevenue" class="v">€0.00</div></div>
          <div class="kpi"><div class="k">Μπουρμπουάρ 1</div><div id="sumTip1" class="v">€0.00</div></div>
          <div class="kpi"><div class="k">Μπουρμπουάρ 2</div><div id="sumTip2" class="v">€0.00</div></div>
          <div class="kpi"><div class="k">Έξοδα</div><div id="sumExpenses" class="v">€0.00</div></div>
          <div class="kpi"><div class="k">Σύνολο</div><div id="sumGross" class="v">€0.00</div></div>
          <div class="kpi"><div class="k">Καθαρό</div><div id="sumNet" class="v">€0.00</div></div>
        </div>

        <div class="hr"></div>

        <div class="muted" id="sumMeta">—</div>
      </div>
    </section>
  </div>

  <div class="tabs">
    <div class="bar">
      <div class="tab active" data-tab="entry">➕ Καταχώρηση</div>
      <div class="tab" data-tab="history">📚 Ιστορικό</div>
      <div class="tab" data-tab="summary">📊 Σύνοψη</div>
    </div>
  </div>

  <div id="toast" class="toast">OK</div>

  <script src="./db.js"></script>
  <script src="./app.js"></script>

  <script>
    // Service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(()=>{});
    }
  </script>
</body>
</html>
