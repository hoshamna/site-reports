// A client's bank-transfer advice sent as a PDF must be read like a photo (amount, date, payer).
// Uses the real pdf.js the app serves from app/vendor.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { openApp, libRoutes } = require("../support/app");

async function makeAdvicePdf(file) {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.setContent(`<h1>Transfer advice</h1><p>Amount AED 12,500.00</p><p>Date 2026-11-02</p><p>From: Gulf Star Contracting</p>`);
  await p.pdf({ path: file, format: "A4" }); await b.close();
}

test("client payment: a PDF transfer advice is converted and read", async (t) => {
  const pdf = path.join(require("os").tmpdir(), "advice-test.pdf");
  await makeAdvicePdf(pdf);
  const app = await openApp({
    routes: libRoutes,
    init: () => {
      const of = window.fetch;
      window.fetch = async (url, init) => {
        if (String(url).includes("/functions/v1/read-doc")) {
          const b = JSON.parse(init.body); window.__read = { kind: b.kind, mediaType: b.mediaType, size: b.image.length };
          return new Response(JSON.stringify({ text: JSON.stringify({ type: "transfer", amount: 12500, date: "2026-11-02", ref: "TT123", payer: "Gulf Star Contracting" }) }), { status: 200, headers: { "content-type": "application/json" } });
        }
        return of(url, init);
      };
    },
  });
  t.after(() => app.close());
  const { page } = app;
  await app.login("هشام", "1234");
  await app.page.waitForFunction(() => !!window.pdfjsLib, null, { timeout: 10000 });
  // the current pdf.js from the app itself, not 3.11.174 (CVE-2024-4367: a crafted PDF could run code)
  assert.equal(await app.eval(() => window.pdfjsLib.version), "6.2.108");
  assert.equal(await app.eval(() => [...document.scripts].some((s) => /pdf\.js\/3\./.test(s.src))), false);
  await app.openSite("s1");
  const before = await app.eval(() => (__T.S.sites.s1.payments || []).length);
  await app.eval(() => { __T.S.payPick = true; __T.S.tab = "money"; __T.render(); });
  const btn = page.locator(".sheet [data-act=\"scanpay\"]:not([data-cam])").first();
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), btn.click()]);
  await chooser.setFiles(pdf);
  await page.waitForFunction((n) => { const p = __T.S.sites.s1.payments; return p.length > n && p[p.length - 1].amount > 0; }, before, { timeout: 15000 });
  const read = await app.eval(() => window.__read);
  assert.equal(read.kind, "payment");
  assert.equal(read.mediaType, "image/jpeg");
  const p = await app.eval(() => { const a = __T.S.sites.s1.payments; return a[a.length - 1]; });
  assert.equal(p.amount, 12500);
  assert.equal(p.date, "2026-11-02");
  assert.equal(p.method, "transfer");
  assert.equal(p.fileType, "image");
  assert.match(p.note, /Gulf Star/);
  assert.deepEqual(app.errors, []);
});
