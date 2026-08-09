import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  loadTheme,
  parseImageMetadata,
  THEME_SCHEMA_URL,
  validateThemeManifest,
} from "../src/theme-loader.mjs";

test("loadTheme validates the bundled manifest and image metadata", async () => {
  const loadedTheme = await loadTheme();

  assert.equal(loadedTheme.theme.id, "stage-black-gold");
  assert.equal(loadedTheme.theme.schemaVersion, 2);
  assert.equal(loadedTheme.theme.$schema, THEME_SCHEMA_URL);
  assert.equal(loadedTheme.theme.integrity.algorithm, "sha256");
  assert.equal(loadedTheme.theme.version, "1.0.0");
  assert.equal(loadedTheme.theme.colors.panelAlt, "rgba(14, 13, 11, 0.74)");
  assert.equal(loadedTheme.theme.colors.glow, "#e8c377");
  assert.equal(loadedTheme.image.mediaType, "image/png");
  assert.equal(loadedTheme.image.width, 1672);
  assert.equal(loadedTheme.image.height, 941);
  assert.match(loadedTheme.image.dataUrl, /^data:image\/png;base64,/);
});

test("parseImageMetadata supports an extended WebP canvas", () => {
  const bytes = Buffer.alloc(30);
  bytes.write("RIFF", 0, "ascii");
  bytes.writeUInt32LE(22, 4);
  bytes.write("WEBP", 8, "ascii");
  bytes.write("VP8X", 12, "ascii");
  bytes.writeUInt32LE(10, 16);
  const widthMinusOne = 639;
  const heightMinusOne = 359;
  bytes[24] = widthMinusOne & 0xff;
  bytes[25] = (widthMinusOne >> 8) & 0xff;
  bytes[26] = (widthMinusOne >> 16) & 0xff;
  bytes[27] = heightMinusOne & 0xff;
  bytes[28] = (heightMinusOne >> 8) & 0xff;
  bytes[29] = (heightMinusOne >> 16) & 0xff;

  assert.deepEqual(parseImageMetadata(bytes), {
    height: 360,
    mediaType: "image/webp",
    width: 640,
  });
});

test("loadTheme rejects an integrity mismatch", async (context) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "paseo-theme-integrity-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const imageBytes = await readFile(
    new URL("../assets/stage-black-gold-wuxia-hero-v1.png", import.meta.url),
  );
  await writeFile(path.join(directory, "hero.png"), imageBytes);
  const manifest = JSON.parse(
    await readFile(new URL("../assets/stage-black-gold.theme.json", import.meta.url), "utf8"),
  );
  manifest.image = "hero.png";
  manifest.integrity.sha256 = "0".repeat(64);
  const manifestPath = path.join(directory, "theme.json");
  await writeFile(manifestPath, JSON.stringify(manifest));
  await assert.rejects(() => loadTheme(manifestPath), /sha256 does not match/);
});

test("Theme v2 rejects schema drift in nested objects", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../assets/stage-black-gold.theme.json", import.meta.url), "utf8"),
  );
  manifest.colors.untrusted = "#000000";
  assert.throws(() => validateThemeManifest(manifest), /unsupported fields: untrusted/);
  delete manifest.colors.untrusted;
  delete manifest.colors.panelAlt;
  assert.throws(() => validateThemeManifest(manifest), /colors\.panelAlt/);
});

test("Theme v2 accepts light appearance and rejects non-runtime appearance values", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../assets/stage-black-gold.theme.json", import.meta.url), "utf8"),
  );
  manifest.appearance = "light";
  assert.equal(validateThemeManifest(manifest).appearance, "light");
  manifest.appearance = "auto";
  assert.throws(() => validateThemeManifest(manifest), /appearance must be dark or light/);
});

test("loadTheme rejects a misleading image extension", async (context) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "paseo-theme-extension-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const imageBytes = await readFile(
    new URL("../assets/stage-black-gold-wuxia-hero-v1.png", import.meta.url),
  );
  await writeFile(path.join(directory, "hero.jpg"), imageBytes);
  const manifest = JSON.parse(
    await readFile(new URL("../assets/stage-black-gold.theme.json", import.meta.url), "utf8"),
  );
  manifest.image = "hero.jpg";
  const manifestPath = path.join(directory, "theme.json");
  await writeFile(manifestPath, JSON.stringify(manifest));
  await assert.rejects(() => loadTheme(manifestPath), /extension does not match/);
});

test("loadTheme validates a gallery color preset", async () => {
  const loadedTheme = await loadTheme(
    new URL("../site/themes/aurora-ridge.theme.json", import.meta.url),
  );

  assert.equal(loadedTheme.theme.id, "aurora-ridge");
  assert.equal(loadedTheme.theme.colors.accent, "#79c9a1");
  assert.equal(loadedTheme.image.mediaType, "image/jpeg");
  assert.equal(loadedTheme.image.width, 2400);
  assert.equal(loadedTheme.image.height, 1350);
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
