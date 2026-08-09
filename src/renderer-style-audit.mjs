import { setTimeout as delay } from "node:timers/promises";

import { openPaseoRendererSession } from "./cdp-client.mjs";

const APPLICATION_SECTION_DEFINITIONS = [
  ["settings:通用", "通用", "/settings/general"],
  ["settings:外观", "外观", "/settings/appearance"],
  ["settings:编辑器", "编辑器", "/settings/editor"],
  ["settings:快捷键", "快捷键", "/settings/shortcuts"],
  ["settings:集成", "集成", "/settings/integrations"],
  ["settings:通知", "通知", "/settings/notifications"],
  ["settings:权限", "权限", "/settings/permissions"],
  ["settings:诊断", "诊断", "/settings/diagnostics"],
  ["settings:关于", "关于", "/settings/about"],
];

const HOST_SECTION_DEFINITIONS = [
  ["host:概览", "settings-host-section-host", "host"],
  ["host:项目", "settings-host-section-projects", "projects"],
  ["host:连接", "settings-host-section-connections", "connections"],
  ["host:配对设备", "settings-host-section-pair-device", "pair-device"],
  ["host:Agents", "settings-host-section-agents", "agents"],
  ["host:Workspaces", "settings-host-section-workspaces", "workspaces"],
  ["host:Providers", "settings-host-section-providers", "providers"],
  ["host:使用情况", "settings-host-section-usage", "usage"],
  ["host:Terminals", "settings-host-section-terminals", "terminals"],
];

export const RENDERER_STYLE_AUDIT_PAGE_PLAN = Object.freeze([
  ...APPLICATION_SECTION_DEFINITIONS.map(([label, text, path]) =>
    Object.freeze({ kind: "application-setting", label, path, text }),
  ),
  ...HOST_SECTION_DEFINITIONS.map(([label, testIdentifier, pathSuffix]) =>
    Object.freeze({ kind: "host-setting", label, pathSuffix, testIdentifier }),
  ),
  Object.freeze({ kind: "workspace", label: "workspace" }),
  Object.freeze({ kind: "utility", label: "history", testIdentifier: "sidebar-sessions" }),
  Object.freeze({ kind: "utility", label: "schedules", testIdentifier: "sidebar-schedules" }),
]);

export const RENDERER_STYLE_AUDIT_HOVER_PLAN = Object.freeze([
  Object.freeze({
    label: "sidebar:new-workspace",
    selectorExpression: `document.querySelector('[data-testid="sidebar-global-new-workspace"]')`,
  }),
  Object.freeze({
    label: "sidebar:history",
    selectorExpression: `document.querySelector('[data-testid="sidebar-sessions"]')`,
  }),
  Object.freeze({
    label: "sidebar:schedules",
    selectorExpression: `document.querySelector('[data-testid="sidebar-schedules"]')`,
  }),
  Object.freeze({
    label: "sidebar:workspace-row",
    selectorExpression: `[...document.querySelectorAll('[data-testid^="sidebar-workspace-row-"]')].find((element) => {
      const rectangle = element.getBoundingClientRect();
      return element.getAttribute('aria-selected') !== 'true' &&
        rectangle.width > 0 && rectangle.height > 0 &&
        rectangle.top >= 0 && rectangle.bottom <= innerHeight;
    })`,
  }),
  Object.freeze({
    label: "settings:navigation",
    selectorExpression: `[...document.querySelectorAll('[data-testid="settings-sidebar"] button')].find((element) => element.textContent?.trim() === '外观')`,
  }),
]);

const SETTINGS_HOVER_LABEL = "settings:navigation";
const AUDIT_STABILIZER_IDENTIFIER = "paseo-renderer-style-audit-stabilizer";
const INTERACTION_DELAY_MILLISECONDS = 180;
const HOVER_MAX_ATTEMPTS = 4;
const NAVIGATION_POLL_MILLISECONDS = 50;
const NAVIGATION_TIMEOUT_MILLISECONDS = 2_500;

function buildClickExpression(elementExpression) {
  return `(() => {
    const element = ${elementExpression};
    if (!element) return false;
    element.click();
    return true;
  })()`;
}

function buildCurrentPathExpression() {
  return "window.location.pathname";
}

function buildCaptureStateExpression() {
  return `(() => ({
    path: window.location.pathname,
    sidebarScrollTop: document.querySelector('[data-testid="sidebar-project-workspace-list-scroll"]')?.scrollTop ?? null,
  }))()`;
}

function buildRestoreScrollExpression(scrollTop) {
  return `(() => {
    const element = document.querySelector('[data-testid="sidebar-project-workspace-list-scroll"]');
    if (!element || ${JSON.stringify(scrollTop)} === null) return false;
    element.scrollTop = ${JSON.stringify(scrollTop)};
    return true;
  })()`;
}

function buildInstallAuditStabilizerExpression() {
  return `(() => {
    document.getElementById(${JSON.stringify(AUDIT_STABILIZER_IDENTIFIER)})?.remove();
    const style = document.createElement('style');
    style.id = ${JSON.stringify(AUDIT_STABILIZER_IDENTIFIER)};
    style.textContent = [
      '#root [data-testid^="sidebar-workspace-row-"]',
      '#root [data-testid^="sidebar-project-row-"]',
      '#root [data-testid^="sidebar-project-new-workspace-row-"]',
      '#root [data-testid="sidebar-global-new-workspace"]',
      '#root [data-testid="sidebar-sessions"]',
      '#root [data-testid="sidebar-schedules"]',
      '#root [data-testid="settings-sidebar"] button',
    ].join(', ') + ' { animation: none !important; transition: none !important; }';
    document.head.append(style);
    return true;
  })()`;
}

function buildRemoveAuditStabilizerExpression() {
  return `document.getElementById(${JSON.stringify(AUDIT_STABILIZER_IDENTIFIER)})?.remove() ?? false`;
}

export function buildRendererStylePageSnapshotExpression(label) {
  return String.raw`(() => {
    const label = ${JSON.stringify(label)};
    const parseColor = (value) => {
      const rgb = String(value).match(/^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:[ /,]+([\d.]+))?\s*\)$/);
      if (rgb) {
        return {
          alpha: rgb[4] === undefined ? 1 : Number(rgb[4]),
          blue: Number(rgb[3]),
          green: Number(rgb[2]),
          red: Number(rgb[1]),
        };
      }
      const srgb = String(value).match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/);
      if (!srgb) return null;
      return {
        alpha: srgb[4] === undefined ? 1 : Number(srgb[4]),
        blue: Number(srgb[3]) * 255,
        green: Number(srgb[2]) * 255,
        red: Number(srgb[1]) * 255,
      };
    };
    const composite = (foreground, background) => ({
      alpha: 1,
      blue: foreground.blue * foreground.alpha + background.blue * (1 - foreground.alpha),
      green: foreground.green * foreground.alpha + background.green * (1 - foreground.alpha),
      red: foreground.red * foreground.alpha + background.red * (1 - foreground.alpha),
    });
    const linear = (channel) => {
      const normalized = channel / 255;
      return normalized <= 0.04045
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
    };
    const luminance = (color) =>
      0.2126 * linear(color.red) + 0.7152 * linear(color.green) + 0.0722 * linear(color.blue);
    const contrast = (left, right) => {
      const leftLuminance = luminance(left);
      const rightLuminance = luminance(right);
      return (Math.max(leftLuminance, rightLuminance) + 0.05) /
        (Math.min(leftLuminance, rightLuminance) + 0.05);
    };
    const isVisible = (element) => {
      const rectangle = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rectangle.width > 0 && rectangle.height > 0 &&
        rectangle.bottom > 0 && rectangle.top < innerHeight &&
        rectangle.right > 0 && rectangle.left < innerWidth &&
        style.display !== 'none' && style.visibility !== 'hidden';
    };
    const interactiveSelector =
      'button, a[href], [role="button"], [role="menuitem"], [role="option"], [role="tab"], [role="treeitem"], [aria-selected]';
    const controls = [...document.querySelectorAll(interactiveSelector)].filter(isVisible);
    const normalizedControls = controls.map((element) => {
      const style = getComputedStyle(element);
      const labelElement = [element, ...element.querySelectorAll('*')].find((candidate) =>
        [...candidate.childNodes].some((node) =>
          node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
        ),
      ) ?? element;
      const text = (labelElement.textContent || element.getAttribute('aria-label') || '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 120);
      const background = parseColor(style.backgroundColor);
      const foreground = parseColor(getComputedStyle(labelElement).color);
      const compositedForeground = background && foreground
        ? composite(foreground, background)
        : null;
      const ratio = background?.alpha >= 0.7 && compositedForeground
        ? contrast(background, compositedForeground)
        : null;
      const maximum = background
        ? Math.max(background.red, background.green, background.blue)
        : 0;
      const minimum = background
        ? Math.min(background.red, background.green, background.blue)
        : 0;
      const saturation = maximum === 0 ? 0 : (maximum - minimum) / maximum;
      return {
        ariaLabel: element.getAttribute('aria-label'),
        background: style.backgroundColor,
        color: getComputedStyle(labelElement).color,
        contrast: ratio === null ? null : Number(ratio.toFixed(2)),
        dataTestId: element.getAttribute('data-testid'),
        hasPersistentInlineBackground:
          element.style.getPropertyPriority('background-color') === 'important' &&
          background?.alpha > 0.03 && saturation < 0.22,
        text,
      };
    });
    const lowContrastControls = normalizedControls.filter((control) =>
      control.text && control.contrast !== null && control.contrast < 4.5,
    );
    const persistentInlineBackgrounds = normalizedControls.filter((control) =>
      control.hasPersistentInlineBackground,
    );
    const auxiliaryLayerIssues = [];
    for (const stop of document.querySelectorAll('[id^="sidebar-scrim-"] stop')) {
      const stopColor = getComputedStyle(stop).stopColor;
      const parsed = parseColor(stopColor);
      if (!parsed || parsed.alpha > 0.03) {
        auxiliaryLayerIssues.push({ kind: 'workspace-scrim', value: stopColor });
      }
    }
    for (const kebab of document.querySelectorAll('[data-testid^="sidebar-workspace-kebab-"]')) {
      const backgroundColor = getComputedStyle(kebab).backgroundColor;
      const parsed = parseColor(backgroundColor);
      if (!parsed || parsed.alpha > 0.03) {
        auxiliaryLayerIssues.push({ kind: 'workspace-kebab', value: backgroundColor });
      }
    }
    return {
      auxiliaryLayerIssues,
      label,
      lowContrastControls,
      path: window.location.pathname,
      persistentInlineBackgrounds,
      skinVersion: window.__PASEO_STAGE_BLACK_GOLD_SKIN__?.version ?? null,
    };
  })()`;
}

function buildHoverLocateExpression(selectorExpression) {
  return `(() => {
    const element = ${selectorExpression};
    if (!element) return null;
    const rectangle = element.getBoundingClientRect();
    return {
      background: getComputedStyle(element).backgroundColor,
      rectangle: rectangle.toJSON(),
    };
  })()`;
}

function buildHoverStateExpression(selectorExpression) {
  return `(() => {
    const element = ${selectorExpression};
    if (!element) return null;
    const row = element.matches('[data-testid^="sidebar-workspace-row-"]')
      ? element
      : element.closest('[data-testid^="sidebar-workspace-row-"]');
    const auxiliaryLayerIssues = [];
    if (row) {
      for (const stop of row.querySelectorAll('[id^="sidebar-scrim-"] stop')) {
        const value = getComputedStyle(stop).stopColor;
        if (value !== 'rgba(0, 0, 0, 0)' && value !== 'transparent') {
          auxiliaryLayerIssues.push({ kind: 'workspace-scrim', value });
        }
      }
      for (const kebab of row.querySelectorAll('[data-testid^="sidebar-workspace-kebab-"]')) {
        const value = getComputedStyle(kebab).backgroundColor;
        if (value !== 'rgba(0, 0, 0, 0)' && value !== 'transparent') {
          auxiliaryLayerIssues.push({ kind: 'workspace-kebab', value });
        }
      }
    }
    return {
      auxiliaryLayerIssues,
      background: getComputedStyle(element).backgroundColor,
      hover: element.matches(':hover'),
      inlineBackgroundPriority: element.style.getPropertyPriority('background-color'),
      inlineBackgroundValue: element.style.getPropertyValue('background-color'),
    };
  })()`;
}

function normalizeCssColor(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function resolveCssAlpha(value) {
  const color = normalizeCssColor(value).toLowerCase();
  if (color === "transparent") return 0;

  const functionalColor = color.match(/^([a-z]+)\((.*)\)$/);
  if (!functionalColor) return null;
  const [, functionName, components] = functionalColor;
  const slashAlpha = components.match(/\/\s*([+-]?(?:\d*\.)?\d+%?)\s*$/)?.[1];
  const commaAlpha =
    functionName === "rgba" ? components.split(",").at(-1)?.trim() : null;
  const alpha = slashAlpha ?? commaAlpha;
  if (alpha === null || alpha === undefined) return 1;

  const numericAlpha = Number.parseFloat(alpha);
  if (!Number.isFinite(numericAlpha)) return null;
  return alpha.endsWith("%") ? numericAlpha / 100 : numericAlpha;
}

export function isVisibleThemedHover(before, after, entered) {
  if (!entered || normalizeCssColor(before) === normalizeCssColor(after)) return false;
  const alpha = resolveCssAlpha(after);
  return alpha !== null && alpha >= 0.1 && alpha <= 0.3;
}

async function waitForPath(session, predicate, wait) {
  const deadline = Date.now() + NAVIGATION_TIMEOUT_MILLISECONDS;
  let path = null;
  while (Date.now() < deadline) {
    path = await session.evaluate(buildCurrentPathExpression());
    if (predicate(path)) return path;
    await wait(NAVIGATION_POLL_MILLISECONDS);
  }
  path = await session.evaluate(buildCurrentPathExpression());
  if (predicate(path)) return path;
  throw new Error(`Renderer audit navigation timed out at ${path}`);
}

async function clickAndWait(session, elementExpression, pathPredicate, wait) {
  const clicked = await session.evaluate(buildClickExpression(elementExpression));
  if (!clicked) {
    throw new Error(`Renderer audit navigation target was not found: ${elementExpression}`);
  }
  return waitForPath(session, pathPredicate, wait);
}

async function ensureSettings(session, wait) {
  const path = await session.evaluate(buildCurrentPathExpression());
  if (path.startsWith("/settings/")) return path;
  return clickAndWait(
    session,
    `document.querySelector('[data-testid="sidebar-settings"]')`,
    (candidate) => candidate.startsWith("/settings/"),
    wait,
  );
}

async function navigateToApplicationSetting(session, page, wait) {
  await ensureSettings(session, wait);
  return clickAndWait(
    session,
    `[...document.querySelectorAll('button')].find((element) => element.getBoundingClientRect().left < 320 && element.textContent?.trim() === ${JSON.stringify(page.text)})`,
    (candidate) => candidate === page.path,
    wait,
  );
}

async function navigateToHostSetting(session, page, wait) {
  await ensureSettings(session, wait);
  return clickAndWait(
    session,
    `document.querySelector('[data-testid="${page.testIdentifier}"]')`,
    (candidate) => candidate.endsWith(`/${page.pathSuffix}`),
    wait,
  );
}

async function leaveSettings(session, wait) {
  const path = await session.evaluate(buildCurrentPathExpression());
  if (!path.startsWith("/settings/")) return path;
  return clickAndWait(
    session,
    `document.querySelector('[data-testid="settings-back-to-workspace"]')`,
    (candidate) => !candidate.startsWith("/settings/"),
    wait,
  );
}

async function performHoverCheck(session, hoverPlan, wait) {
  let location = await session.evaluate(buildHoverLocateExpression(hoverPlan.selectorExpression));
  if (!location) {
    return {
      after: null,
      auxiliaryLayerIssues: [],
      before: null,
      entered: false,
      exited: false,
      label: hoverPlan.label,
      persistentInlineBackground: false,
      visible: false,
    };
  }

  let enteredState = null;
  for (let attempt = 1; attempt <= HOVER_MAX_ATTEMPTS; attempt += 1) {
    await session.movePointer(900, 110);
    await wait(INTERACTION_DELAY_MILLISECONDS + NAVIGATION_POLL_MILLISECONDS * attempt);
    location = await session.evaluate(buildHoverLocateExpression(hoverPlan.selectorExpression));
    if (!location) break;
    await session.movePointer(
      location.rectangle.left + location.rectangle.width / 2,
      location.rectangle.top + location.rectangle.height / 2,
    );
    await wait(INTERACTION_DELAY_MILLISECONDS + NAVIGATION_POLL_MILLISECONDS * attempt);
    enteredState = await session.evaluate(
      buildHoverStateExpression(hoverPlan.selectorExpression),
    );
    if (isVisibleThemedHover(location.background, enteredState?.background, enteredState?.hover)) {
      break;
    }
  }
  await session.movePointer(900, 110);
  await wait(INTERACTION_DELAY_MILLISECONDS);
  const exitedState = await session.evaluate(
    buildHoverStateExpression(hoverPlan.selectorExpression),
  );

  const before = normalizeCssColor(location.background);
  const after = normalizeCssColor(enteredState?.background);
  return {
    after,
    auxiliaryLayerIssues: enteredState?.auxiliaryLayerIssues ?? [],
    before,
    entered: enteredState?.hover === true,
    exited: exitedState === null || exitedState.hover === false,
    label: hoverPlan.label,
    persistentInlineBackground:
      enteredState?.inlineBackgroundPriority === "important" ||
      exitedState?.inlineBackgroundPriority === "important",
    visible: isVisibleThemedHover(before, after, enteredState?.hover),
  };
}

async function restoreOriginalState(session, originalState, wait) {
  await leaveSettings(session, wait);
  const originalPath = originalState.path;
  if (originalPath.includes("/workspace/")) {
    const workspaceIdentifier = originalPath.match(/\/workspace\/([^/?#]+)/)?.[1];
    if (workspaceIdentifier) {
      await clickAndWait(
        session,
        `document.querySelector('[data-testid$=":${workspaceIdentifier}"]')`,
        (candidate) => candidate === originalPath,
        wait,
      );
    }
  } else if (originalPath === "/sessions") {
    await clickAndWait(
      session,
      `document.querySelector('[data-testid="sidebar-sessions"]')`,
      (candidate) => candidate === originalPath,
      wait,
    );
  } else if (originalPath === "/schedules") {
    await clickAndWait(
      session,
      `document.querySelector('[data-testid="sidebar-schedules"]')`,
      (candidate) => candidate === originalPath,
      wait,
    );
  } else if (originalPath === "/new" || originalPath === "/") {
    await clickAndWait(
      session,
      `document.querySelector('[data-testid="sidebar-global-new-workspace"]')`,
      (candidate) => candidate === originalPath || candidate === "/new",
      wait,
    );
  } else if (originalPath.startsWith("/settings/")) {
    await ensureSettings(session, wait);
    const applicationPage = RENDERER_STYLE_AUDIT_PAGE_PLAN.find(
      (page) => page.kind === "application-setting" && page.path === originalPath,
    );
    const hostPage = RENDERER_STYLE_AUDIT_PAGE_PLAN.find(
      (page) => page.kind === "host-setting" && originalPath.endsWith(`/${page.pathSuffix}`),
    );
    if (applicationPage) {
      await navigateToApplicationSetting(session, applicationPage, wait);
    } else if (hostPage) {
      await navigateToHostSetting(session, hostPage, wait);
    }
  }

  await session.evaluate(buildRestoreScrollExpression(originalState.sidebarScrollTop));
  return session.evaluate(buildCaptureStateExpression());
}

export function buildRendererStyleAuditReport({
  hoverChecks,
  originalPath,
  originalSidebarScrollTop = null,
  pages,
  restoredPath,
  restoredSidebarScrollTop = null,
  runtimeErrors = [],
}) {
  const failures = [];
  const expectedPageLabels = new Set(RENDERER_STYLE_AUDIT_PAGE_PLAN.map(({ label }) => label));
  const actualPageLabels = new Set(pages.map(({ label }) => label));
  if (
    pages.length !== expectedPageLabels.size ||
    actualPageLabels.size !== expectedPageLabels.size ||
    [...expectedPageLabels].some((label) => !actualPageLabels.has(label))
  ) {
    failures.push({ code: "incomplete-page-coverage", expected: expectedPageLabels.size, actual: pages.length });
  }

  const expectedHoverLabels = new Set(RENDERER_STYLE_AUDIT_HOVER_PLAN.map(({ label }) => label));
  const actualHoverLabels = new Set(hoverChecks.map(({ label }) => label));
  if (
    hoverChecks.length !== expectedHoverLabels.size ||
    [...expectedHoverLabels].some((label) => !actualHoverLabels.has(label))
  ) {
    failures.push({ code: "incomplete-hover-coverage", expected: expectedHoverLabels.size, actual: hoverChecks.length });
  }

  for (const page of pages) {
    for (const control of page.lowContrastControls ?? []) {
      failures.push({ code: "low-contrast", page: page.label, ...control });
    }
    for (const control of page.persistentInlineBackgrounds ?? []) {
      failures.push({ code: "persistent-hover-background", page: page.label, ...control });
    }
    for (const issue of page.auxiliaryLayerIssues ?? []) {
      failures.push({ code: "auxiliary-layer", page: page.label, ...issue });
    }
  }

  for (const hover of hoverChecks) {
    if (!hover.entered) failures.push({ code: "hover-not-entered", hover: hover.label });
    if (!hover.exited) failures.push({ code: "hover-not-exited", hover: hover.label });
    if (!hover.visible) failures.push({ code: "hover-not-visible", hover: hover.label });
    if (hover.persistentInlineBackground) {
      failures.push({ code: "persistent-hover-background", hover: hover.label });
    }
    for (const issue of hover.auxiliaryLayerIssues ?? []) {
      failures.push({ code: "auxiliary-layer", hover: hover.label, ...issue });
    }
  }

  if (restoredPath !== originalPath) {
    failures.push({ code: "incomplete-restoration", originalPath, restoredPath });
  }
  if (
    originalSidebarScrollTop !== null &&
    restoredSidebarScrollTop !== originalSidebarScrollTop
  ) {
    failures.push({
      code: "incomplete-scroll-restoration",
      originalSidebarScrollTop,
      restoredSidebarScrollTop,
    });
  }
  for (const error of runtimeErrors) {
    failures.push({ code: "runtime-error", message: error });
  }

  return {
    failures,
    hoverCheckCount: hoverChecks.length,
    hoverChecks,
    originalPath,
    originalSidebarScrollTop,
    pageCount: pages.length,
    pages,
    pass: failures.length === 0,
    restoredPath,
    restoredSidebarScrollTop,
    schemaVersion: 1,
  };
}

export async function auditRendererStyles({
  includeDevelopmentTargets = false,
  openSession = openPaseoRendererSession,
  remoteDebuggingPort = 9224,
  wait = delay,
} = {}) {
  const session = await openSession(remoteDebuggingPort, { includeDevelopmentTargets });
  const originalState = await session.evaluate(buildCaptureStateExpression());
  const pages = [];
  const hoverChecksByLabel = new Map();
  const runtimeErrors = [];
  let restoredState = null;

  try {
    await session.evaluate(buildInstallAuditStabilizerExpression());
    for (const page of RENDERER_STYLE_AUDIT_PAGE_PLAN) {
      if (page.kind === "application-setting") {
        await navigateToApplicationSetting(session, page, wait);
        pages.push(await session.evaluate(buildRendererStylePageSnapshotExpression(page.label)));
        if (!hoverChecksByLabel.has(SETTINGS_HOVER_LABEL)) {
          const hoverPlan = RENDERER_STYLE_AUDIT_HOVER_PLAN.find(
            ({ label }) => label === SETTINGS_HOVER_LABEL,
          );
          let hoverCheck = await performHoverCheck(session, hoverPlan, wait);
          if (!hoverCheck.entered || !hoverCheck.exited || !hoverCheck.visible) {
            await wait(INTERACTION_DELAY_MILLISECONDS * 2);
            hoverCheck = await performHoverCheck(session, hoverPlan, wait);
          }
          hoverChecksByLabel.set(hoverPlan.label, hoverCheck);
        }
      } else if (page.kind === "host-setting") {
        await navigateToHostSetting(session, page, wait);
        pages.push(await session.evaluate(buildRendererStylePageSnapshotExpression(page.label)));
      } else if (page.kind === "workspace") {
        await leaveSettings(session, wait);
        pages.push(await session.evaluate(buildRendererStylePageSnapshotExpression(page.label)));
        for (const hoverPlan of RENDERER_STYLE_AUDIT_HOVER_PLAN) {
          if (hoverPlan.label === SETTINGS_HOVER_LABEL) continue;
          hoverChecksByLabel.set(
            hoverPlan.label,
            await performHoverCheck(session, hoverPlan, wait),
          );
        }
        const failedHoverPlans = RENDERER_STYLE_AUDIT_HOVER_PLAN.filter((hoverPlan) => {
          if (hoverPlan.label === SETTINGS_HOVER_LABEL) return false;
          const result = hoverChecksByLabel.get(hoverPlan.label);
          return !result?.entered || !result?.exited || !result?.visible;
        });
        for (const hoverPlan of failedHoverPlans) {
          await wait(INTERACTION_DELAY_MILLISECONDS * 2);
          hoverChecksByLabel.set(
            hoverPlan.label,
            await performHoverCheck(session, hoverPlan, wait),
          );
        }
      } else if (page.kind === "utility") {
        await clickAndWait(
          session,
          `document.querySelector('[data-testid="${page.testIdentifier}"]')`,
          (candidate) => candidate === `/${page.label === "history" ? "sessions" : "schedules"}`,
          wait,
        );
        pages.push(await session.evaluate(buildRendererStylePageSnapshotExpression(page.label)));
      }
    }
  } catch (error) {
    runtimeErrors.push(error.message);
  } finally {
    try {
      restoredState = await restoreOriginalState(session, originalState, wait);
    } catch (error) {
      runtimeErrors.push(`State restoration failed: ${error.message}`);
      restoredState = await session.evaluate(buildCaptureStateExpression()).catch(() => null);
    }
    await session.evaluate(buildRemoveAuditStabilizerExpression()).catch((error) => {
      runtimeErrors.push(`Audit stabilizer cleanup failed: ${error.message}`);
    });
    session.close();
  }

  const hoverChecks = RENDERER_STYLE_AUDIT_HOVER_PLAN
    .map(({ label }) => hoverChecksByLabel.get(label))
    .filter(Boolean);
  return buildRendererStyleAuditReport({
    hoverChecks,
    originalPath: originalState.path,
    originalSidebarScrollTop: originalState.sidebarScrollTop,
    pages,
    restoredPath: restoredState?.path ?? null,
    restoredSidebarScrollTop: restoredState?.sidebarScrollTop ?? null,
    runtimeErrors,
  });
}
