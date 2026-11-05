/* ---------- المستندات: Receipt Voucher · Tax Invoice · Progress Invoice ----------
   Kept in the «docs» table; numbers come from the database counter (rv | inv), so a number is never repeated.
   Tax Invoice and Progress Invoice share the invoice counter. An issued document is never deleted, only cancelled. */
S.docs={}; S.docTab="rv"; S.docEd=null; S.docQ=""; S.docsLoaded=false; S.docsOk=true;
const DOCK={rv:"Receipt Voucher",tax:"Tax Invoice",prog:"Progress Invoice"};
const r2=x=>Math.round(n(x)*100)/100;
const docCounter=k=>k==="rv"?"rv":"inv";
const docNoFmt=(k,seq,date)=>k==="rv"?String(seq).padStart(5,"0"):`${S.settings.invPrefix||"INV"}/${String(date||today()).slice(0,4)}/${String(seq).padStart(3,"0")}`;
function docCalc(d){
  if(d.kind==="rv"){ const a=r2(d.amount); return {rate:0,sub:a,vat:0,total:a,received:0,due:a}; }
  const rate=n(d.vat), sub=r2((d.lines||[]).reduce((a,l)=>a+n(l.amount),0)), vat=r2(sub*rate/100), total=r2(sub+vat), received=d.deduct?r2(d.received):0;
  return {rate,sub,vat,total,received,due:r2(total-received)}; }
const docTotal=d=>{ const c=docCalc(d); return d.kind!=="rv"&&d.deduct?c.due:c.total; };
const docParty=d=>String((d.kind==="rv"?d.receivedFrom:d.to)||"").trim();
const docDate=d=>d.kind==="rv"?d.date:(d.invoiceDate||d.date);
const dmyD=x=>{ const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(x||""); return m?`${m[3]}/${m[2]}/${m[1]}`:(x||""); };
const docList=k=>Object.values(S.docs).filter(d=>d.kind===k).sort((a,b)=>(n(b.seq)-n(a.seq))||((b.createdAt||0)-(a.createdAt||0)));
const legalName=()=>S.settings.legalName||S.settings.companyEn||"Aseel Aluminium & Glass LLC";
const payBeing=(s,p)=>{ const i=(s.payments||[]).indexOf(p); return `${ORD[i]||("No. "+(i+1))} Payment`; };

function newDoc(kind,site,pay){
  const d={id:uid(),kind,counter:docCounter(kind),isNew:true,status:"new",date:today(),siteId:site?site.id:"",payId:pay?pay.id:"",stamp:true,sign:false,createdAt:Date.now()};
  const proj=site?(site.location||site.name||""):"", who=site?(site.client||site.owner||""):"";
  if(kind==="rv"){ const last=docList("rv")[0]||{}, pm=pay?pmOf(pay):"";
    Object.assign(d,{date:(pay&&pay.date)||today(),amount:pay?String(r2(pay.amount)):"",receivedFrom:who,
      chequeNo:pm==="cheque"?`Cheque No. ${pay.chequeNo||""}`.trim():pm==="transfer"?"Bank Transfer":"Cash",
      chequeDate:pm==="cheque"||pm==="transfer"?(pay.date||""):"",bank:pay?(pay.bank||""):"",
      being:pay?[payBeing(site,pay),proj].filter(Boolean).join(" - "):"",collectedBy:last.collectedBy||"",mobNo:last.mobNo||""}); }
  else { const sp=pay?vatSplit(pay.amount,5):null, dt=(pay&&pay.date)||today();
    Object.assign(d,{date:dt,invoiceDate:dt,title:kind==="tax"?"TAX INVOICE":"PROGRESS INVOICE",toLabel:"Client",to:who,hasTrn:false,toTrn:"",project:proj,quotation:site?(site.quoteNo||""):"",
      lines:[{desc:pay?payBeing(site,pay):"",amount:sp?String(sp.net):""}],vat:5,deduct:false,received:"",paidStamp:!!pay,paidDate:pay?dt:""}); }
  return d; }

/* ---- paper sheets (same look as the company's documents) ---- */
function paidStampURL(iso){
  const cv=document.createElement("canvas"); cv.width=600; cv.height=300; const g=cv.getContext("2d"); const red="#c8102e";
  g.translate(300,150); g.rotate(-10*Math.PI/180); g.strokeStyle=red; g.fillStyle=red;
  const rr=(x,y,w,h,r)=>{ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); };
  g.lineWidth=12; rr(-260,-105,520,210,26); g.stroke(); g.lineWidth=4; rr(-242,-87,484,174,16); g.stroke();
  g.textAlign="center"; g.textBaseline="middle"; g.font="700 112px Arimo, Arial, sans-serif"; g.fillText("PAID",0,-20);
  g.font="700 34px Arimo, Arial, sans-serif"; g.fillText(iso?dmyD(iso):"",0,58);
  return cv.toDataURL("image/png"); }
function invSheet(d){
  const c=docCalc(d), tax=d.kind==="tax", co=S.settings, T=esc;
  const tot=(l,v,b)=>`<tr class="tot"><td colspan="2" class="lbl">${b?`<b>${l}</b>`:l}</td><td class="r amt">${m2(v)}</td></tr>`;
  return `<div class="isheet"><div class="ih"><img src="./doc-head.png" alt=""></div>
   <div class="ititle">${T(d.title||(tax?"TAX INVOICE":"PROGRESS INVOICE"))}</div>
   <div class="ico"><div class="col"><b>${T(legalName())}</b>${co.poBox?`<span>P.O Box No. ${T(co.poBox)}</span>`:""}${co.address?`<span>${T(co.address)}</span>`:""}${tax&&co.trn?`<b class="trn">TRN: ${T(co.trn)}</b>`:""}</div><div class="cor"><b>Date: ${T(dmyD(d.invoiceDate))}</b></div></div>
   <div class="ito"><span>To,</span><div class="who">${T(d.toLabel||"Client")} : ${T(d.to)}</div>${tax&&d.hasTrn&&d.toTrn?`<div class="who sm">TRN: ${T(d.toTrn)}</div>`:""}
    <dl class="ikv"><dt>Invoice Number</dt><dd>: <b>${T(d.no||"—")}</b></dd><dt>Invoice Date</dt><dd>: <b>${T(dmyD(d.invoiceDate))}</b></dd><dt>Project</dt><dd>: ${T(d.project)}</dd><dt>RF. Quotation No</dt><dd>: ${T(d.quotation)}</dd></dl></div>
   <table class="lt"><colgroup><col style="width:9%"><col><col style="width:29%"></colgroup><thead><tr><th>No.</th><th class="desc">Description</th><th>Total Amount in AED</th></tr></thead><tbody>
    ${(d.lines||[]).map((l,i)=>`<tr><td class="c"><b>${i+1}</b></td><td><div class="dt">${T(l.desc)}</div></td><td class="r amt">${m2(l.amount)}</td></tr>`).join("")}
    ${(d.lines||[]).length>1?tot("Sub total",c.sub):""}${tot(`VAT ${c.rate}%`,c.vat)}${tot("Total Amount + VAT",c.total,1)}
    ${d.deduct?tot("Received amount",c.received)+tot("Required Amount + VAT",c.due,1):""}
    <tr class="words"><td colspan="3">${T(amountWords(d.deduct?c.due:c.total))}</td></tr></tbody></table>
   <div class="isign"><div class="sl"><span class="for">For</span><b>${T(legalName())}</b>${d.sign?`<img class="sig" src="./doc-sign.png" alt="">`:""}<span style="margin-top:${d.sign?0:26}px">AUTHORISED SIGNATORY</span></div>
    <div class="sm">${d.stamp?`<img src="./doc-stamp.png" alt="">`:""}${d.paidStamp?`<img class="paid" src="${paidStampURL(d.paidDate)}" alt="PAID">`:""}</div><div class="sr">RECEIVED BY</div></div>
   <div class="ifoot"><img src="./doc-foot.png" alt=""></div>${d.status==="void"?`<div class="dvoid">CANCELLED</div>`:""}</div>`; }
function rvSheet(d){
  const T=esc, row=(l,v)=>`<div class="vr"><div class="vl">${l}</div><div class="vv">${T(v)}</div></div>`;
  const row2=(l,v,k2,v2)=>`<div class="vr two"><div class="vl">${l}</div><div class="vv">${T(v)}</div><div class="vv"><span class="k2">${k2}</span>${T(v2)}</div></div>`;
  return `<div class="vsheet"><img class="vhead" src="./doc-vhead.png" alt="">
   <div class="vtop"><div class="vk"><b>rv.no #</b><div class="vbox"><span class="rvno">${T(d.no||"")}</span></div></div><div class="vk"><b>Amount</b><div class="vbox"><span class="vx">${n(d.amount)?m2(d.amount):""}</span></div></div><div class="vk"><b>Date</b><div class="vbox"><span class="vx">${T(dmyD(d.date))}</span></div></div></div>
   <div class="vrows">${row("received from m/s.",d.receivedFrom)}${row("the sum of dhs.",n(d.amount)?amountWords(n(d.amount)):"")}${row2("cash / cheque no.",d.chequeNo,"dated",dmyD(d.chequeDate))}${row("bank",d.bank)}${row("being",d.being)}${row2("cash collected by",d.collectedBy,"mob no",d.mobNo)}</div>
   <div class="vsign"><div class="vs-l">Receiver's Signature<span class="dots"></span></div><div class="vs-m">${d.stamp?`<img src="./doc-stamp.png" alt="">`:""}</div><div class="vs-r">${d.sign?`<img class="sig" src="./doc-sign.png" alt="">`:""}Accountant's Signature<span class="dots"></span></div></div>
   ${d.status==="void"?`<div class="dvoid">CANCELLED</div>`:""}</div>`; }
const docSheet=d=>d.kind==="rv"?rvSheet(d):invSheet(d);
function fitDocPrev(){ const w=document.getElementById("docprev"); const sh=w&&w.firstElementChild; if(!sh) return;
  const sc=Math.min(1,w.clientWidth/sh.offsetWidth); sh.style.transform=`scale(${sc})`; w.style.height=Math.ceil(sh.offsetHeight*sc)+"px"; }
window.addEventListener("resize",()=>fitDocPrev());

/* ---- screens ---- */
function docsView(){
  if(S.docEd) return header(S.docEd.isNew?tr("مستند جديد"):`<bdi dir="ltr">${esc(S.docEd.no||"")}</bdi>`,DOCK[S.docEd.kind])+docEditor();
  const k=S.docTab;
  return header("المستندات")+`<div class="panel">
   <div class="seg doctabs" role="group" aria-label="نوع المستند">${Object.entries(DOCK).map(([kk,l])=>`<button aria-pressed="${kk===k}" data-act="doctab" data-k="${kk}"><bdi dir="ltr">${l}</bdi> <span class="num">${docList(kk).length}</span></button>`).join("")}</div>
   ${S.docsOk===false?`<div class="notice small"><b>المستندات غير مفعّلة بعد في قاعدة البيانات.</b> شغّل ملف docs-setup.sql مرة واحدة في Supabase (SQL Editor ← New query ← الصق ← Run).</div>`:""}
   <button class="primary big" data-act="docnew">+ <bdi dir="ltr">${DOCK[k]}</bdi> جديد</button>
   <input type="search" id="doc-q" placeholder="بحث بالرقم أو الاسم أو المشروع" value="${esc(S.docQ||"")}" style="margin-top:10px">
   <div class="list" id="doclist">${docList(k).map(docRow).join("")||`<div class="empty">لا توجد مستندات بعد.</div>`}</div></div>
   ${docCountersPanel()}`; }
function docRow(d){ const s=S.sites[d.siteId];
  const key=[d.no,docParty(d),d.project,d.being,s&&s.name].join(" ").toLowerCase();
  return `<button class="entry docrow ${d.status==="void"?"void":""}" data-act="docopen" data-id="${esc(d.id)}" data-k="${esc(key)}">
   <span class="docno" dir="ltr">${esc(d.no||"—")}</span>
   <span class="docp"><b><bdi>${esc(docParty(d)||"—")}</bdi></b><span class="small muted">${fmtDate(docDate(d))}${s?` · ${esc(s.name)}`:""}</span></span>
   <span class="docamt"><b class="num">${m2(docTotal(d))}</b>${d.status==="void"?`<span class="chip bad">ملغى</span>`:""}</span></button>`; }
function docCountersPanel(){ const c=S.docCnt;
  return `<details class="panel" ${S.docCntOpen?"open":""}><summary style="cursor:pointer;font-weight:600" data-act="doccnt">🔢 الترقيم</summary>
   ${c?`<div class="grid2"><label>آخر رقم Receipt Voucher صدر<input id="dc-rv" type="number" inputmode="numeric" dir="ltr" value="${esc(c.rv??"")}"></label>
    <label>آخر رقم فاتورة صدر (Tax و Progress)<input id="dc-inv" type="number" inputmode="numeric" dir="ltr" value="${esc(c.inv??"")}"></label></div>
    <button data-act="doccntsave">حفظ الترقيم</button>
    <p class="small muted" style="margin:0">الرقم التالي يُؤخذ من قاعدة البيانات، فلا يتكرر حتى لو أصدر شخصان مستنداً في نفس اللحظة. ولا يُقبل رقم أقل من رقم صدر فعلاً.</p>`
    :`<div class="empty">جارٍ التحميل…</div>`}</details>`; }
function docEditor(){
  const d=S.docEd, k=d.kind, issued=!d.isNew, voided=d.status==="void", c=docCalc(d);
  const f=(key,label,o={})=>`<label${o.full?' class="full"':""}>${label}<input data-dx="${key}" ${o.type?`type="${o.type}"`:""} ${o.num?'inputmode="decimal"':""} dir="ltr" value="${esc(d[key]??"")}" ${o.list?`list="${o.list}"`:""} placeholder="${esc(o.ph||"")}"></label>`;
  const chk=(key,label)=>`<label class="dchk"><input type="checkbox" data-dx="${key}" ${d[key]?"checked":""}> ${label}</label>`;
  const sites=Object.values(S.sites).filter(s=>!s.archived||s.id===d.siteId).sort((a,b)=>String(a.name||"").localeCompare(String(b.name||"")));
  const siteSel=`<label class="full">الموقع (اختياري)<select data-dsite="1"><option value="">— بدون موقع —</option>${sites.map(s=>`<option value="${esc(s.id)}" ${s.id===d.siteId?"selected":""}>${esc(s.name||"")}</option>`).join("")}</select></label>`;
  const all=Object.values(S.docs), uniq=a=>[...new Set(a.map(x=>String(x||"").trim()).filter(Boolean))].slice(0,40);
  const dl=(id,a)=>`<datalist id="${id}">${uniq(a).map(v=>`<option value="${esc(v)}"></option>`).join("")}</datalist>`;
  const names=[...Object.values(S.sites).flatMap(s=>[s.client,s.owner]),...all.map(docParty)];
  let body;
  if(k==="rv") body=`<div class="grid2">${siteSel}
    ${f("receivedFrom","received from m/s. (اسم الدافع)",{full:1,list:"dl-from",ph:"Name of payer"})}
    ${f("amount","Amount (درهم)",{type:"number",num:1})}${f("date","Date",{type:"date"})}
    ${f("chequeNo","cash / cheque no.",{list:"dl-cheque"})}${f("chequeDate","dated",{type:"date"})}
    ${f("bank","bank",{list:"dl-bank"})}${f("being","being (البيان)",{list:"dl-being"})}
    ${f("collectedBy","cash collected by",{list:"dl-coll"})}${f("mobNo","mob no",{type:"tel"})}</div>
    <div class="row">${chk("stamp","الختم")}${chk("sign","توقيع المحاسب")}</div>
    ${dl("dl-from",names)}${dl("dl-cheque",["Cash","Cheque No. ","Bank Transfer",...all.map(x=>x.chequeNo)])}${dl("dl-bank",all.map(x=>x.bank))}
    ${dl("dl-being",["Advance Payment","Progress Payment","Final Payment","Retention",...all.map(x=>x.being)])}${dl("dl-coll",all.map(x=>x.collectedBy))}`;
  else { const s=S.sites[d.siteId];
    body=`<div class="grid2">${siteSel}
    <label>To<select data-dx="toLabel">${["Client","Contractor","Customer","Owner"].map(o=>`<option ${(d.toLabel||"Client")===o?"selected":""}>${o}</option>`).join("")}</select></label>
    ${f("to","الاسم (بالإنجليزية)",{list:"dl-to"})}
    ${f("project","Project",{list:"dl-proj"})}${f("quotation","RF. Quotation No")}
    ${f("invoiceDate","Invoice Date",{type:"date"})}${f("vat",`<bdi dir="ltr">VAT %</bdi>`,{type:"number",num:1})}</div>
    ${k==="tax"?`<div class="row">${chk("hasTrn","للعميل رقم ضريبي (TRN)")}</div>${d.hasTrn?`<div class="grid2">${f("toTrn","TRN العميل")}</div>`:""}`:`<p class="small muted" style="margin:0">Progress Invoice لا تُظهر أي رقم ضريبي.</p>`}
    <h3>البنود</h3>
    ${(d.lines||[]).map((l,i)=>`<div class="dline"><textarea data-dl="${i}" data-lf="desc" dir="ltr" rows="2" placeholder="e.g. Progress Payment 30% of 405,300">${esc(l.desc)}</textarea><input data-dl="${i}" data-lf="amount" type="number" inputmode="decimal" dir="ltr" value="${esc(l.amount)}" placeholder="0.00" aria-label="المبلغ قبل الضريبة"><button class="ghost" data-act="dlinedel" data-i="${i}" aria-label="حذف البند">✕</button></div>`).join("")}
    <button data-act="dlineadd">+ بند</button>
    ${k==="prog"&&s&&n(s.total)?`<div class="row" style="align-items:end"><label style="flex:1">نسبة الإنجاز من قيمة العقد (<span class="num">${m2(s.total)}</span>)<input id="dc-pct" type="number" inputmode="decimal" dir="ltr" placeholder="30"></label><button data-act="docpct">أضف البند</button></div>`:""}
    <div class="row">${chk("deduct","خصم المبالغ المستلمة سابقاً")}</div>${d.deduct?`<div class="grid2">${f("received","المستلم سابقاً شامل الضريبة (درهم)",{type:"number",num:1})}</div>`:""}
    <div class="row">${chk("stamp","الختم")}${chk("sign","التوقيع")}${chk("paidStamp","ختم PAID")}</div>${d.paidStamp?`<div class="grid2">${f("paidDate","تاريخ الدفع",{type:"date"})}</div>`:""}
    <div class="ivsum" id="docsum"><div><span class="small muted">قبل الضريبة</span><b class="num">${m2(c.sub)}</b></div><div><span class="small muted">الضريبة <span class="num">${c.rate}%</span></span><b class="num">${m2(c.vat)}</b></div><div class="hl"><span class="small">${d.deduct?"المطلوب":"الإجمالي"}</span><b class="num">${m2(docTotal(d))}</b></div></div>
    ${dl("dl-to",names)}${dl("dl-proj",[...Object.values(S.sites).map(x=>x.location||x.name),...all.map(x=>x.project)])}`; }
  return `<div class="panel">
   <div class="row" style="justify-content:space-between"><button class="ghost" data-act="docback">${lang==="en"?"←":"→"} المستندات</button>${issued?`<span class="chip ${voided?"bad":"done"}">${voided?"ملغى":"صادر"}</span>`:""}</div>
   ${voided?`<div class="notice small docvoidbar">هذا المستند ملغى. رقمه محفوظ ولا يُستخدم مرة أخرى.</div>`:""}
   ${body}
   <h3>المعاينة</h3><div class="docprev" id="docprev">${docSheet(d)}</div>
   <div class="row" style="margin-top:10px">${!issued?`<button class="primary big ${S.busy==="doc"?"busy":""}" data-act="docissue">${S.busy==="doc"?"جارٍ الإصدار…":"✓ إصدار برقم جديد وتنزيل PDF"}</button>`
     :`<button class="primary big" data-act="docsave">💾 حفظ التعديلات</button><button class="big ${S.busy==="docpdf"?"busy":""}" data-act="docpdf">${S.busy==="docpdf"?"جارٍ التجهيز…":"⬇️ تنزيل PDF"}</button>`}</div>
   ${S.lastDoc===d.id?`<div class="notice small"><b>${window.__ios?"✓ الملف جاهز.":"✓ تم حفظ الملف في التنزيلات."}</b> أرسله للعميل بزر «مشاركة»، أو من الواتساب: 📎 ثم «مستند».</div>${window.__lastFile?`<div class="row">${navigator.canShare?`<button class="primary big" data-act="sharefile">📤 مشاركة (واتساب…)</button>`:""}<button class="big" data-act="dlagain">${window.__ios?"📥 حفظ في الملفات / فتح":"⬇️ تحميل مرة أخرى"}</button></div>`:""}`:""}
   ${issued&&!voided?`<button class="ghost danger ${S.armed==="docvoid"?"armed":""}" data-act="docvoid">${S.armed==="docvoid"?"اضغط مرة أخرى لتأكيد الإلغاء":"🚫 إلغاء المستند (يبقى رقمه محفوظاً)"}</button>`:""}
   ${!issued?`<p class="small muted" style="margin:0">لا يأخذ المستند رقماً حتى تضغط «إصدار». بعد الإصدار لا يُحذف، ويمكن إلغاؤه فقط.</p>`:""}</div>`; }

/* ---- saving ---- */
const docClean=d=>{ const x=JSON.parse(JSON.stringify(d)); delete x.isNew; return x; };
async function docPut(d){ d.updatedAt=Date.now(); S.docs[d.id]=docClean(d); if(!db) throw new Error(tr("قاعدة البيانات غير متصلة")); await db.doc("docs/"+d.id).set(docClean(d)); }
function docMerge(docs){ const next={}, now=Date.now();
  docs.forEach(x=>{ next[x.id]={...JSON.parse(JSON.stringify(x.data()||{})),id:x.id}; });
  Object.values(S.docs).forEach(x=>{ const srv=next[x.id]; if((!srv&&now-(x.updatedAt||0)<120000)||(srv&&(x.updatedAt||0)>(srv.updatedAt||0))) next[x.id]=x; });
  S.docs=next; }
function docLinkPay(d,on){ const s=S.sites[d.siteId]; const p=s&&(s.payments||[]).find(x=>x.id===d.payId); if(!p) return;
  const key=d.kind==="rv"?"rv":"invoice";
  if(on){ const c=docCalc(d); p[key]=d.kind==="rv"?{no:d.no,docId:d.id}:{no:d.no,docId:d.id,date:d.invoiceDate,to:d.to,gross:c.total,rate:c.rate}; }
  else if(p[key]&&p[key].docId===d.id) delete p[key]; else return;
  save(s); }
const docErr=e=>{ const m=String((e&&(e.message||e.code))||e||""); return /PGRST20[0-9]|42P01|42883|Could not find|does not exist|schema cache/i.test(m)?tr("المستندات غير مفعّلة بعد في قاعدة البيانات: شغّل ملف docs-setup.sql في Supabase"):m; };
async function docPdf(d){
  if(!window.html2canvas||!window.jspdf) throw new Error(tr("مكتبة التقرير لم تُحمّل"));
  let host=document.getElementById("dochost"); if(!host){ host=document.createElement("div"); host.id="dochost"; host.setAttribute("aria-hidden","true"); document.body.appendChild(host); }
  host.innerHTML=docSheet(d);
  await Promise.all([...host.querySelectorAll("img")].map(im=>im.complete?0:new Promise(r=>{ im.onload=im.onerror=r; })));
  try{ await Promise.all(['400 14px Caladea','700 14px Caladea','700 14px Arimo','500 19px Poppins','700 21px Poppins','500 24px "Barlow Condensed"'].map(f=>document.fonts.load(f))); await document.fonts.ready; }catch(e){}
  const land=d.kind==="rv"; const cv=await html2canvas(host.firstElementChild,{scale:2,backgroundColor:"#ffffff",logging:false});
  const { jsPDF } = window.jspdf; const pdf=new jsPDF({unit:"mm",format:"a4",orientation:land?"landscape":"portrait"}); const W=land?297:210, H=land?210:297;
  pdf.addImage(cv.toDataURL("image/jpeg",0.92),"JPEG",0,0,W,Math.min(H,cv.height*W/cv.width)); host.innerHTML="";
  const fname=`${d.kind==="rv"?"Receipt Voucher RV":DOCK[d.kind]} ${d.no} - ${docParty(d)||"document"}${d.status==="void"?" (CANCELLED)":""}.pdf`.replace(/[\\/:*?"<>|]/g,"-");
  if(!downloads) throw new Error(tr("الحفظ غير متاح في هذا العرض"));
  try{ await downloads.save({filename:fname,data:pdf.output("blob")}); S.lastDoc=d.id; }
  catch(err){ if(err&&err.code==="declined") toast("لم يُحفظ الملف"); else throw new Error(err&&err.message||"تعذر الحفظ"); } }
async function docIssue(){
  const d=S.docEd; if(!d||S.busy) return;
  if(!docParty(d)){ toast(d.kind==="rv"?"اكتب اسم الدافع (received from)":"اكتب اسم العميل بالإنجليزية"); return; }
  if(!(docCalc(d).total>0)){ toast(d.kind==="rv"?"اكتب المبلغ":"اكتب مبلغ البند"); return; }
  if(!window.__docNo||!db){ toast("المستندات تحتاج الاتصال بقاعدة البيانات"); return; }
  S.busy="doc"; render();
  try{ const seq=await window.__docNo.next(d.counter);
    const x={...docClean(d),seq,no:docNoFmt(d.kind,seq,docDate(d)),status:"issued",issuedAt:Date.now(),by:cuMe||""};
    await docPut(x); S.docEd=JSON.parse(JSON.stringify(x)); S.docDirty=false; docLinkPay(x,true); toast(tr("✓ صدر برقم ")+x.no);
    S.busy=false; render();
    try{ await docPdf(x); }catch(e){ console.error(e); toast(tr("صدر المستند، لكن تعذر تجهيز PDF: ")+(e&&e.message||"")); }
  }catch(err){ console.error(err); toast(docErr(err)); }
  S.busy=false; render(); }
async function docSaveEd(quiet){ const d=S.docEd; if(!d||d.isNew) return true;
  if(!docParty(d)){ toast(d.kind==="rv"?"اكتب اسم الدافع (received from)":"اكتب اسم العميل بالإنجليزية"); return false; }
  try{ await docPut(d); S.docDirty=false; docLinkPay(d,d.status!=="void"); if(!quiet) toast("✓ تم الحفظ"); return true; }catch(err){ toast(docErr(err)); return false; } }
function docOpen(kind,site,pay){ // from a payment row: open its linked document, or start a new one filled from the payment
  const link=pay&&(kind==="rv"?pay.rv:pay.invoice); const ex=link&&link.docId&&S.docs[link.docId];
  S.docEd=ex?JSON.parse(JSON.stringify(ex)):newDoc(kind,site,pay); S.docTab=kind==="rv"?"rv":(ex?ex.kind:"tax"); S.docFrom=site?site.id:null; S.docDirty=false; S.lastDoc=null;
  S.view="docs"; render(); window.scrollTo(0,0); }
async function docLoadCounters(){ try{ S.docCnt=await window.__docNo.counters(); }catch(err){ S.docCnt=null; toast(docErr(err)); } render(); }

/* ---- events ---- */
function docRefresh(){ const d=S.docEd; if(!d) return; const w=document.getElementById("docprev"); if(w){ w.innerHTML=docSheet(d); fitDocPrev(); }
  const sm=document.getElementById("docsum"); if(sm&&d.kind!=="rv"){ const c=docCalc(d); const b=sm.querySelectorAll("b"); b[0].textContent=m2(c.sub); b[1].textContent=m2(c.vat); b[2].textContent=m2(docTotal(d)); } }
app.addEventListener("input",e=>{ const t=e.target;
  if(t.id==="doc-q"){ S.docQ=t.value; const q=t.value.trim().toLowerCase(); document.querySelectorAll("#doclist .docrow").forEach(r=>{ r.hidden=!!q&&!(r.dataset.k||"").includes(q); }); return; }
  const d=S.docEd; if(!d) return;
  if(t.dataset.dx&&t.type!=="checkbox"){ d[t.dataset.dx]=t.value; if(t.dataset.dx==="invoiceDate") d.date=t.value; S.docDirty=true; docRefresh(); }
  else if(t.dataset.dl!==undefined){ const l=(d.lines||[])[+t.dataset.dl]; if(l){ l[t.dataset.lf]=t.value; S.docDirty=true; docRefresh(); } } });
app.addEventListener("change",e=>{ const t=e.target, d=S.docEd; if(!d) return;
  if(t.dataset.dx&&t.type==="checkbox"){ d[t.dataset.dx]=t.checked; if(t.dataset.dx==="paidStamp"&&t.checked&&!d.paidDate) d.paidDate=d.invoiceDate||today(); S.docDirty=true; render(); }
  else if(t.dataset.dx&&t.tagName==="SELECT"){ d[t.dataset.dx]=t.value; S.docDirty=true; docRefresh(); }
  else if(t.dataset.dsite){ const old=S.sites[d.siteId], s=S.sites[t.value]; const was=v=>!String(v||"").trim()||(old&&[old.client,old.owner,old.location,old.name,old.quoteNo].includes(v));
    d.siteId=s?s.id:""; d.payId=""; if(s){ const who=s.client||s.owner||"", proj=s.location||s.name||"";
      if(d.kind==="rv"){ if(was(d.receivedFrom)) d.receivedFrom=who; } else { if(was(d.to)) d.to=who; if(was(d.project)) d.project=proj; if(was(d.quotation)) d.quotation=s.quoteNo||""; } }
    S.docDirty=true; render(); } });
app.addEventListener("click",async e=>{ const b=e.target.closest("[data-act]"); if(!b) return; const a=b.dataset.act; if(!/^d(oc|line)/.test(a)) return;
  if(a==="docsopen"){ S.view="docs"; S.docEd=null; S.pick=null; render(); window.scrollTo(0,0); }
  else if(a==="doctab"){ S.docTab=b.dataset.k; render(); }
  else if(a==="docnew"){ S.docEd=newDoc(S.docTab); S.docFrom=null; S.docDirty=false; S.lastDoc=null; render(); window.scrollTo(0,0); }
  else if(a==="docopen"){ const x=S.docs[b.dataset.id]; if(!x) return; S.docEd=JSON.parse(JSON.stringify(x)); S.docFrom=null; S.docDirty=false; S.lastDoc=null; render(); window.scrollTo(0,0); }
  else if(a==="docback"){ const d=S.docEd;
    if(d&&d.isNew&&(docParty(d)||docCalc(d).total>0)&&S.armed!=="docback"){ S.armed="docback"; toast("لم يُصدر المستند بعد. اضغط مرة أخرى للخروج بدون إصدار"); setTimeout(()=>{ if(S.armed==="docback") S.armed=null; },4000); return; }
    S.armed=null; if(d&&!d.isNew&&S.docDirty&&!(await docSaveEd(true))) return;
    S.docEd=null; if(S.docFrom&&S.sites[S.docFrom]){ S.view="site"; S.cur=S.docFrom; } S.docFrom=null; render(); window.scrollTo(0,0); }
  else if(a==="dlineadd"){ S.docEd.lines=[...(S.docEd.lines||[]),{desc:"",amount:""}]; S.docDirty=true; render(); }
  else if(a==="dlinedel"){ const L=S.docEd.lines||[]; if(L.length<=1){ L[0]={desc:"",amount:""}; } else L.splice(+b.dataset.i,1); S.docDirty=true; render(); }
  else if(a==="docpct"){ const d=S.docEd, s=S.sites[d.siteId], pct=n((document.getElementById("dc-pct")||{}).value); if(!s||!(pct>0)){ toast("اكتب النسبة"); return; }
    const row={desc:`Progress Payment ${pct}% of ${m2(s.total)}`,amount:String(r2(n(s.total)*pct/100))}; const L=d.lines||(d.lines=[]);
    if(L.length===1&&!L[0].desc&&!n(L[0].amount)) L[0]=row; else L.push(row); S.docDirty=true; render(); }
  else if(a==="docissue") docIssue();
  else if(a==="docsave"){ if(await docSaveEd()) render(); }
  else if(a==="docpdf"){ if(S.busy) return; if(S.docDirty&&!(await docSaveEd(true))) return; S.busy="docpdf"; render();
    try{ await docPdf(S.docEd); }catch(err){ console.error(err); toast(tr("تعذر إنشاء الملف: ")+(err&&err.message||"")); } S.busy=false; render(); }
  else if(a==="docvoid"){ if(S.armed!=="docvoid"){ S.armed="docvoid"; render(); setTimeout(()=>{ if(S.armed==="docvoid"){ S.armed=null; render(); } },5000); return; }
    S.armed=null; const d=S.docEd; d.status="void"; d.voidAt=Date.now(); d.voidBy=cuMe||"";
    try{ await docPut(d); S.docDirty=false; docLinkPay(d,false); toast(tr("تم إلغاء المستند ")+d.no); }catch(err){ d.status="issued"; toast(docErr(err)); } render(); }
  else if(a==="doccnt"){ e.preventDefault(); S.docCntOpen=!S.docCntOpen; render(); if(S.docCntOpen) docLoadCounters(); }
  else if(a==="doccntsave"){ const v={rv:(document.getElementById("dc-rv")||{}).value,inv:(document.getElementById("dc-inv")||{}).value};
    try{ for(const c of ["rv","inv"]){ const x=parseInt(v[c],10); if(!isFinite(x)||x<0){ toast("اكتب رقماً صحيحاً"); return; } if(S.docCnt&&x!==S.docCnt[c]) await window.__docNo.set(c,x); }
      toast("✓ تم حفظ الترقيم"); docLoadCounters(); }
    catch(err){ const m=String(err&&err.message||""); toast(/below issued/.test(m)?tr("لا يمكن: صدر مستند برقم أكبر من هذا"):docErr(err)); } } });
