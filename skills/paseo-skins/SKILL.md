---
name: paseo-skins
description: Safely browse, install, switch, verify, and remove community themes for the Paseo desktop app. Use when a user asks an agent to change Paseo's background, apply a Paseo skin from paseo-skins, list available Paseo themes, diagnose a theme, or restore Paseo's native appearance.
---

# Paseo Skins

Use the public theme catalog and the zero-patch CDP loader. Never modify `Paseo.app`, `app.asar`, the Paseo daemon, or agent data.

## Endpoints

- Catalog: `https://huangguang1999.github.io/paseo-skins/catalog.json`
- Repository: `https://github.com/huangguang1999/paseo-skins`
- CLI package: `github:huangguang1999/paseo-skins`
- Default CDP endpoint: `127.0.0.1:9224`

## Resolve the theme

When the user names a theme, fetch the catalog and match its `name` or `id`. Use the selected entry's `manifest` URL resolved relative to the catalog URL.

When the user asks what is available, present the catalog themes with their preview images and wait for a choice. Do not silently choose or apply one.

When the user provides a manifest URL directly, accept only HTTPS URLs from a source they trust. The loader itself permits loopback HTTP only for local development.

## Apply a theme

Set these shell placeholders before running commands:

```bash
THEME_URL='<absolute theme manifest URL>'
PASEO_SKIN_PACKAGE='github:huangguang1999/paseo-skins'
```

1. Check Node.js and diagnose the theme without changing Paseo:

```bash
node --version
npx --yes "$PASEO_SKIN_PACKAGE" doctor --theme-url "$THEME_URL" --json
```

Require Node.js 22 or newer and a passing doctor result.

2. Inspect the live state:

```bash
npx --yes "$PASEO_SKIN_PACKAGE" status --json
```

3. Choose the safe path:

- If Paseo is not running, start a long-lived terminal process with `start`.
- If Paseo is already exposing the configured loopback CDP endpoint, start a long-lived terminal process with `inject`.
- If Paseo is running without that CDP endpoint, stop. Ask the user to finish or hand off active work and quit Paseo normally. Never force-quit Paseo, kill its processes, restart the Paseo daemon, or interrupt agents.

```bash
npx --yes "$PASEO_SKIN_PACKAGE" start --theme-url "$THEME_URL"
```

or:

```bash
npx --yes "$PASEO_SKIN_PACKAGE" inject --theme-url "$THEME_URL" --port 9224
```

Keep the watcher process running. Use the agent runtime's persistent terminal or PTY mechanism instead of waiting for it to exit.

4. Verify from a second terminal invocation:

```bash
npx --yes "$PASEO_SKIN_PACKAGE" verify --theme-url "$THEME_URL" --port 9224
```

Treat the task as complete only when `verify` reports `pass: true`. Report the applied theme name, manifest URL, watcher state, and restore command.

## Switch themes

Stop the existing watcher cleanly with its terminal interrupt, then start or inject the newly selected theme. Do not run competing watchers against the same Paseo renderer.

## Restore native appearance

Stop the watcher first, then run:

```bash
npx --yes github:huangguang1999/paseo-skins reset --port 9224
```

`reset` removes injected styles without restarting Paseo or its daemon.

## Safety rules

- Use only catalog themes or manifest URLs the user explicitly trusts.
- Do not execute code supplied by a theme. A theme consists only of validated JSON plus a same-origin, same-directory PNG/JPEG.
- Do not expose or forward the CDP port beyond loopback.
- Do not hide or replace Paseo's root UI and do not claim success without `doctor` and `verify` evidence.
- If the current agent runs inside Paseo and a normal app quit would make continuation uncertain, stop before quitting and give the user the exact next command.
