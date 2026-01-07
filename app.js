const $=id=>document.getElementById(id);

const revenueEl=$("revenue"),tip1El=$("tip1"),tip2El=$("tip2");
const expensesTotalEl=$("expensesTotal"),noteEl=$("note");
const grossKpi=$("grossKpi"),netKpi=$("netKpi");
const sumDays=$("sumDays"),sumRevenue=$("sumRevenue"),sumTip1=$("sumTip1");
const sumTip2=$("sumTip2"),sumExpenses=$("sumExpenses");
const sumAllIn=$("sumAllIn"),sumNet=$("sumNet");
const dateInput=$("dateInput");

let expenses=[];

function n(v){return Number(String(v||0).replace(",","."))||0}
function eur(x){return new Intl.NumberFormat("el-GR",{style:"currency",currency:"EUR"}).format(x)}

function today(){
  const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());
  return d.toISOString().slice(0,10);
}

function calc(){
  const r=n(revenueEl.value),t1=n(tip1El.value),t2=n(tip2El.value);
  const exp=expenses.reduce((a,e)=>a+n(e.amount),0);
  const gross=r+t1+t2,net=gross-exp;

  expensesTotalEl.value=exp.toFixed(2);
  grossKpi.textContent=eur(gross);
  netKpi.textContent=eur(net);
}

$("addExpenseBtn").onclick=()=>{
  expenses.push({label:"",amount:0});
  renderExpenses();
};

function renderExpenses(){
  const box=$("expensesList");box.innerHTML="";
  expenses.forEach((e,i)=>{
    const row=document.createElement("div");row.className="expense-item";
    const l=document.createElement("input");l.className="field";l.placeholder="Περιγραφή";
    const a=document.createElement("input");a.className="field";a.placeholder="€";
    const d=document.createElement("button");d.textContent="🗑";d.className="btn danger";
    l.oninput=()=>e.label=l.value;
    a.oninput=()=>{e.amount=a.value;calc()};
    d.onclick=()=>{expenses.splice(i,1);renderExpenses();calc()};
    row.append(l,a,d);box.append(row);
  });
}

$("saveBtn").onclick=async()=>{
  const day={
    date:dateInput.value,
    revenue:n(revenueEl.value),
    tip1:n(tip1El.value),
    tip2:n(tip2El.value),
    expenses,
    expensesTotal:n(expensesTotalEl.value),
    gross:n(revenueEl.value)+n(tip1El.value)+n(tip2El.value),
    net:n(revenueEl.value)+n(tip1El.value)+n(tip2El.value)-n(expensesTotalEl.value),
    note:noteEl.value
  };
  await TaxiDB.putDay(day);
  alert("Αποθηκεύτηκε");
  renderSummary();
};

async function renderSummary(){
  const all=await TaxiDB.getAllDays();

  let t={r:0,t1:0,t2:0,e:0,net:0};
  all.forEach(d=>{
    t.r+=d.revenue||0;
    t.t1+=d.tip1||0;
    t.t2+=d.tip2||0;
    t.e+=d.expensesTotal||0;
    t.net+=d.net||0;
  });

  sumDays.textContent=all.length;
  sumRevenue.textContent=eur(t.r);
  sumTip1.textContent=eur(t.t1);
  sumTip2.textContent=eur(t.t2);
  sumExpenses.textContent=eur(t.e);

  sumAllIn.textContent=eur(t.r+t.t1+t.t2);
  sumNet.textContent=eur(t.net);
}

document.querySelectorAll(".tab").forEach(t=>{
  t.onclick=()=>{
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
    t.classList.add("active");
    ["entry","history","summary"].forEach(v=>{
      $("view-"+v).style.display=(t.dataset.tab===v?"":"none");
    });
    if(t.dataset.tab==="summary")renderSummary();
  };
});

dateInput.value=today();
calc();