import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { loadTheme } from "../src/theme-loader.mjs";

test("loadTheme validates the bundled manifest and image metadata", async () => {
  const loadedTheme = await loadTheme();

  assert.equal(loadedTheme.theme.id, "stage-black-gold");
  assert.equal(loadedTheme.theme.version, "1.0.0");
  assert.equal(loadedTheme.theme.colors.panelAlt, "rgba(14, 13, 11, 0.74)");
  assert.equal(loadedTheme.theme.colors.glow, "#e8c377");
  assert.equal(loadedTheme.image.mediaType, "image/png");
  assert.equal(loadedTheme.image.width, 1672);
  assert.equal(loadedTheme.image.height, 941);
  assert.match(loadedTheme.image.dataUrl, /^data:image\/png;base64,/);
});

test("loadTheme validates a gallery color preset", async () => {
  const loadedTheme = await loadTheme(
    new URL("../site/themes/cold-moon-wuxia.theme.json", import.meta.url),
  );

  assert.equal(loadedTheme.theme.id, "cold-moon-wuxia");
  assert.equal(loadedTheme.theme.colors.accent, "#8fc5dd");
  assert.equal(loadedTheme.image.mediaType, "image/png");
  assert.equal(loadedTheme.image.width, 1672);
  assert.equal(loadedTheme.image.height, 941);
});

test("loadTheme rejects images outside the manifest directory", async (context) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "paseo-skin-theme-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const manifestPath = path.join(directory, "unsafe.theme.json");
  await writeFile(
    manifestPath,
    JSON.stringify({
      schemaVersion: 1,
      id: "unsafe",
      version: "1.0.0",
      name: "Unsafe",
      description: "Unsafe fixture",
      image: "../outside.png",
      appearance: "dark",
      art: { focusX: 0.5, focusY: 0.5, homeOpacity: 1, workspaceOpacity: 0.3, utilityOpacity: 0.5 },
      colors: {
        background: "#050505",
        panel: "#101010",
        accent: "#d9b86f",
        text: "#ffffff",
        muted: "#aaaaaa",
        line: "#333333"
      }
    }),
  );

  await assert.rejects(() => loadTheme(manifestPath), /must stay beside its manifest/);
});
