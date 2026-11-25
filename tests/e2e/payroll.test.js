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
  // paying waits for GM's approval
  assert.equal(await page.locator('[data-act="paygo"]').count(), 0);
  assert.match(await app.text(), /بانتظار اعتماد المدير العام/);
  await app.eval(() => { __T.S.user.name = "GM"; __T.render(); });
  await page.click('[data-act="payappr"]'); await page.click('[data-act="payappr"]'); await page.waitForTimeout(200);
  assert.match(await app.text(), /اعتمد المدير العام كشف/);
  await app.eval(() => { __T.S.user.name = "هشام"; __T.render(); });
  await page.click('[data-act="paygo"]'); await page.click('[data-act="paygo"]'); await page.waitForTimeout(500);
  const paid = await app.eval(() => Object.values(__T.S.cu).filter((x) => x.cat === "salary" && !x.salAdv).map((x) => [x.supplier, x.amount, x.pay, x.salAdvDed, x.salAbsDed, x.salOther]).sort());
  assert.deepEqual(paid, [["HESHAM", 6000, "bank", 0, 0, 0], ["abd alla jad", 900, "cash", 0, 800, 0], ["mohamed suliman", 1350, "cash", 300, 0, -50]]);
  // custody: advance 300 + cash 2250 + bank 6000 out (Hosham transfers the bank salaries himself), carried 400 in
  assert.equal(await app.eval(() => __T.holderBal("main")), -300 - 2250 - 6000 + 400);
  assert.deepEqual(await app.eval(() => __T.S.settings.payCarry), { emp: hes, amount: 400 });
  assert.notEqual(await app.eval(() => __T.salaryDue()), "2026-10");
  assert.match(await app.text(), /صُرفت مرتبات الشهر/);
  await app.eval(() => __T.makePayPdf("2026-10")); await app.eval((id) => __T.makeEmpPdf(id), moh);
  assert.ok((await app.eval(() => window.__pdfPages.length)) >= 2);
  assert.deepEqual(app.errors, []);
});

test("payroll: the company's October sheet is adopted in one tap, figures match the paper", async (t) => {
  const app = await openApp({ routes: libRoutes, init: () => { setTimeout(() => { window.__mockDB().custody = {}; }, 0); } });
  t.after(() => app.close()); const { page } = app;
  await page.clock.setFixedTime(new Date("2026-11-26T10:00:00+04:00"));
  await app.login("هشام", "1234");
  await page.click('[data-act="cuopen"]'); await page.waitForTimeout(300);
  await page.click('[data-act="payopen"]');
  await page.click('[data-act="paysheet"]'); await page.waitForTimeout(300);
  assert.equal(await app.eval(() => __T.S.settings.staff.length), 9);
  const num = async (k) => Number((await page.textContent(`[data-tot="${k}"]`)).replace(/[^\d.-]/g, ""));
  assert.equal(await num("gbank"), 7400); assert.equal(await num("gcash"), 10150);
  assert.equal(await num("all"), 7400 + 10150);
  assert.equal(await num("total"), 7400 + 10150 - 4000);
  // the sheet as on paper, and as Excel with formulas
  const html = await app.eval(() => __T.paySheetHtml("2026-10"));
  assert.match(html, /logo\.png/); assert.match(html, /17,550/); assert.match(html, /13,550/);
  const parts = await app.eval(() => __T.payXlsxParts("2026-10"));
  const sheet = parts.find((p) => p[0] === "xl/worksheets/sheet1.xml")[1];
  assert.match(sheet, /rightToLeft="1"/); assert.match(sheet, /<f>SUM\(J12:J18\)<\/f><v>10150<\/v>/); assert.match(sheet, /<v>13550<\/v>/);
  await app.eval(() => __T.makePayXlsx("2026-10"));
  assert.match(await app.eval(() => window.__lastFile && window.__lastFile.name), /\.xlsx$/);
  // an advance of 1,200 over 3 months, given in November: 400 from December, January, February; January postponed
  const vic = await app.eval(() => __T.S.settings.staff.find((e) => e.name === "VICTOR ASANTE").id);
  await page.click(`[data-act="staffopen"]`); await page.waitForTimeout(100);
  await page.click(`[data-act="payadv"][data-id="${vic}"]`); await page.fill("#pay-adv", "1200"); await page.fill("#pay-advn", "3");
  await page.click(`[data-act="payadvok"][data-id="${vic}"]`); await page.waitForTimeout(200);
  const adv = await app.eval(() => Object.values(__T.S.cu).find((x) => x.salAdv));
  assert.equal(adv.salMonth, "2026-12"); assert.equal(adv.salInstN, 3);
  await page.selectOption("select[data-paym]", "2026-10");
  await app.eval(() => { __T.S.payM = "2026-12"; __T.render(); });
  assert.match(await page.textContent(`tr.payrow[data-emp="${vic}"] [data-adv]`), /400/);
  await app.eval(() => { __T.S.payM = "2027-01"; __T.render(); });
  await page.click(`[data-act="payskip"]`); await page.waitForTimeout(200);
  assert.deepEqual(await app.eval((id) => Object.values(__T.S.cu).find((x) => x.salAdv && x.salEmp === id).salSkip, vic), ["2027-01"]);
  assert.match(await page.textContent(`tr.payrow[data-emp="${vic}"] [data-adv]`), /^0/);
  assert.equal(await page.locator('[data-act="paysheet"]').count(), 0);
  assert.equal(await page.locator("table.paytbl tbody tr").count(), 9);
  // the month's figures survive closing the app (kept in settings)
  assert.equal(await app.eval(() => __T.S.settings.payDraft["2026-10"] && Object.keys(__T.S.settings.payDraft["2026-10"]).length), 4);
  await app.eval(() => __T.makePayPdf("2026-10"));
  assert.deepEqual(app.errors, []);
});
