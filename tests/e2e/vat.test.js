// Quarterly VAT report: calendar quarters; fuel, salaries and government fees (residence, labour card) left out.
const test = require("node:test");
const assert = require("node:assert");
const { openApp } = require("../support/app");

const seed = () => { setTimeout(() => { const D = window.__mockDB(); const c = (id, d) => { D.custody[id] = { id, created_by: null, data: { id, kind: "exp", by: "هشام", target: "gen", pay: "cash", createdAt: Date.now() - 1e6, ...d } }; };
  c("g", { cat: "glass", supplier: "Gulf Glass", amount: 2100, vat: 100, date: "2026-08-05" });
  c("cr", { cat: "alu", supplier: "MIH", pay: "credit", amount: 525, vat: 25, date: "2026-09-01" });
  c("nv", { cat: "acc", supplier: "Hardware shop", amount: 1050, date: "2026-07-15" });
  c("f", { cat: "fuel", supplier: "ADNOC", amount: 200, vat: 9.52, date: "2026-08-07" });
  c("s", { cat: "salary", supplier: "", desc: "رواتب يوليو", amount: 5000, date: "2026-08-01" });
  c("r", { cat: "", supplier: "Amer centre", desc: "تجديد إقامة عامل", amount: 1000, date: "2026-09-10" });
  c("q4", { cat: "glass", supplier: "Gulf Glass", amount: 1050, vat: 50, date: "2026-10-02" });
  const s = D.sites.s1.data; s.payments = [{ id: "p1", amount: 10500, date: "2026-08-10", invoice: { no: "INV/2026/1", date: "2026-08-10", gross: 10500, rate: 5, to: "Khalid" } }];
  if (D.site_finance && D.site_finance.s1) D.site_finance.s1.data.payments = s.payments; }, 0); };

test("VAT report for a quarter", async (t) => {
  const app = await openApp({ init: seed });
  t.after(() => app.close());
  const { page } = app;
  await page.clock.setFixedTime(new Date("2026-11-20T10:00:00+04:00"));
  await app.login("هشام", "1234");
  await app.eval(() => { const s = __T.S.sites.s1; s.payments = [{ id: "p1", amount: 10500, date: "2026-08-10", invoice: { no: "INV/2026/1", date: "2026-08-10", gross: 10500, rate: 5, to: "Khalid" } }]; });
  const qs = await app.eval(() => __T.vatQuarters(2).map((q) => [q.key, q.from, q.to]));
  assert.deepEqual(qs, [["2026-Q4", "2026-10-01", "2026-12-31"], ["2026-Q3", "2026-07-01", "2026-09-30"]]);
  const d = await app.eval(() => { const r = __T.vatData(__T.vatQuarters(2)[1]); return { sVat: r.sVat, pVat: r.pVat, due: r.due, miss: r.miss.map((x) => x.id), out: r.out.map((x) => x.id + ":" + x.why).sort(), pur: r.pur.length }; });
  assert.deepEqual(d, { sVat: 500, pVat: 125, due: 375, miss: ["nv"], out: ["f:fuel", "r:gov", "s:salary"], pur: 3 });

  await page.click('[data-act="cuopen"]'); await page.waitForTimeout(300);
  await page.click('[data-act="vatopen"]'); await page.waitForTimeout(100);
  assert.match(await app.text(), /المستحق للهيئة/);
  await page.click('[data-act="vat5"]'); await page.click('[data-act="vat5"]'); await page.waitForTimeout(400);
  assert.equal(await app.eval(() => __T.vatData(__T.vatQuarters(2)[1]).pVat), 175, "5% of 1050 = 50 added");
  assert.equal(await app.eval(() => __T.vatData(__T.vatQuarters(2)[1]).miss.length), 0);
  assert.deepEqual(app.errors, []);
});
