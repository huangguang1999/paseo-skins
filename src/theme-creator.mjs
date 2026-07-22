import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { link, mkdtemp, mkdir, readFile, rename, rm, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import {
  deriveThemeColors,
  slugifyThemeIdentifier,
  THEME_IDENTIFIER_PATTERN,
} from "../shared/theme-palette.mjs";
import {
  readThemeImageFile,
  THEME_SCHEMA_URL,
  validateThemeManifest,
} from "./theme-loader.mjs";

const execFileAsync = promisify(execFile);

export { deriveThemeColors, slugifyThemeIdentifier };

export function parseBitmapPixels(bytes) {
  if (bytes.length < 54 || bytes.subarray(0, 2).toString("ascii") !== "BM") {
    throw new Error("Palette sampler expected a BMP image");
  }
  const pixelOffset = bytes.readUInt32LE(10);
  const dibHeaderBytes = bytes.readUInt32LE(14);
  const width = bytes.readInt32LE(18);
  const signedHeight = bytes.readInt32LE(22);
  const planes = bytes.readUInt16LE(26);
  const bitsPerPixel = bytes.readUInt16LE(28);
  const compression = bytes.readUInt32LE(30);
  if (
    dibHeaderBytes < 40 ||
    width < 1 ||
    signedHeight === 0 ||
    planes !== 1 ||
    (bitsPerPixel !== 24 && bitsPerPixel !== 32) ||
    compression !== 0
  ) {
    throw new Error("Palette sampler supports only uncompressed 24-bit or 32-bit BMP images");
  }
  const height = Math.abs(signedHeight);
  const bytesPerPixel = bitsPerPixel / 8;
  const rowBytes = Math.ceil((width * bytesPerPixel) / 4) * 4;
  if (pixelOffset + rowBytes * height > bytes.length) {
    throw new Error("Palette sampler received a truncated BMP image");
  }

  const pixels = new Uint8Array(width * height * 3);
  let outputOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const sourceY = signedHeight < 0 ? y : height - 1 - y;
    const rowOffset = pixelOffset + sourceY * rowBytes;
    for (let x = 0; x < width; x += 1) {
      const sourceOffset = rowOffset + x * bytesPerPixel;
      pixels[outputOffset++] = bytes[sourceOffset + 2];
      pixels[outputOffset++] = bytes[sourceOffset + 1];
      pixels[outputOffset++] = bytes[sourceOffset];
    }
  }
  return { height, pixels, width };
}

function mediaTypeExtension(mediaType) {
  if (mediaType === "image/png") return ".png";
  if (mediaType === "image/jpeg") return ".jpg";
  if (mediaType === "image/webp") return ".webp";
  throw new Error(`Unsupported theme image media type: ${mediaType}`);
}

export function buildThemeManifest({
  colors,
  description,
  focusX,
  focusY,
  identifier,
  imageBytes,
  imageFileName,
  imageMetadata,
  name,
}) {
  return validateThemeManifest({
    $schema: THEME_SCHEMA_URL,
    schemaVersion: 2,
    id: identifier,
    version: "1.0.0",
    name,
    description,
    image: imageFileName,
    appearance: "dark",
    art: {
      focusX,
      focusY,
      homeOpacity: 0.92,
      workspaceOpacity: 0.2,
      utilityOpacity: 0.32,
    },
    colors,
    integrity: {
      algorithm: "sha256",
      sha256: createHash("sha256").update(imageBytes).digest("hex"),
      bytes: imageBytes.length,
      width: imageMetadata.width,
      height: imageMetadata.height,
    },
  });
}

async function sampleImagePalette(imageBytes, mediaType) {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "paseo-theme-create-"));
  const inputPath = path.join(temporaryDirectory, `source${mediaTypeExtension(mediaType)}`);
  const bitmapPath = path.join(temporaryDirectory, "sample.bmp");
  try {
    await writeFile(inputPath, imageBytes, { mode: 0o600 });
    await execFileAsync("/usr/bin/sips", [
      "-Z",
      "96",
      "-s",
      "format",
      "bmp",
      inputPath,
      "--out",
      bitmapPath,
    ], { timeout: 20_000 });
    const bitmap = await readFile(bitmapPath);
    return deriveThemeColors(parseBitmapPixels(bitmap).pixels);
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
}

export async function createThemeFromImage({
  description,
  focusX = 0.7,
  focusY = 0.5,
  identifier,
  imagePath,
  name,
  outputDirectory,
  overwrite = false,
  paletteSampler = sampleImagePalette,
}) {
  const resolvedIdentifier = identifier ?? slugifyThemeIdentifier(name);
  if (!resolvedIdentifier || !THEME_IDENTIFIER_PATTERN.test(resolvedIdentifier)) {
    throw new Error("Theme id is required and must use lowercase letters, numbers, and hyphens");
  }
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new Error("Theme name is required");
  }
  if (!Number.isFinite(focusX) || focusX < 0 || focusX > 1) {
    throw new Error("Theme focus-x must be between 0 and 1");
  }
  if (!Number.isFinite(focusY) || focusY < 0 || focusY > 1) {
    throw new Error("Theme focus-y must be between 0 and 1");
  }
  const { bytes: imageBytes, metadata: imageMetadata } = await readThemeImageFile(imagePath);
  const colors = await paletteSampler(imageBytes, imageMetadata.mediaType);
  const imageFileName = `${resolvedIdentifier}${mediaTypeExtension(imageMetadata.mediaType)}`;
  const manifest = buildThemeManifest({
    colors,
    description: description ?? `${name.trim()}：由本地图片自动取色生成的 Paseo 深色主题。`,
    focusX,
    focusY,
    identifier: resolvedIdentifier,
    imageBytes,
    imageFileName,
    imageMetadata,
    name: name.trim(),
  });
  const resolvedOutputDirectory = path.resolve(outputDirectory);
  await mkdir(resolvedOutputDirectory, { mode: 0o700, recursive: true });
  const imageOutputPath = path.join(resolvedOutputDirectory, imageFileName);
  const manifestOutputPath = path.join(resolvedOutputDirectory, `${resolvedIdentifier}.theme.json`);
  const stagingDirectory = await mkdtemp(path.join(resolvedOutputDirectory, ".create-"));
  const stagedImagePath = path.join(stagingDirectory, imageFileName);
  const stagedManifestPath = path.join(stagingDirectory, `${resolvedIdentifier}.theme.json`);
  let linkedImage = false;
  try {
    await writeFile(stagedImagePath, imageBytes, { mode: 0o600 });
    await writeFile(stagedManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
    if (overwrite) {
      await rename(stagedImagePath, imageOutputPath);
      await rename(stagedManifestPath, manifestOutputPath);
    } else {
      await link(stagedImagePath, imageOutputPath);
      linkedImage = true;
      await link(stagedManifestPath, manifestOutputPath);
    }
  } catch (error) {
    if (linkedImage) await unlink(imageOutputPath).catch(() => {});
    if (!overwrite && error.code === "EEXIST") {
      throw new Error(`Theme output already exists in ${resolvedOutputDirectory}; choose another directory or use --force`);
    }
    throw error;
  } finally {
    await rm(stagingDirectory, { force: true, recursive: true });
  }
  return {
    colors,
    imageOutputPath,
    manifest,
    manifestOutputPath,
  };
}
