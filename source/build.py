import re, json, pathlib
HERE=pathlib.Path(__file__).resolve().parent
OUT=HERE.parent/'app'
src=(HERE/'site-reports.html').read_text(encoding='utf8')
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
 const sb=window.supabase&&window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,storageKey:"aseel-auth"}});
 window.__sb=sb;
 const freeze=o=>JSON.parse(JSON.stringify(o||{}));
 const err=e=>({code:(e&&(e.code==="42501"||e.code==="PGRST301"))?"not_granted":"unavailable",message:(e&&e.message)||"error"});
 // ---- accounts (Supabase Auth) ----
 const A={session:null,me:null,profiles:[],ready:false,subs:new Set(),chan:null};
 const isAdmin=()=>!!(A.me&&A.me.role==="admin");
 const profOf=r=>({...(r.data||{}),id:r.id,name:r.name,role:r.role,authId:r.auth_id});
 async function loadProfiles(){ if(!A.session){ A.profiles=[]; A.me=null; return; }
   const {data,error}=await sb.from("profiles").select("id,auth_id,name,role,data").order("name"); if(error) throw error;
   A.profiles=(data||[]).map(profOf); A.me=A.profiles.find(p=>p.authId===A.session.user.id)||null; }
 const authState=()=>({user:A.me?{...A.me}:null,profiles:A.profiles.map(p=>({...p})),ready:A.ready});
 const emitAuth=()=>A.subs.forEach(f=>{ try{ f(authState()); }catch(e){ console.warn(e); } });
 let lastUid;
 async function onSession(s){ A.session=s||null; try{ await loadProfiles(); }catch(e){ console.warn("profiles",e); }
   if(A.session&&!A.me){ await sb.auth.signOut().catch(()=>{}); A.session=null; A.profiles=[]; } // حساب بلا ملف مستخدم: لا دخول
   const u=A.session?A.session.user.id:null; A.ready=true;
   if(u!==lastUid){ lastUid=u; if(A.chan){ sb.removeChannel(A.chan); A.chan=null; }
     if(u){ A.chan=sb.channel("rt-profiles").on("postgres_changes",{event:"*",schema:"public",table:"profiles"},()=>{ loadProfiles().then(emitAuth).catch(()=>{}); }).subscribe(); }
     else signed.clear();
     resetTables(); }
   emitAuth(); }
 if(sb){ sb.auth.getSession().then(({data})=>onSession(data&&data.session)).catch(()=>onSession(null));
   sb.auth.onAuthStateChange((ev,s)=>{ if(ev==="INITIAL_SESSION") return; if(ev==="TOKEN_REFRESHED"){ A.session=s; return; } setTimeout(()=>onSession(s),0); }); }
 else setTimeout(()=>{ A.ready=true; emitAuth(); },0);
 const tokenHdr=()=>A.session?{Authorization:"Bearer "+A.session.access_token}:{};
 async function fn(name,body){ let r; try{ r=await fetch(SB_URL+"/functions/v1/"+name,{method:"POST",headers:{"content-type":"application/json",apikey:SB_KEY,...tokenHdr()},body:JSON.stringify(body)}); }catch(e){ throw new Error("network"); }
   const j=await r.json().catch(()=>({})); if(!r.ok){ const e=new Error(j.error||("HTTP "+r.status)); e.status=r.status; throw e; } return j; }
 const emailOf=id=>`${id}@users.aseelalum.com`, pwOf=(id,pin)=>`Aseel!${pin}#${id}`;
 async function signIn(id,pin){ const {error}=await sb.auth.signInWithPassword({email:emailOf(id),password:pwOf(id,pin)}); if(error){ const e=new Error(error.message); e.status=error.status===400?401:error.status; throw e; } }
 const refresh=async()=>{ await loadProfiles(); emitAuth(); };
 window.__auth={
  onChange:f=>{ A.subs.add(f); if(A.ready) setTimeout(()=>f(authState()),0); return ()=>A.subs.delete(f); },
  list:async()=>{ const {data,error}=await sb.rpc("login_list"); if(error) throw new Error(error.message); return data||[]; },
  signIn:async(u,pin)=>{ if(u.legacy) await fn("accounts",{action:"claim",id:u.id,pin}); await signIn(u.id,pin); },
  bootstrap:async(name,pin)=>{ const j=await fn("accounts",{action:"bootstrap",name,pin}); await signIn(j.id,pin); },
  signOut:async()=>{ await sb.auth.signOut(); },
  setPin:async(id,pin)=>{ await fn("accounts",{action:"setPin",id,pin}); await refresh(); },
  create:async(name,role,pin)=>{ await fn("accounts",{action:"create",name,role,pin}); await refresh(); },
  update:async(id,patch)=>{ await fn("accounts",{action:"update",id,...patch}); await refresh(); },
  del:async id=>{ await fn("accounts",{action:"delete",id}); await refresh(); }
 };
 // ---- collections: cache + realtime (sites = sites + site_fin) ----
 const FIN=["total","payments","purchases","labor","otherCosts","quotes","quoteNo","schedule"];
 const tables={};
 function table(name){
  if(tables[name]) return tables[name];
  const t={rows:new Map(),subs:new Set(),docSubs:new Set(),loaded:null,chan:null,pub:new Map(),fin:new Map()};
  const snap=()=>{ const docs=[...t.rows.entries()].map(([id,d])=>({id,exists:true,data:()=>freeze(d)})); return {docs,size:docs.length,empty:!docs.length,docChanges:()=>[],metadata:{}}; };
  t.emit=()=>{ const sn=snap(); t.subs.forEach(f=>{ try{ f.next(sn); }catch(e){} }); t.docSubs.forEach(f=>{ try{ f(); }catch(e){} }); };
  t.merge=id=>{ const p=t.pub.get(id); if(!p){ t.rows.delete(id); return; } t.rows.set(id,{...p,...(t.fin.get(id)||{})}); };
  t.load=()=>{ if(!A.session){ t.rows.clear(); t.pub.clear(); t.fin.clear(); t.emit(); return Promise.resolve(); }
    if(!t.loaded){
      if(name==="sites") t.loaded=Promise.all([sb.from("sites").select("id,data"), isAdmin()?sb.from("site_fin").select("id,data"):Promise.resolve({data:[]})]).then(([a,b])=>{
        if(a.error) throw err(a.error); if(b.error) throw err(b.error);
        t.pub.clear(); t.fin.clear(); (a.data||[]).forEach(r=>t.pub.set(r.id,r.data||{})); (b.data||[]).forEach(r=>t.fin.set(r.id,r.data||{}));
        t.rows.clear(); t.pub.forEach((_,id)=>t.merge(id)); t.emit(); });
      else t.loaded=sb.from(name).select("id,data").then(({data,error})=>{ if(error) throw err(error); t.rows.clear(); (data||[]).forEach(r=>t.rows.set(r.id,r.data)); t.emit(); });
      t.loaded.catch(()=>{ t.loaded=null; }); }
    return t.loaded; };
  t.listen=()=>{ if(t.chan||!A.session) return; let ch=sb.channel("rt-"+name);
    const on=(tbl,fnc)=>{ ch=ch.on("postgres_changes",{event:"*",schema:"public",table:tbl},p=>{ const id=(p.new&&p.new.id)||(p.old&&p.old.id); if(!id) return; fnc(id,p.eventType==="DELETE"?null:(p.new&&p.new.data)||{}); t.emit(); }); };
    if(name==="sites"){ on("sites",(id,d)=>{ if(d) t.pub.set(id,d); else { t.pub.delete(id); t.fin.delete(id); } t.merge(id); });
      if(isAdmin()) on("site_fin",(id,d)=>{ if(d) t.fin.set(id,d); else t.fin.delete(id); t.merge(id); }); }
    else on(name,(id,d)=>{ if(d) t.rows.set(id,d); else t.rows.delete(id); });
    t.chan=ch.subscribe(); };
  t.reset=()=>{ if(t.chan){ sb.removeChannel(t.chan); t.chan=null; } t.loaded=null; t.rows.clear(); t.pub.clear(); t.fin.clear();
    if(t.subs.size||t.docSubs.size){ t.load().catch(()=>{}); t.listen(); } };
  t.snap=snap;
  return tables[name]=t;
 }
 function resetTables(){ Object.values(tables).forEach(t=>t.reset()); }
 setInterval(()=>{ if(!A.session) return; Object.values(tables).forEach(t=>{ if(t.subs.size||t.docSubs.size){ t.loaded=null; t.load().catch(()=>{}); } }); },60000);
 const now=()=>new Date().toISOString();
 const db={
  collection:name=>({
    get:async()=>{ const t=table(name); await t.load(); return t.snap(); },
    onSnapshot:(next,onErr)=>{ const t=table(name); const o={next}; t.subs.add(o); t.load().catch(e=>onErr&&onErr(e)); t.listen(); if(t.rows.size) setTimeout(()=>next(t.snap()),0); return ()=>t.subs.delete(o); }
  }),
  doc:path=>{ const [name,id]=path.split("/"); return {
    set:async body=>{ const t=table(name); t.rows.set(id,body);
      if(name==="sites"){ const pub={}, fin={}; Object.keys(body||{}).forEach(k=>{ (FIN.includes(k)?fin:pub)[k]=body[k]; });
        t.pub.set(id,pub); if(isAdmin()) t.fin.set(id,fin);
        const {error}=await sb.from("sites").upsert({id,data:pub,updated_at:now()}); if(error) throw err(error);
        if(isAdmin()){ const r=await sb.from("site_fin").upsert({id,data:fin,updated_at:now()}); if(r.error) throw err(r.error); }
        return; }
      const {error}=await sb.from(name).upsert({id,data:body,updated_at:now()}); if(error) throw err(error); },
    delete:async()=>{ const t=table(name); t.rows.delete(id); t.pub.delete(id); t.fin.delete(id);
      if(name==="sites"&&isAdmin()){ const r=await sb.from("site_fin").delete().eq("id",id); if(r.error) throw err(r.error); }
      const {error}=await sb.from(name).delete().eq("id",id); if(error) throw err(error); },
    onSnapshot:(next,onErr)=>{ const t=table(name); const f=()=>{ const d=t.rows.get(id); next({id,exists:!!d,data:()=>d?freeze(d):undefined,metadata:{}}); };
      t.docSubs.add(f); t.load().then(f).catch(e=>onErr&&onErr(e)); t.listen(); return ()=>t.docSubs.delete(f); }
  }; }
 };
 // ---- images: private storage, opened with short-lived signed links ----
 const BLANK="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
 const TTL=2*86400, signed=new Map(), want=new Set(); let wantT=null;
 try{ const c=JSON.parse(localStorage.getItem("aseel-media")||"{}"); Object.entries(c).forEach(([k,v])=>{ if(v&&v.exp>Date.now()+3600e3) signed.set(k,v); }); }catch(e){}
 const saveSigned=()=>{ try{ const o={}; signed.forEach((v,k)=>{ if(v.exp>Date.now()) o[k]=v; }); localStorage.setItem("aseel-media",JSON.stringify(o)); }catch(e){} };
 async function signBatch(){ wantT=null; const ids=[...want]; want.clear(); if(!ids.length||!A.session) return; let got=0;
   for(let i=0;i<ids.length;i+=100){ const {data}=await sb.storage.from("media").createSignedUrls(ids.slice(i,i+100),TTL).catch(()=>({data:null}));
     (data||[]).forEach(d=>{ if(d&&d.signedUrl&&d.path){ signed.set(d.path,{url:d.signedUrl,exp:Date.now()+TTL*1000}); got++; } }); }
   if(got){ saveSigned(); window.dispatchEvent(new Event("aseel-media")); } }
 window.__pub=id=>{ const v=signed.get(id); if(v&&v.exp>Date.now()+60000) return v.url; if(A.session){ want.add(id); if(!wantT) wantT=setTimeout(signBatch,40); } return BLANK; };
 window.__mediaBlob=async id=>{ const {data,error}=await sb.storage.from("media").download(id); if(error) throw new Error(error.message||"download"); return data; };
 const assets={
  upload:async blob=>{ const id=Date.now().toString(36)+Math.random().toString(36).slice(2,10); const {error}=await sb.storage.from("media").upload(id,blob,{contentType:blob.type||"image/jpeg",upsert:true}); if(error) throw {code:"unavailable",message:error.message};
    try{ signed.set(id,{url:URL.createObjectURL(blob),exp:Date.now()+3600e3}); }catch(e){} return {id,url:window.__pub(id),sizeBytes:blob.size,contentType:blob.type}; },
  delete:async id=>{ if(!id||id==="__logo") return {}; await sb.storage.from("media").remove([id]); return {}; },
  list:async()=>({assets:[],usage:{}})
 };
 // ---- downloads ----
 const downloads={ save:async({filename,data})=>{ const b=data instanceof Blob?data:new Blob([data],{type:"application/pdf"});
   const f=new File([b],filename,{type:b.type||"application/pdf"}); window.__lastFile=f; if(!window.__ios) window.__dl(f); return {status:"saved"}; } };
 window.__ios=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
 window.__dl=f=>{ if(window.__ios&&navigator.canShare&&navigator.canShare({files:[f]})){ navigator.share({files:[f]}).catch(()=>{}); return; }
   const u=URL.createObjectURL(f); const a=document.createElement("a"); a.href=u; a.download=f.name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(u); a.remove(); },8000); };
 // ---- AI invoice reading (optional key on this phone, otherwise the read-doc function) ----
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
   let r; try{ r=await fetch(SB_URL+"/functions/v1/read-doc",{method:"POST",headers:{"content-type":"application/json","apikey":SB_KEY,...tokenHdr()},body:JSON.stringify({kind,image:await b64(im),mediaType:im.type||"image/jpeg",lang:document.documentElement.lang==="en"?"en":"ar"})}); }catch(e){ throw {code:"unavailable",message:"network"}; }
   const j=await r.json().catch(()=>({})); if(!r.ok){ throw {code:r.status===404?"not_granted":(j.status===429?"rate_limited":"unavailable"),message:j.error||("HTTP "+r.status)}; } return j.text||""; }
 const run=(input,opts)=>KEY()?ask(input,opts):viaServer(input,opts);
 const sample=Object.assign(async(input,opts)=>({text:await run(input,opts),truncated:false}),{
   json:async(input,opts)=>{ const t=await run(input,opts); const m=t.match(/\{[\s\S]*\}/); if(!m) throw {code:"invalid_json",text:t}; return JSON.parse(m[0]); },
   limits:async()=>({images:{maxCount:5,maxBytes:5e6,mediaTypes:["image/jpeg","image/png","image/webp"]}}) });
 window.__saveKey=()=>{ const el=document.getElementById("api-key"); const v=(el&&el.value||"").trim(); try{ if(v) localStorage.setItem("aseel-api-key",v); else localStorage.removeItem("aseel-api-key"); }catch(e){} location.reload(); };
 window.__hasKey=()=>!!KEY();
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
(OUT/'index.html').write_text(out,encoding='utf8')
manifest={"name":"تقارير مواقع أصيل","short_name":"أصيل","description":"تقارير مواقع أصيل للألمنيوم والزجاج","start_url":"./","scope":"./","display":"standalone","orientation":"portrait","background_color":"#f4f2ee","theme_color":"#11823a","lang":"ar","dir":"rtl",
 "icons":[{"src":"icon-192.png","sizes":"192x192","type":"image/png"},{"src":"icon-512.png","sizes":"512x512","type":"image/png"},{"src":"icon-maskable-512.png","sizes":"512x512","type":"image/png","purpose":"maskable"}]}
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=1),encoding='utf8')
sw='''const C="aseel-v36";
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
(OUT/'sw.js').write_text(sw,encoding='utf8')
print(len(out))
