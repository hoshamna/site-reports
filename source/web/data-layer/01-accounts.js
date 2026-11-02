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
 async function onSession(s){ A.meReady=false; A.session=s||null; try{ await loadProfiles(); }catch(e){ console.warn("profiles",e); } A.meReady=true;
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
