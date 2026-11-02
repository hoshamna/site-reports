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
