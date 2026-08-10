#!/usr/bin/env node

import { execFile } from "node:child_process";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { validateThemeCatalog } from "../src/catalog-client.mjs";
import { loadTheme } from "../src/theme-loader.mjs";
import { PACKAGE_VERSION } from "../src/version.mjs";

const execFileAsync = promisify(execFile);
const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const packageMetadata = JSON.parse(await readFile(path.join(repositoryRoot, "package.json"), "utf8"));
const changelog = await readFile(path.join(repositoryRoot, "CHANGELOG.md"), "utf8");
const catalogSource = JSON.parse(await readFile(path.join(repositoryRoot, "site/catalog.json"), "utf8"));
const maximumPagesBytes = 1_000_000_000;

async function directoryBytes(directory) {
  let bytes = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    bytes += entry.isDirectory() ? await directoryBytes(entryPath) : (await stat(entryPath)).size;
  }
  return bytes;
}

if (packageMetadata.version !== PACKAGE_VERSION) {
  throw new Error(`Package ${packageMetadata.version} does not match runtime ${PACKAGE_VERSION}`);
}
if (!changelog.includes(`## ${PACKAGE_VERSION} - `)) {
  throw new Error(`CHANGELOG has no ${PACKAGE_VERSION} release entry`);
}
if (process.env.GITHUB_REF_NAME?.startsWith("v") && process.env.GITHUB_REF_NAME !== `v${PACKAGE_VERSION}`) {
  throw new Error(`Tag ${process.env.GITHUB_REF_NAME} does not match v${PACKAGE_VERSION}`);
}

const catalog = validateThemeCatalog(catalogSource, "https://huangguang1999.github.io/paseo-skins/catalog.json");
for (const theme of catalog.themes) {
  const catalogEntry = catalogSource.themes.find((entry) => entry.id === theme.id);
  const manifestPath = path.join(repositoryRoot, "site", catalogEntry.manifest.replace(/^\.\//, ""));
  const loaded = await loadTheme(manifestPath);
  if (loaded.theme.schemaVersion !== 2 || !loaded.theme.integrity) {
    throw new Error(`Release theme ${theme.id} must use integrity-verified schema v2`);
  }
}

const { stdout } = await execFileAsync(
  "npm",
  ["pack", "--dry-run", "--json", "--ignore-scripts"],
  { cwd: repositoryRoot, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
);
const [pack] = JSON.parse(stdout);
const pagesBytes = await directoryBytes(path.join(repositoryRoot, "_site"));
if (pagesBytes > maximumPagesBytes) {
  throw new Error(`GitHub Pages artifact exceeds 1 GB: ${pagesBytes} bytes`);
}
const packageFiles = new Set(pack.files.map((entry) => entry.path));
for (const requiredFile of [
  "src/cli.mjs",
  "src/cli-options.mjs",
  "src/cli-help.mjs",
  "assets/stage-black-gold.theme.json",
  "ARCHITECTURE.md",
  "ASSET_PROVENANCE.md",
  "CHANGELOG.md",
  "CODE_OF_CONDUCT.md",
  "COMPATIBILITY.md",
  "schema/paseo-theme-v2.schema.json",
  "shared/theme-standard.mjs",
  "skills/paseo-skins/SKILL.md",
  "SECURITY.md",
]) {
  if (!packageFiles.has(requiredFile)) {
    throw new Error(`Release package is missing ${requiredFile}`);
  }
}
console.log(JSON.stringify({
  pass: true,
  version: PACKAGE_VERSION,
  themes: catalog.themes.length,
  packageFiles: packageFiles.size,
  packedBytes: pack.size,
  pagesBytes,
  unpackedBytes: pack.unpackedSize,
}, null, 2));
