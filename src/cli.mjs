#!/usr/bin/env node

import { access } from "node:fs/promises";
import { realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  capturePaseoScreenshot,
  evaluatePaseoTargets,
  getCdpVersion,
  isCdpAvailable,
  isPaseoApplicationTarget,
  listCdpTargets,
  PaseoSkinWatcher,
  waitForCdp,
} from "./cdp-client.mjs";
import { loadThemeCatalog, PUBLIC_THEME_CATALOG_URL } from "./catalog-client.mjs";
import {
  DEFAULT_PASEO_EXECUTABLE,
  isPaseoApplicationRunning,
  launchPaseoWithCdp,
} from "./electron-launcher.mjs";
import {
  buildStageBlackGoldInjectionSource,
  buildStageBlackGoldResetSource,
  buildStageBlackGoldVerificationSource,
} from "./stage-black-gold-skin.mjs";
import { loadRemoteTheme } from "./remote-theme.mjs";
import { createThemeFromImage } from "./theme-creator.mjs";
import { DEFAULT_THEME_MANIFEST_URL, loadTheme } from "./theme-loader.mjs";
import { PACKAGE_VERSION } from "./version.mjs";
import { acquireWatcherLock, readWatcherLock } from "./watcher-lock.mjs";
import {
  buildThemeArguments,
  collectAutostartStatus,
  installAutostart,
  uninstallAutostart,
} from "./autostart.mjs";

const DEFAULT_REMOTE_DEBUGGING_PORT = 9224;

function printUsage() {
  console.log(`Paseo Skin Loader

Usage:
  paseo-skin start [options]
  paseo-skin inject [options]
  paseo-skin pause [options]
  paseo-skin reset [options]
  paseo-skin status [options]
  paseo-skin doctor [options]
  paseo-skin verify [options]
  paseo-skin list [options]
  paseo-skin inspect [options]
  paseo-skin create [options]
  paseo-skin autostart <install|uninstall|status> [options]

Commands:
  start    Launch Paseo with loopback-only CDP when needed, then watch all renderer windows
  inject   Attach the watcher to an already CDP-enabled Paseo instance
  pause    Remove the live skin after the watcher has stopped; alias of reset
  reset    Restore native renderer styles without modifying or restarting Paseo
  status   Report Paseo, CDP, target, and skin state
  doctor   Validate runtime, app path, theme assets, and the optional live connection
  verify   Assert renderer safety and skin state; optionally save a screenshot
  list     List themes from the public catalog without changing Paseo
  inspect  Validate and describe a local or remote theme without requiring Paseo
  create   Turn a local PNG, JPEG, or WebP image into an integrity-verified theme
  autostart Install or remove a macOS login agent that restores the skin after every Paseo restart

Options:
  --port <number>        CDP port (default: 9224)
  --app <path>           Paseo executable path
  --theme <manifest>     Theme manifest path
  --theme-url <url>      HTTPS theme manifest URL
  --screenshot <path>    PNG output path for verify
  --catalog-url <url>    Catalog URL for list
  --image <path>         Source image for create
  --name <text>          Theme name for create
  --id <slug>            Lowercase theme id for create
  --description <text>   Theme description for create
  --output <directory>   Output directory for create
  --focus-x <0..1>       Horizontal artwork focus for create (default: 0.7)
  --focus-y <0..1>       Vertical artwork focus for create (default: 0.5)
  --force                Replace the generated theme files if they already exist
  --json                 Print machine-readable JSON where supported
  --include-development-targets
                         Include Paseo localhost development renderers
`);
}

export function parseArguments(argumentsList) {
  const requestedCommand = argumentsList[0] ?? "start";
  const command = requestedCommand === "--help" || requestedCommand === "-h"
    ? "help"
    : requestedCommand;
  const options = {
    command,
    autostartAction: null,
    catalogUrl: PUBLIC_THEME_CATALOG_URL,
    description: null,
    focusX: 0.7,
    focusY: 0.5,
    force: false,
    includeDevelopmentTargets: false,
    imagePath: null,
    json: false,
    outputDirectory: null,
    paseoExecutable: DEFAULT_PASEO_EXECUTABLE,
    remoteDebuggingPort: DEFAULT_REMOTE_DEBUGGING_PORT,
    screenshotPath: null,
    themeManifest: DEFAULT_THEME_MANIFEST_URL,
    themeId: null,
    themeName: null,
    themeUrl: null,
  };

  // autostart 的子动作（install/uninstall/status）位于命令之后、选项之前。
  let firstOptionIndex = 1;
  if (command === "autostart") {
    const action = argumentsList[1];
    if (!["install", "uninstall", "status"].includes(action)) {
      throw new Error("autostart requires one of: install, uninstall, status");
    }
    options.autostartAction = action;
    firstOptionIndex = 2;
  }

  for (let argumentIndex = firstOptionIndex; argumentIndex < argumentsList.length; argumentIndex += 1) {
    const argument = argumentsList[argumentIndex];
    if (argument === "--port") {
      options.remoteDebuggingPort = Number(argumentsList[++argumentIndex]);
    } else if (argument === "--app") {
      options.paseoExecutable = argumentsList[++argumentIndex];
    } else if (argument === "--theme") {
      options.themeManifest = path.resolve(argumentsList[++argumentIndex]);
    } else if (argument === "--theme-url") {
      options.themeUrl = argumentsList[++argumentIndex];
    } else if (argument === "--screenshot") {
      options.screenshotPath = path.resolve(argumentsList[++argumentIndex]);
    } else if (argument === "--catalog-url") {
      options.catalogUrl = argumentsList[++argumentIndex];
    } else if (argument === "--image") {
      options.imagePath = path.resolve(argumentsList[++argumentIndex]);
    } else if (argument === "--name") {
      options.themeName = argumentsList[++argumentIndex];
    } else if (argument === "--id") {
      options.themeId = argumentsList[++argumentIndex];
    } else if (argument === "--description") {
      options.description = argumentsList[++argumentIndex];
    } else if (argument === "--output") {
      options.outputDirectory = path.resolve(argumentsList[++argumentIndex]);
    } else if (argument === "--focus-x") {
      options.focusX = Number(argumentsList[++argumentIndex]);
    } else if (argument === "--focus-y") {
      options.focusY = Number(argumentsList[++argumentIndex]);
    } else if (argument === "--force") {
      options.force = true;
    } else if (argument === "--json") {
      options.json = true;
    } else if (argument === "--include-development-targets") {
      options.includeDevelopmentTargets = true;
    } else if (argument === "--help" || argument === "-h") {
      options.command = "help";
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (
    !Number.isInteger(options.remoteDebuggingPort) ||
    options.remoteDebuggingPort < 1_024 ||
    options.remoteDebuggingPort > 65_535
  ) {
    throw new Error(`Invalid CDP port: ${options.remoteDebuggingPort}`);
  }
  if (typeof options.paseoExecutable !== "string" || options.paseoExecutable.length === 0) {
    throw new Error("Paseo executable path is required");
  }
  if (options.command === "create") {
    if (!options.imagePath || !options.themeName || !options.outputDirectory) {
      throw new Error("create requires --image, --name, and --output");
    }
    if (!Number.isFinite(options.focusX) || options.focusX < 0 || options.focusX > 1) {
      throw new Error("focus-x must be between 0 and 1");
    }
    if (!Number.isFinite(options.focusY) || options.focusY < 0 || options.focusY > 1) {
      throw new Error("focus-y must be between 0 and 1");
    }
  }
  return options;
}

async function resolveTheme(options) {
  return options.themeUrl ? loadRemoteTheme(options.themeUrl) : loadTheme(options.themeManifest);
}

async function getPaseoTargets(options) {
  if (!(await isCdpAvailable(options.remoteDebuggingPort))) {
    return [];
  }
  return (await listCdpTargets(options.remoteDebuggingPort)).filter((target) =>
    isPaseoApplicationTarget(target, {
      includeDevelopmentTargets: options.includeDevelopmentTargets,
    }),
  );
}

async function runWatcher(options) {
  const loadedTheme = await resolveTheme(options);
  const watcherLock = await acquireWatcherLock({
    remoteDebuggingPort: options.remoteDebuggingPort,
    themeId: loadedTheme.theme.id,
  });
  const abortController = new AbortController();
  const stop = () => abortController.abort();
  try {
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    const watcher = new PaseoSkinWatcher({
      includeDevelopmentTargets: options.includeDevelopmentTargets,
      injectionSource: buildStageBlackGoldInjectionSource({
        heroImageDataUrl: loadedTheme.image.dataUrl,
        theme: loadedTheme.theme,
      }),
      onStatus: (message) => console.log(`[paseo-skin] ${message}`),
      remoteDebuggingPort: options.remoteDebuggingPort,
      skinName: loadedTheme.theme.name,
    });

    console.log(
      `[paseo-skin] ${loadedTheme.theme.name} watcher active on 127.0.0.1:${options.remoteDebuggingPort}`,
    );
    console.log("[paseo-skin] Ctrl+C stops watching and unregisters reload hooks; use reset to remove the current skin.");
    await watcher.run(abortController.signal);
  } finally {
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
    await watcherLock.release();
  }
}

async function start(options) {
  if (!(await isCdpAvailable(options.remoteDebuggingPort))) {
    if (await isPaseoApplicationRunning({ paseoExecutable: options.paseoExecutable })) {
      throw new Error(
        "Paseo is already running without the skin CDP endpoint. Finish or hand off active agents, quit Paseo normally, then run this command again.",
      );
    }

    const processIdentifier = await launchPaseoWithCdp({
      paseoExecutable: options.paseoExecutable,
      remoteDebuggingPort: options.remoteDebuggingPort,
    });
    console.log(`[paseo-skin] Launched Paseo process ${processIdentifier}`);
    await waitForCdp(options.remoteDebuggingPort);
  }
  await runWatcher(options);
}

async function collectStatus(options) {
  const [applicationRunning, cdpAvailable] = await Promise.all([
    isPaseoApplicationRunning({ paseoExecutable: options.paseoExecutable }),
    isCdpAvailable(options.remoteDebuggingPort),
  ]);
  const [version, targets] = await Promise.all([
    cdpAvailable ? getCdpVersion(options.remoteDebuggingPort) : null,
    cdpAvailable ? getPaseoTargets(options) : [],
  ]);
  const watcher = await readWatcherLock(options.remoteDebuggingPort);
  let rendererStates = [];
  if (targets.length > 0) {
    rendererStates = await evaluatePaseoTargets(
      options.remoteDebuggingPort,
      `(() => ({
        skinInstalled: Boolean(window.__PASEO_STAGE_BLACK_GOLD_SKIN__),
        themeId: window.__PASEO_STAGE_BLACK_GOLD_SKIN__?.themeId ?? null,
        route: document.documentElement?.getAttribute("data-paseo-skin-route") ?? null,
        rootVisibility: document.getElementById("root")
          ? getComputedStyle(document.getElementById("root")).visibility
          : null,
      }))()`,
      { includeDevelopmentTargets: options.includeDevelopmentTargets },
    );
  }
  return {
    applicationRunning,
    cdp: {
      available: cdpAvailable,
      browser: version?.Browser ?? null,
      loopbackAddress: `127.0.0.1:${options.remoteDebuggingPort}`,
    },
    rendererCount: targets.length,
    renderers: rendererStates,
    watcher: {
      active: watcher.active,
      pid: watcher.record?.pid ?? null,
      themeId: watcher.record?.themeId ?? null,
      problem: watcher.error ?? null,
    },
  };
}

async function status(options) {
  const report = await collectStatus(options);
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  console.log(`Paseo running: ${report.applicationRunning ? "yes" : "no"}`);
  console.log(
    `CDP endpoint: ${report.cdp.available ? `ready at ${report.cdp.loopbackAddress}` : "not available"}`,
  );
  console.log(`Paseo renderer targets: ${report.rendererCount}`);
  console.log(
    `Watcher: ${report.watcher.active ? `active (pid ${report.watcher.pid}, ${report.watcher.themeId})` : "inactive"}`,
  );
  for (const renderer of report.renderers) {
    console.log(
      `Skin ${renderer.value.skinInstalled ? "active" : "inactive"} on ${renderer.targetUrl}` +
        (renderer.value.themeId ? ` (${renderer.value.themeId}, ${renderer.value.route})` : ""),
    );
  }
}

async function reset(options) {
  if (!(await isCdpAvailable(options.remoteDebuggingPort))) {
    throw new Error(`No CDP endpoint found on 127.0.0.1:${options.remoteDebuggingPort}`);
  }
  const evaluations = await evaluatePaseoTargets(
    options.remoteDebuggingPort,
    buildStageBlackGoldResetSource(),
    { includeDevelopmentTargets: options.includeDevelopmentTargets },
  );
  if (evaluations.length === 0) {
    throw new Error("No Paseo renderer targets were found");
  }
  for (const evaluation of evaluations) {
    console.log(`[paseo-skin] Reset ${evaluation.targetUrl}: ${JSON.stringify(evaluation.value)}`);
  }
}

async function doctor(options) {
  const problems = [];
  let executablePresent = true;
  try {
    await access(options.paseoExecutable);
  } catch {
    executablePresent = false;
    problems.push(`Paseo executable not found: ${options.paseoExecutable}`);
  }

  let loadedTheme = null;
  try {
    loadedTheme = await resolveTheme(options);
  } catch (error) {
    problems.push(error.message);
  }

  const runtimeMajorVersion = Number(process.versions.node.split(".")[0]);
  if (runtimeMajorVersion < 22) {
    problems.push(`Node.js 22 or newer is required; found ${process.version}`);
  }
  const liveStatus = await collectStatus(options);
  if (liveStatus.cdp.available && liveStatus.rendererCount === 0) {
    problems.push("The configured CDP port is active but exposes no Paseo renderer targets");
  }

  const report = {
    pass: problems.length === 0,
    product: "Paseo Skin Loader",
    version: PACKAGE_VERSION,
    platform: `${process.platform}-${process.arch}`,
    nodeVersion: process.version,
    modifiesPaseoApplication: false,
    loopbackOnly: true,
    paseoExecutable: {
      path: options.paseoExecutable,
      present: executablePresent,
    },
    live: liveStatus,
    theme: loadedTheme
      ? {
          id: loadedTheme.theme.id,
          version: loadedTheme.theme.version,
          name: loadedTheme.theme.name,
          manifestPath: loadedTheme.manifestPath,
          sourceUrl: loadedTheme.sourceUrl ?? null,
          image: {
            path: loadedTheme.image.path,
            bytes: loadedTheme.image.bytes,
            width: loadedTheme.image.width,
            height: loadedTheme.image.height,
            mediaType: loadedTheme.image.mediaType,
          },
        }
      : null,
    problems,
  };
  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) {
    process.exitCode = 1;
  }
}

async function listThemes(options) {
  const catalog = await loadThemeCatalog(options.catalogUrl);
  if (options.json) {
    console.log(JSON.stringify(catalog, null, 2));
    return;
  }
  console.log(`${catalog.name} (${catalog.themes.length} themes)`);
  for (const theme of catalog.themes) {
    console.log(`- ${theme.name} / ${theme.englishName} [${theme.id}]`);
    console.log(`  ${theme.description}`);
    console.log(`  ${theme.manifestUrl}`);
  }
}

async function inspectTheme(options) {
  const loadedTheme = await resolveTheme(options);
  console.log(JSON.stringify({
    pass: true,
    sourceUrl: loadedTheme.sourceUrl ?? null,
    manifestPath: loadedTheme.manifestPath,
    theme: loadedTheme.theme,
    image: {
      path: loadedTheme.image.path,
      bytes: loadedTheme.image.bytes,
      width: loadedTheme.image.width,
      height: loadedTheme.image.height,
      mediaType: loadedTheme.image.mediaType,
      integrityVerified: Boolean(loadedTheme.theme.integrity),
    },
  }, null, 2));
}

async function createTheme(options) {
  const created = await createThemeFromImage({
    description: options.description,
    focusX: options.focusX,
    focusY: options.focusY,
    identifier: options.themeId,
    imagePath: options.imagePath,
    name: options.themeName,
    outputDirectory: options.outputDirectory,
    overwrite: options.force,
  });
  await loadTheme(created.manifestOutputPath);
  console.log(JSON.stringify({
    pass: true,
    themeId: created.manifest.id,
    manifestPath: created.manifestOutputPath,
    imagePath: created.imageOutputPath,
    colors: created.colors,
  }, null, 2));
}

async function verify(options) {
  if (!(await isCdpAvailable(options.remoteDebuggingPort))) {
    throw new Error(`No CDP endpoint found on 127.0.0.1:${options.remoteDebuggingPort}`);
  }
  const loadedTheme = await resolveTheme(options);
  const evaluations = await evaluatePaseoTargets(
    options.remoteDebuggingPort,
    buildStageBlackGoldVerificationSource({ expectedThemeId: loadedTheme.theme.id }),
    { includeDevelopmentTargets: options.includeDevelopmentTargets },
  );
  if (evaluations.length === 0) {
    throw new Error("No Paseo renderer targets were found");
  }
  const report = {
    pass: evaluations.every((evaluation) => evaluation.value?.pass === true),
    themeId: loadedTheme.theme.id,
    renderers: evaluations,
    screenshot: null,
  };
  if (options.screenshotPath) {
    report.screenshot = await capturePaseoScreenshot(
      options.remoteDebuggingPort,
      options.screenshotPath,
      { includeDevelopmentTargets: options.includeDevelopmentTargets },
    );
  }
  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) {
    process.exitCode = 1;
  }
}

async function autostart(options) {
  // 只在用户显式指定主题时透传给 inject；否则让 inject 使用自己的默认加载逻辑
  // （与 `npm start` 一致）。默认的 themeManifest 是 URL 对象而非字符串，
  // 直接透传会被 inject 的 path.resolve 破坏成无效路径（/file:/... ENOENT）。
  const explicitThemeManifest =
    typeof options.themeManifest === "string" ? options.themeManifest : null;
  const themeArguments = buildThemeArguments({
    themeManifest: options.themeUrl ? null : explicitThemeManifest,
    themeUrl: options.themeUrl,
  });

  if (options.autostartAction === "install") {
    const result = await installAutostart({
      remoteDebuggingPort: options.remoteDebuggingPort,
      themeArguments,
    });
    if (options.json) {
      console.log(JSON.stringify({ pass: true, ...result }, null, 2));
      return;
    }
    console.log("[paseo-skin] Autostart installed. The skin now restores after every Paseo restart.");
    console.log(`[paseo-skin] CDP env agent:  ${result.cdpEnvPlist}`);
    console.log(`[paseo-skin] Guardian agent: ${result.guardianPlist}`);
    console.log("[paseo-skin] Quit and reopen Paseo once to confirm; new windows are themed automatically.");
    return;
  }

  if (options.autostartAction === "uninstall") {
    const result = await uninstallAutostart();
    if (options.json) {
      console.log(JSON.stringify({ pass: true, ...result }, null, 2));
      return;
    }
    console.log("[paseo-skin] Autostart removed. Existing Paseo windows keep their current skin until reset or restart.");
    return;
  }

  const report = await collectAutostartStatus();
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  console.log(`Autostart supported: ${report.supported ? "yes" : "no (macOS only)"}`);
  console.log(`CDP env agent (${report.cdpEnvLabel}): ${report.cdpEnvLoaded ? "loaded" : "not loaded"}`);
  console.log(`Guardian agent (${report.guardianLabel}): ${report.guardianLoaded ? "loaded" : "not loaded"}`);
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.command === "help") {
    printUsage();
  } else if (options.command === "status") {
    await status(options);
  } else if (options.command === "doctor") {
    await doctor(options);
  } else if (options.command === "verify") {
    await verify(options);
  } else if (options.command === "list") {
    await listThemes(options);
  } else if (options.command === "inspect") {
    await inspectTheme(options);
  } else if (options.command === "create") {
    await createTheme(options);
  } else if (options.command === "autostart") {
    await autostart(options);
  } else if (options.command === "inject") {
    if (!(await isCdpAvailable(options.remoteDebuggingPort))) {
      throw new Error(`No CDP endpoint found on 127.0.0.1:${options.remoteDebuggingPort}`);
    }
    await runWatcher(options);
  } else if (options.command === "pause" || options.command === "reset") {
    await reset(options);
  } else if (options.command === "start") {
    await start(options);
  } else {
    printUsage();
    throw new Error(`Unknown command: ${options.command}`);
  }
}

function isDirectExecution() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (isDirectExecution()) {
  main().catch((error) => {
    console.error(`[paseo-skin] ${error.message}`);
    process.exitCode = 1;
  });
}
