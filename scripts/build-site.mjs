import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createThemePackage } from "./theme-package.mjs";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const sourceRoot = path.join(repositoryRoot, "site");
const outputRoot = path.join(repositoryRoot, "_site");
const baseUrl = "https://huangguang1999.github.io/paseo-skins/";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function jsonLd(value) {
  return JSON.stringify(value, null, 2).replaceAll("<", "\\u003c");
}

function getThemeAssetPath(theme, field) {
  const prefix = "./themes/";
  if (!theme[field].startsWith(prefix)) {
    throw new Error(`Theme ${theme.id} has an unsupported ${field} path`);
  }
  return theme[field].slice(prefix.length);
}

function getThemePackagePath(theme) {
  const expectedPath = `./packages/${theme.id}-paseo-theme.zip`;
  if (theme.package !== expectedPath) {
    throw new Error(`Theme ${theme.id} has an unsupported package path`);
  }
  return theme.package.slice("./".length);
}

function renderThemeIndex(themes) {
  return themes.map((theme) => `
            <a href="./themes/${escapeHtml(theme.id)}/">
              <strong>${escapeHtml(theme.name)}</strong>
              <span>${escapeHtml(theme.englishName)}</span>
            </a>`).join("");
}

function renderThemePage(theme) {
  const canonicalUrl = new URL(`themes/${theme.id}/`, baseUrl).href;
  const previewAsset = getThemeAssetPath(theme, "preview");
  const previewUrl = new URL(`themes/${previewAsset}`, baseUrl).href;
  const manifestUrl = new URL(theme.manifest, baseUrl).href;
  const packageUrl = new URL(theme.package, baseUrl).href;
  const description = `${theme.description} 免费开源的 Paseo 桌面主题，支持 Agent Skill 一键接入与安全 CDP 注入。`;
  const installCommand = `npx --yes github:huangguang1999/paseo-skins apply ${theme.id} --persist`;
  const hasDistinctEnglishName = theme.englishName.trim().toLocaleLowerCase()
    !== theme.name.trim().toLocaleLowerCase();
  const displayName = hasDistinctEnglishName
    ? `${theme.name} / ${theme.englishName}`
    : theme.name;
  const structuredName = hasDistinctEnglishName
    ? `${theme.name} (${theme.englishName})`
    : theme.name;
  const heroName = hasDistinctEnglishName
    ? `${escapeHtml(theme.name)}<br /><i>${escapeHtml(theme.englishName)}</i>`
    : escapeHtml(theme.name);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: structuredName,
    description,
    url: canonicalUrl,
    image: previewUrl,
    inLanguage: ["zh-CN", "en"],
    author: {
      "@type": theme.author === "NASA" ? "Organization" : "Person",
      name: theme.author,
    },
    license: theme.licenseUrl,
    keywords: ["Paseo theme", "Paseo skin", theme.englishName, ...theme.tags],
    isPartOf: {
      "@type": "WebSite",
      name: "Paseo Skins",
      url: baseUrl,
    },
  };

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(displayName)} — Paseo 主题皮肤</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="author" content="Huang Guang" />
    <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1" />
    <link rel="canonical" href="${canonicalUrl}" />
    <link rel="icon" href="../../favicon.svg" type="image/svg+xml" />
    <link rel="alternate" href="${manifestUrl}" type="application/json" title="${escapeHtml(theme.name)} Theme v2 manifest" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Paseo Skins" />
    <meta property="og:locale" content="zh_CN" />
    <meta property="og:locale:alternate" content="en_US" />
    <meta property="og:title" content="${escapeHtml(displayName)} — Paseo 主题皮肤" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:image" content="${previewUrl}" />
    <meta property="og:image:secure_url" content="${previewUrl}" />
    <meta property="og:image:width" content="${theme.previewWidth}" />
    <meta property="og:image:height" content="${theme.previewHeight}" />
    <meta property="og:image:alt" content="${escapeHtml(theme.name)} Paseo 主题预览" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(displayName)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${previewUrl}" />
    <meta name="twitter:image:alt" content="${escapeHtml(theme.name)} Paseo theme preview" />
    <meta name="theme-color" content="${escapeHtml(theme.accent)}" />
    <script type="application/ld+json">${jsonLd(structuredData)}</script>
    <link rel="stylesheet" href="../../styles.css" />
    <script type="module">
      import { copyWithFeedback } from "../../common.js";
      document.querySelector("#copy-theme-command").addEventListener("click", () =>
        copyWithFeedback(${JSON.stringify(installCommand)}, "换肤命令已复制"));
    </script>
  </head>
  <body>
    <header class="site-header">
      <a class="brand" href="../../"><span class="brand-glyph">P</span><span>Paseo <i>Skins</i></span></a>
      <nav aria-label="主导航"><a href="../../gallery/">主题库</a><a href="../../studio/">Studio</a><a href="../../docs/">文档</a><a href="../../download/">CLI</a></nav>
      <a class="header-action" href="../../gallery/">返回主题库 <span>↗</span></a>
    </header>
    <main>
      <section class="page-hero theme-detail-hero" style="--detail-accent:${escapeHtml(theme.accent)}">
        <p class="eyebrow">INSTALLABLE PASEO THEME</p>
        <h1>${heroName}</h1>
        <p>${escapeHtml(theme.description)} <span lang="en">${escapeHtml(theme.englishDescription)}</span></p>
      </section>
      <article class="content-shell theme-detail-layout">
        <div class="theme-detail-art"><img src="../${escapeHtml(previewAsset)}" alt="${escapeHtml(theme.name)} Paseo 主题皮肤预览" /></div>
        <aside class="theme-detail-copy panel">
          <p class="eyebrow">THEME DETAILS</p>
          <h2>${escapeHtml(theme.name)}</h2>
          <div class="theme-tags">${theme.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
          <dl><div><dt>作者</dt><dd>${escapeHtml(theme.author)}</dd></div><div><dt>许可</dt><dd>${escapeHtml(theme.license)}</dd></div><div><dt>格式</dt><dd>Theme v2</dd></div></dl>
          <a class="button primary-button" href="${packageUrl}" download>下载主题包</a>
          <div class="command-box"><code>${escapeHtml(installCommand)}</code><button id="copy-theme-command" type="button">复制</button></div>
          <a class="button secondary-button" href="../../preview/?themeId=${encodeURIComponent(theme.id)}">在模拟器预览</a>
          <a class="button secondary-button" href="../../studio/?theme=${encodeURIComponent(theme.id)}">在 Studio 调整</a>
          <a class="button secondary-button" href="${manifestUrl}" download>下载 theme.json</a>
          <a class="theme-source-link" href="${escapeHtml(theme.sourceUrl)}" rel="noreferrer">DreamSkin 原主题包：${escapeHtml(theme.author)} ↗</a>
          <p class="license">非官方社区项目 · 不修改 Paseo 安装包</p>
        </aside>
      </article>
    </main>
    <footer class="site-footer"><a class="brand" href="../../"><span class="brand-glyph">P</span><span>Paseo <i>Skins</i></span></a><p>所有公开素材均记录来源与许可。</p><nav><a href="../../gallery/">主题库</a><a href="../../docs/">文档</a></nav></footer>
  </body>
</html>
`;
}

await rm(outputRoot, { force: true, recursive: true });
await mkdir(outputRoot, { recursive: true });
await cp(sourceRoot, outputRoot, { recursive: true });
await cp(
  path.join(repositoryRoot, "skills/paseo-skins/SKILL.md"),
  path.join(outputRoot, "SKILL.md"),
);
await cp(
  path.join(repositoryRoot, "schema"),
  path.join(outputRoot, "schema"),
  { recursive: true },
);
await cp(
  path.join(repositoryRoot, "shared"),
  path.join(outputRoot, "shared"),
  { recursive: true },
);
for (const browserModule of ["theme-builder-core.js", "theme-builder.js"]) {
  const modulePath = path.join(outputRoot, browserModule);
  const moduleSource = await readFile(modulePath, "utf8");
  await writeFile(modulePath, moduleSource.replaceAll("../shared/", "./shared/"));
}

const catalog = JSON.parse(await readFile(path.join(sourceRoot, "catalog.json"), "utf8"));
const packageMetadata = JSON.parse(await readFile(path.join(repositoryRoot, "package.json"), "utf8"));
const publishedThemes = [];
await mkdir(path.join(outputRoot, "packages"), { recursive: true });
for (const theme of catalog.themes) {
  const manifestPath = path.join(sourceRoot, theme.manifest.replace(/^\.\//, ""));
  const imagePath = path.join(sourceRoot, theme.preview.replace(/^\.\//, ""));
  const [manifestBytes, imageBytes] = await Promise.all([
    readFile(manifestPath),
    readFile(imagePath),
  ]);
  const archive = createThemePackage({
    identifier: theme.id,
    imageFilename: path.basename(imagePath),
    imageBytes,
    manifestFilename: path.basename(manifestPath),
    manifestBytes,
    sourceAuthor: theme.author,
    sourceLicense: theme.sourceLicense,
    sourceImageSha256: theme.sourceImageSha256,
    sourcePackageSha256: theme.sourcePackageSha256,
    sourceUrl: theme.sourceUrl,
    sourceVersionId: theme.sourceVersionId,
  });
  const archivePath = path.join(outputRoot, getThemePackagePath(theme));
  await writeFile(archivePath, archive);
  publishedThemes.push({ ...theme, packageBytes: archive.length });
}
const publishedCatalog = { ...catalog, themes: publishedThemes };
await writeFile(path.join(outputRoot, "catalog.json"), `${JSON.stringify(publishedCatalog, null, 2)}\n`);
let indexHtml = await readFile(path.join(outputRoot, "index.html"), "utf8");
indexHtml = indexHtml
  .replace("<!-- THEME_INDEX -->", renderThemeIndex(publishedCatalog.themes))
  .replaceAll("__SOFTWARE_VERSION__", packageMetadata.version);
await writeFile(path.join(outputRoot, "index.html"), indexHtml);

for (const theme of publishedCatalog.themes) {
  const themeDirectory = path.join(outputRoot, "themes", theme.id);
  const manifest = JSON.parse(await readFile(
    path.join(sourceRoot, theme.manifest.replace(/^\.\//, "")),
    "utf8",
  ));
  await mkdir(themeDirectory, { recursive: true });
  await writeFile(path.join(themeDirectory, "index.html"), renderThemePage({
    ...theme,
    previewHeight: manifest.integrity.height,
    previewWidth: manifest.integrity.width,
  }));
}

const sitemapUrls = [
  baseUrl,
  ...["gallery/", "studio/", "docs/", "download/"].map((pathname) => new URL(pathname, baseUrl).href),
  ...publishedCatalog.themes.map((theme) => new URL(`themes/${theme.id}/`, baseUrl).href),
];
await writeFile(
  path.join(outputRoot, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.map((url) => `  <url><loc>${url}</loc></url>`).join("\n")}\n</urlset>\n`,
);
await writeFile(
  path.join(outputRoot, "robots.txt"),
  `User-agent: *\nAllow: /\n\nSitemap: ${new URL("sitemap.xml", baseUrl).href}\n`,
);

console.log(`Built ${publishedCatalog.themes.length} searchable theme pages and download packages in ${outputRoot}`);
