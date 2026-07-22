import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { loadThemeCatalog, validateThemeCatalog } from "../src/catalog-client.mjs";

test("public catalog resolves same-origin theme assets", async () => {
  const rawCatalog = JSON.parse(
    await readFile(new URL("../site/catalog.json", import.meta.url), "utf8"),
  );
  const catalog = validateThemeCatalog(
    rawCatalog,
    "https://huangguang1999.github.io/paseo-skins/catalog.json",
  );
  assert.equal(catalog.themes.length, rawCatalog.themes.length);
  assert.ok(catalog.themes.every((theme) => theme.manifestUrl.startsWith("https://huangguang1999.github.io/paseo-skins/")));
});

test("catalog rejects duplicate identifiers and cross-origin assets", () => {
  const baseTheme = {
    id: "night",
    name: "夜色",
    englishName: "Night",
    description: "Night theme",
    tags: [],
    preview: "./themes/night.jpg",
    manifest: "./themes/night.theme.json",
  };
  assert.throws(
    () => validateThemeCatalog({ schemaVersion: 1, name: "X", themes: [baseTheme, baseTheme] }),
    /duplicated/,
  );
  assert.throws(
    () => validateThemeCatalog({
      schemaVersion: 1,
      name: "X",
      themes: [{ ...baseTheme, preview: "https://example.com/night.jpg" }],
    }),
    /catalog origin/,
  );
});

test("catalog download rejects credentials and cross-origin redirects", async () => {
  await assert.rejects(
    () => loadThemeCatalog("https://user:secret@example.com/catalog.json"),
    /must not contain credentials/,
  );
  await assert.rejects(
    () => loadThemeCatalog("https://themes.example.com/catalog.json", {
      fetchImplementation: async () => new Response(null, {
        status: 302,
        headers: { location: "https://cdn.example.net/catalog.json" },
      }),
    }),
    /redirects must remain on https:\/\/themes\.example\.com/,
  );
});
