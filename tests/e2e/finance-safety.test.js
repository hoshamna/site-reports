// Regression for the 3 Nov 2026 incident: when the app reopened with a saved session it loaded
// sites before knowing the user's role, showed them without finance, then — while syncing a custody
// invoice into the site's purchases — saved the site and wiped its finance.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { openApp } = require("../support/app");

test("reopening the app keeps finance, even when the profile loads slowly", async (t) => {
  const app = await openApp({ init: () => {
    window.__mockSlowProfiles = 400;
    // a custody invoice charged to the site, as on the real data
    setTimeout(() => { const D = window.__mockDB(); if (!D.custody.inv7) D.custody.inv7 = { id: "inv7", created_by: null,
      data: { id: "inv7", kind: "exp", by: "هشام", holder: "main", target: "s1", pay: "cash", supplier: "مورد", amount: 300, date: "2026-11-01", createdAt: 1 } }; }, 0);
  } });
  t.after(() => app.close());
  await app.login("هشام", "1234");
  await app.page.waitForTimeout(900);
  for (const round of [1, 2, 3]) {
    await app.page.reload();
    await app.page.waitForTimeout(1800);
    assert.equal(await app.eval(() => __T.S.sites.s1 && __T.S.sites.s1.total), 85000, `shown after reopen #${round}`);
    assert.equal((await app.db()).site_fin.s1.data.total, 85000, `stored after reopen #${round}`);
  }
  assert.deepEqual(app.errors, []);
});
