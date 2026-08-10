import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  adaptDreamSkinPackage,
  resolveDreamSkinThemeIdentifiers,
} from "./dreamskin-adapter.mjs";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const siteRoot = path.join(repositoryRoot, "site");
const catalogPath = path.join(siteRoot, "catalog.json");
const provenancePath = path.join(repositoryRoot, "ASSET_PROVENANCE.md");
const upstreamPackageStatus = "Upstream package terms preserved";
const popularCollectionUrl = "https://dreamskin.cc/gallery?community=popular";

function readOption(name) {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) throw new Error(`${name} is required`);
  return path.resolve(process.argv[index + 1]);
}

const metadataPath = readOption("--metadata");
const packagesDirectory = readOption("--packages");
const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
if (
  metadata.sort !== "popular" ||
  metadata.sourceUrl !== popularCollectionUrl ||
  !Number.isFinite(Date.parse(metadata.capturedAt)) ||
  !Number.isInteger(metadata.total) ||
  metadata.total < 1 ||
  !Array.isArray(metadata.items) ||
  metadata.items.length !== metadata.total
) {
  throw new Error("DreamSkin metadata must contain the complete popular collection");
}
for (const [index, item] of metadata.items.entries()) {
  if (!item?.id || !item?.slug || !item?.packageSha256 || !Number.isInteger(item.packageBytes)) {
    throw new Error(`DreamSkin metadata item ${index + 1} is incomplete`);
  }
  if (index > 0 && metadata.items[index - 1].downloadCount < item.downloadCount) {
    throw new Error("DreamSkin metadata must be sorted by descending download count");
  }
}

const themeIdentifiers = resolveDreamSkinThemeIdentifiers(metadata.items);
const validatedThemes = [];
for (const [index, sourceItem] of metadata.items.entries()) {
  const packageBytes = await readFile(path.join(packagesDirectory, `${sourceItem.id}.zip`));
  const adaptation = adaptDreamSkinPackage({
    packageBytes,
    popularRank: index + 1,
    sourceItem,
    themeIdentifier: themeIdentifiers[index],
  });
  validatedThemes.push({
    catalogTheme: adaptation.catalogTheme,
    imageFilename: adaptation.imageFilename,
  });
}
if (new Set(validatedThemes.map(({ catalogTheme }) => catalogTheme.id)).size !== validatedThemes.length) {
  throw new Error("DreamSkin themes produced duplicate Paseo identifiers");
}

const previousCatalog = JSON.parse(await readFile(catalogPath, "utf8"));
for (const theme of previousCatalog.themes) {
  const previewPath = path.join(siteRoot, theme.preview.replace(/^\.\//, ""));
  const manifestPath = path.join(siteRoot, theme.manifest.replace(/^\.\//, ""));
  await Promise.all([
    rm(previewPath, { force: true }),
    rm(manifestPath, { force: true }),
    rm(previewPath.replace(/\.[^.]+$/, ".svg"), { force: true }),
  ]);
}

for (const [index, sourceItem] of metadata.items.entries()) {
  const packageBytes = await readFile(path.join(packagesDirectory, `${sourceItem.id}.zip`));
  const adaptation = adaptDreamSkinPackage({
    packageBytes,
    popularRank: index + 1,
    sourceItem,
    themeIdentifier: themeIdentifiers[index],
  });
  await writeFile(path.join(siteRoot, "themes", adaptation.imageFilename), adaptation.imageBytes);
  await writeFile(
    path.join(siteRoot, "themes", `${adaptation.themeManifest.id}.theme.json`),
    `${JSON.stringify(adaptation.themeManifest, null, 2)}\n`,
  );
}
await writeFile(
  catalogPath,
  `${JSON.stringify({
    schemaVersion: 1,
    name: "Paseo Skins",
    source: {
      capturedAt: metadata.capturedAt,
      sort: metadata.sort,
      total: metadata.total,
      url: metadata.sourceUrl,
    },
    themes: validatedThemes.map(({ catalogTheme }) => catalogTheme),
  }, null, 2)}\n`,
);

const provenance = await readFile(provenancePath, "utf8");
const retainedProvenanceLines = provenance
  .split(/\r?\n/)
  .filter((line) => !line.includes(`| ${upstreamPackageStatus} |`));
while (retainedProvenanceLines.at(-1) === "") retainedProvenanceLines.pop();
const provenanceRows = validatedThemes.map(({ catalogTheme, imageFilename }) => {
  const fields = [
    catalogTheme.author,
    catalogTheme.sourceUrl,
    catalogTheme.sourceLicense,
    catalogTheme.sourcePackageSha256,
    catalogTheme.sourceImageSha256,
  ];
  if (fields.some((field) => /[|\r\n]/.test(String(field)))) {
    throw new Error(`DreamSkin provenance contains an unsupported table character: ${catalogTheme.id}`);
  }
  return `| \`site/themes/${imageFilename}\` | ${catalogTheme.author} | ${catalogTheme.sourceUrl} | ${catalogTheme.sourceLicense} | ${upstreamPackageStatus} | Source package SHA-256 \`${catalogTheme.sourcePackageSha256}\`; image SHA-256 \`${catalogTheme.sourceImageSha256}\` |`;
});
await writeFile(
  provenancePath,
  `${[...retainedProvenanceLines, ...provenanceRows].join("\n")}\n`,
);
console.log(`Imported ${validatedThemes.length} verified DreamSkin packages with byte-identical backgrounds.`);
