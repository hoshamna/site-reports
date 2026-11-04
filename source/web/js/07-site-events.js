/* ---------- events ---------- */
function setPath(obj, path, val){ const [i,k]=path.split("."); obj[+i][k]=val; }
app.addEventListener("input", e=>{
  const t=e.target, s=site();
  if(t.dataset.set){ S.settings[t.dataset.set]=t.value; clearTimeout(timers._set); timers._set=setTimeout(settingsSave,600); return; }
  if(!s) return;
  const num = t.type==="number";
  const v = num ? (t.value===""?0:n(t.value)) : t.value;
  if(t.dataset.iv&&S.inv){ S.inv.d[t.dataset.iv]=t.type==="checkbox"?t.checked:(t.type==="number"?t.value:v); if(["gross","rate"].includes(t.dataset.iv)){ clearTimeout(S.ivT); S.ivT=setTimeout(()=>{ const el=document.activeElement; const id0=el&&el.id; render(); const e2=id0&&document.getElementById(id0); if(e2){ e2.focus(); try{ const L=e2.value.length; e2.setSelectionRange&&e2.type!=="number"&&e2.setSelectionRange(L,L); }catch(x){} } },500); } return; }
  if(t.dataset.f) s[t.dataset.f]=t.type==="checkbox"?t.checked:v;
  else if(t.dataset.i) setPath(s.items,t.dataset.i,v);
  else if(t.dataset.p) setPath(s.payments,t.dataset.p,v);
  else if(t.dataset.ud){ if(S.purDraft) S.purDraft[t.dataset.ud]=v; return; }
  else if(t.dataset.u) setPath(s.purchases,t.dataset.u,v);
  else if(t.dataset.ph) setPath(s.photos,t.dataset.ph,v);
  else if(t.dataset.is) setPath(s.issues,t.dataset.is,v);
  else if(t.dataset.sc) setPath(s.schedule,t.dataset.sc,t.type==="checkbox"?t.checked:v);
  else if(t.dataset.lb) setPath(s.labor,t.dataset.lb,v);
  else if(t.dataset.oc) setPath(s.otherCosts,t.dataset.oc,v);
  else if(t.dataset.fl){ const fl=floors(s)[S.planIdx]; if(fl){ const old=floorCode(s,fl); fl[t.dataset.fl]=t.dataset.fl==="code"?String(v).toUpperCase().replace(/[^A-Z0-9]/g,""):v; const nw=floorCode(s,fl); if(old!==nw&&nw) recodeFloor(s,fl,old,nw); } }
  else if(t.dataset.rq){ return; }
  else if(t.dataset.un){ const fl=floors(s)[S.planIdx]; if(fl){ const [id,i]=t.dataset.un.split("|"); const u=unitsOf(s,fl,fl.faces[S.face],id)[+i]; if(u) u.name=String(v).trim()||u.name; } }
  else return;
  save(s, true);
});
let pd=null;
let drag=null;
app.addEventListener("pointerdown", e=>{ const box=e.target.closest("#pbox"); pd = box ? {x:e.clientX,y:e.clientY,t:Date.now()} : null;
  const mk=(S.edit?e.target.closest(".mk.on[data-mid]"):null);
  if(mk && S.sel && S.sel.id===mk.dataset.mid){ drag={el:mk,id:mk.dataset.mid,moved:false}; try{ mk.setPointerCapture(e.pointerId); }catch(x){} e.preventDefault(); } });
app.addEventListener("pointermove", e=>{ if(!drag) return; const img=document.getElementById("planImg"); if(!img) return; const r=img.getBoundingClientRect();
  const x=Math.min(100,Math.max(0,(e.clientX-r.left)/r.width*100)), y=Math.min(100,Math.max(0,(e.clientY-r.top)/r.height*100));
  drag.el.style.left=x+"%"; drag.el.style.top=y+"%"; drag.x=+x.toFixed(2); drag.y=+y.toFixed(2); drag.moved=true; e.preventDefault(); });
app.addEventListener("pointerup", e=>{
  if(drag){ const d=drag; drag=null; pd=null; if(d.moved){ const m=S.mk[d.id]; if(m){ m.x=d.x; m.y=d.y; snapMark(m); putMark(m); } render(); return; } }
  const box=e.target.closest("#pbox"); if(!box||!pd) return;
  if(S.outline||S.crop){ const moved0=Math.hypot(e.clientX-pd.x,e.clientY-pd.y); pd=null; if(moved0>10) return;
    const im=document.getElementById("planImg"), rr=im.getBoundingClientRect(); const px=+((e.clientX-rr.left)/rr.width*100).toFixed(2), py=+((e.clientY-rr.top)/rr.height*100).toFixed(2);
    if(px<0||px>100||py<0||py>100) return;
    if(S.crop){ if(!S.crop.p1){ S.crop.p1=[px,py]; render(); return; } const [x1,y1]=S.crop.p1; const fl=floors(site())[S.planIdx];
      const c={x:Math.min(x1,px),y:Math.min(y1,py),w:Math.abs(px-x1),h:Math.abs(py-y1)}; if(c.w<5||c.h<5){ toast("المساحة صغيرة جداً"); return; }
      fl.crop=c; S.crop=null; save(site()); toast("تم القص"); render(); return; }
    if(S.outline.step==="points"){ S.outline.pts.push([px,py]); render(); } return; }
  { const s0=site(); const fl0=s0&&floors(s0)[S.planIdx]; if(s0&&fl0&&!isEditing(s0,fl0)){ pd=null; toast("اضغط «✏️ تعديل الواجهة» أولاً"); return; } }
  const moved=Math.hypot(e.clientX-pd.x,e.clientY-pd.y); const start=pd; pd=null;
  if(moved>10 || Date.now()-start.t>900) return;
  const s=site(); if(!s) return;
  const mk=e.target.closest("[data-mid]");
  if(mk){ S.sel={mode:"edit",id:mk.dataset.mid}; S.armed=null; render(); return; }
  const img=document.getElementById("planImg"), r=img.getBoundingClientRect();
  let x=(e.clientX-r.left)/r.width*100, y=(e.clientY-r.top)/r.height*100; if(x<0||x>100||y<0||y>100) return;
  { const fl=floors(s)[S.planIdx], f=fl.faces[S.face];
    if(!f.fileId && fl.outline && fl.outline.pts && fl.outline.pts.length>=3){ const ed=faceEdges(fl,S.face);
      if(!ed.length){ toast("هذه الواجهة غير محددة على حدود المبنى. حدّد لها ضلعاً من «تعديل الحدود»"); return; }
      const nb=nearestOn(fl,ed,x,y); const px=nb.d*r.width/100; if(px>45){ toast("اضغط قريباً من خط "+tr(faceName(S.face))); return; } x=nb.x; y=nb.y; } }
  if(!S.addItem && s.items[0]) S.addItem=s.items[0].id;
  S.sel={mode:"new",x:+x.toFixed(2),y:+y.toFixed(2)}; S.selFace=S.face; S.selUnit=nextFreeUnit(s,S.addItem); S.armed=null; render();
});
app.addEventListener("pointercancel", ()=>{ pd=null; });
app.addEventListener("change", e=>{ const t=e.target;
  if(t.dataset&&t.dataset.side!==undefined&&S.outline){ S.outline.sides[+t.dataset.side]=t.value; render(); return; }
  if(t.dataset&&t.dataset.rq){ const s=site(); if(!s) return; const v=t.value;
    if(true){ const fl=floors(s)[S.planIdx]; if(fl){ const f=fl.faces[S.face]; const id=t.dataset.rq; const us=unitsOf(s,fl,f,id); const want=Math.max(0,Math.floor(n(v)));
      if(want>us.length) addUnits(s,fl,f,id,want-us.length); else if(want<us.length){ us.splice(want).forEach(u=>unlinkUnit(s,u.id)); f.req[id]=us.length; } } }
    save(s); clearTimeout(S.chgT); S.chgT=setTimeout(render,300); return; } if(e.target.matches("[data-f],[data-i],[data-p],[data-u],[data-rq],[data-un],[data-fl],[data-iv],[data-sc],[data-lb],[data-oc],[data-is],select[data-ph]")){ clearTimeout(S.chgT); S.chgT=setTimeout(()=>{ if(!document.activeElement||!document.activeElement.matches("input,textarea")) render(); },350); } });
app.addEventListener("click", async e=>{
  const b=e.target.closest("[data-act]"); if(!b) return; CAM=b.dataset.cam==="1";
  let a=b.dataset.act; let s=site(); const id=b.dataset.id;
  const QA=["qvoice","qphoto","qplan","qinv","qchq","qiss","repopen"];
  if(S.view==="list" && QA.includes(a)){ const act=activeSites();
    if(act.length===1){ goSite(act[0].id); s=site(); }
    else if(!act.length){ toast("أضف موقعاً أولاً"); return; }
    else { S.pick=a; render(); return; } }
  if(a==="pickgo"){ goSite(id); s=site(); a=b.dataset.q; S.pick=null; }
  if(a==="pickclose"){ S.pick=null; render(); return; }
  if(a==="qchq"){ S.payPick=true; S.afterTab="money"; render(); return; }
  if(a==="qvoice"){ if(!s) return; S.tab="summary"; S.voice={siteId:s.id,text:"",stage:"text",rec:false}; render(); if(SR) recStart(); return; }
  if(a==="qphoto"||a==="qinv"){ const map={qphoto:["addph","photos"],qinv:["scanpur","purchases"]}; S.afterTab=map[a][1]; a=map[a][0]; CAM=true; }
  const arm=(key,fn)=>{ if(S.armed===key){ S.armed=null; const snapS=(s&&key!=="undo")?JSON.parse(JSON.stringify(s)):null; const snapM=snapS?Object.values(S.mk).filter(m=>m.siteId===s.id).map(m=>({...m})):null; fn(); if(snapS) siteUndo(snapS,snapM,key==="site"?"🗑️ تم حذف الموقع":key==="olclr"?"تم مسح الحدود":"🗑️ تم الحذف"); } else { S.armed=key; setTimeout(()=>{ if(S.armed===key){S.armed=null;render();} },4000);} render(); };
  if((a==="floorsel"||a==="facesel"||a==="tab"||a==="back"||a==="addfloor"||a==="delfloor"||a==="open"||a==="editstart") && (S.outline||S.crop)){ toast("أكمل تحديد الحدود أو القص، أو اضغط إلغاء"); return; }
  if((a==="floorsel"||a==="facesel"||a==="tab"||a==="back"||a==="addfloor"||a==="delfloor"||a==="open") && S.edit && s && S.edit.siteId===s.id){ toast("أنهِ تعديل الواجهة أو تراجع عنه أولاً"); const el=document.querySelector(".editbar"); el&&el.scrollIntoView({behavior:"smooth",block:"center"}); return; }
  if(a==="new"){ const ns=newSite(); S.sites[ns.id]=ns; save(ns); S.cur=ns.id; S.newSite=ns.id; S.view="site"; S.tab="summary"; render(); setTimeout(()=>{const el=document.getElementById("f-name"); if(el){ el.scrollIntoView({block:"center"}); el.focus(); el.select(); }},60); toast("اكتب اسم المشروع"); }
  else if(a==="open"){ goSite(id); render(); window.scrollTo(0,0); }
  else if(a==="lang"){ lang = lang==="en"?"ar":"en"; try{ localStorage.setItem("sites-lang",lang); }catch(e){} render(); }
  else if(a==="back"){ if(Object.keys(unsaved).some(k=>unsaved[k])){ flushAll(); toast("✓ حُفظت تعديلاتك"); } S.view="list"; S.armed=null; render(); }
  else if(a==="tab"){ S.tab=b.dataset.tab; S.sel=null; if(S.tab==="plan"&&s){ const had=!!s.floors; const fls=floors(s); if(!fls.length){ fls.push(newFloor(s,1)); ensureFixed(s); } if(!had||fls.length) save(s); } S.armed=null; render(); }
  else if(a==="olmanual"){ if(S.edit){ toast("أنهِ تعديل الواجهة أولاً"); return; } const fl=floors(s)[S.planIdx]; S.outline={fl:fl.id,step:"points",pts:[],sides:[]}; S.sel=null; render(); }
  else if(a==="olauto"){ if(S.edit){ toast("أنهِ تعديل الواجهة أولاً"); return; } const fl=floors(s)[S.planIdx]; try{ const blob=await (await mediaFetch(fl.fileId)).blob(); await runDetect(s,fl,blob,b); }catch(e){ toast("تعذر قراءة الخريطة"); } }
  else if(a==="olundo"){ S.outline.pts.pop(); render(); }
  else if(a==="olclose"){ const o=S.outline; if(o.pts.length<3) return; o.sides=autoSides(o.pts); o.step="sides"; render(); }
  else if(a==="olredo"){ S.outline.step="points"; S.outline.pts=[]; S.outline.sides=[]; render(); }
  else if(a==="olcancel"){ S.outline=null; render(); }
  else if(a==="olsave"){ const fl=floors(s)[S.planIdx]; const o=S.outline; fl.outline={pts:o.pts,sides:o.sides}; if(o.crop&&!fl.crop) fl.crop=o.crop; S.outline=null;
    const used=new Set(o.sides); if(!used.has(S.face)) S.face=o.sides[0]; save(s); toast("تم حفظ حدود المبنى"); render(); }
  else if(a==="olclear") arm("olclr",()=>{ const fl=floors(s)[S.planIdx]; fl.outline=null; save(s); });
  else if(a==="cropstart"){ if(S.edit){ toast("أنهِ تعديل الواجهة أولاً"); return; } const fl=floors(s)[S.planIdx]; fl.crop=null; S.crop={p1:null}; S.sel=null; render(); }
  else if(a==="cropcancel"){ S.crop=null; render(); }
  else if(a==="cropclear"){ const fl=floors(s)[S.planIdx]; fl.crop=null; save(s); render(); }
  else if(a==="editstart"){ startEdit(s); render(); }
  else if(a==="editdone"){ S.edit=null; S.sel=null; save(s); toast("تم حفظ الواجهة"); render(); }
  else if(a==="editundo") arm("undo",()=>{ undoEdit(s); toast("تم التراجع"); });
  else if(a==="floorsel"){ S.planIdx=+b.dataset.i; S.sel=null; render(); }
  else if(a==="facesel"){ S.face=b.dataset.face; S.sel=null; render(); }
  else if(a==="addfloor"){ const fls=floors(s); const used=fls.map(f=>FLOORN.findIndex(x=>tr(x)===f.name)); const nx=fls.length?Math.max(...used,fls.length-1)+1:1; fls.push(newFloor(s,nx)); if(fls.length===1) ensureFixed(s); S.planIdx=fls.length-1; S.face="front"; save(s); render(); }
  else if(a==="unitadd"){ const fl=floors(s)[S.planIdx]; const f=fl.faces[S.face]; unitsOf(s,fl,f,id); const el=document.getElementById("ua-"+id); const k=Math.max(1,Math.min(200,Math.floor(n(el&&el.value)||1)));
    addUnits(s,fl,f,id,k); save(s); toast(`+${k}`); render(); }
  else if(a==="unitdel"){ const fl=floors(s)[S.planIdx]; const f=fl.faces[S.face]; const us=unitsOf(s,fl,f,id); const [u]=us.splice(+b.dataset.i,1); if(u) unlinkUnit(s,u.id); f.req[id]=us.length; save(s); render(); }
  else if(a==="selunit"){ if(S.sel.mode==="new") S.selUnit=id; else { const m=S.mk[S.sel.id]; if(m){ m.unit=id; putMark(m); save(s);} } render(); }
  else if(a==="addfixed"){ ensureFixed(s); save(s); render(); }
  else if(a==="delfloor") arm("floor",()=>{ const fls=floors(s); const fl=fls[S.planIdx]; [fl.fileId,...FACES.map(([k])=>fl.faces[k].fileId)].forEach(dropAsset); Object.values(S.mk).filter(m=>m.siteId===s.id&&m.fl===fl.id).forEach(m=>delMark(m.id)); fls.splice(S.planIdx,1); S.planIdx=0; save(s); });
  else if(a==="delfaceimg") arm("faceimg",()=>{ const f=floors(s)[S.planIdx].faces[S.face]; dropAsset(f.fileId); f.fileId=null; save(s); });
  else if(a==="zoom"){ const z=[1,1.5,2,3,4]; let i=z.indexOf(S.zoom); i=Math.max(0,Math.min(z.length-1,i+ +b.dataset.z)); S.zoom=z[i]; render(); }
  else if(a==="selface"){ const k=b.dataset.face; if(S.sel.mode==="new") S.selFace=k; else { const m=S.mk[S.sel.id]; if(m){ m.face=k; putMark(m); save(s);} } render(); }
  else if(a==="selitem"){ if(S.sel.mode==="new"){ S.addItem=id; S.selUnit=nextFreeUnit(s,id); } else { const m=S.mk[S.sel.id]; if(m){ m.itemId=id; S.addItem=id; putMark(m); save(s);} } render(); }
  else if(a==="seltog"){ const k=b.dataset.k; const fl=floors(s)[S.planIdx]; let m;
    if(S.sel.mode==="new"){ if(!S.addItem){ toast("اختر النوع أولاً"); return; }
      m={id:uid(),siteId:s.id,fl:fl.id,face:S.face,unit:S.selUnit||null,x:S.sel.x,y:S.sel.y,itemId:S.addItem,fix:false,glass:false,sil:false,createdAt:Date.now()}; S.sel={mode:"edit",id:m.id}; }
    else m=S.mk[S.sel.id];
    if(!m) return; m[k]=!m[k]; putMark(m); save(s);
    toast(m[k]?`${tr(STAGES.find(x=>x[0]===k)[1])} ✓`:"أُلغي"); render(); }
  else if(a==="selsave"){ const fl=floors(s)[S.planIdx]; if(!S.addItem){ toast("اختر النوع أولاً"); return; }
    putMark({id:uid(),siteId:s.id,fl:fl.id,face:S.face,unit:S.selUnit||null,x:S.sel.x,y:S.sel.y,itemId:S.addItem,fix:false,glass:false,sil:false,createdAt:Date.now()}); S.sel=null; save(s); render(); }
  else if(a==="selcancel"){ S.sel=null; S.armed=null; render(); }
  else if(a==="seldel") arm("mk",()=>{ delMark(S.sel.id); S.sel=null; save(s); });
  else if(a==="floorimg"||a==="faceimg"){
    const files=await pickFiles("image/*,application/pdf",false); if(!files.length) return;
    b.classList.add("busy"); b.textContent=tr("جارٍ تجهيز الخريطة…"); save(s); hold(s);
    try{
      let file=files[0];
      if(file.type==="application/pdf"||/\.pdf$/i.test(file.name)) file=await pdfToImage(file);
      if(!assets){ toast("رفع الصور متاح لمالك الصفحة فقط"); }
      else { const blob=await compress(file,2600); const r=await assets.upload(blob); const fl=floors(s)[S.planIdx];
        if(a==="floorimg"){ dropAsset(fl.fileId); fl.fileId=r.id; fl.aspect=null; fl.crop=null; fl.outline=null; } else { const f=fl.faces[S.face]; dropAsset(f.fileId); f.fileId=r.id; }
        S.sel=null; if(a==="floorimg"&&canRead){ release(s); save(s); render(); await runDetect(s,fl,blob,null); hold(s); } }
    }catch(err){ toast(err&&err.pdf?"تعذر فتح ملف PDF، ارفع الخريطة كصورة":"تعذر رفع الملف، حاول مرة أخرى"); }
    release(s); save(s); if(S.afterTab){ S.tab=S.afterTab; S.afterTab=null; } render();
  }
  else if(a==="delsite") arm("site",()=>{ removeSite(s.id); S.view="list"; });
  else if(a==="additem"){ s.items.push({id:uid(),name:tr(b.dataset.name),qty:0,fix:0,sil:0,glass:0}); save(s); render(); }
  else if(a==="delitem") arm(id,()=>{ s.items=s.items.filter(x=>x.id!==id); Object.values(S.mk).filter(m=>m.siteId===s.id&&m.itemId===id).forEach(m=>delMark(m.id)); allFaces(s).forEach(f=>{ if(f.req) delete f.req[id]; }); save(s); });
  else if(a==="addpay"){ s.payments.push({id:uid(),date:today(),amount:0,note:"",method:b.dataset.m||"cash"}); S.payPick=false; save(s); if(S.afterTab){ S.tab=S.afterTab; S.afterTab=null; } render(); setTimeout(()=>{ const el=document.querySelector(`[data-p="${s.payments.length-1}.amount"]`); el&&(el.scrollIntoView({block:"center"}),el.focus()); },80); }
  else if(a==="setpm"){ const p=s.payments.find(x=>x.id===id); if(p){ p.method=b.dataset.m; save(s); render(); } }
  else if(a==="paypickclose"){ S.payPick=false; render(); }
  else if(a==="scanpay"){
    const files=await pickFiles("image/*,application/pdf",false); if(!files.length) return;
    S.payPick=false; const p={id:uid(),date:today(),amount:0,note:"",chequeNo:"",bank:"",ref:"",method:b.dataset.m||"cheque",fileId:null,fileType:null}; s.payments.push(p); save(s); hold(s);
    b.classList.add("busy"); b.textContent=tr("جارٍ الرفع…");
    try{ let f=files[0]; if(isPdfFile(f)) f=(await pdfPages(f,1))[0]; // a PDF advice is read from its first page as an image
      const r=await upload(f); if(r){ p.fileId=r.id; p.fileType=r.type; save(s);
      if(r.type==="image" && canRead){ b.textContent=tr("جارٍ القراءة…"); await readCheque(p, f); }
      else if(isPdfFile(f)) toast("تعذر فتح ملف PDF للقراءة، أدخل المبلغ يدوياً أو ارفع لقطة شاشة"); } }
    catch(err){ toast("تعذر رفع الملف، حاول مرة أخرى"); }
    release(s); save(s); if(S.afterTab){ S.tab=S.afterTab; S.afterTab=null; } render();
  }
  else if(a==="delquote") arm(id,()=>{ const q=s.quotes.find(x=>x.id===id); dropAsset(q&&q.fileId); s.quotes=s.quotes.filter(x=>x.id!==id); save(s); });
  else if(a==="delpay") arm(id,()=>{ const pp=s.payments.find(x=>x.id===id); dropAsset(pp&&pp.fileId); s.payments=s.payments.filter(x=>x.id!==id); save(s); });
  else if(a==="addpur"){ if(!S.purDraft||S.purDraft.site!==s.id) S.purDraft={site:s.id,date:today(),supplier:"",desc:"",amount:"",note:""}; render(); setTimeout(()=>{ const el=document.getElementById("ud-amount"); if(el){ el.scrollIntoView({block:"center"}); el.focus(); } },60); }
  else if(a==="purdraftx"){ S.purDraft=null; render(); }
  else if(a==="purdraftok"){ const d=S.purDraft; if(!d) return;
    if(!(n(d.amount)>0)){ toast("اكتب المبلغ أولاً"); const el=document.getElementById("ud-amount"); el&&el.focus(); return; }
    if(!String(d.supplier||"").trim()&&!String(d.desc||"").trim()){ toast("اكتب اسم المورد أو البيان"); const el=document.getElementById("ud-supplier"); el&&el.focus(); return; }
    const p={id:uid(),date:d.date||today(),supplier:String(d.supplier||"").trim(),desc:String(d.desc||"").trim(),amount:n(d.amount),note:d.note||"",fileId:null,fileType:null};
    s.purchases.push(p); S.purDraft=null; save(s); render();
    const sid=s.id; undoToast("✓ حُفظت الفاتورة", ()=>{ const x=S.sites[sid]; if(x){ x.purchases=x.purchases.filter(q=>q.id!==p.id); save(x); render(); } }); }
  else if(a==="scanpur"){
    const files=await pickFiles("image/*,application/pdf",false); if(!files.length) return;
    const p={id:uid(),date:today(),supplier:"",desc:"",amount:0,fileId:null,fileType:null}; s.purchases.push(p); save(s); hold(s);
    b.classList.add("busy"); b.textContent=tr("جارٍ الرفع…");
    try{ await attachInvoice(s,p,files[0],b); }catch(err){ console.warn(err); toast("تعذر رفع الفاتورة"); }
    release(s); save(s); if(S.afterTab){ S.tab=S.afterTab; S.afterTab=null; } render();
  }
  else if(a==="readinv"){
    const p=s.purchases.find(x=>x.id===id); if(!p||!p.fileId) return;
    if(!canRead){ toast("قراءة الفاتورة تلقائياً غير متاحة في هذا العرض، أدخل المبلغ والمورد يدوياً"); return; }
    hold(s); b.classList.add("busy"); b.textContent=tr("جارٍ قراءة الفاتورة…");
    try{ const blob=await (await mediaFetch(p.fileId)).blob(); await readInvoice(p,new File([blob],"inv.jpg",{type:blob.type||"image/jpeg"})); }catch(err){ toast("تعذرت قراءة الفاتورة، اضغط «قراءة الفاتورة» للمحاولة مرة أخرى"); }
    release(s); save(s); if(S.afterTab){ S.tab=S.afterTab; S.afterTab=null; } render();
  }
  else if(a==="delpur") arm(id,()=>{ const p=s.purchases.find(x=>x.id===id); if(p&&p.cuId) return; dropAsset(p&&p.fileId); s.purchases=s.purchases.filter(x=>x.id!==id); save(s); });
  else if(a==="logoup"){ const files=await pickFiles("image/*",false); if(!files.length) return; b.classList.add("busy");
    try{ if(!assets){ toast("رفع الصور غير متاح في هذا العرض. افتح الصفحة من حسابك في تطبيق Claude أو claude.ai"); }
      else { const r=await assets.upload(files[0].type==="image/svg+xml"?files[0]:await compress(files[0],1200,"image/png")); if(S.settings.logoId) dropAsset(S.settings.logoId); S.settings.logoId=r.id; try{ const bm=await createImageBitmap(files[0]); S.settings.logoWide=bm.width/bm.height>2.6; }catch(x){ S.settings.logoWide=false; } settingsSave(); toast("تم رفع الشعار"); } }
    catch(e){ toast("تعذر رفع الشعار"); } render(); }
  else if(a==="imgup"){ const k=b.dataset.k; const files=await pickFiles("image/*",false); if(!files.length) return; b.classList.add("busy");
    try{ if(!assets) toast("رفع الصور غير متاح في هذا العرض. افتح الصفحة من حسابك في تطبيق Claude أو claude.ai"); else { const r=await assets.upload(await compress(files[0],900,"image/png")); if(S.settings[k]) dropAsset(S.settings[k]); S.settings[k]=r.id; settingsSave(); toast("تم الرفع"); } }catch(e){ toast("تعذر الرفع"); } render(); }
  else if(a==="logodel"){ dropAsset(S.settings.logoId); S.settings.logoId=null; settingsSave(); render(); }
  else if(a==="taxinv"){ const p=s.payments.find(x=>x.id===id); if(!p) return; if(!n(p.amount)){ toast("اكتب مبلغ الدفعة أولاً"); return; } openInv(s,p); S.lastInv=null; render(); }
  else if(a==="invclose"){ S.inv=null; render(); }
  else if(a==="invgo"){ if(S.busy) return; const p=s.payments.find(x=>x.id===S.inv.pid); const d=S.inv.d;
    if(!String(d.to||"").trim()){ toast("اكتب اسم العميل بالإنجليزية"); return; }
    if(!p.invoice){ const m=String(d.no).match(/(\d+)\s*$/); const seq=m?+m[1]:(n(S.settings.invSeq)+1); if(seq>n(S.settings.invSeq)){ S.settings.invSeq=seq; settingsSave(); } }
    p.invoice={...d,issuedAt:Date.now()}; save(s);
    S.busy="inv"; render(); try{ await makeInvoicePdf(s,p,p.invoice); }catch(err){ console.error(err); toast("تعذر إنشاء الفاتورة: "+(err&&err.message||"")); } S.busy=false; render(); }
  else if(a==="viewdoc"){ S.view2={k:b.dataset.k,id}; S.vz=1; S.vr=0; render(); }
  else if(a==="vclose"){ S.view2=null; render(); }
  else if(a==="vzoom"){ const z=[1,1.5,2,3,4]; let i=z.indexOf(S.vz||1); i=Math.max(0,Math.min(z.length-1,i+ +b.dataset.z)); S.vz=z[i]; render(); }
  else if(a==="vrot"){ S.vr=((S.vr||0)+90)%360; render(); }
  else if(a==="dlagain"){ if(window.__lastFile&&window.__dl) window.__dl(window.__lastFile); }
  else if(a==="sharefile"){ try{ const f=window.__lastFile; if(f&&navigator.canShare&&navigator.canShare({files:[f]})) await navigator.share({files:[f]}); else toast("المشاركة غير متاحة في هذا المتصفح"); }catch(e){} }
  else if(a==="repopen"){ S.repSheet=true; render(); }
  else if(a==="repclose"){ S.repSheet=false; render(); }
  else if(a==="qplan"){ S.tab="plan"; render(); window.scrollTo(0,0); }
  else if(a==="qiss"){ s.issues=s.issues||[]; s.issues.unshift({id:uid(),date:today(),face:"",text:"",action:"",status:"open",fileId:null}); S.tab="issues"; save(s); render(); window.scrollTo(0,0); setTimeout(()=>{ const el=document.querySelector("[data-is='0.text']"); el&&el.focus(); },80); }
  else if(a==="addsc"){ s.schedule=s.schedule||[]; s.schedule.push({id:uid(),name:"",pct:0,trigger:"progress",at:50}); save(s); render(); }
  else if(a==="sctpl"){ s.schedule=[{id:uid(),name:"دفعة مقدمة",pct:30,trigger:"sign"},{id:uid(),name:"بعد التركيب",pct:40,trigger:"glass"},{id:uid(),name:"بعد التسليم",pct:30,trigger:"handover",done:false}]; save(s); render(); }
  else if(a==="delsc") arm(id,()=>{ s.schedule=s.schedule.filter(x=>x.id!==id); save(s); });
  else if(a==="addlb"){ s.labor=s.labor||[]; s.labor.unshift({id:uid(),date:today(),desc:"",workers:1,days:1,rate:0,mode:"calc",amount:0}); save(s); render(); }
  else if(a==="dellb") arm(id,()=>{ s.labor=s.labor.filter(x=>x.id!==id); save(s); });
  else if(a==="addoc"){ s.otherCosts=s.otherCosts||[]; s.otherCosts.unshift({id:uid(),date:today(),desc:"",amount:0}); save(s); render(); }
  else if(a==="deloc") arm(id,()=>{ s.otherCosts=s.otherCosts.filter(x=>x.id!==id); save(s); });
  else if(a==="phface"){ S.phFace=b.dataset.face; render(); }
  else if(a==="newiss"){ s.issues=s.issues||[]; s.issues.unshift({id:uid(),date:today(),face:S.face||"",text:"",action:"",status:"open",fileId:null}); save(s); render(); setTimeout(()=>{ const el=document.querySelector("[data-is='0.text']"); el&&el.focus(); },50); }
  else if(a==="deliss") arm(id,()=>{ const x=s.issues.find(y=>y.id===id); dropAsset(x&&x.fileId); s.issues=s.issues.filter(y=>y.id!==id); save(s); });
  else if(a==="mvmk"){ const m=S.mk[S.sel&&S.sel.id]; if(!m) return; const st=0.4/S.zoom*2; const [dx,dy]=b.dataset.d.split(",").map(Number);
    const rtl=document.documentElement.dir==="rtl"; m.x=Math.min(100,Math.max(0,+(m.x+dx*st).toFixed(2))); m.y=Math.min(100,Math.max(0,+(m.y+dy*st).toFixed(2)));
    snapMark(m,true); S.mk[m.id]=m; clearTimeout(S.mvT); S.mvT=setTimeout(()=>putMark(m),400); render(); }
  else if(a==="delph") arm(id,()=>{ const p=s.photos.find(x=>x.id===id); dropAsset(p&&p.fileId); s.photos=s.photos.filter(x=>x.id!==id); save(s); });
  else if(a==="cover"||a==="inv"||a==="addph"||a==="chq"||a==="addquote"||a==="addiss"){
    const files = await pickFiles(a==="inv"||a==="chq"||a==="addquote"?"image/*,application/pdf":"image/*", a==="addph"||a==="addquote");
    if(!files.length) return;
    b.classList.add("busy"); b.textContent=tr("جارٍ الرفع…"); save(s); hold(s);
    try{
      if(a==="inv"){ const p=s.purchases.find(x=>x.id===id); await attachInvoice(s,p,files[0],b); files.length=0; }
      let list=files;
      if(a==="addquote"||a==="chq"){ list=[]; for(const f0 of files){ if(f0.type==="application/pdf"||/\.pdf$/i.test(f0.name)) list.push(...(await pdfPages(f0, a==="chq"?1:8))); else list.push(f0); } }
      for(const file of list){
        const r=await upload(file); if(!r) break;
        if(a==="cover"){ dropAsset(s.coverId); s.coverId=r.id; }
        else if(a==="chq"){ const p=s.payments.find(x=>x.id===id); dropAsset(p.fileId); p.fileId=r.id; p.fileType=r.type;
          if(r.type==="image" && canRead){ save(s); b.textContent=tr("جارٍ قراءة الشيك…"); await readCheque(p, file); }
          else if(isPdfFile(file)) toast("تعذر فتح ملف PDF للقراءة، أدخل المبلغ يدوياً أو ارفع لقطة شاشة"); }
        else if(a==="addquote"){ s.quotes=s.quotes||[]; s.quotes.push({id:uid(),fileId:r.id,fileType:r.type}); }
        else if(a=="addiss"){ const is=s.issues.find(x=>x.id===id); if(is){ dropAsset(is.fileId); is.fileId=r.id; } }
        else s.photos.push({id:uid(),fileId:r.id,caption:"",date:today(),face:b.dataset.face||"",fl:b.dataset.fl||((floors(s)[S.planIdx]||{}).id)||""});
      }
      save(s);
    }catch(err){ console.warn(err); if(!(err&&err.shown)) toast("تعذر رفع الملف، حاول مرة أخرى"); }
    release(s); save(s); if(S.afterTab){ S.tab=S.afterTab; S.afterTab=null; }
    render();
  }
  else if(a==="copy"){
    const txt=summaryText(s);
    try{ await navigator.clipboard.writeText(txt); toast("تم نسخ الملخص، الصقه في قروب الواتساب"); }
    catch(err){ const ta=document.createElement("textarea"); ta.value=txt; document.body.appendChild(ta); ta.select(); try{document.execCommand("copy"); toast("تم نسخ الملخص");}catch(x){toast("حدد النص وانسخه يدوياً");} ta.remove(); }
  }
  else if(a==="pdf"){ if(S.busy) return; S.busy=b.dataset.kind; render(); try{ await makePdf(s, b.dataset.kind); }catch(err){ console.error(err); toast("تعذر إنشاء التقرير: "+(err&&err.message||"")); } S.busy=false; render(); }
});

