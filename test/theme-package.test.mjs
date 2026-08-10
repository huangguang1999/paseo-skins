import assert from "node:assert/strict";
import test from "node:test";
import { deflateRawSync } from "node:zlib";

import { createStoredZip, createThemePackage, readZipEntries } from "../scripts/theme-package.mjs";

test("theme packages are deterministic ZIP archives with all required files", () => {
  const options = {
    identifier: "quiet-orbit",
    imageFilename: "quiet-orbit.png",
    imageBytes: Buffer.from("image-bytes"),
    manifestFilename: "quiet-orbit.theme.json",
    manifestBytes: Buffer.from('{"id":"quiet-orbit"}\n'),
  };

  const first = createThemePackage(options);
  const second = createThemePackage(options);

  assert.deepEqual(first, second);
  assert.equal(first.readUInt32LE(0), 0x04034b50);
  assert.equal(first.readUInt32LE(first.length - 22), 0x06054b50);
  for (const filename of ["quiet-orbit.theme.json", "quiet-orbit.png", "README.txt"]) {
    assert.ok(first.includes(Buffer.from(`quiet-orbit/${filename}`)));
  }
});

test("stored ZIP creation rejects empty packages and traversal entry names", () => {
  assert.throws(() => createStoredZip([]), /between 1 and 65535 files/);
  assert.throws(
    () => createStoredZip([{ name: "../outside.txt", contents: "unsafe" }]),
    /Unsafe ZIP entry name/,
  );
  assert.throws(
    () => createStoredZip([{ name: "/absolute.txt", contents: "unsafe" }]),
    /Unsafe ZIP entry name/,
  );
  assert.throws(
    () => createStoredZip([
      { name: "same.txt", contents: "first" },
      { name: "same.txt", contents: "second" },
    ]),
    /Duplicate ZIP entry/,
  );
});

test("ZIP reader verifies stored and deflated files", () => {
  const contents = Buffer.from("deflated contents");
  const stored = createStoredZip([{ name: "theme.json", contents }]);
  assert.equal(readZipEntries(stored).get("theme.json").toString(), "deflated contents");

  const filename = Buffer.from("theme.json");
  const compressed = deflateRawSync(contents);
  const header = Buffer.from(stored.subarray(0, 30 + filename.length));
  header.writeUInt16LE(8, 8);
  header.writeUInt32LE(compressed.length, 18);
  header.writeUInt32LE(contents.length, 22);
  const deflated = Buffer.concat([header, compressed]);
  assert.equal(readZipEntries(deflated).get("theme.json").toString(), "deflated contents");

  const damaged = Buffer.from(stored);
  damaged[30 + filename.length] ^= 0xff;
  assert.throws(() => readZipEntries(damaged), /integrity mismatch/);
});
