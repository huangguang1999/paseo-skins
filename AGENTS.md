# Repository guide for coding agents

Read [ARCHITECTURE.md](ARCHITECTURE.md), [CONTRIBUTING.md](CONTRIBUTING.md), and the nearest task-specific source before editing.

## Safety and scope

- Preserve the data-only Theme v2 boundary and the reversible CDP lifecycle.
- Never patch `Paseo.app`, `app.asar`, signatures, daemon state, or Agent data.
- Keep CDP loopback-only and preserve exact target/WebSocket validation.
- Do not hide or replace `#root`; injected visual layers must stay non-interactive.
- Do not commit `tmp/`, `_site/`, local screenshots, or personal themes under `assets/`.
- Do not copy third-party theme assets or source code. Every public visual file requires `ASSET_PROVENANCE.md` evidence.

## Implementation guidance

- Keep parsing/help logic pure in `src/cli-options.mjs` and `src/cli-help.mjs`; keep system I/O in `src/cli.mjs` or the owning subsystem.
- Keep theme validation in `src/theme-loader.mjs`; website and remote flows must not invent weaker parallel validators.
- `src/stage-black-gold-skin.mjs` is intentionally self-contained because it is serialized with `.toString()` into the renderer. Split only code that does not need to execute there.
- Interactive hover/selected visuals belong to CSS state, never persistent inline computed colors.
- Prefer focused changes over abstractions without a second real use case.

## Verification

- Run targeted tests while developing, then `npm run check` and `npm run release:check` before handoff.
- Renderer changes also require live `status`, `verify`, a screenshot, and a hover-in/hover-out check in Paseo.
- Website changes require desktop and 390 px real-browser checks; inspect screenshots rather than relying only on DOM assertions.
- A sub-agent report or successful build is input, not final verification. Review the diff and evidence directly.
