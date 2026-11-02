/* ---------- views ---------- */
/* date fields: show dd/mm/yyyy ourselves (Android shows Arabic-locale dates scrambled) */
const fmtDate=v=>{ const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(v||""); return m?`${m[3]}/${m[2]}/${m[1]}`:"—"; };
function dateShow(i){ if(i.parentNode&&i.parentNode.classList&&i.parentNode.classList.contains("dwrap")){ i.nextSibling.textContent=fmtDate(i.value); return; }
  const w=document.createElement("span"); w.className="dwrap"; i.parentNode.insertBefore(w,i); w.appendChild(i); const d=document.createElement("span"); d.className="dshow"; d.textContent=fmtDate(i.value); w.appendChild(d); }
document.addEventListener("input",e=>{ const t=e.target; if(t&&t.type==="date"&&t.nextSibling&&t.nextSibling.className==="dshow") t.nextSibling.textContent=fmtDate(t.value); },true);
function render(){
  document.documentElement.dir = lang==="en"?"ltr":"rtl"; document.documentElement.lang = lang;
  if(S.mode==="loading"||!S.setLoaded){ app.innerHTML=`<div class="empty">جارٍ التحميل…</div>`; translate(app); return; }
  if(!S.user){ app.innerHTML=loginView(); translate(app); return; }
  if(S.user.mustChange||S.pinView){ const keep=["au-new1","au-new2"].map(k=>(document.getElementById(k)||{}).value||""); app.innerHTML=pinChangeView(); translate(app); ["au-new1","au-new2"].forEach((k,i)=>{ const el=document.getElementById(k); if(el&&keep[i]) el.value=keep[i]; }); return; }
  const pw=document.getElementById("planWrap"); const sc=pw?[pw.scrollLeft,pw.scrollTop]:null; const wy=window.scrollY;
  if(isBuyer()){ S.view="buyer"; app.innerHTML = buyerView(); }
  else if(S.view==="site" && site()){ attachMarks(site()); app.innerHTML = siteView(site()); }
  else if(S.view==="cust" && isAdmin()){ app.innerHTML = cuView(); }
  else { S.view="list"; app.innerHTML = listView(); }
  if(S.cuPick) app.insertAdjacentHTML("beforeend", cuPickHtml());
  app.classList.toggle("has-sheet", !!(S.view==="site"&&S.tab==="plan"&&S.sel));
  if(S.canWrite===false||S.canFiles===false){ const nb=document.createElement("div"); nb.className="notice small ro"; nb.innerHTML=S.canWrite===false?`<b>👁️ صلاحيتك على هذه الصفحة «مشاهدة فقط».</b> لا يُحفظ أي تعديل تقوم به. اطلب من المالك أن يغيّر صلاحيتك إلى «مساهم» لتسجيل البيانات، أو «محرر» لرفع الصور أيضاً.`:`<b>📷 صلاحيتك لا تسمح برفع الصور.</b> تستطيع تسجيل البيانات، أما رفع الصور والفواتير فيحتاج صلاحية «محرر» من المالك.`; app.insertBefore(nb,app.children[1]||null); }
  if(S.view==="site") app.querySelectorAll(".panel").forEach(pn=>{ if(pn.querySelector(".savebar")||!pn.querySelector('input:not([type=checkbox]):not([type=file]):not([type=radio]),textarea')) return;
    pn.insertAdjacentHTML("beforeend",`<div class="row savebar"><button type="button" class="primary savenow" data-act="savenow">💾 حفظ</button></div>`); });
  if(S.view==="site") setTimeout(markUnsaved,0);
  translate(app);
  app.querySelectorAll('input:not([type]),input[type="text"],textarea').forEach(i=>{ if(!i.hasAttribute("dir")) i.dir="auto"; });
  app.querySelectorAll('input[type="date"]').forEach(dateShow);
  if(S.needSave){ const ns=S.needSave; S.needSave=null; save(ns); }
  const pw2=document.getElementById("planWrap"); if(pw2&&sc){ pw2.scrollLeft=sc[0]; pw2.scrollTop=sc[1]; window.scrollTo(0,wy); }
}
function header(sub){
  return `<div class="top"><div class="brand"><span class="eyebrow u">${esc(coName())}</span><h1>${sub}</h1></div>
  <div class="row">${userChip()}<button class="lang ghost" data-act="lang"><bdi class="u">${lang==="en"?"عربي":"English"}</bdi></button>
  ${S.view==="list" ? (isAdmin()?`<button class="primary" data-act="new">+ موقع جديد</button>`:"") : `<button data-act="back">${lang==="en"?"←":"→"} كل المواقع</button>`}</div></div>`;
}
function listView(){
  const list = Object.values(S.sites).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
  let body;
  if(S.mode==="loading") body=`<div class="empty">جارٍ تحميل المواقع…</div>`;
  else if(!list.length) body=`<div class="empty">لا توجد مواقع بعد. اضغط «موقع جديد» وأدخل اسم الموقع وقيمة المشروع وعدد الشبابيك والأبواب.</div>`;
  else body=`<div class="cards">${list.map(s=>{ const c=calc(s); return `<button class="card" data-act="open" data-id="${s.id}">
    <div class="cover">${s.coverId?`<img src="${blobUrl(s.coverId)}" alt="">`:"بدون صورة"}</div>
    <div class="body"><div class="row" style="justify-content:space-between"><h3>${U(s.name)}</h3>
    <span class="chip ${s.status==="منتهي"?"done":""}">${esc(s.status)}</span></div>
    ${!isEng()&&dueAlerts(s).length?`<span class="chip bad">💰 دفعة مستحقة <span class="num">${money(dueAlerts(s).reduce((a,m)=>a+m.left,0))}</span></span>`:""}
    ${s.example?`<span class="chip ex">بيانات مثال — يمكن حذفها</span>`:""}
    <span class="small muted">${U([s.location,s.consultant].filter(Boolean).join(" · "))}</span>
    <div class="bar"><i style="width:${c.pct}%"></i></div>
    <div class="row small" style="justify-content:space-between"><span>الإنجاز <span class="num">${c.pct}%</span></span>${isEng()?"":`<span>المتبقي <span class="num">${money(c.remaining)}</span> درهم</span>`}</div>
    </div></button>`; }).join("")}</div>`;
  const note = installHint() ? `<div class="notice small">${installHint().replace(/^<br>/,"")}</div>` : "";
  return header("تقارير المواقع") + note + (isAdmin()?cuHome():"") + (list.length?`<div class="row" style="justify-content:space-between;align-items:baseline"><h2>ماذا تريد أن تفعل؟</h2><span class="small muted">اضغط الزر ثم اختر الموقع</span></div>${qgridHtml()}<h2 style="margin-top:6px">المواقع</h2>`:"") + body + (S.pick?pickSheetHtml():"") + pushPanel() + backupPanel() + usersPanel() + (!isAdmin()?"":`
  <details class="panel" ${S.settings.logoId?"":"open"}><summary style="cursor:pointer;font-weight:600">🏢 ترويسة الشركة في التقارير (الشعار والبيانات)</summary>
   <div class="grid2"><label>اسم الشركة (عربي)<input id="co-ar" data-set="company" value="${esc(S.settings.company)}"></label>
   <label>اسم الشركة (إنجليزي)<input id="co-en" data-set="companyEn" value="${esc(S.settings.companyEn)}" dir="ltr"></label>
   <label>العنوان<input id="co-addr" data-set="address" value="${esc(S.settings.address||"")}" placeholder="الشارقة، الإمارات العربية المتحدة"></label>
   <label>الهاتف<input id="co-tel" data-set="phone" value="${esc(S.settings.phone||"")}" dir="ltr" inputmode="tel"></label>
   <label>البريد الإلكتروني<input id="co-mail" data-set="email" value="${esc(S.settings.email||"")}" dir="ltr" inputmode="email"></label>
   <label>الرقم الضريبي (TRN)<input id="co-trn" data-set="trn" value="${esc(S.settings.trn||"")}" dir="ltr"></label>
   <label>الاسم القانوني في الفاتورة<input id="co-legal" data-set="legalName" value="${esc(S.settings.legalName||"")}" dir="ltr" placeholder="ASEEL ALUMINIUM & GLASS WORKS LLC"></label>
   <label>صندوق البريد (P.O Box)<input id="co-po" data-set="poBox" value="${esc(S.settings.poBox||"")}" dir="ltr"></label>
   <label>بادئة رقم الفاتورة<input id="co-ipx" data-set="invPrefix" value="${esc(S.settings.invPrefix||"INV")}" dir="ltr"></label>
   <label>آخر رقم فاتورة صدر<input id="co-iseq" data-set="invSeq" type="number" inputmode="numeric" value="${esc(S.settings.invSeq||0)}"></label>
   <label>ص.ب / الموقع الإلكتروني<input id="co-web" data-set="web" value="${esc(S.settings.web||"")}" dir="ltr"></label></div>
   <div class="row">${S.settings.logoId?`<img src="${blobUrl(S.settings.logoId)}" alt="شعار الشركة" style="height:64px;max-width:200px;object-fit:contain;background:#fff;border-radius:6px;padding:4px;border:1px solid var(--line)">`:`<span class="small muted">لم يُرفع شعار بعد.</span>`}
    <button class="primary" data-act="logoup">${S.settings.logoId?"تغيير الشعار":"رفع شعار الشركة"}</button>${S.settings.logoId?`<button class="ghost danger" data-act="logodel">حذف الشعار</button>`:""}</div>
   <div class="row">${S.settings.stampId?`<img src="${blobUrl(S.settings.stampId)}" alt="الختم" style="height:56px;background:#fff;border-radius:6px;padding:2px">`:""}<button data-act="imgup" data-k="stampId">${S.settings.stampId?"تغيير ختم الشركة":"رفع ختم الشركة (للفاتورة)"}</button>
    ${S.settings.sigId?`<img src="${blobUrl(S.settings.sigId)}" alt="التوقيع" style="height:56px;background:#fff;border-radius:6px;padding:2px">`:""}<button data-act="imgup" data-k="sigId">${S.settings.sigId?"تغيير التوقيع":"رفع التوقيع (للفاتورة)"}</button></div>
   <p class="small muted" style="margin:0">تظهر هذه البيانات في ترويسة كل التقارير وتذييلها، وفي الفاتورة الضريبية.</p></details>`);
}
function siteView(s){
  const TB=isEng()?TABS.filter(t=>["summary","plan","items","photos","issues"].includes(t[0])):TABS; if(!TB.some(t=>t[0]===S.tab)) S.tab="summary";
  const tab = TB.map(([k,l,ic])=>`<button role="tab" aria-selected="${S.tab===k}" data-act="tab" data-tab="${k}"><span class="tic">${ic}</span>${l}${(k==="issues"&&(s.issues||[]).some(x=>x.status!=="done"))||(k==="money"&&dueAlerts(s).length)?` <i class="tdot"></i>`:""}</button>`).join("");
  const body = {summary:tSummary, plan:tPlan, items:tItems, money:tMoney, purchases:tPurchases, profit:tProfit, photos:tPhotos, issues:tIssues}[S.tab](s);
  return header(U(s.name)) + `
  <div class="row"><button class="primary big" data-act="repopen">📄 التقارير</button></div>
  ${/Android/.test(navigator.userAgent)&&/; wv\)/.test(navigator.userAgent)&&["plan","photos","purchases","money","issues","summary"].includes(S.tab)?`<div class="notice small"><b>رفع الصور والتصوير لا يعمل داخل تطبيق Claude على أندرويد.</b> افتح الصفحة من متصفح Chrome: ادخل claude.ai وسجّل الدخول بنفس الحساب، ثم افتح «تقارير مواقع أصيل» من قائمة الـ Artifacts. كل بياناتك موجودة هناك.</div>`:""}
  ${isEng()?"":alertBanner(s)}
  <div class="tabs" role="tablist">${tab}</div>${body}${S.repSheet?repSheetHtml(s):""}${S.inv?invSheetHtml(s):""}${S.view2?viewerHtml(s):""}${S.payPick?`<div class="sheet" role="dialog" aria-label="دفعة مستلمة"><div class="row" style="justify-content:space-between"><h3>💵 دفعة مستلمة — كيف استلمتها؟</h3><button class="ghost" data-act="paypickclose" aria-label="إغلاق">✕</button></div>${payMethodBtns()}</div>`:""}`;
}
function f(path, label, val, type="text", extra=""){
  return `<label>${label}<input id="f-${path}" data-f="${path}" type="${type}" value="${esc(val)}" ${type==="number"?'inputmode="decimal" min="0"':""} ${extra}></label>`;
}
function tSummary(s){
  const c=calc(s); const open=(s.issues||[]).filter(x=>x.status!=="done").length;
  return `<div class="panel">
   <div class="ring-row"><div class="ring" style="--p:${c.pct}"><b class="num">${c.pct}%</b><span>الإنجاز</span></div>
    <div class="mini">${isEng()?"":`<div><span class="muted small">قيمة المشروع</span><b class="num">${money(c.total)}</b></div><div><span class="muted small">المستلم</span><b class="num">${money(c.received)}</b></div>
    <div class="hl"><span class="small">المتبقي</span><b class="num">${money(c.remaining)}</b></div>`}${open?`<div class="warn" data-act="tab" data-tab="issues" role="button"><span class="small">مشاكل مفتوحة</span><b class="num">${open}</b></div>`:""}</div></div></div>
  ${qgridHtml()}
  <details class="panel" ${(!s.name||s.name===tr("مشروع جديد")||S.newSite===s.id)?"open":""}><summary style="cursor:pointer;font-weight:600">✏️ بيانات المشروع</summary>
   <div class="grid2">${f("name","اسم المشروع",s.name)}${f("location","الموقع",s.location)}
   ${f("engineer","اسم المهندس",s.engineer)}${f("engPhone","هاتف المهندس",s.engPhone,"tel",'dir="ltr" inputmode="tel"')}
   ${f("consultant","اسم الاستشاري",s.consultant)}${f("client","العميل / المقاول",s.client)}${f("owner","مالك المبنى",s.owner||"")}${f("quoteNo","رقم عرض السعر (RF. Quotation No)",s.quoteNo||"","text",'dir="ltr"')}${f("startDate","تاريخ البدء",s.startDate,"date")}
   ${isEng()?"":f("total","إجمالي قيمة المشروع (درهم)",s.total,"number")}
   <label>الحالة<select id="f-status" data-f="status">${["جاري","متوقف","منتهي"].map(o=>`<option value="${o}" ${s.status===o?"selected":""}>${o}</option>`).join("")}</select></label></div>
   <label>ملاحظات تظهر في التقرير<textarea id="f-notes" data-f="notes">${esc(s.notes)}</textarea></label>
   <div class="row">${s.coverId?`<img class="inv" src="${blobUrl(s.coverId)}" alt="صورة الموقع">`:""}
    <button data-act="cover" data-cam="1">📷 تصوير صورة الغلاف</button><button data-act="cover">${s.coverId?"تغيير من المعرض":"من المعرض"}</button></div>
   ${isAdmin()?`<div class="row"><button class="ghost danger ${S.armed==="site"?"armed":""}" data-act="delsite">${S.armed==="site"?"اضغط مرة أخرى لحذف الموقع نهائياً":"حذف الموقع"}</button></div>`:""}</details>`;
}
function activeSites(){ return Object.values(S.sites).filter(x=>x.status!=="منتهي").sort((a,b)=>(a.id===S.lastSite?-1:b.id===S.lastSite?1:0)||(b.updatedAt||0)-(a.updatedAt||0)); }
function goSite(id){ S.cur=id; S.view="site"; S.tab="summary"; S.lastPdf=null; S.lastSite=id; try{ localStorage.setItem("sites-last",id); }catch(e){} }
const QACTS=[["qphoto","📷","تصوير الموقع","صورة للأعمال"],["qplan","🗺️","تحديث الإنجاز","فريم · زجاج · سيليكون"],["cuscanc","🧾","تصوير فاتورة","ثم اختر الموقع"],["qchq","💵","دفعة مستلمة","شيك · تحويل · نقداً"],["qiss","⚠️","مشكلة فنية","مع صورة"],["repopen","📄","التقارير","PDF وواتساب"]];
function qgridHtml(){ return `<div class="qgrid">${QACTS.filter(q=>!isEng()||q[0]!=="qchq").map(([a,ic,t,d])=>`<button class="qbtn" data-act="${a}"><span class="qic">${ic}</span><b>${t}</b><span class="small muted">${d}</span></button>`).join("")}</div>`; }
function pickSheetHtml(){ const q=QACTS.find(x=>x[0]===S.pick)||QACTS[0];
  return `<div class="sheet" role="dialog" aria-label="اختر الموقع"><div class="row" style="justify-content:space-between"><h3>${q[1]} ${q[2]} — اختر الموقع</h3><button class="ghost" data-act="pickclose" aria-label="إغلاق">✕</button></div>
   <div class="replist">${activeSites().map(x=>{ const c=calc(x); return `<button class="repbtn" data-act="pickgo" data-q="${S.pick}" data-id="${x.id}"><span class="qic">${x.id===S.lastSite?"⭐":"🏗️"}</span><span><b>${U(x.name)}</b><br><span class="small muted">${U(x.location||"")} · الإنجاز <span class="num">${c.pct}%</span></span></span></button>`; }).join("")}</div></div>`; }
function viewerHtml(s){
  const v=S.view2; let fid, fields="", title="", reread="";
  const vf=(arr,key,i,k,l,val,t="text")=>`<label>${l}<input id="v-${key}-${k}" data-${key}="${i}.${k}" type="${t}" ${t==="number"?'inputmode="decimal" min="0"':""} value="${esc(val)}"></label>`;
  if(v.k==="pur"){ const i=s.purchases.findIndex(x=>x.id===v.id), p=s.purchases[i]; if(!p){ S.view2=null; return ""; } fid=p.fileId; title="الفاتورة";
    fields=vf(s.purchases,"u",i,"supplier","المورد",p.supplier)+vf(s.purchases,"u",i,"amount","المبلغ (درهم)",p.amount,"number")+vf(s.purchases,"u",i,"date","التاريخ",p.date,"date")+vf(s.purchases,"u",i,"desc","البيان",p.desc)+vf(s.purchases,"u",i,"note","ملاحظة / إضافة",p.note||"");
    reread=canRead?`<button data-act="readinv" data-id="${p.id}">🔄 قراءة الفاتورة مرة أخرى</button>`:""; }
  else if(v.k==="pay"){ const i=s.payments.findIndex(x=>x.id===v.id), p=s.payments[i]; if(!p){ S.view2=null; return ""; } fid=p.fileId; title="الشيك";
    title=PM[pmOf(p)][2];
    fields=vf(s.payments,"p",i,"amount","المبلغ (درهم)",p.amount,"number")+vf(s.payments,"p",i,"date","التاريخ",p.date,"date")+(pmOf(p)==="cheque"?vf(s.payments,"p",i,"chequeNo","رقم الشيك",p.chequeNo||""):vf(s.payments,"p",i,"ref","رقم المرجع",p.ref||""))+vf(s.payments,"p",i,"bank","البنك",p.bank||"")+vf(s.payments,"p",i,"note","البيان / اسم الدافع",p.note||""); }
  else { fid=v.id; title="الصورة"; }
  return `<div class="viewer" role="dialog" aria-label="${title}">
   <div class="vbar"><b>${title}</b><div class="row"><button data-act="vzoom" data-z="-1" aria-label="تصغير">−</button><span class="num small">${Math.round((S.vz||1)*100)}%</span><button data-act="vzoom" data-z="1" aria-label="تكبير">+</button><button data-act="vrot" aria-label="تدوير">⟳</button><button class="primary" data-act="vclose">✓ تم</button></div></div>
   <div class="vimg"><img src="${blobUrl(fid)}" alt="${title}" style="width:${(S.vz||1)*100}%;transform:rotate(${S.vr||0}deg)"></div>
   ${fields?`<div class="vfields"><span class="small muted">راجع البيانات مع الصورة وعدّلها إذا لزم. كل تعديل يُحفظ فوراً.</span><div class="grid2">${fields}</div>${reread?`<div class="row">${reread}</div>`:""}</div>`:""}</div>`;
}
function repSheetHtml(s){
  const opts=[["work","🏗️","تقرير الأعمال","للقروب والاستشاري: الإنجاز والخرائط والصور والمشاكل"],["fin","💰","التقرير المالي","للمالك: الحساب والدفعات والشيكات والملاحظات"],["pur","🔒","التقرير الداخلي","لك فقط: المشتريات والعمال والربح"]].filter(o=>!isEng()||o[0]==="work");
  return `<div class="sheet" role="dialog" aria-label="التقارير"><div class="row" style="justify-content:space-between"><h3>📄 اختر التقرير</h3><button class="ghost" data-act="repclose" aria-label="إغلاق">✕</button></div>
   <div class="replist">${opts.map(([k,ic,t,d])=>`<button class="repbtn ${S.busy===k?"busy":""}" data-act="pdf" data-kind="${k}" ${S.busy&&S.busy!==k?"disabled":""}><span class="qic">${ic}</span><span><b>${S.busy===k?"جارٍ تجهيز التقرير…":t}</b><br><span class="small muted">${d}</span></span></button>`).join("")}
   <button class="repbtn" data-act="copy"><span class="qic">💬</span><span><b>نسخ ملخص للواتساب</b><br><span class="small muted">نص قصير تلصقه في القروب</span></span></button></div>
   ${S.lastPdf===s.id?`<div class="notice small"><b>${window.__ios?"✓ التقرير جاهز.":"✓ تم حفظ ملف التقرير في التنزيلات."}</b> أرسله بزر «مشاركة»، أو من الواتساب: 📎 ثم «مستند».</div>${window.__lastFile?`<div class="row">${navigator.canShare?`<button class="primary big" data-act="sharefile">📤 مشاركة (واتساب…)</button>`:""}<button class="big" data-act="dlagain">${window.__ios?"📥 حفظ في الملفات / فتح":"⬇️ تحميل مرة أخرى"}</button></div>`:""}`:""}</div>`;
}
function tPlan(s){
  const fls=floors(s); if(S.planIdx>=fls.length) S.planIdx=0; if(!s._uc2){ s._uc2=1; renameAutoUnits(s); S.needSave=s; }
  const fl=fls[S.planIdx];
  if(!S.addItem || !s.items.find(i=>i.id===S.addItem)) S.addItem=s.items[0]&&s.items[0].id;
  const head=`<div class="panel"><h2>واجهات الموقع</h2><p class="small muted" style="margin:0">ارفع خريطة الطابق فيحدد البرنامج حدود المبنى وأضلاعه، ثم اكتب عدد الشبابيك والأبواب والثابت في كل واجهة وضع علاماتها على خط الواجهة.</p>
   <div class="row">${fls.map((f,i)=>`<button class="${i===S.planIdx?"primary":""}" data-act="floorsel" data-i="${i}"><bdi class="u">${esc(dEN(f.name))}</bdi></button>`).join("")}
   <button data-act="addfloor">+ طابق</button></div></div>`;
  if(!fl) return head+`<div class="empty">لا توجد طوابق بعد. اضغط «+ طابق» لإضافة الطابق الأول.</div>`;
  const f=fl.faces[S.face]||fl.faces.front; const ms=f.marks||[]; const img=faceImg(fl,f); const rows=faceRows(s,f);
  const shared = !f.fileId && fl.fileId;
  const others = []; const ed=isEditing(s,fl);
  const allOnMap = shared ? ms.concat(others) : ms;
  const faceBtns=activeFaces(fl).map(([k,l])=>{ const ff=fl.faces[k]; const st=faceState(s,ff);
    const sum=s.items.map(it=>{ const q=n((ff.req||{})[it.id]); return q?`${uPrefix(it)}${q}`:""; }).filter(Boolean).join(" ");
    return `<button class="facebtn" aria-pressed="${S.face===k}" data-act="facesel" data-face="${k}" style="border-inline-start:4px solid ${FCOL[k]}"><span>${st>=0?`<i class="dot" style="background:${MCOL[st]}"></i> `:""}${l}</span><span class="small muted"><bdi class="u">${esc(sum||"—")}</bdi></span></button>`; }).join("");
  return head+`<div class="panel">
   <div class="grid2"><label>اسم الطابق<input id="fl-name-${fl.id}" data-fl="name" value="${esc(dEN(fl.name))}"></label>
    <label>رمز الطابق في أسماء النوافذ<input id="fl-code-${fl.id}" data-fl="code" value="${esc(floorCode(s,fl))}" dir="ltr" maxlength="4" autocomplete="off" style="text-transform:uppercase"></label>
    <div class="row" style="align-items:end"><button data-act="floorimg">${fl.fileId?"تغيير خريطة الطابق":"رفع خريطة الطابق"}</button>
    <button class="danger ${S.armed==="floor"?"armed":""}" data-act="delfloor">${S.armed==="floor"?"اضغط مرة أخرى لحذف الطابق":"حذف الطابق"}</button></div></div>
   ${fl.fileId?outlineCtl(s,fl):""}
   <div class="facegrid">${faceBtns}</div></div>
  <div class="panel ${ed?"editing":""}"><h2>${(FACES.find(([k])=>k===S.face)||FACES[0])[1]} — <bdi class="u">${esc(dEN(fl.name))}</bdi></h2>
   ${ed?`<div class="editbar"><b>✏️ وضع التعديل مفتوح لهذه الواجهة.</b><span class="small">كل تغيير يُحفظ فوراً. اضغط «إنهاء» عند الانتهاء، أو «تراجع» لإرجاع الواجهة كما كانت قبل التعديل.</span>
      <div class="row"><button class="primary" data-act="editdone">✓ إنهاء التعديل</button><button class="danger ${S.armed==="undo"?"armed":""}" data-act="editundo">${S.armed==="undo"?"اضغط مرة أخرى للتراجع":"↶ تراجع عن كل التعديلات"}</button></div></div>`
     :`<div class="lockbar"><span class="small">🔒 الواجهة مقفلة، لا يمكن تغيير الأعداد أو العلامات بالخطأ.</span><button class="primary" data-act="editstart">✏️ تعديل الواجهة</button></div>`}
   <h3>المطلوب في هذه الواجهة</h3>
   <fieldset class="plain" ${ed?"":"disabled"}><div class="list">${s.items.map(it=>{ const us=unitsOf(s,fl,f,it.id); const placed=new Set((f.marks||[]).map(m=>m.unit).filter(Boolean));
     return `<div class="item"><div class="head"><label><bdi class="u">${esc(dEN(it.name))}</bdi> — العدد<input id="rq-${fl.id}-${S.face}-${it.id}" data-rq="${it.id}" type="number" inputmode="numeric" pattern="[0-9]*" min="0" step="1" value="${us.length||""}" placeholder="0"></label></div>
     ${us.length?`<div class="units">${us.map((u,i)=>`<span class="unit ${placed.has(u.id)?"placed":""}"><input id="un-${u.id}" data-un="${it.id}|${i}" value="${esc(u.name)}" dir="ltr" aria-label="اسم"><button class="ghost" data-act="unitdel" data-id="${it.id}" data-i="${i}" aria-label="حذف">✕</button></span>`).join("")}</div>`:""}
     <div class="row"><input id="ua-${it.id}" type="number" inputmode="numeric" pattern="[0-9]*" min="1" value="1" style="width:70px"><button data-act="unitadd" data-id="${it.id}">+ إضافة</button></div></div>`; }).join("")}</div>
   ${s.items.some(i=>/ثابت|fixed/i.test(i.name))?"":`<div class="row"><button data-act="addfixed">+ إضافة بند الثابت</button></div>`}</fieldset>
   ${rows.length?`<div class="tbl-wrap"><table><tr><th>البند</th><th>المطلوب</th><th>المعلّم</th>${STAGES.map(([,l],i)=>`<th><i class="dot" style="background:${MCOL[i+1]}"></i> ${l}</th>`).join("")}<th>المتبقي للإنهاء</th><th>مقارنة الخريطة بالمطلوب</th></tr>
     ${rows.map(r=>`<tr><td>${U(r.it.name)}</td><td class="num">${r.q}</td><td class="num">${r.marked}</td>${r.st.map((v,i)=>`<td class="num" style="${v?`color:${MCOL[i+1]};font-weight:700`:""}">${v} / ${Math.max(r.q,r.marked)}</td>`).join("")}<td class="num" style="font-weight:700">${Math.max(r.q,r.marked)-r.st[2]}</td><td>${diffChip(r)}</td></tr>`).join("")}</table></div>`:""}
  </div>
  <div class="panel">
   <div class="row"><button data-act="faceimg">${f.fileId?"تغيير رسم الواجهة":"رفع رسم خاص بالواجهة"}</button>
    ${f.fileId?`<button class="ghost danger ${S.armed==="faceimg"?"armed":""}" data-act="delfaceimg">${S.armed==="faceimg"?"تأكيد الحذف":"حذف رسم الواجهة"}</button>`:""}</div>
   ${shared?`<p class="small muted" style="margin:0">خريطة الطابق كاملة، وتظهر عليها علامات <b>${faceName(S.face)}</b> فقط.</p>`:""}
   ${img?`
   <div class="row" style="justify-content:space-between"><p class="small muted" style="margin:0;flex:1;min-width:0">اضغط على مكان الشباك أو الباب في الخريطة، ثم اختر نوعه وما تم إنجازه فيه من الخيارات في الأسفل. اضغط على أي علامة لتعديلها.</p>
    <div class="row"><button data-act="zoom" data-z="-1" aria-label="تصغير">−</button><span class="num small">${Math.round(S.zoom*100)}%</span><button data-act="zoom" data-z="1" aria-label="تكبير">+</button></div></div>
   <div class="pwrap" id="planWrap"><div class="pbox" id="pbox" style="width:${S.zoom*100}%">
     ${planHtml(s,fl,img,blobUrl(img),(S.outline||S.crop?"":ms.map(m=>markHtml(s,m,true,ms)).join(""))+(S.sel&&S.sel.mode==="new"?`<span class="mk pending" style="left:${S.sel.x}%;top:${S.sel.y}%">+</span>`:"")+(S.crop&&S.crop.p1?`<span class="opt" style="left:${S.crop.p1[0]}%;top:${S.crop.p1[1]}%">1</span>`:""),{id:"planImg",face:(S.outline?null:S.face),draft:S.outline})}</div></div>
   <div class="legend">${legendHtml(s,allOnMap)}</div>
   ${S.sel&&!S.outline&&!S.crop?sheetHtml(s,f):""}`
   :`<div class="empty">ارفع خريطة الطابق (لكل الواجهات) أو رسماً خاصاً بهذه الواجهة لتضع العلامات.</div>`}
  </div>
  <div class="panel"><h2>صور الموقع: ${faceName(S.face)}</h2>
   ${(()=>{ const ph=s.photos.filter(p=>p.face===S.face); return ph.length?`<div class="thumbs">${ph.map(photoCard).join("")}</div>`:`<div class="empty">لا توجد صور لهذه الواجهة بعد.</div>`; })()}
   <div class="row"><button class="primary" data-act="addph" data-cam="1" data-face="${S.face}" data-fl="${fl.id}">📷 تصوير</button><button data-act="addph" data-face="${S.face}" data-fl="${fl.id}">+ من المعرض</button></div></div>
  ${(()=>{ const iss=(s.issues||[]).filter(x=>x.face===S.face&&x.status!=="done"); return iss.length?`<div class="panel"><h2>مشاكل فنية مفتوحة في هذه الواجهة <span class="chip ex num">${iss.length}</span></h2>${iss.map(x=>`<div class="small">• ${U(x.text||"—")}</div>`).join("")}</div>`:""; })()}`;
}
function unlinkUnit(s,uid_){ Object.values(S.mk).filter(m=>m.siteId===s.id&&m.unit===uid_).forEach(m=>{ m.unit=null; putMark(m); }); }
function nextFreeUnit(s,itemId){ const fl=floors(s)[S.planIdx]; if(!fl||!itemId) return null; const f=fl.faces[S.face]; const us=unitsOf(s,fl,f,itemId); const taken=new Set(faceMarks(s,fl,S.face).map(m=>m.unit)); const u=us.find(x=>!taken.has(x.id)); return u?u.id:null; }
function isEditing(s,fl){ return !!(S.edit&&S.edit.siteId===s.id&&S.edit.fl===fl.id&&S.edit.face===S.face); }
function startEdit(s){ const fl=floors(s)[S.planIdx]; const f=fl.faces[S.face];
  S.edit={siteId:s.id,fl:fl.id,face:S.face,units:JSON.parse(JSON.stringify(f.units||{})),req:JSON.parse(JSON.stringify(f.req||{})),
    marks:JSON.parse(JSON.stringify(Object.values(S.mk).filter(m=>m.siteId===s.id&&m.fl===fl.id&&m.face===S.face)))}; }
function undoEdit(s){ const e=S.edit; if(!e) return; const fl=floors(s).find(x=>x.id===e.fl); if(!fl) return; const f=fl.faces[e.face];
  f.units=JSON.parse(JSON.stringify(e.units)); f.req=JSON.parse(JSON.stringify(e.req));
  const keep=new Set(e.marks.map(m=>m.id));
  Object.values(S.mk).filter(m=>m.siteId===s.id&&m.fl===e.fl&&m.face===e.face&&!keep.has(m.id)).forEach(m=>delMark(m.id));
  e.marks.forEach(m=>{ const cur=S.mk[m.id]; if(!cur||JSON.stringify({...cur,updatedAt:0})!==JSON.stringify({...m,updatedAt:0})) putMark(JSON.parse(JSON.stringify(m))); });
  S.edit=null; S.sel=null; save(s); }
function flAspect(fl){ return fl.aspect||0.7; }
function faceEdges(fl,face){ const o=fl.outline; if(!o||!o.pts||o.pts.length<3) return []; const P=o.pts, out=[];
  for(let i=0;i<P.length;i++){ if((o.sides||[])[i]===face) out.push([P[i],P[(i+1)%P.length]]); } return out; }
function nearestOn(fl,edges,x,y){ const A=flAspect(fl); let best=null;
  edges.forEach(([p,q])=>{ const ax=p[0],ay=p[1]*A,bx=q[0],by=q[1]*A,px=x,py=y*A; const dx=bx-ax,dy=by-ay; const L=dx*dx+dy*dy||1;
    let t=((px-ax)*dx+(py-ay)*dy)/L; t=Math.max(0,Math.min(1,t)); const cx=ax+t*dx, cy=ay+t*dy; const d=Math.hypot(px-cx,py-cy);
    if(!best||d<best.d) best={x:+cx.toFixed(2),y:+(cy/A).toFixed(2),d}; }); return best; }
function lineDiv(fl,p,q,color,w,dash){ const A=flAspect(fl); const dx=q[0]-p[0], dy=(q[1]-p[1])*A; const len=Math.hypot(dx,dy); const ang=Math.atan2(dy,dx)*180/Math.PI;
  return `<i class="oline" style="left:${p[0]}%;top:${p[1]}%;width:${len}%;background:${dash?`repeating-linear-gradient(90deg,${color} 0 6px,transparent 6px 10px)`:color};height:${w}px;margin-top:${-w/2}px;transform:rotate(${ang}deg)"></i>`; }
function outlineHtml(fl,activeFace,draft){
  const o=draft||fl.outline; if(!o||!o.pts||!o.pts.length) return "";
  const P=o.pts; let h="";
  const closed=!draft||draft.step!=="points";
  for(let i=0;i<P.length;i++){ if(i===P.length-1&&!closed) break; const q=P[(i+1)%P.length]; const k=(o.sides||[])[i];
    const col=k?FCOL[k]:"#ff6f00"; const act=!activeFace||k===activeFace;
    h+=lineDiv(fl,P[i],q,col,act?(activeFace?6:4):2,!act&&!!activeFace);
    const mx=(P[i][0]+q[0])/2, my=(P[i][1]+q[1])/2;
    if(closed) h+=`<span class="olabel" style="left:${mx}%;top:${my}%;background:${col};opacity:${act?1:.55}">${draft?`<b class="num">${i+1}</b> `:""}${k?faceName(k).replace("الواجهة ",""):"?"}</span>`; }
  if(draft) P.forEach((pt,i)=>{ h+=`<span class="opt" style="left:${pt[0]}%;top:${pt[1]}%">${i+1}</span>`; });
  return h; }
function planHtml(s,fl,fileId,src,inner,opts){
  opts=opts||{}; const isFl=fileId===fl.fileId&&!!fl.aspect; const c=(isFl&&fl.crop&&!opts.full)?fl.crop:null; const A=flAspect(fl);
  const cw=c?c.w/100:1, ch=c?c.h/100:1, cx=c?c.x/100:0, cy=c?c.y/100:0;
  const box=isFl?`position:relative;overflow:hidden;height:0;padding-top:${(ch*A/cw*100).toFixed(4)}%`:"position:relative";
  const pin=isFl?`position:absolute;width:${(100/cw).toFixed(4)}%;left:${(-cx/cw*100).toFixed(4)}%;top:${(-cy/ch*100).toFixed(4)}%`:"position:relative";
  return `<div class="pclip" style="${box}"><div class="pin" style="${pin}"><img ${opts.id?`id="${opts.id}"`:""} src="${src}" alt="خريطة" draggable="false" data-fl="${fileId===fl.fileId?fl.id:""}" style="display:block;width:100%">${fileId===fl.fileId?outlineHtml(fl,opts.face,opts.draft):""}${inner}</div></div>`; }
function outlineCtl(s,fl){
  const o=S.outline;
  if(S.crop) return `<div class="obar"><b>✂️ قص الخريطة</b><span class="small">اضغط على الركن الأعلى من جهة، ثم على الركن المقابل في الأسفل، ليبقى المبنى فقط ظاهراً.</span>
    <div class="row"><button data-act="cropcancel">إلغاء</button></div></div>`;
  if(o&&o.step==="points") return `<div class="obar"><b>✍️ تحديد حدود المبنى — النقطة ${o.pts.length+1}</b><span class="small">اضغط على أركان المبنى بالترتيب حوله (مع عقارب الساعة أو عكسها). ٤ نقاط للمستطيل، و٦ للمبنى بستة أضلاع… كبّر الخريطة للدقة.</span>
    <div class="row"><button class="primary" data-act="olclose" ${o.pts.length<3?"disabled":""}>✓ إغلاق الشكل (${o.pts.length} نقاط)</button><button data-act="olundo" ${o.pts.length?"":"disabled"}>↶ آخر نقطة</button><button data-act="olcancel">إلغاء</button></div></div>`;
  if(o&&o.step==="sides") return `<div class="obar"><b>حدّد واجهة كل ضلع</b><span class="small">كل ضلع مرقّم على الخريطة. اختر واجهته. يمكن أن يكون للواجهة أكثر من ضلع.</span>
    <div class="sidegrid">${o.pts.map((_,i)=>`<label><b class="num" style="color:${FCOL[o.sides[i]]||"#ff6f00"}">${i+1}</b><select data-side="${i}">${FACES.map(([k,l])=>`<option value="${k}" ${o.sides[i]===k?"selected":""}>${l}</option>`).join("")}</select></label>`).join("")}</div>
    <div class="row"><button class="primary" data-act="olsave">✓ حفظ الحدود والواجهات</button><button data-act="olredo">✍️ إعادة رسم النقاط</button><button data-act="olcancel">إلغاء</button></div></div>`;
  const has=fl.outline&&fl.outline.pts&&fl.outline.pts.length>=3;
  return `<div class="lockbar"><span class="small">${has?`📐 حدود المبنى محددة: <b class="num">${fl.outline.pts.length}</b> أضلاع. العلامات تلتصق بخط الواجهة.`:"📐 حدّد حدود المبنى وأضلاعه لتظهر الواجهات على الخريطة، ولا توضع علامة خارجها."}</span>
    <div class="row">${canRead?`<button data-act="olauto">🤖 تحديد تلقائي</button>`:""}<button data-act="olmanual">✍️ ${has?"تعديل الحدود":"تحديد يدوي"}</button><button data-act="cropstart">✂️ ${fl.crop?"إعادة القص":"قص الخريطة"}</button>${fl.crop?`<button class="ghost" data-act="cropclear">إلغاء القص</button>`:""}${has?`<button class="ghost danger ${S.armed==="olclr"?"armed":""}" data-act="olclear">${S.armed==="olclr"?"تأكيد":"مسح الحدود"}</button>`:""}</div></div>`;
}
function dirFace(p,q,c){ const mx=(p[0]+q[0])/2-c[0], my=(p[1]+q[1])/2-c[1]; return Math.abs(my)>=Math.abs(mx)?(my>0?"front":"back"):(mx>0?"right":"left"); }
function autoSides(pts){ const c=[pts.reduce((a,p)=>a+p[0],0)/pts.length, pts.reduce((a,p)=>a+p[1],0)/pts.length];
  const sides=pts.map((p,i)=>dirFace(p,pts[(i+1)%pts.length],c));
  if(pts.length>4){ const len=i=>{ const p=pts[i],q=pts[(i+1)%pts.length]; return Math.hypot(q[0]-p[0],q[1]-p[1]); }; const extra=["e5","e6"]; let ei=0;
    BASEF.forEach(k=>{ const idx=sides.map((v,i)=>v===k?i:-1).filter(i=>i>=0).sort((a,b)=>len(b)-len(a)); idx.slice(1).forEach(i=>{ if(ei<extra.length) sides[i]=extra[ei++]; }); }); }
  return sides; }
async function detectOutline(s,fl,blob){
  const img=await compress(new File([blob],"p.jpg",{type:blob.type||"image/jpeg"}),1600);
  const d=await sample.json(`هذه صورة مخطط معماري لطابق مبنى (Floor plan). أريد حدود المبنى الخارجية فقط (خط الجدار الخارجي/الواجهة الزجاجية الخارجية للمبنى نفسه).
تجاهل: جدول بيانات الرسم (Title block)، الملاحظات، خطوط الأبعاد، محاور الشبكة (A,B,1,2…)، المظلات والكانوبي، الأرصفة، والأسهم.
أعد الشكل كمضلع بأركانه الحقيقية فقط (3 إلى 10 نقاط) بالترتيب حول المبنى مع عقارب الساعة، والإحداثيات نسبة مئوية من عرض وارتفاع الصورة (0 إلى 100).
وأعد أيضاً مستطيل قص يحتوي المبنى مع هامش صغير ويستبعد جدول البيانات.
أجب بـ JSON فقط: {"points":[[x,y],...],"crop":{"x":0,"y":0,"w":100,"h":100}}`,{images:[img],cache:false});
  if(!d||!Array.isArray(d.points)||d.points.length<3) throw new Error("no outline");
  const pts=d.points.map(p=>[Math.max(0,Math.min(100,+(+p[0]).toFixed(2))),Math.max(0,Math.min(100,+(+p[1]).toFixed(2)))]).filter(p=>isFinite(p[0])&&isFinite(p[1]));
  if(pts.length<3) throw new Error("bad outline");
  let crop=null; if(d.crop&&n(d.crop.w)>5&&n(d.crop.h)>5){ const x=Math.max(0,n(d.crop.x)), y=Math.max(0,n(d.crop.y)); crop={x,y,w:Math.min(100-x,n(d.crop.w)),h:Math.min(100-y,n(d.crop.h))}; }
  S.outline={fl:fl.id,step:"sides",pts,sides:autoSides(pts),crop}; S.sel=null;
}
async function runDetect(s,fl,blob,b){
  if(!canRead){ return; } if(b){ b.classList.add("busy"); b.textContent=tr("🤖 جارٍ تحديد حدود المبنى…"); } else toast("🤖 جارٍ تحديد حدود المبنى…");
  try{ await detectOutline(s,fl,blob); toast("راجع الأضلاع واختر واجهة كل ضلع ثم احفظ"); }
  catch(e){ console.warn(e); toast("لم أستطع تحديد الحدود تلقائياً، حدّدها يدوياً"); }
  render(); }
function snapMark(m,along){ const s=site(); if(!s) return; const fl=floors(s).find(x=>x.id===m.fl); if(!fl||fl.faces[m.face].fileId) return; const ed=faceEdges(fl,m.face); if(!ed.length) return; const nb=nearestOn(fl,ed,m.x,m.y); m.x=nb.x; m.y=nb.y; }
function curFace(s){ const fl=floors(s)[S.planIdx]; const f=fl.faces[S.face]; f.marks=f.marks||[]; return f; }
function sheetHtml(s,f){
  const isNew=S.sel.mode==="new"; const m=isNew?null:S.mk[S.sel.id];
  if(!isNew&&!m){ S.sel=null; return ""; }
  const itemId=isNew?S.addItem:m.itemId, fl=isNew?{fix:false,glass:false,sil:false}:mf(m);
  return `<div class="sheet" role="dialog" aria-label="خيارات العلامة">
   <div class="row" style="justify-content:space-between"><h3>${isNew?"علامة جديدة":`تعديل العلامة <bdi class="u">${esc(mLabel(s,m))}</bdi>`}</h3><button class="ghost" data-act="selcancel" aria-label="إغلاق">✕</button></div>
   ${isNew?"":`<span class="small muted">تحريك العلامة</span>
   <div class="row mv"><button data-act="mvmk" data-d="0,-1" aria-label="فوق">↑</button><button data-act="mvmk" data-d="0,1" aria-label="تحت">↓</button><button data-act="mvmk" data-d="-1,0" aria-label="يسار">←</button><button data-act="mvmk" data-d="1,0" aria-label="يمين">→</button>
   <span class="small muted">أو اسحب العلامة بإصبعك</span></div>`}
   <span class="small muted">النوع</span>
   <div class="opts">${s.items.map(it=>`<button aria-pressed="${itemId===it.id}" data-act="selitem" data-id="${it.id}"><bdi class="u">${esc(dEN(it.name))}</bdi></button>`).join("")}</div>
   ${(()=>{ const flo=floors(s)[S.planIdx]; const us=itemId?unitsOf(s,flo,flo.faces[S.face],itemId):[]; const taken=new Set((f.marks||[]).filter(x=>!m||x.id!==m.id).map(x=>x.unit).filter(Boolean)); const cur=isNew?S.selUnit:m.unit;
     return us.length?`<span class="small muted">الاسم</span><div class="opts">${us.map(u=>`<button aria-pressed="${cur===u.id}" data-act="selunit" data-id="${u.id}" dir="ltr" ${taken.has(u.id)?'style="opacity:.45"':""}>${esc(u.name)}${taken.has(u.id)?" ✓":""}</button>`).join("")}</div>
     ${(()=>{ const cu=us.find(u=>u.id===cur); if(!cu) return ""; const i=us.indexOf(cu); return `<label>تعديل اسم <bdi class="u" dir="ltr">${esc(cu.name)}</bdi><input id="sun-${cu.id}" data-un="${itemId}|${i}" value="${esc(cu.name)}" dir="ltr" autocomplete="off"></label>`; })()}`:`<span class="small muted">أضف العدد المطلوب لهذا البند في الأعلى ليظهر اسم كل وحدة (W1، W2…).</span>`; })()}
   <span class="small muted">ما تم إنجازه — كل اختيار يُحفظ فوراً</span>
   <div class="opts">${STAGES.map(([k,l],i)=>`<button aria-pressed="${fl[k]}" data-act="seltog" data-k="${k}"><i class="dot" style="background:${MCOL[i+1]}"></i> ${l} ${fl[k]?"✓":""}</button>`).join("")}</div>
   <div class="row">${isNew?`<button class="primary" data-act="selsave">حفظ العلامة</button><button data-act="selcancel">إلغاء</button>`
     :`<button class="primary" data-act="selcancel">إغلاق</button><button class="danger ${S.armed==="mk"?"armed":""}" data-act="seldel">${S.armed==="mk"?"تأكيد الحذف":"حذف العلامة"}</button>`}</div>
  </div>`;
}
function tIssues(s){
  s.issues=s.issues||[];
  const open=s.issues.filter(x=>x.status!=="done").length;
  return `<div class="panel"><div class="row" style="justify-content:space-between"><h2>المشاكل الفنية</h2>${open?`<span class="chip ex">مفتوحة <span class="num">${open}</span></span>`:""}</div>
  <p class="small muted" style="margin:0">سجّل أي مشكلة في الموقع مع واجهتها وصورتها، وغيّر حالتها عند حلها. تظهر كلها في تقرير الأعمال.</p>
  ${s.issues.length?`<div class="list">${s.issues.map((x,i)=>`<div class="entry">
    <label>التاريخ<input id="is-${x.id}-d" data-is="${i}.date" type="date" value="${esc(x.date)}"></label>
    <label>الواجهة<select id="is-${x.id}-f" data-is="${i}.face"><option value="">عام</option>${usedFaces(S.sites[S.cur]).map(([k,l])=>`<option value="${k}" ${x.face===k?"selected":""}>${l}</option>`).join("")}</select></label>
    <label class="full">وصف المشكلة<textarea id="is-${x.id}-t" data-is="${i}.text" placeholder="مثال: فتحة الشباك أكبر من المقاس، الزجاج مكسور، تأخر توريد…">${esc(x.text)}</textarea></label>
    <label>المسؤول / الإجراء<input id="is-${x.id}-a" data-is="${i}.action" value="${esc(x.action||"")}"></label>
    <label>الحالة<select id="is-${x.id}-s" data-is="${i}.status"><option value="open" ${x.status!=="done"?"selected":""}>مفتوحة</option><option value="done" ${x.status==="done"?"selected":""}>تم الحل</option></select></label>
    <div class="full row">${x.fileId?`<img class="inv" src="${blobUrl(x.fileId)}" alt="صورة المشكلة" data-act="viewdoc" data-k="img" data-id="${x.fileId}" style="cursor:zoom-in">`:""}
      <button data-act="addiss" data-cam="1" data-id="${x.id}">📷 تصوير</button><button data-act="addiss" data-id="${x.id}">${x.fileId?"تغيير الصورة":"من المعرض"}</button>
      <button class="ghost danger ${S.armed===x.id?"armed":""}" data-act="deliss" data-id="${x.id}">${S.armed===x.id?"تأكيد الحذف":"حذف"}</button></div></div>`).join("")}</div>`
    :`<div class="empty">لا توجد مشاكل فنية مسجّلة.</div>`}
  <div class="row"><button class="primary" data-act="newiss">+ مشكلة فنية</button></div></div>`;
}
function tItems(s){
  return `<div class="panel"><h2>مطلوبات الموقع</h2><p class="small muted" style="margin:0">اكتب العدد المطلوب لكل بند، ثم سجّل ما تم إنجازه في كل مرحلة.</p>
  <div class="list">${s.items.map((it,i)=>`<div class="item">
    <div class="head"><label>البند<input id="i-${it.id}-name" data-i="${i}.name" value="${esc(dEN(it.name))}"></label>
    <label style="flex:0 0 96px">العدد المطلوب<input id="i-${it.id}-qty" data-i="${i}.qty" type="number" inputmode="numeric" min="0" value="${n(it.qty)}" ${planLinked(s,it.id)?"disabled":""}></label>
    <button class="ghost danger ${S.armed===it.id?"armed":""}" data-act="delitem" data-id="${it.id}" aria-label="حذف البند">${S.armed===it.id?"تأكيد":"حذف"}</button></div>
    <div class="stages">${STAGES.map(([k,l])=>`<label>${l} (تم)<input id="i-${it.id}-${k}" data-i="${i}.${k}" type="number" inputmode="numeric" min="0" value="${n(it[k])}" ${planLinked(s,it.id)?"disabled":""}></label>`).join("")}</div>
    ${planLinked(s,it.id)?`<span class="chip">الأعداد محسوبة من الواجهات</span>`:""}
    <span class="small muted">المتبقي: ${STAGES.map(([k,l])=>`${l} <span class="num">${Math.max(0,n(it.qty)-n(it[k]))}</span>`).join(" · ")}</span>
  </div>`).join("")}</div>
  <div class="row"><button data-act="additem" data-name="شبابيك">+ شبابيك</button><button data-act="additem" data-name="أبواب">+ أبواب</button>
  <button data-act="additem" data-name="ثابت">+ ثابت</button><button data-act="additem" data-name="واجهة زجاج">+ واجهة زجاج</button><button data-act="additem" data-name="">+ بند آخر</button></div></div>`;
}
const SCST={paid:["مدفوعة ✓","done"],due:["مستحقة الآن","bad"],partdue:["مستحقة — مدفوعة جزئياً","bad"],part:["مدفوعة جزئياً",""],wait:["لم تستحق بعد","muted"]};
const PM={cheque:["شيك","🧾","صورة الشيك"],transfer:["تحويل بنكي","🏦","إشعار التحويل"],cash:["نقداً","💵","سند القبض"]};
const pmOf=p=>p.method||(p.chequeNo||p.fileId?"cheque":"cheque");
function payMethodBtns(){ return `<div class="replist">
  <button class="repbtn" data-act="scanpay" data-m="cheque" data-cam="1"><span class="qic">🧾</span><span><b>شيك</b><br><span class="small muted">صوّر الشيك، ويُقرأ المبلغ والتاريخ ورقم الشيك والبنك</span></span></button>
  <button class="repbtn" data-act="scanpay" data-m="transfer" data-cam="1"><span class="qic">🏦</span><span><b>تحويل بنكي</b><br><span class="small muted">صوّر إشعار التحويل أو لقطة شاشة التطبيق البنكي</span></span></button>
  <button class="repbtn" data-act="scanpay" data-m="transfer"><span class="qic">🖼️</span><span><b>تحويل بنكي من المعرض</b><br><span class="small muted">اختر لقطة شاشة التحويل من الجوال</span></span></button>
  <button class="repbtn" data-act="addpay" data-m="cash"><span class="qic">💵</span><span><b>نقداً (كاش)</b><br><span class="small muted">اكتب المبلغ فقط</span></span></button></div>`; }
function scheduleHtml(s){
  const sc=schedule(s); const sum=(s.schedule||[]).reduce((a,m)=>a+n(m.pct),0);
  return `<div class="panel"><div class="row" style="justify-content:space-between"><h2>جدول الدفعات المتفق عليها</h2>${sc.length?`<span class="chip ${sum===100?"done":"ex"}">المجموع <span class="num">${sum}%</span></span>`:""}</div>
  <p class="small muted" style="margin:0">حدد نسبة كل دفعة ومتى تستحق. البرنامج يوزّع المبالغ المستلمة على الدفعات بالترتيب، وينبهك عند استحقاق أي دفعة.</p>
  ${sc.length?`<div class="list">${sc.map((m,i)=>{ const [lbl,cls]=SCST[m.st]; return `<div class="entry sched ${cls==="bad"?"due":""}">
    <div class="full row" style="justify-content:space-between"><b><span class="num">${i+1}.</span> ${U(m.name||"دفعة")}</b><span class="chip ${cls==="done"?"done":cls==="bad"?"bad":cls==="muted"?"":"ex"}">${lbl}</span></div>
    <label>اسم الدفعة<input id="sc-${m.id}-n" data-sc="${i}.name" value="${esc(m.name||"")}"></label>
    <label>النسبة %<input id="sc-${m.id}-p" data-sc="${i}.pct" type="number" inputmode="decimal" min="0" max="100" value="${n(m.pct)}"></label>
    <label>تستحق<select id="sc-${m.id}-t" data-sc="${i}.trigger">${TRIG.map(([k,l])=>`<option value="${k}" ${m.trigger===k?"selected":""}>${l}</option>`).join("")}</select></label>
    ${m.trigger==="progress"?`<label>عند إنجاز %<input id="sc-${m.id}-a" data-sc="${i}.at" type="number" inputmode="numeric" min="1" max="100" value="${n(m.at)||50}"></label>`
      :m.trigger==="handover"?`<label style="flex-direction:row;align-items:center;gap:8px;align-self:end"><input type="checkbox" id="sc-${m.id}-d" data-sc="${i}.done" style="width:auto" ${m.done?"checked":""}> تم التسليم</label>`:`<span></span>`}
    <div class="full"><div class="small row" style="justify-content:space-between"><span>المبلغ <b class="num">${money(m.amt)}</b> — المدفوع <b class="num">${money(m.paid)}</b> — الباقي <b class="num">${money(m.left)}</b></span>
      ${m.trigger!=="sign"&&m.trigger!=="handover"?`<span class="muted">الشرط <span class="num">${m.prog}%</span></span>`:""}</div>
      <div class="bar"><i style="width:${m.amt?Math.round(m.paid/m.amt*100):0}%;background:var(--good)"></i></div></div>
    <div class="full"><button class="ghost danger small ${S.armed===m.id?"armed":""}" data-act="delsc" data-id="${m.id}">${S.armed===m.id?"تأكيد الحذف":"حذف"}</button></div></div>`; }).join("")}</div>`
   :`<div class="empty">لا يوجد جدول دفعات بعد.</div>`}
  ${sc.length&&sum!==100?`<div class="notice small"><bdi class="u">${lang==="en"?`The percentages add up to <b class="num">${sum}%</b>; they must total 100%.`:`مجموع النسب <b class="num">${sum}%</b>، ويجب أن يكون 100%.`}</bdi></div>`:""}
  <div class="row"><button data-act="addsc">+ دفعة</button>${sc.length?"":`<button class="primary" data-act="sctpl">استخدام 30% مقدم / 40% بعد التركيب / 30% بعد التسليم</button>`}</div></div>`;
}
function alertBanner(s){ const al=dueAlerts(s); if(!al.length) return "";
  return `<div class="duealert" data-act="tab" data-tab="money" role="button">💰 <b>${al.length===1?"دفعة مستحقة":"دفعات مستحقة"}:</b> ${al.map(m=>`${U(m.name||"دفعة")} — <b class="num">${money(m.left)}</b> درهم`).join(" · ")}</div>`; }
function tProfit(s){
  const k=costs(s), tot=n(s.total); const pos=k.profit>=0;
  return `<div class="panel"><div class="row" style="justify-content:space-between"><h2>ربح المشروع</h2><span class="chip">داخلي — لا يظهر للمالك</span></div>
   <div class="stats" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">
    <div class="stat"><span class="small muted">قيمة المشروع</span><b class="num">${money(tot)}</b></div>
    <div class="stat"><span class="small muted">المشتريات</span><b class="num">${money(k.pur)}</b></div>
    <div class="stat"><span class="small muted">أجور العمال</span><b class="num">${money(k.lab)}</b></div>
    <div class="stat"><span class="small muted">مصاريف أخرى</span><b class="num">${money(k.oth)}</b></div>
    <div class="stat ${pos?"good":"badst"}"><span class="small muted">صافي الربح المتوقع</span><b class="num">${money(k.profit)}</b><span class="small">هامش <span class="num">${k.margin}%</span></span></div>
    <div class="stat"><span class="small muted">الرصيد النقدي الآن</span><b class="num" style="color:${k.cash>=0?"var(--good)":"var(--bad)"}">${money(k.cash)}</b><span class="small muted">المستلم − المصروف</span></div></div>
   ${tot?`<div class="costbar">${[["pur",k.pur,"#0f6e7a"],["lab",k.lab,"#e07b00"],["oth",k.oth,"#7b1fa2"],["pr",Math.max(0,k.profit),"#2f9e55"]].map(([x,v,cl])=>`<i style="width:${Math.max(0,v/Math.max(tot,k.cost)*100)}%;background:${cl}"></i>`).join("")}</div>
   <div class="legend small"><span><i style="background:#0f6e7a"></i>المشتريات</span><span><i style="background:#e07b00"></i>العمال</span><span><i style="background:#7b1fa2"></i>أخرى</span><span><i style="background:#2f9e55"></i>الربح</span></div>`:`<div class="notice small">أدخل قيمة المشروع في تبويب الملخص أو المالية لحساب الربح.</div>`}
   ${!pos?`<div class="notice small" style="border:1px solid var(--bad)">⚠️ المصروفات أكبر من قيمة المشروع بمبلغ <b class="num">${money(-k.profit)}</b> درهم.</div>`:""}</div>
  <div class="panel"><div class="row" style="justify-content:space-between"><h2>أجور العمال</h2><span class="small">الإجمالي <b class="num">${money(k.lab)}</b></span></div>
   <p class="small muted" style="margin:0">عدد العمال × عدد الأيام × الأجر اليومي، أو اكتب مبلغاً مباشراً (مقاول باطن مثلاً).</p>
   ${(s.labor||[]).length?`<div class="list">${s.labor.map((l,i)=>`<div class="entry">
     <label>التاريخ<input id="lb-${l.id}-d" data-lb="${i}.date" type="date" value="${esc(l.date)}"></label>
     <label>الطريقة<select id="lb-${l.id}-m" data-lb="${i}.mode"><option value="calc" ${l.mode!=="amount"?"selected":""}>عمال × أيام × أجر يومي</option><option value="amount" ${l.mode==="amount"?"selected":""}>مبلغ مباشر</option></select></label>
     <label class="full">البيان<input id="lb-${l.id}-s" data-lb="${i}.desc" value="${esc(l.desc)}" placeholder="مثال: تركيب زجاج الواجهة الأمامية"></label>
     ${l.mode==="amount"?`<label class="full">المبلغ (درهم)<input id="lb-${l.id}-a" data-lb="${i}.amount" type="number" inputmode="decimal" value="${n(l.amount)}"></label>`
       :`<label>عدد العمال<input id="lb-${l.id}-w" data-lb="${i}.workers" type="number" inputmode="numeric" value="${n(l.workers)}"></label><label>عدد الأيام<input id="lb-${l.id}-y" data-lb="${i}.days" type="number" inputmode="decimal" value="${n(l.days)}"></label>
       <label>الأجر اليومي (درهم)<input id="lb-${l.id}-r" data-lb="${i}.rate" type="number" inputmode="decimal" value="${n(l.rate)}"></label><div style="align-self:end" class="small">= <b class="num">${money(laborAmt(l))}</b> درهم</div>`}
     <div class="full"><button class="ghost danger small ${S.armed===l.id?"armed":""}" data-act="dellb" data-id="${l.id}">${S.armed===l.id?"تأكيد الحذف":"حذف"}</button></div></div>`).join("")}</div>`:`<div class="empty">لم تُسجل أجور بعد.</div>`}
   <div class="row"><button class="primary" data-act="addlb">+ أجور</button></div></div>
  <div class="panel"><div class="row" style="justify-content:space-between"><h2>مصاريف أخرى</h2><span class="small">الإجمالي <b class="num">${money(k.oth)}</b></span></div>
   <p class="small muted" style="margin:0">نقل، رافعة، سقالات، تصاريح، وقود…</p>
   ${(s.otherCosts||[]).length?`<div class="list">${s.otherCosts.map((o,i)=>`<div class="entry">
     <label>التاريخ<input id="oc-${o.id}-d" data-oc="${i}.date" type="date" value="${esc(o.date)}"></label>
     <label>المبلغ (درهم)<input id="oc-${o.id}-a" data-oc="${i}.amount" type="number" inputmode="decimal" value="${n(o.amount)}"></label>
     <label class="full">البيان<input id="oc-${o.id}-s" data-oc="${i}.desc" value="${esc(o.desc)}"></label>
     <div class="full"><button class="ghost danger small ${S.armed===o.id?"armed":""}" data-act="deloc" data-id="${o.id}">${S.armed===o.id?"تأكيد الحذف":"حذف"}</button></div></div>`).join("")}</div>`:`<div class="empty">لا توجد مصاريف أخرى.</div>`}
   <div class="row"><button data-act="addoc">+ مصروف</button></div></div>`;
}
function tMoney(s){
  const c=calc(s);
  return `<div class="panel"><div class="stats"><div class="stat"><span class="small muted">إجمالي المشروع</span><b class="num">${money(c.total)}</b></div>
   <div class="stat hl"><span class="small muted">المتبقي</span><b class="num">${money(c.remaining)}</b></div></div>
   <label>إجمالي قيمة المشروع (درهم)<input id="f-total2" data-f="total" type="number" inputmode="decimal" value="${esc(s.total)}"></label></div>
  ${scheduleHtml(s)}
  <div class="panel"><h2>الدفعات المستلمة</h2>
  ${s.payments.length?`<div class="list">${s.payments.map((p,i)=>`<div class="entry">
    <div class="full"><div class="seg pmseg">${Object.entries(PM).map(([k,[l,ic]])=>`<button aria-pressed="${pmOf(p)===k}" data-act="setpm" data-id="${p.id}" data-m="${k}">${ic} ${l}</button>`).join("")}</div></div>
    ${pf(i,"date","التاريخ",p.date,"date")}${pf(i,"amount","المبلغ (درهم)",p.amount,"number")}
    ${pmOf(p)==="cheque"?pf(i,"chequeNo","رقم الشيك",p.chequeNo||"")+pf(i,"bank","البنك",p.bank||""):pmOf(p)==="transfer"?pf(i,"ref","رقم مرجع التحويل",p.ref||"")+pf(i,"bank","البنك",p.bank||""):pf(i,"ref","رقم سند القبض (اختياري)",p.ref||"")+pf(i,"receivedBy","استلمها",p.receivedBy||"")}
    <div class="full">${pf(i,"note","البيان / اسم الدافع",p.note)}</div>
    <div class="full row">${p.fileId?(p.fileType==="image"?`<button class="invbtn" data-act="viewdoc" data-k="pay" data-id="${p.id}" aria-label="فتح للمراجعة"><img class="inv" src="${blobUrl(p.fileId)}" alt="${PM[pmOf(p)][2]}"><span>🔍 فتح للمراجعة</span></button>`:`<span class="chip">ملف PDF مرفق</span>`):""}
      <button class="${p.invoice?"":"primary"}" data-act="taxinv" data-id="${p.id}">🧾 ${p.invoice?`فاتورة <bdi class="u" dir="ltr">${esc(p.invoice.no)}</bdi>`:"إصدار فاتورة ضريبية"}</button>
      <button data-act="chq" data-id="${p.id}">${p.fileId?"تغيير ":"إرفاق "}${PM[pmOf(p)][2]}</button>
      <button class="ghost danger ${S.armed===p.id?"armed":""}" data-act="delpay" data-id="${p.id}">${S.armed===p.id?"تأكيد الحذف":"حذف الدفعة"}</button></div></div>`).join("")}</div>`
    :`<div class="empty">لم تُسجل دفعات بعد.</div>`}
  <h3>+ تسجيل دفعة جديدة</h3>${payMethodBtns()}</div>
  <div class="panel"><h2>عرض السعر</h2><p class="small muted" style="margin:0">أرفق صور أو ملف عرض السعر المعتمد للمشروع.</p>
  ${(s.quotes||[]).length?`<div class="thumbs">${s.quotes.map(q=>`<div class="thumb">${q.fileType==="image"?`<img src="${blobUrl(q.fileId)}" alt="عرض السعر">`:`<div class="empty">عرض سعر PDF</div>`}
    <div class="meta"><button class="ghost danger small ${S.armed===q.id?"armed":""}" data-act="delquote" data-id="${q.id}">${S.armed===q.id?"تأكيد الحذف":"حذف"}</button></div></div>`).join("")}</div>`
    :`<div class="empty">لم يُرفق عرض سعر بعد.</div>`}
  <div class="row"><button data-act="addquote">+ إرفاق عرض السعر</button></div></div>
  <div class="panel"><h2>ملاحظات التقرير المالي</h2><p class="small muted" style="margin:0">تظهر للمالك في التقرير المالي داخل إطار مميز. كل سطر يظهر كنقطة مستقلة.</p>
   <textarea id="f-finNotes" data-f="finNotes" rows="5" placeholder="مثال: نشكركم على ثقتكم. الدفعة القادمة مستحقة عند الانتهاء من تركيب الزجاج في الواجهة الأمامية.">${esc(s.finNotes||"")}</textarea>
   <label style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="f-finAuto" data-f="finAuto" style="width:auto" ${s.finAuto===false?"":"checked"}> إضافة ملخص تلقائي (نسبة التحصيل والإنجاز والمتبقي)</label></div>`;
}
const pf=(i,k,l,v,t="text")=>`<label>${l}<input id="p-${i}-${k}" data-p="${i}.${k}" type="${t}" ${t==="number"?'inputmode="decimal" min="0"':""} value="${esc(v)}"></label>`;
function tPurchases(s){
  const c=calc(s);
  return `<div class="panel"><div class="row" style="justify-content:space-between"><h2>المشتريات</h2><span class="small">الإجمالي <b class="num">${money(c.spent)}</b> درهم</span></div>
  ${purDraftHtml(s)}${s.purchases.length?`<div class="list">${s.purchases.map((p,i)=>p.cuId?cuPurRow(p):`<div class="entry">
    ${uf(i,"date","التاريخ",p.date,"date")}${uf(i,"amount","المبلغ (درهم)",p.amount,"number")}
    ${uf(i,"supplier","المورد",p.supplier)}${uf(i,"desc","البيان",p.desc)}
    <div class="full">${uf(i,"note","ملاحظة / إضافة",p.note||"")}</div>
    <div class="full row">${p.fileId?(p.fileType==="image"?`<button class="invbtn" data-act="viewdoc" data-k="pur" data-id="${p.id}" aria-label="فتح الفاتورة للمراجعة"><img class="inv" src="${blobUrl(p.fileId)}" alt="الفاتورة"><span>🔍 فتح للمراجعة</span></button>`:`<span class="chip">فاتورة PDF مرفقة</span>`):""}
      <button data-act="inv" data-id="${p.id}">${p.fileId?"تغيير الفاتورة":"إرفاق صورة الفاتورة"}</button>
      ${p.fileId&&p.fileType==="image"?`<button data-act="readinv" data-id="${p.id}">قراءة الفاتورة</button>`:""}
      <button class="ghost danger ${S.armed===p.id?"armed":""}" data-act="delpur" data-id="${p.id}">${S.armed===p.id?"تأكيد الحذف":"حذف"}</button></div></div>`).join("")}</div>`
    :`<div class="empty">لم تُسجل مشتريات بعد. أضف كل فاتورة مع صورتها.</div>`}
  <div class="row"><button class="primary" data-act="cuscan" data-cam="1" data-site="${s.id}">📷 تصوير فاتورة</button><button data-act="cuscan" data-site="${s.id}">+ فاتورة من المعرض</button><button data-act="addpur">+ إدخال يدوي</button></div>
  ${canRead?`<p class="small muted" style="margin:0">صوّر الفاتورة، وسيُقرأ منها اسم المورد والمبلغ والتاريخ تلقائياً. راجعها قبل الاعتماد.</p>`:""}</div>
  <div class="panel"><h2>ملاحظات وإضافات المشتريات</h2><p class="small muted" style="margin:0">ملاحظات داخلية تظهر في تقرير المشتريات فقط، ولا تظهر للمالك.</p>
   <textarea id="f-purNotes" data-f="purNotes" rows="4" placeholder="مثال: باقي توريد زجاج الواجهة الخلفية الأسبوع القادم. خصم 5% من المورد على الدفعة الثانية.">${esc(s.purNotes||"")}</textarea></div>`;
}
function purDraftHtml(s){ const d=S.purDraft; if(!d||d.site!==s.id) return "";
  const g=(k,l,t="text")=>`<label>${l}<input id="ud-${k}" data-ud="${k}" type="${t}" ${t==="number"?'inputmode="decimal" min="0"':'dir="auto"'} value="${esc(d[k]||"")}"></label>`;
  return `<div class="entry" style="border:2px solid var(--accent)"><div class="full"><b>📝 فاتورة جديدة (إدخال يدوي)</b> <span class="small muted">— لا تُحفظ حتى تضغط «✓ حفظ»</span></div>
    ${g("date","التاريخ","date")}${g("amount","المبلغ (درهم)","number")}${g("supplier","المورد")}${g("desc","البيان")}
    <div class="full">${g("note","ملاحظة / إضافة")}</div>
    <div class="full row"><button class="primary" data-act="purdraftok">✓ حفظ</button><button class="ghost" data-act="purdraftx">إلغاء</button></div></div>`; }
const uf=(i,k,l,v,t="text")=>`<label>${l}<input id="u-${i}-${k}" data-u="${i}.${k}" type="${t}" ${t==="number"?'inputmode="decimal" min="0"':""} value="${esc(v)}"></label>`;
function usedFaces(s){ return FACES.filter(([k])=>BASEF.includes(k)||floors(s).some(fl=>faceUsed(fl,k))); }
function faceName(k){ return (FACES.find(([x])=>x===k)||[])[1]||"عام"; }
function photoCard(p){ const i=S.sites[S.cur].photos.indexOf(p);
  return `<div class="thumb"><img src="${blobUrl(p.fileId)}" alt="${esc(p.caption)}" data-act="viewdoc" data-k="img" data-id="${p.fileId}" style="cursor:zoom-in">
    <div class="meta"><input id="ph-${p.id}" data-ph="${i}.caption" placeholder="وصف الصورة" value="${esc(p.caption)}">
    <select id="phf-${p.id}" data-ph="${i}.face"><option value="">عام</option>${usedFaces(S.sites[S.cur]).map(([k,l])=>`<option value="${k}" ${p.face===k?"selected":""}>${l}</option>`).join("")}</select>
    <button class="ghost danger small ${S.armed===p.id?"armed":""}" data-act="delph" data-id="${p.id}">${S.armed===p.id?"تأكيد الحذف":"حذف"}</button></div></div>`; }
function tPhotos(s){
  const pf=S.phFace??"";
  const groups=[["","عام"],...usedFaces(s)];
  const list=s.photos.filter(p=>(p.face||"")===pf);
  return `<div class="panel"><h2>صور الموقع حسب الواجهة</h2>
  <div class="seg">${groups.map(([k,l])=>`<button aria-pressed="${pf===k}" data-act="phface" data-face="${k}">${l} <span class="num">(${s.photos.filter(p=>(p.face||"")===k).length})</span></button>`).join("")}</div>
  ${list.length?`<div class="thumbs">${list.map(photoCard).join("")}</div>`
    :`<div class="empty">لا توجد صور بعد.</div>`}
  <div class="row"><button class="primary" data-act="addph" data-cam="1" data-face="${pf}">📷 تصوير</button><button data-act="addph" data-face="${pf}">+ من المعرض ${pf?"لـ"+faceName(pf):""}</button></div></div>`;
}

