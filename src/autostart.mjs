import { execFile } from "node:child_process";
import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const executeFile = promisify(execFile);
const AUTOSTART_CONFIGURATION_SCHEMA_VERSION = 1;

// 中性、可移植的 launchd 标签（不含任何机器/用户特定前缀）。
export const CDP_ENV_LABEL = "com.paseo-skins.cdp-env";
export const GUARDIAN_LABEL = "com.paseo-skins.guardian";

// 所有生成的运行时文件都放在既有的状态目录下，保持与 watcher-lock / remote-theme 一致。
export function autostartStateRoot() {
  return path.join(os.homedir(), ".paseo-skin-loader");
}

function launchAgentsDirectory() {
  return path.join(os.homedir(), "Library", "LaunchAgents");
}

function cdpEnvPlistPath() {
  return path.join(launchAgentsDirectory(), `${CDP_ENV_LABEL}.plist`);
}

function guardianPlistPath() {
  return path.join(launchAgentsDirectory(), `${GUARDIAN_LABEL}.plist`);
}

function guardianScriptPath() {
  return path.join(autostartStateRoot(), "guardian.mjs");
}

function guardianLogPath() {
  return path.join(autostartStateRoot(), "guardian.log");
}

function autostartConfigurationPath() {
  return path.join(autostartStateRoot(), "autostart.json");
}

function validateThemeArguments(themeArguments) {
  if (!Array.isArray(themeArguments) || !themeArguments.every((argument) => typeof argument === "string")) {
    throw new Error("Autostart theme arguments must be strings");
  }
  if (themeArguments.length === 0) return themeArguments;
  if (themeArguments.length !== 2 || !["--theme", "--theme-url"].includes(themeArguments[0])) {
    throw new Error("Autostart theme arguments have an invalid shape");
  }
  if (themeArguments[0] === "--theme" && !path.isAbsolute(themeArguments[1])) {
    throw new Error("Autostart theme manifest must be absolute");
  }
  if (themeArguments[0] === "--theme-url") {
    const themeUrl = new URL(themeArguments[1]);
    if (themeUrl.protocol !== "https:" || themeUrl.username || themeUrl.password) {
      throw new Error("Autostart theme URL must be credential-free HTTPS");
    }
  }
  return themeArguments;
}

function validateAutostartConfiguration(configuration) {
  if (
    !configuration ||
    typeof configuration !== "object" ||
    Array.isArray(configuration) ||
    configuration.schemaVersion !== AUTOSTART_CONFIGURATION_SCHEMA_VERSION ||
    typeof configuration.cliPath !== "string" ||
    !path.isAbsolute(configuration.cliPath) ||
    typeof configuration.nodeExecutablePath !== "string" ||
    !path.isAbsolute(configuration.nodeExecutablePath) ||
    !Number.isInteger(configuration.remoteDebuggingPort) ||
    configuration.remoteDebuggingPort < 1_024 ||
    configuration.remoteDebuggingPort > 65_535
  ) {
    throw new Error("Autostart configuration has an invalid schema");
  }
  return {
    ...configuration,
    themeArguments: validateThemeArguments(configuration.themeArguments),
  };
}

function parseLegacyGuardianConfiguration(source, nodeExecutablePath) {
  const match = source.match(
    /const child = spawn\(process\.execPath, \[([^\n]+)\], \{ stdio: "inherit" \}\);/,
  );
  if (!match) throw new Error("Legacy guardian configuration could not be recovered");
  let argumentsList;
  try {
    argumentsList = JSON.parse(`[${match[1]}]`);
  } catch {
    throw new Error("Legacy guardian arguments are invalid");
  }
  if (
    argumentsList.length < 4 ||
    typeof argumentsList[0] !== "string" ||
    argumentsList[1] !== "inject" ||
    argumentsList[2] !== "--port"
  ) {
    throw new Error("Legacy guardian arguments have an invalid shape");
  }
  return validateAutostartConfiguration({
    schemaVersion: AUTOSTART_CONFIGURATION_SCHEMA_VERSION,
    cliPath: argumentsList[0],
    nodeExecutablePath,
    remoteDebuggingPort: Number(argumentsList[3]),
    themeArguments: argumentsList.slice(4),
  });
}

export async function readAutostartConfiguration({
  configurationPath = autostartConfigurationPath(),
  guardianPath = guardianScriptPath(),
  nodeExecutablePath = process.execPath,
} = {}) {
  try {
    return validateAutostartConfiguration(JSON.parse(await readFile(configurationPath, "utf8")));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return parseLegacyGuardianConfiguration(await readFile(guardianPath, "utf8"), nodeExecutablePath);
}

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function plistDocument(bodyLines) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    "<dict>",
    ...bodyLines,
    "</dict>",
    "</plist>",
    "",
  ].join("\n");
}

// launchctl setenv 注入的 flags 字符串；与 electron-launcher 的 CDP 约定保持一致。
export function buildElectronFlagsValue(remoteDebuggingPort) {
  return `--remote-debugging-address=127.0.0.1 --remote-debugging-port=${remoteDebuggingPort}`;
}

// 每次登录时把 PASEO_ELECTRON_FLAGS 注入 launchd 域，使任何方式启动的 Paseo
// 桌面（Dock/Spotlight/自动更新/开机自启）都自动开启只绑回环地址的 CDP。
export function buildCdpEnvPlist({ remoteDebuggingPort }) {
  return plistDocument([
    "  <key>Label</key>",
    `  <string>${CDP_ENV_LABEL}</string>`,
    "  <key>ProgramArguments</key>",
    "  <array>",
    "    <string>/bin/launchctl</string>",
    "    <string>setenv</string>",
    "    <string>PASEO_ELECTRON_FLAGS</string>",
    `    <string>${xmlEscape(buildElectronFlagsValue(remoteDebuggingPort))}</string>`,
    "  </array>",
    "  <key>RunAtLoad</key>",
    "  <true/>",
  ]);
}

// keepalive 常驻 guardian 脚本，让皮肤在 Paseo 桌面重启后自动恢复。
export function buildGuardianPlist({
  nodeExecutablePath,
  scriptPath,
  logPath,
  homeDirectory,
}) {
  return plistDocument([
    "  <key>Label</key>",
    `  <string>${GUARDIAN_LABEL}</string>`,
    "  <key>ProgramArguments</key>",
    "  <array>",
    `    <string>${xmlEscape(nodeExecutablePath)}</string>`,
    `    <string>${xmlEscape(scriptPath)}</string>`,
    "  </array>",
    "  <key>EnvironmentVariables</key>",
    "  <dict>",
    "    <key>HOME</key>",
    `    <string>${xmlEscape(homeDirectory)}</string>`,
    "  </dict>",
    "  <key>LimitLoadToSessionType</key>",
    "  <string>Aqua</string>",
    "  <key>RunAtLoad</key>",
    "  <true/>",
    "  <key>KeepAlive</key>",
    "  <true/>",
    "  <key>ThrottleInterval</key>",
    "  <integer>10</integer>",
    "  <key>StandardOutPath</key>",
    `  <string>${xmlEscape(logPath)}</string>`,
    "  <key>StandardErrorPath</key>",
    `  <string>${xmlEscape(logPath)}</string>`,
  ]);
}

// guardian 脚本本体：等 CDP 就绪后 exec `paseo-skin inject`，跟随 Paseo 任意次重启。
// 用 Node.js 编写而非 shell，避免依赖任何特定 shell 或 PATH。
export function buildGuardianScript({ cliPath, remoteDebuggingPort, themeArguments }) {
  const injectArguments = [
    JSON.stringify(cliPath),
    '"inject"',
    '"--port"',
    JSON.stringify(String(remoteDebuggingPort)),
    ...themeArguments.map((argument) => JSON.stringify(argument)),
  ].join(", ");

  return `#!/usr/bin/env node
// Auto-generated by \`paseo-skin autostart install\`. Do not edit by hand;
// re-run install to regenerate. Removed by \`paseo-skin autostart uninstall\`.
//
// Waits for the loopback CDP endpoint to come up (Paseo launched with the
// PASEO_ELECTRON_FLAGS injected by ${CDP_ENV_LABEL}), then execs the skin
// inject watcher. launchd KeepAlive relaunches this script if inject exits.
import { spawn } from "node:child_process";

const PORT = ${remoteDebuggingPort};
const POLL_MILLISECONDS = 2_000;
const MAX_WAIT_ATTEMPTS = 150; // ~5 min, then exit for launchd to retry.

function log(message) {
  process.stdout.write(\`[\${new Date().toISOString()}] \${message}\\n\`);
}

async function cdpReady() {
  try {
    const response = await fetch(\`http://127.0.0.1:\${PORT}/json/version\`, {
      signal: AbortSignal.timeout(3_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForCdp() {
  for (let attempt = 0; attempt < MAX_WAIT_ATTEMPTS; attempt += 1) {
    if (await cdpReady()) return true;
    if (attempt === 0) {
      log("waiting for CDP on 127.0.0.1:" + PORT + " (Paseo must launch with remote-debugging enabled)");
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MILLISECONDS));
  }
  return false;
}

const ready = await waitForCdp();
if (!ready) {
  log("CDP still not ready after ~5min; exiting for launchd to retry later");
  process.exit(0);
}

log("CDP ready on 127.0.0.1:" + PORT + "; starting skin inject watcher");
const child = spawn(process.execPath, [${injectArguments}], { stdio: "inherit" });
child.on("exit", (code) => {
  log("inject watcher exited with code " + code + "; launchd will relaunch");
  process.exit(code ?? 0);
});
`;
}

export function assertMacOs(platform = process.platform) {
  if (platform !== "darwin") {
    throw new Error("autostart is only supported on macOS");
  }
}

// theme 选择转成 inject 的透传参数（保持与 CLI --theme / --theme-url 一致）。
export function buildThemeArguments({ themeUrl = null, themeManifest = null } = {}) {
  if (themeUrl) return ["--theme-url", themeUrl];
  if (themeManifest) return ["--theme", themeManifest];
  return [];
}

async function bootoutLabel(label, { userId, executeFileImplementation }) {
  await executeFileImplementation("/bin/launchctl", [
    "bootout",
    `gui/${userId}/${label}`,
  ]).catch(() => {});
}

async function bootstrapPlist(plistPath, { userId, executeFileImplementation }) {
  await executeFileImplementation("/bin/launchctl", [
    "bootstrap",
    `gui/${userId}`,
    plistPath,
  ]);
}

// 安装两个 launchd agent：CDP env 注入 + guardian watcher。幂等（先 bootout 再 bootstrap）。
export async function installAutostart({
  remoteDebuggingPort,
  themeArguments = [],
  nodeExecutablePath = process.execPath,
  cliPath = fileURLToPath(new URL("./cli.mjs", import.meta.url)),
  homeDirectory = os.homedir(),
  userId = typeof process.getuid === "function" ? process.getuid() : null,
  platform = process.platform,
  executeFileImplementation = executeFile,
} = {}) {
  assertMacOs(platform);
  if (userId === null) {
    throw new Error("autostart requires a numeric user id");
  }

  const stateRoot = autostartStateRoot();
  await mkdir(stateRoot, { mode: 0o700, recursive: true });
  await mkdir(launchAgentsDirectory(), { recursive: true });

  const scriptPath = guardianScriptPath();
  const configurationPath = autostartConfigurationPath();
  const configuration = validateAutostartConfiguration({
    schemaVersion: AUTOSTART_CONFIGURATION_SCHEMA_VERSION,
    cliPath,
    nodeExecutablePath,
    remoteDebuggingPort,
    themeArguments,
  });
  await writeFile(configurationPath, `${JSON.stringify(configuration, null, 2)}\n`, { mode: 0o600 });
  await chmod(configurationPath, 0o600);
  await writeFile(
    scriptPath,
    buildGuardianScript({ cliPath, remoteDebuggingPort, themeArguments }),
    { mode: 0o700 },
  );
  await chmod(scriptPath, 0o700);

  const cdpEnvPlist = cdpEnvPlistPath();
  const guardianPlist = guardianPlistPath();
  await writeFile(cdpEnvPlist, buildCdpEnvPlist({ remoteDebuggingPort }), { mode: 0o644 });
  await writeFile(
    guardianPlist,
    buildGuardianPlist({
      nodeExecutablePath,
      scriptPath,
      logPath: guardianLogPath(),
      homeDirectory,
    }),
    { mode: 0o644 },
  );

  const options = { userId, executeFileImplementation };
  for (const [label, plistPath] of [
    [CDP_ENV_LABEL, cdpEnvPlist],
    [GUARDIAN_LABEL, guardianPlist],
  ]) {
    await bootoutLabel(label, options);
    await bootstrapPlist(plistPath, options);
  }
  // 让 CDP env 立即注入当前 launchd 域（否则要等下次登录才生效）。
  await executeFileImplementation("/bin/launchctl", [
    "kickstart",
    "-k",
    `gui/${userId}/${CDP_ENV_LABEL}`,
  ]).catch(() => {});

  return {
    installed: true,
    cdpEnvPlist,
    guardianPlist,
    guardianScript: scriptPath,
    configurationPath,
  };
}

// 卸载：bootout 两个 agent 并删除生成的文件。幂等。
export async function uninstallAutostart({
  userId = typeof process.getuid === "function" ? process.getuid() : null,
  platform = process.platform,
  executeFileImplementation = executeFile,
} = {}) {
  assertMacOs(platform);
  if (userId === null) {
    throw new Error("autostart requires a numeric user id");
  }
  const options = { userId, executeFileImplementation };

  for (const label of [CDP_ENV_LABEL, GUARDIAN_LABEL]) {
    await bootoutLabel(label, options);
  }
  await executeFileImplementation("/bin/launchctl", ["unsetenv", "PASEO_ELECTRON_FLAGS"]).catch(() => {});

  const removed = [];
  for (const filePath of [
    cdpEnvPlistPath(),
    guardianPlistPath(),
    guardianScriptPath(),
    autostartConfigurationPath(),
  ]) {
    await rm(filePath, { force: true });
    removed.push(filePath);
  }
  return { uninstalled: true, removed };
}

async function isLabelLoaded(label, { userId, executeFileImplementation }) {
  try {
    await executeFileImplementation("/bin/launchctl", ["print", `gui/${userId}/${label}`]);
    return true;
  } catch {
    return false;
  }
}

// 报告两个 agent 是否已加载（供 status/JSON 用）。
export async function collectAutostartStatus({
  userId = typeof process.getuid === "function" ? process.getuid() : null,
  platform = process.platform,
  executeFileImplementation = executeFile,
} = {}) {
  const supported = platform === "darwin" && userId !== null;
  if (!supported) {
    return {
      supported: false,
      cdpEnvLoaded: false,
      guardianLoaded: false,
      cdpEnvLabel: CDP_ENV_LABEL,
      guardianLabel: GUARDIAN_LABEL,
    };
  }
  const options = { userId, executeFileImplementation };
  const [cdpEnvLoaded, guardianLoaded] = await Promise.all([
    isLabelLoaded(CDP_ENV_LABEL, options),
    isLabelLoaded(GUARDIAN_LABEL, options),
  ]);
  return {
    supported: true,
    cdpEnvLoaded,
    guardianLoaded,
    cdpEnvLabel: CDP_ENV_LABEL,
    guardianLabel: GUARDIAN_LABEL,
  };
}
