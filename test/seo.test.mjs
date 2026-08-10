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
  assert.match(html, /id="home-simulator"/);
  assert.match(html, /src="\.\/app\.js"/);
  for (const page of ["gallery", "studio", "docs", "download"]) {
    assert.match(html, new RegExp(`href="\\./${page}/"`));
  }

  const [structuredData] = extractJsonLd(html);
  const software = structuredData["@graph"].find((entry) => entry["@type"] === "SoftwareApplication");
  assert.equal(software.name, "Paseo Skins");
  assert.equal(software.operatingSystem, "macOS");
  assert.equal(software.offers.price, "0");
});

test("sitemap and robots expose all canonical product and theme pages", async () => {
  const sitemap = await readFile(path.join(outputRoot, "sitemap.xml"), "utf8");
  const robots = await readFile(path.join(outputRoot, "robots.txt"), "utf8");
  assert.match(robots, /Allow: \//);
  assert.match(robots, /Sitemap: https:\/\/huangguang1999\.github\.io\/paseo-skins\/sitemap\.xml/);
  assert.equal((sitemap.match(/<url>/g) ?? []).length, catalog.themes.length + 5);
  for (const page of ["gallery", "studio", "docs", "download"]) {
    assert.match(sitemap, new RegExp(`https://huangguang1999\\.github\\.io/paseo-skins/${page}/`));
  }
  for (const theme of catalog.themes) {
    assert.match(sitemap, new RegExp(`https://huangguang1999\\.github\\.io/paseo-skins/themes/${theme.id}/`));
  }
});

test("every catalog theme has an indexable bilingual detail page", async () => {
  for (const theme of catalog.themes) {
    const html = await readFile(path.join(outputRoot, "themes", theme.id, "index.html"), "utf8");
    assert.match(html, new RegExp(`<h1>${theme.name}<br`));
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

test("gallery, simulator, studio, docs, and CLI pages ship their interactive entry points", async () => {
  const expectations = [
    ["gallery/index.html", /src="\.\.\/gallery\.js"/, /id="community-sort-tabs"/, /id="community-grid"/],
    ["preview/index.html", /src="\.\.\/preview\.js"/, /id="preview-simulator"/],
    ["studio/index.html", /src="\.\.\/theme-builder\.js"/, /id="studio-simulator"/],
    ["docs/index.html", /Theme v2/, /Safe CSS/],
    ["download/index.html", /apply morning-mist/, /id="copy-quick-start"/],
  ];
  for (const [relativePath, ...patterns] of expectations) {
    const html = await readFile(path.join(outputRoot, relativePath), "utf8");
    for (const pattern of patterns) assert.match(html, pattern);
  }
});

test("popular gallery is login-free and Studio controls are accessible without native prompts", async () => {
  const [galleryHtml, galleryScript, studioHtml, builderScript, styles] = await Promise.all([
    readFile(path.join(outputRoot, "gallery/index.html"), "utf8"),
    readFile(path.join(outputRoot, "gallery.js"), "utf8"),
    readFile(path.join(outputRoot, "studio/index.html"), "utf8"),
    readFile(path.join(outputRoot, "theme-builder.js"), "utf8"),
    readFile(path.join(outputRoot, "styles.css"), "utf8"),
  ]);

  assert.match(galleryHtml, /<h1 id="community-title">社区主题/);
  assert.doesNotMatch(galleryHtml, /community-hero/);
  assert.match(galleryHtml, /30 款/);
  assert.match(galleryHtml, /id="community-sort-tabs"/);
  assert.match(galleryHtml, /id="community-page-jump"/);
  assert.doesNotMatch(galleryHtml, /<(?:a|button)[^>]*>[^<]*(?:登录|注册|Login|Sign in)/i);
  assert.doesNotMatch(galleryHtml, /id="group-dialog"|id="group-name"|id="gallery-search"/);
  assert.doesNotMatch(galleryScript, /localStorage|readSavedThemeGroups|saveThemeGroups/);
  assert.doesNotMatch(galleryScript, /window\.prompt/);
  assert.doesNotMatch(galleryScript, /Codex/);
  assert.match(galleryScript, /const PAGE_SIZE = 6/);
  assert.match(galleryScript, /Paseo/);
  assert.match(galleryScript, /sourceDownloads/);
  assert.doesNotMatch(galleryScript, /inspirationThemeName|热门题材参考|原创重绘/);
  assert.match(galleryHtml, /保留原图/);
  assert.match(galleryScript, /下载主题包/);
  assert.match(galleryScript, /packageUrl/);
  assert.match(studioHtml, /id="builder-upload-zone"[^>]+role="button"[^>]+tabindex="0"/);
  assert.match(studioHtml, /id="builder-focus-x"[^>]+aria-label="横向焦点"/);
  assert.match(studioHtml, /id="css-status"[^>]+role="status"/);
  assert.match(studioHtml, /id="export-status"[^>]+role="status"/);
  assert.match(builderScript, /copyManifest\.disabled/);
  assert.match(styles, /\.button:disabled/);
  assert.match(styles, /\.community-card-title\s*>\s*div\s*\{[^}]*min-width:\s*0/s);
});

test("simulator keeps fixed controls visible while only theme choices scroll", async () => {
  const [simulator, styles] = await Promise.all([
    readFile(path.join(outputRoot, "simulator.js"), "utf8"),
    readFile(path.join(outputRoot, "styles.css"), "utf8"),
  ]);
  assert.doesNotMatch(simulator, /toolbar\.scrollLeft/);
  assert.match(simulator, /themeSlot\.scrollLeft/);
  assert.match(styles, /\.simulator-theme-options\s*\{[^}]*overflow-x:\s*auto/s);
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
