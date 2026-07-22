import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createThemeFromImage,
  deriveThemeColors,
  parseBitmapPixels,
  slugifyThemeIdentifier,
} from "../src/theme-creator.mjs";
import { loadTheme } from "../src/theme-loader.mjs";

function createTwoPixelBitmap() {
  const bytes = Buffer.alloc(62);
  bytes.write("BM", 0, "ascii");
  bytes.writeUInt32LE(bytes.length, 2);
  bytes.writeUInt32LE(54, 10);
  bytes.writeUInt32LE(40, 14);
  bytes.writeInt32LE(2, 18);
  bytes.writeInt32LE(-1, 22);
  bytes.writeUInt16LE(1, 26);
  bytes.writeUInt16LE(24, 28);
  bytes.writeUInt32LE(0, 30);
  bytes.writeUInt32LE(8, 34);
  bytes.set([20, 80, 220, 40, 180, 80, 0, 0], 54);
  return bytes;
}

test("bitmap parsing and palette generation are deterministic", () => {
  const bitmap = parseBitmapPixels(createTwoPixelBitmap());
  assert.deepEqual([...bitmap.pixels], [220, 80, 20, 80, 180, 40]);
  const colors = deriveThemeColors(bitmap.pixels);
  assert.match(colors.accent, /^#[0-9a-f]{6}$/);
  assert.match(colors.panel, /^rgba\(/);
  assert.equal(deriveThemeColors(bitmap.pixels).accent, colors.accent);
});

test("slugifyThemeIdentifier produces portable identifiers", () => {
  assert.equal(slugifyThemeIdentifier("Aurora Ridge 2026"), "aurora-ridge-2026");
  assert.equal(slugifyThemeIdentifier("极光雪境"), null);
});

test("createThemeFromImage writes and validates a v2 theme", async (context) => {
  const outputDirectory = await mkdtemp(path.join(os.tmpdir(), "paseo-theme-create-test-"));
  context.after(() => rm(outputDirectory, { force: true, recursive: true }));
  const created = await createThemeFromImage({
    identifier: "generated-aurora",
    imagePath: new URL("../site/themes/aurora-ridge.jpg", import.meta.url),
    name: "生成极光",
    outputDirectory,
    paletteSampler: async () => ({
      background: "#060c0a",
      panel: "rgba(6, 12, 10, 0.93)",
      panelAlt: "rgba(12, 30, 22, 0.78)",
      accent: "#79c9a1",
      glow: "#8bd3af",
      text: "#f7f7f4",
      muted: "#a8b8ae",
      line: "rgba(121, 201, 161, 0.24)",
    }),
  });
  const loaded = await loadTheme(created.manifestOutputPath);
  assert.equal(loaded.theme.schemaVersion, 2);
  assert.equal(loaded.theme.id, "generated-aurora");
  assert.equal(loaded.theme.integrity.sha256, created.manifest.integrity.sha256);
  await assert.rejects(
    () => createThemeFromImage({
      identifier: "generated-aurora",
      imagePath: new URL("../site/themes/aurora-ridge.jpg", import.meta.url),
      name: "生成极光",
      outputDirectory,
      paletteSampler: async () => created.colors,
    }),
    /already exists/,
  );
});
