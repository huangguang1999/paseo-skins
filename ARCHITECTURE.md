# Architecture

Paseo Skins is a data-only theme platform around a small, reversible CDP runtime. The website discovers and creates themes; the CLI validates and applies them; the renderer injection owns only visual state. No layer may patch `Paseo.app`, execute theme-provided code, or make a remote endpoint control the desktop app.

## Component boundaries

```text
site/catalog.json + Theme v2 assets
                │
                ├── site/                 static discovery, preview, Studio
                └── src/catalog-client    same-origin catalog resolution
                                      │
local/remote manifest ──► theme-loader ──► validated theme + verified image
                                      │
                              CLI orchestration
                     cli-options / cli-help / cli
                                      │
                     CDP target and watcher lifecycle
                                      │
                         renderer visual injection
```

- `src/theme-loader.mjs` is the single trust boundary for local Theme v1/v2 data and image integrity.
- `src/remote-theme.mjs` adds HTTPS, redirect, origin, size, and cache constraints before delegating to the loader.
- `src/cli-options.mjs` and `src/cli-help.mjs` are pure command-interface modules. `src/cli.mjs` orchestrates I/O and lifecycle operations.
- `src/cdp-client.mjs` owns target discovery, loopback WebSocket validation, screenshot capture, and watcher registration.
- `src/stage-black-gold-skin.mjs` is serialized into the renderer. It therefore remains self-contained and must provide a complete `destroy` path.
- `site/` never connects to local CDP. It operates on the public catalog and browser-local files only.

## Non-negotiable invariants

1. Theme packages are JSON plus one PNG, JPEG, or WebP image. They cannot contain executable JavaScript, SVG, fonts, or arbitrary CSS.
2. CDP endpoints and WebSocket URLs stay loopback-only and are matched to `paseo://app/` page targets.
3. The injected overlay stays `pointer-events: none`; `#root` remains visible and interactive.
4. Every modified inline style, observer, animation frame, document hook, style node, and overlay node is restored by `destroy`.
5. Interactive hover and selected backgrounds remain state-driven CSS. A computed hover color must never be frozen into an inline `!important` value.
6. `verify` checks the active theme by default. It enforces an exact theme identity only when the caller explicitly supplies `--theme` or `--theme-url`.
7. Public visual assets require a unique provenance entry. Personal dogfood themes and `tmp/` evidence are never release inputs.

## Change verification matrix

| Change area | Required checks |
|---|---|
| Theme schema or loader | loader, remote-theme, catalog, creator, Studio tests; `npm run release:check` |
| Renderer injection | self-contained VM tests, destroy/restore tests, `verify`, real Paseo screenshot and hover transition check |
| CLI command contract | parser unit tests, subprocess help/error tests, `doctor`/`status`/`verify` smoke checks |
| Website interaction | static build/tests plus desktop and 390 px real-browser interaction and screenshot review |
| Public image or manifest | integrity load, catalog uniqueness, provenance check, site link check |
| Autostart | plist/unit tests and live `autostart:status`; never reinstall or restart Paseo without explicit authorization |

## Intentional non-goals

- No modification of `app.asar`, code signatures, Paseo daemon data, or Agent data.
- No claim of Windows, Linux, or Intel Mac support without real-device evidence.
- No desktop theme manager until a browser plus CLI demonstrably cannot cover the required workflow.
- No generic plugin abstraction until at least two real consumers need the same extension boundary.

The architecture favors one validated theme contract and one reversible runtime over feature parity with projects that control a different desktop application lifecycle.
