# Melt Melon

A build-free soft-body fruit merge game for GitHub Pages. The project uses Canvas and vanilla JavaScript, with no framework or bundling step.

## Languages

The UI supports Simplified Chinese, English, Vietnamese, Japanese, and Korean. The first visit follows the browser language when supported, and the selected language is saved locally.

## Project structure

```text
assets/                     # Binary artwork
src/
  config/                   # Stable game/catalog metadata
  physics/                  # Soft-body simulation
  game/                     # Game rules and state
  input/                    # Pointer/keyboard input
  rendering/                # Fruit renderer and feedback effects
  features/                 # Softening lesson and motion lab
  i18n/                     # Translation runtime + locale catalogs
  styles/                   # Page styles
  app.js                    # Page orchestration/bootstrap
scripts/                    # Static validation
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for module boundaries and contribution rules.

## Run locally

You can open `index.html` directly, or serve the repository root with any static server. No install/build step is required.

## Controls

Move the pointer or use the arrow keys to aim. Click/release or press Enter to drop a fruit. Press Space to soften the pool, A/D to tilt, and P to pause.

## Quality checks

```bash
python3 scripts/validate_static.py
find src -name '*.js' -print0 | xargs -0 -n1 node --check
```

The same checks run in GitHub Actions on pull requests and pushes to `main`.
