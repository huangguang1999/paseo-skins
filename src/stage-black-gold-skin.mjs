import { createHash } from "node:crypto";

export const STAGE_BLACK_GOLD_STYLE_ID = "paseo-stage-black-gold-style";
export const STAGE_BLACK_GOLD_OVERLAY_ID = "paseo-stage-black-gold-overlay";
export const STAGE_BLACK_GOLD_GLOBAL_KEY = "__PASEO_STAGE_BLACK_GOLD_SKIN__";

const STAGE_BLACK_GOLD_CONFIGURATION = {
  globalKey: STAGE_BLACK_GOLD_GLOBAL_KEY,
  version: 16,
  styleIdentifier: STAGE_BLACK_GOLD_STYLE_ID,
  overlayIdentifier: STAGE_BLACK_GOLD_OVERLAY_ID,
  heroImageDataUrl: null,
  theme: {
    appearance: "dark",
    id: "stage-black-gold",
    name: "舞台黑金·暗夜江湖",
    art: {
      focusX: 0.72,
      focusY: 0.48,
      homeOpacity: 1,
      workspaceOpacity: 0.3,
      utilityOpacity: 0.46,
    },
    colors: {
      background: "#050505",
      panel: "rgba(10, 9, 8, 0.90)",
      panelAlt: "rgba(14, 13, 11, 0.74)",
      accent: "#d9b86f",
      glow: "#e8c377",
      text: "#f6f1e7",
      muted: "#b9aa8d",
      line: "rgba(220, 188, 122, 0.24)",
    },
  },
  accentColors: [
    [32, 116, 74],
    [228, 228, 231],
    [59, 111, 207],
    [217, 119, 87],
    [137, 180, 250],
  ],
  stagePalette: [
    [5, 5, 5],
    [7, 7, 7],
    [14, 13, 11],
    [25, 22, 18],
    [52, 45, 34],
    [217, 184, 111],
    [242, 216, 150],
    [246, 241, 231],
    [185, 170, 141],
    [136, 121, 95],
  ],
};

function installStageBlackGoldSkin(configuration) {
  const sidebarInteractiveItemSelectors = [
    '#root [data-testid^="sidebar-workspace-row-"]',
    '#root [data-testid^="sidebar-project-row-"]',
    '#root [data-testid^="sidebar-project-new-workspace-row-"]',
  ];
  const sidebarInteractiveItemSelector = sidebarInteractiveItemSelectors.join(", ");
  const sidebarInteractiveItemHoverSelector = sidebarInteractiveItemSelectors
    .map((selector) => `${selector}:hover`)
    .join(", ");
  const sidebarInteractiveItemSelectedSelector = sidebarInteractiveItemSelectors
    .map((selector) => `${selector}[aria-selected="true"]`)
    .join(", ");
  const interactiveElementSelector =
    'button, a[href], [role="button"], [role="menuitem"], [role="option"], [role="tab"], [role="treeitem"], [aria-selected]';
  const existingSkin = window[configuration.globalKey];
  if (
    existingSkin?.version === configuration.version &&
    existingSkin?.themeId === configuration.theme.id &&
    existingSkin?.configurationSignature === configuration.configurationSignature &&
    existingSkin?.refresh
  ) {
    existingSkin.refresh();
    return "refreshed";
  }
  existingSkin?.destroy?.();

  const originalInlineStyles = new Map();
  const pendingElements = new Set();
  let animationFrameIdentifier = null;
  let observer = null;
  let routeIntervalIdentifier = null;
  let routePathname = window.location.pathname;
  const originalRouteAttribute = document.documentElement?.getAttribute("data-paseo-skin-route");

  const isSameColor = (color, candidate) =>
    color.red === candidate[0] && color.green === candidate[1] && color.blue === candidate[2];

  const isAccentColor = (color) =>
    configuration.accentColors.some((candidate) => isSameColor(color, candidate));

  const parseColor = (value) => {
    const hexMatch = String(value).match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (hexMatch) {
      const red = Number.parseInt(hexMatch[1], 16);
      const green = Number.parseInt(hexMatch[2], 16);
      const blue = Number.parseInt(hexMatch[3], 16);
      const maximum = Math.max(red, green, blue) / 255;
      const minimum = Math.min(red, green, blue) / 255;
      const luminance = (maximum + minimum) / 2;
      const delta = maximum - minimum;
      const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * luminance - 1));
      return { red, green, blue, alpha: 1, luminance, saturation };
    }
    const match = String(value).match(
      /^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?:\s*,\s*(\d+(?:\.\d+)?))?\s*\)$/,
    );
    if (!match) {
      return null;
    }
    const red = Number(match[1]);
    const green = Number(match[2]);
    const blue = Number(match[3]);
    const alpha = match[4] === undefined ? 1 : Number(match[4]);
    const maximum = Math.max(red, green, blue) / 255;
    const minimum = Math.min(red, green, blue) / 255;
    const luminance = (maximum + minimum) / 2;
    const delta = maximum - minimum;
    const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * luminance - 1));
    return { red, green, blue, alpha, luminance, saturation };
  };

  const themePaletteColors = Object.values(configuration.theme.colors)
    .map(parseColor)
    .filter(Boolean);

  const isStagePaletteColor = (color) =>
    configuration.stagePalette.some((candidate) => isSameColor(color, candidate)) ||
    themePaletteColors.some((candidate) => isSameColor(color, [
      candidate.red,
      candidate.green,
      candidate.blue,
    ]));

  const rememberInlineStyle = (element, property) => {
    let elementStyles = originalInlineStyles.get(element);
    if (!elementStyles) {
      elementStyles = new Map();
      originalInlineStyles.set(element, elementStyles);
    }
    if (!elementStyles.has(property)) {
      elementStyles.set(property, {
        priority: element.style.getPropertyPriority(property),
        value: element.style.getPropertyValue(property),
      });
    }
  };

  const setImportantStyle = (element, property, value) => {
    if (
      element.style.getPropertyValue(property) === value &&
      element.style.getPropertyPriority(property) === "important"
    ) {
      return;
    }
    rememberInlineStyle(element, property);
    element.style.setProperty(property, value, "important");
  };

  const resolveSurfaceColor = (luminance) => {
    return luminance < 0.2
      ? configuration.theme.colors.panelAlt
      : configuration.theme.colors.panel;
  };

  const resolveForegroundColor = (luminance) => {
    if (luminance > 0.78 || luminance < 0.3) {
      return configuration.theme.colors.text;
    }
    return configuration.theme.colors.muted;
  };

  const resolveRelativeLuminance = (color) => {
    const toLinearChannel = (channel) => {
      const normalizedChannel = channel / 255;
      return normalizedChannel <= 0.04045
        ? normalizedChannel / 12.92
        : ((normalizedChannel + 0.055) / 1.055) ** 2.4;
    };
    return (
      0.2126 * toLinearChannel(color.red) +
      0.7152 * toLinearChannel(color.green) +
      0.0722 * toLinearChannel(color.blue)
    );
  };

  const resolveContrastRatio = (left, right) => {
    const leftLuminance = resolveRelativeLuminance(left);
    const rightLuminance = resolveRelativeLuminance(right);
    return (
      (Math.max(leftLuminance, rightLuminance) + 0.05) /
      (Math.min(leftLuminance, rightLuminance) + 0.05)
    );
  };

  const blackForegroundColor = parseColor("#000000");
  const whiteForegroundColor = parseColor("#ffffff");
  const resolveContrastingForegroundColor = (backgroundColor) =>
    resolveContrastRatio(backgroundColor, whiteForegroundColor) >=
    resolveContrastRatio(backgroundColor, blackForegroundColor)
      ? "#ffffff"
      : "#000000";

  const applyElementTheme = (element) => {
    if (
      !(element instanceof HTMLElement) ||
      element.closest(`#${configuration.overlayIdentifier}`)
    ) {
      return;
    }
    const computedStyle = getComputedStyle(element);
    const isSidebarInteractiveItem = element.matches(sidebarInteractiveItemSelector);
    const isInteractiveElement =
      computedStyle.cursor === "pointer" ||
      element.matches(interactiveElementSelector);
    const interactiveContainer = element.matches(interactiveElementSelector)
      ? element
      : element.closest(interactiveElementSelector);
    const interactiveBackgroundColor = interactiveContainer
      ? parseColor(getComputedStyle(interactiveContainer).backgroundColor)
      : null;
    const rectangle = element.getBoundingClientRect();
    const isLargeApplicationSurface =
      rectangle.width >= window.innerWidth * 0.45 &&
      rectangle.height >= window.innerHeight * 0.45;
    const isTallNavigationSurface =
      rectangle.width >= 160 &&
      rectangle.width <= window.innerWidth * 0.38 &&
      rectangle.height >= window.innerHeight * 0.72;
    const isBottomChromeSurface =
      rectangle.x >= window.innerWidth * 0.15 &&
      rectangle.width >= window.innerWidth * 0.45 &&
      rectangle.height >= 64 &&
      rectangle.height <= 220 &&
      rectangle.bottom >= window.innerHeight - 2;
    const isTopChromeSurface =
      rectangle.x >= window.innerWidth * 0.15 &&
      rectangle.width >= window.innerWidth * 0.45 &&
      rectangle.height >= 28 &&
      rectangle.height <= 64 &&
      rectangle.top >= 0 &&
      rectangle.bottom <= 100;

    const backgroundColor = parseColor(computedStyle.backgroundColor);
    if (backgroundColor && backgroundColor.alpha > 0.03) {
      if (
        isSidebarInteractiveItem ||
        (isInteractiveElement && backgroundColor.saturation < 0.22)
      ) {
        // Interactive rows and controls use transient hover/selected backgrounds.
        // Converting a neutral computed state into an inline !important value would
        // freeze that state after the pointer leaves or selection changes.
      } else if (isLargeApplicationSurface) {
        setImportantStyle(
          element,
          "background-color",
          `color-mix(in srgb, ${configuration.theme.colors.background} 4%, transparent)`,
        );
      } else if (isTallNavigationSurface) {
        setImportantStyle(
          element,
          "background-color",
          "transparent",
        );
        setImportantStyle(
          element,
          "background-image",
          `linear-gradient(90deg, color-mix(in srgb, ${configuration.theme.colors.background} 34%, transparent), transparent)`,
        );
        setImportantStyle(element, "backdrop-filter", "blur(10px) saturate(0.94)");
      } else if (isBottomChromeSurface) {
        setImportantStyle(
          element,
          "background-color",
          "transparent",
        );
        setImportantStyle(
          element,
          "background-image",
          `linear-gradient(180deg, transparent, color-mix(in srgb, ${configuration.theme.colors.background} 28%, transparent))`,
        );
        setImportantStyle(element, "backdrop-filter", "blur(12px) saturate(0.92)");
      } else if (isTopChromeSurface) {
        setImportantStyle(
          element,
          "background-color",
          `color-mix(in srgb, ${configuration.theme.colors.panelAlt} 24%, transparent)`,
        );
        setImportantStyle(element, "backdrop-filter", "blur(10px) saturate(0.92)");
      } else if (!isStagePaletteColor(backgroundColor) && isAccentColor(backgroundColor)) {
        setImportantStyle(element, "background-color", configuration.theme.colors.accent);
      } else if (!isStagePaletteColor(backgroundColor) && backgroundColor.saturation < 0.22) {
        setImportantStyle(
          element,
          "background-color",
          resolveSurfaceColor(backgroundColor.luminance),
        );
      }
    }

    const foregroundColor = parseColor(computedStyle.color);
    if (foregroundColor && foregroundColor.alpha > 0.03) {
      if (interactiveBackgroundColor?.alpha >= 0.7) {
        if (resolveContrastRatio(interactiveBackgroundColor, foregroundColor) < 4.5) {
          setImportantStyle(
            element,
            "color",
            resolveContrastingForegroundColor(interactiveBackgroundColor),
          );
        }
      } else if (!isStagePaletteColor(foregroundColor)) {
        if (isAccentColor(foregroundColor)) {
          setImportantStyle(element, "color", configuration.theme.colors.accent);
        } else if (foregroundColor.saturation < 0.16) {
          setImportantStyle(element, "color", resolveForegroundColor(foregroundColor.luminance));
        }
      }
    }

    for (const borderProperty of [
      "border-top-color",
      "border-right-color",
      "border-bottom-color",
      "border-left-color",
    ]) {
      const borderColor = parseColor(computedStyle.getPropertyValue(borderProperty));
      if (
        borderColor &&
        borderColor.alpha > 0.03 &&
        !isStagePaletteColor(borderColor) &&
        (borderColor.saturation < 0.22 || isAccentColor(borderColor))
      ) {
        setImportantStyle(element, borderProperty, configuration.theme.colors.line);
      }
    }

    if (isTallNavigationSurface) {
      setImportantStyle(element, "border-top-color", "transparent");
      setImportantStyle(element, "border-bottom-color", "transparent");
      setImportantStyle(element, "border-left-color", "transparent");
      setImportantStyle(element, "border-right-color", "transparent");
    } else if (isBottomChromeSurface) {
      setImportantStyle(element, "border-top-color", "transparent");
      setImportantStyle(element, "border-right-color", "transparent");
      setImportantStyle(element, "border-bottom-color", "transparent");
      setImportantStyle(element, "border-left-color", "transparent");
    } else if (isTopChromeSurface) {
      setImportantStyle(element, "border-top-color", "transparent");
      setImportantStyle(element, "border-right-color", "transparent");
      setImportantStyle(element, "border-bottom-color", "transparent");
      setImportantStyle(element, "border-left-color", "transparent");
    }
  };

  const scanElement = (element) => {
    applyElementTheme(element);
    for (const descendant of element.querySelectorAll("*")) {
      applyElementTheme(descendant);
    }
  };

  const flushPendingElements = () => {
    animationFrameIdentifier = null;
    for (const element of pendingElements) {
      scanElement(element);
    }
    pendingElements.clear();
  };

  const scheduleElement = (element) => {
    if (!(element instanceof HTMLElement)) {
      return;
    }
    pendingElements.add(element);
    if (animationFrameIdentifier === null) {
      animationFrameIdentifier = requestAnimationFrame(flushPendingElements);
    }
  };

  const ensureStyle = () => {
    if (document.getElementById(configuration.styleIdentifier)) {
      return;
    }
    const style = document.createElement("style");
    style.id = configuration.styleIdentifier;
    style.textContent = `
      html, body, #root {
        background: ${configuration.theme.colors.background} !important;
        color-scheme: ${configuration.theme.appearance === "light" ? "light" : "dark"} !important;
      }
      body {
        position: relative !important;
        min-height: 100vh !important;
        overflow: hidden !important;
      }
      #root {
        position: relative !important;
        z-index: 1 !important;
        min-height: 100vh !important;
        background: transparent !important;
      }
      ::selection {
        background: color-mix(in srgb, ${configuration.theme.colors.accent} 32%, transparent) !important;
      }
      #root [data-testid="user-message"]::selection,
      #root [data-testid="user-message"] ::selection {
        background: ${configuration.theme.colors.text} !important;
        color: ${configuration.theme.colors.background} !important;
        text-shadow: none !important;
      }
      #root input, #root textarea, #root [contenteditable="true"] {
        caret-color: ${configuration.theme.colors.accent} !important;
      }
      #root * {
        scrollbar-color: ${configuration.theme.colors.glow} transparent;
      }
      ${sidebarInteractiveItemSelector} {
        background-color: transparent !important;
        transition: background-color 140ms ease !important;
      }
      ${sidebarInteractiveItemHoverSelector} {
        background-color: color-mix(in srgb, ${configuration.theme.colors.accent} 14%, transparent) !important;
      }
      ${sidebarInteractiveItemSelectedSelector} {
        background-color: color-mix(in srgb, ${configuration.theme.colors.accent} 18%, transparent) !important;
      }
      #root [data-testid^="sidebar-workspace-kebab-"] {
        background-color: transparent !important;
      }
      #root [data-testid^="sidebar-workspace-row-"] [id^="sidebar-scrim-"] stop {
        stop-color: transparent !important;
      }
      #root [data-testid="sidebar-global-new-workspace"]:hover,
      #root [data-testid="sidebar-sessions"]:hover,
      #root [data-testid="sidebar-schedules"]:hover,
      #root [data-testid="settings-sidebar"] button:hover {
        background-color: color-mix(in srgb, ${configuration.theme.colors.accent} 14%, transparent) !important;
      }
      #${configuration.overlayIdentifier} {
        position: fixed;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        overflow: hidden;
        background: ${configuration.theme.colors.background};
      }
      #${configuration.overlayIdentifier} [data-paseo-skin-layer] {
        position: absolute;
        inset: 0;
      }
      #${configuration.overlayIdentifier} [data-paseo-skin-layer="hero"] {
        background-position: ${configuration.theme.art.focusX * 100}% ${configuration.theme.art.focusY * 100}%;
        background-repeat: no-repeat;
        background-size: cover;
        filter: saturate(0.82) contrast(1.06) brightness(0.84);
        opacity: ${configuration.theme.art.utilityOpacity};
        transform: scale(1.012);
        transition: opacity 220ms ease;
      }
      html[data-paseo-skin-route="home"] #${configuration.overlayIdentifier} [data-paseo-skin-layer="hero"] {
        opacity: ${configuration.theme.art.homeOpacity};
      }
      html[data-paseo-skin-route="workspace"] #${configuration.overlayIdentifier} [data-paseo-skin-layer="hero"] {
        opacity: ${configuration.theme.art.workspaceOpacity};
      }
      html[data-paseo-skin-route="utility"] #${configuration.overlayIdentifier} [data-paseo-skin-layer="hero"] {
        opacity: ${configuration.theme.art.utilityOpacity};
      }
      #${configuration.overlayIdentifier} [data-paseo-skin-layer="shade"] {
        background:
          linear-gradient(90deg,
            color-mix(in srgb, ${configuration.theme.colors.background} 34%, transparent) 0%,
            color-mix(in srgb, ${configuration.theme.colors.background} 18%, transparent) 24%,
            color-mix(in srgb, ${configuration.theme.colors.background} 8%, transparent) 50%,
            color-mix(in srgb, ${configuration.theme.colors.background} 6%, transparent) 76%,
            color-mix(in srgb, ${configuration.theme.colors.background} 20%, transparent) 100%),
          linear-gradient(0deg,
            color-mix(in srgb, ${configuration.theme.colors.background} 30%, transparent) 0%,
            transparent 28%, transparent 72%,
            color-mix(in srgb, ${configuration.theme.colors.background} 24%, transparent) 100%);
      }
      #${configuration.overlayIdentifier} [data-paseo-skin-layer="grain"] {
        opacity: 0.14;
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.26'/%3E%3C/svg%3E");
        mix-blend-mode: soft-light;
      }
      #root button,
      #root input,
      #root textarea,
      #root [contenteditable="true"],
      #root [role="dialog"],
      #root [role="menu"] {
        border-color: ${configuration.theme.colors.line} !important;
      }
      #root [role="dialog"],
      #root [role="menu"] {
        background: ${configuration.theme.colors.panel} !important;
        backdrop-filter: blur(28px) saturate(0.84) !important;
        box-shadow: 0 28px 90px rgba(0, 0, 0, 0.58), 0 0 0 1px ${configuration.theme.colors.line} !important;
      }
    `;
    (document.head ?? document.documentElement).append(style);
  };

  const syncRoute = () => {
    const pathName = window.location.pathname;
    routePathname = pathName;
    const route = pathName === "/new" || pathName === "/" || pathName.endsWith("/new")
      ? "home"
      : pathName.includes("/workspace/")
        ? "workspace"
        : "utility";
    document.documentElement?.setAttribute("data-paseo-skin-route", route);
    return route;
  };

  const ensureOverlay = () => {
    if (!document.body || document.getElementById(configuration.overlayIdentifier)) {
      return;
    }
    const overlay = document.createElement("div");
    overlay.id = configuration.overlayIdentifier;
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <div data-paseo-skin-layer="hero"></div>
      <div data-paseo-skin-layer="shade"></div>
      <div data-paseo-skin-layer="grain"></div>
    `;
    const heroLayer = overlay.querySelector('[data-paseo-skin-layer="hero"]');
    if (configuration.heroImageDataUrl) {
      heroLayer.style.backgroundImage = `url("${configuration.heroImageDataUrl}")`;
    }
    document.body.append(overlay);
  };

  const refresh = () => {
    ensureStyle();
    ensureOverlay();
    syncRoute();
    if (document.documentElement) {
      scheduleElement(document.documentElement);
    }
  };

  const destroy = () => {
    observer?.disconnect();
    if (routeIntervalIdentifier !== null) {
      clearInterval(routeIntervalIdentifier);
    }
    if (animationFrameIdentifier !== null) {
      cancelAnimationFrame(animationFrameIdentifier);
    }
    document.getElementById(configuration.overlayIdentifier)?.remove();
    document.getElementById(configuration.styleIdentifier)?.remove();
    if (document.documentElement) {
      if (originalRouteAttribute === null) {
        document.documentElement.removeAttribute("data-paseo-skin-route");
      } else {
        document.documentElement.setAttribute("data-paseo-skin-route", originalRouteAttribute);
      }
    }
    for (const [element, elementStyles] of originalInlineStyles) {
      for (const [property, originalStyle] of elementStyles) {
        if (originalStyle.value) {
          element.style.setProperty(property, originalStyle.value, originalStyle.priority);
        } else {
          element.style.removeProperty(property);
        }
      }
    }
    delete window[configuration.globalKey];
  };

  const initialize = () => {
    refresh();
    routeIntervalIdentifier = setInterval(() => {
      if (window.location.pathname !== routePathname) syncRoute();
    }, 250);
    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          for (const node of mutation.addedNodes) {
            scheduleElement(node);
          }
        } else {
          scheduleElement(mutation.target);
        }
      }
      ensureStyle();
      ensureOverlay();
      syncRoute();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
      childList: true,
      subtree: true,
    });
  };

  window[configuration.globalKey] = {
    configurationSignature: configuration.configurationSignature,
    destroy,
    refresh,
    themeId: configuration.theme.id,
    version: configuration.version,
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
  return "installed";
}

export function buildStageBlackGoldInjectionSource({ heroImageDataUrl = null, theme = null } = {}) {
  const configuration = {
    ...STAGE_BLACK_GOLD_CONFIGURATION,
    heroImageDataUrl,
    theme: theme ?? STAGE_BLACK_GOLD_CONFIGURATION.theme,
  };
  configuration.configurationSignature = createHash("sha256")
    .update(JSON.stringify(configuration))
    .digest("hex");
  return `(${installStageBlackGoldSkin.toString()})(${JSON.stringify(
    configuration,
  )});`;
}

export function buildStageBlackGoldVerificationSource({ expectedThemeId = null } = {}) {
  return `(() => {
    const root = document.getElementById("root");
    const rootStyle = root ? getComputedStyle(root) : null;
    const overlay = document.getElementById(${JSON.stringify(STAGE_BLACK_GOLD_OVERLAY_ID)});
    const overlayStyle = overlay ? getComputedStyle(overlay) : null;
    const skin = window[${JSON.stringify(STAGE_BLACK_GOLD_GLOBAL_KEY)}];
    const result = {
      rootPresent: Boolean(root),
      rootChildCount: root?.childElementCount ?? 0,
      rootVisibility: rootStyle?.visibility ?? null,
      rootDisplay: rootStyle?.display ?? null,
      skinInstalled: Boolean(skin),
      skinVersion: skin?.version ?? null,
      themeId: skin?.themeId ?? null,
      expectedThemeId: ${JSON.stringify(expectedThemeId)},
      route: document.documentElement?.getAttribute("data-paseo-skin-route") ?? null,
      overlayPresent: Boolean(overlay),
      overlayPointerEvents: overlayStyle?.pointerEvents ?? null,
      stylePresent: Boolean(document.getElementById(${JSON.stringify(STAGE_BLACK_GOLD_STYLE_ID)})),
      horizontalOverflow:
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
    result.pass = Boolean(
      result.rootPresent &&
      result.rootChildCount > 0 &&
      result.rootVisibility !== "hidden" &&
      result.rootVisibility !== "collapse" &&
      result.rootDisplay !== "none" &&
      result.skinInstalled &&
      result.overlayPresent &&
      result.overlayPointerEvents === "none" &&
      result.stylePresent &&
      !result.horizontalOverflow &&
      (!result.expectedThemeId || result.themeId === result.expectedThemeId)
    );
    return result;
  })();`;
}

export function buildStageBlackGoldResetSource() {
  return `(() => {
    const root = document.getElementById("root");
    root?.style.removeProperty("visibility");
    window[${JSON.stringify(STAGE_BLACK_GOLD_GLOBAL_KEY)}]?.destroy?.();
    return {
      rootVisibility: root ? getComputedStyle(root).visibility : null,
      skinInstalled: Boolean(window[${JSON.stringify(STAGE_BLACK_GOLD_GLOBAL_KEY)}]),
      overlayPresent: Boolean(document.getElementById(${JSON.stringify(STAGE_BLACK_GOLD_OVERLAY_ID)})),
      stylePresent: Boolean(document.getElementById(${JSON.stringify(STAGE_BLACK_GOLD_STYLE_ID)})),
    };
  })();`;
}
