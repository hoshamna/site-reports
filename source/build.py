import re, json, pathlib
src=pathlib.Path('/home/claude/site-reports.html').read_text(encoding='utf8')
s=src
def rep(a,b):
    global s
    assert a in s, a[:80]; s=s.replace(a,b,1)
# split leading <title>/<meta>/<link>/<style> head part from body
title=re.search(r'<title>.*?</title>',s).group(0)
s=s.replace(title,'',1)
s=s.replace('<meta name="claude:viewport-fit-sides" content="cover">\n','',1)
links=re.findall(r'<link [^>]+>\n',s)
for l in links: s=s.replace(l,'',1)
style=re.search(r'<style>[\s\S]*?</style>',s).group(0)
s=s.replace(style,'',1)
# app-specific changes
rep('const blobUrl = id => "/_blob/" + id;','const blobUrl = id => id==="__logo"?"./logo.png":(window.__pub?window.__pub(id):"/_blob/"+id);')
rep('settings:{company:"أصيل للألمنيوم والزجاج ذ م م", companyEn:"Aseel Aluminium & Glass LLC"}',
    'settings:{company:"أصيل للألمنيوم والزجاج ذ م م", companyEn:"Aseel Aluminium & Glass LLC", logoId:"__logo", logoWide:true, legalName:"ASEEL ALUMINIUM & GLASS WORKS LLC", poBox:"34438", address:"Ras Al Khor Ind. Area 1, Dubai, UAE", trn:"100431844800003", phone:"+971585982931", email:"info@aseelalum.com", web:"www.aseelalum.com", invPrefix:"TEST", invSeq:0}')
s=re.sub(r'const note = S\.mode==="local" \? `<div class="notice small">[^`]*`:"";',
 'const note = installHint() ? `<div class="notice small">${installHint().replace(/^<br>/,"")}</div>` : "";',s,count=1)
assert 'installHint()' in s
shim=r'''<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"></script>
<script>
(function(){
 const SB_URL="https://stbwyyhttjzfhdwsnrws.supabase.co", SB_KEY="sb_publishable_pVBxhRoxsnMPfzQ1LxMgtw_8zwIPwi7";
 const sb=window.supabase&&window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:false}});
 window.__media={};
 const pub=id=>`${SB_URL}/storage/v1/object/public/media/${encodeURIComponent(id)}`;
 window.__pub=pub;
 const freeze=o=>JSON.parse(JSON.stringify(o||{}));
 const err=e=>({code:(e&&e.code==="42501")?"not_granted":"unavailable",message:(e&&e.message)||"error"});
 // ---- collection cache + realtime ----
 const tables={};
 function table(name){
  if(tables[name]) return tables[name];
  const t={rows:new Map(),subs:new Set(),loaded:null,chan:null};
  const snap=()=>{ const docs=[...t.rows.entries()].map(([id,d])=>({id,exists:true,data:()=>freeze(d)})); return {docs,size:docs.length,empty:!docs.length,docChanges:()=>[],metadata:{}}; };
  t.emit=()=>{ const sn=snap(); t.subs.forEach(f=>{ try{ f.next(sn); }catch(e){} }); t.docSubs&&t.docSubs.forEach(f=>{ try{ f(); }catch(e){} }); };
  t.load=()=>{ if(!t.loaded) t.loaded=sb.from(name).select("id,data").then(({data,error})=>{ if(error) throw err(error); t.rows.clear(); (data||[]).forEach(r=>t.rows.set(r.id,r.data)); t.emit(); }); return t.loaded; };
  t.listen=()=>{ if(t.chan) return; t.chan=sb.channel("rt-"+name).on("postgres_changes",{event:"*",schema:"public",table:name},p=>{
     if(p.eventType==="DELETE"){ const id=p.old&&p.old.id; if(id) t.rows.delete(id); } else if(p.new){ t.rows.set(p.new.id,p.new.data); }
     t.emit(); }).subscribe(); };
  t.snap=snap; t.docSubs=new Set();
  return tables[name]=t;
 }
 setInterval(()=>{ Object.keys(tables).forEach(n=>{ const t=tables[n]; if(t.subs.size||t.docSubs.size){ t.loaded=null; t.load().catch(()=>{}); } }); },60000);
 const db={
  collection:name=>({
    get:async()=>{ const t=table(name); await t.load(); return t.snap(); },
    onSnapshot:(next,onErr)=>{ const t=table(name); const o={next}; t.subs.add(o); t.load().catch(e=>onErr&&onErr(e)); t.listen(); if(t.rows.size) setTimeout(()=>next(t.snap()),0); return ()=>t.subs.delete(o); }
  }),
  doc:path=>{ const [name,id]=path.split("/"); return {
    set:async body=>{ const t=table(name); t.rows.set(id,body); const {error}=await sb.from(name).upsert({id,data:body,updated_at:new Date().toISOString()}); if(error) throw err(error); },
    delete:async()=>{ const t=table(name); t.rows.delete(id); const {error}=await sb.from(name).delete().eq("id",id); if(error) throw err(error); },
    onSnapshot:(next,onErr)=>{ const t=table(name); const f=()=>{ const d=t.rows.get(id); next({id,exists:!!d,data:()=>d?freeze(d):undefined,metadata:{}}); };
      t.docSubs.add(f); t.load().then(f).catch(e=>onErr&&onErr(e)); t.listen(); return ()=>t.docSubs.delete(f); }
  }; }
 };
 // ---- assets ----
 const assets={
  upload:async blob=>{ const id=Date.now().toString(36)+Math.random().toString(36).slice(2,10); const {error}=await sb.storage.from("media").upload(id,blob,{contentType:blob.type||"image/jpeg",upsert:true}); if(error) throw {code:"unavailable",message:error.message}; return {id,url:pub(id),sizeBytes:blob.size,contentType:blob.type}; },
  delete:async id=>{ if(!id||id==="__logo") return {}; await sb.storage.from("media").remove([id]); return {}; },
  list:async()=>({assets:[],usage:{}})
 };
 // ---- downloads ----
 const downloads={ save:async({filename,data})=>{ const b=data instanceof Blob?data:new Blob([data],{type:"application/pdf"});
   const f=new File([b],filename,{type:b.type||"application/pdf"}); window.__lastFile=f; if(!window.__ios) window.__dl(f); return {status:"saved"}; } };
 window.__ios=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
 window.__dl=f=>{ if(window.__ios&&navigator.canShare&&navigator.canShare({files:[f]})){ navigator.share({files:[f]}).catch(()=>{}); return; }
   const u=URL.createObjectURL(f); const a=document.createElement("a"); a.href=u; a.download=f.name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(u); a.remove(); },8000); };
 // ---- AI invoice reading (optional key on this phone) ----
 const KEY=()=>{ try{ return localStorage.getItem("aseel-api-key")||""; }catch(e){ return ""; } };
 const b64=b=>new Promise(res=>{ const fr=new FileReader(); fr.onload=()=>res(String(fr.result).split(",")[1]); fr.readAsDataURL(b); });
 async function ask(input,opts){ opts=opts||{}; const content=[];
   for(const im of [].concat(opts.images||[])){ content.push({type:"image",source:{type:"base64",media_type:(im.type&&/^image\/(jpeg|png|webp|gif)$/.test(im.type))?im.type:"image/jpeg",data:await b64(im)}}); }
   content.push({type:"text",text:String(input)});
   let r; try{ r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":KEY(),"anthropic-version":"2023-06-01","content-type":"application/json","anthropic-dangerous-direct-browser-access":"true"},
     body:JSON.stringify({model:"claude-haiku-5-5",max_tokens:1024,messages:[{role:"user",content}]})}); }catch(e){ throw {code:"unavailable",message:"network"}; }
   if(r.status===401||r.status===403) throw {code:"not_granted",message:"invalid key"};
   if(r.status===429) throw {code:"rate_limited",message:"rate"};
   if(!r.ok){ let m=""; try{ m=(await r.json()).error.message; }catch(e){} throw {code:"unavailable",message:m||("HTTP "+r.status)}; }
   const j=await r.json(); return (j.content||[]).filter(c=>c.type==="text").map(c=>c.text).join(""); }
 const kindOf=t=>/مخطط معماري/.test(t)?"outline":/إثبات دفعة|شيك بنكي/.test(t)?"payment":/فاتورة مشتريات/.test(t)?"invoice":null;
 async function viaServer(input,opts){ const kind=kindOf(String(input)); const im=[].concat(opts&&opts.images||[])[0]; if(!kind||!im) throw {code:"unavailable",message:"unsupported"};
   let r; try{ r=await fetch(SB_URL+"/functions/v1/read-doc",{method:"POST",headers:{"content-type":"application/json","apikey":SB_KEY},body:JSON.stringify({kind,image:await b64(im),mediaType:im.type||"image/jpeg",lang:document.documentElement.lang==="en"?"en":"ar"})}); }catch(e){ throw {code:"unavailable",message:"network"}; }
   const j=await r.json().catch(()=>({})); if(!r.ok){ throw {code:r.status===404?"not_granted":(j.status===429?"rate_limited":"unavailable"),message:j.error||("HTTP "+r.status)}; } return j.text||""; }
 const run=(input,opts)=>KEY()?ask(input,opts):viaServer(input,opts);
 const sample=Object.assign(async(input,opts)=>({text:await run(input,opts),truncated:false}),{
   json:async(input,opts)=>{ const t=await run(input,opts); const m=t.match(/\{[\s\S]*\}/); if(!m) throw {code:"invalid_json",text:t}; return JSON.parse(m[0]); },
   limits:async()=>({images:{maxCount:5,maxBytes:5e6,mediaTypes:["image/jpeg","image/png","image/webp"]}}) });
 window.__saveKey=()=>{ const el=document.getElementById("api-key"); const v=(el&&el.value||"").trim(); try{ if(v) localStorage.setItem("aseel-api-key",v); else localStorage.removeItem("aseel-api-key"); }catch(e){} location.reload(); };
 window.__hasKey=()=>!!KEY();
 // ---- one-time migration of the original data ----
 const migrate=(async()=>{ if(!sb) return;
   try{ const {data:flag}=await sb.from("settings").select("id").eq("id","_migrated").maybeSingle(); if(flag) return;
     const sd=await fetch("./seed.json",{cache:"no-store"}).then(r=>r.ok?r.json():null).catch(()=>null); if(!sd) return;
     window.__migrating=true;
     for(const [id,path] of Object.entries(sd.media||{})){ try{ const blob=await fetch(path).then(r=>r.blob()); await sb.storage.from("media").upload(id,blob,{contentType:blob.type||"image/jpeg",upsert:true}); }catch(e){} }
     const up=(t,obj)=>Object.keys(obj||{}).length?sb.from(t).upsert(Object.entries(obj).map(([id,d])=>({id,data:{...d,id}}))):Promise.resolve({});
     await up("sites",sd.sites); await up("marks",sd.marks);
     const {data:cur}=await sb.from("settings").select("data").eq("id","company").maybeSingle();
     await sb.from("settings").upsert({id:"company",data:{...(sd.settings||{}),...((cur&&cur.data)||{})}});
     await sb.from("settings").upsert({id:"_migrated",data:{at:new Date().toISOString(),version:sd.version}});
   }catch(e){ console.warn("migrate",e); }
   window.__migrating=false; })();
 window.claude={ use:async n=>{ if(n==="db"){ if(!sb) return null; await migrate; return db; } return n==="assets"?(sb?assets:null):n==="downloads"?downloads:n==="sample"?sample:null; } };
 let deferred=null; window.addEventListener("beforeinstallprompt",e=>{ e.preventDefault(); deferred=e; window.__canInstall=true; });
 window.__install=async()=>{ if(!deferred) return; deferred.prompt(); await deferred.userChoice; deferred=null; window.__canInstall=false; };
 window.installHint=()=>{ const sa=window.matchMedia("(display-mode: standalone)").matches||navigator.standalone; if(sa) return "";
   const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
   return ios?'<br>📲 <b>لتثبيت التطبيق على الآيفون:</b> افتح الصفحة في Safari، ثم زر المشاركة ⬆️، ثم «إضافة إلى الشاشة الرئيسية».'
     :(window.__canInstall?'<br><button class="primary" onclick="__install()">📲 تثبيت التطبيق على الجوال</button>':'<br>📲 <b>لتثبيت التطبيق:</b> من قائمة Chrome ⋮ اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».'); };
 if("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
 const pushCall=async body=>{ const r=await fetch(SB_URL+"/functions/v1/push",{method:"POST",headers:{"content-type":"application/json","apikey":SB_KEY},body:JSON.stringify(body)}); const j=await r.json().catch(()=>({})); if(!r.ok) throw new Error(j.error||("HTTP "+r.status)); return j; };
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
</script>
'''
head=f'''<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
{title}
<meta name="theme-color" content="#11823a">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="أصيل">
<link rel="manifest" href="./manifest.json">
<link rel="icon" href="./icon-192.png">
<link rel="apple-touch-icon" href="./apple-touch-icon.png">
{''.join(links)}<style>
:root{{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}
body{{margin:0;font:14px system-ui,-apple-system,"Segoe UI",sans-serif}}
.sheet{{padding-bottom:calc(84px + env(safe-area-inset-bottom,0px))!important;max-height:72vh!important}}
.wrap{{padding-bottom:110px!important}}
.vfields{{padding-bottom:84px!important}}
.toast{{bottom:calc(84px + env(safe-area-inset-bottom,0px))!important}}
img{{max-width:100%}} [hidden]{{display:none!important}}
</style>
{style}
</head>
<body>
'''
out=head+shim+s.strip()+'\n</body>\n</html>\n'
pathlib.Path('/home/claude/aseel-app/index.html').write_text(out,encoding='utf8')
manifest={"name":"تقارير مواقع أصيل","short_name":"أصيل","description":"تقارير مواقع أصيل للألمنيوم والزجاج","start_url":"./","scope":"./","display":"standalone","orientation":"portrait","background_color":"#f4f2ee","theme_color":"#11823a","lang":"ar","dir":"rtl",
 "icons":[{"src":"icon-192.png","sizes":"192x192","type":"image/png"},{"src":"icon-512.png","sizes":"512x512","type":"image/png"},{"src":"icon-maskable-512.png","sizes":"512x512","type":"image/png","purpose":"maskable"}]}
pathlib.Path('/home/claude/aseel-app/manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=1),encoding='utf8')
sw='''const C="aseel-v34";
const SHELL=["./","./index.html","./manifest.json","./logo.png","./icon-192.png","./icon-512.png"];
self.addEventListener("install",e=>{ e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())); });
self.addEventListener("activate",e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener("fetch",e=>{ const r=e.request; if(r.method!=="GET") return;
  const u=new URL(r.url);
  if(u.origin===location.origin){ // network first for app files so updates arrive
    e.respondWith(fetch(r).then(res=>{ const cp=res.clone(); caches.open(C).then(c=>c.put(r,cp)); return res; }).catch(()=>caches.match(r).then(m=>m||caches.match("./index.html")))); return; }
  if(/cdnjs\\.cloudflare\\.com|cdn\\.jsdelivr\\.net|fonts\\.(googleapis|gstatic)\\.com/.test(u.host)){ // cache first for libraries and fonts
    e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{ const cp=res.clone(); caches.open(C).then(c=>c.put(r,cp)); return res; }))); }
});
self.addEventListener("push",e=>{ let d={}; try{ d=e.data?e.data.json():{}; }catch(x){ d={title:"أصيل",body:e.data?e.data.text():""}; }
  e.waitUntil(self.registration.showNotification(d.title||"أصيل",{body:d.body||"",icon:"./icon-192.png",badge:"./icon-192.png",tag:d.tag||"aseel",renotify:true,requireInteraction:/low/.test(d.tag||""),vibrate:[200,100,200,100,300],dir:"rtl",lang:"ar",data:{url:d.url||"./"}})); });
self.addEventListener("notificationclick",e=>{ e.notification.close(); const url=(e.notification.data&&e.notification.data.url)||"./";
  e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(cs=>{ for(const c of cs){ if("focus" in c){ c.postMessage({open:url}); return c.focus(); } } return self.clients.openWindow(url); })); });
'''
pathlib.Path('/home/claude/aseel-app/sw.js').write_text(sw,encoding='utf8')
print(len(out))
