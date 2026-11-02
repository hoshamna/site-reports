// app/ (what Netlify publishes) must always be built from source/.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("child_process");
const path = require("path");

test("app/ is up to date with source/", () => {
  const out = execFileSync("python3", [path.resolve(__dirname, "../source/build.py"), "--check"], { encoding: "utf8" });
  assert.match(out, /up to date/);
});
