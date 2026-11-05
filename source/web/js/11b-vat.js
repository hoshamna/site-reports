/* ---------- quarterly VAT report (Nov 2026) ----------
   Quarters follow the calendar: Jan–Mar, Apr–Jun, Jul–Sep, Oct–Dec.
   Sales = tax invoices issued on site payments. Purchases = every custody invoice (cash, credit or direct transfer) by invoice date.
   Left out of purchases, as the general manager asked: fuel, salaries, and government services (residence and labour card renewals and other fees). */
const VAT_GOVRE=/إقامة|اقامة|الإقامة|residen|visa|فيزا|تأشير|تاشير|بطاقة عمل|بطاقة العمل|labou?r card|work permit|تصريح عمل|tasheel|تسهيل|amer|آمر|emirates id|الهوية|هوية|immigration|الجنسية|mohre|وزارة الموارد/i;
function vatOut(x){ const t=`${x.supplier||""} ${x.desc||""}`;
  if(x.cat==="fuel"||(!x.cat&&FUELRE.test(t))) return "fuel";
  if(x.cat==="salary") return "salary";
  if(x.cat==="gov"||VAT_GOVRE.test(t)) return "gov";
  return ""; }
const VAT_WHY={fuel:"وقود",salary:"مرتبات",gov:"رسوم حكومية"};
const vatKnown=x=>x.vat!==undefined&&x.vat!==null&&String(x.vat).trim()!=="";
const vat5=a=>Math.round(n(a)*5/105*100)/100;
function vatQuarters(count){ const t=today(); let y=+t.slice(0,4), q=Math.floor((+t.slice(5,7)-1)/3); const out=[];
  for(let i=0;i<count;i++){ const m0=q*3+1, last=new Date(y,m0+2,0).getDate();
    out.push({key:`${y}-Q${q+1}`,from:`${y}-${pad2(m0)}-01`,to:`${y}-${pad2(m0+2)}-${pad2(last)}`,label:`${tr("الربع")} ${q+1} · ${monthName(y+"-"+pad2(m0))} – ${monthName(y+"-"+pad2(m0+2))}`});
    q--; if(q<0){ q=3; y--; } }
  return out; }
function vatData(P){ const inR=d=>d>=P.from&&d<=P.to;
  const sales=[]; Object.values(S.sites).forEach(s=>(s.payments||[]).forEach(p=>{ const v=p.invoice; if(!v) return; const d=/^\d{4}-\d{2}-\d{2}$/.test(v.date||"")?v.date:(p.date||""); if(!inR(d)) return;
    const sp=vatSplit(v.gross,n(v.rate)); sales.push({date:d,no:v.no||"",to:v.to||"",site:s.name||"",net:sp.net,vat:sp.vat,gross:sp.gross}); }));
  const pur=[], out=[], miss=[];
  Object.values(S.cu).filter(x=>isExp(x)&&inR(dateOf(x))).forEach(x=>{ const why=vatOut(x); const row={id:x.id,date:dateOf(x),supplier:cuName(x),invNo:x.invNo||"",trn:x.supTrn||"",gross:n(x.amount),why};
    if(why){ out.push(row); return; }
    if(!vatKnown(x)){ miss.push(row); row.vat=0; row.net=row.gross; pur.push(row); return; }
    row.vat=n(x.vat); row.net=Math.round((row.gross-row.vat)*100)/100; pur.push(row); });
  const S_=k=>a=>Math.round(a.reduce((t,r)=>t+n(r[k]),0)*100)/100;
  sales.sort((a,b)=>a.date.localeCompare(b.date)); pur.sort((a,b)=>a.date.localeCompare(b.date)); out.sort((a,b)=>a.date.localeCompare(b.date));
  const r={sales,pur,out,miss,sNet:S_("net")(sales),sVat:S_("vat")(sales),sGross:S_("gross")(sales),pNet:S_("net")(pur),pVat:S_("vat")(pur),pGross:S_("gross")(pur),oGross:S_("gross")(out)};
  r.due=Math.round((r.sVat-r.pVat)*100)/100; return r; }
function vatPanel(){ if(!isAdmin()) return ""; const Q=vatQuarters(6); const P=Q.find(q=>q.key===S.vatQ)||Q[1]||Q[0]; const d=vatData(P);
  return `<details class="panel vatbox" ${S.vatOpen?"open":""}><summary style="cursor:pointer;font-weight:600" data-act="vatopen">🧾 تقرير الضريبة (كل 3 أشهر)</summary>
   <label>الفترة<select id="vat-q" data-vatq="1">${Q.map(q=>`<option value="${q.key}" ${q.key===P.key?"selected":""}>${esc(q.label)}</option>`).join("")}</select></label>
   <div class="stats"><div class="stat"><span class="small muted">ضريبة المبيعات</span><b class="num">${money(d.sVat)}</b><span class="small muted"><span class="num">${d.sales.length}</span> فاتورة ضريبية</span></div>
    <div class="stat"><span class="small muted">ضريبة المشتريات</span><b class="num">${money(d.pVat)}</b><span class="small muted"><span class="num">${d.pur.length}</span> فاتورة</span></div>
    <div class="stat ${d.due>=0?"hl":"good"}" style="grid-column:1/-1"><span class="small">${d.due>=0?"المستحق للهيئة":"المسترد من الهيئة"}</span><b class="num">${money(Math.abs(d.due))} <small>درهم</small></b></div></div>
   <p class="small muted" style="margin:0">لا تدخل في المشتريات: الوقود، والمرتبات، والرسوم الحكومية (تجديد الإقامة وبطاقة العمل وغيرها) — <span class="num">${d.out.length}</span> فاتورة بقيمة <span class="num">${money(d.oGross)}</span> درهم.</p>
   ${d.miss.length?`<div class="notice small dupbox"><b>⚠️ <span class="num">${d.miss.length}</span> فاتورة لم تُسجَّل ضريبتها</b><span>تُحسب ضريبتها صفراً حتى تُدخلها. افتح الفاتورة واكتب مبلغ الضريبة كما هو مكتوب فيها، أو احسب 5% للكل إذا كانت كلها من موردين مسجّلين في الضريبة.</span>
     <div class="row"><button class="${S.armed==="vat5"?"danger armed":""}" data-act="vat5" data-q="${P.key}">${S.armed==="vat5"?"اضغط مرة أخرى للتأكيد":"احسب 5% لهذه الفواتير"}</button><button class="ghost" data-act="vatmiss" data-q="${P.key}">عرضها</button></div></div>`:""}
   <div class="row"><button class="primary" data-act="vatpdf" data-q="${P.key}">📄 PDF</button><button data-act="vatxls" data-q="${P.key}">📊 Excel</button></div>
   ${pdfNotice("vat")}</details>`; }
async function makeVatPdf(P){ const d=vatData(P); const co=S.settings; const m=v=>`<td class="num">${money(v)}</td>`;
  const blocks=[];
  blocks.push(`<div class="rb"><div class="info" style="grid-template-columns:1fr 1fr"><div><span>${tr("الفترة")}: </span><b class="num">${fmtD(P.from)} – ${fmtD(P.to)}</b></div>${co.trn?`<div><span>TRN: </span><b class="num">${esc(co.trn)}</b></div>`:""}</div>
   <h2>${tr("ملخص الضريبة")}</h2><div class="kv" style="grid-template-columns:repeat(3,1fr)"><div>${tr("ضريبة المبيعات")}<b class="num">${money(d.sVat)}</b></div><div>${tr("ضريبة المشتريات")}<b class="num">${money(d.pVat)}</b></div><div class="hl">${d.due>=0?tr("المستحق للهيئة"):tr("المسترد من الهيئة")}<b class="num">${money(Math.abs(d.due))}</b></div></div></div>`);
  blocks.push(`<div class="rb"><h2>${tr("المبيعات (الفواتير الضريبية)")}</h2>${d.sales.length?tbl([tr("التاريخ"),tr("رقم الفاتورة"),tr("العميل"),tr("المشروع"),tr("المبلغ قبل الضريبة"),tr("الضريبة"),tr("الإجمالي")],
    d.sales.map(r=>`<tr><td class="num">${fmtD(r.date)}</td><td class="num">${esc(r.no)}</td><td class="u">${esc(r.to)}</td><td class="u">${esc(r.site)}</td>${m(r.net)}${m(r.vat)}${m(r.gross)}</tr>`),
    `<tr><th colspan="4">${tr("الإجمالي")}</th><th class="num">${money(d.sNet)}</th><th class="num">${money(d.sVat)}</th><th class="num">${money(d.sGross)}</th></tr>`):`<p>${tr("لا توجد فواتير ضريبية في هذه الفترة.")}</p>`}</div>`);
  blocks.push(`<div class="rb"><h2>${tr("المشتريات")}</h2>${d.pur.length?tbl([tr("التاريخ"),tr("المورد"),tr("رقم الفاتورة"),"TRN",tr("المبلغ قبل الضريبة"),tr("الضريبة"),tr("الإجمالي")],
    d.pur.map(r=>`<tr><td class="num">${fmtD(r.date)}</td><td class="u">${esc(r.supplier)}${d.miss.includes(r)?" ⚠️":""}</td><td class="num">${esc(r.invNo)}</td><td class="num">${esc(r.trn)}</td>${m(r.net)}${m(r.vat)}${m(r.gross)}</tr>`),
    `<tr><th colspan="4">${tr("الإجمالي")}</th><th class="num">${money(d.pNet)}</th><th class="num">${money(d.pVat)}</th><th class="num">${money(d.pGross)}</th></tr>`):`<p>${tr("لا توجد مشتريات في هذه الفترة.")}</p>`}
   ${d.miss.length?`<p style="font-size:12px;color:#a86a12">⚠️ ${tr("فواتير لم تُسجَّل ضريبتها، وحُسبت ضريبتها صفراً")}: <b class="num">${d.miss.length}</b></p>`:""}</div>`);
  if(d.out.length) blocks.push(`<div class="rb"><h2>${tr("لا تدخل في الضريبة")}</h2>${tbl([tr("التاريخ"),tr("المورد"),tr("السبب"),tr("المبلغ")],
    d.out.map(r=>`<tr><td class="num">${fmtD(r.date)}</td><td class="u">${esc(r.supplier)}</td><td>${tr(VAT_WHY[r.why])}</td>${m(r.gross)}</tr>`),`<tr><th colspan="3">${tr("الإجمالي")}</th><th class="num">${money(d.oGross)}</th></tr>`)}</div>`);
  await cuPdf(`${tr("تقرير الضريبة")} — ${esc(P.label)}`,blocks,`${tr("تقرير الضريبة")} ${P.key}.pdf`,"vat"); }
async function makeVatXls(P){ const d=vatData(P); const q=v=>{ const s=String(v??""); return /[",\n;]/.test(s)?`"${s.replace(/"/g,'""')}"`:s; };
  const L=[]; const row=(...a)=>L.push(a.map(q).join(","));
  row(tr("تقرير الضريبة"),P.label); row(tr("الفترة"),P.from,P.to); if(S.settings.trn) row("TRN",S.settings.trn); row("");
  row(tr("ضريبة المبيعات"),d.sVat); row(tr("ضريبة المشتريات"),d.pVat); row(d.due>=0?tr("المستحق للهيئة"):tr("المسترد من الهيئة"),Math.abs(d.due)); row("");
  row(tr("المبيعات (الفواتير الضريبية)")); row(tr("التاريخ"),tr("رقم الفاتورة"),tr("العميل"),tr("المشروع"),tr("المبلغ قبل الضريبة"),tr("الضريبة"),tr("الإجمالي"));
  d.sales.forEach(r=>row(r.date,r.no,r.to,r.site,r.net,r.vat,r.gross)); row(tr("الإجمالي"),"","","",d.sNet,d.sVat,d.sGross); row("");
  row(tr("المشتريات")); row(tr("التاريخ"),tr("المورد"),tr("رقم الفاتورة"),"TRN",tr("المبلغ قبل الضريبة"),tr("الضريبة"),tr("الإجمالي"),tr("ملاحظة"));
  d.pur.forEach(r=>row(r.date,r.supplier,r.invNo,r.trn,r.net,r.vat,r.gross,d.miss.includes(r)?tr("لم تُسجَّل الضريبة"):"")); row(tr("الإجمالي"),"","","",d.pNet,d.pVat,d.pGross); row("");
  row(tr("لا تدخل في الضريبة")); row(tr("التاريخ"),tr("المورد"),tr("السبب"),tr("المبلغ")); d.out.forEach(r=>row(r.date,r.supplier,tr(VAT_WHY[r.why]),r.gross)); row(tr("الإجمالي"),"","",d.oGross);
  if(!downloads) throw new Error(tr("الحفظ غير متاح في هذا العرض"));
  const blob=new Blob(["﻿"+L.join("\r\n")],{type:"text/csv;charset=utf-8"});
  await downloads.save({filename:`${tr("تقرير الضريبة")} ${P.key}.csv`.replace(/[\\/:*?"<>|]/g,"-"),data:blob}); S.lastPdf="vat"; }
app.addEventListener("change",e=>{ const t=e.target; if(t.dataset&&t.dataset.vatq){ S.vatQ=t.value; S.vatOpen=true; render(); } });
app.addEventListener("click",async e=>{ const b=e.target.closest("[data-act]"); if(!b) return; const a=b.dataset.act; if(!/^vat/.test(a)) return;
  const P=vatQuarters(6).find(q=>q.key===b.dataset.q);
  if(a==="vatopen"){ S.vatOpen=!S.vatOpen; return; }
  if(!P||!isAdmin()) return;
  if(a==="vatmiss"){ const ids=new Set(vatData(P).miss.map(r=>r.id)); S.cuF="all"; S.vatShow=ids; render(); const el=document.querySelector(".cuent"); el&&el.scrollIntoView({block:"start",behavior:"smooth"}); return; }
  if(a==="vat5"){ if(S.armed!=="vat5"){ S.armed="vat5"; setTimeout(()=>{ if(S.armed==="vat5"){ S.armed=null; render(); } },4000); render(); return; }
    S.armed=null; const miss=vatData(P).miss; miss.forEach(r=>{ const x=S.cu[r.id]; if(x){ x.vat=vat5(x.amount); cuPut(x,true); } }); toast("✓ "+tr("حُسبت ضريبة 5% لـ ")+miss.length+tr(" فاتورة")); render(); return; }
  if(a==="vatpdf"||a==="vatxls"){ if(S.busy) return; S.busy=true; b.classList.add("busy");
    try{ if(a==="vatpdf") await makeVatPdf(P); else await makeVatXls(P); }catch(err){ toast((err&&err.message)||tr("تعذر الحفظ")); }
    S.busy=false; render(); } });
