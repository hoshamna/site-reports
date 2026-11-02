 window.claude={ use:async n=>{ if(n==="db") return sb?db:null; return n==="assets"?(sb?assets:null):n==="downloads"?downloads:n==="sample"?sample:null; } };
 let deferred=null; window.addEventListener("beforeinstallprompt",e=>{ e.preventDefault(); deferred=e; window.__canInstall=true; });
 window.__install=async()=>{ if(!deferred) return; deferred.prompt(); await deferred.userChoice; deferred=null; window.__canInstall=false; };
 window.installHint=()=>{ const sa=window.matchMedia("(display-mode: standalone)").matches||navigator.standalone; if(sa) return "";
   const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
   return ios?'<br>📲 <b>لتثبيت التطبيق على الآيفون:</b> افتح الصفحة في Safari، ثم زر المشاركة ⬆️، ثم «إضافة إلى الشاشة الرئيسية».'
     :(window.__canInstall?'<br><button class="primary" onclick="__install()">📲 تثبيت التطبيق على الجوال</button>':'<br>📲 <b>لتثبيت التطبيق:</b> من قائمة Chrome ⋮ اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».'); };
 if("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
 const pushCall=async body=>{ const r=await fetch(SB_URL+"/functions/v1/push",{method:"POST",headers:{"content-type":"application/json","apikey":SB_KEY,...tokenHdr()},body:JSON.stringify(body)}); const j=await r.json().catch(()=>({})); if(!r.ok) throw new Error(j.error||("HTTP "+r.status)); return j; };
 const u8=b=>{ b=b.replace(/-/g,"+").replace(/_/g,"/"); while(b.length%4) b+="="; const s=atob(b); return Uint8Array.from(s,c=>c.charCodeAt(0)); };
 window.__push={
   supported:()=>("serviceWorker" in navigator)&&("PushManager" in window)&&("Notification" in window),
   state:async()=>{ if(!window.__push.supported()) return "unsupported"; if(Notification.permission==="denied") return "denied"; try{ const reg=await navigator.serviceWorker.ready; const s=await reg.pushManager.getSubscription(); return s?"on":"off"; }catch(e){ return "off"; } },
   enable:async(userId,name)=>{ const p=await Notification.requestPermission(); if(p!=="granted") throw new Error("denied");
     const reg=await navigator.serviceWorker.ready; const {key}=await pushCall({action:"key"});
     let s=await reg.pushManager.getSubscription(); if(!s) s=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:u8(key)});
     await pushCall({action:"subscribe",sub:s.toJSON(),userId,name}); return s.endpoint; },
   disable:async()=>{ const reg=await navigator.serviceWorker.ready; const s=await reg.pushManager.getSubscription(); if(s){ await pushCall({action:"unsubscribe",endpoint:s.endpoint}).catch(()=>{}); await s.unsubscribe(); } },
   test:async()=>{ const reg=await navigator.serviceWorker.ready; const s=await reg.pushManager.getSubscription(); if(!s) throw new Error("off"); return pushCall({action:"test",endpoint:s.endpoint,title:"🔔 أصيل",body:"تم تفعيل الإشعارات على هذا الجهاز ✓",tag:"test"}); },
   notify:(userIds,title,body,tag)=>pushCall({action:"notify",userIds,title,body,tag})
 };
})();
