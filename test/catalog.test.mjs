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
  const packages = catalog.themes.map((theme) => theme.package);
  const publishedCatalog = JSON.parse(
    await readFile(new URL("../_site/catalog.json", import.meta.url), "utf8"),
  );

  assert.equal(catalog.themes.length, 30, "the public gallery should ship the complete 30-theme collection");
  assert.equal(new Set(themeIdentifiers).size, catalog.themes.length);
  assert.equal(new Set(previews).size, catalog.themes.length);
  assert.equal(new Set(manifests).size, catalog.themes.length);
  assert.equal(new Set(packages).size, catalog.themes.length);
  assert.deepEqual(
    catalog.themes.map((theme) => theme.popularRank).sort((a, b) => a - b),
    Array.from({ length: 30 }, (_, index) => index + 1),
    "popular ranks should be unique and contiguous",
  );

  for (const theme of catalog.themes) {
    assert.match(theme.version, /^\d+\.\d+\.\d+$/);
    assert.ok(Number.isInteger(theme.imageBytes) && theme.imageBytes > 0);
    assert.match(theme.package, /^\.\/packages\/[a-z0-9-]+-paseo-theme\.zip$/);
    assert.ok(Number.isInteger(theme.referenceDownloads) && theme.referenceDownloads > 0);
    assert.match(theme.inspirationSourceUrl, /^https:\/\/dreamskin\.cc\/gallery\?community=popular$/);
    assert.ok(theme.inspirationThemeName);
    const manifestUrl = new URL(`../site/${theme.manifest.replace(/^\.\//, "")}`, import.meta.url);
    const loadedTheme = await loadTheme(manifestUrl);
    assert.equal(loadedTheme.theme.id, theme.id);
    assert.equal(loadedTheme.theme.version, theme.version);
    assert.equal(loadedTheme.image.bytes, theme.imageBytes);
    assert.equal(path.basename(loadedTheme.image.path), path.basename(theme.preview));

    const publishedTheme = publishedCatalog.themes.find((item) => item.id === theme.id);
    assert.ok(publishedTheme.packageBytes > theme.imageBytes);
    const archive = await readFile(new URL(`../_site/${theme.package.replace(/^\.\//, "")}`, import.meta.url));
    assert.equal(archive.readUInt32LE(0), 0x04034b50, "download package should be a ZIP archive");
    assert.ok(archive.includes(Buffer.from(`${theme.id}/${path.basename(theme.manifest)}`)));
    assert.ok(archive.includes(Buffer.from(`${theme.id}/${path.basename(theme.preview)}`)));
  }
});
