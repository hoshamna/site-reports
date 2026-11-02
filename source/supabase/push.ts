// Supabase Edge Function: push
// إشعارات الجوال (Web Push) لتطبيق أصيل — بدون مكتبات خارجية
// الأوامر: key | subscribe | unsubscribe | notify | test

/* ===== core (Web Push: VAPID + aes128gcm) ===== */
const enc = new TextEncoder();
const b64u = (buf) => { const b = new Uint8Array(buf); let s = ""; for (const x of b) s += String.fromCharCode(x); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const unb64u = (s) => { s = String(s).replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
const cat = (...arrs) => { const n = arrs.reduce((a, x) => a + x.length, 0); const o = new Uint8Array(n); let p = 0; for (const a of arrs) { o.set(a, p); p += a.length; } return o; };

async function newVapid() {
  const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const jwk = await crypto.subtle.exportKey("jwk", kp.privateKey);
  const pub = new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey));
  return { jwk, pub: b64u(pub) };
}
async function vapidHeader(endpoint, vapid, subject) {
  const aud = new URL(endpoint).origin;
  const head = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = b64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject })));
  const key = await crypto.subtle.importKey("jwk", vapid.jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(head + "." + body));
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${vapid.pub}`;
}
async function hkdf(salt, ikm, info, len) {
  const k = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, k, len * 8));
}
async function encryptPayload(sub, plaintext) {
  const uaPub = unb64u(sub.keys.p256dh), auth = unb64u(sub.keys.auth);
  const as = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", as.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, as.privateKey, 256));
  const ikm = await hkdf(auth, ecdh, cat(enc.encode("WebPush: info\0"), uaPub, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, cat(enc.encode(plaintext), new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]); // 4096
  return cat(salt, rs, new Uint8Array([asPub.length]), asPub, ct);
}
async function sendPush(sub, payload, vapid, subject) {
  const body = await encryptPayload(sub, JSON.stringify(payload));
  return fetch(sub.endpoint, { method: "POST", headers: {
    "Authorization": await vapidHeader(sub.endpoint, vapid, subject),
    "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", "TTL": "86400", "Urgency": "high",
  }, body });
}
/* ===== end core ===== */

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });
const SUBJECT = "mailto:info@aseelalum.com";

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
  const URL_ = Deno.env.get("SUPABASE_URL") ?? "";
  const KEY = Deno.env.get("SERVICE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const rest = (path, init = {}) => fetch(`${URL_}/rest/v1/${path}`, { ...init, headers: { apikey: KEY, ...(KEY.startsWith("sb_") ? {} : { Authorization: `Bearer ${KEY}` }), "content-type": "application/json", ...(init.headers || {}) } });
  const getVapid = async () => {
    const r = await rest("push_keys?id=eq.vapid&select=data"); const rows = r.ok ? await r.json() : [];
    if (rows[0]?.data?.jwk) return rows[0].data;
    const v = await newVapid();
    const w = await rest("push_keys", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ id: "vapid", data: v }) });
    if (!w.ok) throw new Error("push_keys: " + (await w.text()));
    return v;
  };
  try {
    const { action, sub, userId, name, userIds, title, body, tag, url, endpoint } = await req.json();
    if (action === "key") { const v = await getVapid(); return json({ key: v.pub }); }
    if (!(await signedIn(req))) return json({ error: "sign in" }, 401);
    const idOf = async (ep) => b64u(await crypto.subtle.digest("SHA-256", enc.encode(ep))).slice(0, 40);
    if (action === "subscribe") {
      if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return json({ error: "bad subscription" }, 400);
      const id = await idOf(sub.endpoint);
      const w = await rest("push_subs", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ id, data: { sub, userId: userId || "", name: name || "", at: new Date().toISOString() } }) });
      if (!w.ok) return json({ error: await w.text() }, 500);
      return json({ ok: true, id });
    }
    if (action === "unsubscribe") { if (endpoint) await rest(`push_subs?id=eq.${await idOf(endpoint)}`, { method: "DELETE" }); return json({ ok: true }); }
    if (action === "notify" || action === "test") {
      const v = await getVapid();
      const r = await rest("push_subs?select=id,data"); const rows = r.ok ? await r.json() : [];
      let targets = rows;
      if (action === "test") { const id = await idOf(endpoint || ""); targets = rows.filter((x) => x.id === id); }
      else if (Array.isArray(userIds)) targets = rows.filter((x) => userIds.includes(x.data?.userId));
      const payload = { title: String(title || "أصيل").slice(0, 120), body: String(body || "").slice(0, 400), tag: tag || "aseel", url: url || "./" };
      let sent = 0, gone = 0, failed = 0;
      await Promise.all(targets.map(async (t) => {
        try { const res = await sendPush(t.data.sub, payload, v, SUBJECT);
          if (res.status === 404 || res.status === 410) { gone++; await rest(`push_subs?id=eq.${t.id}`, { method: "DELETE" }); }
          else if (res.ok) sent++; else failed++;
        } catch (_) { failed++; }
      }));
      return json({ ok: true, sent, gone, failed, targets: targets.length });
    }
    return json({ error: "unknown action" }, 400);
  } catch (e) { return json({ error: String(e?.message || e) }, 500); }
});
