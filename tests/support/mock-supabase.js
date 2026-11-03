// In-page stand-in for the Supabase pieces the app uses (auth, tables, storage, the accounts function),
// applying the same role rules as source/supabase/security-setup.sql. Injected by tests/support/app.js.
// Seed users: هشام (admin, PIN 1234) and أحمد (buyer, PIN 5678) start as legacy accounts, as after the migration.
(function(){
  const LS=k=>{ try{ return JSON.parse(localStorage.getItem("mock-"+k)||"null"); }catch(e){ return null; } };
  const SV=(k,v)=>localStorage.setItem("mock-"+k,JSON.stringify(v));
  let DB=LS("db");
  if(!DB){ DB={profiles:{},legacy_pins:{
      u1:{id:"u1",name:"هشام",role:"admin",h:"__H1__",data:{notifyLow:true},fails:0},
      u2:{id:"u2",name:"أحمد",role:"buyer",h:"__H2__",data:{mustChange:true},fails:0}},
    users:{}, // auth users by email
    sites:{s1:{id:"s1",data:{id:"s1",name:"فيلا الرحمانية",engineer:"م. مثال",floors:[],items:[],issues:[],photos:[],coverId:"img1"}}},
    site_fin:{s1:{id:"s1",data:{total:85000,payments:[{id:"p1",amount:10000,date:"2026-10-01"}],purchases:[],labor:[],otherCosts:[]}}},
    marks:{}, custody:{c1:{id:"c1",data:{id:"c1",kind:"dep",amount:5000,date:"2026-11-01",by:"هشام"},created_by:null}},
    settings:{company:{id:"company",data:{company:"أصيل للألمنيوم والزجاج ذ م م",cuLow:1000}}}, media:{img1:1} }; }
  const save=()=>SV("db",DB);
  window.__mockDB=()=>DB; window.__log=[];
  let session=LS("session");
  const me=()=>session&&Object.values(DB.profiles).find(p=>p.auth_id===session.user.id);
  const role=()=>{ const p=me(); return p?p.role:null; };
  const name=()=>{ const p=me(); return p?p.name:null; };
  const kind=d=>(d&&d.kind)||"exp";
  const canRead=(t,r)=>{ const R=role(); if(!R) return false;
    if(t==="profiles"||t==="settings"||t==="sites") return true;
    if(t==="site_fin"||t==="backups") return R==="admin"; if(t==="marks") return R!=="buyer";
    if(t==="custody") return R==="admin"||r.created_by===session.user.id||[r.data.by,r.data.to,r.data.holder].includes(name());
    return false; };
  const canWrite=(t,r,op)=>{ const R=role(); if(!R) return false;
    if(t==="sites") return op==="delete"?R==="admin":R!=="buyer";
    if(t==="site_fin"||t==="settings") return R==="admin"; if(t==="marks") return R!=="buyer";
    if(t==="custody") return R==="admin"||((r.created_by===session.user.id)&&kind(r.data)==="exp");
    return false; };
  const listeners=new Set();
  const authSubs=new Set();
  const fireAuth=ev=>authSubs.forEach(f=>f(ev,session));
  const chans=[];
  function notify(table,eventType,row){ chans.forEach(c=>c.subs.filter(s=>s.table===table).forEach(s=>{ if(eventType!=="DELETE"&&!canRead(table,row)) return; s.cb({eventType,new:eventType==="DELETE"?{}:{id:row.id,data:row.data},old:{id:row.id}}); })); }
  function q(table){
    const st={op:"select",filters:[],single:false};
    const run=async()=>{ await new Promise(r=>setTimeout(r,table==="profiles"?(window.__mockSlowProfiles||5):5)); const T=DB[table]||(DB[table]={});
      if(st.op==="select"){ if(!session) return {data:null,error:{code:"42501",message:"permission denied"}};
        let rows=Object.values(T).filter(r=>canRead(table,r)).filter(r=>st.filters.every(([k,v])=>String(r[k])===String(v)));
        if(table==="profiles"||table==="backups") rows=rows.map(r=>({...r}));
        return st.single?{data:rows[0]||null,error:null}:{data:rows.map(r=>(table==="profiles"||table==="backups")?r:{id:r.id,data:JSON.parse(JSON.stringify(r.data))}),error:null}; }
      if(st.op==="upsert"){ const v=st.val; const ex=T[v.id]; const row=ex?{...ex,data:v.data}:{id:v.id,data:v.data,created_by:session&&session.user.id};
        if(!canWrite(table,row,"upsert")||(ex&&!canWrite(table,ex,"upsert"))){ window.__log.push("DENIED upsert "+table+" "+v.id); return {data:null,error:{code:"42501",message:"new row violates row-level security policy for table \""+table+"\""}}; }
        T[v.id]=row; save(); notify(table,ex?"UPDATE":"INSERT",row); window.__log.push("upsert "+table+" "+v.id); return {data:null,error:null}; }
      if(st.op==="delete"){ const id=st.filters.find(f=>f[0]==="id")[1]; const ex=T[id]; if(ex&&canWrite(table,ex,"delete")){ delete T[id]; save(); notify(table,"DELETE",ex); window.__log.push("delete "+table+" "+id); } else window.__log.push("DENIED delete "+table+" "+id); return {data:null,error:null}; }
    };
    const api={ select(){ st.op="select"; return api; }, order(){ return api; }, limit(){ return api; }, eq(k,v){ st.filters.push([k,v]); return api; }, maybeSingle(){ st.single=true; return api; },
      upsert(v){ st.op="upsert"; st.val=v; return api; }, delete(){ st.op="delete"; return api; }, then(a,b){ return run().then(a,b); } };
    return api; }
  const client={
    auth:{
      getSession:async()=>({data:{session}}),
      onAuthStateChange:f=>{ authSubs.add(f); setTimeout(()=>f("INITIAL_SESSION",session),0); return {data:{subscription:{unsubscribe(){authSubs.delete(f);}}}}; },
      signInWithPassword:async({email,password})=>{ await new Promise(r=>setTimeout(r,10)); const u=DB.users[email]; if(!u||u.password!==password) return {error:{message:"Invalid login credentials",status:400}};
        session={access_token:"tok-"+u.id,user:{id:u.id,email}}; SV("session",session); fireAuth("SIGNED_IN"); return {data:{session},error:null}; },
      signOut:async()=>{ session=null; SV("session",null); fireAuth("SIGNED_OUT"); return {error:null}; } },
    from:q,
    rpc:async n=>{ if(n!=="login_list") return {error:{message:"no rpc"}}; return {data:[...Object.values(DB.profiles).map(p=>({id:p.id,name:p.name,role:p.role,legacy:false})),...Object.values(DB.legacy_pins).map(p=>({id:p.id,name:p.name,role:p.role,legacy:true}))],error:null}; },
    channel:n=>{ const c={n,subs:[],on(ev,f,cb){ c.subs.push({table:f.table,cb}); return c; },subscribe(){ chans.push(c); return c; }}; return c; },
    removeChannel:c=>{ const i=chans.indexOf(c); if(i>=0) chans.splice(i,1); },
    storage:{from:()=>({
      createSignedUrls:async(ids)=>{ if(!session) return {data:null}; return {data:ids.map(id=>({path:id,signedUrl:"/signed/"+id+".svg?t=1"}))}; },
      download:async id=>({data:new Blob(["x"],{type:"image/jpeg"}),error:null}),
      upload:async(id)=>{ DB.media[id]=1; save(); return {error:null}; },
      remove:async()=>({error:null}) })}
  };
  window.supabase={createClient:()=>client};
  // the accounts Edge Function, same rules as accounts.ts
  const sha=async t=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t)))].map(b=>b.toString(16).padStart(2,"0")).join("");
  const pw=(id,pin)=>`Aseel!${pin}#${id}`, em=id=>`${id}@users.aseelalum.com`;
  const mk=(id,pin)=>{ const uid="auth-"+id; DB.users[em(id)]={id:uid,password:pw(id,pin)}; return uid; };
  const R=(b,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json"}});
  const of=window.fetch.bind(window);
  window.fetch=async(url,init)=>{ const u=String(url);
    if(u.includes("/functions/v1/accounts")){ const b=JSON.parse(init.body); window.__log.push("fn "+b.action);
      const tok=(init.headers.Authorization||"").replace("Bearer tok-",""); const caller=Object.values(DB.profiles).find(p=>p.auth_id===tok);
      if(b.action==="claim"){ const L=DB.legacy_pins[b.id]; if(!L) return R({error:"no legacy"},404); if(await sha("aseel|"+b.id+"|"+b.pin)!==L.h){ L.fails++; save(); return R({error:"wrong pin"},401); }
        DB.profiles[b.id]={id:b.id,auth_id:mk(b.id,b.pin),name:L.name,role:L.role,data:L.data}; delete DB.legacy_pins[b.id]; save(); return R({ok:true}); }
      if(!caller) return R({error:"not signed in"},401);
      if(b.action==="setPin"){ const self=b.id===caller.id; if(!self&&caller.role!=="admin") return R({error:"forbidden"},403); const P=DB.profiles[b.id]; mk(b.id,b.pin); P.data={...P.data,mustChange:!self}; save(); notify("profiles","UPDATE",{id:b.id,data:{}}); return R({ok:true}); }
      if(caller.role!=="admin") return R({error:"forbidden"},403);
      if(b.action==="create"){ if(Object.values(DB.profiles).some(p=>p.name===b.name)) return R({error:"name exists"},409); const id="n"+Date.now().toString(36); DB.profiles[id]={id,auth_id:mk(id,b.pin),name:b.name,role:b.role,data:{mustChange:true}}; save(); return R({ok:true,id}); }
      if(b.action==="update"){ const P=DB.profiles[b.id]; if(b.role!==undefined){ if(b.id===caller.id) return R({error:"own role"},400); P.role=b.role; } ["canBackup","notifyLow","notifySalary"].forEach(k=>{ if(b[k]!==undefined) P.data={...P.data,[k]:!!b[k]}; }); save(); return R({ok:true}); }
      if(b.action==="delete"){ const P=DB.profiles[b.id]; delete DB.users[em(b.id)]; delete DB.profiles[b.id]; save(); return R({ok:true}); }
      return R({error:"unknown"},400); }
    if(u.includes("/functions/v1/")) return R({error:"mock"},404);
    return of(url,init); };
})();
