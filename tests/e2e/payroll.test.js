// Salaries, laid out like the company's sheet: basic + allowances − advances − absence ± other = net; BANK and CASH groups;
// part of a bank salary carried to the cash group (comes back into the custody as a deposit).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { openApp, libRoutes } = require("../support/app");

test("payroll: bank and cash groups, advances, absence, carried amount, statements", async (t) => {
  const app = await openApp({ routes: libRoutes, init: () => { setTimeout(() => { window.__mockDB().custody = {}; }, 0); } });
  t.after(() => app.close()); const { page } = app;
  await page.clock.setFixedTime(new Date("2026-11-26T10:00:00+04:00"));
  await app.login("هشام", "1234");
  await page.click('[data-act="cuopen"]'); await page.waitForTimeout(300);
  await page.click('[data-act="payopen"]');
  for (const [nm, no, sal, al, mode] of [["HESHAM", "1", 5600, 400, "bank"], ["abd alla jad", "5", 1300, 400, "cash"], ["mohamed suliman", "4", 1300, 400, "cash"]]) {
    await page.fill("#staff-new", nm); await page.fill("#staff-no", no); await page.fill("#staff-sal", String(sal)); await page.fill("#staff-allow", String(al));
    await page.selectOption("#staff-mode", mode); await page.click('[data-act="staffadd"]'); await page.waitForTimeout(200);
  }
  assert.deepEqual(await app.eval(() => __T.S.settings.staff.map((e) => [e.name, e.no, e.salary, e.allow, e.mode])),
    [["HESHAM", "1", 5600, 400, "bank"], ["abd alla jad", "5", 1300, 400, "cash"], ["mohamed suliman", "4", 1300, 400, "cash"]]);
  const [hes, abd, moh] = await app.eval(() => __T.S.settings.staff.map((e) => e.id));
  // an advance of 300 to mohamed in October: deducted from his salary directly
  await app.eval((id) => { const x = { id: "adv1", kind: "exp", by: "هشام", holder: "main", hv: 2, target: "gen", cat: "salary", pay: "cash", supplier: "mohamed suliman", amount: 300, date: "2026-10-12", salEmp: id, salMonth: "2026-10", salAdv: 1, ok: true, createdAt: 1 }; __T.S.cu[x.id] = x; __T.cuPut(x, true); __T.render(); }, moh);
  assert.equal(await page.inputValue("select[data-paym]"), "2026-10");
  // abd alla absent 14 days → (1300+400)/30×14 ≈ 793, typed by hand as 800; mohamed −50 other
  await page.fill(`[data-pay="${abd}"][data-pk="days"]`, "14");
  await page.fill(`[data-pay="${abd}"][data-pk="absDed"]`, "800");
  await page.fill(`[data-pay="${abd}"][data-pk="note"]`, "توقف عن العمل");
  await page.fill(`[data-pay="${moh}"][data-pk="other"]`, "-50");
  await page.selectOption('[data-paycarry="emp"]', hes); await page.fill('[data-paycarry="amount"]', "400");
  assert.equal((await page.textContent('[data-tot="total"]')).replace(/[^\d.]/g, ""), String(6000 + 900 + 1350 - 400));
  await page.click('[data-act="paygo"]'); await page.click('[data-act="paygo"]'); await page.waitForTimeout(500);
  const paid = await app.eval(() => Object.values(__T.S.cu).filter((x) => x.cat === "salary" && !x.salAdv).map((x) => [x.supplier, x.amount, x.pay, x.salAdvDed, x.salAbsDed, x.salOther]).sort());
  assert.deepEqual(paid, [["HESHAM", 6000, "gm", 0, 0, 0], ["abd alla jad", 900, "cash", 0, 800, 0], ["mohamed suliman", 1350, "cash", 300, 0, -50]]);
  // custody: advance 300 + cash 2250 out, carried 400 in; the bank salary does not touch it
  assert.equal(await app.eval(() => __T.holderBal("main")), -300 - 2250 + 400);
  assert.deepEqual(await app.eval(() => __T.S.settings.payCarry), { emp: hes, amount: 400 });
  assert.notEqual(await app.eval(() => __T.salaryDue()), "2026-10");
  assert.match(await app.text(), /صُرفت مرتبات الشهر/);
  await app.eval(() => __T.makePayPdf("2026-10")); await app.eval((id) => __T.makeEmpPdf(id), moh);
  assert.ok((await app.eval(() => window.__pdfPages.length)) >= 2);
  assert.deepEqual(app.errors, []);
});
