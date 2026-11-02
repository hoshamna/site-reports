window.addEventListener("pagehide",()=>flushAll());
document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="hidden") Object.keys(dirty).forEach(id=>{ if(dirty[id]){ clearTimeout(timers[id]); flush(id); } }); });
document.getElementById("savePill").addEventListener("click",()=>{ if(saveState.err) retryAll(); });
async function saveNow(btn){
  const a=document.activeElement; if(a&&a.blur) a.blur();
  await new Promise(r=>setTimeout(r,60));
  flushAll();
  if(btn){ btn.disabled=true; btn.textContent=tr("جارٍ الحفظ…"); }
  const t0=Date.now(); while((saveState.pending>0)&&Date.now()-t0<15000) await new Promise(r=>setTimeout(r,150));
  await Promise.all(Object.values(chains)).catch(()=>{});
  const failed=!!saveState.err||Object.keys(S.sites).some(id=>dirty[id]);
  document.querySelectorAll(".savenow").forEach(x=>{ x.disabled=false; x.classList.remove("unsaved"); x.textContent=failed?tr("💾 حفظ التعديلات"):tr("✓ تم الحفظ"); });
  if(!failed) setTimeout(markUnsaved,2500);
  toast(failed?"لم يُحفظ — تحقق من الاتصال ثم اضغط «حفظ» مرة أخرى":"✓ تم حفظ كل البيانات");
}
app.addEventListener("click",e=>{ const b=e.target.closest('[data-act="savenow"]'); if(!b) return; e.preventDefault(); e.stopImmediatePropagation(); saveNow(b); }, true);
boot();
