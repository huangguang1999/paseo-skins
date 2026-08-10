import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createVerifiedBrowserThemePackage } from "../site/theme-package-browser.js";
import { readZipEntries } from "../scripts/theme-package.mjs";

test("browser download builds a verified data-only Paseo package", async () => {
  const catalog = JSON.parse(await readFile(new URL("../site/catalog.json", import.meta.url), "utf8"));
  const sourceTheme = catalog.themes[0];
  const manifestUrl = new URL(sourceTheme.manifest, "https://themes.example/catalog.json").href;
  const previewUrl = new URL(sourceTheme.preview, "https://themes.example/catalog.json").href;
  const [manifestBytes, imageBytes] = await Promise.all([
    readFile(new URL(`../site/${sourceTheme.manifest.replace(/^\.\//, "")}`, import.meta.url)),
    readFile(new URL(`../site/${sourceTheme.preview.replace(/^\.\//, "")}`, import.meta.url)),
  ]);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url === manifestUrl) return new Response(manifestBytes);
    if (url === previewUrl) return new Response(imageBytes);
    return new Response(null, { status: 404 });
  };

  try {
    const { archive, filename } = await createVerifiedBrowserThemePackage({
      ...sourceTheme,
      manifestUrl,
      previewUrl,
    });
    const entries = readZipEntries(archive);
    assert.equal(filename, `${sourceTheme.id}-paseo-theme.zip`);
    assert.deepEqual(entries.get(`${sourceTheme.id}/${sourceTheme.preview.split("/").at(-1)}`), imageBytes);
    assert.ok(entries.has(`${sourceTheme.id}/${sourceTheme.manifest.split("/").at(-1)}`));
    assert.ok(entries.get(`${sourceTheme.id}/README.txt`).includes(sourceTheme.sourcePackageSha256));
    assert.equal([...entries.keys()].some((name) => name.endsWith("theme.css")), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
