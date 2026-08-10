import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { adaptDreamSkinPackage } from "./dreamskin-adapter.mjs";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const siteRoot = path.join(repositoryRoot, "site");
const catalogPath = path.join(siteRoot, "catalog.json");

function readOption(name) {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) throw new Error(`${name} is required`);
  return path.resolve(process.argv[index + 1]);
}

const metadataPath = readOption("--metadata");
const packagesDirectory = readOption("--packages");
const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
if (!Array.isArray(metadata.items) || metadata.items.length !== 30) {
  throw new Error("DreamSkin metadata must contain exactly 30 popular themes");
}
for (const [index, item] of metadata.items.entries()) {
  if (!item?.id || !item?.slug || !item?.packageSha256 || !Number.isInteger(item.packageBytes)) {
    throw new Error(`DreamSkin metadata item ${index + 1} is incomplete`);
  }
  if (index > 0 && metadata.items[index - 1].downloadCount < item.downloadCount) {
    throw new Error("DreamSkin metadata must be sorted by descending download count");
  }
}

const adaptations = [];
for (const [index, sourceItem] of metadata.items.entries()) {
  const packageBytes = await readFile(path.join(packagesDirectory, `${sourceItem.id}.zip`));
  adaptations.push(adaptDreamSkinPackage({ packageBytes, popularRank: index + 1, sourceItem }));
}
if (new Set(adaptations.map(({ catalogTheme }) => catalogTheme.id)).size !== adaptations.length) {
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

for (const adaptation of adaptations) {
  await writeFile(path.join(siteRoot, "themes", adaptation.imageFilename), adaptation.imageBytes);
  await writeFile(
    path.join(siteRoot, "themes", `${adaptation.themeManifest.id}.theme.json`),
    `${JSON.stringify(adaptation.themeManifest, null, 2)}\n`,
  );
}
await writeFile(
  catalogPath,
  `${JSON.stringify({ schemaVersion: 1, name: "Paseo Skins", themes: adaptations.map(({ catalogTheme }) => catalogTheme) }, null, 2)}\n`,
);
console.log(`Imported ${adaptations.length} verified DreamSkin packages with byte-identical backgrounds.`);
