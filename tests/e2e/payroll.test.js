// Salaries: employees with a monthly salary; each month one custody entry per employee (salary + extra − deduction − advances).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { openApp, libRoutes } = require("../support/app");

test("payroll: employees, advances, paying a month, statements", async (t) => {
  const app = await openApp({ routes: libRoutes, init: () => { setTimeout(() => { window.__mockDB().custody = {}; }, 0); } });
  t.after(() => app.close()); const { page } = app;
  await page.clock.setFixedTime(new Date("2026-11-26T10:00:00+04:00"));
  await app.login("هشام", "1234");
  await page.click('[data-act="cuopen"]'); await page.waitForTimeout(300);
  await page.click('[data-act="payopen"]');
  // add two employees
  for (const [nm, sal] of [["Ali", 2500], ["Omar", 1800]]) { await page.fill("#staff-new", nm); await page.fill("#staff-sal", String(sal)); await page.click('[data-act="staffadd"]'); await page.waitForTimeout(200); }
  assert.deepEqual(await app.eval(() => __T.S.settings.staff.map((e) => [e.name, e.salary])), [["Ali", 2500], ["Omar", 1800]]);
  const ali = await app.eval(() => __T.S.settings.staff[0].id);
  // an advance to Ali in October (comes off October's salary)
  await app.eval(() => { const D = window.__mockDB(); }); 
  await app.eval((id) => { const x = { id: "adv1", kind: "exp", by: "هشام", holder: "main", hv: 2, target: "gen", cat: "salary", pay: "cash", supplier: "Ali", amount: 300, date: "2026-10-12", salEmp: id, salMonth: "2026-10", salAdv: 1, ok: true, createdAt: 1 }; __T.S.cu[x.id] = x; __T.cuPut(x, true); __T.render(); }, ali);
  // October payroll (the month before): Omar gets 200 extra
  assert.equal(await page.inputValue('select[data-paym]'), "2026-10");
  await page.fill(`[data-pay="${await app.eval(() => __T.S.settings.staff[1].id)}"][data-pk="add"]`, "200");
  await page.click('[data-act="paygo"]'); await page.click('[data-act="paygo"]'); await page.waitForTimeout(500);
  const paid = await app.eval(() => Object.values(__T.S.cu).filter((x) => x.cat === "salary" && !x.salAdv).map((x) => [x.supplier, x.amount, x.salMonth, x.salAdvDed, x.salAdd]).sort());
  assert.deepEqual(paid, [["Ali", 2200, "2026-10", 300, 0], ["Omar", 2000, "2026-10", 0, 200]]);
  // custody: advance 300 + salaries 4200 came off the main custody
  assert.equal(await app.eval(() => __T.holderBal("main")), -4500);
  // the October reminder is gone; an advance alone does not count as salaries paid
  assert.notEqual(await app.eval(() => __T.salaryDue()), "2026-10");
  assert.match(await app.text(), /صُرفت مرتبات الشهر/);
  // payroll and employee statements
  await app.eval(() => __T.makePayPdf("2026-10")); await app.eval((id) => __T.makeEmpPdf(id), ali);
  assert.ok((await app.eval(() => window.__pdfPages.length)) >= 2);
  assert.deepEqual(app.errors, []);
});
