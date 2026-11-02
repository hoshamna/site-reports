// Daily automatic backups: listed for full-access users, restorable from the app.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { openApp } = require("../support/app");

test("automatic backups can be listed and restored", async (t) => {
  const app = await openApp({ init: () => { setTimeout(() => { const D = window.__mockDB(); D.backups = {
    1: { id: 1, at: "2026-11-03T00:00:00Z", kind: "auto", size: 500, data: { app: "aseel", version: 1, at: "2026-11-03T00:00:00Z", sites: { s1: { id: "s1", name: "فيلا الرحمانية", total: 99999 } }, marks: {}, custody: {}, settings: {} } },
    2: { id: 2, at: "2026-11-02T00:00:00Z", kind: "auto", size: 480, data: { app: "aseel", sites: {} } } }; }, 0); } });
  t.after(() => app.close());
  await app.login("هشام", "1234");
  await app.eval(() => { __T.S.bkOpen = true; __T.render(); });
  await app.page.waitForSelector('[data-act="bkautodl"]');
  assert.equal(await app.page.locator('[data-act="bkautodl"]').count(), 2);
  await app.page.click('[data-act="bkautorestore"][data-id="1"]');
  await app.page.click('[data-act="bkrestore"]'); await app.page.click('[data-act="bkrestore"]');
  await app.page.waitForTimeout(1200);
  assert.equal((await app.db()).site_fin.s1.data.total, 99999);
  assert.deepEqual(app.errors, []);
});
