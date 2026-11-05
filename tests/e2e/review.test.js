// The general manager's review mark: a confirmation only; it never changes the custody balance.
const test = require("node:test");
const assert = require("node:assert");
const { openApp } = require("../support/app");

test("review mark on new invoices", async (t) => {
  const app = await openApp({ init: () => { setTimeout(() => { const D = window.__mockDB(); const c = (id, d) => { D.custody[id] = { id, created_by: null, data: { id, kind: "exp", by: "أحمد", target: "gen", pay: "cash", cat: "misc", supplier: "Shop", ...d } }; };
    c("old", { amount: 30, date: "2026-11-01", createdAt: Date.parse("2026-11-01T10:00:00+04:00") });
    c("n1", { amount: 70, date: "2026-11-06", createdAt: Date.now() - 1000 });
    c("n2", { amount: 40, date: "2026-11-06", createdAt: Date.now() - 500 }); }, 0); } });
  t.after(() => app.close());
  const { page } = app;
  await app.login("هشام", "1234");
  assert.match(await app.text(), /فواتير جديدة لم تراجعها: 2/, "home notice counts only the new ones");
  const bal = await app.eval(() => __T.holderBal("main"));
  await page.click('[data-act="curevopen"]'); await page.waitForTimeout(300);
  assert.equal(await page.locator('[data-act="curev"]').count(), 2);
  await page.click('[data-act="curev"][data-id="n1"]'); await page.waitForTimeout(300);
  assert.ok((await app.db()).custody.n1.data.rev, "saved");
  await page.click('[data-act="curevall"]'); await page.waitForTimeout(300);
  assert.equal(await app.eval(() => Object.values(__T.S.cu).filter((x) => x.kind === "exp" && !x.rev && x.createdAt >= Date.parse("2026-11-06T00:00:00+04:00")).length), 0);
  assert.match(await app.text(), /راجعت كل الفواتير/);
  assert.equal(await app.eval(() => __T.holderBal("main")), bal, "the balance does not change");
  assert.deepEqual(app.errors, []);
});

test("a buyer never sees the review mark", async (t) => {
  const app = await openApp();
  t.after(() => app.close());
  await app.login("أحمد", "5678"); await app.setPin("2468");
  assert.equal(await app.page.locator('[data-act="curev"],[data-act="curevopen"]').count(), 0);
});
