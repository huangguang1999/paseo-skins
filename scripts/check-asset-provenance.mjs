#!/usr/bin/env node

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const inventoryPath = path.join(repositoryRoot, "ASSET_PROVENANCE.md");
const visualAssetPattern = /^(?:assets|docs\/images|site)\/.*\.(?:png|jpe?g|webp|svg)$/i;
const upstreamPackageStatus = "Upstream package terms preserved";
const acceptedReleaseStatuses = new Set([
  "Project original",
  "Verified public redistribution",
  upstreamPackageStatus,
]);
const mode = process.argv[2];

if (mode !== "--check" && mode !== "--release") {
  console.error("Usage: node scripts/check-asset-provenance.mjs --check|--release");
  process.exitCode = 2;
} else {
  const [{ stdout }, inventory, catalog] = await Promise.all([
    execFileAsync(
      "git",
      ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
      { cwd: repositoryRoot, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
    ),
    readFile(inventoryPath, "utf8"),
    readFile(path.join(repositoryRoot, "site/catalog.json"), "utf8").then(JSON.parse),
  ]);
  const trackedAssets = stdout
    .split("\0")
    .filter((file) => visualAssetPattern.test(file) && existsSync(path.join(repositoryRoot, file)))
    .sort();
  const rows = [];
  for (const line of inventory.split(/\r?\n/)) {
    const match = /^\|\s*`([^`]+)`\s*\|(.*)\|\s*$/.exec(line);
    if (!match) continue;
    const fields = match[2].split("|").map((field) => field.trim());
    if (fields.length !== 5 || fields.some((field) => field.length === 0)) {
      throw new Error(`Invalid provenance row for ${match[1]}`);
    }
    rows.push({ file: match[1], fields });
  }
  const counts = new Map();
  for (const row of rows) counts.set(row.file, (counts.get(row.file) ?? 0) + 1);
  const missing = trackedAssets.filter((file) => !counts.has(file));
  const duplicates = [...counts].filter(([, count]) => count !== 1).map(([file]) => file);
  const extra = [...counts.keys()].filter((file) => !trackedAssets.includes(file));
  if (missing.length || duplicates.length || extra.length) {
    throw new Error([
      "Asset provenance inventory does not match repository visuals.",
      missing.length ? `Missing: ${missing.join(", ")}` : null,
      duplicates.length ? `Duplicated: ${duplicates.join(", ")}` : null,
      extra.length ? `Not present: ${extra.join(", ")}` : null,
    ].filter(Boolean).join("\n"));
  }
  for (const row of rows.filter(({ fields }) => fields[3] === upstreamPackageStatus)) {
    const preview = `./${row.file.replace(/^site\//, "")}`;
    const theme = catalog.themes.find((item) => item.preview === preview);
    if (!theme) throw new Error(`Upstream provenance has no catalog entry: ${row.file}`);
    if (row.fields[0] !== theme.author || row.fields[1] !== theme.sourceUrl || row.fields[2] !== theme.sourceLicense) {
      throw new Error(`Upstream provenance metadata does not match catalog: ${row.file}`);
    }
    if (!row.fields[4].includes(theme.sourcePackageSha256) || !row.fields[4].includes(theme.sourceImageSha256)) {
      throw new Error(`Upstream provenance hashes do not match catalog: ${row.file}`);
    }
  }
  if (mode === "--release") {
    const blocked = rows.filter((row) => !acceptedReleaseStatuses.has(row.fields[3]));
    if (blocked.length > 0) {
      throw new Error(`Release blocked by unresolved asset rights:\n${blocked.map((row) => row.file).join("\n")}`);
    }
  }
  console.log(`${mode === "--release" ? "Release" : "Asset"} provenance verified: ${rows.length} visual assets`);
}
