import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  adaptDreamSkinPackage,
  resolveDreamSkinThemeIdentifiers,
} from "../scripts/dreamskin-adapter.mjs";
import { createStoredZip } from "../scripts/theme-package.mjs";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function createFixture() {
  const imageBytes = await readFile(new URL("../assets/stage-black-gold-wuxia-hero-v1.png", import.meta.url));
  const sourceTheme = {
    id: "source-theme",
    appearance: "auto",
    colors: {
      background: "#060708",
      panel: "#101112ee",
      panelAlt: "#171819cc",
      accent: "#79c9a1",
      accentAlt: "#89d9b1",
      text: "#f7f7f4",
      muted: "#a8b8ae",
      line: "#79c9a144",
    },
    art: { focusX: 0.61, focusY: 0.42, safeArea: "left", taskMode: "full" },
  };
  const sourceManifest = {
    themeId: "theme_source",
    version: "1.2.3",
    license: "CC BY 4.0",
    publisher: { displayName: "Source publisher" },
    provenance: { summary: "Public DreamSkin package fixture" },
    files: [{
      path: "background.png",
      mediaType: "image/png",
      bytes: imageBytes.length,
      sha256: sha256(imageBytes),
    }],
  };
  const packageBytes = createStoredZip([
    { name: "manifest.json", contents: JSON.stringify(sourceManifest) },
    { name: "theme.json", contents: JSON.stringify(sourceTheme) },
    { name: "background.png", contents: imageBytes },
    { name: "theme.css", contents: "body { display: none !important; }" },
  ]);
  const sourceItem = {
    id: "ver_fixture123",
    slug: "adapted-fixture",
    name: "Adapter fixture",
    authorDisplayName: "Source author",
    license: "CC BY 4.0",
    version: "1.2.3",
    downloadCount: 42,
    packageBytes: packageBytes.length,
    packageSha256: sha256(packageBytes),
  };
  return { imageBytes, packageBytes, sourceItem };
}

test("DreamSkin adapter preserves the image bytes and emits only safe Paseo data", async () => {
  const fixture = await createFixture();
  const adapted = adaptDreamSkinPackage({
    packageBytes: fixture.packageBytes,
    popularRank: 1,
    sourceItem: fixture.sourceItem,
  });

  assert.deepEqual(adapted.imageBytes, fixture.imageBytes);
  assert.equal(sha256(adapted.imageBytes), adapted.catalogTheme.sourceImageSha256);
  assert.equal(adapted.themeManifest.integrity.sha256, adapted.catalogTheme.sourceImageSha256);
  assert.equal(adapted.themeManifest.appearance, "dark");
  assert.equal(adapted.themeManifest.colors.panel, "rgba(16, 17, 18, 0.933)");
  assert.equal(adapted.catalogTheme.sourcePackageSha256, fixture.sourceItem.packageSha256);
  assert.equal(Object.hasOwn(adapted.themeManifest, "css"), false);
  assert.equal(Object.hasOwn(adapted.themeManifest, "script"), false);
});

test("DreamSkin adapter rejects a package whose source hash changed", async () => {
  const fixture = await createFixture();
  const damaged = Buffer.from(fixture.packageBytes);
  damaged[damaged.length - 1] ^= 0xff;
  assert.throws(
    () => adaptDreamSkinPackage({ packageBytes: damaged, popularRank: 1, sourceItem: fixture.sourceItem }),
    /package integrity mismatch/,
  );
});

test("DreamSkin identifiers remain stable when popular themes reuse a slug", () => {
  const identifiers = resolveDreamSkinThemeIdentifiers([
    { id: "ver_unique1234567890", slug: "unique-theme" },
    { id: "ver_aaaaaaaa11111111", slug: "1" },
    { id: "ver_bbbbbbbb22222222", slug: "1" },
  ]);

  assert.deepEqual(identifiers, ["unique-theme", "1-aaaaaaaa", "1-bbbbbbbb"]);
  assert.equal(new Set(identifiers).size, identifiers.length);
});
