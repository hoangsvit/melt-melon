# Architecture

Melt Melon remains a build-free GitHub Pages game. The refactor separates responsibilities without introducing a bundler or framework.

## Runtime order

1. `src/i18n/locales/*.js` registers translation catalogs.
2. `src/i18n/core.js` selects the locale, translates static/dynamic DOM text, and exposes `MelonI18n.t()` / `formatNumber()`.
3. `src/config/fruit-catalog.js` defines stable fruit IDs plus visual metadata.
4. `src/physics/soft-world.js` owns soft-body physics.
5. `src/game/melon-game.js` owns game state and rules.
6. `src/input/melon-input.js` translates pointer/keyboard input into game actions.
7. Rendering and feature modules add visuals, feedback, lessons, and motion inspection.
8. `src/app.js` wires modules together and owns page-level orchestration.

## Design rules

- Keep physics independent of the DOM.
- Keep game rules independent of rendering.
- Put user-facing text in locale catalogs. Chinese source strings act as gettext-style message IDs so existing markup can remain readable and build-free.
- Use placeholder messages (`{count}`, `{fruit}`, etc.) for dynamic text instead of string concatenation.
- Keep binary assets in `assets/`; never embed multi-megabyte base64 payloads in HTML/JS.
- Preserve classic script dependency order unless the project intentionally migrates to ES modules in a dedicated change.

## Adding a language

Copy one file in `src/i18n/locales/`, translate every existing key, add the locale metadata in `src/i18n/core.js`, and add the script to `index.html`. `scripts/validate_static.py` checks locale-key parity and static translation coverage.

## Validation

Run:

```bash
python3 scripts/validate_static.py
find src -name '*.js' -print0 | xargs -0 -n1 node --check
```
