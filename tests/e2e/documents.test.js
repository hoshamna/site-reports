// «المستندات»: Receipt Voucher, Tax Invoice and Progress Invoice kept and numbered inside the app.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { openApp, libRoutes } = require("../support/app");

const docs = (app) => app.eval(() => Object.values(window.__mockDB().docs || {}).map((r) => r.data).sort((a, b) => a.createdAt - b.createdAt));
async function fill(page, key, v) { await page.fill(`[data-dx="${key}"]`, String(v)); }

test("receipt voucher: issued with the next number, saved, PDF downloaded", async (t) => {
  const app = await openApp({ routes: libRoutes }); t.after(() => app.close()); const { page } = app;
  await app.login("هشام", "1234");
  await page.click('.bnav [data-act="docsopen"]');
  assert.match(await app.text(), /المستندات/);
  await page.click('[data-act="docnew"]');
  await fill(page, "receivedFrom", "محمد جاسم محمد");
  await fill(page, "amount", 8000);
  await fill(page, "chequeNo", "Bank Transfer");
  await fill(page, "being", "Advance Payment");
  await fill(page, "collectedBy", "Hesham");
  const prev = await page.textContent("#docprev");
  assert.match(prev, /Eight Thousand Dirhams Only\./);
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click('[data-act="docissue"]')]);
  assert.ok(dl);
  assert.equal(await app.eval(() => window.__lastFile.name), "Receipt Voucher RV 01023 - محمد جاسم محمد.pdf");
  const pg = await app.eval(() => window.__pdfPages.at(-1));
  assert.equal(pg.o.orientation, "landscape"); assert.equal(pg.w, 297); assert.ok(pg.len > 20000, "the page image was drawn");
  const d = (await docs(app))[0];
  assert.equal(d.no, "01023"); assert.equal(d.seq, 1023); assert.equal(d.status, "issued"); assert.equal(d.counter, "rv");
  // a second one takes 01024
  await page.click('[data-act="docback"]'); await page.click('[data-act="docnew"]');
  await fill(page, "receivedFrom", "Gulf Star"); await fill(page, "amount", 1500);
  await Promise.all([page.waitForEvent("download"), page.click('[data-act="docissue"]')]);
  assert.deepEqual((await docs(app)).map((x) => x.no), ["01023", "01024"]);
  assert.deepEqual(app.errors, []);
});

test("tax and progress invoices share one counter; a cancelled document keeps its number", async (t) => {
  const app = await openApp({ routes: libRoutes, init: () => { setTimeout(() => { window.__mockDB().settings.company.data.invSeq = 437; window.__mockDB().doc_counters.inv.last = 437; }, 0); } });
  t.after(() => app.close()); const { page } = app;
  await app.login("هشام", "1234");
  await page.click('.bnav [data-act="docsopen"]');
  await page.click('[data-act="doctab"][data-k="tax"]'); await page.click('[data-act="docnew"]');
  await fill(page, "to", "Khalid Almazmi");
  await page.fill('[data-dl="0"][data-lf="desc"]', "First Payment");
  await page.fill('[data-dl="0"][data-lf="amount"]', "10000");
  assert.match(await page.textContent("#docsum"), /10,500\.00/);
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click('[data-act="docissue"]')]);
  const y = new Date().getFullYear(), P = await app.eval(() => __T.S.settings.invPrefix || "INV");
  assert.equal(dl.suggestedFilename(), `Tax Invoice ${P}-${y}-438 - Khalid Almazmi.pdf`);
  assert.equal((await app.eval(() => window.__pdfPages.at(-1))).o.orientation, "portrait");
  await page.click('[data-act="docback"]');
  await page.click('[data-act="doctab"][data-k="prog"]'); await page.click('[data-act="docnew"]');
  await fill(page, "to", "Gulf Star"); await page.fill('[data-dl="0"][data-lf="amount"]', "2000");
  await Promise.all([page.waitForEvent("download"), page.click('[data-act="docissue"]')]);
  let all = await docs(app);
  assert.deepEqual(all.map((x) => [x.kind, x.no]), [["tax", `${P}/${y}/438`], ["prog", `${P}/${y}/439`]]);
  assert.doesNotMatch(await page.textContent("#docprev"), /TRN/, "a progress invoice shows no TRN");
  // cancel it: the number stays used
  await page.click('[data-act="docvoid"]'); await page.click('[data-act="docvoid"]'); await page.waitForTimeout(300);
  all = await docs(app);
  assert.equal(all[1].status, "void");
  assert.match(await page.textContent("#docprev"), /CANCELLED/);
  await page.click('[data-act="docback"]'); await page.click('[data-act="doctab"][data-k="tax"]'); await page.click('[data-act="docnew"]');
  await fill(page, "to", "Next Client"); await page.fill('[data-dl="0"][data-lf="amount"]', "100");
  await Promise.all([page.waitForEvent("download"), page.click('[data-act="docissue"]')]);
  assert.equal((await docs(app))[2].no, `${P}/${y}/440`);
  assert.deepEqual(app.errors, []);
});

test("from a client payment: the voucher is filled from the payment and linked back", async (t) => {
  const app = await openApp({ routes: libRoutes }); t.after(() => app.close()); const { page } = app;
  await app.login("هشام", "1234");
  await app.eval(() => { const s = __T.S.sites.s1; s.client = "Khalid Almazmi"; s.location = "Al Barsha Villa"; s.payments[0].method = "transfer"; s.payments[0].bank = "ENBD"; });
  await app.openSite("s1");
  await app.eval(() => { __T.S.tab = "money"; __T.render(); });
  await page.click('[data-act="payrv"][data-id="p1"]');
  assert.equal(await page.inputValue('[data-dx="receivedFrom"]'), "Khalid Almazmi");
  assert.equal(await page.inputValue('[data-dx="amount"]'), "10000");
  assert.equal(await page.inputValue('[data-dx="chequeNo"]'), "Bank Transfer");
  assert.equal(await page.inputValue('[data-dx="bank"]'), "ENBD");
  assert.equal(await page.inputValue('[data-dx="being"]'), "First Payment - Al Barsha Villa");
  await Promise.all([page.waitForEvent("download"), page.click('[data-act="docissue"]')]);
  await page.click('[data-act="docback"]');
  assert.equal(await app.eval(() => __T.S.view), "site", "back returns to the site");
  await page.waitForTimeout(500);
  const fin = await app.eval(() => window.__mockDB().site_fin.s1.data.payments[0]);
  assert.equal(fin.rv.no, "01023");
  assert.match(await app.text(), /Receipt Voucher 01023/);
  // its tax invoice: net + VAT from the payment amount
  await page.click('[data-act="taxinv"][data-id="p1"]');
  assert.equal(await page.inputValue('[data-dl="0"][data-lf="amount"]'), "9523.81");
  assert.match(await page.textContent("#docsum"), /10,000\.00/);
  assert.deepEqual(app.errors, []);
});

test("a buyer has no documents section", async (t) => {
  const app = await openApp({ routes: libRoutes }); t.after(() => app.close());
  await app.login("أحمد", "5678"); await app.setPin("2468");
  assert.equal(await app.page.locator('[data-act="docsopen"]').count(), 0);
});

test("before the database setup is run, issuing says what to do", async (t) => {
  const app = await openApp({ routes: libRoutes, init: () => { window.__noDocsSql = true; } }); t.after(() => app.close()); const { page } = app;
  await app.login("هشام", "1234");
  await page.click('.bnav [data-act="docsopen"]'); await page.click('[data-act="docnew"]');
  await fill(page, "receivedFrom", "X"); await fill(page, "amount", 5);
  await page.click('[data-act="docissue"]'); await page.waitForTimeout(400);
  assert.match(await app.toast(), /docs-setup\.sql/);
  assert.equal((await docs(app)).length, 0);
});
