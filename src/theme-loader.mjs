import { constants as fileSystemConstants } from "node:fs";
import { open } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MAXIMUM_THEME_CONFIGURATION_BYTES = 64 * 1024;
const MAXIMUM_THEME_IMAGE_BYTES = 16 * 1024 * 1024;
const MAXIMUM_THEME_IMAGE_SIDE_PIXELS = 16_384;
const MAXIMUM_THEME_IMAGE_PIXELS = 50_000_000;
const OPEN_READ_ONLY_NO_FOLLOW =
  fileSystemConstants.O_RDONLY | (fileSystemConstants.O_NOFOLLOW ?? 0);

export const DEFAULT_THEME_MANIFEST_URL = new URL(
  "../assets/stage-black-gold.theme.json",
  import.meta.url,
);

function assertPlainText(value, fieldName, maximumLength) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    Array.from(value).length > maximumLength ||
    /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u.test(value)
  ) {
    throw new Error(`Theme ${fieldName} must be non-empty plain text up to ${maximumLength} characters`);
  }
  return value;
}

function assertUnitInterval(value, fieldName) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`Theme ${fieldName} must be a number between 0 and 1`);
  }
  return value;
}

function assertCssColor(value, fieldName) {
  if (
    typeof value !== "string" ||
    (!/^#[0-9a-f]{6}$/i.test(value) && !/^rgba?\([0-9., %]+\)$/i.test(value))
  ) {
    throw new Error(`Theme ${fieldName} must be a six-digit hex, rgb(), or rgba() color`);
  }
  return value;
}

function sameFileState(before, after) {
  return (
    before.isFile() &&
    after.isFile() &&
    before.dev === after.dev &&
    before.ino === after.ino &&
    before.size === after.size &&
    before.mtimeMs === after.mtimeMs &&
    before.ctimeMs === after.ctimeMs
  );
}

async function readStableRegularFile(filePath, label, maximumBytes) {
  let fileHandle;
  try {
    fileHandle = await open(filePath, OPEN_READ_ONLY_NO_FOLLOW);
  } catch (error) {
    if (error.code === "ELOOP") {
      throw new Error(`${label} must not be a symbolic link`);
    }
    throw error;
  }

  try {
    const before = await fileHandle.stat();
    if (!before.isFile()) {
      throw new Error(`${label} must be a regular file`);
    }
    if (before.size > maximumBytes) {
      throw new Error(`${label} exceeds the ${maximumBytes}-byte limit`);
    }
    const bytes = await fileHandle.readFile();
    const after = await fileHandle.stat();
    if (!sameFileState(before, after)) {
      throw new Error(`${label} changed while it was being read`);
    }
    return bytes;
  } finally {
    await fileHandle.close();
  }
}

function parsePngMetadata(bytes) {
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(pngSignature)) {
    return null;
  }
  return {
    height: bytes.readUInt32BE(20),
    mediaType: "image/png",
    width: bytes.readUInt32BE(16),
  };
}

function parseJpegMetadata(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return null;
  }
  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
  ]);
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) {
      continue;
    }
    if (offset + 2 > bytes.length) {
      break;
    }
    const segmentLength = bytes.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) {
      break;
    }
    if (startOfFrameMarkers.has(marker) && segmentLength >= 7) {
      return {
        height: bytes.readUInt16BE(offset + 3),
        mediaType: "image/jpeg",
        width: bytes.readUInt16BE(offset + 5),
      };
    }
    offset += segmentLength;
  }
  throw new Error("Theme image is an invalid or unsupported JPEG file");
}

function parseImageMetadata(bytes) {
  const metadata = parsePngMetadata(bytes) ?? parseJpegMetadata(bytes);
  if (!metadata) {
    throw new Error("Theme image must be a PNG or JPEG file");
  }
  if (
    metadata.width < 1 ||
    metadata.height < 1 ||
    metadata.width > MAXIMUM_THEME_IMAGE_SIDE_PIXELS ||
    metadata.height > MAXIMUM_THEME_IMAGE_SIDE_PIXELS ||
    metadata.width * metadata.height > MAXIMUM_THEME_IMAGE_PIXELS
  ) {
    throw new Error("Theme image dimensions exceed the supported limits");
  }
  return metadata;
}

export function validateThemeManifest(rawTheme) {
  if (!rawTheme || typeof rawTheme !== "object" || Array.isArray(rawTheme)) {
    throw new Error("Theme manifest must be a JSON object");
  }
  if (rawTheme.schemaVersion !== 1) {
    throw new Error(`Unsupported theme schema version: ${rawTheme.schemaVersion}`);
  }
  if (typeof rawTheme.id !== "string" || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(rawTheme.id)) {
    throw new Error("Theme id must contain lowercase letters, digits, and hyphens only");
  }
  if (typeof rawTheme.version !== "string" || !/^\d+\.\d+\.\d+$/.test(rawTheme.version)) {
    throw new Error("Theme version must use semantic versioning, for example 1.0.0");
  }

  const image = assertPlainText(rawTheme.image, "image", 160);
  if (path.basename(image) !== image) {
    throw new Error("Theme image must stay beside its manifest");
  }
  if (image === "theme.json" || image.endsWith(".theme.json")) {
    throw new Error("Theme image must not replace a theme manifest");
  }

  const colors = rawTheme.colors;
  if (!colors || typeof colors !== "object" || Array.isArray(colors)) {
    throw new Error("Theme colors must be an object");
  }
  const art = rawTheme.art;
  if (!art || typeof art !== "object" || Array.isArray(art)) {
    throw new Error("Theme art must be an object");
  }

  return {
    schemaVersion: 1,
    id: rawTheme.id,
    version: rawTheme.version,
    name: assertPlainText(rawTheme.name, "name", 80),
    description: assertPlainText(rawTheme.description, "description", 200),
    image,
    appearance: rawTheme.appearance,
    art: {
      focusX: assertUnitInterval(art.focusX, "art.focusX"),
      focusY: assertUnitInterval(art.focusY, "art.focusY"),
      homeOpacity: assertUnitInterval(art.homeOpacity, "art.homeOpacity"),
      workspaceOpacity: assertUnitInterval(art.workspaceOpacity, "art.workspaceOpacity"),
      utilityOpacity: assertUnitInterval(art.utilityOpacity, "art.utilityOpacity"),
    },
    colors: {
      background: assertCssColor(colors.background, "colors.background"),
      panel: assertCssColor(colors.panel, "colors.panel"),
      panelAlt: assertCssColor(colors.panelAlt ?? colors.panel, "colors.panelAlt"),
      accent: assertCssColor(colors.accent, "colors.accent"),
      glow: assertCssColor(colors.glow ?? colors.accent, "colors.glow"),
      text: assertCssColor(colors.text, "colors.text"),
      muted: assertCssColor(colors.muted, "colors.muted"),
      line: assertCssColor(colors.line, "colors.line"),
    },
  };
}

export async function loadTheme(themeManifest = DEFAULT_THEME_MANIFEST_URL) {
  const manifestPath =
    themeManifest instanceof URL ? fileURLToPath(themeManifest) : path.resolve(themeManifest);
  const manifestBytes = await readStableRegularFile(
    manifestPath,
    "Theme manifest",
    MAXIMUM_THEME_CONFIGURATION_BYTES,
  );
  let rawTheme;
  try {
    rawTheme = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(manifestBytes));
  } catch {
    throw new Error(`Theme manifest is not valid UTF-8 JSON: ${manifestPath}`);
  }
  const theme = validateThemeManifest(rawTheme);
  if (theme.appearance !== "dark") {
    throw new Error("Theme appearance currently supports dark only");
  }
  const imagePath = path.join(path.dirname(manifestPath), theme.image);
  const imageBytes = await readStableRegularFile(
    imagePath,
    "Theme image",
    MAXIMUM_THEME_IMAGE_BYTES,
  );
  if (imageBytes.length === 0) {
    throw new Error("Theme image must not be empty");
  }
  const imageMetadata = parseImageMetadata(imageBytes);

  return {
    image: {
      ...imageMetadata,
      bytes: imageBytes.length,
      dataUrl: `data:${imageMetadata.mediaType};base64,${imageBytes.toString("base64")}`,
      path: imagePath,
    },
    manifestPath,
    theme,
  };
}
