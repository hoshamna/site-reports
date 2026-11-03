// What each role can see and change. The database rules themselves are tested in tests/sql.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { openApp } = require("../support/app");

test("roles: buyer, admin reconciliation, engineer", async (t) => {
  const app = await openApp();
  t.after(() => app.close());

  await t.test("buyer sees no finance and only his own custody entries", async () => {
    await app.login("أحمد", "5678");
    await app.setPin("2468");
    assert.match(await app.text(), /فواتير المشتريات/);
    assert.equal(await app.eval(() => __T.S.sites.s1.total), undefined);
    assert.deepEqual(await app.eval(() => Object.keys(__T.S.cu)), [], "the general manager's deposit is hidden");
  });

  await t.test("buyer's invoice is saved without touching the site's finance", async () => {
    await app.clearLog();
    await app.eval(() => __T.cuPut({ id: "inv1", kind: "exp", by: __T.cuMe, holder: "main", target: "s1", cat: "", pay: "cash", supplier: "مورد زجاج", amount: 420, date: "2026-11-02", desc: "زجاج", fileId: "img2", fileType: "image", createdAt: Date.now() }, true));
    await app.page.waitForTimeout(700);
    const log = await app.log();
    assert.ok(log.includes("upsert custody inv1"));
    assert.ok(!log.some((l) => /DENIED|site_fin|sites/.test(l)), log.join(" | "));
    await app.logout();
  });

  await t.test("full-access user's app copies the invoice into the site's purchases", async () => {
    await app.login("هشام", "1234");
    await app.page.waitForTimeout(1200);
    const db = await app.db();
    assert.deepEqual(db.site_fin.s1.data.purchases.map((p) => [p.supplier, p.amount, p.cuId]), [["مورد زجاج", 420, "inv1"]]);
    assert.equal(db.custody.inv1.data.purSite, "s1");
    assert.equal(db.site_fin.s1.data.total, 85000, "rest of the finance untouched");
    assert.equal(Object.keys(db.sites.s1.data).filter((k) => ["total", "payments", "purchases"].includes(k)).length, 0, "finance never stored with the public site data");
  });

  await t.test("engineer sees no finance and his saves never write finance", async () => {
    await app.eval(() => { __T.S.usersOpen = true; __T.render(); });
    await app.page.fill("#au-add-name", "محمد"); await app.page.selectOption("#au-add-role", "eng"); await app.page.fill("#au-add-pin", "1111");
    await app.page.click('[data-act="auadd"]'); await app.page.waitForTimeout(400);
    await app.logout();
    await app.login("محمد", "1111"); await app.setPin("2222");
    assert.equal(await app.eval(() => __T.S.sites.s1.total), undefined);
    await app.clearLog();
    await app.eval(() => { const s = __T.S.sites.s1; s.notes = "ملاحظة المهندس"; __T.save(s); });
    await app.page.waitForTimeout(900);
    assert.deepEqual(await app.log(), ["upsert sites s1"]);
    assert.equal((await app.db()).site_fin.s1.data.total, 85000);
  });
  assert.deepEqual(app.errors, []);
});

test("an expense without an invoice (e.g. salaries) is deducted from custody", async (t) => {
  const app = await openApp();
  t.after(() => app.close());
  const { page } = app;
  await app.login("هشام", "1234");
  await app.eval(() => { __T.S.view = "cust"; __T.render(); });
  const before = await app.eval(() => __T.holderBal("main"));
  await page.click('[data-act="cumanual"]');
  await page.waitForTimeout(300);
  const id = await app.eval(() => __T.S.cuEdit);
  await page.fill(`#cu-${id}-amount`, "3000");
  await page.selectOption(`[data-cu="${id}.cat"]`, "salary");
  await page.click(`[data-act="cuok2"][data-id="${id}"]`);   // edits are kept until ✓ موافق
  await page.waitForTimeout(1200);
  const x = await app.eval((i) => __T.S.cu[i], id);
  assert.equal(x.amount, 3000); assert.equal(x.cat, "salary"); assert.equal(x.target, "gen");
  assert.equal(await app.eval(() => __T.holderBal("main")), before - 3000, "balance goes down by the amount");
  assert.equal(await app.eval((i) => __T.cuMissing(__T.S.cu[i]).length, id), 0, "a salary needs no supplier");
  await page.waitForTimeout(800);
  assert.equal(JSON.stringify((await app.db()).custody[id] && (await app.db()).custody[id].data.amount), "3000", "saved");
  assert.deepEqual(app.errors, []);
});
