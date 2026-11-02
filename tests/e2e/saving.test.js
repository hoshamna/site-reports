// Typing waits for the Save button; leaving the site saves anything pending.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { openApp } = require("../support/app");

test("Save button and save-on-leave", async (t) => {
  const app = await openApp();
  t.after(() => app.close());
  const { page } = app;
  await app.login("هشام", "1234");
  await app.openSite("s1");
  await page.click('summary:has-text("بيانات المشروع")');

  await t.test("typing does not save, and the button turns into a reminder", async () => {
    await app.clearLog();
    await page.locator('[data-f="engineer"]').fill("م. أحمد");
    await page.locator('[data-f="consultant"]').fill("مكتب");
    await page.waitForTimeout(1200);
    assert.deepEqual(await app.log(), []);
    const btn = page.locator(".savenow").first();
    assert.match(await btn.textContent(), /حفظ التعديلات/);
    assert.ok(await btn.evaluate((b) => b.classList.contains("unsaved")));
  });

  await t.test("the Save button saves everything at once", async () => {
    await page.locator(".savenow").first().click();
    await page.waitForTimeout(800);
    const db = await app.db();
    assert.equal(db.sites.s1.data.engineer, "م. أحمد");
    assert.equal(db.sites.s1.data.consultant, "مكتب");
    assert.equal(db.site_fin.s1.data.total, 85000);
    assert.match(await app.toast(), /تم حفظ كل البيانات/);
  });

  await t.test("going back to all sites saves pending typing", async () => {
    if (!(await page.locator('[data-f="engineer"]').isVisible())) await page.click('summary:has-text("بيانات المشروع")');
    await page.locator('[data-f="engineer"]').fill("م. خالد");
    await page.waitForTimeout(500);
    await page.click('[data-act="back"]');
    await page.waitForTimeout(800);
    assert.equal((await app.db()).sites.s1.data.engineer, "م. خالد");
  });
  assert.deepEqual(app.errors, []);
});
