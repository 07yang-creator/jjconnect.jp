#!/usr/bin/env python3
"""Render each page to PNG for visual review.
Setup: pip install playwright --break-system-packages && playwright install chromium
Usage: python3 tools/shot.py [desktop|mobile]   (default: both)
Writes .screenshots/*.png and prints any page errors."""
import sys, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / ".screenshots"; OUT.mkdir(exist_ok=True)
MODES = {"desktop": {"width": 1200, "height": 1000}, "mobile": {"width": 390, "height": 860}}
want = sys.argv[1:] or list(MODES)

with sync_playwright() as p:
    b = p.chromium.launch()
    for mode in want:
        pg = b.new_page(viewport=MODES[mode])
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        for name in ("quiz", "benseki", "fukushu"):
            pg.goto((ROOT / "dist" / f"{name}.html").as_uri())
            pg.wait_for_timeout(500)
            if name == "quiz":          # answer one question so the stamp/explanation render
                pg.keyboard.press("1"); pg.wait_for_timeout(400)
            pg.screenshot(path=str(OUT / f"{name}-{mode}.png"), full_page=(name != "quiz"))
            print(f"  {name}-{mode}.png", "ERRORS: " + "; ".join(errs) if errs else "")
            errs.clear()
    b.close()
print(f"screenshots in {OUT}")
