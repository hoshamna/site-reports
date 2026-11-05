const C="aseel-754c74ec5a";
const SHELL=["./","./index.html","./manifest.json","./logo.png","./mark.png","./icon-192.png","./icon-512.png"];
self.addEventListener("install",e=>{ e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())); });
self.addEventListener("activate",e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener("fetch",e=>{ const r=e.request; if(r.method!=="GET") return;
  const u=new URL(r.url);
  if(u.origin===location.origin){ // network first for app files so updates arrive
    e.respondWith(fetch(r).then(res=>{ const cp=res.clone(); caches.open(C).then(c=>c.put(r,cp)); return res; }).catch(()=>caches.match(r).then(m=>m||caches.match("./index.html")))); return; }
  if(/cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.(googleapis|gstatic)\.com/.test(u.host)){ // cache first for libraries and fonts
    e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{ const cp=res.clone(); caches.open(C).then(c=>c.put(r,cp)); return res; }))); }
});
self.addEventListener("push",e=>{ let d={}; try{ d=e.data?e.data.json():{}; }catch(x){ d={title:"أصيل",body:e.data?e.data.text():""}; }
  e.waitUntil(self.registration.showNotification(d.title||"أصيل",{body:d.body||"",icon:"./icon-192.png",badge:"./icon-192.png",tag:d.tag||"aseel",renotify:true,requireInteraction:/low/.test(d.tag||""),vibrate:[200,100,200,100,300],dir:"rtl",lang:"ar",data:{url:d.url||"./"}})); });
self.addEventListener("notificationclick",e=>{ e.notification.close(); const url=(e.notification.data&&e.notification.data.url)||"./";
  e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(cs=>{ for(const c of cs){ if("focus" in c){ c.postMessage({open:url}); return c.focus(); } } return self.clients.openWindow(url); })); });
