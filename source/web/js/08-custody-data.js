/* ---------- custody (العهدة) ---------- */
S.cu = {}; S.cuF = "all"; const cuRetry = {}, cuPend = {}, cuTomb = {}, cuT = {};
let cuMe = "", cuBuyer = false; try{ cuMe = localStorage.getItem("cust-me")||""; cuBuyer = localStorage.getItem("cust-buyer")==="1"; }catch(e){}
const FUELRE = /fuel|petrol|diesel|gasoline|adnoc|enoc|eppco|emarat|بترول|ديزل|بنزين|وقود|محطة/i;
const CATS0 = [
 ["fuel","⛽ وقود","car",FUELRE],
 ["carfix","🔧 صيانة سيارات","car",/tyre|tire|oil change|engine oil|زيت|إطار|اطار|كراج|garage|car wash|غسيل سيارات|battery|بطارية/i],
 ["glass","🪟 زجاج","site",/glass|زجاج|mirror|مرآ|مرايا/i],
 ["alu","🔩 ألمنيوم وقطاعات","site",/alumin|ألمنيوم|المنيوم|ألومنيوم|profile|قطاع/i],
 ["sil","🧴 سيليكون ومواد لاصقة","site",/silicon|سيليكون|sealant|foam|فوم|tape|شريط|adhes|لاصق/i],
 ["acc","⚙️ إكسسوارات","site",/handle|hinge|lock|screw|bolt|مقبض|مفصل|قفل|براغي|مسامير|accessor|اكسسوار|إكسسوار/i],
 ["equip","🏗️ معدات وإيجارات","site",/scaffold|سقالة|crane|رافعة|rent|إيجار|ايجار|generator|مولد/i],
 ["trans","🚚 نقل وتوصيل","site",/transport|delivery|نقل|توصيل|شحن|freight/i],
 ["salary","👔 المرتبات","gen",/salar(y|ies)|payroll|wages?\b|راتب|رواتب|مرتب|مرتبات|أجور|اجور/i],
 ["labor","👷 عمالة خارجية","site",/labou?r|عمال|عمالة|subcontract|مقاول/i],
 ["print","📐 مخططات وطباعة","site",/\bprint(ing|s)?\b|plott|blueprint|\bA[0-3]\b|طباع|مخطط|تصوير مستندات|copy ?cent/i],
 ["tools","🛠️ عدد وأدوات","gen",/tool|drill|دريل|منشار|saw|عدة|أدوات|ادوات|blade|شفرة/i],
 ["office","🏢 مكتب وورشة","gen",/stationer|قرطاسية|dewa|كهرباء|internet|انترنت|إنترنت|etisalat|اتصالات|office|مكتب|printer|طابعة/i],
 ["misc","🍽️ ضيافة ونثريات","gen",/water|مياه|food|طعام|أكل|restaurant|مطعم|cafeteria|كافتيريا|بقالة|grocery|supermarket|سوبرماركت/i],
 ["gov","📄 رسوم حكومية","gen",/municipality|بلدية|permit|تصريح|رسوم|fees?\b|government|حكوم/i]];
const CTYPE = {site:"تكاليف على الموقع", car:"السيارات", gen:"مصاريف عامة على الشركة"};
function cuCats(){ const nm=S.settings.cuCatNames||{}; const hid=S.settings.cuCatHide||[];
  return [...CATS0.filter(c=>!hid.includes(c[0])).map(([k,l,t,re])=>({k,l:nm[k]||l,t,re,own:false})), ...(S.settings.cuCatsX||[]).map(c=>({k:c.k,l:c.l,t:c.t,re:null,own:true}))]; }
function cuCat(k){ return cuCats().find(c=>c.k===k) || (CATS0.find(c=>c[0]===k)?{k,l:CATS0.find(c=>c[0]===k)[1],t:CATS0.find(c=>c[0]===k)[2]}:null); }
function cuGuessCat(text){ const t=String(text||""); for(const c of cuCats()) if(c.re&&c.re.test(t)) return c.k; return ""; }
function carList(){ return (S.settings.cuCars || ["Mitsubishi","Mirage","Victor"]).map(c=>typeof c==="string"?{n:c,pl:""}:{n:c.n||"",pl:c.pl||""}).filter(c=>c.n); }
function cuCars(){ return carList().map(c=>c.n); }
const digits=t=>String(t||"").replace(/[^0-9]/g,"");
function carFromText(...ts){ const all=ts.map(t=>String(t||"")).join(" "); const runs=(all.replace(/[\u0660-\u0669]/g,d=>d.charCodeAt(0)-0x660).match(/\d{3,}/g))||[];
  for(const c of carList()){ const p=digits(c.pl); if(p.length<3) continue; if(runs.some(r=>r===p||(r.length>=4&&(r.endsWith(p)||p.endsWith(r))))) return c.n; } return null; }
function cuCredit(){ return S.settings.cuCredit || ["MIH","Dreamland"]; }
const supKey = s => String(s||"").toLowerCase().replace(/l\.?\s?l\.?\s?c\.?|ذ\.?\s?م\.?\s?م|\b(llc|co|est|trading|company|fze|fzc|fzco|group|general|building|materials?)\b|للتجارة|تجارة|مؤسسة|شركة/g," ").replace(/[^\p{L}\p{N}]+/gu," ").trim();
function supMatch(a,b){ const x=supKey(a), y=supKey(b); if(!x||!y) return false; return x===y || (y.length>=3&&x.includes(y)) || (x.length>=3&&y.includes(x)); }
function isCreditSup(name){ return cuCredit().some(c=>supMatch(name,c)); }
function supCanon(name){ return cuCredit().find(c=>supMatch(name,c)) || String(name||"").trim(); }

function cuLocal(){ try{ localStorage.setItem("cust-local",JSON.stringify(S.cu)); }catch(e){} }
function cuSync(x){
  if(!x||x.kind!=="exp"||!isAdmin()) return;
  const want=S.sites[x.target]?x.target:null;
  if(x.purSite && (x.purSite!==want)){ const o=S.sites[x.purSite]; if(o&&o.purchases){ o.purchases=o.purchases.filter(p=>p.id!==x.purId); save(o); } x.purId=null; x.purSite=null; }
  if(!want) return;
  const s=S.sites[want]; s.purchases=s.purchases||[];
  let p=s.purchases.find(p=>p.id===x.purId||p.cuId===x.id);
  if(!p){ p={id:uid(),cuId:x.id}; s.purchases.push(p); }
  x.purId=p.id; x.purSite=want;
  const c=cuCat(x.cat);
  Object.assign(p,{date:x.date||today(),supplier:x.supplier||"",desc:x.desc||(c?c.l.replace(/^\S+\s/,""):""),amount:n(x.amount),fileId:x.fileId||null,fileType:x.fileType||null,cat:x.cat||"",pay:x.pay||"cash",
    note:(x.pay==="gm"?tr("تحويل مباشر من المدير العام"):tr("من العهدة")+" — "+payLbl(x))+(x.by?" — "+x.by:"")});
  save(s);
}
const cuOrig={};
function cuPut(x, now){
  if(S.canWrite===false){ toast("صلاحيتك مشاهدة فقط، فلا يُحفظ التعديل"); return; }
  delete cuOrig[x.id];
  x.updatedAt=Date.now(); S.cu[x.id]=x; cuSync(x);
  const go=()=>{ const cur=S.cu[x.id]; if(!cur) return; cuPend[x.id]=(cuPend[x.id]||0)+1; const body=JSON.parse(JSON.stringify(cur)); delete body.reading;
    if(S.mode==="db") track(db.doc("custody/"+x.id).set(body)).then(()=>{ delete cuRetry[x.id]; }).catch(e=>{ cuRetry[x.id]=1; const m=String(e&&e.message||e&&e.code||""); toast(/custody|schema cache|does not exist|relation/i.test(m)?"جدول العهدة غير موجود في قاعدة البيانات — نفّذ أوامر SQL الخاصة بالعهدة":"تعذر حفظ العهدة: "+m); }).finally(()=>{ cuPend[x.id]--; });
    else { cuLocal(); cuPend[x.id]--; } };
  clearTimeout(cuT[x.id]); if(now){ cuT[x.id]=null; go(); } else cuT[x.id]=setTimeout(()=>{ cuT[x.id]=null; go(); },500);
  cuCheckLow();
}
const dropLater={};
function cuDel(id){
  const x=S.cu[id]; if(x&&x.purSite){ const s=S.sites[x.purSite]; if(s&&s.purchases){ s.purchases=s.purchases.filter(p=>p.id!==x.purId); save(s); } }
  if(x&&x.fileId){ const f=x.fileId; dropLater[f]=setTimeout(()=>{ delete dropLater[f]; if(!Object.values(S.cu).some(y=>y.fileId===f)) dropAsset(f); },20000); }
  if(x&&x.kind==="xfer") Object.values(S.cu).forEach(y=>{ if(y.xferId===id){ y.xferId=null; cuPut(y,true); } });
  delete S.cu[id]; cuTomb[id]=Date.now(); clearTimeout(cuT[id]);
  if(S.mode==="db") track(db.doc("custody/"+id).delete()).catch(()=>{}); else cuLocal();
}
const cuOrph={};
/* undo: snapshot entries before an action, restore on demand */
function cuSnap(ids){ const m={}; ids.forEach(i=>{ m[i]=S.cu[i]?JSON.parse(JSON.stringify(S.cu[i])):null; }); return m; }
function cuRestore(snap){
  Object.entries(snap).forEach(([i,v])=>{ if(!v&&S.cu[i]) cuDel(i); });
  Object.entries(snap).forEach(([i,v])=>{ if(!v) return; delete cuTomb[i]; if(v.fileId&&dropLater[v.fileId]){ clearTimeout(dropLater[v.fileId]); delete dropLater[v.fileId]; }
    const y=JSON.parse(JSON.stringify(v)); if(y.purSite&&S.sites[y.purSite]&&!(S.sites[y.purSite].purchases||[]).some(q=>q.id===y.purId)){ y.purId=null; y.purSite=null; } S.cu[i]=y; cuPut(y,true); });
}
function undoToast(msg, snap){
  document.querySelectorAll(".toast.undo").forEach(t=>t.remove());
  const t=document.createElement("div"); t.className="toast undo"; t.dir=document.documentElement.dir;
  t.innerHTML=`<span></span><button type="button" class="ok">✓ ${tr("تم")}</button><button type="button" class="un">↩️ ${tr("تراجع")}</button>`; t.firstChild.textContent=tr(msg); document.body.appendChild(t);
  const tm=setTimeout(()=>t.remove(),7000);
  t.querySelector(".ok").onclick=()=>{ clearTimeout(tm); t.remove(); };
  t.querySelector(".un").onclick=()=>{ clearTimeout(tm); t.remove(); if(typeof snap==="function") snap(); else cuRestore(snap); toast("↩️ تم التراجع"); render(); };
}
function cuReconcile(){
  if(!isAdmin()||!S.cuLoaded||!S.sitesLoaded) return;
  Object.values(S.cu).forEach(x=>{ if(x.kind!=="exp"||x.reading||cuPend[x.id]>0||cuT[x.id]) return;
    const want=S.sites[x.target]?x.target:null; const s=want&&S.sites[want]; const p=s&&(s.purchases||[]).find(q=>q.id===x.purId||q.cuId===x.id);
    const ok=want?(p&&x.purSite===want&&n(p.amount)===n(x.amount)&&p.date===(x.date||p.date)&&(p.supplier||"")===(x.supplier||"")&&(p.fileId||null)===(x.fileId||null)&&(p.pay||"cash")===(x.pay||"cash")&&(p.cat||"")===(x.cat||"")):!x.purSite;
    if(!ok) cuPut(x,true); });
}
function cuRecover(){
  cuReconcile();
  if(S.canWrite===false||!S.cuLoaded||!isAdmin()) return; const now=Date.now();
  Object.values(S.sites).forEach(s=>(s.purchases||[]).forEach(p=>{
    if(!p.cuId||S.cu[p.cuId]||cuTomb[p.cuId]){ delete cuOrph[p.cuId]; return; }
    if(!cuOrph[p.cuId]){ cuOrph[p.cuId]=now; return; } if(now-cuOrph[p.cuId]<45000) return;
    delete cuOrph[p.cuId]; const by=String(p.note||"").split(" — ")[2]||"";
    const x={id:p.cuId,kind:"exp",by,target:s.id,cat:p.cat||"",pay:p.pay||"cash",supplier:p.supplier||"",amount:n(p.amount),date:p.date||today(),desc:p.desc||"",fileId:p.fileId||null,fileType:p.fileType||null,purId:p.id,purSite:s.id,createdAt:now};
    S.cu[x.id]=x; cuPut(x,true); }));
}
function cuMerge(docs){
  const next={}, now=Date.now();
  docs.forEach(d=>{ if(!(cuTomb[d.id]&&now-cuTomb[d.id]<120000)) next[d.id]={...JSON.parse(JSON.stringify(d.data()||{})), id:d.id}; });
  Object.values(S.cu).forEach(x=>{ const srv=next[x.id];
    if(cuPend[x.id]>0 || cuT[x.id] || cuOrig[x.id] || x.reading || (!srv&&now-(x.updatedAt||0)<120000) || (srv&&(x.updatedAt||0)>(srv.updatedAt||0))) next[x.id]=x; });
  S.cu=next;
}
const isExp=x=>!x.kind||x.kind==="exp";
const invKey=t=>String(t||"").toUpperCase().replace(/[^A-Z0-9]/g,"").replace(/^0+/,"");
function cuDupOf(x){ if(!isExp(x)||x.dupOk||x.reading) return null; const a=n(x.amount);
  return Object.values(S.cu).find(o=>o!==x&&o.id!==x.id&&isExp(o)&&!o.reading&&(
    (x.fileId&&o.fileId===x.fileId) ||
    (x.invNo&&o.invNo&&invKey(x.invNo)===invKey(o.invNo)&&(!x.supplier||!o.supplier||supMatch(x.supplier,o.supplier))) ||
    (a>0&&n(o.amount)===a&&o.date===x.date&&x.supplier&&supMatch(x.supplier,o.supplier))))||null; }
const needsReview=x=>isExp(x)&&(cuMissing(x).length>0||!!cuDupOf(x));
function cuCloses(){ return Object.values(S.cu).filter(x=>x.kind==="close").sort((a,b)=>(a.createdAt||0)-(b.createdAt||0)); }
function cuLast(){ const c=cuCloses(); return c[c.length-1]||null; }
const inPeriod=(x,from,to)=>x.kind!=="close"&&(x.createdAt||0)>(from?from.createdAt:0)&&(!to||(x.createdAt||0)<=to.createdAt);
function periodCalc(list,opening){ const sum=f=>list.filter(f).reduce((a,x)=>a+n(x.amount),0);
  const dep=sum(x=>x.kind==="dep"), cash=sum(isCashX), credit=sum(x=>isExp(x)&&x.pay==="credit"), spCash=sum(x=>x.kind==="spay"&&x.method==="cash");
  return {opening,dep,cash,credit,spCash,closing:opening+dep-cash-spCash}; }
// salaries: an entry in month M is for month M-1; the reminder from the 25th of M is for month M
const MONTHS_AR=["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const MONTHS_EN=["January","February","March","April","May","June","July","August","September","October","November","December"];
const ym=(y,m)=>y+"-"+String(m).padStart(2,"0");
function prevMonthOf(date){ const [y,m]=String(date||today()).split("-").map(Number); return m===1?ym(y-1,12):ym(y,m-1); }
function monthName(k){ const [y,m]=k.split("-").map(Number); return (lang==="en"?MONTHS_EN:MONTHS_AR)[m-1]+" "+y; }
function salaryDesc(k){ return (lang==="en"?"Salaries ":"مرتبات ")+monthName(k); }
// which month an existing salary entry covers: its own field, else the month before its date (as entered so far)
const salMonthOf=x=>x.salMonth||prevMonthOf(x.date);
function salaryDue(){ const t=today(), [y,m,dd]=t.split("-").map(Number);
  const k=dd>=25?ym(y,m):(dd<=10?prevMonthOf(t):null); if(!k) return null;
  const done=Object.values(S.cu).some(x=>isExp(x)&&x.cat==="salary"&&salMonthOf(x)===k); return done?null:k; }
// what an expense is called in lists and statements: supplier, else its description, else its category; "فاتورة" only when there is a document
function cuName(x){ const sup=String(x.supplier||"").trim(); if(sup) return sup; const ds=String(x.desc||"").trim(); if(ds) return ds;
  const c=x.cat&&cuCat(x.cat); if(c) return c.l.replace(/^\S+\s/,""); return x.fileId?tr("فاتورة"):tr("مصروف"); }
function cuMissing(x){ const m=[]; if(x.reading) return m; if(!(n(x.amount)>0)) m.push("المبلغ"); if(!x.target) m.push("الموقع"); if(!String(x.supplier||"").trim()&&x.cat!=="salary") m.push("المورد"); return m; }
function cuCalc(){
  const all=Object.values(S.cu); const sum=f=>all.filter(f).reduce((a,x)=>a+n(x.amount),0);
  const dep=sum(x=>x.kind==="dep"), cash=sum(isCashX), credit=sum(x=>isExp(x)&&x.pay==="credit");
  const spCash=sum(x=>x.kind==="spay"&&x.method==="cash"), spAll=sum(x=>x.kind==="spay");
  const low=n(S.settings.cuLow??1000); const mainBal=holderBal("main");
  return {dep, cash, credit, spCash, spAll, bal:dep-cash-spCash, mainBal, owed:credit-spAll, miss:all.filter(x=>isExp(x)&&(!cuLast()||(x.createdAt||0)>cuLast().createdAt)&&needsReview(x)).length, low, isLow:low>0&&mainBal<low};
}
const holderOf=x=>x.holder||"main";
const mainHolderId=()=>S.settings.cuMainHolder||((users().find(u=>u.role==="admin")||{}).id)||"";
const mainHolder=()=>{ const id=mainHolderId(); const u=id&&users().find(x=>x.id===id); return u?u.name:""; };
function holders(){ const mh=mainHolder(); const set=new Set(); Object.values(S.cu).forEach(x=>{ if(x.kind==="xfer"&&x.to) set.add(x.to); if(isExp(x)&&x.holder&&x.holder!=="main") set.add(x.holder); }); users().filter(u=>u.role==="buyer").forEach(u=>set.add(u.name)); if(mh&&!Object.values(S.cu).some(x=>(x.kind==="xfer"&&x.to===mh)||(isExp(x)&&x.holder===mh))) set.delete(mh); return [...set]; }
function subDefault(name){ return !!name&&name!==mainHolder()&&users().some(u=>u.name===name&&u.role==="buyer"); }
function delta(x,h){ const a=n(x.amount);
  if(x.kind==="dep") return (h==="all"||h==="main")?a:0;
  if(isExp(x)) return (x.pay==="credit"||x.pay==="gm")?0:((h==="all"||holderOf(x)===h)?-a:0);
  if(x.kind==="spay") return x.method==="cash"&&(h==="all"||h==="main")?-a:0;
  if(x.kind==="xfer"){ if(h==="all"||!x.to) return 0; const out=x.dir!=="back"; if(h==="main") return out?-a:a; if(h===x.to) return out?a:-a; }
  return 0; }
const holderBal=h=>Object.values(S.cu).filter(x=>x.kind!=="close").reduce((a,x)=>a+delta(x,h),0);
const payLbl=x=>x.pay==="credit"?tr("آجل"):x.pay==="gm"?tr("تحويل مباشر"):tr("نقداً");
const isCashX=x=>isExp(x)&&x.pay!=="credit"&&x.pay!=="gm";
const holderShort=h=>Math.round(Math.max(0,-holderBal(h))*100)/100;
const needsXfer=x=>isCashX(x)&&holderOf(x)!=="main"&&!x.xferId&&n(x.amount)>0&&holderShort(holderOf(x))>0;
const hName=h=>h==="main"?tr("💼 العهدة الرئيسية")+(mainHolder()?" — "+mainHolder():""):"🧾 "+tr("عهدة ")+h;
function cuSuppliers(){
  const g={}; const add=(name)=>{ const k=supCanon(name); const key=supKey(k)||k; return g[key]=g[key]||{name:k,key,inv:[],pay:[]}; };
  cuCredit().forEach(add);
  Object.values(S.cu).forEach(x=>{ if(isExp(x)&&x.pay==="credit") add(x.supplier).inv.push(x); else if(x.kind==="spay") add(x.supplier).pay.push(x); });
  return Object.values(g).map(s=>({...s, invSum:s.inv.reduce((a,x)=>a+n(x.amount),0), paySum:s.pay.reduce((a,x)=>a+n(x.amount),0)})).map(s=>({...s,bal:s.invSum-s.paySum})).sort((a,b)=>b.bal-a.bal);
}
function cuTargetName(x){
  if(String(x.target||"").startsWith("car:")) return "🚗 "+x.target.slice(4);
  if(x.target==="gen") return "🏢 عام (الشركة)";
  const s=S.sites[x.target]; return s?"🏗️ "+(s.name||""):"— بدون موقع —";
}
const PAYM={cheque:"شيك",transfer:"تحويل بنكي",cash:"نقداً من العهدة"};

