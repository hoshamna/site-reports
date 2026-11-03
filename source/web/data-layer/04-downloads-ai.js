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
 const kindOf=t=>/تفريغ صوتي لملاحظة/.test(t)?"notes":/مخطط معماري/.test(t)?"outline":/إثبات دفعة|شيك بنكي/.test(t)?"payment":/فاتورة مشتريات/.test(t)?"invoice":null;
 async function viaServer(input,opts){ const kind=kindOf(String(input));
   if(kind==="notes"){ let r; try{ r=await fetch(SB_URL+"/functions/v1/read-doc",{method:"POST",headers:{"content-type":"application/json","apikey":SB_KEY,...tokenHdr()},body:JSON.stringify({kind,text:String(opts&&opts.text||""),lang:document.documentElement.lang==="en"?"en":"ar"})}); }catch(e){ throw {code:"unavailable",message:"network"}; }
     const j=await r.json().catch(()=>({})); if(!r.ok) throw {code:r.status===400?"unsupported":"unavailable",message:j.error||("HTTP "+r.status)}; return j.text||""; }
   const im=[].concat(opts&&opts.images||[])[0]; if(!kind||!im) throw {code:"unavailable",message:"unsupported"};
   let r; try{ r=await fetch(SB_URL+"/functions/v1/read-doc",{method:"POST",headers:{"content-type":"application/json","apikey":SB_KEY,...tokenHdr()},body:JSON.stringify({kind,image:await b64(im),mediaType:im.type||"image/jpeg",lang:document.documentElement.lang==="en"?"en":"ar"})}); }catch(e){ throw {code:"unavailable",message:"network"}; }
   const j=await r.json().catch(()=>({})); if(!r.ok){ throw {code:r.status===404?"not_granted":(j.status===429?"rate_limited":"unavailable"),message:j.error||("HTTP "+r.status)}; } return j.text||""; }
 const run=(input,opts)=>KEY()?ask(input,opts):viaServer(input,opts);
 const sample=Object.assign(async(input,opts)=>({text:await run(input,opts),truncated:false}),{
   json:async(input,opts)=>{ const t=await run(input,opts); const m=t.match(/\{[\s\S]*\}/); if(!m) throw {code:"invalid_json",text:t}; return JSON.parse(m[0]); },
   limits:async()=>({images:{maxCount:5,maxBytes:5e6,mediaTypes:["image/jpeg","image/png","image/webp"]}}) });
 window.__saveKey=()=>{ const el=document.getElementById("api-key"); const v=(el&&el.value||"").trim(); try{ if(v) localStorage.setItem("aseel-api-key",v); else localStorage.removeItem("aseel-api-key"); }catch(e){} location.reload(); };
 window.__hasKey=()=>!!KEY();
