/* ---------- voice notes: speak → text (phone's speech recognition) → summary (Claude) → saved to the site; issues go to «المشاكل» ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let voiceRec = null;
const NOTE_KEYS = [["done","✅ الأعمال المنجزة"],["issues","⚠️ المشاكل"],["needs","📋 المطلوبات والنواقص"],["requests","📌 طلبات الاستشاري أو العميل"]];
const vnLines = t => String(t||"").split("\n").map(x=>x.replace(/^\s*[-•*·]\s*/,"").trim()).filter(Boolean);

function voiceSheet(){
  const v=S.voice; if(!v) return "";
  if(v.stage==="review"){ const m=v.sum||{};
    return `<div class="sheet vnsheet" role="dialog" aria-label="مراجعة الملاحظة"><h3>🎤 راجع الملخص قبل الحفظ</h3>
      <label>الملخص<input id="vn-summary" value="${esc(m.summary||"")}"></label>
      ${NOTE_KEYS.map(([k,l])=>`<label>${l}<textarea id="vn-${k}" rows="${Math.max(2,(m[k]||[]).length+1)}">${esc((m[k]||[]).join("\n"))}</textarea></label>`).join("")}
      <p class="small muted" style="margin:0">كل سطر بند مستقل. ما في «المشاكل» يُضاف إلى تبويب المشاكل في الموقع.</p>
      <div class="row"><button class="primary big" data-act="vnsave">💾 حفظ</button><button data-act="vnback">→ رجوع إلى النص</button><button class="ghost" data-act="vnx">إلغاء</button></div></div>`; }
  return `<div class="sheet vnsheet" role="dialog" aria-label="ملاحظة صوتية"><h3>🎤 ملاحظة صوتية — <bdi>${esc((S.sites[v.siteId]||{}).name||"")}</bdi></h3>
    ${SR?`<button class="vnrec ${v.rec?"on":""}" data-act="vnrec">${v.rec?"⏹ إيقاف التسجيل":"🎤 ابدأ التسجيل"}</button>
      <p class="small muted" style="margin:0">${v.rec?tr("تكلّم بشكل طبيعي… الكلام يُكتب أدناه."):tr("اضغط وتكلّم: ماذا أُنجز، وما المشاكل، وما الناقص، وما طلب الاستشاري.")}</p>`
      :`<p class="small notice" style="margin:0">${tr("التسجيل من داخل التطبيق غير مدعوم في هذا المتصفح. اضغط 🎤 في لوحة المفاتيح وتكلّم داخل الخانة.")}</p>`}
    <label>النص<textarea id="vn-text" rows="5" placeholder="${esc(tr("مثال: اليوم ركّبنا فريم الطابق الأول، وناقص زجاج ثلاث شبابيك، والاستشاري طلب تعديل باب المدخل."))}">${esc(v.text||"")}</textarea></label>
    <div class="row"><button class="primary big" data-act="vnsum">✨ لخّص وراجع</button><button data-act="vnsaveraw">💾 حفظ النص فقط</button><button class="ghost" data-act="vnx">إلغاء</button></div></div>`;
}

function recStart(){
  const v=S.voice; if(!SR||!v) return;
  const rec=new SR(); rec.lang=lang==="en"?"en-US":"ar-AE"; rec.continuous=true; rec.interimResults=true;
  let base=v.text?v.text.trim()+" ":"";
  rec.onresult=e=>{ let fin="", mid="";
    for(let i=0;i<e.results.length;i++){ const r=e.results[i]; if(r.isFinal) fin+=r[0].transcript+" "; else mid+=r[0].transcript; }
    v.text=(base+fin).replace(/\s+/g," ").trim();
    const el=document.getElementById("vn-text"); if(el) el.value=v.text+(mid?" "+mid:""); };
  rec.onerror=e=>{ if(e.error==="not-allowed"||e.error==="service-not-allowed"){ v.rec=false; toast("اسمح للتطبيق باستخدام الميكروفون من إعدادات المتصفح"); render(); } };
  // phones stop listening after a pause: keep going until the user presses stop
  rec.onend=()=>{ if(v.rec&&S.voice===v){ base=v.text?v.text+" ":""; try{ rec.start(); return; }catch(x){} } v.rec=false; render(); };
  voiceRec=rec; v.rec=true; try{ rec.start(); }catch(x){ v.rec=false; } render();
}
function recStop(){ const v=S.voice; if(v) v.rec=false; try{ voiceRec&&voiceRec.stop(); }catch(x){} voiceRec=null; }

async function vnSummarize(btn){
  const v=S.voice; if(!v) return; recStop();
  const el=document.getElementById("vn-text"); if(el) v.text=el.value.trim();
  if(!v.text){ toast("لا يوجد كلام بعد"); return; }
  if(!sample){ toast("التلخيص غير متاح الآن — احفظ النص فقط"); return; }
  btn.disabled=true; btn.textContent=tr("⏳ جارٍ التلخيص…");
  try{
    const d=await sample.json(`تفريغ صوتي لملاحظة من موقع أعمال ألمنيوم وزجاج. لخّصه بالعربية الفصحى دون إضافة ما لم يُذكر، واستخدم «الفريم» لا «الإطار». أجب بـ JSON فقط: {"summary":"جملة واحدة","done":[],"issues":[],"needs":[],"requests":[]} — done الأعمال المنجزة، issues المشاكل الفنية، needs المطلوبات والنواقص، requests طلبات الاستشاري أو العميل.\n\nالنص:\n${v.text}`,{text:v.text,cache:false});
    const arr=x=>Array.isArray(x)?x.map(t=>String(t).trim()).filter(Boolean):[];
    v.sum={summary:String(d&&d.summary||"").trim(),done:arr(d&&d.done),issues:arr(d&&d.issues),needs:arr(d&&d.needs),requests:arr(d&&d.requests)};
    v.stage="review"; render();
  }catch(err){ btn.disabled=false; btn.textContent=tr("✨ لخّص وراجع");
    toast(err&&err.code==="unsupported"?"التلخيص يحتاج تحديث دالة read-doc في Supabase — يمكنك حفظ النص الآن":"تعذر التلخيص — يمكنك حفظ النص فقط"); }
}

function vnSave(raw){
  const v=S.voice; if(!v) return; const s=S.sites[v.siteId]; if(!s) return;
  if(!raw&&v.stage!=="review") return;
  const val=id=>(document.getElementById(id)||{}).value;
  if(raw){ const el=document.getElementById("vn-text"); if(el) v.text=el.value.trim(); if(!v.text){ toast("لا يوجد كلام بعد"); return; } }
  const note={id:uid(),date:today(),by:(S.user&&S.user.name)||cuMe||"",text:v.text||""};
  if(!raw){ note.summary=String(val("vn-summary")||"").trim(); NOTE_KEYS.forEach(([k])=>{ note[k]=vnLines(val("vn-"+k)); }); }
  s.voiceNotes=[note,...(s.voiceNotes||[])];
  let added=0;
  if(!raw){ s.issues=s.issues||[]; [...note.issues].reverse().forEach(t=>{ s.issues.unshift({id:uid(),date:note.date,face:"",text:t,action:"",status:"open",fileId:null,src:"voice",noteId:note.id}); added++; }); }
  recStop(); S.voice=null; save(s); render();
  toast(added?tr("✓ حُفظت الملاحظة، وأُضيفت إلى «المشاكل»: ")+added:tr("✓ حُفظت الملاحظة"));
}

function voiceNotesPanel(s){
  const L=s.voiceNotes||[]; if(!L.length) return "";
  const show=S.vnAll===s.id?L:L.slice(0,3);
  return `<div class="panel"><div class="row" style="justify-content:space-between"><h2>🎤 ملاحظات الموقع</h2><span class="chip"><span class="num">${L.length}</span></span></div>
   <div class="list">${show.map(n=>`<div class="entry vnote"><div class="full row" style="justify-content:space-between"><span class="small muted"><span class="num">${esc(n.date||"")}</span>${n.by?" — "+esc(n.by):""}</span>
     ${(isAdmin()||(S.user&&S.user.name===n.by))?`<button class="ghost small danger ${S.armed==="vn"+n.id?"armed":""}" data-act="vndel" data-id="${n.id}">${S.armed==="vn"+n.id?"تأكيد الحذف":"حذف"}</button>`:""}</div>
     ${n.summary?`<b class="full">${esc(n.summary)}</b>`:""}
     ${NOTE_KEYS.some(([k])=>(n[k]||[]).length)?NOTE_KEYS.filter(([k])=>(n[k]||[]).length).map(([k,l])=>`<div class="full small"><b>${l}</b><ul>${n[k].map(t=>`<li>${esc(t)}</li>`).join("")}</ul></div>`).join("")
       :`<p class="full small" style="margin:0;white-space:pre-wrap">${esc(n.text||"")}</p>`}</div>`).join("")}</div>
   ${L.length>3&&S.vnAll!==s.id?`<button class="ghost small" data-act="vnall">${tr("عرض كل الملاحظات")} (<span class="num">${L.length}</span>)</button>`:""}</div>`;
}

app.addEventListener("input",e=>{ if(e.target.id==="vn-text"&&S.voice&&!S.voice.rec) S.voice.text=e.target.value; });
app.addEventListener("click",async e=>{
  const b=e.target.closest("[data-act]"); if(!b) return; const a=b.dataset.act; if(!/^vn/.test(a)) return;
  const s=site();
  if(a==="vnrec"){ if(S.voice&&S.voice.rec){ recStop(); render(); } else recStart(); }
  else if(a==="vnx"){ recStop(); S.voice=null; render(); }
  else if(a==="vnsum") await vnSummarize(b);
  else if(a==="vnback"){ S.voice.stage="text"; render(); }
  else if(a==="vnsave") vnSave(false);
  else if(a==="vnsaveraw") vnSave(true);
  else if(a==="vnall"&&s){ S.vnAll=s.id; render(); }
  else if(a==="vndel"&&s){ const k="vn"+b.dataset.id; if(S.armed===k){ S.armed=null; s.voiceNotes=(s.voiceNotes||[]).filter(n=>n.id!==b.dataset.id); save(s); render(); }
    else { S.armed=k; setTimeout(()=>{ if(S.armed===k){ S.armed=null; render(); } },4000); render(); } }
});
