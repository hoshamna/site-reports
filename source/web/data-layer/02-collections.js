 // ---- collections: cache + realtime (sites = sites + site_fin) ----
 const FIN=["total","payments","purchases","labor","otherCosts","quotes","quoteNo","schedule"];
 const tables={};
 function table(name){
  if(tables[name]) return tables[name];
  const t={rows:new Map(),subs:new Set(),docSubs:new Set(),loaded:null,chan:null,pub:new Map(),fin:new Map()};
  const snap=()=>{ const docs=[...t.rows.entries()].map(([id,d])=>({id,exists:true,data:()=>freeze(d)})); return {docs,size:docs.length,empty:!docs.length,docChanges:()=>[],metadata:{}}; };
  t.emit=()=>{ const sn=snap(); t.subs.forEach(f=>{ try{ f.next(sn); }catch(e){} }); t.docSubs.forEach(f=>{ try{ f(); }catch(e){} }); };
  t.merge=id=>{ const p=t.pub.get(id); if(!p){ t.rows.delete(id); return; } t.rows.set(id,{...p,...(t.fin.get(id)||{})}); };
  t.load=()=>{ if(!A.session){ t.rows.clear(); t.pub.clear(); t.fin.clear(); t.finOk=false; t.emit(); return Promise.resolve(); }
    if(!A.meReady) return Promise.resolve();
    if(!t.loaded){ const gen=t.gen=(t.gen||0)+1, adm=isAdmin();
      if(name==="sites") t.loaded=Promise.all([sb.from("sites").select("id,data"), adm?sb.from("site_fin").select("id,data"):Promise.resolve({data:[]})]).then(([a,b])=>{
        if(a.error) throw err(a.error); if(b.error) throw err(b.error); if(gen!==t.gen) return;
        t.finOk=adm;
        t.pub.clear(); t.fin.clear(); (a.data||[]).forEach(r=>t.pub.set(r.id,r.data||{})); (b.data||[]).forEach(r=>t.fin.set(r.id,r.data||{}));
        t.rows.clear(); t.pub.forEach((_,id)=>t.merge(id)); t.emit(); });
      else t.loaded=sb.from(name).select("id,data").then(({data,error})=>{ if(error) throw err(error); if(gen!==t.gen) return; t.rows.clear(); (data||[]).forEach(r=>t.rows.set(r.id,r.data)); t.emit(); });
      t.loaded.catch(()=>{ t.loaded=null; }); }
    return t.loaded; };
  t.listen=()=>{ if(t.chan||!A.session||!A.meReady) return; let ch=sb.channel("rt-"+name);
    const on=(tbl,fnc)=>{ ch=ch.on("postgres_changes",{event:"*",schema:"public",table:tbl},p=>{ const id=(p.new&&p.new.id)||(p.old&&p.old.id); if(!id) return; fnc(id,p.eventType==="DELETE"?null:(p.new&&p.new.data)||{}); t.emit(); }); };
    if(name==="sites"){ on("sites",(id,d)=>{ if(d) t.pub.set(id,d); else { t.pub.delete(id); t.fin.delete(id); } t.merge(id); });
      if(isAdmin()) on("site_fin",(id,d)=>{ if(d) t.fin.set(id,d); else t.fin.delete(id); t.merge(id); }); }
    else on(name,(id,d)=>{ if(d) t.rows.set(id,d); else t.rows.delete(id); });
    t.chan=ch.subscribe(); };
  t.reset=()=>{ if(t.chan){ sb.removeChannel(t.chan); t.chan=null; } t.loaded=null; t.gen=(t.gen||0)+1; t.finOk=false; t.rows.clear(); t.pub.clear(); t.fin.clear();
    if(t.subs.size||t.docSubs.size){ t.load().catch(()=>{}); t.listen(); } };
  t.snap=snap;
  return tables[name]=t;
 }
 function resetTables(){ Object.values(tables).forEach(t=>t.reset()); }
 setInterval(()=>{ if(!A.session||!A.meReady) return; Object.values(tables).forEach(t=>{ if(t.subs.size||t.docSubs.size){ t.loaded=null; t.load().catch(()=>{}); } }); },60000);
 const now=()=>new Date().toISOString();
 const db={
  collection:name=>({
    get:async()=>{ const t=table(name); await t.load(); return t.snap(); },
    onSnapshot:(next,onErr)=>{ const t=table(name); const o={next}; t.subs.add(o); t.load().catch(e=>onErr&&onErr(e)); t.listen(); if(t.rows.size) setTimeout(()=>next(t.snap()),0); return ()=>t.subs.delete(o); }
  }),
  doc:path=>{ const [name,id]=path.split("/"); return {
    set:async body=>{ const t=table(name); t.rows.set(id,body);
      if(name==="sites"){ const pub={}, fin={}; Object.keys(body||{}).forEach(k=>{ (FIN.includes(k)?fin:pub)[k]=body[k]; });
        const finWrite=isAdmin()&&t.finOk;
        if(isAdmin()&&!t.finOk) throw {code:"unavailable",message:"finance not loaded yet"};
        t.pub.set(id,pub); if(finWrite) t.fin.set(id,fin);
        const {error}=await sb.from("sites").upsert({id,data:pub,updated_at:now()}); if(error) throw err(error);
        if(finWrite){ const r=await sb.from("site_fin").upsert({id,data:fin,updated_at:now()}); if(r.error) throw err(r.error); }
        return; }
      const {error}=await sb.from(name).upsert({id,data:body,updated_at:now()}); if(error) throw err(error); },
    delete:async()=>{ const t=table(name); t.rows.delete(id); t.pub.delete(id); t.fin.delete(id);
      if(name==="sites"&&isAdmin()){ const r=await sb.from("site_fin").delete().eq("id",id); if(r.error) throw err(r.error); }
      const {error}=await sb.from(name).delete().eq("id",id); if(error) throw err(error); },
    onSnapshot:(next,onErr)=>{ const t=table(name); const f=()=>{ const d=t.rows.get(id); next({id,exists:!!d,data:()=>d?freeze(d):undefined,metadata:{}}); };
      t.docSubs.add(f); t.load().then(f).catch(e=>onErr&&onErr(e)); t.listen(); return ()=>t.docSubs.delete(f); }
  }; }
 };

 // document numbers come from the database (one counter, locked while taken), never from the phone
 window.__docNo={
  next:async counter=>{ const {data,error}=await sb.rpc("next_doc_no",{p_counter:counter}); if(error) throw err(error); return data; },
  set:async(counter,last)=>{ const {error}=await sb.rpc("set_doc_counter",{p_counter:counter,p_last:last}); if(error) throw err(error); },
  counters:async()=>{ const {data,error}=await sb.from("doc_counters").select("counter,last"); if(error) throw err(error); return Object.fromEntries((data||[]).map(r=>[r.counter,r.last])); }
 };

 // may this account change invoices? (Hesham and GM; null when custody-guard.sql has not been run yet)
 window.__cuEditor=async()=>{ try{ const {data,error}=await sb.rpc("is_cu_editor"); return error?null:!!data; }catch(e){ return null; } };
