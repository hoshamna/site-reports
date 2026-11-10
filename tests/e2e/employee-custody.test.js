// Employee custody (10 Nov 2026): ticked employees hold their own custody; transfers move money from the
// main custody to them, their invoices come off their own custody, and everything shows in the general statement.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { openApp } = require("../support/app");

const seed = () => {
  Object.defineProperty(window, "__push", { configurable: true, get() { return this.__p; }, set(v) {
    v.notify = async (...a) => { (window.__notified = window.__notified || []).push(a); return { ok: true }; }; v.state = async () => "on"; this.__p = v; } });
  setTimeout(() => { const D = window.__mockDB(); if (!D.__seeded) { D.custody = {}; D.__seeded = 1; } const c = (id, d) => { D.custody[id] = { id, created_by: null, data: { id, createdAt: Date.now() - 1e6, ...d } }; };
    c("dep", { kind: "dep", by: "هشام", amount: 10000, date: "2026-11-01" });
    // from the old periods: must not move money now
    c("oldx", { kind: "xfer", dir: "out", to: "أحمد", by: "هشام", amount: 100, date: "2026-11-02" });
    c("oldi", { kind: "exp", by: "أحمد", holder: "أحمد", target: "gen", cat: "acc", pay: "cash", supplier: "Old shop", amount: 40, date: "2026-11-03" });
    // the new system
    c("x1", { kind: "xfer", hv: 2, dir: "out", to: "أحمد", by: "هشام", amount: 1000, date: "2026-11-04" });
    c("i1", { kind: "exp", hv: 2, by: "أحمد", holder: "أحمد", target: "s1", cat: "alu", pay: "cash", supplier: "MIH", amount: 450, date: "2026-11-05", ok: true });
    c("i2", { kind: "exp", hv: 2, by: "هشام", holder: "main", target: "car:Mirage", cat: "fuel", pay: "cash", supplier: "ADNOC", amount: 150, date: "2026-11-05", ok: true });
    D.settings.company.data.cuHolders = ["أحمد"];
  }, 0); };

test("balances: transfer out of the main custody, the employee's invoices off his own; older movements unchanged", async (t) => {
  const app = await openApp({ init: seed }); t.after(() => app.close());
  await app.page.clock.setFixedTime(new Date("2026-11-06T10:00:00+04:00"));
  await app.login("هشام", "1234");
  const b = await app.eval(() => ({ main: __T.holderBal("main"), emp: __T.holderBal("أحمد"), all: __T.holderBal("all") }));
  // main: 10000 − 40 (old invoice stays on main) − 1000 transfer − 150 = 8810; employee: 1000 − 450 = 550; all money: 9360
  assert.deepEqual(b, { main: 8810, emp: 550, all: 9360 });
  await app.page.click('[data-act="cuopen"]'); await app.page.waitForTimeout(300);
  const txt = await app.text();
  assert.match(txt, /عهد الموظفين/); assert.match(txt, /معه بدون فواتير/);
  // the main custody summary: what is with each employee, their total, and all the money
  const rows = await app.page.$$eval(".empsum tr", (trs) => trs.map((r) => [...r.children].map((c) => c.textContent.replace(/\s+/g, " ").trim())));
  assert.deepEqual(rows, [["عهدة أحمد", "550"], ["مجموع ما مع الموظفين", "550"], ["إجمالي العهدة (معك + مع الموظفين)", "9,360"]]);
  assert.equal(await app.page.locator('[data-act="cuxferpic"][data-h="أحمد"]').count(), 1, "custody transfer button on the employee's card");
  assert.equal(await app.page.locator('[data-act="cuhpdf"][data-h="أحمد"]').count(), 1, "statement button on the employee's card");
  // the general list shows the employee's invoice and the transfer
  assert.match(txt, /MIH/); assert.match(txt, /تحويل/);
  assert.deepEqual(app.errors, []);
});

test("choosing employees; a chosen employee sees his own custody balance", async (t) => {
  const app = await openApp({ init: seed }); t.after(() => app.close()); const { page } = app;
  await app.login("أحمد", "5678"); await app.setPin("2468"); await app.logout(); // أحمد now has an account
  await app.login("هشام", "1234");
  await page.click('[data-act="cuopen"]'); await page.waitForTimeout(300);
  await page.click('[data-act="cuholdsetopen"]');
  await page.click('[data-act="cuholdset"][data-n="أحمد"]'); await page.waitForTimeout(800);
  assert.deepEqual(await app.eval(() => window.__mockDB().settings.company.data.cuHolders), []);
  await page.click('[data-act="cuholdset"][data-n="أحمد"]'); await page.waitForTimeout(800);
  assert.deepEqual(await app.eval(() => window.__mockDB().settings.company.data.cuHolders), ["أحمد"]);
  await app.logout();
  await app.login("أحمد", "2468");
  assert.match(await app.text(), /رصيد عهدتك/);
  assert.match(await app.text(), /550/);
});

test("money left with an employee for 3 days without invoices: reminder to him, alert to the full-access user, once a day", async (t) => {
  const app = await openApp({ init: seed }); t.after(() => app.close()); const { page } = app;
  await page.clock.setFixedTime(new Date("2026-11-09T10:00:00+04:00")); // last invoice 5 Nov → 4 days
  await app.login("هشام", "1234"); await app.logout();          // هشام gets an account that receives alerts
  await app.login("أحمد", "5678"); await app.setPin("2468"); await app.logout();
  await app.eval(() => { window.__notified = []; });
  await app.login("هشام", "1234"); await page.waitForTimeout(6500);
  const sent = await app.eval(() => window.__notified.filter((a) => /^idle/.test(a[3])).map((a) => [a[1], a[2]]));
  assert.equal(sent.length, 2, JSON.stringify(sent));
  assert.match(sent[0][1], /مع أحمد 550 درهم بدون فواتير منذ 4 أيام/);
  assert.match(sent[1][1], /معك 550 درهم/);
  await page.reload(); await page.waitForTimeout(6500);
  assert.deepEqual(await app.eval(() => (window.__notified || []).filter((a) => /^idle/.test(a[3])).map((a) => a[2])), [], "not again the same day");
});
