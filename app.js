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

let expenses = [];

function calc() {
    try {
        const rev = n($("revenue")?.value);
        const t1 = n($("tip1")?.value);
        const t2 = n($("tip2")?.value);
        const exp = expenses.reduce((a, e) => a + n(e.amount), 0);
        
        const total = rev + t1 + t2;
        const net = total - exp;

        if ($("kpiRevenue")) $("kpiRevenue").textContent = eur(rev);
        if ($("kpiExtras")) $("kpiExtras").textContent = eur(t1 + t2);
        if ($("kpiTotal")) $("kpiTotal").textContent = eur(total);
        if ($("kpiNet")) $("kpiNet").textContent = eur(net);
        if ($("expensesTotal")) $("expensesTotal").value = exp.toFixed(2);
    } catch(e) { console.error("Calc error", e); }
}

window.paintSyncUI = () => {
    const sBox = $("syncState");
    if (!sBox) return;
    const state = (typeof DriveSync !== 'undefined' && DriveSync.getState) ? DriveSync.getState() : { accessToken: null };
    sBox.textContent = state.accessToken ? "🟢 Συνδεδεμένο" : "🔴 Offline";
    sBox.style.color = state.accessToken ? "#34d399" : "#ff5b7a";
};

async function saveDay() {
    try {
        const dateVal = $("dateInput")?.value || new Date().toISOString().slice(0, 10);
        const day = {
            date: dateVal,
            revenue: n($("revenue")?.value),
            tip1: n($("tip1")?.value),
            tip2: n($("tip2")?.value),
            expenses: expenses,
            expensesTotal: n($("expensesTotal")?.value),
            net: n($("revenue")?.value) + n($("tip1")?.value) + n($("tip2")?.value) - n($("expensesTotal")?.value),
            updatedAt: Date.now()
        };
        await TaxiDB.putDay(day);
        alert("Αποθηκεύτηκε! ✅");
    } catch (e) { alert("Σφάλμα στην αποθήκευση!"); }
}

// Η καρδιά του προβλήματος: Περιμένουμε να φορτώσουν ΟΛΑ
window.onload = () => {
    console.log("App started...");
    
    // Σύνδεση Save
    $("saveBtn")?.addEventListener("click", saveDay);
    
    // Σύνδεση Google Drive
    $("syncLoginBtn")?.addEventListener("click", () => {
        if(typeof DriveSync !== 'undefined') DriveSync.signIn();
    });
    
    $("syncBtn")?.addEventListener("click", () => {
        if(typeof DriveSync !== 'undefined') DriveSync.syncNow();
    });

    // Σύνδεση Inputs για αυτόματο υπολογισμό
    [$("revenue"), $("tip1"), $("tip2")].forEach(el => {
        el?.addEventListener("input", calc);
    });

    if ($("dateInput")) $("dateInput").value = new Date().toISOString().slice(0, 10);
    
    calc();
    setInterval(window.paintSyncUI, 2000);
};
