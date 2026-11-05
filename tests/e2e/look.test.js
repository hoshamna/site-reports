// The Nov 2026 look: bottom bar, settings screen, theme, site filter and search, English with no Arabic left.
const test = require("node:test");
const assert = require("node:assert");
const { openApp } = require("../support/app");

const arabicLeft = (page) => page.evaluate(() => {
  const out = []; const w = document.createTreeWalker(document.getElementById("app"), NodeFilter.SHOW_TEXT); let x;
  while ((x = w.nextNode())) if (/[؀-ۿ]/.test(x.nodeValue) && !x.parentElement.closest(".u,textarea")) out.push(x.nodeValue.trim());
  return out;
});

test("bottom bar, settings, theme, filters and search", async (t) => {
  const app = await openApp({ init: () => { setTimeout(() => { const D = window.__mockDB();
    D.sites.s2 = { id: "s2", data: { id: "s2", name: "باب فيلا العين", engineer: "م. سالم", status: "منتهي", items: [{ id: "d1", name: "أبواب", qty: 2, fix: 2, glass: 2, sil: 2 }], issues: [], photos: [] } }; }, 0); } });
  t.after(() => app.close());
  const { page } = app;
  await app.login("هشام", "1234");
  assert.ok(await page.isVisible(".bnav"), "bottom bar on the home screen");
  assert.equal(await page.locator(".scard").count(), 2);
  assert.ok(await page.isVisible('.scard[data-id="s2"] .sthumb.jt-door'), "a doors-only job shows the door icon");

  await page.click('[data-act="sfilt"][data-k="done"]');
  assert.deepEqual(await page.$$eval(".scard", (c) => c.map((x) => x.dataset.id)), ["s2"], "filter shows finished sites only");
  await page.click('[data-act="sfilt"][data-k="all"]');
  await page.fill("#site-q", "سالم");
  assert.deepEqual(await page.$$eval(".scard:not([hidden])", (c) => c.map((x) => x.dataset.id)), ["s2"], "search matches the engineer");
  await page.fill("#site-q", "zzz");
  assert.ok(await page.isVisible(".qmiss"), "nothing found message");
  await page.fill("#site-q", "");

  await page.click('[data-act="navset"]');
  assert.match(await app.text(), /النسخ الاحتياطي/);
  assert.match(await app.text(), /المستخدمون والصلاحيات/);
  await page.click('[data-act="theme"][data-k="dark"]');
  assert.equal(await page.evaluate(() => document.documentElement.getAttribute("data-theme")), "dark");
  await page.click('[data-act="theme"][data-k="auto"]');
  assert.equal(await page.evaluate(() => document.documentElement.hasAttribute("data-theme")), false);

  await page.click('[data-act="navlist"]');
  await app.openSite("s1");
  assert.ok(!(await page.isVisible(".bnav")), "no bottom bar inside a site");
  assert.equal(await page.locator('.qgrid [data-act="repopen"]').count(), 0, "reports button is only in the header");
  await page.click('[data-act="back"]');

  await page.click('[data-act="lang"]');
  assert.deepEqual(await arabicLeft(page), [], "home in English has no Arabic");
  await page.click('[data-act="navset"]');
  assert.deepEqual(await arabicLeft(page), [], "settings in English has no Arabic");
  await page.click('[data-act="navlist"]');
  await app.openSite("s1");
  assert.deepEqual(await arabicLeft(page), [], "site in English has no Arabic");
  assert.deepEqual(app.errors, []);
});
