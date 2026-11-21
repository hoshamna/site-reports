// A long custody statement: the invoice details table runs over several pages at full width,
// instead of being shrunk onto one unreadable page.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { openApp, libRoutes } = require("../support/app");

test("long tables in the custody statement are split across pages, never shrunk", async (t) => {
  const app = await openApp({ routes: libRoutes, init: () => { setTimeout(() => { const D = window.__mockDB(); D.custody = {};
    D.custody.dep = { id: "dep", created_by: null, data: { id: "dep", kind: "dep", amount: 50000, date: "2026-11-01", createdAt: 1 } };
    for (let i = 0; i < 130; i++) { const id = "i" + i; D.custody[id] = { id, created_by: null, data: { id, kind: "exp", hv: 2, by: "هشام", holder: "main", target: "gen", cat: "acc", pay: "cash", supplier: "Supplier " + i, amount: 10 + i, date: "2026-11-" + String(2 + (i % 20)).padStart(2, "0"), ok: true, createdAt: 2 + i } }; }
  }, 0); } });
  t.after(() => app.close());
  await app.login("هشام", "1234"); await app.page.waitForTimeout(800);
  await app.eval(() => __T.makeCustPdf());
  const imgs = await app.eval(() => window.__pdfPages.filter((p) => p.w === 210 || p.h > 20));
  const blocks = imgs.filter((p) => p.y < 297 - 18 - 1); // page content, not the footer band
  const pages = Math.max(...imgs.map((p) => p.page));
  assert.ok(pages >= 5, "the statement runs over several pages: " + pages);
  for (const b of blocks) {
    assert.equal(b.w, 210, "every block keeps full page width (nothing shrunk)");
    assert.ok(b.y + b.h <= 297 - 18 + 0.5, "every block fits on its page");
  }
  assert.deepEqual(app.errors, []);
});
