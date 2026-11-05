/* ---------- look (Nov 2026 refresh): home list, settings screen, bottom bar, theme, empty states ---------- */
/* line icons (currentColor) so they follow the theme */
const IC={
  building:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21V5l8-3 8 3v16"/><path d="M8 8h2M14 8h2M8 12h2M14 12h2M8 16h2M14 16h2M3 21h18"/></svg>`,
  door:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 21V3h12v18"/><path d="M9 6h6v6H9zM3 21h18"/><circle cx="15" cy="15" r=".9"/></svg>`,
  rail:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h18M3 9v11M21 9v11M7.5 9v11M12 9v11M16.5 9v11M2 20h20"/></svg>`,
  sites:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21V5l8-3 8 3v16"/><path d="M9 21v-5h6v5M8 9h2M14 9h2M3 21h18"/></svg>`,
  wallet:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 8V5a1 1 0 0 0-1-1H6a2 2 0 0 0 0 4h13a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2V6"/><path d="M21 12v4h-4a2 2 0 0 1 0-4z"/></svg>`,
  report:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2zM9 13h6M9 17h6M9 9h1"/></svg>`,
  gear:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.3 4.3c.4-1.8 3-1.8 3.4 0a1.7 1.7 0 0 0 2.6 1.1c1.5-.9 3.3.8 2.4 2.4a1.7 1.7 0 0 0 1 2.5c1.8.4 1.8 3 0 3.4a1.7 1.7 0 0 0-1 2.6c.9 1.5-.9 3.3-2.4 2.4a1.7 1.7 0 0 0-2.6 1c-.4 1.8-3 1.8-3.4 0a1.7 1.7 0 0 0-2.5-1c-1.6.9-3.3-.9-2.4-2.4a1.7 1.7 0 0 0-1.1-2.6c-1.8-.4-1.8-3 0-3.4a1.7 1.7 0 0 0 1.1-2.5c-.9-1.6.8-3.3 2.4-2.4a1.7 1.7 0 0 0 2.5-1.1z"/><circle cx="12" cy="12" r="3"/></svg>`,
  search:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="m21 21-6-6"/></svg>`,
  plus:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`,
  alert:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 9v4M12 17h.01"/><path d="M10.2 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.8 3.9a2 2 0 0 0-3.6 0z"/></svg>`,
  frame:`<svg viewBox="0 0 120 96" aria-hidden="true"><rect x="14" y="10" width="92" height="76" rx="4"/><path d="M60 10v76M14 48h92"/><path d="M24 20l12 12M70 20l18 18M24 58l8 8" opacity=".5"/></svg>`,
  photo:`<svg viewBox="0 0 120 96" aria-hidden="true"><rect x="14" y="16" width="92" height="66" rx="6"/><circle cx="42" cy="40" r="8"/><path d="m14 72 28-22 20 16 14-10 30 22"/></svg>`,
  check:`<svg viewBox="0 0 120 96" aria-hidden="true"><circle cx="60" cy="48" r="32"/><path d="m45 49 10 10 21-22"/></svg>`
};
const ico = (k,cls="") => `<span class="ic ${cls}">${IC[k]||""}</span>`;
/* what kind of job a site is, from the items it has: facade work, doors only, or a handrail only */
function jobType(s){
  const its=(s.items||[]).filter(it=>n(it.qty)>0); const nm=it=>String(it.name||"");
  const isRail=it=>/هندريل|درابزين|درابزي|handrail|railing/i.test(nm(it)), isDoor=it=>/باب|أبواب|door/i.test(nm(it));
  if(its.length&&its.every(isRail)) return "rail";
  if(its.length&&its.every(isDoor)) return "door";
  return "building";
}
const JOBLBL={building:"واجهات ونوافذ",door:"أبواب فقط",rail:"هندريل فقط"};
/* one state per site drives the colour strip: issue > done > stopped > nearly done > running */
function siteState(s,c){ c=c||calc(s);
  if(s.status==="منتهي") return "done";
  if((s.issues||[]).some(x=>x.status!=="done")) return "issue";
  if(s.status==="متوقف") return "stop";
  if(c.pct>=80) return "near";
  return "run"; }
const STLBL={run:"جاري",near:"قارب الانتهاء",done:"منتهي",stop:"متوقف",issue:"فيه مشكلة"};
const SFILT=[["all","الكل"],["run","جاري"],["near","قارب الانتهاء"],["done","منتهي"],["issue","فيه مشكلات"]];
const fitFilter=(st,k)=>!k||k==="all"||(k==="run"?st==="run"||st==="near"||st==="issue":st===k);
function emptyHtml(icon,title,text,btn){ return `<div class="empty2">${ico(icon,"art")}<b>${title}</b>${text?`<span class="small muted">${text}</span>`:""}${btn||""}</div>`; }
function siteCard(s){ const c=calc(s); const st=siteState(s,c); const jt=jobType(s); const open=(s.issues||[]).filter(x=>x.status!=="done").length; const due=!isEng()?dueAlerts(s):[];
  const key=[s.name,s.location,s.engineer,s.consultant,s.client].filter(Boolean).join(" ").toLowerCase();
  return `<button class="scard st-${st}" data-act="open" data-id="${s.id}" data-k="${esc(key)}" data-st="${st}">
   <span class="sthumb jt-${jt}">${s.coverId?`<img src="${blobUrl(s.coverId)}" alt="" loading="lazy">`:ico(jt)}</span>
   <span class="sbody"><span class="stop"><b class="sname">${U(s.name)}</b><span class="chip c-${st}">${STLBL[st]}</span></span>
    <span class="small muted sline">${[s.engineer,s.location].filter(Boolean).length?U([s.engineer,s.location].filter(Boolean).join(" · ")):tr(JOBLBL[jt])}</span>
    <span class="sprog"><span class="bar"><i style="width:${c.pct}%"></i></span><span class="num small">${c.pct}%</span></span>
    ${(due.length||open||!isEng()||s.example)?`<span class="sfoot small">${!isEng()?`<span class="muted">المتبقي <span class="num">${money(c.remaining)}</span> درهم</span>`:""}${open?`<span class="chip bad">${ico("alert")} <span class="num">${open}</span> مشكلة</span>`:""}${due.length?`<span class="chip bad">💰 دفعة مستحقة</span>`:""}${s.example?`<span class="chip ex">بيانات مثال</span>`:""}</span>`:""}
   </span></button>`; }
function homeAlerts(){ if(!isAdmin()||!S.cuLoaded) return ""; const nr=Object.values(S.cu).filter(unrev).length;
  return (nr?`<button class="hbanner rev" data-act="curevopen">🧾 <span>فواتير جديدة لم تراجعها: <b class="num">${nr}</b></span></button>`:"")+cuAlert(); }
function cuAlert(){ const c=cuCalc(); if(!c.isLow&&!c.miss) return "";
  return `<button class="hbanner warn" data-act="cuopen">${ico("wallet")}<span>${c.isLow?`رصيد العهدة منخفض: <span class="num">${money(c.mainBal)}</span> درهم`:""}${c.isLow&&c.miss?" · ":""}${c.miss?`<span class="num">${c.miss}</span> فاتورة للمراجعة`:""}</span></button>`; }
function homeList(list){
  if(S.mode==="loading") return `<div class="empty">جارٍ تحميل المواقع…</div>`;
  if(!list.length) return emptyHtml("frame","ابدأ بأول موقع","أضف اسم الموقع وقيمة المشروع وعدد الشبابيك والأبواب، ثم تابع الإنجاز والصور من هنا.",isAdmin()?`<button class="primary big" data-act="new">+ موقع جديد</button>`:"");
  const st=new Map(list.map(s=>[s.id,siteState(s)]));
  const count=k=>list.filter(s=>fitFilter(st.get(s.id),k)).length;
  const k=S.sfilt||"all"; const order={issue:0,run:1,near:1,stop:2,done:3};
  const shown=list.filter(s=>fitFilter(st.get(s.id),k)).sort((a,b)=>(order[st.get(a.id)]-order[st.get(b.id)])||((b.updatedAt||0)-(a.updatedAt||0)));
  return `<div class="search">${ico("search")}<input id="site-q" type="search" placeholder="ابحث عن موقع أو مهندس" value="${esc(S.q||"")}" autocomplete="off" enterkeyhint="search"></div>
   <div class="fchips" role="group" aria-label="تصفية المواقع">${SFILT.map(([f,l])=>{ const nn=count(f); return f!=="all"&&!nn?"":`<button aria-pressed="${k===f}" data-act="sfilt" data-k="${f}">${l} <span class="num">${nn}</span></button>`; }).join("")}</div>
   <div class="slist" id="slist">${shown.map(siteCard).join("")||emptyHtml("check","لا توجد مواقع هنا","جرّب تصفية أخرى.")}</div>
   <div class="empty2 qmiss" hidden>${ico("search","art")}<b>لا يوجد موقع بهذا الاسم</b></div>`; }
function quickStrip(){ const qs=QACTS.filter(q=>q[0]!=="repopen"&&(!isEng()||q[0]!=="qchq"));
  return `<div class="qstrip" role="group" aria-label="إضافة سريعة">${qs.map(([a,ic,t])=>`<button class="qchip" data-act="${a}"><span class="qic">${ic}</span><span>${t}</span></button>`).join("")}</div>`; }
function applySearch(){ const q=(S.q||"").trim().toLowerCase(); const cards=[...document.querySelectorAll("#slist .scard")]; let shown=0;
  cards.forEach(c=>{ const ok=!q||(c.dataset.k||"").includes(q)||(c.textContent||"").toLowerCase().includes(q); c.hidden=!ok; if(ok) shown++; });
  const m=document.querySelector(".qmiss"); if(m) m.hidden=!(q&&cards.length&&!shown); }
/* ---- bottom bar ---- */
function bottomNav(){ if(!S.user||isBuyer()) return ""; const v=S.view==="cust"?"cust":S.view==="settings"?"settings":S.view==="site"?"list":"list";
  const dot=isAdmin()&&S.cuLoaded&&(()=>{ const c=cuCalc(); return c.isLow||c.miss||Object.values(S.cu).some(unrev); })();
  const it=(k,act,icon,l,extra="")=>`<button class="${v===k?"on":""}" data-act="${act}" ${v===k?'aria-current="page"':""}>${ico(icon)}<span>${l}</span>${extra}</button>`;
  return `<nav class="bnav" aria-label="الأقسام">${it("list","navlist","sites","المواقع")}${isAdmin()?it("cust","cuopen","wallet","العهدة",dot?`<i class="tdot"></i>`:""):""}${it("rep","navrep","report","التقارير")}${it("settings","navset","gear","الإعدادات")}</nav>`; }
/* ---- theme ---- */
function themePref(){ try{ return localStorage.getItem("sites-theme")||"auto"; }catch(e){ return "auto"; } }
function applyTheme(){ const p=themePref(); const r=document.documentElement; if(p==="auto") r.removeAttribute("data-theme"); else r.setAttribute("data-theme",p);
  const dark=p==="dark"||(p==="auto"&&window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches);
  const m=document.querySelector('meta[name="theme-color"]'); if(m) m.setAttribute("content",dark?"#0b3d1f":"#0d5a2b"); }
/* ---- settings screen ---- */
function companyPanel(){ if(!isAdmin()) return "";
  return `<details class="panel" ${S.settings.logoId?"":"open"}><summary style="cursor:pointer;font-weight:600">🏢 ترويسة الشركة في التقارير (الشعار والبيانات)</summary>
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
   <p class="small muted" style="margin:0">تظهر هذه البيانات في ترويسة كل التقارير وتذييلها، وفي الفاتورة الضريبية.</p></details>`; }
function settingsView(){ const p=themePref(); const r=ROLES[role()]||["",""];
  const hint=installHint();
  return header("الإعدادات") + `
  <div class="panel acct"><div class="acrow"><span class="avatar u" aria-hidden="true">${esc((S.user.name||"?").trim().charAt(0))}</span><span class="acname"><b><bdi class="u">${esc(S.user.name)}</bdi></b><span class="small muted">${r[0].replace(/^\S+\s/,"")}</span></span></div>
   <div class="row"><button data-act="aumypin">🔑 تغيير رمز الدخول</button><button class="ghost danger" data-act="aulogoutask">🚪 تسجيل الخروج</button></div></div>
  <div class="panel"><h2>المظهر</h2>
   <div class="setline"><span>اللغة</span><div class="seg">${[["ar","عربي"],["en","English"]].map(([k,l])=>`<button aria-pressed="${lang===k}" ${lang===k?"":'data-act="lang"'}><bdi class="u">${l}</bdi></button>`).join("")}</div></div>
   <div class="setline"><span>الوضع</span><div class="seg">${[["auto","تلقائي"],["light","فاتح"],["dark","داكن"]].map(([k,l])=>`<button aria-pressed="${p===k}" data-act="theme" data-k="${k}">${l}</button>`).join("")}</div></div>
   <p class="small muted" style="margin:0">«تلقائي» يتبع إعداد الهاتف: داكن في الليل إذا كان الهاتف داكناً.</p></div>
  ${hint?`<div class="notice small"><span>${hint.replace(/^<br>/,"")}</span></div>`:""}
  ${pushPanel()}${backupPanel()}${usersPanel()}${companyPanel()}
  <p class="small muted center">${esc(coName())}</p>`; }
/* ---- events for the parts above ---- */
app.addEventListener("click", e=>{ const b=e.target.closest("[data-act]"); if(!b) return; const a=b.dataset.act;
  if(a==="navlist"){ S.view="list"; S.pick=null; render(); window.scrollTo(0,0); }
  else if(a==="navset"){ S.view="settings"; S.pick=null; render(); window.scrollTo(0,0); }
  else if(a==="navrep"){ S.view="list"; const act=activeSites();
    if(!act.length){ render(); toast("أضف موقعاً أولاً"); return; }
    if(act.length===1){ goSite(act[0].id); S.repSheet=true; render(); return; }
    S.pick="repopen"; render(); }
  else if(a==="sfilt"){ S.sfilt=b.dataset.k; render(); applySearch(); }
  else if(a==="theme"){ try{ localStorage.setItem("sites-theme",b.dataset.k); }catch(x){} applyTheme(); render(); } });
app.addEventListener("input", e=>{ if(e.target.id==="site-q"){ S.q=e.target.value; applySearch(); } });
if(window.matchMedia) try{ matchMedia("(prefers-color-scheme: dark)").addEventListener("change",applyTheme); }catch(e){}
