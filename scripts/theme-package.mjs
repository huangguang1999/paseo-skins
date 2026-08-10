import { inflateRawSync } from "node:zlib";

import {
  assertSafeZipEntryName,
  calculateCrc32,
  createStoredZipBytes,
  createThemePackageBytes,
} from "../shared/stored-zip.mjs";

const ZIP_LOCAL_FILE_HEADER = 0x04034b50;
const MAX_ZIP_ENTRIES = 64;
const MAX_ZIP_ENTRY_BYTES = 20 * 1024 * 1024;
const MAX_ZIP_EXPANDED_BYTES = 32 * 1024 * 1024;

export function createStoredZip(files) {
  return Buffer.from(createStoredZipBytes(files));
}

export function readZipEntries(archiveBytes) {
  const archive = Buffer.isBuffer(archiveBytes) ? archiveBytes : Buffer.from(archiveBytes);
  const entries = new Map();
  let offset = 0;
  let expandedBytes = 0;

  while (offset + 4 <= archive.length && archive.readUInt32LE(offset) === ZIP_LOCAL_FILE_HEADER) {
    if (offset + 30 > archive.length) throw new Error("ZIP local header is truncated");
    const flags = archive.readUInt16LE(offset + 6);
    const method = archive.readUInt16LE(offset + 8);
    const checksum = archive.readUInt32LE(offset + 14);
    const compressedSize = archive.readUInt32LE(offset + 18);
    const uncompressedSize = archive.readUInt32LE(offset + 22);
    const nameLength = archive.readUInt16LE(offset + 26);
    const extraLength = archive.readUInt16LE(offset + 28);
    if (entries.size >= MAX_ZIP_ENTRIES) throw new Error("ZIP archive contains too many files");
    if ((flags & 0x0001) !== 0) throw new Error("Encrypted ZIP entries are unsupported");
    if ((flags & 0x0008) !== 0) throw new Error("ZIP data descriptors are unsupported");
    if (![0, 8].includes(method)) throw new Error(`Unsupported ZIP compression method: ${method}`);
    if (uncompressedSize > MAX_ZIP_ENTRY_BYTES) throw new Error("ZIP entry exceeds the expanded size limit");
    expandedBytes += uncompressedSize;
    if (expandedBytes > MAX_ZIP_EXPANDED_BYTES) throw new Error("ZIP archive exceeds the expanded size limit");

    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > archive.length) throw new Error("ZIP entry data is truncated");
    const name = archive.subarray(nameStart, nameStart + nameLength).toString("utf8");
    assertSafeZipEntryName(name);
    if (entries.has(name)) throw new Error(`Duplicate ZIP entry: ${name}`);

    const compressed = archive.subarray(dataStart, dataEnd);
    const contents = method === 0
      ? Buffer.from(compressed)
      : inflateRawSync(compressed, { maxOutputLength: MAX_ZIP_ENTRY_BYTES });
    if (contents.length !== uncompressedSize || calculateCrc32(contents) !== checksum) {
      throw new Error(`ZIP entry integrity mismatch: ${name}`);
    }
    entries.set(name, contents);
    offset = dataEnd;
  }

  if (entries.size === 0) throw new Error("ZIP archive contains no readable files");
  return entries;
}

export function createThemePackage({
  identifier,
  imageFilename,
  imageBytes,
  manifestFilename,
  manifestBytes,
  sourceAuthor = null,
  sourceLicense = null,
  sourceImageSha256 = null,
  sourcePackageSha256 = null,
  sourceUrl = null,
  sourceVersionId = null,
}) {
  return Buffer.from(createThemePackageBytes({
    identifier,
    imageFilename,
    imageBytes,
    manifestFilename,
    manifestBytes,
    sourceAuthor,
    sourceLicense,
    sourceImageSha256,
    sourcePackageSha256,
    sourceUrl,
    sourceVersionId,
  }));
}
