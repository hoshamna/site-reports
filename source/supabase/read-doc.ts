// Supabase Edge Function: read-doc
// يقرأ صور الفواتير والشيكات وخرائط الطوابق باستخدام Claude
// المفتاح السري يُحفظ في Secrets باسم ANTHROPIC_API_KEY ولا يظهر في التطبيق

const PROMPTS: Record<string, (lang: string) => string> = {
  invoice: (lang) =>
    `هذه صورة فاتورة مشتريات (ألمنيوم/زجاج/سيليكون/مواد/وقود/طباعة). استخرج منها: اسم المورد (البائع الذي أصدر الفاتورة، وليس المشتري)، والمبلغ الإجمالي النهائي شامل الضريبة كرقم فقط، وتاريخ الفاتورة بصيغة YYYY-MM-DD، ووصفاً مختصراً للمشتريات ${lang === "en" ? "باللغة الإنجليزية" : "بالعربية الفصحى"} في بضع كلمات. أجب بـ JSON فقط بهذا الشكل: {"supplier":"","amount":0,"date":"","desc":"","invoiceNo":"","plate":"","payment":""}. invoiceNo هو رقم الفاتورة أو الإيصال. plate هو رقم لوحة السيارة إن كان مكتوباً في الفاتورة (شائع في فواتير الوقود والصيانة، مثل Vehicle No أو Plate). payment هو "cash" إذا كُتب أن الدفع نقدي، أو "credit" إذا كُتب آجل أو Credit، وإلا اتركه فارغاً. اترك أي حقل فارغاً إذا لم يكن واضحاً.`,
  payment: () =>
    `هذه صورة إثبات دفعة مستلمة لشركة في الإمارات: إما شيك بنكي، أو إشعار تحويل بنكي/لقطة شاشة من تطبيق بنكي، أو سند قبض. حدّد نوعها، واستخرج: المبلغ كرقم فقط، والتاريخ بصيغة YYYY-MM-DD، ورقم الشيك (إن كان شيكاً)، ورقم المرجع (إن كان تحويلاً أو سنداً)، واسم البنك، واسم الدافع أو صاحب الحساب. أجب بـ JSON فقط بهذا الشكل: {"type":"cheque|transfer|cash","amount":0,"date":"","chequeNo":"","ref":"","bank":"","payer":""}. اترك الحقل فارغاً إذا لم يكن واضحاً.`,
  outline: () =>
    `هذه صورة مخطط معماري لطابق مبنى (Floor plan). أريد حدود المبنى الخارجية فقط (خط الجدار الخارجي/الواجهة الزجاجية الخارجية للمبنى نفسه).
تجاهل: جدول بيانات الرسم (Title block)، الملاحظات، خطوط الأبعاد، محاور الشبكة (A,B,1,2…)، المظلات والكانوبي، الأرصفة، والأسهم.
أعد الشكل كمضلع بأركانه الحقيقية فقط (3 إلى 10 نقاط) بالترتيب حول المبنى مع عقارب الساعة، والإحداثيات نسبة مئوية من عرض وارتفاع الصورة (0 إلى 100).
وأعد أيضاً مستطيل قص يحتوي المبنى مع هامش صغير ويستبعد جدول البيانات.
أجب بـ JSON فقط: {"points":[[x,y],...],"crop":{"x":0,"y":0,"w":100,"h":100}}`,
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  try {
    const { kind, image, mediaType, lang } = await req.json();
    const make = PROMPTS[kind];
    if (!make || typeof image !== "string" || image.length > 8_000_000) return json({ error: "bad request" }, 400);
    const mt = /^image\/(jpeg|png|webp|gif)$/.test(mediaType) ? mediaType : "image/jpeg";
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-5-5",
        max_tokens: 800,
        messages: [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: mt, data: image } },
          { type: "text", text: make(lang === "en" ? "en" : "ar") },
        ] }],
      }),
    });
    const j = await r.json();
    if (!r.ok) return json({ error: j?.error?.message ?? `HTTP ${r.status}`, status: r.status }, 502);
    const text = (j.content ?? []).filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("");
    return json({ text });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
