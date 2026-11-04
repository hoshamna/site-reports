// Runs the Supabase Edge Functions under a small stand-in for the Deno runtime, so a function that
// would fail to start on Supabase (like the duplicate variable of 4 Nov 2026) fails here first.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("child_process");
const fs = require("fs"); const os = require("os"); const path = require("path");

const SB = path.resolve(__dirname, "../../source/supabase");
function run(fnFile, script) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fn-"));
  fs.copyFileSync(path.join(SB, fnFile), path.join(dir, fnFile));
  fs.writeFileSync(path.join(dir, "run.mjs"), `
let handler; const sent = [];
globalThis.Deno = { serve: (h) => { handler = h; }, env: { get: (k) => ({ SUPABASE_URL: "https://x.supabase.co", ANTHROPIC_API_KEY: "k", SUPABASE_ANON_KEY: "a" })[k] } };
globalThis.fetch = async (url, init) => { sent.push({ url: String(url), body: init && init.body });
  if (String(url).includes("/auth/v1/user")) return new Response("{}", { status: /Bearer good/.test(init.headers.Authorization || "") ? 200 : 401 });
  if (String(url).includes("anthropic")) return new Response(JSON.stringify({ content: [{ type: "text", text: "{\\"ok\\":1}" }] }), { status: 200 });
  return new Response("[]", { status: 200 }); };
await import("./${fnFile}");
const call = async (method, headers, body) => { const r = await handler(new Request("https://f/x", { method, headers, body: body && JSON.stringify(body) }));
  return { status: r.status, cors: r.headers.get("access-control-allow-origin"), body: await r.text() }; };
${script}
`);
  const out = execFileSync(process.execPath, ["--experimental-strip-types", "--no-warnings", path.join(dir, "run.mjs")], { encoding: "utf8" });
  return JSON.parse(out.trim().split("\n").pop());
}

test("read-doc starts, answers the browser's preflight, reads invoices and summarises notes", () => {
  const r = run("read-doc.ts", `
    const pre = await call("OPTIONS", {});
    const inv = await call("POST", { authorization: "Bearer good", apikey: "pk" }, { kind: "invoice", image: "aGVsbG8=", mediaType: "image/jpeg", lang: "ar" });
    const notes = await call("POST", { authorization: "Bearer good", apikey: "pk" }, { kind: "notes", text: "ركبنا الفريم", lang: "ar" });
    const anon = await call("POST", { apikey: "pk" }, { kind: "invoice", image: "aGVsbG8=" });
    console.log(JSON.stringify({ pre, inv, notes, anon }));`);
  assert.equal(r.pre.cors, "*");
  assert.equal(r.inv.status, 200); assert.equal(JSON.parse(r.inv.body).text, '{"ok":1}'); assert.equal(r.inv.cors, "*");
  assert.equal(r.notes.status, 200);
  assert.equal(r.anon.status, 401, "signed-out requests refused"); assert.equal(r.anon.cors, "*", "even refusals carry CORS so the app can show the reason");
});

test("push starts and refuses a salary reminder without the right key", () => {
  const r = run("push.ts", `
    const pre = await call("OPTIONS", {});
    const bad = await call("POST", {}, { action: "salary-reminder", key: "wrong" });
    console.log(JSON.stringify({ pre, bad }));`);
  assert.equal(r.pre.cors, "*");
  assert.equal(r.bad.status, 403);
});

test("accounts function compiles", () => {
  // accounts.ts imports supabase-js from jsr:, which only Deno can load; checking that its syntax is valid is still worth it
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fn-"));
  const src = fs.readFileSync(path.join(SB, "accounts.ts"), "utf8").replace(/^import .*jsr:.*$/m, "const createClient = () => ({ auth: { admin: {} }, from: () => ({}) });");
  fs.writeFileSync(path.join(dir, "a.ts"), src);
  fs.writeFileSync(path.join(dir, "run.mjs"), `globalThis.Deno = { serve: () => {}, env: { get: () => "x" } }; await import("./a.ts"); console.log("{}");`);
  execFileSync(process.execPath, ["--experimental-strip-types", "--no-warnings", path.join(dir, "run.mjs")], { encoding: "utf8" });
});
