import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const outputRoot = path.join(repositoryRoot, "_site");

const catalog = JSON.parse(await readFile(path.join(repositoryRoot, "site/catalog.json"), "utf8"));

function extractJsonLd(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((match) => JSON.parse(match[1]));
}

test("homepage exposes canonical, social, and software metadata", async () => {
  const html = await readFile(path.join(outputRoot, "index.html"), "utf8");
  assert.match(html, /<link rel="canonical" href="https:\/\/huangguang1999\.github\.io\/paseo-skins\/"/);
  assert.match(html, /<meta property="og:image" content="https:\/\/huangguang1999\.github\.io\/paseo-skins\/social-preview\.png"/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image"/);
  assert.match(html, /<meta property="og:image:type" content="image\/png"/);
  assert.match(html, /<link rel="alternate" href="\.\/catalog\.json" type="application\/json"/);
  assert.doesNotMatch(html, /__SOFTWARE_VERSION__/);
  assert.equal((html.match(/href="\.\/themes\/[a-z0-9-]+\/"/g) ?? []).length, catalog.themes.length);
  assert.match(html, /id="builder"/);
  assert.match(html, /theme-builder\.js/);

  const [structuredData] = extractJsonLd(html);
  const software = structuredData["@graph"].find((entry) => entry["@type"] === "SoftwareApplication");
  assert.equal(software.name, "Paseo Skins");
  assert.equal(software.operatingSystem, "macOS");
  assert.equal(software.offers.price, "0");
});

test("sitemap and robots expose every canonical theme page", async () => {
  const sitemap = await readFile(path.join(outputRoot, "sitemap.xml"), "utf8");
  const robots = await readFile(path.join(outputRoot, "robots.txt"), "utf8");
  assert.match(robots, /Allow: \//);
  assert.match(robots, /Sitemap: https:\/\/huangguang1999\.github\.io\/paseo-skins\/sitemap\.xml/);
  assert.equal((sitemap.match(/<url>/g) ?? []).length, catalog.themes.length + 1);
  for (const theme of catalog.themes) {
    assert.match(sitemap, new RegExp(`https://huangguang1999\\.github\\.io/paseo-skins/themes/${theme.id}/`));
  }
});

test("every catalog theme has an indexable bilingual detail page", async () => {
  for (const theme of catalog.themes) {
    const html = await readFile(path.join(outputRoot, "themes", theme.id, "index.html"), "utf8");
    assert.match(html, new RegExp(`<h1>${theme.name}</h1>`));
    assert.match(html, new RegExp(theme.englishName));
    assert.match(html, new RegExp(`rel="canonical" href="https://huangguang1999\\.github\\.io/paseo-skins/themes/${theme.id}/"`));
    assert.match(html, new RegExp(`themes/${theme.manifest.split("/").at(-1)}`));
    assert.match(html, /<meta property="og:image:width" content="\d+"/);
    assert.match(html, /<meta property="og:image:height" content="\d+"/);
    assert.match(html, /type="application\/json" title=".+ Theme v2 manifest"/);
    const [structuredData] = extractJsonLd(html);
    assert.equal(structuredData["@type"], "CreativeWork");
    assert.equal(structuredData.name, `${theme.name} (${theme.englishName})`);
  }
});

test("repository metadata targets high-intent GitHub discovery terms", async () => {
  const [readme, packageMetadata, codeOfConduct] = await Promise.all([
    readFile(path.join(repositoryRoot, "README.md"), "utf8"),
    readFile(path.join(repositoryRoot, "package.json"), "utf8").then(JSON.parse),
    readFile(path.join(repositoryRoot, "CODE_OF_CONDUCT.md"), "utf8"),
  ]);
  const readmeOpening = readme.slice(0, 2_500).toLowerCase();
  for (const phrase of ["paseo themes", "paseo", "agent skill", "cdp", "theme builder"]) {
    assert.ok(readmeOpening.includes(phrase), `README opening is missing ${phrase}`);
  }
  for (const keyword of ["paseo", "paseo-theme", "paseo-skins", "agent-skill"]) {
    assert.ok(packageMetadata.keywords.includes(keyword), `package keywords are missing ${keyword}`);
  }
  assert.equal(packageMetadata.homepage, "https://huangguang1999.github.io/paseo-skins/");
  assert.equal(packageMetadata.repository.url, "git+https://github.com/huangguang1999/paseo-skins.git");
  assert.match(codeOfConduct, /visual|视觉/i);
});

test("social preview uses GitHub's recommended 1280 by 640 canvas", async () => {
  const imagePath = path.join(outputRoot, "social-preview.png");
  const image = await readFile(imagePath);
  assert.equal(image.subarray(1, 4).toString(), "PNG");
  assert.equal(image.readUInt32BE(16), 1280);
  assert.equal(image.readUInt32BE(20), 640);
  assert.ok((await stat(imagePath)).size < 1_000_000);
});
