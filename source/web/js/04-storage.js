/* ---------- storage ---------- */
const held={}, ver={};
function hold(s){ held[s.id]=(held[s.id]||0)+1; }
function release(s){ held[s.id]=Math.max(0,(held[s.id]||0)-1); }
function save(s, hold){
  if(S.canWrite===false){ if(!S.roWarned){ S.roWarned=true; toast("صلاحيتك مشاهدة فقط، فلا يُحفظ التعديل"); } return; }
  S.sites[s.id]=s; ver[s.id]=(ver[s.id]||0)+1;
  attachMarks(s); syncPlans(s); s.updatedAt = Date.now(); dirty[s.id]=true;
  clearTimeout(timers[s.id]);
  if(hold&&S.mode==="db"){ unsaved[s.id]=true; markUnsaved(); return; }
  if(S.mode==="local"){ flush(s.id); return; }
  timers[s.id]=setTimeout(()=>flush(s.id),500);
}
const unsaved={};
function markUnsaved(){ const any=Object.keys(unsaved).some(k=>unsaved[k]&&dirty[k]);
  document.querySelectorAll(".savenow").forEach(b=>{ if(b.disabled) return; b.classList.toggle("unsaved",any); b.textContent=any?tr("💾 حفظ التعديلات"):tr("💾 حفظ"); }); }
function flushAll(){ Object.keys(dirty).forEach(id=>{ if(dirty[id]){ clearTimeout(timers[id]); flush(id); } }); }
function flush(id){
  const s=S.sites[id]; if(!s) return; delete unsaved[id];
  const body = JSON.parse(JSON.stringify(s)); const v=ver[id];
  (body.floors||[]).forEach(fl=>Object.values(fl.faces||{}).forEach(f=>{ f.marks=[]; }));
  if(S.mode==="db"){
    chains[id]=(chains[id]||Promise.resolve()).then(()=>track(db.doc("sites/"+id).set(body))).then(()=>{ if(ver[id]===v) dirty[id]=false; })
      .catch(e=>{ const c=e&&e.code; if((c==="invalid_argument"||c==="not_granted")&&S.canWrite!==true){ S.canWrite=false; S.roWarned=true; render(); return; } toast(c==="invalid_argument"||c==="not_granted"?"تعذر الحفظ: قد لا تملك صلاحية التعديل على هذه الصفحة":"تعذر الحفظ: "+(c||e&&e.message||"")); });
  } else { localSave(); dirty[id]=false; }
}
/* marks live in their own collection so each tap is one small write */
S.mk = {}; const mkPending = {}; let saveState = {pending:0, err:null};
function setStatus(){ const el=document.getElementById("savePill"); if(!el) return;
  el.hidden=false;
  if(saveState.err){ el.className="savepill err"; el.textContent=tr("لم يُحفظ — اضغط لإعادة المحاولة"); }
  else if(saveState.pending){ el.className="savepill"; el.textContent=tr("جارٍ الحفظ…"); }
  else { el.className="savepill ok"; el.textContent=tr("✓ محفوظ"); clearTimeout(setStatus.t); setStatus.t=setTimeout(()=>{ if(!saveState.pending&&!saveState.err) el.hidden=true; },1800); }
}
function track(promise){ saveState.pending++; saveState.err=null; setStatus();
  return promise.then(r=>{ saveState.pending--; setStatus(); return r; }, e=>{ saveState.pending--; saveState.err=e||{}; console.warn("save failed",e); setStatus(); throw e; }); }
function mkLocalSave(){ try{ localStorage.setItem("marks-local",JSON.stringify(S.mk)); }catch(e){} }
function putMark(m){
  if(S.canWrite===false){ toast("صلاحيتك مشاهدة فقط، فلا يُحفظ التعديل"); return Promise.resolve(); }
  m.updatedAt=Date.now(); S.mk[m.id]=m; mkPending[m.id]=(mkPending[m.id]||0)+1;
  const body=JSON.parse(JSON.stringify(m));
  if(S.mode==="db") return track(db.doc("marks/"+m.id).set(body)).catch(()=>{ retryQ[m.id]=m; }).finally(()=>{ mkPending[m.id]--; });
  mkLocalSave(); mkPending[m.id]--; return Promise.resolve();
}
function delMark(id){
  delete S.mk[id]; tomb[id]=Date.now(); mkPending[id]=(mkPending[id]||0)+1;
  if(S.mode==="db") return track(db.doc("marks/"+id).delete()).catch(()=>{}).finally(()=>{ mkPending[id]--; });
  mkLocalSave(); mkPending[id]--; return Promise.resolve();
}
const retryQ={}, tomb={};
function mergeMarks(docs){
  const next={}, now=Date.now();
  docs.forEach(d=>{ const m={...JSON.parse(JSON.stringify(d.data()||{})), id:d.id}; if(!(tomb[d.id] && now-tomb[d.id]<120000)) next[d.id]=m; });
  Object.values(S.mk).forEach(m=>{ const srv=next[m.id];
    if(mkPending[m.id]>0 || (!srv && now-(m.updatedAt||0)<120000) || (srv && (m.updatedAt||0)>(srv.updatedAt||0))) next[m.id]=m; });
  S.mk=next; S.mkReady=true;
}
function retryAll(){ saveState.err=null; Object.keys(cuRetry).forEach(id=>{ delete cuRetry[id]; if(S.cu[id]) cuPut(S.cu[id],true); }); Object.values(retryQ).forEach(m=>{ delete retryQ[m.id]; if(S.mk[m.id]) putMark(S.mk[m.id]); }); Object.keys(S.sites).forEach(id=>{ if(dirty[id]) flush(id); }); setStatus(); }
function faceMarks(s,fl,k){ return Object.values(S.mk).filter(m=>m.siteId===s.id&&m.fl===fl.id&&m.face===k).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0)||(a.id<b.id?-1:1)); }
function attachMarks(s){
  if(!s) return; const migrate=[];
  floors(s).forEach(fl=>FACES.forEach(([k])=>{ const f=fl.faces[k];
    (f.marks||[]).forEach((m,i)=>{ if(S.mkReady && !m.siteId && !S.mk[m.id] && !migrated[m.id]){ migrated[m.id]=1; const st=m.stage||0;
      migrate.push({id:m.id,siteId:s.id,fl:fl.id,face:k,x:m.x,y:m.y,itemId:m.itemId,fix:m.fix!==undefined?!!m.fix:st>=1,glass:m.glass!==undefined?!!m.glass:st>=2,sil:m.sil!==undefined?!!m.sil:st>=3,createdAt:i}); } });
  }));
  migrate.forEach(m=>putMark(m));
  floors(s).forEach(fl=>FACES.forEach(([k])=>{ fl.faces[k].marks=faceMarks(s,fl,k); }));
}
const migrated={};
function localSave(){ try{ const c=JSON.parse(JSON.stringify(S.sites)); Object.values(c).forEach(x=>(x.floors||[]).forEach(fl=>Object.values(fl.faces||{}).forEach(f=>f.marks=[]))); localStorage.setItem("sites-local",JSON.stringify(c)); }catch(e){} }
function settingsSave(){
  if(S.mode==="db"&&!isAdmin()) return;
  const body={...S.settings}; delete body.users;
  if(S.mode==="db") db.doc("settings/company").set(body).catch(()=>toast("تعذر حفظ الإعدادات"));
  else try{ localStorage.setItem("sites-settings",JSON.stringify(S.settings)); }catch(e){}
}
function floors(s){
  (s.floors||[]).forEach(fl=>{ if(fl.fileId||fl._plan) return; const own=FACES.filter(([k])=>fl.faces[k]&&fl.faces[k].fileId);
    if(own.length===1){ fl.fileId=fl.faces[own[0][0]].fileId; fl.faces[own[0][0]].fileId=null; } fl._plan=1; });
  (s.floors||[]).forEach(ensureFaces);
  if(!s.floors){
    s.floors=[];
    if((s.plans||[]).length){
      const fl=newFloor(s,1); s.floors.push(fl);
      s.plans.forEach(pl=>{ let k=(FACES.find(([,l])=>l===pl.name)||[])[0]; if(!k||fl.faces[k].fileId||fl.faces[k].marks.length) k=(FACES.find(([kk])=>!fl.faces[kk].fileId&&!fl.faces[kk].marks.length)||[])[0];
        if(!k) return; fl.faces[k]={fileId:pl.fileId||null,req:pl.req||{},marks:pl.marks||[]}; });
      delete s.plans;
    }
  }
  return s.floors;
}
function ensureFaces(fl){ FACES.forEach(([k])=>{ if(!fl.faces[k]) fl.faces[k]={fileId:null,req:{},marks:[]}; }); }
function faceUsed(fl,k){ const f=fl.faces[k]; return BASEF.includes(k) || ((fl.outline&&fl.outline.sides)||[]).includes(k) || !!(f&&(f.fileId||Object.values(f.req||{}).some(v=>n(v)>0)||(f.marks||[]).length)); }
function activeFaces(fl){ return FACES.filter(([k])=>faceUsed(fl,k)); }
function newFloor(s,i){ const faces={}; FACES.forEach(([k])=>faces[k]={fileId:null,req:{},marks:[]}); return {id:uid(),name:tr(FLOORN[i]||("الطابق "+(i+1))),fileId:null,faces}; }
function allFaces(s){ return floors(s).flatMap(fl=>FACES.map(([k])=>fl.faces[k])); }
function marks(s){ return allFaces(s).flatMap(f=>f.marks||[]); }
function syncPlans(s){
  const all=marks(s), fs=allFaces(s);
  (s.items||[]).forEach(it=>{ const m=all.filter(x=>x.itemId===it.id);
    const req=fs.reduce((t,f)=>t+n((f.req||{})[it.id]),0);
    if(!m.length && !req) return;
    it.qty=Math.max(req,m.length); it.fix=m.filter(x=>mf(x).fix).length; it.glass=m.filter(x=>mf(x).glass).length; it.sil=m.filter(x=>mf(x).sil).length; });
}
function planLinked(s,itemId){ return allFaces(s).some(f=>(f.marks||[]).some(m=>m.itemId===itemId) || n((f.req||{})[itemId])>0); }
const FACEL={front:"أ",right:"ي",back:"خ",left:"س"};
function uPrefix(it){ const nm=String(it&&it.name||""); return /شب|نافذ|window/i.test(nm)?"W":/باب|أبواب|door/i.test(nm)?"D":/ثابت|fixed/i.test(nm)?"F":/واجه|facade|curtain/i.test(nm)?"CW":"U"; }
function unitsOf(s,fl,f,itemId){
  f.units=f.units||{}; f.req=f.req||{};
  if(!Array.isArray(f.units[itemId])){ f.units[itemId]=[]; const q=n(f.req[itemId]); if(q){ addUnits(s,fl,f,itemId,q); S.needSave=s; } }
  return f.units[itemId];
}
const FCODES=[[/أرض|ground/i,"G"],[/أول|first/i,"F"],[/ثاني|second/i,"S"],[/ثالث|third/i,"T"],[/رابع|fourth/i,"FO"],[/خامس|fifth/i,"FI"],[/سادس|sixth/i,"SI"],[/سابع|seventh/i,"SE"],[/ثامن|eighth/i,"E"],[/تاسع|ninth/i,"N"],[/عاشر|tenth/i,"TE"],[/سطح|roof/i,"R"],[/ميزان|mezz/i,"M"],[/قبو|سرداب|basement/i,"B"]];
const FORD=["F","S","T","FO","FI","SI","SE","E","N","TE"];
function recodeFloor(s,fl,old,nw){ FACES.forEach(([k])=>{ const f=fl.faces[k]; Object.entries((f&&f.units)||{}).forEach(([itemId,arr])=>{ const tp=uPrefix(s.items.find(i=>i.id===itemId));
  (arr||[]).forEach(u=>{ const m=String(u.name).match(new RegExp("^"+tp+old+"(\\d+)$")); if(m) u.name=tp+nw+m[1]; }); }); }); }
function floorCode(s,fl){ if(fl.code) return fl.code; const nm=String(fl.name||""); for(const [re,c] of FCODES) if(re.test(nm)) return c; const i=floors(s).indexOf(fl); return FORD[Math.max(0,i)]||("L"+(i+1)); }
function renameAutoUnits(s){ let ch=false; floors(s).forEach(fl=>{ const fc=floorCode(s,fl); FACES.forEach(([k])=>{ const f=fl.faces[k]; Object.entries((f&&f.units)||{}).forEach(([itemId,arr])=>{
    const it=s.items.find(i=>i.id===itemId); const tp=uPrefix(it); (arr||[]).forEach(u=>{ const m=String(u.name).match(new RegExp("^"+tp+"(\\d+)$")); if(m){ u.name=tp+fc+m[1]; ch=true; } }); }); }); }); return ch; }
function addUnits(s,fl,f,itemId,count){
  const it=s.items.find(i=>i.id===itemId); const pre=uPrefix(it)+floorCode(s,fl); f.units=f.units||{}; const list=f.units[itemId]=f.units[itemId]||[];
  let max=0; FACES.forEach(([k])=>{ const ff=fl.faces[k]; Object.values((ff&&ff.units)||{}).forEach(arr=>(arr||[]).forEach(u=>{ const m=String(u.name).match(new RegExp("^"+pre+"(\\d+)$","i")); if(m) max=Math.max(max,+m[1]); })); });
  for(let i=0;i<count;i++) list.push({id:uid(),name:pre+(max+i+1)});
  f.req[itemId]=list.length;
}
function unitName(s,m){ if(!m.unit) return null; for(const fl of floors(s)) for(const [k] of FACES){ const us=(fl.faces[k].units||{})[m.itemId]||[]; const u=us.find(x=>x.id===m.unit); if(u) return u.name; } return null; }
function mLabel(s,m,list){
  { const un=unitName(s,m); if(un) return un; }
  const it=(s.items||[]).find(i=>i.id===m.itemId); const nm=(it&&it.name)||"?";
  const ch=uPrefix(it);
  if(m.siteId){ const same=Object.values(S.mk).filter(x=>x.siteId===m.siteId&&x.fl===m.fl&&x.itemId===m.itemId).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0)||(a.id<b.id?-1:1));
    return ch+(same.findIndex(x=>x.id===m.id)+1); }
  const same=(list||marks(s)).filter(x=>x.itemId===m.itemId); return ch+(same.indexOf(m)+1);
}
function mShape(s,m){ const i=(s.items||[]).findIndex(x=>x.id===m.itemId); return ["","sq","dm"][i%3]; }
const SK=["fix","glass","sil"];
function mf(m){ if(m.fix===undefined && m.glass===undefined && m.sil===undefined){ const st=m.stage||0; return {fix:st>=1,glass:st>=2,sil:st>=3}; } return {fix:!!m.fix,glass:!!m.glass,sil:!!m.sil}; }
function mTop(m){ const f=mf(m); return f.sil?3:f.glass?2:f.fix?1:0; }
function markHtml(s,m,act,list,faded,other){
  const f=mf(m), top=mTop(m);
  return `<span class="mk ${mShape(s,m)} ${faded?"faded":""} ${other?"other":""} ${act&&S.sel&&S.sel.id===m.id?"on":""}" ${act?`data-mid="${m.id}" role="button" tabindex="0"`:""} style="left:${m.x}%;top:${m.y}%;background:${MCOL[top]}"><bdi class="u">${esc(mLabel(s,m,list))}</bdi><span class="segs">${SK.map((k,i)=>`<i style="background:${f[k]?MCOL[i+1]:"#ffffff"}"></i>`).join("")}</span></span>`;
}
function oldMarkHtml(s,m,act,list,faded){
  return `<span class="mk ${mShape(s,m)} ${faded?"faded":""} ${act&&S.sel&&S.sel.id===m.id?"on":""}" ${act?`data-mid="${m.id}" role="button" tabindex="0"`:""} style="left:${m.x}%;top:${m.y}%;background:${MCOL[m.stage||0]}" title="${esc(MSTAGE[m.stage||0])}"><bdi class="u">${esc(mLabel(s,m,list))}</bdi></span>`;
}
function faceRows(s,f){
  const ms=f.marks||[];
  return s.items.map(it=>{ const q=n((f.req||{})[it.id]); const mm=ms.filter(m=>m.itemId===it.id); if(!q&&!mm.length) return null;
    const st=SK.map(k=>mm.filter(m=>mf(m)[k]).length); return {it,q,marked:mm.length,st,diff:q-mm.length}; }).filter(Boolean);
}
function faceState(s,f){ const rs=faceRows(s,f); if(!rs.length) return -1; if(rs.every(r=>r.st[2]===Math.max(r.q,r.marked))) return 3; return rs.every(r=>r.diff===0)?2:1; }
function faceImg(fl,f){ return f.fileId||fl.fileId; }
function diffChip(r){
  if(!r.q) return `<span class="chip ex">${r.marked} معلّم</span>`;
  if(r.diff>0) return `<span class="chip ex">ينقص <span class="num">${r.diff}</span></span>`;
  if(r.diff<0) return `<span class="chip ex">زيادة <span class="num">${-r.diff}</span></span>`;
  return `<span class="chip done">مطابق</span>`;
}
function ensureFixed(s){ if(!s.items.some(i=>/ثابت|fixed/i.test(i.name))){ s.items.push({id:uid(),name:tr("ثابت"),qty:0,fix:0,sil:0,glass:0}); return true; } return false; }
function legendHtml(s,ms){
  const none=ms.filter(m=>mTop(m)===0).length;
  return `<span><i style="background:${MCOL[0]}"></i>لم يبدأ <span class="num">(${none})</span></span>`+STAGES.map(([k,l],i)=>`<span><i style="background:${MCOL[i+1]}"></i>${l} <span class="num">(${ms.filter(m=>mf(m)[k]).length} / ${ms.length})</span></span>`).join("");
}
function removeSite(id){
  const s=S.sites[id]; if(!s) return;
  const files=[s.coverId,...floors(s).flatMap(fl=>[fl.fileId,...FACES.map(([k])=>fl.faces[k].fileId)]),...s.photos.map(p=>p.fileId),...s.purchases.map(p=>p.fileId),...s.payments.map(p=>p.fileId),...(s.quotes||[]).map(q=>q.fileId)].filter(Boolean);
  Object.values(S.mk).filter(m=>m.siteId===id).forEach(m=>delMark(m.id));
  delete S.sites[id]; clearTimeout(timers[id]);
  if(S.mode==="db"){ db.doc("sites/"+id).delete().catch(()=>toast("تعذر حذف الموقع")); files.forEach(dropAsset); }
  else localSave();
}
const pendingDrops={};
function dropAsset(id){ if(!id||!assets) return; clearTimeout(pendingDrops[id]); pendingDrops[id]=setTimeout(()=>{ delete pendingDrops[id]; assets.delete(id).catch(()=>{}); },25000); }
function keepAssets(obj){ const str=JSON.stringify(obj||{}); for(const m of str.matchAll(/"(?:fileId|coverId)":"([^"]+)"/g)){ if(pendingDrops[m[1]]){ clearTimeout(pendingDrops[m[1]]); delete pendingDrops[m[1]]; } } }
function siteUndo(snap, marks, msg){ undoToast(msg, ()=>{ keepAssets(snap); S.sites[snap.id]=JSON.parse(JSON.stringify(snap)); (marks||[]).forEach(m=>{ if(!S.mk[m.id]){ delete tomb[m.id]; putMark({...m}); } }); save(S.sites[snap.id]); }); }
function settingsUndo(key, prev, msg){ undoToast(msg, ()=>{ S.settings[key]=prev; settingsSave(); }); }

async function boot(){
  render();
  try{ db = await claude.use("db"); }catch(e){ db=null; }
  try{ assets = await claude.use("assets"); }catch(e){}
  try{ downloads = await claude.use("downloads"); }catch(e){}
  try{ const u=await claude.use("user"); if(u){ S.canWrite=await u.can("data.write"); S.canFiles=await u.canEdit(); } }catch(e){}
  try{ sample = await claude.use("sample"); if(sample){ const l=await sample.limits().catch(()=>null); canRead=!!(l&&l.images); } }catch(e){}
  if(db){
    S.mode="db";
    db.collection("sites").onSnapshot(q=>{ S.sitesLoaded=true;
      q.docs.forEach(d=>{ if(!dirty[d.id] && !held[d.id]) S.sites[d.id]={...JSON.parse(JSON.stringify(d.data()||{})), id:d.id}; });
      q.docChanges().forEach(c=>{ if(c.type==="removed" && !held[c.doc.id]) delete S.sites[c.doc.id]; });
      cuRecover();
      if(!document.activeElement || !document.activeElement.matches("input,textarea,select")) render();
    }, ()=>toast("انقطع الاتصال بقاعدة البيانات"));
    try{ db.collection("marks").get().then(q=>{ mergeMarks(q.docs); render(); }).catch(()=>{}); }catch(e){}
    db.collection("marks").onSnapshot(q=>{
      mergeMarks(q.docs);
      if(!document.activeElement || !document.activeElement.matches("input,textarea,select")) render();
    }, ()=>toast("انقطع الاتصال بقاعدة البيانات"));
    db.collection("custody").onSnapshot(q=>{ cuMerge(q.docs); S.cuLoaded=true; cuRecover(); cuCheckLow(); cuCheckIdle(); setTimeout(cuRecover,50000); if(!document.activeElement || !document.activeElement.matches("input,textarea,select")) render(); }, ()=>{});
    db.collection("docs").onSnapshot(q=>{ docMerge(q.docs); S.docsLoaded=true; S.docsOk=true; if(!document.activeElement || !document.activeElement.matches("input,textarea,select")) render(); }, err=>{ if(isAdmin()&&/PGRST20[0-9]|42P01|Could not find|does not exist|schema cache/i.test(String(err&&(err.message||err.code)||""))){ S.docsOk=false; if(S.view==="docs") render(); } });
    db.doc("settings/company").onSnapshot(d=>{ if(d.exists){ S.settings={...S.settings,...JSON.parse(JSON.stringify(d.data()||{}))}; } if(!document.activeElement || !document.activeElement.matches("input,textarea,select")) render(); },()=>{});
    if(AU()) AU().onChange(onAuth); else { S.setLoaded=true; render(); }
  } else {
    S.mode="local";
    try{ S.mk = JSON.parse(localStorage.getItem("marks-local")||"{}"); S.mkReady=true; S.sites = JSON.parse(localStorage.getItem("sites-local")||"{}"); S.settings={...S.settings,...JSON.parse(localStorage.getItem("sites-settings")||"{}")}; S.cu=JSON.parse(localStorage.getItem("cust-local")||"{}"); }catch(e){}
    S.setLoaded=true; checkLogin(); setTimeout(refreshPush,500);
  }
  render();
}

