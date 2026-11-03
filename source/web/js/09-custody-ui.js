/* ---- UI ---- */
const cf=(x,k,l,t="text",extra="")=>`<label>${l}<input id="cu-${x.id}-${k}" data-cu="${x.id}.${k}" type="${t}" ${t==="number"?'inputmode="decimal" min="0"':""} value="${esc(x[k]??"")}" ${extra}></label>`;
const csel=(x,k,l,opts)=>`<label>${l}<select id="cu-${x.id}-${k}" data-cu="${x.id}.${k}">${opts.map(([v,t])=>`<option value="${esc(v)}" ${String(x[k]||"")===v?"selected":""}>${esc(t)}</option>`).join("")}</select></label>`;
function targetOpts(x){ const o=[["","— اختر —"],...activeSites().map(s=>[s.id,"🏗️ "+(s.name||"")]),...cuCars().map(c=>["car:"+c,"🚗 "+c]),["gen","🏢 عام (الشركة)"]];
  if(x.target&&!o.some(v=>v[0]===x.target)) o.splice(1,0,[x.target,cuTargetName(x)]); return o; }
function catOpts(){ return [["","— بدون بند —"],...cuCats().map(c=>[c.k,c.l])]; }
function cuThumb(x){ return x.fileId?(x.fileType==="image"?`<button class="invbtn" data-act="cuview" data-id="${x.id}" aria-label="فتح الصورة"><img class="inv" src="${blobUrl(x.fileId)}" alt="الصورة"><span>🔍 فتح</span></button>`:`<span class="chip">ملف PDF مرفق</span>`):""; }
function delBtn(x){ const k="cu"+x.id; return `<button class="ghost danger ${S.armed===k?"armed":""}" data-act="cudel" data-id="${x.id}">${S.armed===k?(x.purId?"تأكيد الحذف (ومن مشتريات الموقع)":"تأكيد الحذف"):"حذف"}</button>`; }
function cuCompact(x){
  const miss=isExp(x)?cuMissing(x):[], dup=isExp(x)&&cuDupOf(x), c=isExp(x)&&cuCat(x.cat);
  const title=x.kind==="dep"?tr("📥 توريد من المدير العام"):x.kind==="xfer"?(x.dir==="back"?tr("↩️ إرجاع من ")+(x.to||""):tr("↔️ تحويل إلى ")+(x.to||"")):x.kind==="spay"?tr("💳 سداد للمورد: ")+(x.supplier||""):cuName(x);
  const sub=isExp(x)?[cuTargetName(x),c&&c.l,holderOf(x)!=="main"?tr("عهدة ")+holderOf(x):""].filter(Boolean).join(" · "):(x.desc||"");
  return `<div class="entry cuent compact ${x.kind==="dep"?"dep":x.kind==="xfer"?"xfer":x.kind==="spay"?"spay":""} ${miss.length||dup?"miss":""} ${x.pay==="credit"?"cred":""}">
    <div class="full row" style="justify-content:space-between;flex-wrap:nowrap;gap:8px"><b style="min-width:0"><bdi>${esc(title)}</bdi></b><span class="num" style="white-space:nowrap"><b>${money(x.amount)}</b></span></div>
    <div class="full row" style="justify-content:space-between;gap:6px"><span class="small muted" style="min-width:0"><span class="num">${esc(x.date||"")}</span>${sub?" · "+esc(sub):""}</span>
      <span class="row" style="gap:4px">${miss.length?`<span class="chip bad">${tr("ناقصة")}</span>`:""}${dup?`<span class="chip bad">${tr("مكررة؟")}</span>`:""}${isExp(x)?`<span class="chip ${x.pay==="credit"?"ex":"done"}">${payLbl(x)}</span>`:""}${needsXfer(x)?`<span class="chip ex">${tr("لم تُحوَّل")}</span>`:""}<button class="ghost small" data-act="cuedit" data-id="${x.id}">✏️ تعديل</button></span></div></div>`;
}
const okBtn=x=>`<span class="chip bad cunsaved" ${cuOrig[x.id]?"":"hidden"}>${tr("✏️ لم يُحفظ — اضغط ✓ موافق")}</span><button class="primary" data-act="cuok2" data-id="${x.id}">✓ موافق</button><button class="ghost cucx" data-act="cucancel" data-id="${x.id}" ${cuOrig[x.id]||S.cuEdit===x.id?"":"hidden"}>${tr("إلغاء التعديل")}</button>`;
function cuCard(x){
  if(x.ok&&S.cuEdit!==x.id) return cuCompact(x);
  if(x.kind==="xfer"){ const back=x.dir==="back"; const invs=(x.inv||[]).map(i=>S.cu[i]).filter(Boolean);
    return `<div class="entry cuent xfer">
    <div class="full row" style="justify-content:space-between"><b>${back?"↩️ إرجاع إلى العهدة الرئيسية من":"↔️ تحويل من العهدة الرئيسية إلى"} <bdi class="u">${esc(x.to||"…")}</bdi></b><span class="num"><b>${money(x.amount)}</b> درهم</span></div>
    ${invs.length?`<div class="full small muted">مقابل: ${invs.map(i=>`<bdi class="u">${esc(cuName(i))}</bdi> <span class="num">${money(i.amount)}</span>`).join(" · ")}</div>`:""}
    ${csel(x,"to","الشخص",[["","— اختر —"],...[...new Set([...holders(),...users().map(u=>u.name)])].filter(v=>v!==mainHolder()||x.to===v).map(v=>[v,v])])}${cf(x,"amount","المبلغ (درهم)","number")}
    ${cf(x,"date","التاريخ","date")}${cf(x,"desc","ملاحظة")}
    <div class="full row">${cuThumb(x)}<button data-act="cufile" data-id="${x.id}">${x.fileId?"تغيير الإثبات":"إرفاق إشعار التحويل"}</button>${okBtn(x)}${delBtn(x)}</div></div>`; }
  if(x.kind==="dep") return `<div class="entry cuent dep">
    <div class="full row" style="justify-content:space-between"><b>📥 توريد من المدير العام</b><span class="num"><b>${money(x.amount)}</b> درهم</span></div>
    ${cf(x,"date","التاريخ","date")}${cf(x,"amount","المبلغ (درهم)","number")}
    <div class="full">${cf(x,"desc","ملاحظة","text",'placeholder="مثال: تحويل من المدير العام"')}</div>
    <div class="full row">${cuThumb(x)}${x.reading?`<span class="chip ex">جارٍ قراءة الإشعار…</span>`:okBtn(x)}${delBtn(x)}</div></div>`;
  if(x.kind==="spay") return `<div class="entry cuent spay">
    <div class="full row" style="justify-content:space-between"><b>💳 سداد للمورد: ${esc(x.supplier||"")}</b><span class="num"><b>${money(x.amount)}</b> درهم</span></div>
    ${csel(x,"method","طريقة السداد",Object.entries(PAYM))}${cf(x,"amount","المبلغ (درهم)","number")}
    ${cf(x,"date","التاريخ","date")}${cf(x,"desc","ملاحظة / رقم الشيك")}
    <div class="full row">${cuThumb(x)}<button data-act="cufile" data-id="${x.id}">${x.fileId?"تغيير الإثبات":"إرفاق صورة الشيك / التحويل"}</button>${okBtn(x)}${delBtn(x)}</div></div>`;
  const miss=cuMissing(x); const c=cuCat(x.cat); const dup=cuDupOf(x);
  return `<div class="entry cuent ${miss.length||dup?"miss":""} ${x.pay==="credit"?"cred":""}">
    <div class="full row" style="justify-content:space-between"><span><b><bdi>${esc(cuName(x))}</bdi></b> · <span class="num">${money(x.amount)}</span> درهم</span>
      <span class="row" style="gap:4px">${x.reading?`<span class="chip ex">جارٍ القراءة…</span>`:""}${miss.length?`<span class="chip bad">ناقصة: ${miss.map(m=>tr(m)).join("، ")}</span>`:""}<span class="chip ${x.pay==="credit"?"ex":"done"}">${payLbl(x)}</span></span></div>
    <div class="full small muted">${esc(cuTargetName(x))}${x.autoCar&&x.target==="car:"+x.autoCar?" ("+tr("من رقم اللوحة")+")":""}${c?" · "+esc(c.l):""}${x.by?` · صوّرها: <b>${esc(x.by)}</b>`:""}${x.plate&&!String(x.target||"").startsWith("car:")?` · 🚗 لوحة <bdi dir="ltr">${esc(x.plate)}</bdi> غير مسجّلة في السيارات`:""}</div>
    ${dup?`<div class="full notice small dupbox"><b>⚠️ قد تكون مكررة</b><span>تشبه فاتورة <bdi class="u">${esc(dup.supplier||"")}</bdi> بمبلغ <span class="num">${money(dup.amount)}</span> بتاريخ <span class="num">${esc(dup.date||"")}</span>${dup.by?" — "+tr("صوّرها: ")+esc(dup.by):""}.</span><div class="row">${delBtn(x)}<button class="ghost" data-act="cudupok" data-id="${x.id}">ليست مكررة</button></div></div>`:""}
    ${csel(x,"target","على حساب",targetOpts(x))}${csel(x,"cat","البند",catOpts())}
    ${cf(x,"supplier","المورد")}${csel(x,"pay","الدفع",[["cash","💵 نقداً (من العهدة)"],["credit","🤝 آجل (على حساب المورد)"],["gm","🏦 تحويل مباشر من المدير العام (لا يُخصم من العهدة)"]])}
    ${cf(x,"amount","المبلغ شامل الضريبة (درهم)","number")}${cf(x,"date","التاريخ","date")}
    ${cf(x,"invNo","رقم الفاتورة","text",'dir="ltr"')}${cf(x,"desc","البيان")}
    ${x.pay!=="credit"&&x.pay!=="gm"&&(holders().length||holderOf(x)!=="main")?csel(x,"holder","دُفعت من",[["main","💼 العهدة الرئيسية"],...holders().map(h=>[h,"🧾 "+tr("عهدة ")+h])]):""}
    ${needsXfer(x)?`<div class="full notice small xferbox"><b>⏳ لم تُحوَّل قيمتها إلى <bdi class="u">${esc(holderOf(x))}</bdi> بعد</b><button class="primary" data-act="cuxinv" data-id="${x.id}">↔️ تم تحويل <span class="num">${money(x.amount)}</span> إلى <bdi class="u">${esc(holderOf(x))}</bdi></button></div>`:""}
    ${x.xferId&&S.cu[x.xferId]?`<div class="full small" style="color:var(--ok)">✓ حُوِّلت قيمتها إلى <bdi class="u">${esc(holderOf(x))}</bdi> بتاريخ <span class="num">${esc(S.cu[x.xferId].date||"")}</span></div>`:""}
    <div class="full row">${cuThumb(x)}${x.fileId&&x.fileType==="image"&&!x.reading&&(!n(x.amount)||!x.supplier)?`<button class="primary" data-act="cureread" data-id="${x.id}">🔄 قراءة الفاتورة</button>`:""}${miss.includes("الموقع")&&!x.reading?`<button data-act="cupickopen" data-id="${x.id}">📍 اختر الموقع</button>`:""}${x.reading?"":okBtn(x)}${delBtn(x)}</div></div>`;
}
function cuPickHtml(){
  const x=S.cu[S.cuPick]; if(!x){ S.cuPick=null; return ""; }
  if(x.reading&&S.cuPickNow!==x.id) return `<div class="sheet cusheet" role="dialog" aria-label="جارٍ القراءة"><div class="readwait"><div class="spin" aria-hidden="true"></div><h3>⏳ جارٍ قراءة الفاتورة…</h3>
    <p class="small muted" style="margin:0">إذا كانت فاتورة وقود عليها رقم لوحة مسجّل، تُسجَّل على السيارة تلقائياً.</p>
    <button class="ghost small" data-act="cupicknow">اختر الموقع يدوياً الآن</button></div></div>`;
  const c=cuCat(x.cat); const carFirst=c&&c.t==="car";
  const sites=activeSites().sort((a,b)=>(a.id===S.cuPre?-1:b.id===S.cuPre?1:0));
  const siteBtns=`<div class="cupk">${sites.map(s=>`<button class="pkbtn ${s.id===S.cuPre?"star":""}" data-act="cupick" data-t="${esc(s.id)}">🏗️ <bdi class="u">${esc(s.name||"")}</bdi></button>`).join("")}</div>`;
  const carBtns=`<h4>🚗 السيارات</h4><div class="cupk">${carList().map(c=>`<button class="pkbtn car" data-act="cupick" data-t="car:${esc(c.n)}"><bdi class="u">${esc(c.n)}</bdi>${c.pl?`<small class="pl">${esc(c.pl)}</small>`:""}</button>`).join("")}</div>`;
  return `<div class="sheet cusheet" role="dialog" aria-label="على حساب أيّ موقع؟">
   <div class="row" style="justify-content:space-between"><h3>${x.reading?"⏳ جارٍ قراءة الفاتورة…":`✓ ${esc(x.supplier||tr("تمت القراءة"))}${n(x.amount)?` · <span class="num">${money(x.amount)}</span>`:""}`}</h3><button class="ghost" data-act="cupickx" aria-label="لاحقاً">لاحقاً</button></div>
   <h3 style="margin:4px 0 8px">على حساب أيّ موقع؟</h3>
   ${carFirst?carBtns+`<h4>🏗️ المواقع</h4>`+siteBtns:siteBtns+carBtns}
   <div class="cupk"><button class="pkbtn gen" data-act="cupick" data-t="gen">🏢 عام (الشركة)</button></div></div>`;
}
function salaryBanner(){ if(!isAdmin()||!S.cuLoaded) return ""; const k=salaryDue(); if(!k) return "";
  return `<div class="panel salbox"><div class="row" style="justify-content:space-between;align-items:center"><span><b>👔 ${tr("تذكير: مرتبات")} ${esc(monthName(k))}</b><br><span class="small muted">${tr("لم تُسجَّل بعد في العهدة.")}</span></span>
    <button class="primary" data-act="cusalary" data-m="${k}">✍️ ${tr("سجّل المرتبات")}</button></div></div>`; }
function cuHome(){
  const c=cuCalc();
  return salaryBanner()+`<button class="cuhome" data-act="cuopen"><span class="qic">💼</span><span class="cuh-t"><b>العهدة والموردون</b><span class="small muted">${c.isLow?`<span class="chip bad">⚠️ رصيد العهدة منخفض</span> `:""}${c.miss?`<span class="chip bad">🔎 <span class="num">${c.miss}</span> للمراجعة</span>`:c.isLow?"":tr("الفواتير والتوريدات وحسابات الموردين")}</span></span>
    <span class="cuh-n"><span class="small muted">رصيد العهدة</span><b class="num">${money(c.mainBal)}</b>${c.owed>0?`<span class="small muted">للموردين <b class="num">${money(c.owed)}</b></span>`:""}</span></button>`;
}
function meBox(){ return !cuMe?`<div class="panel notice"><b>اكتب اسمك مرة واحدة</b><span class="small">ليظهر من صوّر كل فاتورة.</span><label>اسمك<input id="cu-me" data-cume="1" value="" placeholder="مثال: أحمد"></label></div>`:""; }
function pdfNotice(tag){ return S.lastPdf===tag?`<div class="notice small"><b>${window.__ios?"✓ الملف جاهز.":"✓ تم حفظ الملف في التنزيلات."}</b> أرسله بزر «مشاركة»، أو من الواتساب: 📎 ثم «مستند».</div>${window.__lastFile?`<div class="row">${navigator.canShare?`<button class="primary big" data-act="sharefile">📤 مشاركة (واتساب…)</button>`:""}<button class="big" data-act="dlagain">${window.__ios?"📥 حفظ في الملفات / فتح":"⬇️ تحميل مرة أخرى"}</button></div>`:""}`:""; }
function buyerView(){
  const mine=Object.values(S.cu).filter(x=>isExp(x)&&(!cuMe||x.by===cuMe)).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).slice(0,12);
  return `<div class="top"><div class="brand"><span class="eyebrow u">${esc(coName())}</span><h1>🧾 فواتير المشتريات</h1></div><div class="row">${userChip()}<button class="lang ghost" data-act="lang"><bdi class="u">${lang==="en"?"عربي":"English"}</bdi></button></div></div>
  ${meBox()}
  ${subDefault(cuMe)?(()=>{ const bal=holderBal(cuMe); return `<div class="stat" style="text-align:center;margin-top:8px"><span class="small muted">${bal<0?tr("مستحق لك (لم يُحوَّل بعد)"):tr("رصيد عهدتك")}</span><b class="num" style="font-size:1.4rem;${bal<0?"color:var(--bad)":""}">${money(Math.abs(bal))}</b> <span class="small">درهم</span></div>`; })():""}
  <button class="primary buybig" data-act="cuscan" data-cam="1"><span>📷</span><b>صوّر الفاتورة</b></button>
  <div class="row" style="justify-content:center"><button class="ghost" data-act="cuscan">🖼️ من المعرض</button></div>
  <h2 style="margin-top:14px">آخر فواتيري</h2>
  ${mine.length?`<div class="list">${mine.map(x=>{ const miss=cuMissing(x); return `<div class="entry buyrow"><div class="full row" style="justify-content:space-between"><span><b><bdi>${esc(cuName(x))}</bdi></b> · <span class="num">${money(x.amount)}</span></span>${x.reading?`<span class="chip ex">جارٍ القراءة…</span>`:miss.length?`<span class="chip bad">ناقصة</span>`:`<span class="chip done">✓</span>`}</div>
    <div class="full small muted">${esc(cuTargetName(x))} · <span class="num">${esc(x.date||"")}</span>${!x.target?` · <button class="ghost small" data-act="cupickopen" data-id="${x.id}">اختر الموقع</button>`:""}</div></div>`; }).join("")}</div>`:`<div class="empty">لم تصوّر فواتير بعد.</div>`}`;
}
function cuView(){
  const c=cuCalc(); const last=cuLast(); const all=Object.values(S.cu).filter(x=>inPeriod(x,last,null)).sort((a,b)=>(b.date||"").localeCompare(a.date||"")||(b.createdAt||0)-(a.createdAt||0));
  const pc=periodCalc(all,last?n(last.bal):0); const HS=holders();
  if(S.cuH&&S.cuH!=="main"&&!HS.includes(S.cuH)) S.cuH=null;
  const F=[["all","الكل",x=>x.kind!=="spay"],["miss","للمراجعة",x=>needsReview(x)],["credit","آجل",x=>isExp(x)&&x.pay==="credit"],["dep","التوريدات",x=>x.kind==="dep"],["sup","الموردون",null]];
  const cur=F.find(f=>f[0]===S.cuF)||F[0];
  let body;
  if(cur[0]==="sup") body=supView();
  else { const list=all.filter(cur[2]).filter(x=>!S.cuH||delta(x,S.cuH)!==0||(isExp(x)&&holderOf(x)===S.cuH)); body=list.length?`<div class="list">${list.map(cuCard).join("")}</div>`:`<div class="empty">${cur[0]==="miss"?"لا توجد فواتير تحتاج مراجعة. ✓":"لا يوجد شيء هنا بعد في الفترة الحالية."}</div>`; }
  return header("💼 العهدة والموردون") + meBox() + salaryBanner() + `
  <div class="panel"><div class="mini cumini">
    <div class="hl"><span class="small">${HS.length?"رصيد العهدة الرئيسية":"رصيد العهدة"}</span><b class="num">${money(c.mainBal)}</b></div>
    <div><span class="muted small">التوريدات${last?" (الفترة)":""}</span><b class="num">${money(pc.dep)}</b></div>
    <div><span class="muted small">المصروف النقدي${last?" (الفترة)":""}</span><b class="num">${money(pc.cash+pc.spCash)}</b></div>
    <div ${c.owed>0?'class="warn" data-act="cufilter" data-k="sup" role="button"':""}><span class="small">مستحق للموردين (آجل)</span><b class="num">${money(c.owed)}</b></div></div>
    ${last?`<p class="small muted" style="margin:8px 0 0">الرصيد المُرحَّل من إقفال <span class="num">${esc(last.date)}</span>: <b class="num">${money(last.bal)}</b> درهم</p>`:""}
    ${c.isLow?`<div class="notice small lowbox" style="margin-top:8px"><b>⚠️ ${c.mainBal<0?"رصيد العهدة بالسالب":"رصيد العهدة منخفض"}: <span class="num">${money(c.mainBal)}</span> درهم</b><span>الحد الأدنى المحدد <span class="num">${money(c.low)}</span> درهم. يحتاج توريداً جديداً من المدير العام.</span>
      <a class="btn primary" href="${esc(cuWa(S.settings.cuOwnerPhone,lowMsg(c)))}" target="_blank" rel="noopener">📲 أبلغ المدير العام على واتساب</a></div>`:""}</div>
  <div class="qgrid cuq">
    <button class="qbtn" data-act="cuscan" data-cam="1"><span class="qic">📷</span><b>صوّر فاتورة</b><span class="small muted">ثم اختر الموقع</span></button>
    <button class="qbtn" data-act="cuscan"><span class="qic">🖼️</span><b>فاتورة من المعرض</b><span class="small muted">صورة أو PDF</span></button>
    <button class="qbtn" data-act="cumanual"><span class="qic">✍️</span><b>مصروف بدون فاتورة</b><span class="small muted">مثل المرتبات</span></button>
    <button class="qbtn" data-act="cudep"><span class="qic">📥</span><b>إشعار توريد</b><span class="small muted">صورة إشعار التحويل فقط</span></button>
    <button class="qbtn ${S.busy==="cust"?"busy":""}" data-act="cupdf"><span class="qic">📄</span><b>${S.busy==="cust"?"جارٍ التجهيز…":"كشف العهدة"}</b><span class="small muted">PDF للمدير العام</span></button></div>
  ${pdfNotice("cust")}
  ${HS.length?`<div class="panel"><h2>العُهد</h2><div class="holders">${["main",...HS].map(h=>{ const bal=holderBal(h), owe=h!=="main"&&bal<0; const pend=Object.values(S.cu).filter(x=>needsXfer(x)&&holderOf(x)===h);
      return `<div class="hold ${S.cuH===h?"on":""}"><button class="holdbtn" data-act="cuhold" data-h="${esc(h)}"><span>${esc(hName(h))}</span><b class="num ${owe?"neg":""}">${money(owe?-bal:bal)}</b><span class="small muted">${owe?tr("مستحق له"):tr("الرصيد")}</span></button>
      ${pend.length?`<button class="primary" data-act="cuxall" data-h="${esc(h)}">↔️ حوّلت له كل المستحق (<span class="num">${pend.length}</span> ${tr("فاتورة")})</button>`:""}</div>`; }).join("")}</div>
    ${S.cuH?`<p class="small" style="margin:0">عرض حركات: <b>${esc(hName(S.cuH))}</b> <button class="ghost xs" data-act="cuhold" data-h="">✕ إلغاء التصفية</button></p>`:""}
    <div class="row"><button data-act="cuxfer">↔️ تحويل من الرئيسية إلى عهدة شخص</button></div></div>`:`<div class="row"><button class="ghost" data-act="cuxfer">↔️ تحويل من الرئيسية إلى عهدة شخص</button></div>`}
  <div class="tabs" role="tablist">${F.map(([k,l,fn])=>`<button role="tab" aria-selected="${cur[0]===k}" data-act="cufilter" data-k="${k}">${l}${fn?` <span class="num">${all.filter(fn).length}</span>`:""}</button>`).join("")}</div>
  ${body}
  ${closePanel()}
  ${cuSettings()}
  ${rangeSheet()}
  ${S.cuView?(()=>{ const x=S.cu[S.cuView]; return x&&x.fileId?`<div class="sheet cuviewer" role="dialog" aria-label="الصورة"><div class="row" style="justify-content:space-between"><b>${esc(x.supplier||"")}</b><button class="ghost" data-act="cuviewx" aria-label="إغلاق">✕</button></div><div class="cuimg"><img src="${blobUrl(x.fileId)}" alt="الصورة"></div></div>`:""; })():""}`;
}
function supView(){
  const sups=cuSuppliers();
  if(S.cuSup){ const s=sups.find(x=>x.key===S.cuSup); if(s){
    const rows=[...s.inv.map(x=>({d:x.date,x,t:"inv"})),...s.pay.map(x=>({d:x.date,x,t:"pay"}))].sort((a,b)=>(b.d||"").localeCompare(a.d||""));
    return `<div class="panel"><div class="row" style="justify-content:space-between"><h2>🤝 <bdi class="u">${esc(s.name)}</bdi></h2><button class="ghost" data-act="cusupx">→ كل الموردين</button></div>
      <div class="mini cumini"><div><span class="muted small">فواتير آجلة (<span class="num">${s.inv.length}</span>)</span><b class="num">${money(s.invSum)}</b></div><div><span class="muted small">المسدّد</span><b class="num">${money(s.paySum)}</b></div><div class="hl"><span class="small">الرصيد المستحق</span><b class="num">${money(s.bal)}</b></div></div>
      <div class="row" style="margin-top:10px"><button class="primary" data-act="cuspay" data-k="${esc(s.key)}">💳 تسجيل سداد</button><button class="${S.busy==="sup"?"busy":""}" data-act="cusuppdf" data-k="${esc(s.key)}">📄 كشف حساب المورد</button></div>${pdfNotice("sup")}</div>
      ${rows.length?`<div class="list">${rows.map(r=>r.t==="pay"?cuCard(r.x):`<div class="entry cuent cred"><div class="full row" style="justify-content:space-between"><span><span class="num">${esc(r.x.date||"")}</span> · ${esc(cuTargetName(r.x))}</span><b class="num">${money(r.x.amount)}</b></div><div class="full small muted">${esc(r.x.desc||"")}</div><div class="full row">${cuThumb(r.x)}</div></div>`).join("")}</div>`:`<div class="empty">لا توجد حركات لهذا المورد بعد.</div>`}`; } S.cuSup=null; }
  return `<div class="list">${sups.map(s=>`<button class="entry supbtn" data-act="cusup" data-k="${esc(s.key)}"><span class="row" style="justify-content:space-between;width:100%"><b>🤝 <bdi class="u">${esc(s.name)}</bdi></b><span>المستحق <b class="num">${money(s.bal)}</b></span></span><span class="small muted">فواتير <span class="num">${s.inv.length}</span> · مسدّد <span class="num">${money(s.paySum)}</span></span></button>`).join("")}</div>
   <p class="small muted">أي فاتورة من مورد في هذه القائمة تُحسب «آجل» تلقائياً. تعدّل القائمة من «إعدادات العهدة».</p>`;
}
function cuSettings(){
  const ownCats=S.settings.cuCatsX||[];
  return `<details class="panel" ${S.cuSetOpen?"open":""}><summary style="cursor:pointer;font-weight:600" data-act="cusetopen">⚙️ إعدادات العهدة</summary>
   <h3>🚗 السيارات</h3><p class="small muted" style="margin:0">اكتب رقم اللوحة ليتعرّف البرنامج على السيارة تلقائياً من فاتورة الوقود.</p>
   <div class="list">${carList().map((c,i)=>`<div class="row" style="gap:6px;flex-wrap:nowrap"><input id="cu-car-${i}" data-cucar="${i}.n" value="${esc(c.n)}" style="flex:1;min-width:0" aria-label="اسم السيارة"><input id="cu-carpl-${i}" data-cucar="${i}.pl" value="${esc(c.pl)}" dir="ltr" placeholder="رقم اللوحة" style="width:120px" aria-label="رقم اللوحة"><button class="ghost xs" data-act="culistdel" data-l="cuCars" data-i="${i}" aria-label="حذف">✕</button></div>`).join("")}</div>
   <div class="row" style="flex-wrap:nowrap"><input id="cu-newcar" placeholder="اسم السيارة" style="flex:1;min-width:0"><input id="cu-newplate" placeholder="رقم اللوحة" dir="ltr" style="width:120px"><button data-act="culistadd" data-l="cuCars" data-in="cu-newcar">+ إضافة</button></div>
   <h3>💼 العهدة الرئيسية</h3><label>العهدة الرئيسية عند<select id="cu-mainh" data-set="cuMainHolder">${users().map(u=>`<option value="${esc(u.id)}" ${mainHolderId()===u.id?"selected":""}>${esc(u.name)}</option>`).join("")}</select></label>
   <p class="small muted" style="margin:0">فواتير حامل العهدة الرئيسية تُخصم منها مباشرة، ولا تُعامل كعهدة خاصة.</p>
   <h3>⚠️ تنبيه الرصيد</h3><div class="grid2"><label>نبّهني إذا قلّ الرصيد عن (درهم)<input id="cu-low" data-set="cuLow" type="number" inputmode="decimal" value="${esc(S.settings.cuLow??1000)}"></label>
   <label>واتساب المدير العام<input id="cu-ownph" data-set="cuOwnerPhone" dir="ltr" inputmode="tel" placeholder="9715xxxxxxxx" value="${esc(S.settings.cuOwnerPhone||"")}"></label></div>
   <h3>🤝 الموردون بالآجل</h3><div class="row">${cuCredit().map((c,i)=>`<span class="chip">${esc(c)} <button class="ghost xs" data-act="culistdel" data-l="cuCredit" data-i="${i}" aria-label="حذف">✕</button></span>`).join("")}</div>
   <div class="row"><input id="cu-newsup" placeholder="اسم المورد" style="flex:1"><button data-act="culistadd" data-l="cuCredit" data-in="cu-newsup">+ إضافة</button></div>
   <h3>🏷️ البنود</h3>
   ${Object.entries(CTYPE).map(([t,tl])=>`<p class="small muted" style="margin:6px 0 2px"><b>${tl}</b></p><div class="grid2">${cuCats().filter(c=>c.t===t).map(c=>`<div class="row" style="gap:4px;flex-wrap:nowrap"><input data-cucat="${esc(c.k)}" value="${esc(c.l)}" style="flex:1"><button class="ghost xs" data-act="cucatdel" data-k="${esc(c.k)}" aria-label="حذف">✕</button></div>`).join("")}</div>`).join("")}
   <div class="row"><input id="cu-newcat" placeholder="بند جديد" style="flex:1"><select id="cu-newcatt">${Object.entries(CTYPE).map(([t,l])=>`<option value="${t}">${l}</option>`).join("")}</select><button data-act="cucatadd">+ إضافة</button></div>
   ${(S.settings.cuCatHide||[]).length?`<button class="ghost small" data-act="cucatreset">إظهار البنود المحذوفة</button>`:""}</details>`;
}

function buzzOk(){ try{ navigator.vibrate&&navigator.vibrate([60,40,60]); }catch(e){} }
function cuWa(phone,text){ const d=String(phone||"").replace(/\D/g,"").replace(/^00/,""); return `https://wa.me/${d}?text=${encodeURIComponent(text)}`; }
function lowMsg(c){ return [tr("💼 تنبيه العهدة"),tr("رصيد العهدة الحالي: ")+money(c.mainBal)+" "+tr("درهم"),tr("الحد الأدنى: ")+money(c.low)+" "+tr("درهم"),tr("نحتاج توريداً جديداً، من فضلك."),cuMe?"— "+cuMe:""].filter(Boolean).join("\n"); }
function rangeSheet(){ const r=S.cuRange; if(!r) return "";
  const now=new Date(), first=new Date(now.getFullYear(),now.getMonth(),1), pf=new Date(now.getFullYear(),now.getMonth()-1,1), pl=new Date(now.getFullYear(),now.getMonth(),0);
  const last=cuLast(); const opt=(lbl,sub,f,t,extra="")=>`<button class="repbtn" data-act="curangego" data-f="${f}" data-t="${t}" ${extra}><span class="qic">📅</span><span><b>${lbl}</b><br><span class="small muted">${sub}</span></span></button>`;
  return `<div class="sheet" role="dialog" aria-label="فترة الكشف"><div class="row" style="justify-content:space-between"><h3>📄 ${r.k==="sup"?"كشف المورد":"كشف العهدة"}: اختر الفترة</h3><button class="ghost" data-act="curangex" aria-label="إغلاق">✕</button></div>
   <div class="replist">${opt(tr("هذا الشهر"),`${fmtD(ldate(first))} — ${fmtD(ldate(now))}`,ldate(first),ldate(now))}${opt(tr("الشهر الماضي"),`${fmtD(ldate(pf))} — ${fmtD(ldate(pl))}`,ldate(pf),ldate(pl))}
   ${r.k==="cust"?`<button class="repbtn" data-act="curangego" data-cur="1"><span class="qic">🔒</span><span><b>الفترة الحالية</b><br><span class="small muted">${last?tr("منذ إقفال ")+fmtD(last.date):tr("كل الحركات حتى اليوم")}</span></span></button>`:`<button class="repbtn" data-act="curangego" data-cur="1"><span class="qic">🗂️</span><span><b>كل الحركات</b><br><span class="small muted">من البداية حتى اليوم</span></span></button>`}</div>
   ${r.k==="cust"&&holders().length?`<label style="margin-top:8px">العهدة<select id="cu-rh">${[["all","كل العُهد (الكشف الشامل)"],["main",tr("💼 العهدة الرئيسية")],...holders().map(h=>[h,"🧾 "+tr("عهدة ")+h])].map(([v,l])=>`<option value="${esc(v)}" ${S.cuRangeH===v?"selected":""}>${esc(l)}</option>`).join("")}</select></label>`:""}
   <h4 style="margin:12px 0 6px">أو اختر التاريخين بنفسك</h4>
   <div class="grid2"><label>من تاريخ<input type="date" id="cu-rfrom" value="${esc(r.from||ldate(first))}"></label><label>إلى تاريخ<input type="date" id="cu-rto" value="${esc(r.to||ldate(now))}"></label></div>
   <button class="primary big" data-act="curangego" data-custom="1">إنشاء الكشف</button></div>`; }
function closePanel(){
  const cl=cuCloses(), last=cl[cl.length-1], cur=Object.values(S.cu).filter(x=>inPeriod(x,last,null)), rev=cur.filter(needsReview).length, k="cuclose";
  return `<div class="panel"><h2>🔒 الإقفال الشهري</h2>
   <p class="small muted" style="margin:0">الفترة الحالية ${last?`بدأت بعد إقفال <span class="num">${esc(last.date)}</span>`:"من البداية"} · <span class="num">${cur.length}</span> حركة. عند الإقفال تُحفظ الفترة في كشف خاص، ويُرحَّل الرصيد إلى الفترة الجديدة.</p>
   ${rev?`<p class="small" style="margin:0;color:var(--bad)">⚠️ في الفترة <span class="num">${rev}</span> فاتورة للمراجعة. يُفضّل مراجعتها قبل الإقفال.</p>`:""}
   <div class="row"><button class="${S.armed===k?"danger armed":""}" data-act="cuclose" ${cur.length?"":"disabled"}>${S.armed===k?"اضغط مرة أخرى لتأكيد الإقفال":"🔒 إقفال الفترة الحالية"}</button></div>
   ${cl.length?`<div class="list">${cl.slice().reverse().map((x,ix)=>`<div class="entry"><div class="full row" style="justify-content:space-between"><b>🔒 إقفال <span class="num">${esc(x.date)}</span></b><span class="small">الرصيد المُرحَّل <b class="num">${money(x.bal)}</b></span></div>
     <div class="full small muted">توريدات <span class="num">${money(x.dep)}</span> · مصروف نقدي <span class="num">${money(x.cash)}</span> · <span class="num">${x.count||0}</span> حركة${x.by?" · "+esc(x.by):""}</div>
     <div class="full row"><button data-act="cupdfc" data-id="${x.id}">📄 كشف الفترة</button>${ix===0?`<button class="ghost danger ${S.armed==="cuun"+x.id?"armed":""}" data-act="cuunclose" data-id="${x.id}">${S.armed==="cuun"+x.id?"تأكيد إلغاء الإقفال":"↩️ إلغاء الإقفال"}</button>`:""}</div></div>`).join("")}</div>`:""}</div>`;
}
function cuPurRow(p){ const c=cuCat(p.cat); return `<div class="entry cuent ${p.pay==="credit"?"cred":""}"><div class="full row" style="justify-content:space-between"><span><b><bdi>${esc(p.supplier||tr("فاتورة"))}</bdi></b> · <span class="num">${money(p.amount)}</span> درهم</span><span class="chip ${p.pay==="credit"?"ex":"done"}">${p.pay==="credit"?"آجل":"نقداً"}</span></div>
  <div class="full small muted"><span class="num">${esc(p.date||"")}</span>${c?" · "+esc(c.l):""}${p.desc?" · "+esc(p.desc):""}</div>
  <div class="full row">${p.fileId&&p.fileType==="image"?`<button class="invbtn" data-act="viewdoc" data-k="pur" data-id="${p.id}" aria-label="فتح الفاتورة للمراجعة"><img class="inv" src="${blobUrl(p.fileId)}" alt="الفاتورة"><span>🔍 فتح للمراجعة</span></button>`:""}<button class="ghost" data-act="cuopen">✏️ التعديل من صفحة العهدة</button></div></div>`; }
