// Voice notes: phone speech recognition and the summary are simulated; everything else is the real app.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { openApp } = require("../support/app");

const SAID = ["اليوم ركبنا فريم الطابق الأول", "وناقص زجاج ثلاث شبابيك", "والاستشاري طلب تعديل باب المدخل والسيليكون مقشر في الواجهة الخلفية"];

test("voice note: speak, summarise, review, save; issues go to the Issues tab", async (t) => {
  const app = await openApp({ init: (said) => {
    window.SpeechRecognition = window.webkitSpeechRecognition = class { start() { setTimeout(() => {
        this.onresult && this.onresult({ results: said.map((tx) => ({ 0: { transcript: tx }, isFinal: true })) }); }, 50); }
      stop() { setTimeout(() => this.onend && this.onend(), 10); } };
    const of = window.fetch;
    window.fetch = async (url, init) => {
      if (String(url).includes("/functions/v1/read-doc")) {
        const b = JSON.parse(init.body); window.__summarised = b;
        return new Response(JSON.stringify({ text: JSON.stringify({ summary: "تركيب فريم الطابق الأول مع نواقص في الزجاج", done: ["تركيب فريم الطابق الأول"],
          issues: ["السيليكون مقشر في الواجهة الخلفية"], needs: ["زجاج ثلاث شبابيك"], requests: ["تعديل باب المدخل"] }) }), { status: 200, headers: { "content-type": "application/json" } });
      }
      return of(url, init);
    };
  }, initArg: SAID });
  t.after(() => app.close());
  const { page } = app;
  await app.login("هشام", "1234");
  await app.openSite("s1");
  const issuesBefore = await app.eval(() => (__T.S.sites.s1.issues || []).length);

  await t.test("the button opens the recorder and the speech is written out", async () => {
    await page.click('[data-act="qvoice"]');
    await page.waitForTimeout(300);
    assert.ok(await page.isVisible(".vnsheet"));
    assert.match(await page.inputValue("#vn-text"), /ركبنا فريم الطابق الأول.*زجاج ثلاث شبابيك/);
  });

  await t.test("the summary is split into done / issues / needs / requests for review", async () => {
    await page.click('[data-act="vnsum"]');
    await page.waitForSelector("#vn-issues");
    assert.equal((await app.eval(() => window.__summarised)).kind, "notes");
    assert.equal(await page.inputValue("#vn-needs"), "زجاج ثلاث شبابيك");
    await page.fill("#vn-issues", "السيليكون مقشر في الواجهة الخلفية\nفتحة الشباك أكبر من المقاس");   // the user adds one while reviewing
  });

  await t.test("saving keeps the note on the site and adds each issue to the Issues tab", async () => {
    await page.click('[data-act="vnsave"]');
    await page.waitForTimeout(900);
    const s = (await app.db()).sites.s1.data;
    assert.equal(s.voiceNotes.length, 1);
    assert.deepEqual(s.voiceNotes[0].requests, ["تعديل باب المدخل"]);
    assert.equal(s.issues.length, issuesBefore + 2);
    assert.deepEqual(s.issues.slice(0, 2).map((x) => [x.text, x.status, x.src]), [["السيليكون مقشر في الواجهة الخلفية", "open", "voice"], ["فتحة الشباك أكبر من المقاس", "open", "voice"]]);
    assert.ok(!("voiceNotes" in (await app.db()).site_fin.s1.data), "notes are site data, not finance (engineers can add them)");
    assert.match(await app.text(), /ملاحظات الموقع/);
  });
  assert.deepEqual(app.errors, []);
});
