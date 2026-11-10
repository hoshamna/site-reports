/* ---- PDFs ---- */
async function cuPdf(title, blocks, fname, tag){
  if(!window.html2canvas||!window.jspdf) throw new Error(tr("مكتبة التقرير لم تُحمّل"));
  const co=S.settings; const rep=document.getElementById("report"); rep.dir=lang==="en"?"ltr":"rtl";
  const logo=co.logoId?await toDataUrl(co.logoId):null;
  blocks.unshift(`<div class="lh">${logo&&co.logoWide?`<div class="lhtop"><img class="lhbanner" src="${logo}"></div>`:`<div class="lhtop"><div class="lhname u"><div class="lhar">${esc(lang==="en"?(co.companyEn||co.company):co.company)}</div></div>${logo?`<img class="lhlogo" src="${logo}">`:""}</div>`}
    <div class="lhband"></div>
    <div class="lhtitle"><h1>${title}</h1><div class="lhdate">التاريخ <b class="num">${today()}</b></div></div></div>`);
  rep.innerHTML=blocks.join(""); translate(rep);
  await Promise.all([...rep.querySelectorAll("img")].map(im=>im.complete?0:new Promise(r=>{im.onload=im.onerror=r;})));
  try{ await document.fonts.ready; }catch(e){}
  const { jsPDF }=window.jspdf; const pdf=new jsPDF({unit:"mm",format:"a4"}); const W=210,H=297,bottom=18; let y=0;
  for(const el of rep.children){ const cv=await html2canvas(el,{scale:2,backgroundColor:"#ffffff",useCORS:true,logging:false});
    let w=W,h=cv.height*w/cv.width; if(h>H-bottom){ h=H-bottom; w=cv.width*h/cv.height; } if(y+h>H-bottom&&y>0){ pdf.addPage(); y=6; }
    pdf.addImage(cv.toDataURL("image/jpeg",0.86),"JPEG",(W-w)/2,y,w,h); y+=h; }
  const foot=await footBand(rep); const fh=foot?W*foot.r:0;
  const pages=pdf.getNumberOfPages(); for(let p=1;p<=pages;p++){ pdf.setPage(p); if(foot) pdf.addImage(foot.d,"PNG",0,H-fh,W,fh); pdf.setFontSize(8); pdf.setTextColor(120); pdf.text(`${p} / ${pages}`,W/2,H-fh-2,{align:"center"}); }
  rep.innerHTML="";
  if(!downloads) throw new Error(tr("الحفظ غير متاح في هذا العرض"));
  try{ await downloads.save({filename:fname.replace(/[\\/:*?"<>|]/g,"-"),data:pdf.output("blob")}); S.lastPdf=tag; }
  catch(err){ if(err&&err.code==="declined") toast("لم يُحفظ الملف"); else throw new Error(err&&err.message||"تعذر الحفظ"); }
}
const tbl=(head,rows,foot)=>`<table><tr>${head.map(h=>`<th>${h}</th>`).join("")}</tr>${rows.join("")}${foot||""}</table>`;
const pad2=v=>String(v).padStart(2,"0");
const ldate=d=>`${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const dateOf=x=>/^\d{4}-\d{2}-\d{2}$/.test(x.date||"")?x.date:ldate(new Date(x.createdAt||Date.now()));
const fmtD=d=>{ const [y,m,dd]=String(d).split("-"); return `${dd}/${m}/${y}`; };
function owedUntil(to){ const L=Object.values(S.cu).filter(x=>x.kind!=="close"&&dateOf(x)<=to); return L.filter(x=>isExp(x)&&x.pay==="credit").reduce((a,x)=>a+n(x.amount),0)-L.filter(x=>x.kind==="spay").reduce((a,x)=>a+n(x.amount),0); }
function supsUntil(to){ return cuSuppliers().map(s=>{ const inv=s.inv.filter(x=>dateOf(x)<=to), pay=s.pay.filter(x=>dateOf(x)<=to); const invSum=inv.reduce((a,x)=>a+n(x.amount),0), paySum=pay.reduce((a,x)=>a+n(x.amount),0); return {...s,inv,pay,invSum,paySum,bal:invSum-paySum}; }).filter(s=>s.inv.length||s.pay.length); }
async function makeHolderPdf(h, range){
  const mov=Object.values(S.cu).filter(x=>x.kind!=="close"); const rel=x=>delta(x,h)!==0||(isExp(x)&&holderOf(x)===h);
  const inR=x=>!range||(dateOf(x)>=range.from&&dateOf(x)<=range.to);
  const all=mov.filter(x=>rel(x)&&inR(x)).sort((a,b)=>dateOf(a).localeCompare(dateOf(b))||(a.createdAt||0)-(b.createdAt||0));
  const opening=range?mov.filter(x=>dateOf(x)<range.from).reduce((a,x)=>a+delta(x,h),0):0;
  const inn=all.reduce((a,x)=>a+Math.max(0,delta(x,h)),0), out=all.reduce((a,x)=>a+Math.max(0,-delta(x,h)),0), closing=opening+inn-out;
  const label=x=>x.kind==="dep"?tr("توريد من المدير العام"):x.kind==="xfer"?(x.dir==="back"?tr("إرجاع من ")+x.to:(h==="main"?tr("تحويل إلى ")+x.to:tr("تحويل من العهدة الرئيسية"))):x.kind==="spay"?tr("سداد للمورد: ")+x.supplier:cuName(x);
  let run=opening; const B=[];
  B.push(`<div class="rb"><h2>ملخص العهدة</h2><p style="font-size:12px;color:#5d6b73;margin:0 0 8px">الفترة: ${range?`من <span class="num">${fmtD(range.from)}</span> إلى <span class="num">${fmtD(range.to)}</span>`:`من البداية حتى <span class="num">${today()}</span>`}</p>
    <div class="kv" style="grid-template-columns:repeat(4,1fr)"><div>الرصيد الافتتاحي<b class="num">${money(opening)}</b></div><div>الوارد<b class="num">${money(inn)}</b></div><div>المنصرف<b class="num">${money(out)}</b></div><div class="hl">${closing<0&&h!=="main"?tr("المستحق له"):tr("الرصيد الختامي")}<b class="num">${money(closing<0&&h!=="main"?-closing:closing)}</b></div></div></div>`);
  B.push(`<div class="rb"><h2>الحركات</h2>${tbl(["التاريخ","البيان","على حساب","وارد","منصرف","الرصيد"],[
    ...(opening?[`<tr><td class="num">${range?fmtD(range.from):""}</td><td>${tr("رصيد افتتاحي")}</td><td>—</td><td></td><td></td><td class="num">${money(opening)}</td></tr>`]:[]),
    ...all.map(x=>{ const d=delta(x,h); run+=d; return `<tr><td class="num">${esc(dateOf(x))}</td><td>${U(label(x))}${isExp(x)&&(x.pay==="credit"||x.pay==="gm")?" ("+payLbl(x)+")":""}</td><td>${isExp(x)?U(cuTargetName(x)):"—"}</td><td class="num">${d>0?money(d):""}</td><td class="num">${d<0?money(-d):""}</td><td class="num">${money(run)}</td></tr>`; })],
    `<tr><th colspan="5">${tr("الرصيد الختامي")}</th><th class="num">${money(closing)}</th></tr>`)}</div>`);
  const ex=all.filter(x=>isCashX(x)&&holderOf(x)===h);
  if(h==="main"){ const cr=carSpend(range&&range.from,range&&range.to).filter(r=>r.count);
    if(cr.length) B.push(`<div class="rb"><h2>مصروف السيارات</h2>${tbl(["السيارة","وقود","صيانة","أخرى","الإجمالي","فواتير"],cr.map(r=>`<tr><td>${U(r.n)}</td><td class="num">${money(r.fuel)}</td><td class="num">${money(r.fix)}</td><td class="num">${money(r.other)}</td><td class="num">${money(r.total)}</td><td class="num">${r.count}</td></tr>`))}</div>`); }
  if(ex.length){ const g={}; ex.forEach(x=>{ const k=cuTargetName(x); g[k]=(g[k]||0)+n(x.amount); }); B.push(`<div class="rb"><h2>المصروف حسب الموقع والسيارة</h2>${tbl(["البند","المبلغ"],Object.entries(g).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<tr><td>${U(k)}</td><td class="num">${money(v)}</td></tr>`),`<tr><th>الإجمالي</th><th class="num">${money(ex.reduce((a,x)=>a+n(x.amount),0))}</th></tr>`)}</div>`); }
  await cuPdf(`كشف ${esc(hName(h))}${range?` من <span class="num">${fmtD(range.from)}</span> إلى <span class="num">${fmtD(range.to)}</span>`:""}`, B, `${tr("كشف")} ${h==="main"?tr("العهدة الرئيسية"):h} ${range?range.from+" - "+range.to:today()}.pdf`, "cust");
}
async function makeCustPdf(closeId, range){
  const cl=cuCloses(); const to=closeId?cl.find(x=>x.id===closeId):null; const ti=to?cl.indexOf(to):cl.length; const from=range?null:(ti>0?cl[ti-1]:null);
  const cc=cuCalc(); const sorter=(a,b)=>dateOf(a).localeCompare(dateOf(b))||(a.createdAt||0)-(b.createdAt||0);
  let all, pc, owed, periodTxt;
  if(range){ const mov=Object.values(S.cu).filter(x=>x.kind!=="close");
    all=mov.filter(x=>dateOf(x)>=range.from&&dateOf(x)<=range.to).sort(sorter);
    pc=periodCalc(all,periodCalc(mov.filter(x=>dateOf(x)<range.from),0).closing); owed=owedUntil(range.to);
    periodTxt=`من <span class="num">${fmtD(range.from)}</span> إلى <span class="num">${fmtD(range.to)}</span>`; }
  else { all=Object.values(S.cu).filter(x=>inPeriod(x,from,to)).sort(sorter); pc=periodCalc(all,from?n(from.bal):0); owed=to?n(to.owed):cc.owed;
    periodTxt=`${from?`من إقفال <span class="num">${esc(from.date)}</span>`:"من البداية"} ${to?`حتى إقفال <span class="num">${esc(to.date)}</span>`:`حتى <span class="num">${today()}</span>`}`; }
  const B=[]; const c={...pc,owed,dep:pc.dep};
  B.push(`<div class="rb"><h2>ملخص العهدة</h2><p style="font-size:12px;color:#5d6b73;margin:0 0 8px">الفترة: ${periodTxt}</p>
    <div class="kv" style="grid-template-columns:repeat(5,1fr)"><div>الرصيد الافتتاحي<b class="num">${money(pc.opening)}</b></div><div>التوريدات من المدير العام<b class="num">${money(pc.dep)}</b></div><div>المصروف النقدي<b class="num">${money(pc.cash+pc.spCash)}</b></div><div class="hl">الرصيد الختامي<b class="num">${money(pc.closing)}</b></div><div>مستحق للموردين (آجل)<b class="num">${money(c.owed)}</b></div></div>
    <p style="font-size:12px;color:#5d6b73;margin:8px 0 0">جميع المبالغ بالدرهم الإماراتي.</p></div>`);
  const deps=all.filter(x=>x.kind==="dep");
  if(deps.length) B.push(`<div class="rb"><h2>التوريدات من المدير العام</h2>${tbl(["#","التاريخ","ملاحظة","المبلغ"],deps.map((x,i)=>`<tr><td class="num">${i+1}</td><td class="num">${esc(x.date||"")}</td><td>${U(x.desc||"—")}</td><td class="num">${money(x.amount)}</td></tr>`),`<tr><th colspan="3">الإجمالي</th><th class="num">${money(pc.dep)}</th></tr>`)}</div>`);
  const ex=all.filter(x=>isExp(x)&&x.pay!=="gm"), exG=all.filter(x=>isExp(x)&&x.pay==="gm");
  if(exG.length) B.push(`<div class="rb"><h2>${tr("مدفوعة مباشرة من المدير العام (لا تُخصم من العهدة)")}</h2>${tbl(["#","التاريخ","على حساب","المورد","المبلغ"],exG.map((x,i)=>`<tr><td class="num">${i+1}</td><td class="num">${esc(x.date||"")}</td><td>${U(cuTargetName(x))}</td><td>${U(x.supplier||"—")}</td><td class="num">${money(x.amount)}</td></tr>`),`<tr><th colspan="4">الإجمالي</th><th class="num">${money(exG.reduce((a,x)=>a+n(x.amount),0))}</th></tr>`)}</div>`);
  if(ex.length){
    const by=(f)=>{ const g={}; ex.forEach(x=>{ const k=f(x); g[k]=g[k]||{c:0,cash:0,cr:0}; g[k].c++; g[k][x.pay==="credit"?"cr":"cash"]+=n(x.amount); }); return Object.entries(g).sort((a,b)=>(b[1].cash+b[1].cr)-(a[1].cash+a[1].cr)); };
    const sumRow=(rows)=>`<tr><th colspan="2">الإجمالي</th><th class="num">${money(rows.reduce((a,r)=>a+r[1].cash,0))}</th><th class="num">${money(rows.reduce((a,r)=>a+r[1].cr,0))}</th><th class="num">${money(rows.reduce((a,r)=>a+r[1].cash+r[1].cr,0))}</th></tr>`;
    const t1=by(x=>cuTargetName(x)); B.push(`<div class="rb"><h2>المصروف حسب الموقع والسيارة</h2>${tbl(["البند","الفواتير","نقداً","آجل","الإجمالي"],t1.map(([k,v])=>`<tr><td>${U(k)}</td><td class="num">${v.c}</td><td class="num">${money(v.cash)}</td><td class="num">${money(v.cr)}</td><td class="num">${money(v.cash+v.cr)}</td></tr>`),sumRow(t1))}</div>`);
    const t2=by(x=>(cuCat(x.cat)||{l:"— بدون بند —"}).l); B.push(`<div class="rb"><h2>المصروف حسب البند</h2>${tbl(["البند","الفواتير","نقداً","آجل","الإجمالي"],t2.map(([k,v])=>`<tr><td>${U(k)}</td><td class="num">${v.c}</td><td class="num">${money(v.cash)}</td><td class="num">${money(v.cr)}</td><td class="num">${money(v.cash+v.cr)}</td></tr>`),sumRow(t2))}</div>`);
    B.push(`<div class="rb"><h2>تفاصيل الفواتير</h2>${tbl(["#","التاريخ","على حساب","البند","المورد","الدفع","المبلغ"],ex.map((x,i)=>`<tr><td class="num">${i+1}</td><td class="num">${esc(x.date||"")}</td><td>${U(cuTargetName(x))}</td><td>${U((cuCat(x.cat)||{l:"—"}).l)}</td><td>${U(x.supplier||"—")}</td><td>${payLbl(x)}${holderOf(x)!=="main"?" — "+tr("من عهدة ")+U(holderOf(x)):""}</td><td class="num">${money(x.amount)}</td></tr>`))}</div>`); }
  const sups=to?[]:range?supsUntil(range.to):cuSuppliers().filter(s=>s.inv.length||s.pay.length);
  if(sups.length) B.push(`<div class="rb"><h2>حسابات الموردين (آجل)</h2>${tbl(["المورد","الفواتير الآجلة","المسدّد","المستحق"],sups.map(s=>`<tr><td>${U(s.name)}</td><td class="num">${money(s.invSum)}</td><td class="num">${money(s.paySum)}</td><td class="num">${money(s.bal)}</td></tr>`),`<tr><th colspan="3">إجمالي المستحق للموردين</th><th class="num">${money(c.owed)}</th></tr>`)}</div>`);
  { const HS=holders(); if(HS.length&&!to){ const until=range?range.to:"9999"; const bal=h=>Object.values(S.cu).filter(x=>x.kind!=="close"&&dateOf(x)<=until).reduce((a,x)=>a+delta(x,h),0);
    const xf=all.filter(x=>x.kind==="xfer");
    B.push(`<div class="rb"><h2>أرصدة العُهد</h2>${tbl(["العهدة","الرصيد"],["main",...HS].map(h=>{ const v=bal(h); return `<tr><td>${U(hName(h))}</td><td class="num">${h!=="main"&&v<0?money(-v)+" "+tr("(مستحق له)"):money(v)}</td></tr>`; }))}
      ${xf.length?`<h2 style="margin-top:12px">التحويلات بين العُهد</h2>${tbl(["التاريخ","إلى","المبلغ"],xf.map(x=>`<tr><td class="num">${esc(dateOf(x))}</td><td>${U(x.dir==="back"?tr("إرجاع من ")+x.to:x.to)}</td><td class="num">${money(x.amount)}</td></tr>`))}`:""}</div>`); } }
  if(to) B.push(`<div class="rb"><p style="margin:0;font-size:13px">🔒 أُقفلت هذه الفترة بتاريخ <span class="num">${esc(to.date)}</span>${to.by?" — "+U(to.by):""}. الرصيد المُرحَّل: <b class="num">${money(to.bal)}</b> درهم.</p></div>`);
  await cuPdf(to?`كشف العهدة — إقفال <span class="num">${esc(to.date)}</span>`:range?`كشف العهدة من <span class="num">${fmtD(range.from)}</span> إلى <span class="num">${fmtD(range.to)}</span>`:"كشف حساب العهدة", B, `${tr("كشف العهدة")} ${range?range.from+" - "+range.to:to?to.date:today()}.pdf`, "cust");
}
async function makeSupPdf(key, range){
  const s=cuSuppliers().find(x=>x.key===key); if(!s) return;
  const all=[...s.inv.map(x=>({d:dateOf(x),x,t:"inv"})),...s.pay.map(x=>({d:dateOf(x),x,t:"pay"}))].sort((a,b)=>a.d.localeCompare(b.d)||(a.x.createdAt||0)-(b.x.createdAt||0));
  const before=range?all.filter(r=>r.d<range.from):[]; const rows=range?all.filter(r=>r.d>=range.from&&r.d<=range.to):all;
  const opening=before.reduce((a,r)=>a+(r.t==="inv"?1:-1)*n(r.x.amount),0); let run=opening;
  const invP=rows.filter(r=>r.t==="inv").reduce((a,r)=>a+n(r.x.amount),0), payP=rows.filter(r=>r.t==="pay").reduce((a,r)=>a+n(r.x.amount),0), closing=opening+invP-payP;
  const B=[`<div class="rb">${range?`<p style="font-size:12px;color:#5d6b73;margin:0 0 8px">الفترة: من <span class="num">${fmtD(range.from)}</span> إلى <span class="num">${fmtD(range.to)}</span></p>`:""}<div class="kv" style="grid-template-columns:repeat(4,1fr)"><div>الرصيد الافتتاحي<b class="num">${money(opening)}</b></div><div>الفواتير الآجلة<b class="num">${money(invP)}</b></div><div>المسدّد<b class="num">${money(payP)}</b></div><div class="hl">الرصيد المستحق<b class="num">${money(closing)}</b></div></div></div>`,
   `<div class="rb"><h2>الحركات</h2>${tbl(["التاريخ","البيان","الموقع","مدين (فاتورة)","دائن (سداد)","الرصيد"],rows.map(r=>{ const a=n(r.x.amount); run+=r.t==="inv"?a:-a; return `<tr><td class="num">${esc(r.d||"")}</td><td>${r.t==="inv"?U(r.x.desc||tr("فاتورة")):tr("سداد")+" — "+tr(PAYM[r.x.method]||"")+(r.x.desc?" — "+U(r.x.desc):"")}</td><td>${r.t==="inv"?U(cuTargetName(r.x)):"—"}</td><td class="num">${r.t==="inv"?money(a):""}</td><td class="num">${r.t==="pay"?money(a):""}</td><td class="num">${money(run)}</td></tr>`; }),`<tr><th colspan="5">الرصيد المستحق</th><th class="num">${money(closing)}</th></tr>`)}</div>`];
  if(opening) B[1]=B[1].replace("</th></tr>","</th></tr>"+`<tr><td class="num">${fmtD(range.from)}</td><td>${tr("رصيد افتتاحي")}</td><td>—</td><td></td><td></td><td class="num">${money(opening)}</td></tr>`);
  await cuPdf(`كشف حساب المورد: <bdi class="u">${esc(s.name)}</bdi>`, B, `${tr("كشف المورد")} ${s.name} ${range?range.from+" - "+range.to:today()}.pdf`, "sup");
}

