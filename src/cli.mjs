#!/usr/bin/env node

import { access } from "node:fs/promises";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

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
import { loadThemeCatalog } from "./catalog-client.mjs";
import {
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
import { loadTheme } from "./theme-loader.mjs";
import { PACKAGE_VERSION } from "./version.mjs";
import { buildCliHelp } from "./cli-help.mjs";
import { parseArguments } from "./cli-options.mjs";
import { acquireWatcherLock, readWatcherLock } from "./watcher-lock.mjs";
import {
  buildThemeArguments,
  collectAutostartStatus,
  installAutostart,
  readAutostartConfiguration,
  uninstallAutostart,
} from "./autostart.mjs";

export { parseArguments };

async function resolveTheme(options) {
  if (options.command === "apply") {
    const catalog = await loadThemeCatalog(options.catalogUrl);
    const catalogTheme = catalog.themes.find((theme) => theme.id === options.publicThemeId);
    if (!catalogTheme) {
      throw new Error(`Unknown public theme: ${options.publicThemeId}. Run 'paseo-skin list' to see available themes.`);
    }
    return loadRemoteTheme(catalogTheme.manifestUrl);
  }
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

async function runWatcher(options, preloadedTheme = null) {
  const loadedTheme = preloadedTheme ?? await resolveTheme(options);
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

async function start(options, preloadedTheme = null) {
  // 在连接或启动 Paseo 前先完成主题解析与完整性校验，避免无效主题触发应用状态变化。
  const loadedTheme = preloadedTheme ?? await resolveTheme(options);
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
  await runWatcher(options, loadedTheme);
}

export function selectApplyMode({ guardianLoaded, requestedThemeId, watcher }) {
  if (watcher.active && watcher.record?.themeId === requestedThemeId) return "already-active";
  if (guardianLoaded) return "reconfigure-autostart";
  if (!watcher.active) return "start-watcher";
  return "manual-watcher-conflict";
}

async function waitForAppliedTheme(options, expectedThemeId, timeoutMilliseconds = 30_000) {
  const deadline = Date.now() + timeoutMilliseconds;
  while (Date.now() < deadline) {
    const watcher = await readWatcherLock(options.remoteDebuggingPort);
    let renderers = [];
    try {
      renderers = await evaluatePaseoTargets(
        options.remoteDebuggingPort,
        `window.__PASEO_STAGE_BLACK_GOLD_SKIN__?.themeId ?? null`,
        { includeDevelopmentTargets: options.includeDevelopmentTargets },
      );
    } catch {
      // Guardian 重启期间 CDP 或 renderer 可能短暂不可用，继续等待同一截止时间。
    }
    if (
      watcher.active &&
      watcher.record?.themeId === expectedThemeId &&
      renderers.length > 0 &&
      renderers.every((renderer) => renderer.value === expectedThemeId)
    ) {
      return { renderers, watcher };
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for theme ${expectedThemeId} to become active`);
}

async function apply(options) {
  const loadedTheme = await resolveTheme(options);
  const [watcher, autostartStatus] = await Promise.all([
    readWatcherLock(options.remoteDebuggingPort),
    collectAutostartStatus(),
  ]);
  const mode = selectApplyMode({
    guardianLoaded: autostartStatus.guardianLoaded,
    requestedThemeId: loadedTheme.theme.id,
    watcher,
  });

  if (mode === "start-watcher") {
    await start(options, loadedTheme);
    return;
  }
  if (mode === "manual-watcher-conflict") {
    throw new Error(
      `A manual Paseo skin watcher is active with theme ${watcher.record?.themeId ?? "unknown"}. ` +
      "Stop that watcher with Ctrl+C, then run apply again.",
    );
  }
  if (mode === "already-active") {
    const activation = await waitForAppliedTheme(options, loadedTheme.theme.id, 5_000);
    const result = {
      pass: true,
      action: "already-active",
      themeId: loadedTheme.theme.id,
      watcherPid: activation.watcher.record.pid,
      renderers: activation.renderers.length,
    };
    console.log(options.json ? JSON.stringify(result, null, 2) :
      `[paseo-skin] ${loadedTheme.theme.name} is already active on ${result.renderers} renderer(s).`);
    return;
  }

  const configuration = await readAutostartConfiguration();
  await Promise.all([
    access(configuration.cliPath),
    access(configuration.nodeExecutablePath),
  ]).catch(() => {
    throw new Error("The existing autostart runtime is unavailable; reinstall autostart before switching themes");
  });
  if (!loadedTheme.sourceUrl) {
    throw new Error("Public apply requires a verified remote theme URL");
  }
  await installAutostart({
    cliPath: configuration.cliPath,
    nodeExecutablePath: configuration.nodeExecutablePath,
    remoteDebuggingPort: options.remoteDebuggingPort,
    themeArguments: buildThemeArguments({ themeUrl: loadedTheme.sourceUrl }),
  });
  const activation = await waitForAppliedTheme(options, loadedTheme.theme.id);
  const result = {
    pass: true,
    action: "switched-autostart",
    themeId: loadedTheme.theme.id,
    watcherPid: activation.watcher.record.pid,
    renderers: activation.renderers.length,
  };
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(
      `[paseo-skin] Applied ${loadedTheme.theme.name} to ${result.renderers} renderer(s); ` +
      "the existing autostart guardian now owns this theme.",
    );
  }
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
  const loadedTheme = options.themeWasExplicit ? await resolveTheme(options) : null;
  const expectedThemeId = loadedTheme?.theme.id ?? null;
  const evaluations = await evaluatePaseoTargets(
    options.remoteDebuggingPort,
    buildStageBlackGoldVerificationSource({ expectedThemeId }),
    { includeDevelopmentTargets: options.includeDevelopmentTargets },
  );
  if (evaluations.length === 0) {
    throw new Error("No Paseo renderer targets were found");
  }
  const activeThemeIds = [...new Set(
    evaluations.map((evaluation) => evaluation.value?.themeId).filter(Boolean),
  )];
  const report = {
    pass: evaluations.every((evaluation) => evaluation.value?.pass === true),
    expectedThemeId,
    themeId: expectedThemeId ?? (activeThemeIds.length === 1 ? activeThemeIds[0] : null),
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
    console.log(buildCliHelp(options.helpCommand));
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
  } else if (options.command === "apply") {
    await apply(options);
  } else {
    console.log(buildCliHelp());
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
