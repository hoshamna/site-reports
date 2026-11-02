"""Build the Aseel app from source/web into app/ (what Netlify publishes).

    python3 source/build.py          build app/index.html, app/sw.js, app/manifest.json
    python3 source/build.py --check  fail if app/ is not up to date with the source (used by the tests)

Source layout (see source/README.md):
    web/index.template.html   page shell with {{STYLE}}, {{DATA_LAYER}}, {{APP}} placeholders
    web/styles.css            the app stylesheet
    web/data-layer/*.js       Supabase layer: accounts, tables, private images, AI, push (one script, in file order)
    web/js/*.js               the app itself (one script, in file order, wrapped in a single function scope)
    web/sw.template.js        service worker; {{VERSION}} becomes a hash of the built page
"""
import hashlib, pathlib, sys

HERE = pathlib.Path(__file__).resolve().parent
WEB = HERE / "web"
OUT = HERE.parent / "app"


def read(p):
    return p.read_text(encoding="utf8")


def parts(folder):
    files = sorted((WEB / folder).glob("*.js"))
    if not files:
        sys.exit(f"no files in {folder}")
    return "".join(read(f) for f in files)


def build():
    page = read(WEB / "index.template.html")
    for key, value in (("{{STYLE}}", read(WEB / "styles.css")), ("{{DATA_LAYER}}", parts("data-layer")), ("{{APP}}", parts("js"))):
        if page.count(key) != 1:
            sys.exit(f"template must contain {key} exactly once")
        page = page.replace(key, value)
    version = hashlib.sha256(page.encode("utf8")).hexdigest()[:10]
    sw = read(WEB / "sw.template.js").replace("{{VERSION}}", version)
    return {"index.html": page, "sw.js": sw, "manifest.json": read(WEB / "manifest.json")}


def main():
    files = build()
    if "--check" in sys.argv:
        stale = [n for n, t in files.items() if not (OUT / n).exists() or read(OUT / n) != t]
        if stale:
            sys.exit("app/ is out of date with source/ — run: python3 source/build.py  (" + ", ".join(stale) + ")")
        print("app/ is up to date")
        return
    for n, t in files.items():
        (OUT / n).write_text(t, encoding="utf8")
    print(f"built app/index.html ({len(files['index.html'])} chars)")


if __name__ == "__main__":
    main()
