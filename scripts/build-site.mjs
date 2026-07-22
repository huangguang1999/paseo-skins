import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
  const description = `${theme.description} 免费开源的 Paseo 桌面主题，支持 Agent Skill 一键接入与安全 CDP 注入。`;
  const installCommand = `npx --yes github:huangguang1999/paseo-skins start --theme-url '${manifestUrl}'`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: `${theme.name} (${theme.englishName})`,
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
    <title>${escapeHtml(theme.name)} / ${escapeHtml(theme.englishName)} — Paseo 主题皮肤</title>
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
    <meta property="og:title" content="${escapeHtml(theme.name)} / ${escapeHtml(theme.englishName)} — Paseo 主题皮肤" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:image" content="${previewUrl}" />
    <meta property="og:image:secure_url" content="${previewUrl}" />
    <meta property="og:image:width" content="${theme.previewWidth}" />
    <meta property="og:image:height" content="${theme.previewHeight}" />
    <meta property="og:image:alt" content="${escapeHtml(theme.name)} Paseo 主题预览" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(theme.name)} / ${escapeHtml(theme.englishName)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${previewUrl}" />
    <meta name="twitter:image:alt" content="${escapeHtml(theme.name)} Paseo theme preview" />
    <meta name="theme-color" content="${escapeHtml(theme.accent)}" />
    <script type="application/ld+json">${jsonLd(structuredData)}</script>
    <link rel="stylesheet" href="../../theme-detail.css" />
  </head>
  <body style="--theme-accent: ${escapeHtml(theme.accent)}">
    <main>
      <nav aria-label="面包屑"><a href="../../">Paseo Skins</a><span>/</span><span>${escapeHtml(theme.name)}</span></nav>
      <article>
        <div class="theme-art">
          <img src="../${escapeHtml(previewAsset)}" alt="${escapeHtml(theme.name)} Paseo 主题皮肤预览" />
        </div>
        <div class="theme-copy">
          <p class="eyebrow">INSTALLABLE PASEO THEME</p>
          <h1>${escapeHtml(theme.name)}</h1>
          <p class="english-name">${escapeHtml(theme.englishName)}</p>
          <p class="description">${escapeHtml(theme.description)}</p>
          <p class="english-description" lang="en">${escapeHtml(theme.englishDescription)}</p>
          <ul class="tags">${theme.tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join("")}</ul>
          <section aria-labelledby="agent-install">
            <h2 id="agent-install">让 Agent 一键应用</h2>
            <p>把本页地址交给已安装 <code>paseo-skins</code> Skill 的 Codex、Claude Code、Cursor 或其他兼容 Agent。</p>
            <pre><code>${escapeHtml(installCommand)}</code></pre>
          </section>
          <div class="actions">
            <a class="primary" href="${manifestUrl}">查看主题清单</a>
            <a href="${escapeHtml(theme.sourceUrl)}" rel="noreferrer">图片来源：${escapeHtml(theme.author)}</a>
          </div>
          <p class="license">${escapeHtml(theme.license)} · 非官方社区项目 · 不修改 Paseo 安装包</p>
        </div>
      </article>
    </main>
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
let indexHtml = await readFile(path.join(outputRoot, "index.html"), "utf8");
indexHtml = indexHtml
  .replace("<!-- THEME_INDEX -->", renderThemeIndex(catalog.themes))
  .replaceAll("__SOFTWARE_VERSION__", packageMetadata.version);
await writeFile(path.join(outputRoot, "index.html"), indexHtml);

for (const theme of catalog.themes) {
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

const sitemapUrls = [baseUrl, ...catalog.themes.map((theme) => new URL(`themes/${theme.id}/`, baseUrl).href)];
await writeFile(
  path.join(outputRoot, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.map((url) => `  <url><loc>${url}</loc></url>`).join("\n")}\n</urlset>\n`,
);
await writeFile(
  path.join(outputRoot, "robots.txt"),
  `User-agent: *\nAllow: /\n\nSitemap: ${new URL("sitemap.xml", baseUrl).href}\n`,
);

console.log(`Built ${catalog.themes.length} searchable theme pages in ${outputRoot}`);
