import { createHash } from "node:crypto";
import path from "node:path";

import { parseImageMetadata } from "../src/theme-loader.mjs";
import { readZipEntries } from "./theme-package.mjs";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function parseJson(entries, filename) {
  const bytes = entries.get(filename);
  if (!bytes) throw new Error(`DreamSkin package is missing ${filename}`);
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error(`DreamSkin package has invalid ${filename}`);
  }
}

function normalizeIdentifier(value) {
  const identifier = String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/g, "");
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(identifier)) {
    throw new Error(`DreamSkin slug cannot become a Paseo theme id: ${value}`);
  }
  return identifier;
}

export function resolveDreamSkinThemeIdentifiers(sourceItems) {
  const baseIdentifiers = sourceItems.map((sourceItem) =>
    normalizeIdentifier(sourceItem.slug ?? sourceItem.themeId ?? sourceItem.id),
  );
  const identifierCounts = new Map();
  for (const identifier of baseIdentifiers) {
    identifierCounts.set(identifier, (identifierCounts.get(identifier) ?? 0) + 1);
  }
  const identifiers = baseIdentifiers.map((baseIdentifier, index) => {
    if (identifierCounts.get(baseIdentifier) === 1) return baseIdentifier;
    const sourceVersionIdentifier = String(sourceItems[index].id ?? "");
    const suffix = sourceVersionIdentifier.match(/^ver_([a-z0-9]+)$/i)?.[1]?.slice(0, 8);
    if (!suffix) {
      throw new Error(`Duplicate DreamSkin slug has no stable version id: ${baseIdentifier}`);
    }
    const prefix = baseIdentifier.slice(0, 64 - suffix.length - 1).replace(/-+$/g, "");
    return normalizeIdentifier(`${prefix}-${suffix}`);
  });
  if (new Set(identifiers).size !== identifiers.length) {
    throw new Error("DreamSkin themes cannot produce unique Paseo identifiers");
  }
  return identifiers;
}

function normalizeColor(value, field) {
  const color = String(value ?? "").trim();
  const eightDigitHex = color.match(/^#([0-9a-f]{6})([0-9a-f]{2})$/i);
  if (eightDigitHex) {
    const red = Number.parseInt(eightDigitHex[1].slice(0, 2), 16);
    const green = Number.parseInt(eightDigitHex[1].slice(2, 4), 16);
    const blue = Number.parseInt(eightDigitHex[1].slice(4, 6), 16);
    const alpha = Number.parseInt(eightDigitHex[2], 16) / 255;
    return `rgba(${red}, ${green}, ${blue}, ${alpha.toFixed(3)})`;
  }
  if (/^(#[0-9a-f]{6}|rgba?\([0-9., %]+\))$/i.test(color)) return color;
  throw new Error(`DreamSkin ${field} is not a supported Paseo color: ${color}`);
}

function colorLuminance(color) {
  const match = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!match) return 0;
  const [red, green, blue] = match.slice(1).map((part) => Number.parseInt(part, 16));
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function resolveAppearance(sourceTheme) {
  if (["dark", "light"].includes(sourceTheme.appearance)) return sourceTheme.appearance;
  return colorLuminance(sourceTheme.colors?.text ?? "#ffffff") > 160 ? "dark" : "light";
}

function licenseUrl(sourceLicense, sourceUrl) {
  const normalized = sourceLicense.toLowerCase().replace(/[\s-]+/g, "");
  if (normalized === "mit") return "https://opensource.org/license/mit";
  if (normalized === "ccby4.0") return "https://creativecommons.org/licenses/by/4.0/";
  if (normalized === "ccbync4.0") return "https://creativecommons.org/licenses/by-nc/4.0/";
  if (normalized === "ccbyncsa4.0") return "https://creativecommons.org/licenses/by-nc-sa/4.0/";
  return sourceUrl;
}

function buildColors(sourceTheme) {
  const colors = sourceTheme.colors ?? {};
  return {
    background: normalizeColor(colors.background, "colors.background"),
    panel: normalizeColor(colors.panel, "colors.panel"),
    panelAlt: normalizeColor(colors.panelAlt ?? colors.panel, "colors.panelAlt"),
    accent: normalizeColor(colors.accent, "colors.accent"),
    glow: normalizeColor(colors.highlight ?? colors.accentAlt ?? colors.accent, "colors.highlight"),
    text: normalizeColor(colors.text, "colors.text"),
    muted: normalizeColor(colors.muted, "colors.muted"),
    line: normalizeColor(colors.line, "colors.line"),
  };
}

export function adaptDreamSkinPackage({ packageBytes, popularRank, sourceItem, themeIdentifier = null }) {
  if (packageBytes.length !== sourceItem.packageBytes || sha256(packageBytes) !== sourceItem.packageSha256) {
    throw new Error(`DreamSkin package integrity mismatch: ${sourceItem.id}`);
  }
  const entries = readZipEntries(packageBytes);
  const sourceManifest = parseJson(entries, "manifest.json");
  const sourceTheme = parseJson(entries, "theme.json");
  for (const file of sourceManifest.files ?? []) {
    const bytes = entries.get(file.path);
    if (!bytes || bytes.length !== file.bytes || sha256(bytes) !== file.sha256) {
      throw new Error(`DreamSkin file integrity mismatch: ${file.path}`);
    }
  }

  const imageRecord = sourceManifest.files.find((file) => file.mediaType?.startsWith("image/"));
  if (!imageRecord) throw new Error(`DreamSkin package has no background image: ${sourceItem.id}`);
  const imageBytes = entries.get(imageRecord.path);
  const imageMetadata = parseImageMetadata(imageBytes);
  const identifier = normalizeIdentifier(themeIdentifier ?? sourceItem.slug ?? sourceTheme.id);
  const imageExtension = path.extname(imageRecord.path).toLowerCase();
  const imageFilename = `${identifier}${imageExtension}`;
  const sourceUrl = `https://api.dreamskin.cc/v1/themes/${sourceItem.id}/download`;
  const appearance = resolveAppearance(sourceTheme);
  const colors = buildColors(sourceTheme);
  const description = sourceTheme.tagline
    ? `${sourceTheme.tagline} DreamSkin 原主题包适配，保留原背景图。`
    : `由 DreamSkin 社区主题「${sourceItem.name}」适配，保留原背景图。`;
  const publisher = sourceManifest.publisher?.displayName ?? sourceItem.authorDisplayName;

  const themeManifest = {
    $schema: "https://huangguang1999.github.io/paseo-skins/schema/paseo-theme-v2.schema.json",
    schemaVersion: 2,
    id: identifier,
    version: sourceManifest.version ?? sourceItem.version,
    name: sourceItem.name,
    description,
    image: imageFilename,
    appearance,
    art: {
      focusX: sourceTheme.art?.focusX ?? sourceItem.displayMeta?.art?.focusX ?? 0.5,
      focusY: sourceTheme.art?.focusY ?? sourceItem.displayMeta?.art?.focusY ?? 0.5,
      homeOpacity: 0.96,
      workspaceOpacity: sourceTheme.art?.taskMode === "full" ? 0.72 : 0.2,
      utilityOpacity: 0.32,
    },
    colors,
    integrity: {
      algorithm: "sha256",
      sha256: imageRecord.sha256,
      bytes: imageBytes.length,
      width: imageMetadata.width,
      height: imageMetadata.height,
    },
  };
  const catalogTheme = {
    id: identifier,
    name: sourceItem.name,
    englishName: sourceItem.name,
    description,
    englishDescription: "Adapted from the original DreamSkin package with its background image preserved byte-for-byte.",
    author: sourceItem.authorDisplayName,
    sourceUrl,
    license: sourceManifest.license ?? sourceItem.license,
    licenseUrl: licenseUrl(sourceManifest.license ?? sourceItem.license, sourceUrl),
    tags: ["DreamSkin", appearance === "dark" ? "深色" : "浅色", sourceTheme.art?.safeArea === "left" ? "左侧安全区" : "全景"],
    accent: colors.accent,
    preview: `./themes/${imageFilename}`,
    manifest: `./themes/${identifier}.theme.json`,
    version: themeManifest.version,
    imageBytes: imageBytes.length,
    package: `./packages/${identifier}-paseo-theme.zip`,
    popularRank,
    sourceDownloads: sourceItem.downloadCount,
    sourceImageSha256: imageRecord.sha256,
    sourceLicense: sourceManifest.license ?? sourceItem.license,
    sourcePackageSha256: sourceItem.packageSha256,
    sourceProvenance: sourceManifest.provenance?.summary ?? "",
    sourcePublisher: publisher,
    sourceReviewedAt: sourceItem.reviewedAt,
    sourceSubmittedAt: sourceItem.submittedAt,
    sourceThemeId: sourceManifest.themeId,
    sourceVersionId: sourceItem.id,
  };

  return { catalogTheme, imageBytes, imageFilename, sourceManifest, sourceTheme, themeManifest };
}
