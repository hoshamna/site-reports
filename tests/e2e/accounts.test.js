// Sign-in, first-time PIN change, user management and sign-out.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { openApp } = require("../support/app");

test("sign-in, PIN rules and user management", async (t) => {
  const app = await openApp();
  t.after(() => app.close());

  await t.test("the sign-in screen lists names only, from the server", async () => {
    const txt = await app.text();
    assert.match(txt, /من أنت؟/);
    assert.match(txt, /هشام/); assert.match(txt, /أحمد/);
  });

  await t.test("a wrong PIN is refused and nothing loads", async () => {
    await app.login("هشام", "0000");
    assert.equal(await app.toast(), "الرمز غير صحيح");
    assert.equal(await app.eval(() => Object.keys(__T.S.sites).length), 0);
  });

  await t.test("the old PIN creates the account on first sign-in", async () => {
    await app.page.fill("#au-pin", "1234"); await app.page.click('[data-act="aulogin"]');
    await app.page.waitForSelector(".logoutbtn");
    const db = await app.db();
    assert.ok(db.profiles.u1, "profile created"); assert.equal(db.profiles.u1.role, "admin");
    assert.equal(db.legacy_pins.u1, undefined, "old PIN record removed");
    assert.equal(await app.eval(() => __T.S.sites.s1.total), 85000, "full-access user sees finance");
  });

  await t.test("a full-access user can add a user, who must change the PIN", async () => {
    await app.addUser("محمد", "eng", "1111");
    const u = (await app.eval(() => __T.users())).find((x) => x.name === "محمد");
    assert.equal(u.role, "eng"); assert.equal(u.mustChange, true);
  });

  await t.test("sign-out asks first, and Cancel keeps you in", async () => {
    await app.page.click(".logoutbtn");
    assert.ok(await app.page.isVisible(".logoutsheet"));
    // the title and both buttons must be readable (not white on the white sheet)
    const look = await app.eval(() => { const c = (sel) => getComputedStyle(document.querySelector(sel));
      return { sheet: c(".logoutsheet").backgroundColor, title: c(".logoutsheet h3").color, yes: c('[data-act="aulogout"]').backgroundColor, yesText: c('[data-act="aulogout"]').color, no: c('[data-act="aulogoutno"]').color }; });
    assert.notEqual(look.title, look.sheet, "title readable");
    assert.notEqual(look.no, look.sheet, "Cancel readable");
    assert.notEqual(look.yes, look.sheet, "Sign out button has its own colour");
    assert.equal(look.yes, "rgb(178, 58, 58)", "Sign out button is red");
    await app.page.click('[data-act="aulogoutno"]');
    assert.ok(await app.page.isVisible(".logoutbtn"));
    await app.logout();
    assert.equal(await app.eval(() => Object.keys(__T.S.sites).length), 0, "data cleared on sign-out");
  });

  await t.test("a new user must choose a new PIN before using the app", async () => {
    await app.login("محمد", "1111");
    assert.match(await app.text(), /اختر رمز دخول جديداً/);
    await app.setPin("2222");
    assert.match(await app.text(), /تقارير المواقع/);
    const p = Object.values((await app.db()).profiles).find((x) => x.name === "محمد");
    assert.equal(p.data.mustChange, false, "PIN change recorded on the server");
  });
  assert.deepEqual(app.errors, []);
});

test("the salaries reminder is its own choice per user", async (t) => {
  const app = await openApp();
  t.after(() => app.close());
  await app.login("هشام", "1234");
  await app.eval(() => { __T.S.view = "settings"; __T.S.usersOpen = true; __T.render(); });
  await app.page.check('[data-ausalary="u1"]');
  await app.page.waitForTimeout(500);
  const d = (await app.db()).profiles.u1.data;
  assert.equal(d.notifySalary, true, "saved on the server");
  assert.equal(d.notifyLow, true, "the custody alert setting is untouched");
  assert.deepEqual(app.errors, []);
});
