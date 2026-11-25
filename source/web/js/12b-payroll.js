/* ---------- المرتبات (26 Nov 2026, laid out like the company's own payroll sheet) ----------
   Paid as two movements: all bank salaries in one (with Hosham's bank receipt), all cash salaries in one.
   Bank salaries are transferred by Hosham from the main custody, so bank and cash both come out of it (26 Nov 2026).
   Its own section (bottom bar), for Hosham and GM only. GM approves the month's sheet before it can be paid;
   any change after approval needs a new approval. Advances can be split over several months, starting the month after.
   Each employee: number, name, basic salary, allowances, and how he is paid (bank transfer or cash).
   Each month: advances given that month − absence (days → (basic + allowances) ÷ 30 × days, or an amount typed by hand)
   ± other = net. The sheet has two groups, BANK and CASH, like the paper one.
   «مرحّل»: part of one bank-paid salary (Hesham gets 6,000, 4,000 of it is for the cash salaries) is passed on to the
   cash group. So: total salaries = bank + cash − carried, and the custody pays only cash − carried.
   «صرف» records one custody entry per employee (bank ones as paid by the company, so they do not touch the custody)
   and, when there is a carried amount, one deposit into the main custody «مرحّل من راتب …». */
S.payM=null; S.payOpen=false; S.staffOpen=false;
// the month's typed values (absence, other, notes) are kept in settings so they survive closing the app
const payDrafts=()=>S.settings.payDraft||(S.settings.payDraft={});
const staffList=()=>(S.settings.staff||[]).filter(e=>e&&e.id);
const staffActive=()=>staffList().filter(e=>e.active!==false);
const staffById=id=>staffList().find(e=>e.id===id);
const staffMode=e=>e&&e.mode==="bank"?"bank":"cash";
const r2p=v=>Math.round(n(v)*100)/100;
const PAYMODES=[["bank","تحويل بنكي — BANK"],["cash","نقداً — CASH"]];
// entries of one employee: salaries paid and advances given
// a month is paid as two custody movements, «رواتب البنك» (with the bank receipt) and «رواتب الكاش»; each keeps every
// employee's line in salRows, read back here as that employee's own entry for his statement
const salEntries=id=>Object.values(S.cu).flatMap(x=>!isExp(x)||x.cat!=="salary"?[]:x.salRows?x.salRows.filter(r=>r.salEmp===id).map(r=>({...r,id:x.id+":"+id,date:x.date,salMonth:x.salMonth,pay:x.pay,salMode:x.salBatch,batch:x.id})):x.salEmp===id?[x]:[]);
const salPaid=(id,m)=>salEntries(id).find(x=>!x.salAdv&&x.salMonth===m);
const carryEntry=m=>Object.values(S.cu).find(x=>x.kind==="dep"&&x.salCarry&&x.salMonth===m);
// months between two "YYYY-MM" keys
const monDiff=(a,b)=>{ const [y1,m1]=a.split("-").map(Number),[y2,m2]=b.split("-").map(Number); return (y2-y1)*12+(m2-m1); };
const nextMonth=k=>{ const [y,m]=k.split("-").map(Number); return m===12?ym(y+1,1):ym(y,m+1); };
const curMonth=()=>ym(+today().slice(0,4),+today().slice(5,7));
// an advance's schedule: n equal instalments from its start month (salMonth), skipping months it was postponed
function advSched(x){ const N=Math.max(1,parseInt(x.salInstN)||1), skip=new Set(x.salSkip||[]), per=Math.floor(n(x.amount)/N*100)/100, out={}; let k=x.salMonth||curMonth(), i=0, g=0;
  while(i<N&&g++<120){ if(!skip.has(k)){ out[k]=i===N-1?r2p(n(x.amount)-per*(N-1)):per; i++; } k=nextMonth(k); } return out; }
const advDue=(x,m)=>advSched(x)[m]||0;
// what is still owed on an employee's advances: all advances − what his paid salaries deducted
const advLeft=id=>r2p(salEntries(id).filter(x=>x.salAdv).reduce((a,x)=>a+n(x.amount),0)-salEntries(id).filter(x=>!x.salAdv).reduce((a,x)=>a+n(x.salAdvDed),0));
const absAuto=(base,allow,days)=>Math.round((n(base)+n(allow))/30*n(days));
function payRow(e,m){ const d=(payDrafts()[m]||{})[e.id]||{}; const p=salPaid(e.id,m);
  const adv=r2p(salEntries(e.id).filter(x=>x.salAdv).reduce((a,x)=>a+advDue(x,m),0));
  if(p){ const other=p.salOther!=null?n(p.salOther):r2p(n(p.salAdd)-(p.salAbsDed!=null?0:n(p.salDed)));
    return {e,paid:p,mode:p.salMode||(p.pay==="gm"||p.pay==="bank"?"bank":"cash"),base:n(p.salGross),allow:n(p.salAllow),adv:n(p.salAdvDed),days:p.salAbs||"",absDed:n(p.salAbsDed),other,net:n(p.amount),note:p.salNote||""}; }
  const base=n(e.salary), allow=n(e.allow), days=d.days||"", absDed=d.absDed!=null&&d.absDed!==""?n(d.absDed):absAuto(base,allow,days), other=n(d.other);
  return {e,paid:null,mode:staffMode(e),base,allow,adv,days,absDed,other,net:r2p(base+allow-adv-absDed+other),note:d.note||""}; }
// the carried amount of a month: what was recorded, else the month's draft, else the standing one
function payCarry(m){ const c=carryEntry(m); if(c) return {amount:n(c.amount),emp:c.salEmp||"",done:true};
  const d=(payDrafts()[m]||{})._carry, s=S.settings.payCarry||{};
  return {amount:n(d&&d.amount!=null?d.amount:s.amount),emp:(d&&d.emp)||s.emp||"",done:false}; }
function payTotals(m){ const byNo=(a,b)=>(parseFloat(a.e.no)||1e9)-(parseFloat(b.e.no)||1e9); const rows=staffActive().map(e=>payRow(e,m)).concat(staffList().filter(e=>e.active===false&&salPaid(e.id,m)).map(e=>payRow(e,m))).sort(byNo);
  const sum=(L,k)=>r2p(L.reduce((a,r)=>a+n(r[k]),0)); const bank=rows.filter(r=>r.mode==="bank"), cash=rows.filter(r=>r.mode==="cash");
  const c=payCarry(m), carry=c.amount;
  return {rows,bank,cash,sum,carry,carryEmp:c.emp,carryDone:c.done,bankT:sum(bank,"net"),cashT:sum(cash,"net"),allT:r2p(sum(bank,"net")+sum(cash,"net")),fromCu:r2p(sum(bank,"net")+sum(cash,"net")-carry),total:r2p(sum(bank,"net")+sum(cash,"net")-carry)}; }
// GM's approval of a month: kept with a fingerprint of the sheet, so any later change needs a new approval
const isGM=()=>!!S.user&&/^(gm|المدير العام)$/i.test(String(S.user.name||"").trim());
const payCan=()=>typeof cuEditor==="function"?cuEditor():isAdmin();
function paySig(m){ const T=payTotals(m); return JSON.stringify([T.rows.map(r=>[r.e.id,r.e.name,r.base,r.allow,r.adv,n(r.days),r.absDed,r.other,r.mode,r.net]),T.carry,T.carryEmp]); }
function payAppr(m){ const a=(S.settings.payAppr||{})[m]; if(!a) return null; return {...a,ok:a.sig===paySig(m)}; }
function payMonths(){ const out=[]; let k=ym(+today().slice(0,4),+today().slice(5,7)); for(let i=0;i<7;i++){ out.push(k); k=prevMonthOf(k+"-15"); } return out; }
const empLbl=e=>`${e.no?`<span class="num muted">${esc(e.no)}</span> `:""}<bdi>${esc(e.name)}</bdi>`;
function payRowHtml(r){ const id=r.e.id, dis=r.paid||S._payLock?"disabled":""; const d=(payDrafts()[S.payM||prevMonthOf(today())]||{})[id]||{};
  const inp=(k,v,ph,w)=>`<input class="${w||"pin"}" ${k==="note"?"":`type="number" inputmode="decimal" dir="ltr"`} data-pay="${esc(id)}" data-pk="${k}" value="${v!==""&&v!=null&&(r.paid||v!==0)?esc(v):""}" placeholder="${esc(ph??"")}" ${dis}>`;
  return `<tr class="payrow ${r.paid?"paid":""}" data-emp="${esc(id)}"><td class="num">${esc(r.e.no||"")}</td><td class="pname"><bdi>${esc(r.e.name)}</bdi>${r.paid?` <span class="chip done" title="${esc(r.paid.date||"")}">✓ ${tr("صُرف")}</span>`:""}</td>
   <td class="num">${money(r.base)}</td><td class="num">${money(r.allow)}</td><td class="num" data-adv>${money(r.adv)}</td>
   <td>${inp("days",r.days,"")}</td><td>${inp("absDed",r.paid||(d.absDed!=null&&d.absDed!=="")?r.absDed:"",r.absDed||"0")}</td><td>${inp("other",r.paid?r.other:(d.other??""),"0")}</td>
   <td>${r.mode}</td><td class="num pnet ${r.net<0&&!r.paid?"neg":""}" data-net>${money(r.net)}</td><td>${inp("note",r.note,tr("ملاحظة"),"pnote")}</td></tr>`; }
// the company's October 2026 sheet (names, numbers, basic, allowances, how paid; and that month's absence, other and notes)
const PAY_SHEET={month:"2026-10",carry:{name:"HESHAM KHAIRELSEED",amount:4000},staff:[
  ["1","HESHAM KHAIRELSEED",5600,400,"bank"],["3","VICTOR ASANTE",900,200,"bank",{other:300}],
  ["1","MOHAM ADAM",1600,400,"cash"],["2","hesham almsre",1400,900,"cash",{absDed:500}],["3","nabil",1400,0,"cash"],
  ["4","mohamed suliman",1300,400,"cash",{other:-50,note:"خصم 50 درهماً."}],["5","abd alla jad",1300,400,"cash",{days:14,absDed:800,note:"توقف عن العمل — عمل 16 يوماً، وصافي راتبه 900 درهم."}],
  ["6","besmark",800,400,"cash"],["7","abd alla",800,400,"cash"]]};
const nmKey=v=>String(v||"").trim().toLowerCase().replace(/\s+/g," ");
const paySheetPending=()=>{ const have=new Set(staffList().map(e=>nmKey(e.name))); return PAY_SHEET.staff.some(r=>!have.has(nmKey(r[1]))); };
function paySheetApply(){ const L=staffList(), D=payDrafts()[PAY_SHEET.month]||(payDrafts()[PAY_SHEET.month]={});
  for(const [no,name,salary,allow,mode,mon] of PAY_SHEET.staff){ let e=L.find(x=>nmKey(x.name)===nmKey(name));
    if(e) Object.assign(e,{no,salary,allow,mode,active:true}); else { e={id:uid(),no,name,salary,allow,mode,active:true}; L.push(e); }
    if(mon&&!salPaid(e.id,PAY_SHEET.month)) D[e.id]={...mon}; }
  S.settings.staff=L; const c=L.find(x=>nmKey(x.name)===nmKey(PAY_SHEET.carry.name)); if(c) S.settings.payCarry={emp:c.id,amount:PAY_SHEET.carry.amount};
  staffSave(); S.payM=PAY_SHEET.month; }
function payView(){ if(!payCan()) return header("👔 "+tr("المرتبات"))+`<div class="panel"><p class="small muted" style="margin:0">${tr("قسم المرتبات لـ Hosham والمدير العام فقط.")}</p></div>`;
  const m=S.payM||prevMonthOf(today()); const T=payTotals(m), A=payAppr(m), allPaid=T.rows.length&&T.rows.every(r=>r.paid||r.net<=0), lock=!!(A&&A.ok)||allPaid;
  const apprBox=!staffActive().length?"":allPaid?"":A&&A.ok?`<div class="panel payappr ok"><b>✓ ${tr("اعتمد المدير العام كشف")} ${esc(monthName(m))}</b><span class="small muted">${esc(A.by)} · <span class="num">${esc(A.date)}</span></span>${isGM()?`<button class="xs ghost" data-act="payunappr">${tr("إلغاء الاعتماد للتعديل")}</button>`:""}</div>`
    :`<div class="panel payappr"><b>${A?`⚠️ ${tr("تغيّر الكشف بعد اعتماده، يحتاج اعتماداً جديداً")}`:`⏳ ${tr("بانتظار اعتماد المدير العام")}`}</b>${isGM()?`<button class="primary ${S.armed==="payappr"?"armed":""}" data-act="payappr">${S.armed==="payappr"?tr("اضغط مرة أخرى للتأكيد"):`✓ ${tr("اعتماد الكشف")} — ${money(T.total)}`}</button>`:`<span class="small muted">${tr("يعتمده المدير العام من حسابه، ثم يُفتح زر الصرف.")}</span>`}</div>`;
  return `<div class="top top-site"><div class="brand"><button class="backbtn" data-act="payback" aria-label="${tr("رجوع")}">${lang==="en"?"←":"→"}</button><span class="eyebrow u">${esc(coName())}</span><h1>👔 ${tr("المرتبات")}</h1></div><div class="row">${userChip()}</div></div>
  ${pdfNotice("pay")}${payrollPanel(m,T,A,lock,apprBox)}`; }
function payrollPanel(m,T,A,lock,apprBox){
  S._payLock=lock; const unpaid=T.rows.filter(r=>!r.paid&&r.net>0), bankEmps=staffList().filter(e=>staffMode(e)==="bank");
  const head=["رقم الموظف","اسم الموظف","الراتب الأساسي","البدلات","السلفيات","أيام الغياب","خصم الغياب","أخرى ±","النوع","صافي الراتب","ملاحظة"];
  const grp=(L,lbl,k)=>L.length?`<h4 class="paygh">${tr(lbl)}</h4><div class="tbl-wrap"><table class="paytbl"><thead><tr>${head.map(h=>`<th>${tr(h)}</th>`).join("")}</tr></thead><tbody>${L.map(payRowHtml).join("")}</tbody>
    <tfoot><tr><th colspan="9">${tr("المجموع")}</th><th class="num" data-tot="${k}">${money(T.sum(L,"net"))}</th><th></th></tr></tfoot></table></div>`:"";
  return `<div class="panel paybox">
   ${paySheetPending()?`<div class="row" style="align-items:center"><button class="primary" data-act="paysheet">📋 ${tr("اعتماد كشف مرتبات أكتوبر 2026")}</button><span class="small muted">${tr("يضيف الموظفين التسعة بأرقامهم ومرتباتهم ونوع الصرف، والمرحّل 4,000، وخصومات أكتوبر")}</span></div>`:""}
   ${staffActive().length?`${apprBox}<label>${tr("الشهر")}<select data-paym="1">${payMonths().map(k=>`<option value="${k}" ${k===m?"selected":""}>${esc(monthName(k))}</option>`).join("")}</select></label>
   <div class="paylist">${grp(T.bank,"تحويل بنكي — BANK","gbank")}${grp(T.cash,"نقداً — CASH","gcash")}</div>
   <div class="paycarry"><b>${tr("مرحّل من راتب")}</b>
    <select data-paycarry="emp" ${T.carryDone||lock?"disabled":""}><option value="">—</option>${bankEmps.map(e=>`<option value="${esc(e.id)}" ${e.id===T.carryEmp?"selected":""}>${esc(e.name)}</option>`).join("")}</select>
    <input type="number" inputmode="decimal" dir="ltr" data-paycarry="amount" value="${T.carry||""}" placeholder="0" ${T.carryDone||lock?"disabled":""} aria-label="${tr("المبلغ المرحّل")}">
    <span class="small muted">${tr("جزء من راتب بنكي يُصرف للشباب نقداً")}</span></div>
   <table class="vatsum"><tbody>
    <tr><th>${tr("إجمالي البنك")}</th><td class="num" data-tot="bank">${money(T.bankT)}</td></tr>
    <tr><th>${tr("إجمالي الكاش")}</th><td class="num" data-tot="cash">${money(T.cashT)}</td></tr>
    <tr><th>${tr("المجموع")}</th><td class="num" data-tot="all">${money(T.allT)}</td></tr>
    <tr><th>− ${tr("مرحّل من راتب")} ${esc((staffById(T.carryEmp)||{}).name||"")}</th><td class="num" data-tot="carry">${money(T.carry)}</td></tr>
    <tr class="diff"><th>${tr("المرتبات")}</th><td class="num" data-tot="total">${money(T.total)}</td></tr></tbody></table>
   <p class="small muted" style="margin:0">${tr("يُخصم من العهدة الرئيسية عند الصرف")}: <b class="num" data-tot="fromcu">${money(T.fromCu)}</b> (${tr("البنك + الكاش − المرحّل")})</p>
   ${unpaid.some(r=>r.mode==="bank")&&A&&A.ok?`<label class="payrcpt">📎 ${tr("إيصال تحويل رواتب البنك")} (<span class="num">${money(T.sum(unpaid.filter(r=>r.mode==="bank"),"net"))}</span>)<input type="file" id="pay-rcpt" accept="image/*,application/pdf"></label>${S.payRcpt?`<span class="chip done">✓ ${esc(S.payRcpt.name||tr("الإيصال"))}</span>`:""}`:""}
   <div class="row">${unpaid.length?(A&&A.ok?`<button class="primary ${S.armed==="paygo"?"armed":""}" data-act="paygo">${S.armed==="paygo"?tr("اضغط مرة أخرى للتأكيد"):`✓ ${tr("صرف مرتبات")} ${esc(monthName(m))}`}</button>`:`<button class="primary" disabled>🔒 ${tr("الصرف بعد اعتماد المدير العام")}</button>`):`<span class="chip done">✓ ${tr("صُرفت مرتبات الشهر")}</span>`}
    <button data-act="paypdf">📄 PDF</button><button data-act="payxlsx">📊 Excel</button></div>
   <p class="small muted" style="margin:0">${tr("رواتب البنك والكاش تُخصم من العهدة الرئيسية عند الصرف، والمرحّل يُسجَّل توريداً إليها.")}</p>`:`<p class="small muted" style="margin:0">${tr("أضف الموظفين ومرتباتهم أولاً.")}</p>`}
   <details ${S.staffOpen||!staffList().length?"open":""}><summary style="cursor:pointer" data-act="staffopen">👥 ${tr("الموظفون والمرتبات")} <span class="num">${staffActive().length}</span></summary>
    <div class="list">${staffList().map(e=>`<div class="staffrow ${e.active===false?"off":""}">
      <input class="sno" data-staff="${esc(e.id)}" data-sk="no" value="${esc(e.no||"")}" placeholder="${tr("رقم")}" aria-label="${tr("رقم الموظف")}" dir="ltr">
      <input data-staff="${esc(e.id)}" data-sk="name" value="${esc(e.name||"")}" placeholder="${tr("الاسم")}" aria-label="${tr("الاسم")}">
      <label>${tr("الأساسي")}<input type="number" inputmode="decimal" dir="ltr" data-staff="${esc(e.id)}" data-sk="salary" value="${esc(e.salary??"")}" placeholder="0"></label>
      <label>${tr("البدلات")}<input type="number" inputmode="decimal" dir="ltr" data-staff="${esc(e.id)}" data-sk="allow" value="${esc(e.allow??"")}" placeholder="0"></label>
      <label>${tr("النوع")}<select data-staff="${esc(e.id)}" data-sk="mode">${PAYMODES.map(([k,l])=>`<option value="${k}" ${staffMode(e)===k?"selected":""}>${tr(l)}</option>`).join("")}</select></label>
      <div class="row"><button class="xs" data-act="payadv" data-id="${esc(e.id)}">💵 ${tr("سلفة")}</button><button class="xs ghost" data-act="payemp" data-id="${esc(e.id)}">📄 ${tr("كشفه")}</button>
       <button class="xs ghost" data-act="staffoff" data-id="${esc(e.id)}">${e.active===false?tr("إعادة تفعيل"):tr("إيقاف")}</button></div>
      ${S.payAdv===e.id?`<div class="row" style="align-items:end"><label style="flex:1">${tr("مبلغ السلفة")}<input id="pay-adv" type="number" inputmode="decimal" dir="ltr" placeholder="0"></label><label style="width:110px">${tr("تُقسَّط على (شهر)")}<input id="pay-advn" type="number" inputmode="numeric" dir="ltr" min="1" max="24" value="1"></label><button class="primary" data-act="payadvok" data-id="${esc(e.id)}">✓ ${tr("تسجيل")}</button></div><span class="small muted">${tr("تُخصم من العهدة الآن، ويبدأ خصمها من راتبه من كشف شهر")} ${esc(monthName(nextMonth(curMonth())))}.</span>`:""}
     </div>`).join("")}</div>
    <div class="staffnew"><label>${tr("موظف جديد")}<input id="staff-new" placeholder="${tr("الاسم")}"></label><label>${tr("رقم")}<input id="staff-no" dir="ltr" placeholder="—"></label>
     <label>${tr("الأساسي")}<input id="staff-sal" type="number" inputmode="decimal" dir="ltr" placeholder="0"></label><label>${tr("البدلات")}<input id="staff-allow" type="number" inputmode="decimal" dir="ltr" placeholder="0"></label>
     <label>${tr("النوع")}<select id="staff-mode">${PAYMODES.map(([k,l])=>`<option value="${k}" ${k==="cash"?"selected":""}>${tr(l)}</option>`).join("")}</select></label><button data-act="staffadd">+ ${tr("إضافة")}</button></div>
   </details></div>${advPanel()}`; }

// open advances: amount, instalments, what is left; postpone the sheet month's instalment
function advPanel(){ const m=S.payM||prevMonthOf(today());
  const L=staffList().map(e=>({e,adv:salEntries(e.id).filter(x=>x.salAdv).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0)),left:advLeft(e.id)})).filter(o=>o.left>0.005);
  if(!L.length) return "";
  return `<div class="panel"><h3 style="margin:0">💵 ${tr("السلف والأقساط")}</h3>${L.map(o=>`<div class="advemp"><b>${empLbl(o.e)}</b> <span class="small">${tr("المتبقي عليه")}: <b class="num">${money(o.left)}</b></span>
    ${o.adv.filter(x=>Object.keys(advSched(x)).some(k=>k>=m)).map(x=>{ const sc=advSched(x), N=Math.max(1,parseInt(x.salInstN)||1), due=sc[m], skipped=(x.salSkip||[]).includes(m);
      return `<div class="small advline"><span><span class="num">${esc(x.date||"")}</span> · ${money(x.amount)}${N>1?` · ${N} ${tr("أقساط")}`:""}</span>
       <span class="muted">${Object.entries(sc).map(([k,v])=>`${esc(monthName(k))}: <span class="num">${money(v)}</span>`).join(" · ")}</span>
       ${(due||skipped)&&!salPaid(x.salEmp,m)?`<button class="xs ghost" data-act="payskip" data-id="${esc(x.id)}" data-m="${m}">${skipped?tr("إلغاء التأجيل"):`${tr("تأجيل قسط")} ${esc(monthName(m))}`}</button>`:""}</div>`; }).join("")}</div>`).join("")}</div>`; }
function staffSave(){ settingsSave(); }
async function payGo(m){ const T=payTotals(m); const rows=T.rows.filter(r=>!r.paid&&r.net>0); let k=0, rc=null;
  if(rows.some(r=>r.mode==="bank")){ if(!S.payRcpt){ toast(tr("أرفق إيصال تحويل البنك أولاً")); return false; }
    const u=await cuUpload(S.payRcpt); if(!u){ toast(tr("تعذر رفع الإيصال")); return false; } rc=u.r; }
  for(const mode of ["bank","cash"]){ const L=rows.filter(r=>r.mode===mode); if(!L.length) continue;
    const lbl=mode==="bank"?tr("رواتب البنك"):tr("رواتب الكاش");
    const x={id:uid(),kind:"exp",by:cuMe,holder:"main",hv:2,target:"gen",cat:"salary",pay:mode,salBatch:mode,supplier:`${lbl} ${monthName(m)}`,amount:r2p(L.reduce((a,r)=>a+r.net,0)),date:today(),
      desc:`${lbl} ${monthName(m)} — ${L.length} ${tr("موظف")}`,salMonth:m,ok:true,fileId:mode==="bank"&&rc?rc.id:null,fileType:mode==="bank"&&rc?rc.type:null,createdAt:Date.now()+(k++),
      salRows:L.map(r=>({salEmp:r.e.id,supplier:r.e.name,amount:r.net,salGross:r.base,salAllow:r.allow,salAdvDed:r.adv,salAbs:n(r.days)||0,salAbsDed:r.absDed,salOther:r.other,salNote:r.note}))};
    S.cu[x.id]=x; cuPut(x,true); }
  if(T.carry>0&&!T.carryDone){ const e=staffById(T.carryEmp);
    const x={id:uid(),kind:"dep",by:cuMe,amount:T.carry,date:today(),desc:`${tr("مرحّل من راتب")} ${e?e.name:""} ${tr("لمرتبات")} ${monthName(m)}`,salCarry:1,salMonth:m,salEmp:T.carryEmp||"",fileId:null,fileType:null,createdAt:Date.now()+(k++)};
    S.cu[x.id]=x; cuPut(x,true);
    S.settings.payCarry={emp:T.carryEmp,amount:T.carry}; staffSave(); }
  delete payDrafts()[m]; staffSave(); S.payRcpt=null; toast(`✓ ${tr("صُرفت مرتبات")} ${monthName(m)} · ${rows.length} ${tr("موظف")}`); return true; }
// the sheet as the company's paper: logo, brown title, BANK and CASH tables, totals box, notes, signatures
const PAYHEAD=["رقم الموظف","اسم الموظف","الراتب الأساسي","البدلات","السلفيات","عدد أيام الغياب","خصم الغياب","أخرى","النوع","صافي الراتب"];
function paySheetData(m){ const T=payTotals(m), ce=staffById(T.carryEmp), A=payAppr(m); const notes=T.rows.filter(r=>r.note).map(r=>[r.e.name,r.note]);
  const cells=r=>[r.e.no||"",r.e.name+(r.note?" *":""),r.base,r.allow,r.adv,r.mode==="bank"&&!n(r.days)?"":n(r.days),r.mode==="bank"&&!r.absDed?"":r.absDed,r.mode==="bank"&&!r.other?"":r.other,r.mode,r.net];
  return {T,A,notes,cells,title:`${tr("كشف مرتبات شهر")} ${monthName(m)}`,carryLbl:`${tr("مرحّل من راتب")} ${ce?ce.name:""}`}; }
function paySheetHtml(m){ const D=paySheetData(m), T=D.T; const f=v=>typeof v==="number"?money(v):esc(v);
  const grp=(L,lbl)=>!L.length?"":`<h3 class="psg">${tr(lbl)}</h3><table class="pst"><thead><tr>${PAYHEAD.map(h=>`<th>${tr(h)}</th>`).join("")}</tr></thead><tbody>${L.map(r=>`<tr>${D.cells(r).map((c,i)=>`<td class="${i===1?"nm":i===9?"net":""}">${f(c)}</td>`).join("")}</tr>`).join("")}</tbody>
    <tfoot><tr><td colspan="9" class="blank"></td><td class="gt">${money(T.sum(L,"net"))}</td></tr></tfoot></table>`;
  return `<div class="psheet" dir="rtl"><div class="pshead"><img src="./logo.png" alt=""></div><div class="psline"></div><div class="pstitle">${esc(D.title)}</div>
   ${grp(T.bank,"تحويل بنكي — BANK")}${grp(T.cash,"نقداً — CASH")}
   <table class="psbox"><tbody><tr><th>${tr("إجمالي البنك")}</th><td>${money(T.bankT)}</td></tr><tr><th>${tr("إجمالي الكاش")}</th><td>${money(T.cashT)}</td></tr>
    <tr class="sub"><th>${tr("المجموع")}</th><td>${money(T.allT)}</td></tr><tr><th>− ${esc(D.carryLbl)}</th><td>${money(T.carry)}</td></tr><tr class="tot"><th>${tr("المرتبات")}</th><td>${money(T.total)}</td></tr></tbody></table>
   ${D.notes.length?`<p class="psnote">${D.notes.map(([a,b])=>`* <b>${esc(a)}</b>: ${esc(b)}`).join(" &nbsp;|&nbsp; ")}</p>`:""}
   <div class="pssig"><div>${tr("المحاسب")}</div><div>${D.A&&D.A.ok?`<span class="psok">✓ ${tr("معتمد")} — ${esc(D.A.by)} · ${esc(D.A.date)}</span>`:""}${tr("المدير العام")}</div><div>${tr("الختم")}</div></div></div>`; }
async function makePayPdf(m){ if(!window.html2canvas||!window.jspdf) throw new Error(tr("مكتبة التقرير لم تُحمّل"));
  let host=document.getElementById("dochost"); if(!host){ host=document.createElement("div"); host.id="dochost"; host.setAttribute("aria-hidden","true"); document.body.appendChild(host); }
  host.innerHTML=paySheetHtml(m); translate(host);
  await Promise.all([...host.querySelectorAll("img")].map(im=>im.complete?0:new Promise(r=>{ im.onload=im.onerror=r; }))); try{ await document.fonts.ready; }catch(e){}
  const cv=await html2canvas(host.firstElementChild,{scale:2,backgroundColor:"#ffffff",logging:false}); host.innerHTML="";
  const { jsPDF }=window.jspdf; const pdf=new jsPDF({unit:"mm",format:"a4",orientation:"landscape"}); const W=297,H=210; let w=W,h=cv.height*W/cv.width; if(h>H){ h=H; w=cv.width*H/cv.height; }
  pdf.addImage(cv.toDataURL("image/jpeg",0.92),"JPEG",(W-w)/2,0,w,h);
  if(!downloads) throw new Error(tr("الحفظ غير متاح في هذا العرض"));
  try{ await downloads.save({filename:`${tr("كشف المرتبات")} ${m}.pdf`,data:pdf.output("blob")}); S.lastPdf="pay"; }
  catch(err){ if(err&&err.code==="declined") toast("لم يُحفظ الملف"); else throw new Error(err&&err.message||"تعذر الحفظ"); } }
// ---- Excel (.xlsx written by hand: a small zip of XML parts, styled like the paper) ----
const xEsc=v=>String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const CRC=(()=>{ const t=new Uint32Array(256); for(let i=0;i<256;i++){ let c=i; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; t[i]=c>>>0; } return t; })();
const crc32=u=>{ let c=0xFFFFFFFF; for(let i=0;i<u.length;i++) c=CRC[(c^u[i])&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0; };
function zipStore(files){ const te=new TextEncoder(), parts=[], cen=[]; let off=0;
  for(const [name,txt] of files){ const nm=te.encode(name), d=te.encode(txt), c=crc32(d);
    const h=new DataView(new ArrayBuffer(30)); h.setUint32(0,0x04034b50,true); h.setUint16(4,20,true); h.setUint16(6,0x0800,true); h.setUint32(14,c,true); h.setUint32(18,d.length,true); h.setUint32(22,d.length,true); h.setUint16(26,nm.length,true);
    parts.push(h.buffer,nm,d);
    const z=new DataView(new ArrayBuffer(46)); z.setUint32(0,0x02014b50,true); z.setUint16(4,20,true); z.setUint16(6,20,true); z.setUint16(8,0x0800,true); z.setUint32(16,c,true); z.setUint32(20,d.length,true); z.setUint32(24,d.length,true); z.setUint16(28,nm.length,true); z.setUint32(42,off,true);
    cen.push(z.buffer,nm); off+=30+nm.length+d.length; }
  const cs=cen.reduce((a,b)=>a+(b.byteLength||b.length),0), e=new DataView(new ArrayBuffer(22)); e.setUint32(0,0x06054b50,true); e.setUint16(8,files.length,true); e.setUint16(10,files.length,true); e.setUint32(12,cs,true); e.setUint32(16,off,true);
  return new Blob([...parts,...cen,e.buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}); }
// styles: 1 title, 2 header, 3 text, 4 number, 5 net, 6 group total, 7 group label, 8 box label, 9 box number, 10 box total label, 11 box total number, 12 note
const XSTY=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.##"/></numFmts>
<fonts count="5"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="16"/><color rgb="FF5A3A1E"/><name val="Arial"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font><font><b/><sz val="11"/><name val="Arial"/></font><font><b/><sz val="12"/><color rgb="FF5A3A1E"/><name val="Arial"/></font></fonts>
<fills count="6"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF5A3A1E"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF0E4D6"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFB07A3C"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF7F0E8"/></patternFill></fill></fills>
<borders count="2"><border/><border><left style="thin"><color rgb="FFC9B49A"/></left><right style="thin"><color rgb="FFC9B49A"/></right><top style="thin"><color rgb="FFC9B49A"/></top><bottom style="thin"><color rgb="FFC9B49A"/></bottom></border></borders>
<cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="13"><xf/>
<xf fontId="1" applyFont="1"><alignment horizontal="center"/></xf>
<xf fontId="2" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf fontId="3" borderId="1" applyFont="1" applyBorder="1"/>
<xf numFmtId="164" borderId="1" applyNumberFormat="1" applyBorder="1"><alignment horizontal="center"/></xf>
<xf numFmtId="164" fontId="3" fillId="3" borderId="1" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center"/></xf>
<xf numFmtId="164" fontId="2" fillId="4" borderId="1" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center"/></xf>
<xf fontId="4" applyFont="1"/>
<xf fontId="3" fillId="5" borderId="1" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="164" fontId="3" borderId="1" applyNumberFormat="1" applyFont="1" applyBorder="1"><alignment horizontal="center"/></xf>
<xf fontId="2" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="164" fontId="2" fillId="2" borderId="1" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center"/></xf>
<xf/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
function payXlsxParts(m){ const D=paySheetData(m), T=D.T, rows=[], merges=[]; let R=0; const col=i=>String.fromCharCode(65+i);
  const cell=(c,v,st,fm)=>{ const ref=col(c)+R; if(fm) return `<c r="${ref}" s="${st}"><f>${xEsc(fm)}</f><v>${n(v)}</v></c>`; if(v===""||v==null) return `<c r="${ref}" s="${st}"/>`;
    return typeof v==="number"?`<c r="${ref}" s="${st}"><v>${v}</v></c>`:`<c r="${ref}" s="${st}" t="inlineStr"><is><t>${xEsc(v)}</t></is></c>`; };
  const row=(cs,ht)=>{ R++; rows.push(`<row r="${R}"${ht?` ht="${ht}" customHeight="1"`:""}>${cs.map(f=>f()).join("")}</row>`); };
  row([()=>cell(0,tr("أصيل للألمنيوم والزجاج ذ م م — ASEEL ALUMINIUM & GLASS LLC"),1)],24); merges.push(`A${R}:J${R}`);
  row([()=>cell(0,D.title,1)],22); merges.push(`A${R}:J${R}`); R++;
  const totRefs={};
  const grp=(L,lbl,k)=>{ if(!L.length) return; row([()=>cell(0,tr(lbl),7)]); row(PAYHEAD.map((h,i)=>()=>cell(i,tr(h),2)),30); const first=R+1;
    L.forEach(r=>{ const c=D.cells(r); row(c.map((v,i)=>()=>i===9?cell(i,v,5,`C${R}+D${R}-E${R}-G${R}+H${R}`):cell(i,v,i<2||i===8?3:4))); });
    row([...Array(9)].map((_,i)=>()=>cell(i,"",0)).concat([()=>cell(9,T.sum(L,"net"),6,`SUM(J${first}:J${R-1})`)])); totRefs[k]=`J${R}`; R++; };
  grp(T.bank,"تحويل بنكي — BANK","bank"); grp(T.cash,"نقداً — CASH","cash");
  const box=(l,v,f,tot)=>{ row([5,6,7,8].map(i=>()=>cell(i,i===5?l:"",tot?10:8)).concat([()=>cell(9,v,tot?11:9,f)])); merges.push(`F${R}:I${R}`); };
  box(tr("إجمالي البنك"),T.bankT,totRefs.bank||null); const rb=R; box(tr("إجمالي الكاش"),T.cashT,totRefs.cash||null); const rc=R;
  box(tr("المجموع"),T.allT,`J${rb}+J${rc}`); const ra=R; box("− "+D.carryLbl,T.carry); const rk=R; box(tr("المرتبات"),T.total,`J${ra}-J${rk}`,true);
  if(D.notes.length){ R++; D.notes.forEach(([a,b])=>{ row([()=>cell(0,`* ${a}: ${b}`,12)]); merges.push(`A${R}:J${R}`); }); }
  R++; row([()=>cell(0,tr("المحاسب"),7),()=>cell(4,tr("المدير العام")+(D.A&&D.A.ok?` — ✓ ${tr("معتمد")} ${D.A.by} ${D.A.date}`:""),7),()=>cell(8,tr("الختم"),7)]);
  const widths=[11,24,13,11,11,13,12,10,9,14];
  const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView rightToLeft="1" workbookViewId="0"/></sheetViews>
<cols>${widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join("")}</cols><sheetData>${rows.join("")}</sheetData><mergeCells count="${merges.length}">${merges.map(x=>`<mergeCell ref="${x}"/>`).join("")}</mergeCells>
<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="1"/></worksheet>`;
  return [["[Content_Types].xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
    ["_rels/.rels",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ["xl/workbook.xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets><sheet name="${xEsc(m)}" sheetId="1" r:id="rId1"/></sheets><calcPr fullCalcOnLoad="1"/></workbook>`],
    ["xl/_rels/workbook.xml.rels",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ["xl/styles.xml",XSTY],["xl/worksheets/sheet1.xml",sheet]]; }
async function makePayXlsx(m){ const blob=zipStore(payXlsxParts(m)); if(!downloads) throw new Error(tr("الحفظ غير متاح في هذا العرض"));
  try{ await downloads.save({filename:`${tr("كشف المرتبات")} ${m}.xlsx`,data:blob}); S.lastPdf="pay"; }
  catch(err){ if(err&&err.code==="declined") toast("لم يُحفظ الملف"); else throw new Error(err&&err.message||"تعذر الحفظ"); } }
async function makeEmpPdf(id){ const e=staffById(id); if(!e) return; const L=salEntries(id).sort((a,b)=>(a.salMonth||"").localeCompare(b.salMonth||"")||String(a.date).localeCompare(String(b.date)));
  const blocks=[`<div class="rb"><h2>${tr("كشف الموظف")}: ${esc(e.name)}${e.no?` (${esc(e.no)})`:""}</h2><p style="margin:0 0 8px">${tr("الراتب الأساسي")}: <b class="num">${money(e.salary)}</b> · ${tr("البدلات")}: <b class="num">${money(e.allow)}</b> · ${staffMode(e)==="bank"?"BANK":"CASH"}</p>${tbl([tr("الشهر"),tr("التاريخ"),tr("البيان"),tr("الأساسي + البدلات"),tr("السلفيات"),tr("خصم الغياب"),tr("أخرى"),tr("المبلغ")],
    L.map(x=>{ const oth=x.salOther!=null?n(x.salOther):r2p(n(x.salAdd)-n(x.salDed));
      return `<tr><td>${esc(monthName(x.salMonth||prevMonthOf(x.date)))}</td><td class="num">${esc(x.date||"")}</td><td>${x.salAdv?tr("سلفة"):tr("راتب")}</td><td class="num">${x.salAdv?"":money(n(x.salGross)+n(x.salAllow))}</td><td class="num">${x.salAdv?"":money(x.salAdvDed)}</td><td class="num">${x.salAdv?"":(n(x.salAbsDed)?money(x.salAbsDed):"")}</td><td class="num">${x.salAdv||!oth?"":money(oth)}</td><td class="num"><b>${money(x.amount)}</b></td></tr>`; }),
    `<tr><th colspan="7">${tr("مجموع ما استلمه")}</th><th class="num">${money(r2p(L.reduce((a,x)=>a+n(x.amount),0)))}</th></tr>`)}</div>`];
  await cuPdf(`${tr("كشف الموظف")} — ${esc(e.name)}`,blocks,`${tr("كشف الموظف")} ${e.name}.pdf`,"pay"); }

function payLive(m){ const T=payTotals(m);
  T.rows.forEach(r=>{ if(r.paid) return; const row=document.querySelector(`tr.payrow[data-emp="${CSS.escape(r.e.id)}"]`); if(!row) return;
    const nb=row.querySelector("[data-net]"); if(nb){ nb.textContent=money(r.net); nb.classList.toggle("neg",r.net<0); } const ad=row.querySelector('[data-pk="absDed"]'); if(ad) ad.placeholder=String(r.absDed); });
  const set=(k,v)=>{ const el=document.querySelector(`[data-tot="${k}"]`); if(el) el.textContent=money(v); };
  set("bank",T.bankT); set("cash",T.cashT); set("carry",T.carry); set("fromcu",T.fromCu); set("total",T.total); set("all",T.allT); set("gbank",T.bankT); set("gcash",T.cashT); }
app.addEventListener("input",e=>{ const t=e.target; const m=S.payM||prevMonthOf(today());
  if(t.dataset.pay){ const D=payDrafts()[m]||(payDrafts()[m]={}); const d=D[t.dataset.pay]||(D[t.dataset.pay]={}); d[t.dataset.pk]=t.value; payLive(m); clearTimeout(S._pdT); S._pdT=setTimeout(staffSave,800); }
  else if(t.dataset.paycarry){ const D=payDrafts()[m]||(payDrafts()[m]={}); const c=D._carry||(D._carry={...(S.settings.payCarry||{})}); c[t.dataset.paycarry]=t.dataset.paycarry==="amount"?n(t.value):t.value; payLive(m); clearTimeout(S._pdT); S._pdT=setTimeout(staffSave,800); }
  else if(t.dataset.staff){ const L=staffList(); const s=L.find(x=>x.id===t.dataset.staff); if(!s) return; const k=t.dataset.sk;
    s[k]=(k==="salary"||k==="allow")?(t.value===""?"":n(t.value)):t.value; S.settings.staff=L; clearTimeout(S._stT); S._stT=setTimeout(staffSave,700); } });
app.addEventListener("change",e=>{ const t=e.target; if(t.id==="pay-rcpt"){ S.payRcpt=t.files&&t.files[0]||null; render(); return; } if(t.dataset.paym){ S.payM=t.value; S.payOpen=true; render(); }
  else if(t.dataset.staff&&t.dataset.sk==="mode"){ clearTimeout(S._stT); staffSave(); S.payOpen=true; S.staffOpen=true; render(); } });
app.addEventListener("click",async e=>{ const b=e.target.closest("[data-act]"); if(!b) return; const a=b.dataset.act; if(!/^(pay|staff)/.test(a)) return;
  if(a==="payopen"||a==="paygoto"){ e.preventDefault(); if(S.view!=="pay") S.payFrom=S.view; S.view="pay"; S.pick=null; if(b.dataset.m) S.payM=b.dataset.m; render(); window.scrollTo(0,0); return; }
  if(a==="payback"){ S.view=S.payFrom&&S.payFrom!=="pay"?S.payFrom:"list"; render(); window.scrollTo(0,0); return; }
  if(a==="staffopen"){ e.preventDefault(); S.staffOpen=!S.staffOpen; render(); return; }
  if(!payCan()) return; const m=S.payM||prevMonthOf(today()); const val=id=>String((document.getElementById(id)||{}).value||"").trim();
  if(a==="paysheet"){ paySheetApply(); S.payOpen=true; render(); toast(`✓ ${tr("اعتُمد كشف أكتوبر")}: ${staffActive().length} ${tr("موظف")}`); return; }
  if(a==="staffadd"){ const nm=val("staff-new");
    if(!nm){ toast(tr("اكتب اسم الموظف")); return; } if(staffList().some(x=>String(x.name).trim()===nm)){ toast(tr("الاسم موجود")); return; }
    S.settings.staff=[...staffList(),{id:uid(),no:val("staff-no"),name:nm,salary:n(val("staff-sal")),allow:n(val("staff-allow")),mode:val("staff-mode")==="bank"?"bank":"cash",active:true}]; staffSave(); S.staffOpen=true; S.payOpen=true; render(); }
  else if(a==="staffoff"){ const s=staffById(b.dataset.id); if(!s) return; s.active=s.active===false; S.settings.staff=staffList(); staffSave(); render(); }
  else if(a==="payadv"){ S.payAdv=S.payAdv===b.dataset.id?null:b.dataset.id; S.staffOpen=true; render(); setTimeout(()=>{ const i=document.getElementById("pay-adv"); i&&i.focus(); },50); }
  else if(a==="payadvok"){ const s=staffById(b.dataset.id), v=r2p((document.getElementById("pay-adv")||{}).value); if(!s||!(v>0)){ toast(tr("اكتب مبلغ السلفة")); return; } if(!cuMe){ toast(tr("اكتب اسمك أولاً")); return; }
    const k=ym(+today().slice(0,4),+today().slice(5,7));
    const N=Math.min(24,Math.max(1,parseInt((document.getElementById("pay-advn")||{}).value)||1)), k2=nextMonth(k);
    const x={id:uid(),kind:"exp",by:cuMe,holder:"main",hv:2,target:"gen",cat:"salary",pay:"cash",supplier:s.name,amount:v,date:today(),desc:`${tr("سلفة")} — ${s.name}${N>1?` (${N} ${tr("أقساط")})`:""}`,salEmp:s.id,salMonth:k2,salInstN:N,salAdv:1,ok:true,fileId:null,fileType:null,createdAt:Date.now()};
    S.cu[x.id]=x; cuPut(x,true); S.payAdv=null; toast(`✓ ${tr("سُجّلت سلفة")} ${money(v)} — ${s.name}${N>1?` · ${N} × ${money(advSched(x)[k2])}`:""}`); render(); }
  else if(a==="payskip"){ const x=S.cu[b.dataset.id]; if(!x) return; const k=b.dataset.m; const sk=new Set(x.salSkip||[]); sk.has(k)?sk.delete(k):sk.add(k); x.salSkip=[...sk]; cuPut(x,true); render(); }
  else if(a==="payappr"){ if(!isGM()) return; if(S.armed!=="payappr"){ S.armed="payappr"; render(); setTimeout(()=>{ if(S.armed==="payappr"){ S.armed=null; render(); } },5000); return; }
    S.armed=null; const ap=S.settings.payAppr||(S.settings.payAppr={}); ap[m]={by:S.user.name,date:today(),at:Date.now(),total:payTotals(m).total,sig:paySig(m)}; staffSave(); toast(`✓ ${tr("اعتُمد كشف")} ${monthName(m)}`); render(); }
  else if(a==="payunappr"){ if(!isGM()) return; const ap=S.settings.payAppr||{}; delete ap[m]; S.settings.payAppr=ap; staffSave(); render(); }
  else if(a==="paygo"){ const A=payAppr(m); if(!A||!A.ok){ toast(tr("الكشف يحتاج اعتماد المدير العام أولاً")); return; } if(!cuMe){ toast(tr("اكتب اسمك أولاً")); return; } if(S.armed!=="paygo"){ S.armed="paygo"; render(); setTimeout(()=>{ if(S.armed==="paygo"){ S.armed=null; render(); } },5000); return; }
    S.armed=null; b.classList.add("busy"); try{ await payGo(m); }catch(err){ toast((err&&err.message)||tr("تعذر الصرف")); } render(); }
  else if(a==="paypdf"||a==="payemp"||a==="payxlsx"){ if(S.busy) return; S.busy=true; b.classList.add("busy");
    try{ if(a==="paypdf") await makePayPdf(m); else if(a==="payxlsx") await makePayXlsx(m); else await makeEmpPdf(b.dataset.id); }catch(err){ toast((err&&err.message)||tr("تعذر الحفظ")); } S.busy=false; render(); } });
