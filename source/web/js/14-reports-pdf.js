/* ---------- PDF ---------- */
function numWords(n){ n=Math.floor(n); if(n===0) return "Zero";
  const a=["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"], t=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  const h=x=>{ let r=""; if(x>=100){ r+=a[Math.floor(x/100)]+" Hundred"; x%=100; if(x) r+=" "; } if(x>=20){ r+=t[Math.floor(x/10)]; if(x%10) r+="-"+a[x%10]; } else if(x) r+=a[x]; return r; };
  const parts=[[1e9,"Billion"],[1e6,"Million"],[1e3,"Thousand"],[1,""]]; let out=[];
  for(const [v,l] of parts){ const q=Math.floor(n/v); if(q){ out.push(h(q)+(l?" "+l:"")); n%=v; } } return out.join(" "); }
function amountWords(x){ const tot=Math.round(x*100); const d=Math.floor(tot/100), f=tot%100;
  return `${numWords(d)} Dirham${d===1?"":"s"}${f?` and ${numWords(f)} Fils`:""} Only.`; }
const m2=x=>n(x).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
function vatSplit(gross,rate){ const g=Math.round(n(gross)*100)/100; const net=Math.round(g/(1+rate/100)*100)/100; return {net,vat:Math.round((g-net)*100)/100,gross:g}; }
const ORD=["First","Second","Third","Fourth","Fifth","Sixth","Seventh","Eighth","Ninth","Tenth","Eleventh","Twelfth"];
function nextInvNo(){ const y=new Date().getFullYear(); const seq=(n(S.settings.invSeq)||0)+1; return {no:`${S.settings.invPrefix||"INV"}/${y}/${String(seq).padStart(3,"0")}`,seq}; }
function invSheetHtml(s){
  const p=(s.payments||[]).find(x=>x.id===S.inv.pid); if(!p){ S.inv=null; return ""; }
  const d=S.inv.d; const sp=vatSplit(d.gross,n(d.rate)); const issued=!!p.invoice;
  return `<div class="sheet" role="dialog" aria-label="فاتورة ضريبية"><div class="row" style="justify-content:space-between"><h3>🧾 فاتورة ضريبية ${issued?`<bdi class="u" dir="ltr">${esc(p.invoice.no)}</bdi>`:""}</h3><button class="ghost" data-act="invclose" aria-label="إغلاق">✕</button></div>
   <div class="grid2">
    <label>الفاتورة باسم<select id="iv-tt" data-iv="toType"><option value="Contractor" ${d.toType==="Contractor"?"selected":""}>المقاول / العميل</option><option value="Owner" ${d.toType==="Owner"?"selected":""}>مالك المبنى</option><option value="Company" ${d.toType==="Company"?"selected":""}>شركة</option></select></label>
    <label>الاسم (بالإنجليزية)<input id="iv-to" data-iv="to" dir="ltr" value="${esc(d.to)}" placeholder="Khalid Almazmi"></label>
    <label>الرقم الضريبي للعميل (اختياري)<input id="iv-ttrn" data-iv="toTrn" dir="ltr" value="${esc(d.toTrn||"")}"></label>
    <label>المشروع (Project)<input id="iv-pr" data-iv="project" dir="ltr" value="${esc(d.project)}"></label>
    <label>البيان (Description)<input id="iv-ds" data-iv="desc" dir="ltr" value="${esc(d.desc)}"></label>
    <label>تاريخ الفاتورة<input id="iv-dt" data-iv="date" type="date" value="${esc(d.date)}"></label>
    <label>المبلغ شامل الضريبة (درهم)<input id="iv-g" data-iv="gross" type="number" inputmode="decimal" value="${esc(d.gross)}"></label>
    <label>نسبة الضريبة %<input id="iv-r" data-iv="rate" type="number" inputmode="decimal" value="${esc(d.rate)}"></label>
    <label>رقم الفاتورة<input id="iv-no" data-iv="no" dir="ltr" value="${esc(d.no)}" ${issued?"":""}></label>
    <label style="flex-direction:row;align-items:center;gap:8px;align-self:end"><input type="checkbox" id="iv-paid" data-iv="paid" style="width:auto" ${d.paid?"checked":""}> ختم «PAID» مدفوعة</label></div>
   <div class="ivsum"><div><span class="small muted">المبلغ قبل الضريبة</span><b class="num">${m2(sp.net)}</b></div><div><span class="small muted">الضريبة <span class="num">${n(d.rate)}%</span></span><b class="num">${m2(sp.vat)}</b></div><div class="hl"><span class="small">الإجمالي</span><b class="num">${m2(sp.gross)}</b></div></div>
   <div class="small" dir="ltr" style="text-align:left;font-style:italic">${esc(amountWords(sp.gross))}</div>
   <div class="row"><button class="primary big ${S.busy==="inv"?"busy":""}" data-act="invgo">${S.busy==="inv"?"جارٍ التجهيز…":issued?"⬇️ تنزيل الفاتورة PDF":"✓ إصدار الفاتورة وتنزيل PDF"}</button></div>
   ${S.lastInv===p.id?`<div class="notice small"><b>${window.__ios?"✓ الفاتورة جاهزة.":"✓ تم حفظ ملف الفاتورة في التنزيلات."}</b> أرسلها للعميل بزر «مشاركة»، أو من الواتساب: 📎 ثم «مستند».</div>${window.__lastFile?`<div class="row">${navigator.canShare?`<button class="primary big" data-act="sharefile">📤 مشاركة (واتساب…)</button>`:""}<button class="big" data-act="dlagain">${window.__ios?"📥 حفظ في الملفات / فتح":"⬇️ تحميل مرة أخرى"}</button></div>`:""}`:""}</div>`;
}
function openInv(s,p){
  const idx=(s.payments||[]).indexOf(p); const inv=p.invoice;
  const toType=inv?inv.toType:(s.owner&&!s.client?"Owner":"Contractor");
  S.inv={pid:p.id,d:inv?{...inv}:{toType,to:toType==="Owner"?(s.owner||""):(s.client||""),toTrn:"",project:s.location||s.name||"",desc:`${ORD[idx]||("No. "+(idx+1))} Payment`,date:p.date||today(),gross:n(p.amount),rate:5,no:nextInvNo().no,paid:true}};
}
async function makeInvoicePdf(s,p,d){
  if(!window.html2canvas||!window.jspdf) throw new Error(tr("مكتبة التقرير لم تُحمّل"));
  const co=S.settings; const sp=vatSplit(d.gross,n(d.rate)); const logo=co.logoId?await toDataUrl(co.logoId):null;
  const stamp=co.stampId?await toDataUrl(co.stampId):null, sig=co.sigId?await toDataUrl(co.sigId):null;
  const dmy=x=>{ const [y,m,dd]=String(x||"").split("-"); return dd?`${dd}/${m}/${y}`:x; };
  const legal=co.legalName||co.companyEn||"";
  const host=document.getElementById("report"); host.dir="ltr";
  host.innerHTML=`<div class="tix">
   ${logo?`<img class="tlogo" src="${logo}">`:`<div class="tco">${esc(legal)}</div>`}
   <div class="ttitle">TAX INVOICE</div>
   <div class="thead"><div><b>${esc(legal)}</b>${co.poBox?`<br>P.O Box No. ${esc(co.poBox)}`:""}${co.address?`<br>${esc(co.address)}`:""}${co.trn?`<div class="ttrn"><b>TRN: ${esc(co.trn)}</b></div>`:""}</div><div><b>Date: ${esc(dmy(d.date))}</b></div></div>
   <div class="tto">To,<br><b>${esc(d.toType)} : ${esc(d.to||"")}</b>${d.toTrn?`<br>TRN: ${esc(d.toTrn)}`:""}</div>
   <table class="tmeta"><tr><td>Invoice Number</td><td>: <b>${esc(d.no)}</b></td></tr><tr><td>Invoice Date</td><td>: <b>${esc(dmy(d.date))}</b></td></tr><tr><td>Project</td><td>: ${esc(d.project||"")}</td></tr><tr><td>RF. Quotation No</td><td>: ${esc(s.quoteNo||"")}</td></tr></table>
   <table class="titems"><tr><th style="width:70px">No.</th><th>Description</th><th style="width:225px;text-align:left">Total Amount in AED</th></tr>
    <tr><td class="c">1</td><td>${esc(d.desc)}</td><td class="r"><b>${m2(sp.net)}</b></td></tr>
    <tr><td colspan="2" class="r">VAT ${n(d.rate)}%</td><td class="r"><b>${m2(sp.vat)}</b></td></tr>
    <tr><td colspan="2" class="r"><b>Total Amount + VAT</b></td><td class="r"><b>${m2(sp.gross)}</b></td></tr>
    <tr><td colspan="3" class="c"><b>${esc(amountWords(sp.gross))}</b></td></tr></table>
   <div class="tsign"><div><b>For</b><br><br><b>${esc(legal)}</b><div class="tsig">${sig?`<img src="${sig}">`:""}</div>AUTHORISED SIGNATORY</div>
    <div class="tmid">${stamp?`<img class="tstamp" src="${stamp}">`:""}${d.paid?`<div class="tpaid">PAID<small>${esc(dmy(d.date))}</small></div>`:""}</div>
    <div class="trecv">RECEIVED BY</div></div>
   <div class="tfoot">${[co.poBox?`P.O Box ${esc(co.poBox)}`:"",esc(co.address||""),co.phone?`☎ ${esc(co.phone)}`:"",co.email?`✉ ${esc(co.email)}`:"",co.web?`🌐 ${esc(co.web)}`:""].filter(Boolean).join(" &nbsp; ")}</div></div>`;
  await Promise.all([...host.querySelectorAll("img")].map(im=>im.complete?0:new Promise(r=>{im.onload=im.onerror=r;})));
  try{ await document.fonts.load('400 14px "Noto Serif"'); await document.fonts.load('700 14px "Noto Serif"'); await document.fonts.ready; }catch(e){}
  const cv=await html2canvas(host.firstElementChild,{scale:2,backgroundColor:"#ffffff",logging:false});
  const { jsPDF } = window.jspdf; const pdf=new jsPDF({unit:"mm",format:"a4"});
  pdf.addImage(cv.toDataURL("image/jpeg",0.92),"JPEG",0,0,210,Math.min(297,cv.height*210/cv.width));
  host.innerHTML="";
  const fname=`Tax Invoice ${d.no} - ${d.to||s.name}.pdf`.replace(/[\\/:*?"<>|]/g,"-");
  if(!downloads) throw new Error(tr("الحفظ غير متاح في هذا العرض"));
  try{ await downloads.save({filename:fname,data:pdf.output("blob")}); S.lastInv=p.id; }
  catch(err){ if(err&&err.code==="declined") toast("لم يُحفظ الملف"); else throw new Error(err&&err.message||"تعذر الحفظ"); }
}
async function toDataUrl(id){
  try{ const r=await mediaFetch(id); if(!r.ok) throw 0; const b=await r.blob();
    return await new Promise(res=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.readAsDataURL(b); }); }
  catch(e){ return blobUrl(id); }
}
async function makePdf(s, kind){
  attachMarks(s); syncPlans(s);
  if(!window.html2canvas || !window.jspdf) throw new Error(tr("مكتبة التقرير لم تُحمّل"));
  const c=calc(s), co=S.settings;
  const imgs={}; const ids=[(kind==="work"?s.coverId:null),...(kind!=="work"?[]:(s.issues||[]).map(x=>x.fileId)),...floors(s).flatMap(fl=>[fl.fileId,...FACES.map(([k])=>fl.faces[k].fileId)]),...s.photos.map(p=>p.fileId),...(kind==="pur"?s.purchases.filter(p=>p.fileType==="image").map(p=>p.fileId):[]),...s.payments.filter(p=>p.fileType==="image").map(p=>p.fileId),...(s.quotes||[]).filter(q=>q.fileType==="image").map(q=>q.fileId)].filter(Boolean);
  await Promise.all(ids.map(async id=>imgs[id]=await toDataUrl(id)));
  const rep=document.getElementById("report"); rep.dir = lang==="en"?"ltr":"rtl";
  const blocks=[];
  const logo=co.logoId?await toDataUrl(co.logoId):null;
  const contacts=[co.address,co.phone&&`☎ <span dir="ltr">${esc(co.phone)}</span>`,co.email&&`<span dir="ltr">${esc(co.email)}</span>`,co.web&&`<span dir="ltr">${esc(co.web)}</span>`,co.trn&&`TRN: <span dir="ltr">${esc(co.trn)}</span>`].filter(Boolean);
  blocks.push(`<div class="lh">${logo&&co.logoWide?`<div class="lhtop"><img class="lhbanner" src="${logo}"></div>`:`<div class="lhtop">
      <div class="lhname u">${lang==="en"?`<div class="lhar" dir="ltr">${esc(co.companyEn||co.company)}</div>${co.companyEn?`<div class="lhen">${esc(co.company)}</div>`:""}`:`<div class="lhar">${esc(co.company)}</div>${co.companyEn?`<div class="lhen" dir="ltr">${esc(co.companyEn)}</div>`:""}`}</div>
      ${logo?`<img class="lhlogo" src="${logo}">`:`<div class="lhmono">${esc([...String(co.companyEn||co.company||"A")][0])}</div>`}</div>`}
    ${contacts.length?`<div class="lhc">${contacts.map(x=>`<span>${String(x).startsWith("<")||String(x).startsWith("☎")||String(x).startsWith("TRN")?x:esc(x)}</span>`).join("")}</div>`:""}
    <div class="lhband"></div>
    <div class="lhtitle"><h1>${kind==="fin"?"التقرير المالي":kind==="pur"?"التقرير الداخلي":"تقرير الأعمال"}: ${U(s.name)}</h1><div class="lhdate">تاريخ التقرير <b class="num">${today()}</b></div></div></div>`);
  blocks.push(`<div class="rb"><div class="info"><div><span>اسم المشروع: </span>${U(s.name)}</div><div><span>الموقع: </span>${U(s.location||"—")}</div><div><span>العميل: </span>${U(s.client||"—")}</div>
    <div><span>المهندس: </span>${U(s.engineer||"—")}</div><div><span>هاتف المهندس: </span><span class="num">${U(s.engPhone||"—")}</span></div><div><span>الاستشاري: </span>${U(s.consultant||"—")}</div>
    <div><span>تاريخ البدء: </span><span class="num">${U(s.startDate||"—")}</span></div><div><span>الحالة: </span>${esc(s.status)}</div></div></div>`);
  if(kind==="fin"){
  const coll=c.total?Math.round(c.received/c.total*100):0;
  blocks.push(`<div class="rb"><h2>ملخص الحساب</h2><div class="kv" style="grid-template-columns:repeat(3,1fr)">
    <div>إجمالي قيمة المشروع<b class="num">${money(c.total)}</b></div><div>المبلغ المستلم<b class="num">${money(c.received)}</b></div>
    <div class="hl">المتبقي للسداد<b class="num">${money(c.remaining)}</b></div></div>
    <div style="margin-top:12px;display:flex;align-items:center;gap:10px;font-size:13px"><span>نسبة التحصيل</span><span class="pbar" style="width:240px;height:10px"><i style="width:${Math.min(100,coll)}%"></i></span><b class="num">${coll}%</b>
      <span style="margin-inline-start:auto">نسبة إنجاز الأعمال</span><span class="pbar" style="width:160px;height:10px"><i style="width:${c.pct}%;background:#2f9e55"></i></span><b class="num">${c.pct}%</b></div>
    <p style="font-size:12px;color:#5d6b73;margin:8px 0 0">${Object.entries(PM).map(([k,[l]])=>{ const v=s.payments.filter(p=>pmOf(p)===k).reduce((a,p)=>a+n(p.amount),0); return v?`${l}: <b class="num">${money(v)}</b>`:""; }).filter(Boolean).join(" &nbsp;·&nbsp; ")} &nbsp; — جميع المبالغ بالدرهم الإماراتي.</p></div>`);
  { const sc=schedule(s); if(sc.length) blocks.push(`<div class="rb"><h2>جدول الدفعات المتفق عليها</h2><table><tr><th>#</th><th>الدفعة</th><th>النسبة</th><th>تستحق</th><th>المبلغ</th><th>المدفوع</th><th>الباقي</th><th>الحالة</th></tr>
    ${sc.map((m,i)=>`<tr><td class="num">${i+1}</td><td>${U(m.name||"دفعة")}</td><td class="num">${n(m.pct)}%</td><td>${(TRIG.find(t=>t[0]===m.trigger)||[])[1]||""}${m.trigger==="progress"?` <span class="num">${n(m.at)}%</span>`:""}</td><td class="num">${money(m.amt)}</td><td class="num">${money(m.paid)}</td><td class="num">${money(m.left)}</td><td><span class="chip ${m.st==="paid"?"done":m.st==="due"||m.st==="partdue"?"bad":"ex"}">${SCST[m.st][0]}</span></td></tr>`).join("")}</table></div>`); }
  if(s.payments.length) blocks.push(`<div class="rb"><h2>الدفعات المستلمة</h2><table><tr><th>#</th><th>التاريخ</th><th>طريقة الدفع</th><th>رقم الشيك / المرجع</th><th>البنك</th><th>البيان</th><th>المبلغ</th></tr>
    ${s.payments.map((p,i)=>`<tr><td class="num">${i+1}</td><td class="num">${U(p.date)}</td><td>${PM[pmOf(p)][0]}</td><td class="num">${U((pmOf(p)==="cheque"?p.chequeNo:p.ref)||"—")}</td><td>${U(pmOf(p)==="cash"?"—":(p.bank||"—"))}</td><td>${U(p.note||"—")}</td><td class="num">${money(p.amount)}</td></tr>`).join("")}
    <tr><th colspan="6">الإجمالي المستلم</th><th class="num">${money(c.received)}</th></tr><tr><th colspan="6">المتبقي من قيمة المشروع</th><th class="num">${money(c.remaining)}</th></tr></table></div>`);
  { const auto=s.finAuto===false?[]:[
      lang==="en"?`<bdi class="u">Received <b class="num">AED ${money(c.received)}</b>, which is <b class="num">${coll}%</b> of the project value.</bdi>`:`<bdi class="u">تم استلام <b class="num">${money(c.received)}</b> درهم، بنسبة <b class="num">${coll}%</b> من قيمة المشروع.</bdi>`,
      c.remaining>0?(lang==="en"?`<bdi class="u">The balance due is <b class="num">AED ${money(c.remaining)}</b>.</bdi>`:`<bdi class="u">المبلغ المتبقي للسداد <b class="num">${money(c.remaining)}</b> درهم.</bdi>`):(lang==="en"?`<bdi class="u">The full project value has been paid. Thank you.</bdi>`:`<bdi class="u">تم سداد كامل قيمة المشروع. شكراً لكم.</bdi>`),
      lang==="en"?`<bdi class="u">Site work progress to date is <b class="num">${c.pct}%</b>.</bdi>`:`<bdi class="u">نسبة إنجاز الأعمال في الموقع حتى تاريخه <b class="num">${c.pct}%</b>.</bdi>`,
      ...dueAlerts(s).map(m=>lang==="en"?`<bdi class="u">Payment now due: ${esc(dEN(m.name||"دفعة"))}, amount <b class="num">AED ${money(m.left)}</b>.</bdi>`:`<bdi class="u">الدفعة المستحقة حالياً: ${esc(m.name||"دفعة")} بمبلغ <b class="num">${money(m.left)}</b> درهم.</bdi>`)];
    const own=String(s.finNotes||"").split(/\n+/).map(x=>x.trim()).filter(Boolean).map(x=>U(x));
    const all=[...auto,...own];
    if(all.length) blocks.push(`<div class="rb"><div class="notebox"><div class="nbh">ملاحظات</div><ul>${all.map(x=>`<li>${x}</li>`).join("")}</ul>
      <div class="nbf"><bdi class="u">${lang==="en"?`With regards, ${esc(co.companyEn||co.company)}`:`مع تحيات ${esc(co.company)}`}</bdi></div></div></div>`); }
  { const ch=s.payments.filter(p=>p.fileType==="image"&&p.fileId);
    for(let i=0;i<ch.length;i+=2) blocks.push(`<div class="rb">${i===0?"<h2>صور الشيكات وإشعارات التحويل</h2>":""}<div class="ph">${ch.slice(i,i+2).map(p=>`<figure><img src="${imgs[p.fileId]}" style="object-fit:contain;background:#f1f5f6"><figcaption><span class="num">${U(p.chequeNo||"")}</span> — <span class="num">${money(p.amount)}</span></figcaption></figure>`).join("")}</div></div>`); }
  { const qs=(s.quotes||[]).filter(q=>q.fileType==="image"&&q.fileId);
    qs.forEach((q,i)=>blocks.push(`<div class="rb">${i===0?"<h2>عرض السعر</h2>":""}<img src="${imgs[q.fileId]}" style="width:100%;display:block;border:1px solid #dfe5e8;border-radius:6px"></div>`)); }
  } else if(kind==="pur"){
  { const k=costs(s); blocks.push(`<div class="rb"><h2>ربح المشروع</h2><div class="kv" style="grid-template-columns:repeat(3,1fr)">
    <div>قيمة المشروع<b class="num">${money(c.total)}</b></div><div>المشتريات<b class="num">${money(k.pur)}</b></div><div>أجور العمال<b class="num">${money(k.lab)}</b></div>
    <div>مصاريف أخرى<b class="num">${money(k.oth)}</b></div><div class="hl" style="background:${k.profit>=0?"#2f7d4f":"#b23a3a"}">صافي الربح المتوقع<b class="num">${money(k.profit)}</b><span style="font-size:12px">هامش <span class="num">${k.margin}%</span></span></div><div>الرصيد النقدي الآن<b class="num">${money(k.cash)}</b><span style="font-size:11px;color:#5d6b73">المستلم − المصروف</span></div></div></div>`);
    if((s.labor||[]).length) blocks.push(`<div class="rb"><h2>أجور العمال</h2><table><tr><th>التاريخ</th><th>البيان</th><th>التفاصيل</th><th>المبلغ</th></tr>${s.labor.map(l=>`<tr><td class="num">${U(l.date)}</td><td>${U(l.desc||"—")}</td><td class="num">${l.mode==="amount"?"—":`${n(l.workers)} × ${n(l.days)} × ${money(l.rate)}`}</td><td class="num">${money(laborAmt(l))}</td></tr>`).join("")}<tr><th colspan="3">الإجمالي</th><th class="num">${money(k.lab)}</th></tr></table></div>`);
    if((s.otherCosts||[]).length) blocks.push(`<div class="rb"><h2>مصاريف أخرى</h2><table><tr><th>التاريخ</th><th>البيان</th><th>المبلغ</th></tr>${s.otherCosts.map(o=>`<tr><td class="num">${U(o.date)}</td><td>${U(o.desc||"—")}</td><td class="num">${money(o.amount)}</td></tr>`).join("")}<tr><th colspan="2">الإجمالي</th><th class="num">${money(k.oth)}</th></tr></table></div>`); }
  blocks.push(`<div class="rb"><div class="kv" style="grid-template-columns:repeat(3,1fr)"><div>عدد الفواتير<b class="num">${s.purchases.length}</b></div><div>عدد الموردين<b class="num">${new Set(s.purchases.map(p=>(p.supplier||"").trim()).filter(Boolean)).size}</b></div><div class="hl">إجمالي المشتريات<b class="num">${money(c.spent)}</b></div></div>
    <p style="font-size:12px;color:#5d6b73;margin:8px 0 0">تقرير داخلي. جميع المبالغ بالدرهم الإماراتي.</p></div>`);
  if(s.purchases.length){
    blocks.push(`<div class="rb"><h2>تفاصيل المشتريات</h2><table><tr><th>#</th><th>التاريخ</th><th>المورد</th><th>البيان</th><th>ملاحظة / إضافة</th><th>المبلغ</th></tr>
    ${s.purchases.map((p,i)=>`<tr><td class="num">${i+1}</td><td class="num">${U(p.date)}</td><td>${U(p.supplier||"—")}</td><td>${U(p.desc||"—")}${p.fileType==="pdf"?" (فاتورة PDF)":""}</td><td>${U(p.note||"—")}</td><td class="num">${money(p.amount)}</td></tr>`).join("")}
    <tr><th colspan="5">إجمالي المشتريات</th><th class="num">${money(c.spent)}</th></tr></table></div>`);
    const bySup={}; s.purchases.forEach(p=>{ const k=(p.supplier||"").trim()||"—"; bySup[k]=(bySup[k]||0)+n(p.amount); });
    const rows=Object.entries(bySup).sort((a,b)=>b[1]-a[1]);
    blocks.push(`<div class="rb"><h2>الإجمالي حسب المورد</h2><table><tr><th>المورد</th><th>المبلغ</th><th>النسبة</th></tr>${rows.map(([k,v])=>`<tr><td>${U(k)}</td><td class="num">${money(v)}</td><td><span class="pbar"><i style="width:${c.spent?Math.round(v/c.spent*100):0}%"></i></span> <span class="num">${c.spent?Math.round(v/c.spent*100):0}%</span></td></tr>`).join("")}</table></div>`);
  } else blocks.push(`<div class="rb"><p>لا توجد مشتريات مسجلة.</p></div>`);
  { const own=String(s.purNotes||"").split(/\n+/).map(x=>x.trim()).filter(Boolean);
    if(own.length) blocks.push(`<div class="rb"><div class="notebox"><div class="nbh">ملاحظات وإضافات</div><ul>${own.map(x=>`<li>${U(x)}</li>`).join("")}</ul></div></div>`); }
  { const inv=s.purchases.filter(p=>p.fileType==="image"&&p.fileId);
    for(let i=0;i<inv.length;i+=2) blocks.push(`<div class="rb">${i===0?"<h2>صور الفواتير</h2>":""}<div class="invs">${inv.slice(i,i+2).map(p=>`<figure style="margin:0"><img src="${imgs[p.fileId]}"><figcaption>${U(p.supplier||"")} — <span class="num">${money(p.amount)}</span></figcaption></figure>`).join("")}</div></div>`); }
  } else {
  if(s.coverId) blocks.push(`<div class="rb"><img class="rcover" src="${imgs[s.coverId]}"></div>`);
  blocks.push(`<div class="rb"><h2>مطلوبات الموقع ونسبة الإنجاز — <span class="num">${c.pct}%</span></h2><table><tr><th>البند</th><th>العدد</th>${STAGES.map(([,l])=>`<th>${l}</th>`).join("")}<th>الإنجاز</th></tr>
    ${s.items.map(it=>{ const q=n(it.qty); const d=STAGES.reduce((a,[k])=>a+Math.min(n(it[k]),q),0); const p=q?Math.round(d/(q*3)*100):0;
      return `<tr><td>${U(it.name)}</td><td class="num">${q}</td>${STAGES.map(([k])=>`<td class="num">${n(it[k])} / ${q}</td>`).join("")}<td><span class="pbar"><i style="width:${p}%"></i></span> <span class="num">${p}%</span></td></tr>`; }).join("")}</table></div>`);
  floors(s).forEach(fl=>{
    const fr=activeFaces(fl).map(([k,l])=>({k,l,f:fl.faces[k],rows:faceRows(s,fl.faces[k])})).filter(x=>x.rows.length||x.f.fileId);
    if(!fr.length && !fl.fileId) return;
    blocks.push(`<div class="rb"><h2><bdi class="u">${esc(dEN(fl.name))}</bdi> — ملخص الواجهات</h2><table><tr><th>الواجهة</th><th>البند</th><th>المطلوب</th><th>المعلّم</th>${STAGES.map(([,l],i)=>`<th style="color:${MCOL[i+1]}">${l}</th>`).join("")}<th>المتبقي للإنهاء</th><th>مقارنة الخريطة بالمطلوب</th></tr>
      ${fr.map(x=>x.rows.map((r,j)=>`<tr><td>${j===0?x.l:""}</td><td>${U(r.it.name)}</td><td class="num">${r.q}</td><td class="num">${r.marked}</td>${r.st.map((v,i)=>`<td class="num" style="color:${v?MCOL[i+1]:"#9aa5ab"};font-weight:600">${v} / ${Math.max(r.q,r.marked)}</td>`).join("")}<td class="num" style="font-weight:700">${Math.max(r.q,r.marked)-r.st[2]}</td><td>${diffChip(r)}</td></tr>`).join("")).join("")}</table></div>`);
    const shr=activeFaces(fl).filter(([k])=>!fl.faces[k].fileId);
    const lists=(ms)=>`<table style="margin-top:10px"><tr><th>المرحلة</th><th>ما تم إنجازه (حسب الترقيم في الرسم)</th><th>المتبقي</th></tr>
      ${STAGES.map(([k,l],i)=>{ const d=ms.filter(m=>mf(m)[k]), r=ms.filter(m=>!mf(m)[k]);
        return `<tr><td><span class="dot" style="background:${MCOL[i+1]}"></span> ${l}</td><td><bdi class="u">${esc(d.map(m=>mLabel(s,m,ms)).join("، ")||"—")}</bdi></td><td><bdi class="u">${esc(r.map(m=>mLabel(s,m,ms)).join("، ")||"—")}</bdi></td></tr>`; }).join("")}</table>`;
    if(fl.fileId){ const all=shr.flatMap(([k])=>fl.faces[k].marks||[]);
      blocks.push(`<div class="rb"><h2>خريطة <bdi class="u">${esc(dEN(fl.name))}</bdi> — كل الواجهات</h2><div class="rplan">${planHtml(s,fl,fl.fileId,imgs[fl.fileId],all.map(m=>markHtml(s,m,false)).join(""),{full:true})}</div>
      <div class="legend" style="margin-top:8px;font-size:12px">${legendHtml(s,all)}</div></div>`);
      shr.forEach(([k,l])=>{ const ms=fl.faces[k].marks||[]; if(!ms.length) return;
        blocks.push(`<div class="rb"><h3 style="margin:0 0 4px">${l}</h3>${lists(ms)}</div>`); });
    }
    FACES.filter(([k])=>fl.faces[k].fileId).forEach(([k,l])=>{ const f=fl.faces[k]; const ms=f.marks||[];
      blocks.push(`<div class="rb"><h2>${l} — <bdi class="u">${esc(dEN(fl.name))}</bdi></h2><div class="rplan">${planHtml(s,fl,f.fileId,imgs[f.fileId],ms.map(m=>markHtml(s,m,false,ms)).join(""),{})}</div>
      <div class="legend" style="margin-top:8px;font-size:12px">${legendHtml(s,ms)}</div>${ms.length?lists(ms):""}</div>`); });
  });
  [["","صور الموقع"],...usedFaces(s).map(([k,l])=>[k,"صور "+l])].forEach(([k,title])=>{ const ph=s.photos.filter(p=>(p.face||"")===k);
    for(let i=0;i<ph.length;i+=2) blocks.push(`<div class="rb">${i===0?`<h2>${title}</h2>`:""}<div class="ph">${ph.slice(i,i+2).map(p=>`<figure><img src="${imgs[p.fileId]}"><figcaption>${U(p.caption||"")}</figcaption></figure>`).join("")}</div></div>`); });
  { const vn=(s.voiceNotes||[]).slice(0,6); if(vn.length) blocks.push(`<div class="rb"><h2>ملاحظات الموقع</h2>${vn.map(n=>`<div style="margin:0 0 10px"><b class="num">${U(n.date||"")}</b>${n.by?` — ${U(n.by)}`:""}${n.summary?`<div><b>${U(n.summary)}</b></div>`:""}${
      NOTE_KEYS.some(([k])=>(n[k]||[]).length)?NOTE_KEYS.filter(([k])=>(n[k]||[]).length).map(([k,l])=>`<div>${l}<ul style="margin:2px 0 4px">${n[k].map(t=>`<li>${U(t)}</li>`).join("")}</ul></div>`).join(""):`<p style="margin:2px 0;white-space:pre-wrap">${U(n.text||"")}</p>`}</div>`).join("")}</div>`); }
  { const iss=s.issues||[]; if(iss.length){
    blocks.push(`<div class="rb"><h2>المشاكل الفنية — مفتوحة <span class="num">${iss.filter(x=>x.status!=="done").length}</span> / <span class="num">${iss.length}</span></h2><table><tr><th>التاريخ</th><th>الواجهة</th><th>المشكلة</th><th>المسؤول / الإجراء</th><th>الحالة</th></tr>
      ${iss.map((x,i)=>`<tr><td class="num">${U(x.date)}</td><td>${faceName(x.face)}</td><td>${U(x.text||"—")}${x.fileId?` <span class="num">(صورة ${i+1})</span>`:""}</td><td>${U(x.action||"—")}</td><td><span class="chip ${x.status==="done"?"done":"ex"}">${x.status==="done"?"تم الحل":"مفتوحة"}</span></td></tr>`).join("")}</table></div>`);
    const ip=iss.map((x,i)=>({x,i})).filter(o=>o.x.fileId);
    for(let j=0;j<ip.length;j+=2) blocks.push(`<div class="rb">${j===0?"<h3 style=\"margin:0 0 6px\">صور المشاكل الفنية</h3>":""}<div class="ph">${ip.slice(j,j+2).map(o=>`<figure><img src="${imgs[o.x.fileId]}"><figcaption>صورة <span class="num">${o.i+1}</span> — ${U(o.x.text||"")}</figcaption></figure>`).join("")}</div></div>`);
  } }
  if(s.notes) blocks.push(`<div class="rb"><h2>ملاحظات</h2><p style="margin:0;white-space:pre-wrap">${U(s.notes)}</p></div>`);
  }
  rep.innerHTML=blocks.join(""); translate(rep);
  await Promise.all([...rep.querySelectorAll("img")].map(im=>im.complete?0:new Promise(r=>{im.onload=im.onerror=r;})));
  try{ await document.fonts.ready; }catch(e){}
  const { jsPDF } = window.jspdf; const pdf=new jsPDF({unit:"mm",format:"a4"});
  const W=210, H=297, M=0, bottom=18; let y=0;
  for(const el of rep.children){
    const cv=await html2canvas(el,{scale:2,backgroundColor:"#ffffff",useCORS:true,logging:false});
    let w=W-2*M, h=cv.height*w/cv.width;
    if(h>H-bottom){ h=H-bottom; w=cv.width*h/cv.height; }
    if(y+h>H-bottom && y>0){ pdf.addPage(); y=6; }
    pdf.addImage(cv.toDataURL("image/jpeg",0.86),"JPEG",(W-w)/2,y,w,h); y+=h;
  }
  const pages=pdf.getNumberOfPages();
  let foot=null; try{ const fe=document.createElement("div"); fe.className="lhfoot"; fe.innerHTML=`<span class="u">${lang==="en"?esc(co.companyEn||co.company):esc(co.company)}</span>${[co.phone,co.email].filter(Boolean).map(x=>`<span dir="ltr">${esc(x)}</span>`).join("")}`;
    rep.appendChild(fe); translate(fe); const fc=await html2canvas(fe,{scale:2,backgroundColor:"#ffffff",logging:false}); foot={d:fc.toDataURL("image/png"),r:fc.height/fc.width}; fe.remove(); }catch(e){}
  for(let p=1;p<=pages;p++){ pdf.setPage(p);
    if(foot){ const fw=W-24, fh=fw*foot.r; pdf.addImage(foot.d,"PNG",12,H-fh-6.5,fw,fh); }
    pdf.setDrawColor(17,130,58); pdf.setLineWidth(0.4); pdf.line(12,H-7.5-(foot?(W-24)*foot.r:0),W-12,H-7.5-(foot?(W-24)*foot.r:0));
    pdf.setFontSize(8); pdf.setTextColor(120); pdf.text(`${p} / ${pages}`,W/2,H-3,{align:"center"}); }
  rep.innerHTML="";
  const fname=`${tr(kind==="fin"?"التقرير المالي":kind==="pur"?"التقرير الداخلي":"تقرير الأعمال")} ${s.name} ${today()}.pdf`.replace(/[\\/:*?"<>|]/g,"-");
  const blob=pdf.output("blob");
  if(!downloads) throw new Error(tr("الحفظ غير متاح في هذا العرض"));
  try{ await downloads.save({filename:fname,data:blob}); S.lastPdf=s.id; }
  catch(err){ if(err&&err.code==="declined") toast("لم يُحفظ الملف"); else throw new Error(err&&err.message||"تعذر الحفظ"); }
}

app.addEventListener("load", e=>{ const im=e.target; if(!im||im.id!=="planImg"||!im.naturalWidth) return; const s=site(); if(!s) return; const fl=floors(s).find(x=>x.id===im.dataset.fl); if(!fl) return;
  const a=+(im.naturalHeight/im.naturalWidth).toFixed(5); if(Math.abs((fl.aspect||0)-a)>0.0005){ fl.aspect=a; save(s); render(); } }, true);
