// Quarterly VAT report: calendar quarters; fuel, salaries and government fees (residence, labour card) left out.
const test = require("node:test");
const assert = require("node:assert");
const { openApp } = require("../support/app");

const seed = () => { setTimeout(() => { const D = window.__mockDB(); const c = (id, d) => { D.custody[id] = { id, created_by: null, data: { id, kind: "exp", by: "هشام", target: "gen", pay: "cash", createdAt: Date.now() - 1e6, ...d } }; };
  c("g", { cat: "glass", supplier: "Gulf Glass", amount: 2100, vat: 100, date: "2026-08-05", vatCo: "yes" });
  c("cr", { cat: "alu", supplier: "MIH", pay: "credit", amount: 525, vat: 25, date: "2026-09-01", vatCo: "yes" });
  c("nv", { cat: "acc", supplier: "Hardware shop", amount: 1050, date: "2026-07-15", vatCo: "yes" });
  // purchase VAT counts only on invoices made out to the company
  c("pers", { cat: "acc", supplier: "Shop", amount: 420, vat: 20, date: "2026-08-20", vatCo: "no", buyer: "Cash customer" });
  c("unk", { cat: "glass", supplier: "Old glass", amount: 210, vat: 10, date: "2026-08-21" });
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
  const d = await app.eval(() => { const r = __T.vatData(__T.vatQuarters(2)[1]); return { sVat: r.sVat, pVat: r.pVat, due: r.due, miss: r.miss.map((x) => x.id), out: r.out.map((x) => x.id + ":" + x.why).sort(), pur: r.pur.length, notCo: r.notCo.map((x) => x.id), unchk: r.unchk.map((x) => x.id) }; });
  assert.deepEqual(d, { sVat: 500, pVat: 125, due: 375, miss: ["nv"], out: ["f:fuel", "r:gov", "s:salary"], pur: 3, notCo: ["pers"], unchk: ["unk"] });
  // who the invoice is made out to, from a reading
  const m = await app.eval(() => { __T.S.settings.trn = "100200300400003"; const t = (b, bt) => { const x = {}; __T.vatBuyerFrom(x, { buyer: b, buyerTrn: bt || "" }); return x.vatCo; };
    return [t("ASEEL ALUMINIUM & GLASS WORKS LLC"), t("أصيل للألمنيوم والزجاج"), t("Cash Customer"), t(""), t("Mr X", "100200300400003")]; });
  assert.deepEqual(m, ["yes", "yes", "no", "no", "yes"]);
  assert.equal(await app.eval(() => { const x = { vatCo: "no", vatCoHand: 1 }; __T.vatBuyerFrom(x, { buyer: "Aseel" }); return x.vatCo; }), "no", "a choice made by hand stays");

  await page.click('[data-act="cuopen"]'); await page.waitForTimeout(300);
  await page.click('[data-act="vatopen"]'); await page.waitForTimeout(100);
  assert.match(await app.text(), /المستحق للهيئة/);
  // totals: sales, purchases and the difference (before VAT, VAT, total)
  const rows = await page.$$eval(".vatsum tbody tr", (trs) => trs.map((r) => [...r.children].map((c) => c.textContent.trim())));
  assert.deepEqual(rows, [["المبيعات", "10,000", "500", "10,500"], ["المشتريات", "3,550", "125", "3,675"], ["الفرق", "6,450", "375", "6,825"]]);
  await page.click('[data-act="vat5"]'); await page.click('[data-act="vat5"]'); await page.waitForTimeout(400);
  assert.equal(await app.eval(() => __T.vatData(__T.vatQuarters(2)[1]).pVat), 175, "5% of 1050 = 50 added");
  assert.equal(await app.eval(() => __T.vatData(__T.vatQuarters(2)[1]).miss.length), 0);
  assert.deepEqual(app.errors, []);
});

test("VAT: re-reading old invoices finds who they are made out to (amount and date unchanged)", async (t) => {
  const app = await openApp({ init: () => {
    setTimeout(() => { const D = window.__mockDB(); D.custody.u1 = { id: "u1", created_by: null, data: { id: "u1", kind: "exp", by: "هشام", target: "gen", pay: "cash", cat: "glass", supplier: "Glass Co", amount: 315, date: "2026-11-03", fileId: "img1", fileType: "image", createdAt: 1 } }; }, 0);
    const of = window.fetch; window.fetch = async (url, init) => { if (String(url).includes("/functions/v1/read-doc")) return new Response(JSON.stringify({ text: JSON.stringify({ vat: 15, trn: "100999888777666", buyer: "ASEEL ALUMINIUM & GLASS WORKS L.L.C", buyerTrn: "", taxInvoice: true, supplier: "Other", amount: 999, date: "2026-01-01" }) }), { status: 200, headers: { "content-type": "application/json" } }); return of(url, init); };
  } });
  t.after(() => app.close()); const { page } = app;
  await page.clock.setFixedTime(new Date("2026-11-20T10:00:00+04:00"));
  await app.login("هشام", "1234");
  await app.eval(() => { window.__mediaBlob = async () => { const c = document.createElement("canvas"); c.width = 40; c.height = 40; return await new Promise((r) => c.toBlob(r, "image/jpeg")); }; });
  await page.click('[data-act="cuopen"]'); await page.waitForTimeout(300);
  await page.click('[data-act="vatopen"]'); await app.eval(() => { __T.S.vatQ = "2026-Q4"; __T.S.vatOpen = true; __T.render(); });
  await page.click('[data-act="vatread"]');
  await page.waitForFunction(() => __T.S.cu.u1.vatCo === "yes", null, { timeout: 10000 });
  const x = await app.eval(() => __T.S.cu.u1);
  assert.deepEqual([x.vatCo, x.vat, x.supTrn, x.amount, x.date, x.supplier], ["yes", 15, "100999888777666", 315, "2026-11-03", "Glass Co"]);
  assert.equal(await app.eval(() => __T.vatData(__T.vatQuarters(1)[0]).pVat), 15);
  assert.deepEqual(app.errors, []);
});
