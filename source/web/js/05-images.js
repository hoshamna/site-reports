/* ---------- images ---------- */
function compress(file, max=1600, type="image/jpeg"){
  return new Promise((res)=>{
    if(!file.type.startsWith("image/")) return res(file);
    const img=new Image(), url=URL.createObjectURL(file);
    img.onload=()=>{ const k=Math.min(1,max/Math.max(img.width,img.height)); const c=document.createElement("canvas");
      c.width=Math.round(img.width*k); c.height=Math.round(img.height*k); c.getContext("2d").drawImage(img,0,0,c.width,c.height);
      URL.revokeObjectURL(url); c.toBlob(b=>res(b||file),type,0.82); };
    img.onerror=()=>{ URL.revokeObjectURL(url); res(file); };
    img.src=url;
  });
}
// opening a PDF someone sent: never run code from inside the file (scripts, forms, eval)
async function pdfOpen(file){ let lib=window.pdfjsLib; for(let i=0;i<50&&!lib;i++){ await new Promise(r=>setTimeout(r,100)); lib=window.pdfjsLib; } if(!lib) throw 0;
  return lib.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,enableScripting:false,enableXfa:false}).promise; }
const isPdfFile=f=>!!f&&(f.type==="application/pdf"||/\.pdf$/i.test(f.name||""));
async function pdfPages(file, max=8){
  try{
    const doc=await pdfOpen(file); const out=[];
    for(let i=1;i<=Math.min(doc.numPages,max);i++){
      const page=await doc.getPage(i); const v1=page.getViewport({scale:1}); const k=Math.min(3,1800/Math.max(v1.width,v1.height));
      const vp=page.getViewport({scale:k}); const c=document.createElement("canvas"); c.width=Math.round(vp.width); c.height=Math.round(vp.height);
      const ctx=c.getContext("2d"); ctx.fillStyle="#fff"; ctx.fillRect(0,0,c.width,c.height); await page.render({canvasContext:ctx,viewport:vp}).promise;
      const b=await new Promise(r=>c.toBlob(r,"image/jpeg",0.88)); out.push(new File([b],`page${i}.jpg`,{type:"image/jpeg"}));
    }
    return out;
  }catch(e){ return [file]; }
}
async function pdfToImage(file){
  try{
    const doc=await pdfOpen(file);
    const page=await doc.getPage(1); const v1=page.getViewport({scale:1}); const k=Math.min(4,2600/Math.max(v1.width,v1.height));
    const vp=page.getViewport({scale:k}); const c=document.createElement("canvas"); c.width=Math.round(vp.width); c.height=Math.round(vp.height);
    const ctx=c.getContext("2d"); ctx.fillStyle="#fff"; ctx.fillRect(0,0,c.width,c.height);
    await page.render({canvasContext:ctx,viewport:vp}).promise;
    const b=await new Promise(r=>c.toBlob(r,"image/jpeg",0.9)); return new File([b],"plan.jpg",{type:"image/jpeg"});
  }catch(e){ const err=new Error("pdf"); err.pdf=true; throw err; }
}
async function upload(file){
  if(!assets){ toast("رفع الصور غير متاح في هذا العرض. افتح الصفحة من حسابك في تطبيق Claude أو claude.ai"); return null; }
  let blob; try{ blob = await compress(file); }catch(e){ blob=file; }
  let r; try{ r = await assets.upload(blob); }
  catch(e){ console.warn("upload",e); const c=e&&e.code; toast(c==="too_large"?"الصورة كبيرة جداً":c==="rate_limited"?"محاولات كثيرة، انتظر قليلاً":c==="not_granted"?"لم يُسمح بالرفع، اختر السماح عند السؤال":"تعذر رفع الصورة ("+(c||e&&e.message||"خطأ")+")"); throw Object.assign(new Error("shown"),{shown:true}); }
  return { id:r.id, type: file.type.startsWith("image/") ? "image" : "pdf" };
}
let CAM=false;
function pickFiles(accept, multiple){
  const cam=CAM; CAM=false;
  return new Promise(res=>{
    const fi=document.createElement("input"); fi.type="file";
    fi.accept=cam?"image/*":accept; if(multiple&&!cam) fi.multiple=true; if(cam) fi.setAttribute("capture","environment");
    fi.style.cssText="position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none";
    document.body.appendChild(fi);
    let done=false; const fin=v=>{ if(done) return; done=true; setTimeout(()=>fi.remove(),1000); res(v); };
    fi.addEventListener("change",()=>fin([...(fi.files||[])]));
    fi.addEventListener("cancel",()=>fin([]));
    fi.click();
  });
}

