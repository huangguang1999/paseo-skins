import assert from "node:assert/strict";
import test from "node:test";

import { parseArguments } from "../src/cli.mjs";

test("parseArguments supports top-level help and safe defaults", () => {
  assert.equal(parseArguments(["--help"]).command, "help");
  const options = parseArguments(["doctor"]);
  assert.equal(options.command, "doctor");
  assert.equal(options.remoteDebuggingPort, 9224);
  assert.equal(options.json, false);
  assert.equal(options.themeUrl, null);
});

test("parseArguments supports a remote theme URL", () => {
  const options = parseArguments([
    "start",
    "--theme-url",
    "https://example.com/themes/night.theme.json",
  ]);

  assert.equal(options.themeUrl, "https://example.com/themes/night.theme.json");
});

test("parseArguments rejects privileged and invalid ports", () => {
  assert.throws(() => parseArguments(["status", "--port", "80"]), /Invalid CDP port/);
  assert.throws(() => parseArguments(["status", "--port", "not-a-number"]), /Invalid CDP port/);
});
