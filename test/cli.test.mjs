import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";

import { parseArguments } from "../src/cli.mjs";

const execFileAsync = promisify(execFile);

test("parseArguments supports top-level help and safe defaults", () => {
  assert.equal(parseArguments(["--help"]).command, "help");
  assert.equal(parseArguments([]).command, "help");
  const options = parseArguments(["doctor"]);
  assert.equal(options.command, "doctor");
  assert.equal(options.remoteDebuggingPort, 9224);
  assert.equal(options.json, false);
  assert.equal(options.themeUrl, null);
});

test("parseArguments resolves command help before required positional arguments", () => {
  assert.deepEqual(
    [parseArguments(["apply", "--help"]), parseArguments(["autostart", "--help"])].map(
      ({ command, helpCommand }) => ({ command, helpCommand }),
    ),
    [
      { command: "help", helpCommand: "apply" },
      { command: "help", helpCommand: "autostart" },
    ],
  );
});

test("CLI help is side-effect free and supports progressive disclosure", async () => {
  const cliPath = new URL("../src/cli.mjs", import.meta.url);
  const [globalHelp, applyHelp] = await Promise.all([
    execFileAsync(process.execPath, [cliPath.pathname]),
    execFileAsync(process.execPath, [cliPath.pathname, "apply", "--help"]),
  ]);

  assert.match(globalHelp.stdout, /Usage:/);
  assert.match(globalHelp.stdout, /paseo-skin apply <theme-id>/);
  assert.match(applyHelp.stdout, /Apply a public theme/);
  assert.match(applyHelp.stdout, /Examples:/);
});

test("parseArguments supports a remote theme URL", () => {
  const options = parseArguments([
    "start",
    "--theme-url",
    "https://example.com/themes/night.theme.json",
  ]);

  assert.equal(options.themeUrl, "https://example.com/themes/night.theme.json");
  assert.equal(options.themeWasExplicit, true);
});

test("verify distinguishes the active theme from an explicitly requested theme", () => {
  assert.equal(parseArguments(["verify"]).themeWasExplicit, false);
  assert.equal(parseArguments(["verify", "--theme", "/tmp/theme.json"]).themeWasExplicit, true);
});

test("parseArguments supports applying a public theme by id", () => {
  const options = parseArguments(["apply", "aurora-ridge", "--port", "9225"]);
  assert.equal(options.command, "apply");
  assert.equal(options.publicThemeId, "aurora-ridge");
  assert.equal(options.remoteDebuggingPort, 9225);
  assert.throws(() => parseArguments(["apply"]), /valid lowercase theme id/);
  assert.throws(() => parseArguments(["apply", "Aurora Ridge"]), /valid lowercase theme id/);
});

test("parseArguments rejects privileged and invalid ports", () => {
  assert.throws(() => parseArguments(["status", "--port", "80"]), /Invalid CDP port/);
  assert.throws(() => parseArguments(["status", "--port", "not-a-number"]), /Invalid CDP port/);
});

test("parseArguments validates one-image theme creation", () => {
  const options = parseArguments([
    "create",
    "--image",
    "/tmp/background.webp",
    "--name",
    "Mountain Night",
    "--id",
    "mountain-night",
    "--output",
    "/tmp/generated-theme",
    "--focus-x",
    "0.62",
  ]);

  assert.equal(options.command, "create");
  assert.equal(options.themeId, "mountain-night");
  assert.equal(options.focusX, 0.62);
  assert.throws(
    () => parseArguments(["create", "--image", "/tmp/a.png", "--name", "A"]),
    /create requires --image, --name, and --output/,
  );
});
