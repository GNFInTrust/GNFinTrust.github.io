#!/usr/bin/env python3
"""Refresh/check CSP hashes and syntax-check all executable website scripts."""
import argparse
import base64
import hashlib
from html.parser import HTMLParser
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
CSP = re.compile(r'(<meta http-equiv="Content-Security-Policy" content=")([^"]+)(")', re.I)


class Page(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=False)
        self.scripts = []
        self.current = None
        self.handlers = []
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.handlers.extend(key for key in attrs if key.startswith("on"))
        if tag == "script" and "src" not in attrs:
            self.current = {"type": attrs.get("type", "text/javascript"), "code": ""}

    def handle_data(self, data):
        if self.current is not None:
            self.current["code"] += data

    def handle_endtag(self, tag):
        if tag == "script" and self.current is not None:
            self.scripts.append(self.current)
            self.current = None


def policy(source):
    page = Page(source)
    if page.handlers:
        raise ValueError("Inline event handlers are forbidden: " + ", ".join(page.handlers))
    match = CSP.search(source)
    if not match:
        raise ValueError("Missing CSP meta tag")
    hashes = ["'sha256-" + base64.b64encode(hashlib.sha256(script["code"].encode()).digest()).decode() + "'" for script in page.scripts]
    script_policy = "script-src 'self' https://www.gstatic.com/firebasejs/10.12.0/ https://apis.google.com"
    script_policy += (" " + " ".join(hashes)) if hashes else ""
    value = re.sub(r"script-src[^;]*", script_policy, match[2])
    value = value.replace("base-uri 'self'", "base-uri 'none'")
    return source[:match.start(2)] + value + source[match.end(2):], page


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    errors = []
    for file in sorted(ROOT.glob("*.html")):
        original = file.read_bytes()
        source = original.decode().replace("\r\n", "\n")
        try:
            updated, page = policy(source)
            if updated != source:
                if args.write:
                    file.write_bytes(updated.replace("\n", "\r\n").encode() if b"\r\n" in original else updated.encode())
                else:
                    errors.append(f"{file.name}: stale CSP hashes; run python scripts/check_site.py --write")
            for index, script in enumerate(page.scripts):
                if script["type"] not in ("module", "text/javascript", "application/javascript"):
                    continue
                result = subprocess.run(["node", "--check", "--input-type=" + ("module" if script["type"] == "module" else "commonjs")], input=script["code"], text=True, capture_output=True)
                if result.returncode:
                    errors.append(f"{file.name} script {index}: {result.stderr}")
        except ValueError as error:
            errors.append(f"{file.name}: {error}")
    for file in [ROOT / "catalog.js", ROOT / "firebase-config.js", *(ROOT / "GNTools-client").glob("*.js")]:
        result = subprocess.run(["node", "--check", str(file)], capture_output=True, text=True)
        if result.returncode:
            errors.append(f"{file.name}: {result.stderr}")
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print("Website CSP hashes and JavaScript syntax passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
