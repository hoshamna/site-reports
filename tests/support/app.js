// Test harness: serves the built app (app/) on a random port, swaps Supabase for an in-page
// stand-in (mock-supabase.js), blocks every outside network call, and exposes the app's
// internal functions to the tests as window.__T (only in the copy served to the tests).
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "../../app");
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const MOCK = fs.readFileSync(path.join(__dirname, "mock-supabase.js"), "utf8")
  .replace("__H1__", sha("aseel|u1|1234"))
  .replace("__H2__", sha("aseel|u2|5678"));

// internals the tests may call; the list is checked so a rename fails loudly
const HOOK = `window.__T={get S(){return S},get cuMe(){return cuMe},render,save,cuPut,users,calc,schedule,costs,laborAmt,supKey,supMatch,supCanon,cuCats,cuGuessCat,cuMissing,cuName,prevMonthOf,salaryDesc,salaryDue,aiWhy,needsXfer,holderShort,cuCalc,holderBal,delta,isExp,money};\n`;

function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let u = decodeURIComponent(req.url.split("?")[0]);
      if (u.startsWith("/signed/")) {
        res.writeHead(200, { "content-type": "image/svg+xml" });
        return res.end('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="#4a8"/></svg>');
      }
      let p = path.join(ROOT, u);
      if (!p.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
      if (p.endsWith("/")) p += "index.html";
      fs.readFile(p, (e, d) => {
        if (e) { res.writeHead(404); return res.end(); }
        if (p.endsWith("index.html")) {
          let t = d.toString("utf8"); const i = t.lastIndexOf("})();");
          d = Buffer.from(t.slice(0, i) + HOOK + t.slice(i));
        }
        const type = p.endsWith(".html") ? "text/html; charset=utf-8" : p.endsWith(".js") ? "text/javascript" : p.endsWith(".json") ? "application/json" : "application/octet-stream";
        res.writeHead(200, { "content-type": type }); res.end(d);
      });
    }).listen(0, "127.0.0.1", () => resolve(srv));
  });
}

// Opens the app. options.before(page) runs as an init script (e.g. to seed extra rows).
async function openApp(options = {}) {
  const srv = await serve();
  const url = `http://127.0.0.1:${srv.address().port}/`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 860 }, serviceWorkers: "block", acceptDownloads: true });
  await ctx.addInitScript({ content: MOCK });
  if (options.init) await ctx.addInitScript(options.init, options.initArg);
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) =>
    r.request().url().includes("supabase-js") ? r.fulfill({ status: 200, contentType: "text/javascript", body: "" }) : r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__T && document.querySelector("#app") && !/جارٍ التحميل/.test(document.querySelector("#app").textContent), null, { timeout: 15000 });
  const app = {
    page, errors, url,
    text: async () => (await page.textContent("#app")).replace(/\s+/g, " "),
    toast: async () => page.$eval(".toast", (e) => e.textContent).catch(() => ""),
    eval: (fn, arg) => page.evaluate(fn, arg),
    db: () => page.evaluate(() => window.__mockDB()),
    log: () => page.evaluate(() => window.__log.slice()),
    clearLog: () => page.evaluate(() => { window.__log.length = 0; }),
    async login(name, pin) {
      await page.click(`button.userbtn:has-text("${name}")`);
      await page.fill("#au-pin", pin);
      await page.click('[data-act="aulogin"]');
      await page.waitForTimeout(700);
    },
    async setPin(pin) {
      await page.waitForSelector("#au-new1");
      await page.fill("#au-new1", pin); await page.fill("#au-new2", pin);
      await page.click('[data-act="aupinset"]');
      await page.waitForTimeout(600);
    },
    async logout() {
      await page.click(".logoutbtn"); await page.click('[data-act="aulogout"]');
      await page.waitForSelector("button.userbtn");
    },
    async openSite(id) {
      await page.evaluate((sid) => { __T.S.view = "site"; __T.S.cur = sid; __T.S.lastSite = sid; __T.render(); }, id);
      await page.waitForTimeout(200);
    },
    async close() { await browser.close(); srv.close(); },
  };
  return app;
}

module.exports = { openApp };
