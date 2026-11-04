// why the AI reading failed, in words the user can act on (shown after the failure message)
function aiWhy(e){ const m=String(e&&(e.message||e.text)||e&&e.code||e||"").toLowerCase();
  let why;
  if(/sign in|not signed|jwt|401/.test(m)) why=tr("الخادم لم يتعرّف على دخولك — اخرج وادخل مرة أخرى");
  else if(/credit|balance|billing|quota/.test(m)) why=tr("رصيد مفتاح Claude في Supabase انتهى");
  else if(/x-api-key|api key|authentication|permission/.test(m)) why=tr("مفتاح Claude في Supabase غير صالح");
  else if(/overloaded|rate|429|529/.test(m)) why=tr("الخدمة مزدحمة الآن، جرّب بعد دقيقة");
  else if(/network|failed to fetch|load failed/.test(m)) why=tr("لا يوجد اتصال بالإنترنت");
  else if(/invalid_json/.test(m)) why=tr("الصورة غير واضحة");
  else why=String(e&&(e.message||e.code)||"").slice(0,90);
  return why?" — "+why:""; }
/* ---- AI reading ---- */
async function cuRead(id, file){
  const x0=S.cu[id]; if(!x0) return;
  if(!canRead||!sample){ return; }
  x0.reading=true; render();
  let d=null;
  try{ const img=await compress(file,1400);
    d=await sample.json(`هذه صورة فاتورة مشتريات (ألمنيوم/زجاج/سيليكون/مواد/وقود). استخرج منها: اسم المورد (البائع الذي أصدر الفاتورة، وليس المشتري)، والمبلغ الإجمالي النهائي شامل الضريبة كرقم فقط، وتاريخ الفاتورة بصيغة YYYY-MM-DD، ووصفاً مختصراً للمشتريات ${lang==="en"?"باللغة الإنجليزية":"بالعربية الفصحى"} في بضع كلمات. أجب بـ JSON فقط بهذا الشكل: {"supplier":"","amount":0,"date":"","desc":"","invoiceNo":"","plate":"","payment":""}. invoiceNo هو رقم الفاتورة أو الإيصال. plate هو رقم لوحة السيارة إن كان مكتوباً في الفاتورة (شائع في فواتير الوقود والصيانة). payment هو "cash" إذا كُتب أن الدفع نقدي، أو "credit" إذا كُتب آجل/Credit، وإلا اتركه فارغاً. اترك الحقل فارغاً إذا لم يكن واضحاً.`,{images:[img],cache:false});
  }catch(e){ console.warn("cu read",e); toast(tr("تعذرت قراءة الفاتورة، أكمل البيانات يدوياً")+aiWhy(e)); }
  const x=S.cu[id]; if(!x) return; delete x.reading;
  if(d&&typeof d==="object"){
    if(d.supplier&&!x.supplier) x.supplier=String(d.supplier).slice(0,120);
    if(n(d.amount)>0&&!n(x.amount)) x.amount=n(d.amount);
    if(/^\d{4}-\d{2}-\d{2}$/.test(d.date||"")) x.date=d.date;
    if(d.desc&&!x.desc) x.desc=String(d.desc).slice(0,160);
    if(!x.cat) x.cat=cuGuessCat(`${x.supplier} ${x.desc} ${d.desc||""}`);
    if(String(x.target||"").startsWith("car:")&&(cuCat(x.cat)||{}).t!=="car") x.cat="fuel";
    if(d.invoiceNo&&!x.invNo) x.invNo=String(d.invoiceNo).slice(0,40);
    if(d.payment==="credit") x.pay="credit";
    if(isCreditSup(x.supplier)){ x.pay="credit"; x.supplier=supCanon(x.supplier); }
    const car=carFromText(d.plate,d.desc,x.desc,x.invNo&&"");
    if(car&&!x.target){ x.target="car:"+car; x.autoCar=car; if((cuCat(x.cat)||{}).t!=="car") x.cat="fuel"; if(S.cuPick===id) S.cuPick=null; setTimeout(()=>toast("🚗 تم التعرّف على السيارة "+car+" من رقم اللوحة"),50); }
    else if(d.plate&&!x.target){ x.plate=String(d.plate).slice(0,20); }
  }
  cuPut(x,true); render();
  if(cuDupOf(x)) setTimeout(()=>{ toast("⚠️ تنبيه: يبدو أن هذه الفاتورة مسجّلة من قبل"); buzzOk(); },400);
}
async function cuReadDep(id, file){
  const x0=S.cu[id]; if(!x0||!canRead||!sample) return; x0.reading=true; render(); let d=null;
  try{ const img=await compress(file,1400);
    d=await sample.json(`هذه صورة إثبات دفعة: شيك بنكي أو إشعار تحويل أو سند قبض. استخرج المبلغ والتاريخ. أجب بـ JSON فقط: {"type":"","amount":0,"date":"","chequeNo":"","ref":"","bank":"","payer":""}`,{images:[img],cache:false});
  }catch(e){ toast(tr("تعذرت القراءة، أدخل المبلغ يدوياً")+aiWhy(e)); }
  const x=S.cu[id]; if(!x) return; delete x.reading;
  if(d&&typeof d==="object"){ if(n(d.amount)>0) x.amount=n(d.amount); if(/^\d{4}-\d{2}-\d{2}$/.test(d.date||"")) x.date=d.date;
    const ref=[d.chequeNo&&(tr("شيك ")+d.chequeNo),d.ref,d.bank].filter(Boolean).join(" — "); if(ref&&!x.desc) x.desc=String(ref).slice(0,120);
    toast(n(x.amount)>0?"✓ تمت قراءة الإشعار":"لم أجد المبلغ، أدخله يدوياً"); }
  cuPut(x,true); render();
}
async function cuUpload(file){
  let f=file; if(f.type==="application/pdf"||/\.pdf$/i.test(f.name||"")){ const pages=await pdfPages(f,1); f=pages[0]; }
  const r=await upload(f); return r?{r,f}:null;
}

