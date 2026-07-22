#!/usr/bin/env node

import { access } from "node:fs/promises";
import path from "node:path";

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
import { DEFAULT_THEME_MANIFEST_URL, loadTheme } from "./theme-loader.mjs";

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

Commands:
  start    Launch Paseo with loopback-only CDP when needed, then watch all renderer windows
  inject   Attach the watcher to an already CDP-enabled Paseo instance
  pause    Remove the live skin after the watcher has stopped; alias of reset
  reset    Restore native renderer styles without modifying or restarting Paseo
  status   Report Paseo, CDP, target, and skin state
  doctor   Validate runtime, app path, theme assets, and the optional live connection
  verify   Assert renderer safety and skin state; optionally save a screenshot

Options:
  --port <number>        CDP port (default: 9224)
  --app <path>           Paseo executable path
  --theme <manifest>     Theme manifest path
  --theme-url <url>      HTTPS theme manifest URL
  --screenshot <path>    PNG output path for verify
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
    includeDevelopmentTargets: false,
    json: false,
    paseoExecutable: DEFAULT_PASEO_EXECUTABLE,
    remoteDebuggingPort: DEFAULT_REMOTE_DEBUGGING_PORT,
    screenshotPath: null,
    themeManifest: DEFAULT_THEME_MANIFEST_URL,
    themeUrl: null,
  };

  for (let argumentIndex = 1; argumentIndex < argumentsList.length; argumentIndex += 1) {
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
  const abortController = new AbortController();
  const stop = () => abortController.abort();
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
    version: "0.4.0",
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

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`[paseo-skin] ${error.message}`);
    process.exitCode = 1;
  });
}
