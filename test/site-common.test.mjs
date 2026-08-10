import assert from "node:assert/strict";
import test from "node:test";

import { getApplyCommand, resolveCatalogTheme } from "../site/common.js";

const catalog = {
  themes: [
    { id: "first-theme", name: "First" },
    { id: "second-theme", name: "Second" },
  ],
};

test("catalog theme resolution is strict by default", () => {
  assert.equal(resolveCatalogTheme(catalog, "second-theme").summary.id, "second-theme");
  assert.throws(() => resolveCatalogTheme(catalog, "missing-theme"), /未找到主题/);
});

test("catalog theme resolution reports explicit fallback", () => {
  const result = resolveCatalogTheme(catalog, "missing-theme", { fallbackToFirst: true });
  assert.equal(result.summary.id, "first-theme");
  assert.equal(result.fallbackUsed, true);
  assert.equal(result.requestedThemeId, "missing-theme");
});

test("public site commands explicitly request persistent apply", () => {
  assert.equal(
    getApplyCommand("morning-mist"),
    "npx --yes github:huangguang1999/paseo-skins apply morning-mist --persist",
  );
});
