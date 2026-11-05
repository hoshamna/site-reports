// The "custody balance low/negative" push must come only from a full-access user's device,
// who sees every custody row. A buyer sees only his own rows (his transfers and invoices, not the
// general manager's deposits), so from his view the main balance looks negative — that must never be sent.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { openApp } = require("../support/app");

const init = (low) => {
  // record notifications instead of sending them
  Object.defineProperty(window, "__push", { configurable: true, get() { return this.__p; }, set(v) {
    v.notify = async (...a) => { (window.__notified = window.__notified || []).push(a); return { ok: true }; };
    v.state = async () => "on"; v.enable = async () => {}; this.__p = v; } });
  try { window.__authDelay = +localStorage.getItem("authDelay") || 0; } catch (e) {}
  setTimeout(() => { const D = window.__mockDB();
    D.settings.company.data.cuLow = low;
    D.custody.x1 = { id: "x1", created_by: null, data: { id: "x1", kind: "xfer", to: "أحمد", amount: 900, date: "2026-11-02", by: "هشام" } };
    D.custody.e1 = { id: "e1", created_by: null, data: { id: "e1", kind: "exp", holder: "main", by: "أحمد", target: "gen", amount: 100, pay: "cash", date: "2026-11-03", supplier: "ADNOC" } };
  }, 0);
};

test("a buyer opening the app does not send the low-balance alert", async (t) => {
  const app = await openApp({ init, initArg: 1000 });
  t.after(() => app.close());
  await app.login("هشام", "1234"); await app.logout(); // هشام now has an account that receives the alert
  await app.eval(() => { window.__notified = []; });
  await app.login("أحمد", "5678"); await app.setPin("2468");
  await app.page.waitForTimeout(6000);
  // the usual morning case: the app is reopened with the buyer still signed in
  await app.eval(() => localStorage.setItem("authDelay", "2500"));
  await app.page.reload(); await app.page.waitForTimeout(8000);
  assert.deepEqual(await app.eval(() => (window.__notified || []).map((a) => a[1])), []);
  assert.ok(!(await app.eval(() => __T.S.settings.cuLowSent)), "the buyer's app did not treat the alert as sent");
});

test("a full-access user still gets it when the main balance is really low", async (t) => {
  // main = 5000 deposit − 100 invoice = 4900 (old transfers no longer count), below a 4950 minimum
  const app = await openApp({ init, initArg: 4950 });
  t.after(() => app.close());
  await app.login("هشام", "1234");
  await app.page.waitForTimeout(6000);
  const sent = await app.eval(() => (window.__notified || []).map((a) => a[2]));
  assert.equal(sent.length, 1);
  assert.match(sent[0], /4,900/);
});
