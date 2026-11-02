const PH = Object.keys(EN).sort((a,b)=>b.length-a.length);
let lang = "ar"; try{ lang = localStorage.getItem("sites-lang")||"ar"; }catch(e){}
const AR=/[\u0621-\u064A\u0670-\u06D3]/;
const tr = str => { if(lang!=="en"||!str) return str; let o=String(str); const t=o.trim(); if(EN[t]!==undefined) return o.replace(t,EN[t]);
  for(const k of PH){ if(!o.includes(k)) continue; let r="", i=0, j;
    while((j=o.indexOf(k,i))>=0){ const before=o[j-1]||"", after=o[j+k.length]||""; r+=o.slice(i,j); r+=(AR.test(before)||AR.test(after))?k:EN[k]; i=j+k.length; }
    o=r+o.slice(i); } return o; };
const DATA_EN={"شبابيك":"Windows","شباك":"Window","نوافذ":"Windows","أبواب":"Doors","باب":"Door","ثابت":"Fixed panels","واجهة زجاج":"Glass facade","الطابق الأرضي":"Ground floor","الطابق الأول":"First floor","الطابق الثاني":"Second floor","الطابق الثالث":"Third floor","الطابق الرابع":"Fourth floor","الطابق الخامس":"Fifth floor","السطح":"Roof","الميزانين":"Mezzanine","القبو":"Basement",
 "دفعة مقدمة":"Advance payment","دفعة ثانية":"Second payment","دفعة ثالثة":"Third payment","دفعة أخيرة":"Final payment","بعد التركيب":"After installation","بعد التسليم":"After handover","دفعة":"Payment","مشروع جديد":"New project","جاري":"In progress","متوقف":"On hold","منتهي":"Completed"};
const DATA_AR=Object.fromEntries(Object.entries(DATA_EN).map(([k,v])=>[v.toLowerCase(),k]));
const dEN = x => { const t=String(x??"").trim(); if(lang==="en") return DATA_EN[t]??x; return DATA_AR[t.toLowerCase()]??x; };
const U = x => `<bdi class="u">${esc(dEN(x))}</bdi>`;
function translate(root){
  if(lang!=="en") return;
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT); const nodes=[]; while(w.nextNode()) nodes.push(w.currentNode);
  nodes.forEach(t=>{ if(!t.parentElement.closest(".u,textarea") && /[\u0600-\u06FF]/.test(t.nodeValue)) t.nodeValue=tr(t.nodeValue); });
  root.querySelectorAll("[placeholder],[aria-label],[alt]").forEach(el=>["placeholder","aria-label","alt"].forEach(a=>{ if(el.hasAttribute(a)&&!el.closest(".u")) el.setAttribute(a,tr(el.getAttribute(a))); }));
}
const coName = () => lang==="en" && S.settings.companyEn ? S.settings.companyEn : S.settings.company;

const uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const esc = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const n = v => { const x = parseFloat(v); return isFinite(x) ? x : 0; };
const money = v => n(v).toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:2});
const today = () => new Date().toISOString().slice(0,10);
const blobUrl = id => id==="__logo"?"./logo.png":(window.__pub?window.__pub(id):"/_blob/"+id);
const mediaFetch = async id => { if(window.__mediaBlob&&id!=="__logo") return new Response(await window.__mediaBlob(id)); return fetch(blobUrl(id)); };
window.addEventListener("aseel-media",()=>{ if(!document.activeElement || !document.activeElement.matches("input,textarea,select")) render(); });
function toast(msg){ const t=document.createElement("div"); t.className="toast"; t.textContent=tr(msg); document.body.appendChild(t); setTimeout(()=>t.remove(),2800); }

function newSite(){
  return { id:uid(), name:tr("مشروع جديد"), client:"", location:"", engineer:"", engPhone:"", consultant:"", startDate:today(), status:"جاري", total:0, notes:"", coverId:null,
    payments:[], items:[{id:uid(),name:tr("شبابيك"),qty:0,fix:0,sil:0,glass:0},{id:uid(),name:tr("أبواب"),qty:0,fix:0,sil:0,glass:0},{id:uid(),name:tr("ثابت"),qty:0,fix:0,sil:0,glass:0}],
    purchases:[], photos:[], createdAt:Date.now(), updatedAt:Date.now() };
}
const TRIG=[["sign","عند التوقيع (مقدم)"],["progress","عند نسبة إنجاز"],["fix","بعد تثبيت الفريم كاملاً"],["glass","بعد تركيب الزجاج كاملاً"],["sil","بعد السيليكون كاملاً"],["handover","عند التسليم (يدوي)"]];
function stagePct(s,k){ let q=0,d=0; (s.items||[]).forEach(it=>{ q+=n(it.qty); d+=Math.min(n(it[k]),n(it.qty)); }); return q?Math.round(d/q*100):0; }
function schedule(s){
  const c0=calcBase(s); let r=c0.received; const tot=c0.total;
  return (s.schedule||[]).map((m,i)=>{ const amt=Math.round(tot*n(m.pct)/100);
    const prog=m.trigger==="sign"?100:m.trigger==="progress"?Math.min(100,Math.round(c0.pct/Math.max(1,n(m.at))*100)):m.trigger==="handover"?(m.done?100:0):stagePct(s,m.trigger);
    const due=m.trigger==="sign"||(m.trigger==="progress"?c0.pct>=n(m.at):m.trigger==="handover"?!!m.done:stagePct(s,m.trigger)>=100);
    const paid=Math.max(0,Math.min(r,amt)); r-=paid;
    const st=paid>=amt&&amt>0?"paid":due?(paid>0?"partdue":"due"):(paid>0?"part":"wait");
    return {...m,i,amt,paid,left:amt-paid,due,prog,st}; });
}
function dueAlerts(s){ return schedule(s).filter(x=>x.due&&x.left>0); }
function costs(s){ const lab=(s.labor||[]).reduce((a,l)=>a+laborAmt(l),0), oth=(s.otherCosts||[]).reduce((a,o)=>a+n(o.amount),0), pur=(s.purchases||[]).reduce((a,p)=>a+n(p.amount),0);
  const total=n(s.total); const cost=lab+oth+pur; return {lab,oth,pur,cost,profit:total-cost,margin:total?Math.round((total-cost)/total*100):0,cash:(s.payments||[]).reduce((a,p)=>a+n(p.amount),0)-cost}; }
function laborAmt(l){ return l.mode==="amount"?n(l.amount):n(l.workers)*n(l.days)*n(l.rate); }
const calcBase=s=>calc(s);
function calc(s){
  const received = (s.payments||[]).reduce((a,p)=>a+n(p.amount),0);
  const spent = (s.purchases||[]).reduce((a,p)=>a+n(p.amount),0);
  let need=0, done=0;
  (s.items||[]).forEach(it=>{ const q=n(it.qty); need+=q*3; STAGES.forEach(([k])=>done+=Math.min(n(it[k]),q)); });
  return { total:n(s.total), received, remaining:n(s.total)-received, spent, pct: need? Math.round(done/need*100):0,
    windows:(s.items||[]).reduce((a,i)=>a+n(i.qty),0) };
}
const site = () => S.sites[S.cur];

