/* ---------- المرتبات (26 Nov 2026, laid out like the company's own payroll sheet) ----------
   Each employee: number, name, basic salary, allowances, and how he is paid (bank transfer or cash).
   Each month: advances given that month − absence (days → (basic + allowances) ÷ 30 × days, or an amount typed by hand)
   ± other = net. The sheet has two groups, BANK and CASH, like the paper one.
   «مرحّل»: part of one bank-paid salary (Hesham gets 6,000, 4,000 of it is for the cash salaries) is passed on to the
   cash group. So: total salaries = bank + cash − carried, and the custody pays only cash − carried.
   «صرف» records one custody entry per employee (bank ones as paid by the company, so they do not touch the custody)
   and, when there is a carried amount, one deposit into the main custody «مرحّل من راتب …». */
S.payM=null; S.payDraft={}; S.payOpen=false; S.staffOpen=false;
const staffList=()=>(S.settings.staff||[]).filter(e=>e&&e.id);
const staffActive=()=>staffList().filter(e=>e.active!==false);
const staffById=id=>staffList().find(e=>e.id===id);
const staffMode=e=>e&&e.mode==="bank"?"bank":"cash";
const r2p=v=>Math.round(n(v)*100)/100;
const PAYMODES=[["bank","تحويل بنكي — BANK"],["cash","نقداً — CASH"]];
// entries of one employee: salaries paid and advances given
const salEntries=id=>Object.values(S.cu).filter(x=>isExp(x)&&x.cat==="salary"&&x.salEmp===id);
const salPaid=(id,m)=>salEntries(id).find(x=>!x.salAdv&&x.salMonth===m);
const salAdvances=(id,m)=>salEntries(id).filter(x=>x.salAdv&&x.salMonth===m);
const carryEntry=m=>Object.values(S.cu).find(x=>x.kind==="dep"&&x.salCarry&&x.salMonth===m);
const absAuto=(base,allow,days)=>Math.round((n(base)+n(allow))/30*n(days));
function payRow(e,m){ const d=(S.payDraft[m]||{})[e.id]||{}; const p=salPaid(e.id,m);
  const adv=r2p(salAdvances(e.id,m).reduce((a,x)=>a+n(x.amount),0));
  if(p){ const other=p.salOther!=null?n(p.salOther):r2p(n(p.salAdd)-(p.salAbsDed!=null?0:n(p.salDed)));
    return {e,paid:p,mode:p.pay==="gm"?"bank":"cash",base:n(p.salGross),allow:n(p.salAllow),adv:n(p.salAdvDed),days:p.salAbs||"",absDed:n(p.salAbsDed),other,net:n(p.amount),note:p.salNote||""}; }
  const base=n(e.salary), allow=n(e.allow), days=d.days||"", absDed=d.absDed!=null&&d.absDed!==""?n(d.absDed):absAuto(base,allow,days), other=n(d.other);
  return {e,paid:null,mode:staffMode(e),base,allow,adv,days,absDed,other,net:r2p(base+allow-adv-absDed+other),note:d.note||""}; }
// the carried amount of a month: what was recorded, else the month's draft, else the standing one
function payCarry(m){ const c=carryEntry(m); if(c) return {amount:n(c.amount),emp:c.salEmp||"",done:true};
  const d=(S.payDraft[m]||{})._carry, s=S.settings.payCarry||{};
  return {amount:n(d&&d.amount!=null?d.amount:s.amount),emp:(d&&d.emp)||s.emp||"",done:false}; }
function payTotals(m){ const rows=staffActive().map(e=>payRow(e,m)).concat(staffList().filter(e=>e.active===false&&salPaid(e.id,m)).map(e=>payRow(e,m)));
  const sum=(L,k)=>r2p(L.reduce((a,r)=>a+n(r[k]),0)); const bank=rows.filter(r=>r.mode==="bank"), cash=rows.filter(r=>r.mode==="cash");
  const c=payCarry(m), carry=c.amount;
  return {rows,bank,cash,sum,carry,carryEmp:c.emp,carryDone:c.done,bankT:sum(bank,"net"),cashT:sum(cash,"net"),fromCu:r2p(sum(cash,"net")-carry),total:r2p(sum(bank,"net")+sum(cash,"net")-carry)}; }
function payMonths(){ const out=[]; let k=ym(+today().slice(0,4),+today().slice(5,7)); for(let i=0;i<7;i++){ out.push(k); k=prevMonthOf(k+"-15"); } return out; }
const empLbl=e=>`${e.no?`<span class="num muted">${esc(e.no)}</span> `:""}<bdi>${esc(e.name)}</bdi>`;
function payRowHtml(r){ const id=r.e.id, dis=r.paid?"disabled":"";
  const num=(k,v,lbl,ph)=>`<label>${tr(lbl)}<input type="number" inputmode="decimal" dir="ltr" data-pay="${esc(id)}" data-pk="${k}" value="${v!==""&&v!=null&&(r.paid||v!==0)?esc(v):""}" placeholder="${ph??0}" ${dis}></label>`;
  const d=(S.payDraft[S.payM||prevMonthOf(today())]||{})[id]||{};
  return `<div class="payrow ${r.paid?"paid":""}">
   <div class="payhd"><b>${empLbl(r.e)}</b>${r.paid?`<span class="chip done">✓ ${tr("صُرف")} <span class="num">${esc(r.paid.date||"")}</span></span>`:`<span class="small muted">${tr("الأساسي")} <span class="num">${money(r.base)}</span> + ${tr("البدلات")} <span class="num">${money(r.allow)}</span></span>`}</div>
   <div class="paygrid">${num("days",r.days,"أيام الغياب")}${num("absDed",r.paid||(d.absDed!=null&&d.absDed!=="")?r.absDed:"","خصم الغياب",r.absDed)}${num("other",r.paid?r.other:(d.other??""),"أخرى ±")}
    <div class="payv"><span class="small muted">${tr("السلفيات")}</span><b class="num" data-adv>${money(r.adv)}</b></div>
    <div class="payv hl"><span class="small">${tr("صافي الراتب")}</span><b class="num" data-net>${money(r.net)}</b></div></div>
   <input data-pay="${esc(id)}" data-pk="note" value="${esc(r.note)}" placeholder="${tr("ملاحظة تُطبع في الكشف (اختياري)")}" ${dis}>
   ${r.net<0&&!r.paid?`<span class="small neg">${tr("السلف والخصم أكبر من الراتب، لن يُصرف له شيء هذا الشهر")}</span>`:""}</div>`; }
function payrollPanel(){ if(!isAdmin()) return ""; const m=S.payM||prevMonthOf(today()); const T=payTotals(m);
  const unpaid=T.rows.filter(r=>!r.paid&&r.net>0), bankEmps=staffList().filter(e=>staffMode(e)==="bank");
  const grp=(L,lbl)=>L.length?`<h4 class="paygh">${tr(lbl)}</h4>${L.map(payRowHtml).join("")}`:"";
  return `<details class="panel paybox" ${S.payOpen?"open":""}><summary style="cursor:pointer;font-weight:600" data-act="payopen">👔 ${tr("المرتبات")}</summary>
   ${staffActive().length?`<label>${tr("الشهر")}<select data-paym="1">${payMonths().map(k=>`<option value="${k}" ${k===m?"selected":""}>${esc(monthName(k))}</option>`).join("")}</select></label>
   <div class="paylist">${grp(T.bank,"تحويل بنكي — BANK")}${grp(T.cash,"نقداً — CASH")}</div>
   <div class="paycarry"><b>${tr("مرحّل من راتب")}</b>
    <select data-paycarry="emp" ${T.carryDone?"disabled":""}><option value="">—</option>${bankEmps.map(e=>`<option value="${esc(e.id)}" ${e.id===T.carryEmp?"selected":""}>${esc(e.name)}</option>`).join("")}</select>
    <input type="number" inputmode="decimal" dir="ltr" data-paycarry="amount" value="${T.carry||""}" placeholder="0" ${T.carryDone?"disabled":""} aria-label="${tr("المبلغ المرحّل")}">
    <span class="small muted">${tr("جزء من راتب بنكي يُصرف للشباب نقداً")}</span></div>
   <table class="vatsum"><tbody>
    <tr><th>${tr("إجمالي التحويل البنكي")}</th><td class="num" data-tot="bank">${money(T.bankT)}</td></tr>
    <tr><th>${tr("إجمالي الكاش")}</th><td class="num" data-tot="cash">${money(T.cashT)}</td></tr>
    <tr><th>− ${tr("مرحّل")}</th><td class="num" data-tot="carry">${money(T.carry)}</td></tr>
    <tr><th>${tr("الكاش من العهدة")}</th><td class="num" data-tot="fromcu">${money(T.fromCu)}</td></tr>
    <tr class="diff"><th>${tr("المبلغ الكلي للمرتبات")}</th><td class="num" data-tot="total">${money(T.total)}</td></tr></tbody></table>
   <div class="row">${unpaid.length?`<button class="primary ${S.armed==="paygo"?"armed":""}" data-act="paygo">${S.armed==="paygo"?tr("اضغط مرة أخرى للتأكيد"):`✓ ${tr("صرف مرتبات")} ${esc(monthName(m))}`}</button>`:`<span class="chip done">✓ ${tr("صُرفت مرتبات الشهر")}</span>`}
    <button data-act="paypdf">📄 ${tr("كشف المرتبات")}</button></div>
   <p class="small muted" style="margin:0">${tr("البنكي يُسجَّل مدفوعاً من الشركة ولا يُخصم من العهدة. الكاش يُخصم من العهدة، والمرحّل يُسجَّل توريداً إليها.")}</p>`:`<p class="small muted" style="margin:0">${tr("أضف الموظفين ومرتباتهم أولاً.")}</p>`}
   <details ${S.staffOpen||!staffList().length?"open":""}><summary style="cursor:pointer" data-act="staffopen">👥 ${tr("الموظفون والمرتبات")} <span class="num">${staffActive().length}</span></summary>
    <div class="list">${staffList().map(e=>`<div class="staffrow ${e.active===false?"off":""}">
      <input class="sno" data-staff="${esc(e.id)}" data-sk="no" value="${esc(e.no||"")}" placeholder="${tr("رقم")}" aria-label="${tr("رقم الموظف")}" dir="ltr">
      <input data-staff="${esc(e.id)}" data-sk="name" value="${esc(e.name||"")}" placeholder="${tr("الاسم")}" aria-label="${tr("الاسم")}">
      <label>${tr("الأساسي")}<input type="number" inputmode="decimal" dir="ltr" data-staff="${esc(e.id)}" data-sk="salary" value="${esc(e.salary??"")}" placeholder="0"></label>
      <label>${tr("البدلات")}<input type="number" inputmode="decimal" dir="ltr" data-staff="${esc(e.id)}" data-sk="allow" value="${esc(e.allow??"")}" placeholder="0"></label>
      <label>${tr("النوع")}<select data-staff="${esc(e.id)}" data-sk="mode">${PAYMODES.map(([k,l])=>`<option value="${k}" ${staffMode(e)===k?"selected":""}>${tr(l)}</option>`).join("")}</select></label>
      <div class="row"><button class="xs" data-act="payadv" data-id="${esc(e.id)}">💵 ${tr("سلفة")}</button><button class="xs ghost" data-act="payemp" data-id="${esc(e.id)}">📄 ${tr("كشفه")}</button>
       <button class="xs ghost" data-act="staffoff" data-id="${esc(e.id)}">${e.active===false?tr("إعادة تفعيل"):tr("إيقاف")}</button></div>
      ${S.payAdv===e.id?`<div class="row" style="align-items:end"><label style="flex:1">${tr("مبلغ السلفة")}<input id="pay-adv" type="number" inputmode="decimal" dir="ltr" placeholder="0"></label><button class="primary" data-act="payadvok" data-id="${esc(e.id)}">✓ ${tr("تسجيل")}</button></div><span class="small muted">${tr("تُخصم من العهدة الآن، ومن راتبه مباشرة في كشف شهر")} ${esc(monthName(ym(+today().slice(0,4),+today().slice(5,7))))}.</span>`:""}
     </div>`).join("")}</div>
    <div class="staffnew"><label>${tr("موظف جديد")}<input id="staff-new" placeholder="${tr("الاسم")}"></label><label>${tr("رقم")}<input id="staff-no" dir="ltr" placeholder="—"></label>
     <label>${tr("الأساسي")}<input id="staff-sal" type="number" inputmode="decimal" dir="ltr" placeholder="0"></label><label>${tr("البدلات")}<input id="staff-allow" type="number" inputmode="decimal" dir="ltr" placeholder="0"></label>
     <label>${tr("النوع")}<select id="staff-mode">${PAYMODES.map(([k,l])=>`<option value="${k}" ${k==="cash"?"selected":""}>${tr(l)}</option>`).join("")}</select></label><button data-act="staffadd">+ ${tr("إضافة")}</button></div>
   </details></details>`; }

function staffSave(){ settingsSave(); }
async function payGo(m){ const T=payTotals(m); const rows=T.rows.filter(r=>!r.paid&&r.net>0); let k=0;
  for(const r of rows){ const x={id:uid(),kind:"exp",by:cuMe,holder:"main",hv:2,target:"gen",cat:"salary",pay:r.mode==="bank"?"gm":"cash",supplier:r.e.name,amount:r.net,date:today(),
      desc:`${lang==="en"?"Salary":"راتب"} ${monthName(m)} — ${r.e.name}`,salEmp:r.e.id,salMonth:m,salGross:r.base,salAllow:r.allow,salAdvDed:r.adv,salAbs:n(r.days)||0,salAbsDed:r.absDed,salOther:r.other,salNote:r.note,ok:true,fileId:null,fileType:null,createdAt:Date.now()+(k++)};
    S.cu[x.id]=x; cuPut(x,true); }
  if(T.carry>0&&!T.carryDone){ const e=staffById(T.carryEmp);
    const x={id:uid(),kind:"dep",by:cuMe,amount:T.carry,date:today(),desc:`${tr("مرحّل من راتب")} ${e?e.name:""} ${tr("لمرتبات")} ${monthName(m)}`,salCarry:1,salMonth:m,salEmp:T.carryEmp||"",fileId:null,fileType:null,createdAt:Date.now()+(k++)};
    S.cu[x.id]=x; cuPut(x,true);
    S.settings.payCarry={emp:T.carryEmp,amount:T.carry}; staffSave(); }
  delete S.payDraft[m]; toast(`✓ ${tr("صُرفت مرتبات")} ${monthName(m)} · ${rows.length} ${tr("موظف")}`); }
async function makePayPdf(m){ const T=payTotals(m); let notes=[];
  const head=[tr("رقم الموظف"),tr("اسم الموظف"),tr("الراتب الأساسي"),tr("البدلات"),tr("السلفيات"),tr("عدد أيام الغياب"),tr("خصم الغياب"),tr("أخرى"),tr("النوع"),tr("صافي الراتب")];
  const grp=(L,lbl)=>!L.length?"":`<div class="rb"><h2>${tr(lbl)}</h2>${tbl(head,L.map((r,i)=>{ if(r.note) notes.push(`<b>${esc(r.e.name)}</b>: ${esc(r.note)}`);
      return `<tr><td class="num">${esc(r.e.no||String(i+1))}</td><td>${esc(r.e.name)}${r.note?" *":""}</td><td class="num">${money(r.base)}</td><td class="num">${money(r.allow)}</td><td class="num">${money(r.adv)}</td><td class="num">${n(r.days)||""}</td><td class="num">${r.absDed?money(r.absDed):""}</td><td class="num">${r.other?money(r.other):""}</td><td>${r.mode}</td><td class="num"><b>${money(r.net)}</b></td></tr>`; }),
    `<tr><th colspan="9">${tr("المجموع")}</th><th class="num">${money(T.sum(L,"net"))}</th></tr>`)}</div>`;
  const ce=staffById(T.carryEmp);
  const blocks=[grp(T.bank,"تحويل بنكي — BANK"),grp(T.cash,"نقداً — CASH"),
    `<div class="rb"><table class="vatsum"><tbody><tr><th>${tr("إجمالي التحويل البنكي")}</th><td class="num">${money(T.bankT)}</td></tr><tr><th>${tr("إجمالي الكاش")}</th><td class="num">${money(T.cashT)}</td></tr>
     ${T.carry?`<tr><th>− ${tr("مرحّل من راتب")} ${esc(ce?ce.name:"")}</th><td class="num">${money(T.carry)}</td></tr><tr><th>${tr("الكاش من العهدة")}</th><td class="num">${money(T.fromCu)}</td></tr>`:""}
     <tr class="diff"><th>${tr("المبلغ الكلي للمرتبات")}</th><td class="num">${money(T.total)}</td></tr></tbody></table>
     ${notes.length?`<p class="small" style="margin:8px 0 0">* ${notes.join(" &nbsp;|&nbsp; ")}</p>`:""}
     <div class="paysig"><div>${tr("المحاسب")}</div><div>${tr("المدير العام")}</div><div>${tr("الختم")}</div></div></div>`].filter(Boolean);
  await cuPdf(`${tr("كشف مرتبات شهر")} ${esc(monthName(m))}`,blocks,`${tr("كشف المرتبات")} ${m}.pdf`,"pay"); }
async function makeEmpPdf(id){ const e=staffById(id); if(!e) return; const L=salEntries(id).sort((a,b)=>(a.salMonth||"").localeCompare(b.salMonth||"")||String(a.date).localeCompare(String(b.date)));
  const blocks=[`<div class="rb"><h2>${tr("كشف الموظف")}: ${esc(e.name)}${e.no?` (${esc(e.no)})`:""}</h2><p style="margin:0 0 8px">${tr("الراتب الأساسي")}: <b class="num">${money(e.salary)}</b> · ${tr("البدلات")}: <b class="num">${money(e.allow)}</b> · ${staffMode(e)==="bank"?"BANK":"CASH"}</p>${tbl([tr("الشهر"),tr("التاريخ"),tr("البيان"),tr("الأساسي + البدلات"),tr("السلفيات"),tr("خصم الغياب"),tr("أخرى"),tr("المبلغ")],
    L.map(x=>{ const oth=x.salOther!=null?n(x.salOther):r2p(n(x.salAdd)-n(x.salDed));
      return `<tr><td>${esc(monthName(x.salMonth||prevMonthOf(x.date)))}</td><td class="num">${esc(x.date||"")}</td><td>${x.salAdv?tr("سلفة"):tr("راتب")}</td><td class="num">${x.salAdv?"":money(n(x.salGross)+n(x.salAllow))}</td><td class="num">${x.salAdv?"":money(x.salAdvDed)}</td><td class="num">${x.salAdv?"":(n(x.salAbsDed)?money(x.salAbsDed):"")}</td><td class="num">${x.salAdv||!oth?"":money(oth)}</td><td class="num"><b>${money(x.amount)}</b></td></tr>`; }),
    `<tr><th colspan="7">${tr("مجموع ما استلمه")}</th><th class="num">${money(r2p(L.reduce((a,x)=>a+n(x.amount),0)))}</th></tr>`)}</div>`];
  await cuPdf(`${tr("كشف الموظف")} — ${esc(e.name)}`,blocks,`${tr("كشف الموظف")} ${e.name}.pdf`,"pay"); }

function payLive(m){ const T=payTotals(m);
  T.rows.forEach(r=>{ if(r.paid) return; const box=document.querySelector(`.payrow [data-pay="${CSS.escape(r.e.id)}"]`); const row=box&&box.closest(".payrow"); if(!row) return;
    const nb=row.querySelector("[data-net]"); if(nb) nb.textContent=money(r.net); const ad=row.querySelector('[data-pk="absDed"]'); if(ad) ad.placeholder=String(r.absDed); });
  const set=(k,v)=>{ const el=document.querySelector(`[data-tot="${k}"]`); if(el) el.textContent=money(v); };
  set("bank",T.bankT); set("cash",T.cashT); set("carry",T.carry); set("fromcu",T.fromCu); set("total",T.total); }
app.addEventListener("input",e=>{ const t=e.target; const m=S.payM||prevMonthOf(today());
  if(t.dataset.pay){ const D=S.payDraft[m]||(S.payDraft[m]={}); const d=D[t.dataset.pay]||(D[t.dataset.pay]={}); d[t.dataset.pk]=t.value; payLive(m); }
  else if(t.dataset.paycarry){ const D=S.payDraft[m]||(S.payDraft[m]={}); const c=D._carry||(D._carry={...(S.settings.payCarry||{})}); c[t.dataset.paycarry]=t.dataset.paycarry==="amount"?n(t.value):t.value; payLive(m); }
  else if(t.dataset.staff){ const L=staffList(); const s=L.find(x=>x.id===t.dataset.staff); if(!s) return; const k=t.dataset.sk;
    s[k]=(k==="salary"||k==="allow")?(t.value===""?"":n(t.value)):t.value; S.settings.staff=L; clearTimeout(S._stT); S._stT=setTimeout(staffSave,700); } });
app.addEventListener("change",e=>{ const t=e.target; if(t.dataset.paym){ S.payM=t.value; S.payOpen=true; render(); }
  else if(t.dataset.staff&&t.dataset.sk==="mode"){ clearTimeout(S._stT); staffSave(); S.payOpen=true; S.staffOpen=true; render(); } });
app.addEventListener("click",async e=>{ const b=e.target.closest("[data-act]"); if(!b) return; const a=b.dataset.act; if(!/^(pay|staff)/.test(a)) return;
  if(a==="payopen"){ e.preventDefault(); S.payOpen=!S.payOpen; if(b.dataset.m) S.payM=b.dataset.m; render(); return; }
  if(a==="paygoto"){ S.view="cust"; S.payOpen=true; S.payM=b.dataset.m||null; render(); setTimeout(()=>{ const el=document.querySelector(".paybox"); el&&el.scrollIntoView({block:"start",behavior:"smooth"}); },60); return; }
  if(a==="staffopen"){ e.preventDefault(); S.staffOpen=!S.staffOpen; render(); return; }
  if(!isAdmin()) return; const m=S.payM||prevMonthOf(today()); const val=id=>String((document.getElementById(id)||{}).value||"").trim();
  if(a==="staffadd"){ const nm=val("staff-new");
    if(!nm){ toast(tr("اكتب اسم الموظف")); return; } if(staffList().some(x=>String(x.name).trim()===nm)){ toast(tr("الاسم موجود")); return; }
    S.settings.staff=[...staffList(),{id:uid(),no:val("staff-no"),name:nm,salary:n(val("staff-sal")),allow:n(val("staff-allow")),mode:val("staff-mode")==="bank"?"bank":"cash",active:true}]; staffSave(); S.staffOpen=true; S.payOpen=true; render(); }
  else if(a==="staffoff"){ const s=staffById(b.dataset.id); if(!s) return; s.active=s.active===false; S.settings.staff=staffList(); staffSave(); render(); }
  else if(a==="payadv"){ S.payAdv=S.payAdv===b.dataset.id?null:b.dataset.id; S.staffOpen=true; render(); setTimeout(()=>{ const i=document.getElementById("pay-adv"); i&&i.focus(); },50); }
  else if(a==="payadvok"){ const s=staffById(b.dataset.id), v=r2p((document.getElementById("pay-adv")||{}).value); if(!s||!(v>0)){ toast(tr("اكتب مبلغ السلفة")); return; } if(!cuMe){ toast(tr("اكتب اسمك أولاً")); return; }
    const k=ym(+today().slice(0,4),+today().slice(5,7));
    const x={id:uid(),kind:"exp",by:cuMe,holder:"main",hv:2,target:"gen",cat:"salary",pay:"cash",supplier:s.name,amount:v,date:today(),desc:`${tr("سلفة")} — ${s.name}`,salEmp:s.id,salMonth:k,salAdv:1,ok:true,fileId:null,fileType:null,createdAt:Date.now()};
    S.cu[x.id]=x; cuPut(x,true); S.payAdv=null; toast(`✓ ${tr("سُجّلت سلفة")} ${money(v)} — ${s.name}`); render(); }
  else if(a==="paygo"){ if(!cuMe){ toast(tr("اكتب اسمك أولاً")); return; } if(S.armed!=="paygo"){ S.armed="paygo"; render(); setTimeout(()=>{ if(S.armed==="paygo"){ S.armed=null; render(); } },5000); return; }
    S.armed=null; await payGo(m); render(); }
  else if(a==="paypdf"||a==="payemp"){ if(S.busy) return; S.busy=true; b.classList.add("busy");
    try{ if(a==="paypdf") await makePayPdf(m); else await makeEmpPdf(b.dataset.id); }catch(err){ toast((err&&err.message)||tr("تعذر الحفظ")); } S.busy=false; render(); } });
