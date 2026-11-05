/* ---------- users & roles ---------- */
const ROLES = {admin:["👑 صلاحيات كاملة","كل شيء"], eng:["👷 مهندس","الأعمال وتصوير الفواتير"], buyer:["🧾 مسؤول المشتريات","تصوير الفواتير فقط"]};
S.user=null; S.setLoaded=false; S.profiles=[]; S.loginList=null;
const users = () => S.profiles||[];
const AU = () => window.__auth;
function authMsg(e){ const m=String(e&&e.message||e||""); const st=e&&e.status;
  if(st===401||/invalid login|wrong pin/i.test(m)) return "الرمز غير صحيح";
  if(st===423||/locked/i.test(m)) return "توقف الدخول بعد محاولات خاطئة كثيرة. اطلب من صاحب الصلاحيات الكاملة رمزاً جديداً";
  if(st===429||/rate|too many/i.test(m)) return "محاولات كثيرة، انتظر دقيقة ثم حاول مرة أخرى";
  if(/name exists/i.test(m)) return "هذا الاسم موجود";
  if(/network|fetch/i.test(m)) return "تعذر الاتصال، تحقق من الإنترنت";
  return "تعذر التنفيذ: "+m; }
async function loadLoginList(){ try{ S.loginList=await AU().list(); }catch(e){ S.loginList=S.loginList||[]; toast(authMsg(e)); } render(); }
// nobody signed in: full access only in the offline (local) mode; with the database, no rights until the account is known
const role = () => S.user ? (S.user.role||"admin") : (S.mode==="db" ? "" : "admin");
const isAdmin = () => role()==="admin", isEng = () => role()==="eng", isBuyer = () => role()==="buyer";
async function pinHash(uidv, pin){
  const data=new TextEncoder().encode("aseel|"+uidv+"|"+pin);
  try{ const h=await crypto.subtle.digest("SHA-256",data); return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,"0")).join(""); }
  catch(e){ let h=0; for(const c of data) h=(h*31+c)>>>0; return "x"+h.toString(16); }
}
function checkLogin(){}
function onAuth(st){
  const was=S.user&&S.user.id; S.profiles=st.profiles||[]; S.user=st.user?{...st.user}:null; S.setLoaded=!!st.ready;
  if(S.user){ cuMe=S.user.name; if(was!==S.user.id){ S.view="list"; S.loginPick=null; S.loginList=null; setTimeout(refreshPush,500);
    if(window.__push&&window.Notification&&Notification.permission==="granted") window.__push.enable(S.user.id,S.user.name).catch(()=>{}); } }
  else if(S.setLoaded&&!S.loginList) loadLoginList();
  if(!document.activeElement || !document.activeElement.matches("input,textarea,select") || was!==(S.user&&S.user.id)) render(); }
async function logout(){ S.view="list"; S.loginPick=null; S.cuPick=null; S.sites={}; S.cu={}; S.mk={}; try{ await AU().signOut(); }catch(e){} S.user=null; S.loginList=null; loadLoginList(); render(); }
function userChip(){ return S.user?`<span class="userchip"><bdi class="u">${esc(S.user.name)}</bdi><button class="ghost xs" data-act="aumypin" aria-label="تغيير رمز الدخول">🔑</button><button class="logoutbtn" data-act="aulogoutask"><span aria-hidden="true">🚪</span> <span>خروج</span></button></span>`:""; }
function logoutSheet(){ return `<div class="sheet logoutsheet" role="dialog" aria-label="تسجيل الخروج؟"><h3>🚪 <span>تسجيل الخروج؟</span></h3><p class="muted" style="margin:4px 0 12px"><span>ستحتاج إلى رمز الدخول (PIN) للدخول مرة أخرى.</span></p><div class="row"><button class="logoutyes big" data-act="aulogout">نعم، خروج</button><button class="ghost" data-act="aulogoutno">إلغاء</button></div></div>`; }
function pinChangeView(){ const forced=!!S.user.mustChange;
  return `<div class="top"><div class="brand"><span class="eyebrow u">${esc(coName())}</span><h1>🔑 ${forced?"اختر رمز دخول جديداً":"تغيير رمز الدخول"}</h1></div><button class="lang ghost" data-act="lang"><bdi class="u">${lang==="en"?"عربي":"English"}</bdi></button></div>
   <div class="panel loginbox"><p style="margin:0"><b><bdi class="u">${esc(S.user.name)}</bdi></b>${forced?"، هذا أول دخول لك. اختر رمزاً خاصاً بك لا يعرفه غيرك.":""}</p>
    <label>الرمز الجديد (4 إلى 6 أرقام)<input id="au-new1" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="new-password" dir="ltr"></label>
    <label>أعد كتابة الرمز الجديد<input id="au-new2" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="new-password" dir="ltr"></label>
    <div class="row"><button class="primary big" data-act="aupinset">حفظ الرمز الجديد</button>${forced?`<button class="ghost" data-act="aulogout">خروج</button>`:`<button class="ghost" data-act="aupinx">إلغاء</button>`}</div></div>`; }
function loginView(){
  if(!S.loginList) return `<div class="empty">جارٍ التحميل…</div>`;
  const us=S.loginList;
  const top=`<div class="top"><div class="brand"><span class="eyebrow u">${esc(coName())}</span><h1>${!us.length?"إعداد أول مستخدم":"تسجيل الدخول"}</h1>${TAGLINE()}</div><button class="lang ghost" data-act="lang"><bdi class="u">${lang==="en"?"عربي":"English"}</bdi></button></div>`;
  if(!us.length) return top+`<div class="panel loginbox"><p class="small" style="margin:0">أنشئ حسابك الأول بصلاحيات كاملة. بعدها تضيف بقية المستخدمين من الإعدادات.</p>
    <label>الاسم<input id="au-name" autocomplete="off" placeholder="مثال: هشام"></label>
    <label>رمز الدخول (PIN) من 4 إلى 6 أرقام<input id="au-pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="new-password" dir="ltr"></label>
    <button class="primary big" data-act="ausetup">إنشاء الحساب والدخول</button></div>`;
  if(!S.loginPick) return top+`<h2>من أنت؟</h2><div class="userlist">${us.map(u=>`<button class="userbtn" data-act="aupick" data-id="${esc(u.id)}"><span class="qic">${ROLES[u.role]?ROLES[u.role][0].split(" ")[0]:"👤"}</span><b><bdi class="u">${esc(u.name)}</bdi></b><span class="small muted">${(ROLES[u.role]||["",""])[0].replace(/^\S+\s/,"")}</span></button>`).join("")}</div>`;
  const u=us.find(x=>x.id===S.loginPick);
  return top+`<div class="panel loginbox"><h2 style="margin:0"><bdi class="u">${esc(u?u.name:"")}</bdi></h2>
    <label>رمز الدخول (PIN)<input id="au-pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="current-password" dir="ltr" autofocus></label>
    <div class="row"><button class="primary big" data-act="aulogin">دخول</button><button class="ghost" data-act="aupickx">→ رجوع</button></div></div>`;
}
function pushPanel(){
  if(!window.__push) return "";
  const st=S.pushState||"…"; const mine=users().find(u=>S.user&&u.id===S.user.id);
  const txt={on:"✅ الإشعارات مفعّلة على هذا الجهاز",off:"🔕 الإشعارات غير مفعّلة على هذا الجهاز",denied:"⛔ الإشعارات محظورة من إعدادات المتصفح",unsupported:"هذا المتصفح لا يدعم الإشعارات. على الآيفون: أضف التطبيق للشاشة الرئيسية أولاً، ثم افتحه منها.","…":"…"}[st]||st;
  return `<div class="panel pushbox"><h2>🔔 الإشعارات</h2><p class="small" style="margin:0">${txt}</p>
   ${st==="denied"?`<p class="small muted" style="margin:0">افتح إعدادات الموقع في Chrome (🔒 بجانب الرابط)، ثم «الإشعارات»، ثم «السماح».</p>`:""}
   <div class="row">${st==="off"?`<button class="primary" data-act="aupushon">🔔 تفعيل الإشعارات</button>`:""}${st==="on"?`<button data-act="aupushtest">إرسال إشعار تجريبي</button><button class="ghost" data-act="aupushoff">إيقاف</button>`:""}</div>
   ${mine&&!mine.notifyLow&&isAdmin()?`<p class="small muted" style="margin:0">لتصلك تنبيهات العهدة، فعّل «يستقبل تنبيه انخفاض رصيد العهدة» لاسمك في المستخدمين.</p>`:""}</div>`;
}
async function refreshPush(){ if(!window.__push) return; try{ S.pushState=await window.__push.state(); }catch(e){ S.pushState="off"; } render(); }
function cuCheckLow(){ if(!window.__push||S.mode!=="db"||!S.cuLoaded||!isAdmin()) return; clearTimeout(cuT._low);
  cuT._low=setTimeout(()=>{ if(!S.user||!isAdmin()) return; // re-check: the account may have changed in the meantime
    const c=cuCalc(); const sent=S.settings.cuLowSent;
    if(c.isLow&&!sent){ S.settings.cuLowSent=Date.now(); settingsSave(); const ids=users().filter(u=>u.notifyLow).map(u=>u.id);
      if(ids.length) window.__push.notify(ids, c.mainBal<0?"⚠️ رصيد العهدة بالسالب":"⚠️ رصيد العهدة منخفض", `الرصيد الحالي ${money(c.mainBal)} درهم، والحد الأدنى ${money(c.low)} درهم. نحتاج توريداً جديداً.`, "low").catch(e=>console.warn("push",e)); }
    else if(!c.isLow&&sent){ S.settings.cuLowSent=null; settingsSave(); } },4000); }
function canBackup(){ if(!S.user||!isAdmin()) return false; const us=users(); const any=us.some(u=>u.canBackup);
  const me=us.find(u=>u.id===S.user.id); if(any) return !!(me&&me.canBackup); return !!(me&&me.role==="admin"&&me.id===((us.find(u=>u.role==="admin")||{}).id)); }
async function loadAutoBk(){ if(!window.__sb||S.autoBkBusy) return; S.autoBkBusy=true;
  try{ const {data,error}=await window.__sb.from("backups").select("id,at,kind,size").order("at",{ascending:false}).limit(30); if(error) throw error; S.autoBk=data||[]; }
  catch(e){ S.autoBk=[]; S.autoBkErr=true; } S.autoBkBusy=false; render(); }
async function getAutoBk(id){ const {data,error}=await window.__sb.from("backups").select("data").eq("id",id).maybeSingle(); if(error||!data) throw new Error(error&&error.message||"not found"); return data.data; }
function autoBkHtml(){
  if(!window.__sb) return "";
  if(!S.autoBk){ setTimeout(loadAutoBk,0); return `<p class="small muted" style="margin:0">جارٍ تحميل النسخ التلقائية…</p>`; }
  if(!S.autoBk.length) return `<p class="small muted" style="margin:0">${S.autoBkErr?tr("النسخ التلقائية غير مفعّلة بعد في قاعدة البيانات."):tr("لا توجد نسخ تلقائية بعد. أول نسخة تُحفظ الليلة الساعة 4 فجراً.")}</p>`;
  const fmt=a=>{ const d=new Date(a); return ldate(d)+" "+d.toLocaleTimeString(lang==="en"?"en-GB":"ar-AE",{hour:"2-digit",minute:"2-digit"}); };
  return `<h3 style="margin:6px 0 0">🕓 النسخ التلقائية اليومية</h3><p class="small muted" style="margin:0">تُحفظ نسخة كاملة كل يوم الساعة 4 فجراً، ويُحتفظ بآخر 30 يوماً.</p>
   <div class="list">${S.autoBk.slice(0,S.autoBkAll?30:5).map(b=>`<div class="entry"><div class="full row" style="justify-content:space-between;align-items:center"><span class="num">${esc(fmt(b.at))}${b.kind!=="auto"?` <span class="chip ex">${tr("يدوية")}</span>`:""}</span>
     <span class="row"><button class="small" data-act="bkautodl" data-id="${b.id}">📥 تنزيل</button><button class="small" data-act="bkautorestore" data-id="${b.id}">♻️ استعادة</button></span></div></div>`).join("")}</div>
   ${S.autoBk.length>5&&!S.autoBkAll?`<button class="ghost small" data-act="bkautoall">${tr("عرض كل النسخ")} (<span class="num">${S.autoBk.length}</span>)</button>`:""}`;
}
function backupPanel(){
  if(!canBackup()) return "";
  const lastAuto=S.autoBk&&S.autoBk[0]?new Date(S.autoBk[0].at).getTime():0;
  const last=Math.max(S.settings.lastBackup||0,lastAuto)||null; const days=last?Math.floor((Date.now()-last)/86400000):null; const old=days===null||days>=7;
  const r=S.restore;
  return `<details class="panel" ${S.bkOpen||old||r?"open":""}><summary style="cursor:pointer;font-weight:600" data-act="bkopen">💾 النسخ الاحتياطي ${old?`<span class="chip bad">${days===null?tr("لم تُحفظ نسخة بعد"):tr("آخر نسخة قبل ")+days+tr(" يوم")}</span>`:""}</summary>
   <p class="small muted" style="margin:0">ملف واحد فيه كل البيانات: المواقع، والعلامات، والعهدة، والإعدادات. احفظه في مكان آمن مرة كل أسبوع على الأقل. الصور تبقى محفوظة في التخزين ولا تُنسخ داخل الملف.</p>
   ${last?`<p class="small" style="margin:0">آخر نسخة: <span class="num">${esc(ldate(new Date(last)))}</span>${S.settings.lastBackupBy?" — "+esc(S.settings.lastBackupBy):""}</p>`:""}
   <div class="row"><button class="primary" data-act="bkmake">💾 تنزيل نسخة احتياطية الآن</button><button data-act="bkpick">📂 استعادة من ملف</button></div>
   ${pdfNotice("backup")}
   ${autoBkHtml()}
   ${r?`<div class="notice small" style="border:1px solid var(--bad)"><b>استعادة نسخة <span class="num">${esc((r.at||"").slice(0,10))}</span></b>
     <span>فيها <span class="num">${Object.keys(r.sites||{}).length}</span> موقع، و<span class="num">${Object.keys(r.custody||{}).length}</span> حركة عهدة، و<span class="num">${Object.keys(r.marks||{}).length}</span> علامة. تُكتب فوق البيانات التي لها نفس المعرّف، ولا يُحذف شيء آخر. المستخدمون الحاليون يبقون كما هم.</span>
     <div class="row"><button class="danger ${S.armed==="bkrestore"?"armed":""}" data-act="bkrestore">${S.armed==="bkrestore"?"اضغط مرة أخرى لتأكيد الاستعادة":"♻️ استعادة"}</button><button class="ghost" data-act="bkcancel">إلغاء</button></div></div>`:""}</details>`;
}
async function makeBackup(){
  const strip=JSON.parse(JSON.stringify(S.sites)); Object.values(strip).forEach(x=>(x.floors||[]).forEach(fl=>Object.values(fl.faces||{}).forEach(f=>{ f.marks=[]; })));
  const data={app:"aseel",version:1,at:new Date().toISOString(),by:cuMe||"",sites:strip,marks:S.mk,custody:S.cu,docs:S.docs,settings:S.settings};
  const blob=new Blob([JSON.stringify(data)],{type:"application/json"});
  if(!downloads) throw new Error(tr("الحفظ غير متاح في هذا العرض"));
  await downloads.save({filename:`aseel-backup-${today()}.json`,data:blob}); S.lastPdf="backup";
  S.settings.lastBackup=Date.now(); S.settings.lastBackupBy=cuMe||""; settingsSave();
}
function usersPanel(){
  if(!isAdmin()) return "";
  return `<details class="panel" ${S.usersOpen?"open":""}><summary style="cursor:pointer;font-weight:600" data-act="auopen">👥 المستخدمون والصلاحيات</summary>
   <div class="list">${users().map(u=>`<div class="entry"><div class="full row" style="justify-content:space-between"><b><bdi class="u">${esc(u.name)}</bdi>${S.user&&u.id===S.user.id?` <span class="chip done">أنت</span>`:""}${u.mustChange?` <span class="chip ex">لم يغيّر رمزه بعد</span>`:""}</b>
     <select data-aurole="${esc(u.id)}" ${S.user&&u.id===S.user.id?"disabled":""}>${Object.entries(ROLES).map(([k,[l]])=>`<option value="${k}" ${u.role===k?"selected":""}>${l}</option>`).join("")}</select></div>
     <label class="full small" style="display:flex;flex-direction:row;gap:8px;align-items:center;cursor:pointer;color:var(--fg)"><input type="checkbox" data-aubackup="${esc(u.id)}" ${u.canBackup?"checked":""} style="width:auto;min-height:0"> 💾 يستطيع النسخ الاحتياطي والاستعادة</label>
     <label class="full small" style="display:flex;flex-direction:row;gap:8px;align-items:center;cursor:pointer;color:var(--fg)"><input type="checkbox" data-aunotify="${esc(u.id)}" ${u.notifyLow?"checked":""} style="width:auto;min-height:0"> 🔔 يستقبل تنبيه انخفاض رصيد العهدة</label>
     <label class="full small" style="display:flex;flex-direction:row;gap:8px;align-items:center;cursor:pointer;color:var(--fg)"><input type="checkbox" data-ausalary="${esc(u.id)}" ${u.notifySalary?"checked":""} style="width:auto;min-height:0"> 👔 يستقبل تذكير المرتبات (يوم 25 الساعة 10 صباحاً)</label>
     <div class="full row"><input id="au-np-${esc(u.id)}" type="password" inputmode="numeric" maxlength="6" placeholder="رمز جديد" dir="ltr" style="width:120px"><button data-act="aunewpin" data-id="${esc(u.id)}">تغيير الرمز</button>
     ${S.user&&u.id===S.user.id?"":`<button class="ghost danger ${S.armed==="au"+u.id?"armed":""}" data-act="audel" data-id="${esc(u.id)}">${S.armed==="au"+u.id?"تأكيد الحذف":"حذف"}</button>`}</div></div>`).join("")}</div>
   <h3>+ مستخدم جديد</h3><div class="grid2"><label>الاسم<input id="au-add-name" autocomplete="off"></label>
   <label>الصلاحية<select id="au-add-role">${Object.entries(ROLES).map(([k,[l,d]])=>`<option value="${k}">${l} — ${d}</option>`).join("")}</select></label>
   <label>رمز الدخول (PIN)<input id="au-add-pin" type="password" inputmode="numeric" maxlength="6" dir="ltr" autocomplete="new-password"></label></div>
   <button class="primary" data-act="auadd">إضافة المستخدم</button>
   <p class="small muted" style="margin:0">👑 صلاحيات كاملة: كل شيء. 👷 مهندس: الواجهات والإنجاز والصور والمشاكل وتقرير الأعمال وتصوير الفواتير، بدون المالية والعهدة. 🧾 مسؤول المشتريات: تصوير الفواتير فقط.</p></details>`;
}
const pinOk = p => /^\d{4,6}$/.test(p||"");
app.addEventListener("change", e=>{ const t=e.target;
  const upd=async(id,patch,ok)=>{ try{ await AU().update(id,patch); toast(ok); }catch(err){ toast(authMsg(err)); render(); } };
  if(t.dataset&&t.dataset.aubackup){ const us=users(); const u=us.find(x=>x.id===t.dataset.aubackup); if(!u) return;
    if(!t.checked&&!us.some(x=>x.canBackup&&x.id!==u.id)&&!(us.every(x=>!x.canBackup))){ t.checked=true; toast("يجب أن يبقى شخص واحد على الأقل يستطيع النسخ الاحتياطي"); return; }
    (async()=>{ if(t.checked&&!us.some(x=>x.canBackup)&&S.user&&S.user.id!==u.id) await AU().update(S.user.id,{canBackup:true}).catch(()=>{});
      upd(u.id,{canBackup:t.checked},t.checked?"💾 "+u.name+" "+tr("يستطيع النسخ الاحتياطي"):tr("تم إلغاء صلاحية النسخ الاحتياطي")); })(); return; }
  if(t.dataset&&t.dataset.aunotify){ const u=users().find(x=>x.id===t.dataset.aunotify); if(u) upd(u.id,{notifyLow:t.checked},t.checked?tr("🔔 سيصله تنبيه انخفاض العهدة"):tr("لن يصله تنبيه العهدة")); return; }
  if(t.dataset&&t.dataset.ausalary){ const u=users().find(x=>x.id===t.dataset.ausalary); if(u) upd(u.id,{notifySalary:t.checked},t.checked?tr("👔 سيصله تذكير المرتبات يوم 25"):tr("لن يصله تذكير المرتبات")); return; }
  if(t.dataset&&t.dataset.aurole){ const u=users().find(x=>x.id===t.dataset.aurole); if(u) upd(u.id,{role:t.value},tr("تم تغيير الصلاحية")); } });
app.addEventListener("keydown", e=>{ if(e.key==="Enter"&&e.target.id==="au-new2"){ const b=document.querySelector('[data-act="aupinset"]'); b&&b.click(); return; } if(e.key==="Enter"&&e.target.id==="au-pin"){ const b=document.querySelector('[data-act="aulogin"],[data-act="ausetup"]'); b&&b.click(); } });
app.addEventListener("click", async e=>{
  const b=e.target.closest("[data-act]"); if(!b) return; const a=b.dataset.act; if(!/^(au|bk)/.test(a)) return; const id=b.dataset.id;
  const val=x=>(document.getElementById(x)||{}).value||"";
  if(a==="aupick"){ S.loginPick=id; render(); setTimeout(()=>{ const el=document.getElementById("au-pin"); el&&el.focus(); },50); }
  else if(a==="aupickx"){ S.loginPick=null; render(); }
  else if(a==="aulogoutask"){ S.logoutAsk=true; render(); }
  else if(a==="aulogoutno"){ S.logoutAsk=false; render(); }
  else if(a==="aulogout"){ S.logoutAsk=false; S.pinView=false; logout(); }
  else if(a==="aupushon"){ b.disabled=true; try{ await window.__push.enable(S.user.id,S.user.name); toast("✓ تم تفعيل الإشعارات"); }catch(e){ toast(String(e&&e.message)==="denied"?"لم يُسمح بالإشعارات":"تعذر التفعيل: "+(e&&e.message||"")); } refreshPush(); }
  else if(a==="aupushoff"){ try{ await window.__push.disable(); }catch(e){} toast("تم إيقاف الإشعارات على هذا الجهاز"); refreshPush(); }
  else if(a==="aupushtest"){ b.disabled=true; try{ const r=await window.__push.test(); toast(r.sent?"✓ أُرسل الإشعار، سيصلك خلال ثوانٍ":"لم يُرسل الإشعار، فعّل الإشعارات مرة أخرى"); }catch(e){ toast("تعذر الإرسال: "+(e&&e.message||"")); } b.disabled=false; }
  else if(a==="bkopen"){ S.bkOpen=!b.closest("details").open; }
  else if((a==="bkmake"||a==="bkpick"||a==="bkrestore")&&!canBackup()){ toast("ليست لديك صلاحية النسخ الاحتياطي"); return; }
  else if(a==="bkmake"){ if(S.busy) return; S.busy="bk"; b.disabled=true; b.textContent=tr("جارٍ التجهيز…"); try{ await makeBackup(); toast("✓ تم تنزيل النسخة الاحتياطية"); }catch(err){ toast("تعذر الحفظ: "+(err&&err.message||"")); } S.busy=false; S.bkOpen=true; render(); }
  else if(a==="bkpick"){ const files=await pickFiles("application/json,.json",false); if(!files.length) return;
    try{ const d=JSON.parse(await files[0].text()); if(d.app!=="aseel"||!d.sites) throw 0; S.restore=d; S.bkOpen=true; render(); }catch(err){ toast("هذا الملف ليس نسخة احتياطية من التطبيق"); } }
  else if(a==="bkcancel"){ S.restore=null; render(); }
  else if(a==="bkautoall"){ S.autoBkAll=true; S.bkOpen=true; render(); }
  else if(a==="bkautodl"){ b.disabled=true; try{ const d=await getAutoBk(id); const blob=new Blob([JSON.stringify(d)],{type:"application/json"});
      await downloads.save({filename:`aseel-backup-${String(d.at||"").slice(0,10)||today()}-auto.json`,data:blob}); S.lastPdf="backup"; S.bkOpen=true; render(); }
    catch(err){ b.disabled=false; toast(tr("تعذر تنزيل النسخة: ")+(err&&err.message||"")); } }
  else if(a==="bkautorestore"){ b.disabled=true; try{ const d=await getAutoBk(id); if(d.app!=="aseel"||!d.sites) throw new Error("format"); S.restore=d; S.bkOpen=true; render(); }
    catch(err){ b.disabled=false; toast(tr("تعذر فتح النسخة: ")+(err&&err.message||"")); } }
  else if(a==="bkrestore"){ const k="bkrestore"; if(S.armed!==k){ S.armed=k; setTimeout(()=>{ if(S.armed===k){ S.armed=null; render(); } },5000); render(); return; } S.armed=null;
    const d=S.restore; S.restore=null; let n=0;
    Object.values(d.sites||{}).forEach(x=>{ S.sites[x.id]=x; save(x); n++; });
    Object.values(d.marks||{}).forEach(m=>{ delete tomb[m.id]; putMark(m); });
    Object.values(d.custody||{}).forEach(x=>{ delete cuTomb[x.id]; S.cu[x.id]=x; cuPut(x,true); });
    Object.values(d.docs||{}).forEach(x=>{ if(x&&x.id) docPut({...x}).catch(()=>{}); });
    if(d.settings){ const st={...S.settings,...d.settings}; delete st.users; S.settings=st; settingsSave(); }
    toast(tr("✓ تمت الاستعادة: ")+n); render(); }
  else if(a==="aumypin"){ S.pinView=true; render(); setTimeout(()=>{ const el=document.getElementById("au-new1"); el&&el.focus(); },50); }
  else if(a==="aupinx"){ S.pinView=false; render(); }
  else if(a==="aupinset"){ if(!S.user) return; const p1=val("au-new1"), p2=val("au-new2");
    if(!pinOk(p1)){ toast("الرمز من 4 إلى 6 أرقام"); return; } if(p1!==p2){ toast("الرمزان غير متطابقين"); const el=document.getElementById("au-new2"); if(el){ el.value=""; el.focus(); } return; }
    b.disabled=true; try{ await AU().setPin(S.user.id,p1); S.user.mustChange=false; S.pinView=false; render(); toast("✓ تم حفظ رمزك الجديد"); }catch(err){ b.disabled=false; toast(authMsg(err)); } }
  else if(a==="auopen"){ S.usersOpen=!b.closest("details").open; }
  else if(a==="ausetup"){ const name=val("au-name").trim(), pin=val("au-pin"); if(!name){ toast("اكتب الاسم"); return; } if(!pinOk(pin)){ toast("الرمز من 4 إلى 6 أرقام"); return; }
    b.disabled=true; try{ await AU().bootstrap(name,pin); S.usersOpen=true; toast("أهلاً "+name+" — أضف بقية المستخدمين من «المستخدمون والصلاحيات»"); }catch(err){ b.disabled=false; toast(authMsg(err)); } }
  else if(a==="aulogin"){ const u=(S.loginList||[]).find(x=>x.id===S.loginPick); const pin=val("au-pin"); if(!u) return; if(!pinOk(pin)){ toast("الرمز من 4 إلى 6 أرقام"); return; }
    b.disabled=true; b.textContent=tr("جارٍ الدخول…");
    try{ await AU().signIn(u,pin); window.scrollTo(0,0); }
    catch(err){ b.disabled=false; b.textContent=tr("دخول"); toast(authMsg(err)); const el=document.getElementById("au-pin"); if(el){ el.value=""; el.focus(); } } }
  else if(a==="auadd"){ if(!isAdmin()) return; const name=val("au-add-name").trim(), pin=val("au-add-pin"), r=val("au-add-role")||"admin";
    if(!name){ toast("اكتب الاسم"); return; } if(users().some(x=>x.name.trim()===name)){ toast("هذا الاسم موجود"); return; } if(!pinOk(pin)){ toast("الرمز من 4 إلى 6 أرقام"); return; }
    b.disabled=true; try{ await AU().create(name,r,pin); S.usersOpen=true; toast("تمت إضافة "+name); render(); }catch(err){ b.disabled=false; toast(authMsg(err)); } }
  else if(a==="aunewpin"){ if(!isAdmin()) return; const u=users().find(x=>x.id===id); const pin=val("au-np-"+id); if(!u) return; if(!pinOk(pin)){ toast("الرمز من 4 إلى 6 أرقام"); return; }
    b.disabled=true; try{ await AU().setPin(u.id,pin); S.usersOpen=true; toast("تم تغيير الرمز"); render(); }catch(err){ b.disabled=false; toast(authMsg(err)); } }
  else if(a==="audel"){ if(!isAdmin()) return; const k="au"+id; if(S.armed===k){ S.armed=null; S.usersOpen=true; try{ await AU().del(id); toast("🗑️ تم حذف المستخدم"); }catch(err){ toast(authMsg(err)); } render(); } else { S.armed=k; S.usersOpen=true; setTimeout(()=>{ if(S.armed===k){ S.armed=null; render(); } },4000); render(); } }
});

async function readCheque(p, file){
  try{
    const img = await compress(file, 1400);
    const d = await sample.json(`هذه صورة إثبات دفعة مستلمة لشركة في الإمارات: إما شيك بنكي، أو إشعار تحويل بنكي/لقطة شاشة من تطبيق بنكي، أو سند قبض. حدّد نوعها، واستخرج: المبلغ كرقم فقط، والتاريخ بصيغة YYYY-MM-DD، ورقم الشيك (إن كان شيكاً)، ورقم المرجع (إن كان تحويلاً أو سنداً)، واسم البنك، واسم الدافع أو صاحب الحساب. أجب بـ JSON فقط بهذا الشكل: {"type":"cheque|transfer|cash","amount":0,"date":"","chequeNo":"","ref":"","bank":"","payer":""}. اترك الحقل فارغاً إذا لم يكن واضحاً.`,
      { images:[img], cache:false });
    if(d && typeof d==="object"){
      if(["cheque","transfer","cash"].includes(d.type)) p.method=d.type;
      if(n(d.amount)>0) p.amount=n(d.amount);
      if(/^\d{4}-\d{2}-\d{2}$/.test(d.date||"")) p.date=d.date;
      if(d.chequeNo) p.chequeNo=String(d.chequeNo).slice(0,40);
      if(d.ref) p.ref=String(d.ref).slice(0,60);
      if(d.bank) p.bank=String(d.bank).slice(0,80);
      if((d.payer||d.drawer) && !p.note) p.note=String(d.payer||d.drawer).slice(0,120);
      save(site()); toast(p.method==="transfer"?"تمت قراءة إشعار التحويل، راجع المبلغ والتاريخ":"تمت قراءة الشيك، راجع المبلغ والتاريخ");
    }
  }catch(e){ toast(tr("تعذرت القراءة، أدخل البيانات يدوياً")+aiWhy(e)); }
}
async function attachInvoice(s, p, file, b){
  let f=file;
  if(f.type==="application/pdf"||/\.pdf$/i.test(f.name||"")){ const pages=await pdfPages(f,1); f=pages[0]; }
  const r=await upload(f); if(!r) return;
  if(!p.cuId) dropAsset(p.fileId); p.fileId=r.id; p.fileType=r.type; save(s);
  if(r.type!=="image") return;
  if(!canRead){ toast("قراءة الفاتورة تلقائياً غير متاحة في هذا العرض، أدخل المبلغ والمورد يدوياً"); return; }
  if(b) b.textContent=tr("جارٍ قراءة الفاتورة…");
  await readInvoice(p, f);
}
async function readInvoice(p, file){
  try{
    const img = await compress(file, 1400);
    const d = await sample.json(`هذه صورة فاتورة مشتريات (ألمنيوم/زجاج/سيليكون/مواد). استخرج منها: اسم المورد (البائع الذي أصدر الفاتورة، وليس المشتري)، والمبلغ الإجمالي النهائي شامل الضريبة كرقم فقط، وتاريخ الفاتورة بصيغة YYYY-MM-DD، ووصفاً مختصراً للمشتريات ${lang==="en"?"باللغة الإنجليزية":"بالعربية الفصحى"} في بضع كلمات. أجب بـ JSON فقط بهذا الشكل: {"supplier":"","amount":0,"date":"","desc":""}. اترك الحقل فارغاً إذا لم يكن واضحاً.`,
      { images:[img], cache:false });
    if(d && typeof d==="object"){
      if(!d.supplier && !(n(d.amount)>0)) { toast("لم أجد المبلغ أو اسم المورد في الصورة، صوّر الفاتورة بوضوح أو أدخلها يدوياً"); return; }
      if(d.supplier) p.supplier=String(d.supplier).slice(0,120);
      if(n(d.amount)>0) p.amount=n(d.amount);
      if(/^\d{4}-\d{2}-\d{2}$/.test(d.date||"")) p.date=d.date;
      if(d.desc && !p.desc) p.desc=String(d.desc).slice(0,160);
      save(site()); toast("تمت قراءة الفاتورة، راجع المبلغ واسم المورد");
    }
  }catch(e){ console.warn("invoice read",e);
    const c=e&&e.code; toast(c==="not_granted"?"لم يُسمح بقراءة الفاتورة. اضغط «قراءة الفاتورة» واختر السماح":c==="rate_limited"?"محاولات كثيرة، انتظر قليلاً ثم اضغط «قراءة الفاتورة»":c==="image_rejected"?"صيغة الصورة غير مدعومة، صوّرها مرة أخرى":"تعذرت قراءة الفاتورة، اضغط «قراءة الفاتورة» للمحاولة مرة أخرى"); }
}
function summaryText(s){
  const c=calc(s), L=tr, cur=L("درهم");
  const lines=[`*${L("تقرير موقع")}: ${s.name}*`, coName(), `${L("التاريخ")}: ${today()}`,
    `${L("الموقع")}: ${s.location||"—"}`, `${L("المهندس")}: ${s.engineer||"—"} ${s.engPhone||""}`, `${L("الاستشاري")}: ${s.consultant||"—"}`, "",
    ...(isEng()?[]:[`${L("إجمالي قيمة المشروع")}: ${money(c.total)} ${cur}`, `${L("المستلم")}: ${money(c.received)} ${cur}`, `${L("المتبقي")}: ${money(c.remaining)} ${cur}`, `${L("إجمالي المشتريات")}: ${money(c.spent)} ${cur}`, ""]),
    `${L("نسبة الإنجاز")}: ${c.pct}%`];
  s.items.forEach(it=>lines.push(`- ${dEN(it.name)}: ${n(it.qty)} | ${STAGES.map(([k,l])=>`${L(l)} ${n(it[k])}`).join(" | ")}`));
  if(s.notes) lines.push("", `${L("ملاحظات")}: ${s.notes}`);
  return lines.join("\n");
}

