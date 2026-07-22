#!/usr/bin/env node

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const outputRoot = fileURLToPath(new URL("../_site/", import.meta.url));
const siteBase = new URL("https://huangguang1999.github.io/paseo-skins/");

async function collectHtmlFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectHtmlFiles(entryPath));
    else if (entry.name.endsWith(".html")) files.push(entryPath);
  }
  return files;
}

async function exists(filePath) {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

const failures = [];
for (const htmlPath of await collectHtmlFiles(outputRoot)) {
  const documentUrl = new URL(path.relative(outputRoot, htmlPath).replace(/index\.html$/, ""), siteBase);
  const html = await readFile(htmlPath, "utf8");
  const references = [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
  for (const reference of references) {
    if (reference.startsWith("#") || reference.startsWith("mailto:") || reference.startsWith("data:")) continue;
    const url = new URL(reference, documentUrl);
    if (url.origin !== siteBase.origin || !url.pathname.startsWith(siteBase.pathname)) continue;
    let relativePath = decodeURIComponent(url.pathname.slice(siteBase.pathname.length));
    if (!relativePath || relativePath.endsWith("/")) relativePath += "index.html";
    if (!(await exists(path.join(outputRoot, relativePath)))) {
      failures.push(`${path.relative(outputRoot, htmlPath)} -> ${reference}`);
    }
  }
}

if (failures.length > 0) {
  throw new Error(`Broken internal site links:\n${failures.join("\n")}`);
}
console.log("Internal site links verified");
