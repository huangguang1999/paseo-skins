import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { loadTheme } from "../src/theme-loader.mjs";

test("public themes use distinct backgrounds and manifests", async () => {
  const catalog = JSON.parse(
    await readFile(new URL("../site/catalog.json", import.meta.url), "utf8"),
  );
  const themeIdentifiers = catalog.themes.map((theme) => theme.id);
  const previews = catalog.themes.map((theme) => theme.preview);
  const manifests = catalog.themes.map((theme) => theme.manifest);

  assert.ok(catalog.themes.length >= 5, "the gallery should offer multiple visual directions");
  assert.equal(new Set(themeIdentifiers).size, catalog.themes.length);
  assert.equal(new Set(previews).size, catalog.themes.length);
  assert.equal(new Set(manifests).size, catalog.themes.length);

  for (const theme of catalog.themes) {
    const manifestUrl = new URL(`../site/${theme.manifest.replace(/^\.\//, "")}`, import.meta.url);
    const loadedTheme = await loadTheme(manifestUrl);
    assert.equal(loadedTheme.theme.id, theme.id);
    assert.equal(path.basename(loadedTheme.image.path), path.basename(theme.preview));
  }
});
