const ZIP_LOCAL_FILE_HEADER = 0x04034b50;
const ZIP_CENTRAL_DIRECTORY_HEADER = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const ZIP_UTF8_FLAG = 0x0800;
const ZIP_VERSION = 20;
const ZIP_DOS_DATE_1980_01_01 = 0x0021;

const crcTable = Array.from({ length: 256 }, (_, value) => {
  let checksum = value;
  for (let bit = 0; bit < 8; bit += 1) {
    checksum = (checksum & 1) === 1 ? (checksum >>> 1) ^ 0xedb88320 : checksum >>> 1;
  }
  return checksum >>> 0;
});

function crc32(bytes) {
  let checksum = 0xffffffff;
  for (const byte of bytes) checksum = (checksum >>> 8) ^ crcTable[(checksum ^ byte) & 0xff];
  return (checksum ^ 0xffffffff) >>> 0;
}

function localFileHeader(entry) {
  const header = Buffer.alloc(30);
  header.writeUInt32LE(ZIP_LOCAL_FILE_HEADER, 0);
  header.writeUInt16LE(ZIP_VERSION, 4);
  header.writeUInt16LE(ZIP_UTF8_FLAG, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(ZIP_DOS_DATE_1980_01_01, 12);
  header.writeUInt32LE(entry.checksum, 14);
  header.writeUInt32LE(entry.contents.length, 18);
  header.writeUInt32LE(entry.contents.length, 22);
  header.writeUInt16LE(entry.name.length, 26);
  header.writeUInt16LE(0, 28);
  return Buffer.concat([header, entry.name]);
}

function centralDirectoryHeader(entry) {
  const header = Buffer.alloc(46);
  header.writeUInt32LE(ZIP_CENTRAL_DIRECTORY_HEADER, 0);
  header.writeUInt16LE(ZIP_VERSION, 4);
  header.writeUInt16LE(ZIP_VERSION, 6);
  header.writeUInt16LE(ZIP_UTF8_FLAG, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt16LE(ZIP_DOS_DATE_1980_01_01, 14);
  header.writeUInt32LE(entry.checksum, 16);
  header.writeUInt32LE(entry.contents.length, 20);
  header.writeUInt32LE(entry.contents.length, 24);
  header.writeUInt16LE(entry.name.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(entry.offset, 42);
  return Buffer.concat([header, entry.name]);
}

export function createStoredZip(files) {
  if (!Array.isArray(files) || files.length === 0 || files.length > 0xffff) {
    throw new Error("ZIP package must contain between 1 and 65535 files");
  }
  const entries = [];
  const localParts = [];
  let offset = 0;
  for (const file of files) {
    if (!/^[a-z0-9][a-z0-9./-]{0,239}$/i.test(file.name) || file.name.includes("..")) {
      throw new Error(`Unsafe ZIP entry name: ${file.name}`);
    }
    const contents = Buffer.isBuffer(file.contents) ? file.contents : Buffer.from(file.contents);
    const entry = {
      checksum: crc32(contents),
      contents,
      name: Buffer.from(file.name, "utf8"),
      offset,
    };
    const header = localFileHeader(entry);
    localParts.push(header, contents);
    entries.push(entry);
    offset += header.length + contents.length;
  }

  const centralDirectory = Buffer.concat(entries.map(centralDirectoryHeader));
  const end = Buffer.alloc(22);
  end.writeUInt32LE(ZIP_END_OF_CENTRAL_DIRECTORY, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

export function createThemePackage({ identifier, imageFilename, imageBytes, manifestFilename, manifestBytes }) {
  const readme = `Paseo Skins theme: ${identifier}\n\n` +
    "1. Keep the theme manifest and image in this directory.\n" +
    "2. Install with:\n\n" +
    `   npx --yes github:huangguang1999/paseo-skins start --theme \"./${manifestFilename}\"\n\n` +
    "The CLI validates the Theme v2 manifest and image integrity before applying it.\n";
  return createStoredZip([
    { name: `${identifier}/${manifestFilename}`, contents: manifestBytes },
    { name: `${identifier}/${imageFilename}`, contents: imageBytes },
    { name: `${identifier}/README.txt`, contents: readme },
  ]);
}
