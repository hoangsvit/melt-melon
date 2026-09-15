#!/usr/bin/env python3
"""One-time migration from the single-file build to maintainable static sources.

The game intentionally remains build-free: GitHub Pages can serve index.html directly.
This script only changes file layout; it does not rewrite gameplay logic.
"""

from __future__ import annotations

import base64
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
MARKER = '<link rel="stylesheet" href="./src/styles/main.css">'

SCRIPT_PATHS = [
    "src/config/fruit-catalog.js",
    "src/physics/soft-world.js",
    "src/game/melon-game.js",
    "src/input/melon-input.js",
    "src/rendering/fruit-painter.js",
    "src/features/softening-lesson.js",
    "src/rendering/melon-feedback.js",
    "src/features/motion-lab.js",
]


def write_text(relative_path: str, content: str) -> None:
    path = ROOT / relative_path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.strip() + "\n", encoding="utf-8")


def main() -> None:
    html = INDEX.read_text(encoding="utf-8")
    if MARKER in html:
        print("index.html is already refactored; nothing to do.")
        return

    style_matches = list(re.finditer(r"<style\b[^>]*>(.*?)</style>", html, re.I | re.S))
    script_matches = list(re.finditer(r"<script\b([^>]*)>(.*?)</script>", html, re.I | re.S))

    if len(style_matches) != 1:
        raise RuntimeError(f"Expected exactly 1 inline style block, found {len(style_matches)}")
    if len(script_matches) != 9:
        raise RuntimeError(f"Expected exactly 9 inline script blocks, found {len(script_matches)}")

    write_text("src/styles/main.css", style_matches[0].group(1))

    for relative_path, match in zip(SCRIPT_PATHS, script_matches[:8], strict=True):
        write_text(relative_path, match.group(2))

    final_script = script_matches[8].group(2)
    atlas_match = re.search(
        r"window\.MELON_ATLAS\s*=\s*(['\"])data:image/png;base64,([A-Za-z0-9+/=]+)\1\s*;",
        final_script,
        re.S,
    )
    if not atlas_match:
        raise RuntimeError("Could not find embedded fruit atlas")

    atlas_bytes = base64.b64decode(atlas_match.group(2), validate=True)
    assets_dir = ROOT / "assets"
    assets_dir.mkdir(parents=True, exist_ok=True)
    (assets_dir / "fruit-atlas.png").write_bytes(atlas_bytes)

    app_script = final_script[: atlas_match.start()] + final_script[atlas_match.end() :]
    write_text(
        "src/assets.js",
        """(function () {\n  'use strict';\n  window.MELON_ATLAS = './assets/fruit-atlas.png';\n})();""",
    )
    write_text("src/app.js", app_script)

    # Replace the inline stylesheet while preserving its original document position.
    style = style_matches[0]
    html = html[: style.start()] + MARKER + html[style.end() :]

    # Re-scan after changing the stylesheet because offsets have shifted.
    script_matches = list(re.finditer(r"<script\b([^>]*)>(.*?)</script>", html, re.I | re.S))
    replacements = [
        f'<script src="./{path}"></script>' for path in SCRIPT_PATHS
    ] + [
        '<script src="./src/assets.js"></script>\n<script src="./src/app.js"></script>'
    ]

    for match, replacement in reversed(list(zip(script_matches, replacements, strict=True))):
        html = html[: match.start()] + replacement + html[match.end() :]

    html = html.replace(
        "</head>",
        "  <meta name=\"description\" content=\"A build-free soft-body fruit merge game.\">\n</head>",
        1,
    )
    INDEX.write_text(html, encoding="utf-8")

    print("Refactor complete:")
    print("- extracted CSS to src/styles/main.css")
    print("- extracted 8 domain scripts and app bootstrap")
    print(f"- decoded fruit atlas to assets/fruit-atlas.png ({len(atlas_bytes)} bytes)")
    print("- index.html remains build-free for GitHub Pages")


if __name__ == "__main__":
    main()
