import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { loadTheme } from "../src/theme-loader.mjs";
import { createThemePackage } from "../scripts/theme-package.mjs";

const expectedPopularThemeNames = [
  "晨雾山水",
  "休闲室内居家",
  "mikuu full background",
  "保险柜 办公室 卡通 DreamSkin 2560x1440",
  "悟空（WUKONG）",
  "三上悠亚",
];

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

  assert.equal(catalog.source.sort, "popular");
  assert.equal(catalog.source.url, "https://dreamskin.cc/gallery?community=popular");
  assert.ok(Number.isFinite(Date.parse(catalog.source.capturedAt)));
  assert.equal(catalog.themes.length, catalog.source.total, "the public gallery should ship the complete captured collection");
  assert.ok(catalog.themes.length >= 259, "the complete collection must not regress to the former top-30 subset");
  assert.equal(new Set(themeIdentifiers).size, catalog.themes.length);
  assert.equal(new Set(previews).size, catalog.themes.length);
  assert.equal(new Set(manifests).size, catalog.themes.length);
  assert.equal(new Set(packages).size, catalog.themes.length);
  assert.deepEqual(catalog.themes.slice(0, expectedPopularThemeNames.length).map((theme) => theme.name), expectedPopularThemeNames);
  assert.deepEqual(
    catalog.themes.map((theme) => theme.popularRank).sort((a, b) => a - b),
    Array.from({ length: catalog.themes.length }, (_, index) => index + 1),
    "popular ranks should be unique and contiguous",
  );
  for (let index = 1; index < catalog.themes.length; index += 1) {
    assert.ok(
      catalog.themes[index - 1].sourceDownloads >= catalog.themes[index].sourceDownloads,
      `popular downloads should stay descending at rank ${index + 1}`,
    );
  }

  for (const theme of catalog.themes) {
    assert.match(theme.version, /^\d+\.\d+\.\d+$/);
    assert.ok(Number.isInteger(theme.imageBytes) && theme.imageBytes > 0);
    assert.match(theme.package, /^\.\/packages\/[a-z0-9-]+-paseo-theme\.zip$/);
    assert.ok(Number.isInteger(theme.sourceDownloads) && theme.sourceDownloads > 0);
    assert.match(theme.sourceUrl, /^https:\/\/api\.dreamskin\.cc\/v1\/themes\/ver_[a-z0-9]+\/download$/);
    assert.match(theme.sourcePackageSha256, /^[a-f0-9]{64}$/);
    assert.match(theme.sourceImageSha256, /^[a-f0-9]{64}$/);
    assert.match(theme.sourceVersionId, /^ver_[a-z0-9]+$/);
    assert.ok(theme.sourceLicense);
    assert.ok(theme.sourcePublisher);
    assert.ok(Number.isFinite(Date.parse(theme.sourceReviewedAt)));
    assert.ok(Number.isFinite(Date.parse(theme.sourceSubmittedAt)));
    assert.doesNotMatch(theme.description, /重绘|灵感参考/);
    const manifestUrl = new URL(`../site/${theme.manifest.replace(/^\.\//, "")}`, import.meta.url);
    const loadedTheme = await loadTheme(manifestUrl);
    assert.equal(loadedTheme.theme.id, theme.id);
    assert.equal(loadedTheme.theme.version, theme.version);
    assert.equal(loadedTheme.image.bytes, theme.imageBytes);
    assert.equal(loadedTheme.theme.integrity.sha256, theme.sourceImageSha256);
    assert.equal(path.basename(loadedTheme.image.path), path.basename(theme.preview));

    const publishedTheme = publishedCatalog.themes.find((item) => item.id === theme.id);
    const [manifestBytes, imageBytes] = await Promise.all([
      readFile(manifestUrl),
      readFile(new URL(`../site/${theme.preview.replace(/^\.\//, "")}`, import.meta.url)),
    ]);
    const archive = createThemePackage({
      identifier: theme.id,
      imageFilename: path.basename(theme.preview),
      imageBytes,
      manifestFilename: path.basename(theme.manifest),
      manifestBytes,
      sourceAuthor: theme.author,
      sourceLicense: theme.sourceLicense,
      sourceImageSha256: theme.sourceImageSha256,
      sourcePackageSha256: theme.sourcePackageSha256,
      sourceUrl: theme.sourceUrl,
      sourceVersionId: theme.sourceVersionId,
    });
    assert.equal(publishedTheme.packageBytes, archive.length);
    assert.equal(archive.readUInt32LE(0), 0x04034b50, "download package should be a ZIP archive");
    assert.ok(archive.includes(Buffer.from(`${theme.id}/${path.basename(theme.manifest)}`)));
    assert.ok(archive.includes(Buffer.from(`${theme.id}/${path.basename(theme.preview)}`)));
    assert.ok(archive.includes(Buffer.from("Original DreamSkin package")));
    assert.ok(archive.includes(Buffer.from(theme.sourcePackageSha256)));
    assert.ok(archive.includes(Buffer.from(theme.sourceImageSha256)));
    assert.ok(archive.includes(Buffer.from(theme.sourceVersionId)));
    assert.equal(archive.includes(Buffer.from("theme.css")), false);
  }
  await assert.rejects(
    access(new URL("../_site/packages", import.meta.url)),
    (error) => error.code === "ENOENT",
    "browser-generated packages must not be duplicated into the Pages artifact",
  );
});
