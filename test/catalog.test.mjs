import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { loadTheme } from "../src/theme-loader.mjs";

const expectedPopularThemeNames = [
  "晨雾山水", "休闲室内居家", "mikuu full background", "保险柜 办公室 卡通 DreamSkin 2560x1440",
  "悟空（WUKONG）", "三上悠亚", "firefly", "月下松岚", "DeepSeek-鲸鱼娘", "芙宁娜 小白袜",
  "寂静星轨", "橘子洲头-毛主席", "灵感小宇宙", "清透定制", "安静氛围 森林", "46 morning 4k",
  "大肥鱼（8.1）", "miku-猛男版", "人民的AI", "art", "202509061917596371", "云上仙途",
  "好看户外治愈", "【哲风壁纸】凡人修仙传 古建", "海岸", "雨过青瓷", "mingchao_yongzhuang",
  "三体-智子", "Cyber · 紫罗兰永恒花园 · Violet Evergarden", "缎带夜曲 · Ribbon Nocturne",
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

  assert.equal(catalog.themes.length, 30, "the public gallery should ship the complete 30-theme collection");
  assert.equal(new Set(themeIdentifiers).size, catalog.themes.length);
  assert.equal(new Set(previews).size, catalog.themes.length);
  assert.equal(new Set(manifests).size, catalog.themes.length);
  assert.equal(new Set(packages).size, catalog.themes.length);
  assert.deepEqual(catalog.themes.map((theme) => theme.name), expectedPopularThemeNames);
  assert.deepEqual(
    catalog.themes.map((theme) => theme.popularRank).sort((a, b) => a - b),
    Array.from({ length: 30 }, (_, index) => index + 1),
    "popular ranks should be unique and contiguous",
  );

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
    assert.doesNotMatch(theme.description, /重绘|灵感参考/);
    const manifestUrl = new URL(`../site/${theme.manifest.replace(/^\.\//, "")}`, import.meta.url);
    const loadedTheme = await loadTheme(manifestUrl);
    assert.equal(loadedTheme.theme.id, theme.id);
    assert.equal(loadedTheme.theme.version, theme.version);
    assert.equal(loadedTheme.image.bytes, theme.imageBytes);
    assert.equal(loadedTheme.theme.integrity.sha256, theme.sourceImageSha256);
    assert.equal(path.basename(loadedTheme.image.path), path.basename(theme.preview));

    const publishedTheme = publishedCatalog.themes.find((item) => item.id === theme.id);
    assert.ok(publishedTheme.packageBytes > theme.imageBytes);
    const archive = await readFile(new URL(`../_site/${theme.package.replace(/^\.\//, "")}`, import.meta.url));
    assert.equal(archive.readUInt32LE(0), 0x04034b50, "download package should be a ZIP archive");
    assert.ok(archive.includes(Buffer.from(`${theme.id}/${path.basename(theme.manifest)}`)));
    assert.ok(archive.includes(Buffer.from(`${theme.id}/${path.basename(theme.preview)}`)));
    assert.ok(archive.includes(Buffer.from("Original DreamSkin package")));
    assert.ok(archive.includes(Buffer.from(theme.sourcePackageSha256)));
    assert.ok(archive.includes(Buffer.from(theme.sourceImageSha256)));
    assert.ok(archive.includes(Buffer.from(theme.sourceVersionId)));
    assert.equal(archive.includes(Buffer.from("theme.css")), false);
  }
});
