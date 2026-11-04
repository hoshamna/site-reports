/* ---- events ---- */
app.addEventListener("input", e=>{ const t=e.target;
  if(t.dataset.cume){ cuMe=t.value.trim(); try{ localStorage.setItem("cust-me",cuMe); }catch(x){} return; }
  if(t.dataset.cucar){ const [i,k]=t.dataset.cucar.split("."); const L=carList(); if(L[+i]){ L[+i][k]=t.value.trim(); S.settings.cuCars=L; clearTimeout(timers._set); timers._set=setTimeout(settingsSave,600); } return; }
  if(t.dataset.cucat){ const k=t.dataset.cucat; const own=(S.settings.cuCatsX||[]).find(c=>c.k===k); if(own) own.l=t.value; else { S.settings.cuCatNames={...(S.settings.cuCatNames||{}),[k]:t.value}; } clearTimeout(timers._set); timers._set=setTimeout(settingsSave,600); return; }
  if(!t.dataset.cu) return; const [id,k]=t.dataset.cu.split("."); const x=S.cu[id]; if(!x) return;
  if(!cuOrig[id]) cuOrig[id]=JSON.parse(JSON.stringify(x));
  x[k]=t.type==="number"?(t.value===""?0:n(t.value)):t.value;
  if(k==="pay"&&x.pay==="credit"&&x.supplier&&!isCreditSup(x.supplier)){ S.settings.cuCredit=[...cuCredit(),x.supplier.trim()]; settingsSave(); }
  if(k==="supplier"&&isCreditSup(x.supplier)) x.pay="credit";
  if(k==="target"&&String(x.target).startsWith("car:")&&(cuCat(x.cat)||{}).t!=="car") x.cat="fuel";
  if(k==="cat"&&x.cat==="salary"){ if(!x.salMonth) x.salMonth=prevMonthOf(x.date); if(!String(x.desc||"").trim()) x.desc=salaryDesc(x.salMonth); }
  x.updatedAt=Date.now();
  if(t.tagName==="SELECT") render();
  else { const card=t.closest(".cuent"); card&&card.querySelectorAll(".cunsaved,.cucx").forEach(el=>el.hidden=false); }
});
window.addEventListener("beforeunload",e=>{ if(Object.keys(cuOrig).length){ e.preventDefault(); e.returnValue=""; } });
app.addEventListener("change", e=>{ const t=e.target; if(t.id==="cu-mainh"){ S.cuSetOpen=true; setTimeout(render,50); return; } if(t.dataset&&t.dataset.cume&&cuMe&&S.view==="cust") render(); });
app.addEventListener("click", async e=>{
  const b=e.target.closest("[data-act]"); if(!b) return; const a=b.dataset.act; if(!/^cu/.test(a)) return; const id=b.dataset.id; const x=id&&S.cu[id];
  const needMe=()=>{ if(cuMe) return true; toast("اكتب اسمك أولاً"); const el=document.getElementById("cu-me")||document.getElementById("cu-me2"); el&&el.focus(); return false; };
  if(a==="cuopen"){ S.view="cust"; S.pick=null; S.cuSup=null; render(); window.scrollTo(0,0); }
  else if(a==="cufilter"){ S.cuF=b.dataset.k; S.cuSup=null; render(); }
  else if(a==="cusetopen"){ S.cuSetOpen=!b.closest("details").open; }
  else if(a==="cuview"){ S.cuView=id; render(); }
  else if(a==="cuviewx"){ S.cuView=null; render(); }
  else if(a==="cuscan"||a==="cuscanc"){ if(!needMe()) return; CAM=b.dataset.cam==="1"||a==="cuscanc";
    const pre=b.dataset.site||(S.view==="site"?S.cur:null);
    const files=await pickFiles("image/*,application/pdf",false); if(!files.length) return;
    const lbl=b.querySelector("b")||b; const old=lbl.textContent; b.classList.add("busy"); lbl.textContent=tr("جارٍ الرفع…");
    const nx={id:uid(),kind:"exp",by:cuMe,holder:subDefault(cuMe)?cuMe:"main",target:b.dataset.site||"",cat:"",pay:"cash",supplier:"",amount:0,date:today(),desc:"",fileId:null,fileType:null,createdAt:Date.now()};
    try{ const u=await cuUpload(files[0]); if(!u){ b.classList.remove("busy"); lbl.textContent=old; return; }
      nx.fileId=u.r.id; nx.fileType=u.r.type; if(u.r.type==="image") nx.reading=!!(canRead&&sample); cuPut(nx,true);
      if(!nx.target){ S.cuPick=nx.id; S.cuPre=pre; }
      render();
      if(u.r.type==="image") cuRead(nx.id,u.f);
      if(nx.target) undoToast("✓ تم تسجيل الفاتورة على هذا الموقع", {[nx.id]:null});
    }catch(err){ console.warn(err); if(!(err&&err.shown)) toast("تعذر رفع الفاتورة"); b.classList.remove("busy"); lbl.textContent=old; } }
  else if(a==="cupick"){ const y=S.cu[S.cuPick]; S.cuPick=null; if(y){ y.target=b.dataset.t; if(y.target.startsWith("car:")&&(cuCat(y.cat)||{}).t!=="car") y.cat="fuel"; cuPut(y,true); undoToast("✓ تم تسجيل الفاتورة", {[y.id]:null}); } render(); }
  else if(a==="cupicknow"){ S.cuPickNow=S.cuPick; render(); }
  else if(a==="cupickx"){ S.cuPick=null; toast("حُفظت الفاتورة، اختر الموقع لاحقاً"); render(); }
  else if(a==="cureread"&&x){ try{ const r=await mediaFetch(x.fileId); if(!r.ok) throw 0; const bl=await r.blob(); const f=bl.type&&bl.type.startsWith("image/")?bl:new Blob([bl],{type:"image/jpeg"}); await cuRead(id,f); }catch(err){ toast("تعذر فتح صورة الفاتورة"); } }
  else if(a==="cupickopen"&&x){ S.cuPick=id; S.cuPre=null; render(); }
  else if(a==="cumanual"||a==="cusalary"){ if(!needMe()) return;
    const sk=a==="cusalary"?(b.dataset.m||salaryDue()||prevMonthOf(today())):null;
    const nx={id:uid(),kind:"exp",by:cuMe,holder:"main",target:"gen",cat:sk?"salary":"",pay:"cash",supplier:"",amount:0,date:today(),desc:sk?salaryDesc(sk):"",fileId:null,fileType:null,createdAt:Date.now()};
    if(sk) nx.salMonth=sk; if(a==="cusalary") S.view="cust";
    S.cuF="all"; S.cuEdit=nx.id; cuPut(nx,true); render();
    setTimeout(()=>{ const el=document.getElementById("cu-"+nx.id+"-amount"); if(el){ el.scrollIntoView({block:"center"}); el.focus(); } },80); }
  else if(a==="cudep"){ if(!needMe()) return; const files=await pickFiles("image/*,application/pdf",false); if(!files.length) return;
    const lbl=b.querySelector("b")||b; b.classList.add("busy"); lbl.textContent=tr("جارٍ الرفع…");
    const nx={id:uid(),kind:"dep",by:cuMe,amount:0,date:today(),desc:"",fileId:null,fileType:null,createdAt:Date.now()};
    try{ const u=await cuUpload(files[0]); if(u){ nx.fileId=u.r.id; nx.fileType=u.r.type; S.cuF="dep"; cuPut(nx,true); render(); if(u.r.type==="image") await cuReadDep(nx.id,u.f); else render(); if(S.cu[nx.id]) undoToast(n(S.cu[nx.id].amount)>0?"✓ تم تسجيل توريد "+money(S.cu[nx.id].amount):"✓ تم تسجيل التوريد", {[nx.id]:null}); } else render(); }
    catch(err){ if(!(err&&err.shown)) toast("تعذر رفع الإشعار"); render(); } }
  else if(a==="cufile"&&x){ const files=await pickFiles("image/*,application/pdf",false); if(!files.length) return; b.classList.add("busy"); b.textContent=tr("جارٍ الرفع…");
    try{ const u=await cuUpload(files[0]); if(u){ dropAsset(x.fileId); x.fileId=u.r.id; x.fileType=u.r.type; cuPut(x,true); if(u.r.type==="image"&&!n(x.amount)) await cuReadDep(id,u.f); } }catch(err){ if(!(err&&err.shown)) toast("تعذر رفع الملف"); } render(); }
  else if(a==="cudel"&&x){ const key="cu"+id; if(S.armed===key){ S.armed=null; const ids=[id,...(x.kind==="xfer"?Object.values(S.cu).filter(y=>y.xferId===id).map(y=>y.id):[])]; const snap=cuSnap(ids); cuDel(id); undoToast("🗑️ تم الحذف", snap); render(); } else { S.armed=key; setTimeout(()=>{ if(S.armed===key){ S.armed=null; render(); } },4000); render(); } }
  else if(a==="cusup"){ S.cuSup=b.dataset.k; render(); window.scrollTo(0,0); }
  else if(a==="cusupx"){ S.cuSup=null; render(); }
  else if(a==="cuspay"){ if(!needMe()) return; const s=cuSuppliers().find(v=>v.key===b.dataset.k); if(!s) return;
    const nx={id:uid(),kind:"spay",by:cuMe,supplier:s.name,amount:Math.max(0,s.bal),date:today(),method:"cheque",desc:"",fileId:null,fileType:null,createdAt:Date.now()}; cuPut(nx,true); render(); undoToast("تم إنشاء سداد جديد", {[nx.id]:null});
    setTimeout(()=>{ const el=document.getElementById(`cu-${nx.id}-amount`); el&&(el.scrollIntoView({block:"center"}),el.select()); },40); }
  else if(a==="curangex"){ S.cuRange=null; render(); }
  else if(a==="curangego"){ const r=S.cuRange; if(!r||S.busy) return; let range=null;
    if(b.dataset.custom){ const f=(document.getElementById("cu-rfrom")||{}).value, t=(document.getElementById("cu-rto")||{}).value; if(!f||!t){ toast("اختر التاريخين"); return; } if(f>t){ toast("تاريخ البداية بعد تاريخ النهاية"); return; } range={from:f,to:t}; r.from=f; r.to=t; }
    else if(!b.dataset.cur) range={from:b.dataset.f,to:b.dataset.t};
    const hsel=(document.getElementById("cu-rh")||{}).value||"all"; S.cuRangeH=hsel;
    S.cuRange=null; S.busy=r.k==="cust"?"cust":"sup"; render();
    try{ if(r.k==="cust"&&hsel!=="all") await makeHolderPdf(hsel,range); else if(r.k==="cust") await makeCustPdf(null,range); else await makeSupPdf(r.key,range); }catch(err){ console.error(err); toast("تعذر إنشاء الملف: "+(err&&err.message||"")); }
    S.busy=false; render(); }
  else if(a==="cusuppdf"||a==="cupdf"){ if(S.busy) return; S.cuRange={k:a==="cupdf"?"cust":"sup",key:b.dataset.k}; render(); }
  else if(a==="cuoldpdf"){ if(S.busy) return; S.busy=a==="cupdf"?"cust":"sup"; render(); try{ if(a==="cupdf") await makeCustPdf(); else await makeSupPdf(b.dataset.k); }catch(err){ console.error(err); toast("تعذر إنشاء الملف: "+(err&&err.message||"")); } S.busy=false; render(); }
  else if(a==="culistadd"){ const inp=document.getElementById(b.dataset.in); const v=(inp&&inp.value||"").trim(); if(!v) return; const L=b.dataset.l;
    if(L==="cuCars"){ const pl=(document.getElementById("cu-newplate")||{}).value||""; const cur=carList(); if(!cur.some(c=>c.n.toLowerCase()===v.toLowerCase())) S.settings.cuCars=[...cur,{n:v,pl:pl.trim()}]; }
    else { const cur=cuCredit(); if(!cur.some(c=>c.toLowerCase()===v.toLowerCase())) S.settings[L]=[...cur,v]; }
    settingsSave(); S.cuSetOpen=true; render(); }
  else if(a==="culistdel"){ const L=b.dataset.l; const cur=L==="cuCars"?carList():[...cuCredit()]; const prev=JSON.parse(JSON.stringify(cur)); cur.splice(+b.dataset.i,1); S.settings[L]=cur; settingsSave(); S.cuSetOpen=true; settingsUndo(L, prev, "🗑️ تم الحذف"); render(); }
  else if(a==="cuedit"&&x){ S.cuEdit=id; render(); setTimeout(()=>{ const el=document.getElementById(`cu-${id}-amount`); el&&el.scrollIntoView({block:"center"}); },40); }
  else if(a==="cuok2"&&x){ const miss=isExp(x)?cuMissing(x):[]; if(miss.length){ toast(tr("أكمل أولاً: ")+miss.map(m=>tr(m)).join("، ")); return; } if(!(n(x.amount)>0)){ toast("أدخل المبلغ أولاً"); return; }
    const snap=cuOrig[id]?{[id]:JSON.parse(JSON.stringify(cuOrig[id]))}:cuSnap([id]); x.ok=true; cuPut(x,true); if(S.cuEdit===id) S.cuEdit=null; undoToast("✓ تم الحفظ", snap); render(); }
  else if(a==="cucancel"&&x){ if(cuOrig[id]){ S.cu[id]=cuOrig[id]; delete cuOrig[id]; } if(S.cuEdit===id) S.cuEdit=null; toast(tr("↩️ أُلغي التعديل")); render(); }
  else if(a==="cuhold"){ S.cuH=b.dataset.h||null; render(); }
  else if(a==="cuxfer"){ const h=S.cuH&&S.cuH!=="main"?S.cuH:(holders().filter(v=>v!==mainHolder())[0]||""); const nx={id:uid(),kind:"xfer",dir:"out",to:h,by:cuMe,amount:0,date:today(),desc:"",fileId:null,fileType:null,createdAt:Date.now()}; S.cuF="all"; cuPut(nx,true); render(); undoToast("تم إنشاء تحويل جديد", {[nx.id]:null}); setTimeout(()=>{ const el=document.getElementById(`cu-${nx.id}-${h?"amount":"to"}`); el&&(el.scrollIntoView({block:"center"}),el.focus()); },40); }
  else if(a==="cuxinv"&&x){ const nid=uid(); const snap=cuSnap([x.id,nid]); const nx={id:nid,kind:"xfer",dir:"out",to:holderOf(x),by:cuMe,amount:Math.min(n(x.amount),holderShort(holderOf(x))),date:today(),desc:"",inv:[x.id],fileId:null,fileType:null,createdAt:Date.now()}; cuPut(nx,true); x.xferId=nx.id; cuPut(x,true); undoToast("✓ سُجّل التحويل إلى "+holderOf(x), snap); render(); }
  else if(a==="cuxall"){ const h=b.dataset.h; const pend=Object.values(S.cu).filter(y=>needsXfer(y)&&holderOf(y)===h); if(!pend.length) return; const amt=holderShort(h);
    const nid=uid(); const snap=cuSnap([nid,...pend.map(y=>y.id)]); const nx={id:nid,kind:"xfer",dir:"out",to:h,by:cuMe,amount:Math.round(amt*100)/100,date:today(),desc:"",inv:pend.map(y=>y.id),fileId:null,fileType:null,createdAt:Date.now()}; cuPut(nx,true); pend.forEach(y=>{ y.xferId=nx.id; cuPut(y,true); }); undoToast("✓ سُجّل تحويل "+money(amt)+" إلى "+h, snap); render(); }
  else if(a==="cudupok"&&x){ const snap=cuSnap([id]); x.dupOk=true; cuPut(x,true); undoToast("تم: ليست مكررة", snap); render(); }
  else if(a==="cuclose"){ const k="cuclose"; if(S.armed!==k){ S.armed=k; setTimeout(()=>{ if(S.armed===k){ S.armed=null; render(); } },5000); render(); return; } S.armed=null;
    const last=cuLast(); const list=Object.values(S.cu).filter(y=>inPeriod(y,last,null)); const pc=periodCalc(list,last?n(last.bal):0); const cc=cuCalc();
    const cl={id:uid(),kind:"close",by:cuMe,date:today(),createdAt:Date.now(),bal:Math.round(cc.bal*100)/100,opening:pc.opening,dep:pc.dep,cash:pc.cash+pc.spCash,owed:cc.owed,count:list.length};
    const snap=cuSnap([cl.id]); cuPut(cl,true); undoToast("🔒 تم إقفال الفترة، والرصيد المُرحَّل "+money(cl.bal), snap); render(); }
  else if(a==="cuunclose"&&x){ const k="cuun"+id; if(S.armed!==k){ S.armed=k; setTimeout(()=>{ if(S.armed===k){ S.armed=null; render(); } },4000); render(); return; } S.armed=null; const snap=cuSnap([id]); cuDel(id); undoToast("تم إلغاء الإقفال", snap); render(); }
  else if(a==="cupdfc"&&x){ if(S.busy) return; S.busy="cust"; render(); try{ await makeCustPdf(id); }catch(err){ console.error(err); toast("تعذر إنشاء الملف: "+(err&&err.message||"")); } S.busy=false; render(); }
  else if(a==="cucatadd"){ const v=(document.getElementById("cu-newcat").value||"").trim(); if(!v) return; S.settings.cuCatsX=[...(S.settings.cuCatsX||[]),{k:"x"+uid(),l:v,t:document.getElementById("cu-newcatt").value}]; settingsSave(); S.cuSetOpen=true; render(); }
  else if(a==="cucatdel"){ const k=b.dataset.k; { const pX=JSON.parse(JSON.stringify(S.settings.cuCatsX||[])), pH=[...(S.settings.cuCatHide||[])]; undoToast("🗑️ تم حذف البند", ()=>{ S.settings.cuCatsX=pX; S.settings.cuCatHide=pH; settingsSave(); }); } if((S.settings.cuCatsX||[]).some(c=>c.k===k)) S.settings.cuCatsX=S.settings.cuCatsX.filter(c=>c.k!==k); else S.settings.cuCatHide=[...(S.settings.cuCatHide||[]),k]; settingsSave(); S.cuSetOpen=true; render(); }
  else if(a==="cucatreset"){ S.settings.cuCatHide=[]; settingsSave(); S.cuSetOpen=true; render(); }
});

