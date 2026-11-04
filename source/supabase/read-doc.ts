// Supabase Edge Function: read-doc
// يقرأ صور الفواتير والشيكات وخرائط الطوابق باستخدام Claude
// المفتاح السري يُحفظ في Secrets باسم ANTHROPIC_API_KEY ولا يظهر في التطبيق

// summary of a spoken site note (text only, no image)
const NOTES_PROMPT = (lang: string, text: string) =>
  `هذا تفريغ صوتي لملاحظة قالها مهندس أو مدير في موقع أعمال ألمنيوم وزجاج (فريم، زجاج، سيليكون، شبابيك، أبواب، واجهات). قد يحتوي أخطاء تفريغ أو لهجة عامية.
لخّصه ${lang === "en" ? "بالإنجليزية" : "بالعربية الفصحى"} في نقاط قصيرة واضحة، دون إضافة أي معلومة لم تُذكر. استخدم كلمة «الفريم» لا «الإطار».
أجب بـ JSON فقط بهذا الشكل: {"summary":"جملة واحدة","done":[],"issues":[],"needs":[],"requests":[]}
done = الأعمال المنجزة. issues = المشاكل الفنية في الموقع (كل مشكلة جملة مستقلة). needs = المطلوبات والنواقص (مواد، زجاج ناقص، عمالة…). requests = طلبات الاستشاري أو العميل أو المالك. اترك القائمة فارغة إذا لم يُذكر شيء.
النص:
"""${text}"""`;

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

// يقبل الطلب فقط من مستخدم مسجّل الدخول في التطبيق
async function signedIn(req) {
  const auth = req.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/i.test(auth)) return false;
  const key = req.headers.get("apikey") || Deno.env.get("SUPABASE_ANON_KEY") || "";
  try { const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/user`, { headers: { apikey: key, Authorization: auth } }); return r.ok; } catch (_) { return false; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  if (!(await signedIn(req))) return json({ error: "sign in" }, 401);
  try {
    const { kind, image, mediaType, lang, text } = await req.json();
    const isNotes = kind === "notes";
    const make = PROMPTS[kind];
    if (isNotes ? (typeof text !== "string" || !text.trim() || text.length > 20_000) : (!make || typeof image !== "string" || image.length > 8_000_000)) return json({ error: "bad request" }, 400);
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
        max_tokens: isNotes ? 1200 : 800,
        messages: [{ role: "user", content: isNotes
          ? [{ type: "text", text: NOTES_PROMPT(lang === "en" ? "en" : "ar", text) }]
          : [
          { type: "image", source: { type: "base64", media_type: mt, data: image } },
          { type: "text", text: make(lang === "en" ? "en" : "ar") },
        ] }],
      }),
    });
    const j = await r.json();
    if (!r.ok) return json({ error: j?.error?.message ?? `HTTP ${r.status}`, status: r.status }, 502);
    const answer = (j.content ?? []).filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("");
    return json({ text: answer });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
