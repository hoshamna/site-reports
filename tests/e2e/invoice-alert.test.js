// Every new invoice, from anyone, sends one alert to the general manager only (none for old invoices).
const test = require("node:test");
const assert = require("node:assert");
const { openApp } = require("../support/app");

const init = () => {
  Object.defineProperty(window, "__push", { configurable: true, get() { return this.__p; }, set(v) {
    v.notify = async (...a) => { (window.__notified = window.__notified || []).push(a); return { ok: true }; };
    v.state = async () => "on"; v.enable = async () => {}; this.__p = v; } });
};

test("new invoice alert", async (t) => {
  const app = await openApp({ init });
  t.after(() => app.close());
  await app.login("هشام", "1234");
  const mgr = await app.eval(() => __T.S.user.id);
  const r = await app.eval(() => { window.__notified = [];
    const mk = (id, d) => __T.cuPut({ id, kind: "exp", target: "gen", pay: "cash", createdAt: Date.now(), ...d });
    mk("a", { by: "أحمد", supplier: "ADNOC", amount: 0, reading: true });          // still being read: nothing yet
    const n0 = window.__notified.length;
    const a = __T.S.cu.a; delete a.reading; a.amount = 70; __T.cuPut(a);            // read: one alert
    __T.cuPut({ ...__T.S.cu.a, desc: "edit" });                                      // later edits: no more alerts
    mk("b", { by: "هشام", supplier: "Gulf Glass", amount: 500 });                    // his own: alerted too
    mk("c", { by: "أحمد", supplier: "MIH", amount: 300, createdAt: Date.now() - 3 * 864e5 }); // old: none
    return { n0, sent: window.__notified.map((x) => [x[0], x[1], x[2]]) };
  });
  assert.equal(r.n0, 0);
  assert.equal(r.sent.length, 2, "Ahmed's and his own; not the edit, not the old one");
  assert.deepEqual(r.sent.map((x) => x[0]), [[mgr], [mgr]], "only the general manager");
  assert.match(r.sent[0][1], /فاتورة جديدة — أحمد/);
  assert.match(r.sent[0][2], /ADNOC · 70 درهم/);
  assert.deepEqual(app.errors, []);
});
