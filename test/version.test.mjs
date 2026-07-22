import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { PACKAGE_VERSION } from "../src/version.mjs";

test("runtime version matches package metadata", async () => {
  const packageMetadata = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  assert.equal(PACKAGE_VERSION, packageMetadata.version);
});
