// Supabase Edge Function: accounts
// حسابات الدخول لتطبيق أصيل: إنشاء المستخدمين وتغيير الرموز والصلاحيات — على الخادم فقط
// الأوامر: claim | bootstrap | create | setPin | update | delete
// عند النشر: أوقف «Verify JWT» لهذه الدالة (الدالة تتحقق من المستخدم بنفسها)
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });
const fail = (code: string, s = 400) => json({ error: code }, s);

const URL_ = Deno.env.get("SUPABASE_URL") ?? "";
const SECRET = Deno.env.get("SERVICE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const admin = createClient(URL_, SECRET, { auth: { persistSession: false, autoRefreshToken: false } });

const ROLES = ["admin", "eng", "buyer"];
const pinOk = (p: unknown) => typeof p === "string" && /^\d{4,6}$/.test(p);
const emailOf = (id: string) => `${id}@users.aseelalum.com`;
const pwOf = (id: string, pin: string) => `Aseel!${pin}#${id}`; // يُبنى بنفس الطريقة داخل التطبيق
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
async function legacyHash(id: string, pin: string) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("aseel|" + id + "|" + pin));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function profileByAuth(authId: string) {
  const { data } = await admin.from("profiles").select("*").eq("auth_id", authId).maybeSingle();
  return data;
}
async function caller(req: Request) {
  const tok = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!tok) return null;
  const { data } = await admin.auth.getUser(tok);
  const u = data?.user; if (!u) return null;
  return await profileByAuth(u.id);
}
// ينشئ حساب Auth (أو يحدّث رمزه إن وُجد) ويعيد معرّفه
async function upsertAuth(id: string, pin: string, authId?: string | null) {
  if (authId) {
    const { error } = await admin.auth.admin.updateUserById(authId, { password: pwOf(id, pin) });
    if (error) throw error; return authId;
  }
  const { data, error } = await admin.auth.admin.createUser({ email: emailOf(id), password: pwOf(id, pin), email_confirm: true, app_metadata: { app_id: id } });
  if (error) {
    // الحساب موجود من محاولة سابقة: ابحث عنه وحدّث رمزه
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const ex = list?.users?.find((x) => x.email === emailOf(id));
    if (!ex) throw error;
    await admin.auth.admin.updateUserById(ex.id, { password: pwOf(id, pin) });
    return ex.id;
  }
  return data.user.id;
}
const nameTaken = async (name: string, except?: string) => {
  const n = name.trim().toLowerCase();
  const { data: p } = await admin.from("profiles").select("id,name");
  const { data: l } = await admin.from("legacy_pins").select("id,name");
  return [...(p || []), ...(l || [])].some((x) => x.id !== except && String(x.name).trim().toLowerCase() === n);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return fail("method", 405);
  if (!SECRET) return fail("server key missing", 500);
  try {
    const b = await req.json().catch(() => ({}));
    const action = String(b.action || "");

    // أول دخول بعد التحديث: يتحقق من الرمز القديم وينشئ الحساب بنفس الرمز
    if (action === "claim") {
      const id = String(b.id || ""), pin = b.pin;
      if (!pinOk(pin)) return fail("bad pin");
      const { data: L } = await admin.from("legacy_pins").select("*").eq("id", id).maybeSingle();
      if (!L) return fail("no legacy", 404);
      if (L.fails >= 10) return fail("locked", 423);
      if ((await legacyHash(id, pin)) !== L.h) {
        await admin.from("legacy_pins").update({ fails: L.fails + 1 }).eq("id", id);
        return fail("wrong pin", 401);
      }
      const authId = await upsertAuth(id, pin);
      const { error } = await admin.from("profiles").upsert({ id, auth_id: authId, name: L.name, role: ROLES.includes(L.role) ? L.role : "admin", data: L.data || {}, updated_at: new Date().toISOString() });
      if (error) return fail(error.message, 500);
      await admin.from("legacy_pins").delete().eq("id", id);
      return json({ ok: true });
    }

    // أول مستخدم على الإطلاق (قاعدة فارغة)
    if (action === "bootstrap") {
      const name = String(b.name || "").trim(), pin = b.pin;
      if (!name || !pinOk(pin)) return fail("bad input");
      const { count: c1 } = await admin.from("profiles").select("id", { count: "exact", head: true });
      const { count: c2 } = await admin.from("legacy_pins").select("id", { count: "exact", head: true });
      if ((c1 || 0) + (c2 || 0) > 0) return fail("already set up", 409);
      const id = newId(); const authId = await upsertAuth(id, pin);
      await admin.from("profiles").insert({ id, auth_id: authId, name, role: "admin", data: {} });
      return json({ ok: true, id });
    }

    const me = await caller(req);
    if (!me) return fail("not signed in", 401);
    const isAdmin = me.role === "admin";

    if (action === "setPin") {
      const id = String(b.id || me.id), pin = b.pin, self = id === me.id;
      if (!pinOk(pin)) return fail("bad pin");
      if (!self && !isAdmin) return fail("forbidden", 403);
      const { data: P } = await admin.from("profiles").select("*").eq("id", id).maybeSingle();
      if (P) {
        await upsertAuth(id, pin, P.auth_id);
        await admin.from("profiles").update({ data: { ...(P.data || {}), mustChange: !self }, updated_at: new Date().toISOString() }).eq("id", id);
        return json({ ok: true });
      }
      // مستخدم قديم لم يدخل بعد: أنشئ حسابه مباشرة بالرمز الجديد
      const { data: L } = await admin.from("legacy_pins").select("*").eq("id", id).maybeSingle();
      if (!L) return fail("no user", 404);
      const authId = await upsertAuth(id, pin);
      await admin.from("profiles").upsert({ id, auth_id: authId, name: L.name, role: L.role, data: { ...(L.data || {}), mustChange: !self } });
      await admin.from("legacy_pins").delete().eq("id", id);
      return json({ ok: true });
    }

    if (!isAdmin) return fail("forbidden", 403);

    if (action === "create") {
      const name = String(b.name || "").trim(), role = String(b.role || ""), pin = b.pin;
      if (!name || !ROLES.includes(role) || !pinOk(pin)) return fail("bad input");
      if (await nameTaken(name)) return fail("name exists", 409);
      const id = newId(); const authId = await upsertAuth(id, pin);
      const { error } = await admin.from("profiles").insert({ id, auth_id: authId, name, role, data: { mustChange: true } });
      if (error) { await admin.auth.admin.deleteUser(authId); return fail(error.message, 500); }
      return json({ ok: true, id });
    }

    if (action === "update") {
      const id = String(b.id || "");
      const { data: P } = await admin.from("profiles").select("*").eq("id", id).maybeSingle();
      const { data: L } = P ? { data: null } : await admin.from("legacy_pins").select("*").eq("id", id).maybeSingle();
      const cur = P || L; if (!cur) return fail("no user", 404);
      const patch: Record<string, unknown> = {};
      if (b.role !== undefined) { if (!ROLES.includes(b.role)) return fail("bad role"); if (id === me.id) return fail("own role", 400); patch.role = b.role; }
      if (b.name !== undefined) { const nm = String(b.name).trim(); if (!nm) return fail("bad name"); if (await nameTaken(nm, id)) return fail("name exists", 409); patch.name = nm; }
      const flags: Record<string, unknown> = { ...(cur.data || {}) };
      for (const k of ["canBackup", "notifyLow", "notifySalary"]) if (b[k] !== undefined) flags[k] = !!b[k];
      patch.data = flags;
      const { error } = await admin.from(P ? "profiles" : "legacy_pins").update(patch).eq("id", id);
      if (error) return fail(error.message, 500);
      return json({ ok: true });
    }

    if (action === "delete") {
      const id = String(b.id || "");
      if (id === me.id) return fail("self", 400);
      const { data: P } = await admin.from("profiles").select("*").eq("id", id).maybeSingle();
      if (P) { if (P.auth_id) await admin.auth.admin.deleteUser(P.auth_id); await admin.from("profiles").delete().eq("id", id); }
      else await admin.from("legacy_pins").delete().eq("id", id);
      return json({ ok: true });
    }

    return fail("unknown action");
  } catch (e) {
    return fail(String((e as Error)?.message || e), 500);
  }
});
