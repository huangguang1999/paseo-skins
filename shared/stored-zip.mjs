const ZIP_LOCAL_FILE_HEADER = 0x04034b50;
const ZIP_CENTRAL_DIRECTORY_HEADER = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const ZIP_UTF8_FLAG = 0x0800;
const ZIP_VERSION = 20;
const ZIP_DOS_DATE_1980_01_01 = 0x0021;
const textEncoder = new TextEncoder();

const crcTable = Array.from({ length: 256 }, (_, value) => {
  let checksum = value;
  for (let bit = 0; bit < 8; bit += 1) {
    checksum = (checksum & 1) === 1 ? (checksum >>> 1) ^ 0xedb88320 : checksum >>> 1;
  }
  return checksum >>> 0;
});

function toBytes(value) {
  if (typeof value === "string") return textEncoder.encode(value);
  if (value instanceof Uint8Array) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  throw new TypeError("ZIP contents must be text, Uint8Array, or ArrayBuffer");
}

function concatenateBytes(parts) {
  const output = new Uint8Array(parts.reduce((total, part) => total + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }
  return output;
}

function writeUint16(bytes, offset, value) {
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint16(offset, value, true);
}

function writeUint32(bytes, offset, value) {
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint32(offset, value, true);
}

export function calculateCrc32(bytesValue) {
  const bytes = toBytes(bytesValue);
  let checksum = 0xffffffff;
  for (const byte of bytes) checksum = (checksum >>> 8) ^ crcTable[(checksum ^ byte) & 0xff];
  return (checksum ^ 0xffffffff) >>> 0;
}

export function assertSafeZipEntryName(name) {
  if (!/^[a-z0-9][a-z0-9./-]{0,239}$/i.test(name) || name.includes("..")) {
    throw new Error(`Unsafe ZIP entry name: ${name}`);
  }
}

function localFileHeader(entry) {
  const header = new Uint8Array(30);
  writeUint32(header, 0, ZIP_LOCAL_FILE_HEADER);
  writeUint16(header, 4, ZIP_VERSION);
  writeUint16(header, 6, ZIP_UTF8_FLAG);
  writeUint16(header, 12, ZIP_DOS_DATE_1980_01_01);
  writeUint32(header, 14, entry.checksum);
  writeUint32(header, 18, entry.contents.byteLength);
  writeUint32(header, 22, entry.contents.byteLength);
  writeUint16(header, 26, entry.name.byteLength);
  return concatenateBytes([header, entry.name]);
}

function centralDirectoryHeader(entry) {
  const header = new Uint8Array(46);
  writeUint32(header, 0, ZIP_CENTRAL_DIRECTORY_HEADER);
  writeUint16(header, 4, ZIP_VERSION);
  writeUint16(header, 6, ZIP_VERSION);
  writeUint16(header, 8, ZIP_UTF8_FLAG);
  writeUint16(header, 14, ZIP_DOS_DATE_1980_01_01);
  writeUint32(header, 16, entry.checksum);
  writeUint32(header, 20, entry.contents.byteLength);
  writeUint32(header, 24, entry.contents.byteLength);
  writeUint16(header, 28, entry.name.byteLength);
  writeUint32(header, 42, entry.offset);
  return concatenateBytes([header, entry.name]);
}

export function createStoredZipBytes(files) {
  if (!Array.isArray(files) || files.length === 0 || files.length > 0xffff) {
    throw new Error("ZIP package must contain between 1 and 65535 files");
  }
  const entries = [];
  const names = new Set();
  const localParts = [];
  let offset = 0;
  for (const file of files) {
    assertSafeZipEntryName(file.name);
    if (names.has(file.name)) throw new Error(`Duplicate ZIP entry: ${file.name}`);
    names.add(file.name);
    const contents = toBytes(file.contents);
    const entry = {
      checksum: calculateCrc32(contents),
      contents,
      name: textEncoder.encode(file.name),
      offset,
    };
    const header = localFileHeader(entry);
    localParts.push(header, contents);
    entries.push(entry);
    offset += header.byteLength + contents.byteLength;
  }

  const centralDirectory = concatenateBytes(entries.map(centralDirectoryHeader));
  const end = new Uint8Array(22);
  writeUint32(end, 0, ZIP_END_OF_CENTRAL_DIRECTORY);
  writeUint16(end, 8, entries.length);
  writeUint16(end, 10, entries.length);
  writeUint32(end, 12, centralDirectory.byteLength);
  writeUint32(end, 16, offset);
  return concatenateBytes([...localParts, centralDirectory, end]);
}

export function createThemePackageBytes({
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
  const readme = `Paseo Skins theme: ${identifier}\n\n` +
    (sourceUrl ? `Original DreamSkin package: ${sourceUrl}\n` : "") +
    (sourceAuthor ? `Original author: ${sourceAuthor}\n` : "") +
    (sourceLicense ? `Original license: ${sourceLicense}\n` : "") +
    (sourceVersionId ? `Original version id: ${sourceVersionId}\n` : "") +
    (sourcePackageSha256 ? `Original package SHA-256: ${sourcePackageSha256}\n` : "") +
    (sourceImageSha256 ? `Original image SHA-256: ${sourceImageSha256}\n` : "") +
    (sourceUrl ? "The original background image is preserved byte-for-byte.\n\n" : "") +
    "1. Keep the theme manifest and image in this directory.\n" +
    "2. Install with:\n\n" +
    `   npx --yes github:huangguang1999/paseo-skins start --theme "./${manifestFilename}"\n\n` +
    "The CLI validates the Theme v2 manifest and image integrity before applying it.\n";
  return createStoredZipBytes([
    { name: `${identifier}/${manifestFilename}`, contents: manifestBytes },
    { name: `${identifier}/${imageFilename}`, contents: imageBytes },
    { name: `${identifier}/README.txt`, contents: readme },
  ]);
}
