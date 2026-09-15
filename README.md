# Soft Watermelon

A no-build H5 merge game with responsive desktop/mobile controls, tutorial flows, softening/tilting mechanics, and multilingual UI.

Original game inspiration: https://github.com/ahgv/h5-mota/

## Architecture

The project keeps the existing standalone game payload intact while separating the page launcher and localization layer:

- `index.html` — lightweight entry point.
- `game.html` — original self-contained game bundle (HTML, CSS, JavaScript, and artwork).
- `src/bootstrap.js` — loads `game.html` and injects the localization layer before the game starts.
- `src/locales.js` — translation dictionaries.
- `src/i18n.js` — locale detection, runtime DOM/canvas translation, and language switcher.
- `src/i18n.css` — isolated styles for the language switcher.

This keeps GitHub Pages deployment build-free and makes future UI/i18n work possible without editing the multi-megabyte game bundle for every translation change.

## Languages

- Simplified Chinese (`zh-CN`, original)
- English (`en`)
- Vietnamese (`vi`)

Locale priority is:

1. `?lang=` query parameter
2. saved language in `localStorage`
3. browser language
4. Simplified Chinese fallback

Examples:

```text
/?lang=zh-CN
/?lang=en
/?lang=vi
```

To add a language, add its dictionary to `src/locales.js`, add the locale code to `SUPPORTED` in `src/i18n.js`, and extend dynamic message formatting where needed.

## Game features

- Drag/drop fruit placement and 11 merge levels: blueberry → watermelon.
- Score, best score, and next-fruit preview.
- Merge progression guide.
- “Soften” action and slow-motion teaching flow.
- Dedicated softening practice mode.
- Responsive phone/tablet/desktop layout.
- Keyboard and accessible labels.
