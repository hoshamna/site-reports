// The money and progress calculations, run inside the real built app.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { openApp } = require("../support/app");

test("calculations", async (t) => {
  const app = await openApp();
  t.after(() => app.close());

  await t.test("site totals, received and remaining", async () => {
    const c = await app.eval(() => __T.calc({ total: 100000, payments: [{ amount: 30000 }, { amount: "5000" }], purchases: [{ amount: 1200 }], items: [] }));
    assert.equal(c.total, 100000); assert.equal(c.received, 35000); assert.equal(c.remaining, 65000); assert.equal(c.spent, 1200);
  });

  await t.test("progress counts frame, glass and silicone per window", async () => {
    const c = await app.eval(() => __T.calc({ items: [{ qty: 4, fix: 4, glass: 2, sil: 0 }] }));
    assert.equal(c.windows, 4); assert.equal(c.pct, 50);
  });

  await t.test("costs and profit include labour, other costs and purchases", async () => {
    const r = await app.eval(() => __T.costs({ total: 50000, labor: [{ mode: "calc", workers: 2, days: 3, rate: 150 }, { mode: "amount", amount: 500 }], otherCosts: [{ amount: 250 }], purchases: [{ amount: 10000 }] }));
    assert.deepEqual([r.lab, r.oth, r.pur, r.cost, r.profit], [1400, 250, 10000, 11650, 38350]);
  });

  await t.test("payment schedule spreads received money in order", async () => {
    const sc = await app.eval(() => __T.schedule({ total: 100000, payments: [{ amount: 40000 }], items: [], schedule: [{ id: "a", pct: 30, trigger: "sign" }, { id: "b", pct: 70, trigger: "glass" }] }));
    assert.deepEqual(sc.map((m) => [m.amt, m.paid, m.left, m.st]), [[30000, 30000, 0, "paid"], [70000, 10000, 60000, "part"]]);
  });

  await t.test("supplier names match despite LLC/trading suffixes", async () => {
    assert.equal(await app.eval(() => __T.supMatch("Dreamland Trading LLC", "dreamland")), true);
    assert.equal(await app.eval(() => __T.supMatch("MIH Building Materials L.L.C", "MIH")), true);
    assert.equal(await app.eval(() => __T.supMatch("Emirates Glass", "Gulf Glass")), false);
  });

  await t.test("custody balance: deposits minus cash spending; credit and direct transfers excluded", async () => {
    await app.login("هشام", "1234");
    const r = await app.eval(() => {
      __T.S.cu = { d: { id: "d", kind: "dep", amount: 5000 }, e1: { id: "e1", kind: "exp", pay: "cash", amount: 300 }, e2: { id: "e2", kind: "exp", pay: "credit", amount: 900 },
        e3: { id: "e3", kind: "exp", pay: "gm", amount: 700 }, x: { id: "x", kind: "xfer", dir: "out", to: "أحمد", amount: 1000 }, e4: { id: "e4", kind: "exp", pay: "cash", holder: "أحمد", amount: 250 } };
      return { main: __T.holderBal("main"), ahmed: __T.holderBal("أحمد") };
    });
    assert.deepEqual(r, { main: 3700, ahmed: 750 });
  });
  assert.deepEqual(app.errors, []);
});
