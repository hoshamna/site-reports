/* ---------- المرتبات (26 Nov 2026) ----------
   A list of employees with their monthly salary. Each month the payroll sheet opens ready with every active employee:
   salary + extra − deduction − advances given in that month = net. «صرف» records one custody entry per employee
   (category salary, the employee and the month), so each one has his own history. Advances (سلفة) are custody entries
   too, and come off the salary of the month they were given in. */
S.payM=null; S.payDraft={}; S.payOpen=false; S.staffOpen=false;
const staffList=()=>(S.settings.staff||[]).filter(e=>e&&e.id);
const staffActive=()=>staffList().filter(e=>e.active!==false);
const staffById=id=>staffList().find(e=>e.id===id);
const r2p=v=>Math.round(n(v)*100)/100;
// entries of one employee: salaries paid and advances given
const salEntries=id=>Object.values(S.cu).filter(x=>isExp(x)&&x.cat==="salary"&&x.salEmp===id);
const salPaid=(id,m)=>salEntries(id).find(x=>!x.salAdv&&x.salMonth===m);
const salAdvances=(id,m)=>salEntries(id).filter(x=>x.salAdv&&x.salMonth===m);
function payRow(e,m){ const d=(S.payDraft[m]||{})[e.id]||{}; const paid=salPaid(e.id,m);
  const base=paid?n(paid.salGross):n(e.salary), add=paid?n(paid.salAdd):n(d.add), ded=paid?n(paid.salDed):n(d.ded);
  const adv=r2p(salAdvances(e.id,m).reduce((a,x)=>a+n(x.amount),0));
  return {e,paid,base,add,ded,adv,net:paid?n(paid.amount):r2p(base+add-ded-adv),note:paid?(paid.salNote||""):(d.note||"")}; }
function payMonths(){ const out=[]; let k=ym(+today().slice(0,4),+today().slice(5,7)); for(let i=0;i<7;i++){ out.push(k); k=prevMonthOf(k+"-15"); } return out; }
function payrollPanel(){ if(!isAdmin()) return ""; const m=S.payM||prevMonthOf(today()); const rows=staffActive().map(e=>payRow(e,m));
  const unpaid=rows.filter(r=>!r.paid&&r.net>0), tot=k=>r2p(rows.reduce((a,r)=>a+n(r[k]),0));
  const num=(id,k,v,dis)=>`<input type="number" inputmode="decimal" dir="ltr" data-pay="${esc(id)}" data-pk="${k}" value="${v?esc(v):""}" placeholder="0" ${dis?"disabled":""} aria-label="${k==="add"?tr("إضافي"):tr("خصم")}">`;
  return `<details class="panel paybox" ${S.payOpen?"open":""}><summary style="cursor:pointer;font-weight:600" data-act="payopen">👔 ${tr("المرتبات")}</summary>
   ${staffActive().length?`<label>${tr("الشهر")}<select data-paym="1">${payMonths().map(k=>`<option value="${k}" ${k===m?"selected":""}>${esc(monthName(k))}</option>`).join("")}</select></label>
   <div class="paylist">${rows.map(r=>`<div class="payrow ${r.paid?"paid":""}">
     <div class="payhd"><b><bdi>${esc(r.e.name)}</bdi></b>${r.paid?`<span class="chip done">✓ ${tr("صُرف")} <span class="num">${esc(r.paid.date||"")}</span></span>`:`<span class="small muted">${tr("المرتب")} <span class="num">${money(r.base)}</span></span>`}</div>
     <div class="paygrid"><label>${tr("إضافي")}${num(r.e.id,"add",r.add,r.paid)}</label><label>${tr("خصم")}${num(r.e.id,"ded",r.ded,r.paid)}</label>
      <div class="payv"><span class="small muted">${tr("سلف الشهر")}</span><b class="num">${money(r.adv)}</b></div><div class="payv hl"><span class="small">${tr("الصافي")}</span><b class="num">${money(r.net)}</b></div></div>
     ${r.net<0&&!r.paid?`<span class="small neg">${tr("السلف أكبر من المرتب، لن يُصرف له شيء هذا الشهر")}</span>`:""}</div>`).join("")}</div>
   <table class="vatsum"><tbody><tr><th>${tr("المرتبات")}</th><td class="num" data-tot="base">${money(tot("base"))}</td></tr><tr><th>${tr("إضافي")}</th><td class="num" data-tot="add">${money(tot("add"))}</td></tr><tr><th>${tr("خصم")}</th><td class="num" data-tot="ded">${money(tot("ded"))}</td></tr><tr><th>${tr("سلف")}</th><td class="num" data-tot="adv">${money(tot("adv"))}</td></tr><tr class="diff"><th>${tr("الصافي")}</th><td class="num" data-tot="net">${money(tot("net"))}</td></tr></tbody></table>
   <label>${tr("طريقة الصرف")}<select data-paypay="1"><option value="cash" ${S.payPay!=="gm"?"selected":""}>${tr("من العهدة (نقداً أو تحويل من حسابك)")}</option><option value="gm" ${S.payPay==="gm"?"selected":""}>${tr("من الشركة مباشرة / WPS (لا تُخصم من العهدة)")}</option></select></label>
   <div class="row">${unpaid.length?`<button class="primary ${S.armed==="paygo"?"armed":""}" data-act="paygo">${S.armed==="paygo"?tr("اضغط مرة أخرى للتأكيد"):`✓ ${tr("صرف مرتبات")} ${esc(monthName(m))} · <span class="num" data-tot="unpaid">${money(r2p(unpaid.reduce((a,r)=>a+r.net,0)))}</span>`}</button>`:`<span class="chip done">✓ ${tr("صُرفت مرتبات الشهر")}</span>`}
    <button data-act="paypdf">📄 ${tr("كشف المرتبات")}</button></div>`:`<p class="small muted" style="margin:0">${tr("أضف الموظفين ومرتباتهم أولاً.")}</p>`}
   <details ${S.staffOpen||!staffList().length?"open":""}><summary style="cursor:pointer" data-act="staffopen">👥 ${tr("الموظفون والمرتبات")} <span class="num">${staffActive().length}</span></summary>
    <div class="list">${staffList().map(e=>`<div class="staffrow ${e.active===false?"off":""}">
      <input data-staff="${esc(e.id)}" data-sk="name" value="${esc(e.name||"")}" placeholder="${tr("الاسم")}" aria-label="${tr("الاسم")}">
      <input type="number" inputmode="decimal" dir="ltr" data-staff="${esc(e.id)}" data-sk="salary" value="${esc(e.salary??"")}" placeholder="${tr("المرتب")}" aria-label="${tr("المرتب الشهري")}">
      <div class="row"><button class="xs" data-act="payadv" data-id="${esc(e.id)}">💵 ${tr("سلفة")}</button><button class="xs ghost" data-act="payemp" data-id="${esc(e.id)}">📄 ${tr("كشفه")}</button>
       <button class="xs ghost" data-act="staffoff" data-id="${esc(e.id)}">${e.active===false?tr("إعادة تفعيل"):tr("إيقاف")}</button></div>
      ${S.payAdv===e.id?`<div class="row" style="align-items:end"><label style="flex:1">${tr("مبلغ السلفة")}<input id="pay-adv" type="number" inputmode="decimal" dir="ltr" placeholder="0"></label><button class="primary" data-act="payadvok" data-id="${esc(e.id)}">✓ ${tr("تسجيل")}</button></div><span class="small muted">${tr("تُخصم من العهدة الآن، ومن مرتب شهر")} ${esc(monthName(ym(+today().slice(0,4),+today().slice(5,7))))}.</span>`:""}
     </div>`).join("")}</div>
    <div class="row" style="align-items:end"><label style="flex:1">${tr("موظف جديد")}<input id="staff-new" placeholder="${tr("الاسم")}"></label><label style="width:120px">${tr("المرتب")}<input id="staff-sal" type="number" inputmode="decimal" dir="ltr" placeholder="0"></label><button data-act="staffadd">+ ${tr("إضافة")}</button></div>
   </details></details>`; }

function staffSave(){ settingsSave(); }
async function payGo(m){ const rows=staffActive().map(e=>payRow(e,m)).filter(r=>!r.paid&&r.net>0); const pay=S.payPay==="gm"?"gm":"cash"; let k=0;
  for(const r of rows){ const x={id:uid(),kind:"exp",by:cuMe,holder:"main",hv:2,target:"gen",cat:"salary",pay,supplier:r.e.name,amount:r.net,date:today(),
      desc:`${lang==="en"?"Salary":"راتب"} ${monthName(m)} — ${r.e.name}`,salEmp:r.e.id,salMonth:m,salGross:r.base,salAdd:r.add,salDed:r.ded,salAdvDed:r.adv,salNote:r.note,ok:true,fileId:null,fileType:null,createdAt:Date.now()+(k++)};
    S.cu[x.id]=x; cuPut(x,true); }
  delete S.payDraft[m]; toast(`✓ ${tr("صُرفت مرتبات")} ${monthName(m)} · ${rows.length} ${tr("موظف")}`); }
async function makePayPdf(m){ const rows=staffActive().map(e=>payRow(e,m)).concat(staffList().filter(e=>e.active===false&&salPaid(e.id,m)).map(e=>payRow(e,m)));
  const t=k=>money(r2p(rows.reduce((a,r)=>a+n(r[k]),0)));
  const blocks=[`<div class="rb"><h2>${tr("كشف المرتبات")} — ${esc(monthName(m))}</h2>${tbl(["#",tr("الموظف"),tr("المرتب"),tr("إضافي"),tr("خصم"),tr("سلف"),tr("الصافي"),tr("الحالة")],
    rows.map((r,i)=>`<tr><td class="num">${i+1}</td><td>${esc(r.e.name)}</td><td class="num">${money(r.base)}</td><td class="num">${money(r.add)}</td><td class="num">${money(r.ded)}</td><td class="num">${money(r.adv)}</td><td class="num"><b>${money(r.net)}</b></td><td>${r.paid?tr("صُرف")+" "+esc(r.paid.date||"")+(r.paid.pay==="gm"?" — "+tr("من الشركة"):""):tr("لم يُصرف")}</td></tr>`),
    `<tr><th colspan="2">${tr("الإجمالي")}</th><th class="num">${t("base")}</th><th class="num">${t("add")}</th><th class="num">${t("ded")}</th><th class="num">${t("adv")}</th><th class="num">${t("net")}</th><th></th></tr>`)}</div>`];
  await cuPdf(`${tr("كشف المرتبات")} — ${esc(monthName(m))}`,blocks,`${tr("كشف المرتبات")} ${m}.pdf`,"pay"); }
async function makeEmpPdf(id){ const e=staffById(id); if(!e) return; const L=salEntries(id).sort((a,b)=>(a.salMonth||"").localeCompare(b.salMonth||"")||String(a.date).localeCompare(String(b.date)));
  const blocks=[`<div class="rb"><h2>${tr("كشف الموظف")}: ${esc(e.name)}</h2><p style="margin:0 0 8px">${tr("المرتب الشهري")}: <b class="num">${money(e.salary)}</b></p>${tbl([tr("الشهر"),tr("التاريخ"),tr("البيان"),tr("المرتب"),tr("إضافي"),tr("خصم"),tr("سلف"),tr("المبلغ")],
    L.map(x=>`<tr><td>${esc(monthName(x.salMonth||prevMonthOf(x.date)))}</td><td class="num">${esc(x.date||"")}</td><td>${x.salAdv?tr("سلفة"):tr("راتب")}</td><td class="num">${x.salAdv?"":money(x.salGross)}</td><td class="num">${x.salAdv?"":money(x.salAdd)}</td><td class="num">${x.salAdv?"":money(x.salDed)}</td><td class="num">${x.salAdv?"":money(x.salAdvDed)}</td><td class="num"><b>${money(x.amount)}</b></td></tr>`),
    `<tr><th colspan="7">${tr("مجموع ما استلمه")}</th><th class="num">${money(r2p(L.reduce((a,x)=>a+n(x.amount),0)))}</th></tr>`)}</div>`];
  await cuPdf(`${tr("كشف الموظف")} — ${esc(e.name)}`,blocks,`${tr("كشف الموظف")} ${e.name}.pdf`,"pay"); }

app.addEventListener("input",e=>{ const t=e.target;
  if(t.dataset.pay){ const m=S.payM||prevMonthOf(today()); const D=S.payDraft[m]||(S.payDraft[m]={}); const d=D[t.dataset.pay]||(D[t.dataset.pay]={}); d[t.dataset.pk]=t.value;
    const e2=staffById(t.dataset.pay); const box=t.closest(".payrow"); if(e2&&box){ const r=payRow(e2,m); const v=box.querySelector(".payv.hl b"); if(v) v.textContent=money(r.net); }
    const rows=staffActive().map(x=>payRow(x,m));
    ["base","add","ded","adv","net"].forEach(k=>{ const el=document.querySelector(`[data-tot="${k}"]`); if(el) el.textContent=money(r2p(rows.reduce((a,r)=>a+n(r[k]),0))); });
    const u=document.querySelector('[data-tot="unpaid"]'); if(u) u.textContent=money(r2p(rows.filter(r=>!r.paid&&r.net>0).reduce((a,r)=>a+r.net,0))); }
  else if(t.dataset.staff){ const L=staffList(); const s=L.find(x=>x.id===t.dataset.staff); if(!s) return; s[t.dataset.sk]=t.dataset.sk==="salary"?(t.value===""?"":n(t.value)):t.value; S.settings.staff=L; clearTimeout(S._stT); S._stT=setTimeout(staffSave,700); } });
app.addEventListener("change",e=>{ const t=e.target; if(t.dataset.paym){ S.payM=t.value; S.payOpen=true; render(); } else if(t.dataset.paypay){ S.payPay=t.value; } });
app.addEventListener("click",async e=>{ const b=e.target.closest("[data-act]"); if(!b) return; const a=b.dataset.act; if(!/^(pay|staff)/.test(a)) return;
  if(a==="payopen"){ e.preventDefault(); S.payOpen=!S.payOpen; if(b.dataset.m) S.payM=b.dataset.m; render(); return; }
  if(a==="paygoto"){ S.view="cust"; S.payOpen=true; S.payM=b.dataset.m||null; render(); setTimeout(()=>{ const el=document.querySelector(".paybox"); el&&el.scrollIntoView({block:"start",behavior:"smooth"}); },60); return; }
  if(a==="staffopen"){ e.preventDefault(); S.staffOpen=!S.staffOpen; render(); return; }
  if(!isAdmin()) return; const m=S.payM||prevMonthOf(today());
  if(a==="staffadd"){ const nm=String((document.getElementById("staff-new")||{}).value||"").trim(), sal=n((document.getElementById("staff-sal")||{}).value);
    if(!nm){ toast(tr("اكتب اسم الموظف")); return; } if(staffList().some(x=>String(x.name).trim()===nm)){ toast(tr("الاسم موجود")); return; }
    S.settings.staff=[...staffList(),{id:uid(),name:nm,salary:sal,active:true}]; staffSave(); S.staffOpen=true; render(); }
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
