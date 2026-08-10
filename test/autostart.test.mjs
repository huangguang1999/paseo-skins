import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  assertMacOs,
  buildCdpEnvPlist,
  buildElectronFlagsValue,
  buildGuardianPlist,
  buildGuardianScript,
  buildThemeArguments,
  CDP_ENV_LABEL,
  collectAutostartStatus,
  GUARDIAN_LABEL,
  installAutostart,
  readAutostartConfiguration,
  uninstallAutostart,
} from "../src/autostart.mjs";

test("buildElectronFlagsValue owns the loopback CDP endpoint", () => {
  assert.equal(
    buildElectronFlagsValue(9224),
    "--remote-debugging-address=127.0.0.1 --remote-debugging-port=9224",
  );
});

test("buildCdpEnvPlist injects PASEO_ELECTRON_FLAGS via launchctl setenv", () => {
  const plist = buildCdpEnvPlist({ remoteDebuggingPort: 9224 });
  assert.match(plist, /<string>com\.paseo-skins\.cdp-env<\/string>/);
  assert.match(plist, /<string>\/bin\/launchctl<\/string>/);
  assert.match(plist, /<string>setenv<\/string>/);
  assert.match(plist, /<string>PASEO_ELECTRON_FLAGS<\/string>/);
  assert.match(plist, /--remote-debugging-port=9224/);
  assert.match(plist, /<key>RunAtLoad<\/key>\s*<true\/>/);
});

test("buildGuardianPlist keeps the watcher alive and logs to the given path", () => {
  const plist = buildGuardianPlist({
    nodeExecutablePath: "/opt/node/bin/node",
    scriptPath: "/home/u/.paseo-skin-loader/guardian.mjs",
    logPath: "/home/u/.paseo-skin-loader/guardian.log",
    homeDirectory: "/home/u",
  });
  assert.match(plist, /<string>com\.paseo-skins\.guardian<\/string>/);
  assert.match(plist, /<string>\/opt\/node\/bin\/node<\/string>/);
  assert.match(plist, /<string>\/home\/u\/\.paseo-skin-loader\/guardian\.mjs<\/string>/);
  assert.match(plist, /<key>KeepAlive<\/key>\s*<true\/>/);
  assert.match(plist, /<key>LimitLoadToSessionType<\/key>\s*<string>Aqua<\/string>/);
  assert.match(plist, /<string>\/home\/u\/\.paseo-skin-loader\/guardian\.log<\/string>/);
});

test("buildGuardianPlist escapes XML metacharacters in paths", () => {
  const plist = buildGuardianPlist({
    nodeExecutablePath: "/opt/no&de/node",
    scriptPath: "/home/<user>/guardian.mjs",
    logPath: "/home/u/g.log",
    homeDirectory: "/home/<user>",
  });
  assert.match(plist, /\/opt\/no&amp;de\/node/);
  assert.match(plist, /\/home\/&lt;user&gt;\/guardian\.mjs/);
  assert.ok(!plist.includes("<user>"), "raw <user> must be escaped");
});

test("buildGuardianScript targets the given CLI, port, and theme arguments", () => {
  const script = buildGuardianScript({
    cliPath: "/repo/src/cli.mjs",
    remoteDebuggingPort: 9333,
    themeArguments: ["--theme-url", "https://example.com/t.json"],
  });
  assert.match(script, /^#!\/usr\/bin\/env node/);
  assert.match(script, /const PORT = 9333;/);
  assert.match(script, /"\/repo\/src\/cli\.mjs"/);
  assert.match(script, /"inject"/);
  assert.match(script, /"--theme-url"/);
  assert.match(script, /"https:\/\/example\.com\/t\.json"/);
});

test("buildThemeArguments prefers a URL, falls back to a manifest, else empty", () => {
  assert.deepEqual(
    buildThemeArguments({ themeUrl: "https://example.com/t.json" }),
    ["--theme-url", "https://example.com/t.json"],
  );
  assert.deepEqual(
    buildThemeArguments({ themeManifest: "/abs/theme.json" }),
    ["--theme", "/abs/theme.json"],
  );
  assert.deepEqual(buildThemeArguments({}), []);
});

test("assertMacOs rejects non-darwin platforms", () => {
  assert.doesNotThrow(() => assertMacOs("darwin"));
  assert.throws(() => assertMacOs("linux"), /only supported on macOS/);
  assert.throws(() => assertMacOs("win32"), /only supported on macOS/);
});

test("installAutostart writes both plists, the guardian script, and bootstraps them", async (context) => {
  const home = await mkdtemp(path.join(os.tmpdir(), "paseo-autostart-install-"));
  context.after(() => rm(home, { force: true, recursive: true }));
  const originalHome = process.env.HOME;
  process.env.HOME = home;
  context.after(() => {
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
  });

  const calls = [];
  const fakeExecuteFile = async (file, args) => {
    calls.push([file, ...args]);
    return { stdout: "", stderr: "" };
  };

  const result = await installAutostart({
    remoteDebuggingPort: 9224,
    themeArguments: ["--theme", "/abs/theme.json"],
    nodeExecutablePath: "/opt/node/bin/node",
    cliPath: "/repo/src/cli.mjs",
    homeDirectory: home,
    userId: 501,
    platform: "darwin",
    executeFileImplementation: fakeExecuteFile,
  });

  const cdpEnvPlist = path.join(home, "Library", "LaunchAgents", `${CDP_ENV_LABEL}.plist`);
  const guardianPlist = path.join(home, "Library", "LaunchAgents", `${GUARDIAN_LABEL}.plist`);
  const guardianScript = path.join(home, ".paseo-skin-loader", "guardian.mjs");
  const configurationPath = path.join(home, ".paseo-skin-loader", "autostart.json");
  assert.equal(result.cdpEnvPlist, cdpEnvPlist);
  assert.equal(result.guardianPlist, guardianPlist);
  assert.equal(result.guardianScript, guardianScript);
  assert.equal(result.configurationPath, configurationPath);

  assert.match(await readFile(cdpEnvPlist, "utf8"), /--remote-debugging-port=9224/);
  const guardianScriptSource = await readFile(guardianScript, "utf8");
  assert.match(guardianScriptSource, /"--theme"/);
  assert.match(guardianScriptSource, /"\/abs\/theme\.json"/);
  // 脚本必须可执行
  assert.equal((await stat(guardianScript)).mode & 0o100, 0o100);
  assert.equal((await stat(configurationPath)).mode & 0o077, 0);
  assert.deepEqual(
    await readAutostartConfiguration({ configurationPath, guardianPath: guardianScript }),
    {
      schemaVersion: 1,
      cliPath: "/repo/src/cli.mjs",
      nodeExecutablePath: "/opt/node/bin/node",
      remoteDebuggingPort: 9224,
      themeArguments: ["--theme", "/abs/theme.json"],
    },
  );

  const flat = calls.map((call) => call.join(" "));
  assert.ok(flat.some((c) => c === `bootout gui/501/${CDP_ENV_LABEL}` || c.endsWith(`bootout gui/501/${CDP_ENV_LABEL}`)));
  assert.ok(flat.some((c) => c.includes(`bootstrap gui/501`) && c.includes(cdpEnvPlist)));
  assert.ok(flat.some((c) => c.includes(`bootstrap gui/501`) && c.includes(guardianPlist)));
  assert.ok(flat.some((c) => c.includes(`kickstart -k gui/501/${CDP_ENV_LABEL}`)));
});

test("readAutostartConfiguration migrates a legacy generated guardian", async (context) => {
  const stateRoot = await mkdtemp(path.join(os.tmpdir(), "paseo-autostart-legacy-"));
  context.after(() => rm(stateRoot, { force: true, recursive: true }));
  const guardianPath = path.join(stateRoot, "guardian.mjs");
  await writeFile(guardianPath, buildGuardianScript({
    cliPath: "/stable/repo/src/cli.mjs",
    remoteDebuggingPort: 9224,
    themeArguments: ["--theme-url", "https://example.com/theme.json"],
  }));

  assert.deepEqual(
    await readAutostartConfiguration({
      configurationPath: path.join(stateRoot, "missing.json"),
      guardianPath,
      nodeExecutablePath: "/opt/node/bin/node",
    }),
    {
      schemaVersion: 1,
      cliPath: "/stable/repo/src/cli.mjs",
      nodeExecutablePath: "/opt/node/bin/node",
      remoteDebuggingPort: 9224,
      themeArguments: ["--theme-url", "https://example.com/theme.json"],
    },
  );
});

test("installAutostart refuses non-macOS platforms", async () => {
  await assert.rejects(
    () => installAutostart({ remoteDebuggingPort: 9224, platform: "linux", userId: 501 }),
    /only supported on macOS/,
  );
});

test("uninstallAutostart boots out both labels and removes generated files", async (context) => {
  const home = await mkdtemp(path.join(os.tmpdir(), "paseo-autostart-uninstall-"));
  context.after(() => rm(home, { force: true, recursive: true }));
  const originalHome = process.env.HOME;
  process.env.HOME = home;
  context.after(() => {
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
  });

  const calls = [];
  const fakeExecuteFile = async (file, args) => {
    calls.push([file, ...args].join(" "));
    return { stdout: "", stderr: "" };
  };

  // 先装再卸，验证卸载后文件消失
  await installAutostart({
    remoteDebuggingPort: 9224,
    themeArguments: [],
    nodeExecutablePath: "/opt/node/bin/node",
    cliPath: "/repo/src/cli.mjs",
    homeDirectory: home,
    userId: 501,
    platform: "darwin",
    executeFileImplementation: fakeExecuteFile,
  });

  const result = await uninstallAutostart({
    userId: 501,
    platform: "darwin",
    executeFileImplementation: fakeExecuteFile,
  });

  assert.equal(result.uninstalled, true);
  for (const removed of result.removed) {
    await assert.rejects(() => stat(removed), /ENOENT/);
  }
  assert.ok(calls.some((c) => c === `/bin/launchctl bootout gui/501/${CDP_ENV_LABEL}`));
  assert.ok(calls.some((c) => c === `/bin/launchctl bootout gui/501/${GUARDIAN_LABEL}`));
  assert.ok(calls.some((c) => c === "/bin/launchctl unsetenv PASEO_ELECTRON_FLAGS"));
});

test("collectAutostartStatus reports unsupported on non-darwin", async () => {
  const report = await collectAutostartStatus({ platform: "linux", userId: 501 });
  assert.equal(report.supported, false);
  assert.equal(report.cdpEnvLoaded, false);
  assert.equal(report.guardianLoaded, false);
});

test("collectAutostartStatus reflects launchctl print results", async () => {
  const fakeExecuteFile = async (file, args) => {
    const target = args[1] ?? "";
    if (target.endsWith(CDP_ENV_LABEL)) return { stdout: "loaded", stderr: "" };
    throw new Error("Could not find service");
  };
  const report = await collectAutostartStatus({
    userId: 501,
    platform: "darwin",
    executeFileImplementation: fakeExecuteFile,
  });
  assert.equal(report.supported, true);
  assert.equal(report.cdpEnvLoaded, true);
  assert.equal(report.guardianLoaded, false);
});
