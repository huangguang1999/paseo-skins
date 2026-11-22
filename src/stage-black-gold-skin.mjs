import { createHash } from "node:crypto";

export const STAGE_BLACK_GOLD_STYLE_ID = "paseo-stage-black-gold-style";
export const STAGE_BLACK_GOLD_OVERLAY_ID = "paseo-stage-black-gold-overlay";
export const STAGE_BLACK_GOLD_GLOBAL_KEY = "__PASEO_STAGE_BLACK_GOLD_SKIN__";

const STAGE_BLACK_GOLD_CONFIGURATION = {
  globalKey: STAGE_BLACK_GOLD_GLOBAL_KEY,
  version: 24,
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
  // Brand paths from @lobehub/icons-static-svg@1.104.0 (MIT), see NOTICE.md.
  // https://unpkg.com/@lobehub/icons-static-svg@1.104.0/icons/doubao-color.svg
  // https://unpkg.com/@lobehub/icons-static-svg@1.104.0/icons/deepseek-color.svg
  const modelProviderArtwork = [
    {
      provider: "seed",
      paths: [
        { d: "M5.31 15.756c.172-3.75 1.883-5.999 2.549-6.739-3.26 2.058-5.425 5.658-6.358 8.308v1.12C1.501 21.513 4.226 24 7.59 24a6.59 6.59 0 002.2-.375c.353-.12.7-.248 1.039-.378.913-.899 1.65-1.91 2.243-2.992-4.877 2.431-7.974.072-7.763-4.5l.002.001z", fill: "#1E37FC" },
        { d: "M22.57 10.283c-1.212-.901-4.109-2.404-7.397-2.8.295 3.792.093 8.766-2.1 12.773a12.782 12.782 0 01-2.244 2.992c3.764-1.448 6.746-3.457 8.596-5.219 2.82-2.683 3.353-5.178 3.361-6.66a2.737 2.737 0 00-.216-1.084v-.002z", fill: "#37E1BE" },
        { d: "M14.303 1.867C12.955.7 11.248 0 9.39 0 7.532 0 5.883.677 4.545 1.807 2.791 3.29 1.627 5.557 1.5 8.125v9.201c.932-2.65 3.097-6.25 6.357-8.307.5-.318 1.025-.595 1.569-.829 1.883-.801 3.878-.932 5.746-.706-.222-2.83-.718-5.002-.87-5.617h.001z", fill: "#A569FF" },
        { d: "M17.305 4.961a199.47 199.47 0 01-1.08-1.094c-.202-.213-.398-.419-.586-.622l-1.333-1.378c.151.615.648 2.786.869 5.617 3.288.395 6.185 1.898 7.396 2.8-1.306-1.275-3.475-3.487-5.266-5.323z", fill: "#1E37FC" },
      ],
    },
    {
      provider: "deepseek",
      paths: [
        { d: "M23.748 4.482c-.254-.124-.364.113-.512.234-.051.039-.094.09-.137.136-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.156-.708-.311-.955-.65-.172-.241-.219-.51-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.093.172.187.129.323-.082.28-.18.552-.266.833-.055.179-.137.217-.329.14a5.526 5.526 0 01-1.736-1.18c-.857-.828-1.631-1.742-2.597-2.458a11.365 11.365 0 00-.689-.471c-.985-.957.13-1.743.388-1.836.27-.098.093-.432-.779-.428-.872.004-1.67.295-2.687.684a3.055 3.055 0 01-.465.137 9.597 9.597 0 00-2.883-.102c-1.885.21-3.39 1.102-4.497 2.623C.082 8.606-.231 10.684.152 12.85c.403 2.284 1.569 4.175 3.36 5.653 1.858 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.133-.284 4.994-1.86.47.234.962.327 1.78.397.63.059 1.236-.03 1.705-.128.735-.156.684-.837.419-.961-2.155-1.004-1.682-.595-2.113-.926 1.096-1.296 2.746-2.642 3.392-7.003.05-.347.007-.565 0-.845-.004-.17.035-.237.23-.256a4.173 4.173 0 001.545-.475c1.396-.763 1.96-2.015 2.093-3.517.02-.23-.004-.467-.247-.588zM11.581 18c-2.089-1.642-3.102-2.183-3.52-2.16-.392.024-.321.471-.235.763.09.288.207.486.371.739.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.167-1.361-.802-2.5-1.86-3.301-3.307-.774-1.393-1.224-2.887-1.298-4.482-.02-.386.093-.522.477-.592a4.696 4.696 0 011.529-.039c2.132.312 3.946 1.265 5.468 2.774.868.86 1.525 1.887 2.202 2.891.72 1.066 1.494 2.082 2.48 2.914.348.292.625.514.891.677-.802.09-2.14.11-3.054-.614zm1-6.44a.306.306 0 01.415-.287.302.302 0 01.2.288.306.306 0 01-.31.307.303.303 0 01-.304-.308zm3.11 1.596c-.2.081-.399.151-.59.16a1.245 1.245 0 01-.798-.254c-.274-.23-.47-.358-.552-.758a1.73 1.73 0 01.016-.588c.07-.327-.008-.537-.239-.727-.187-.156-.426-.199-.688-.199a.559.559 0 01-.254-.078c-.11-.054-.2-.19-.114-.358.028-.054.16-.186.192-.21.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.391.451.462.576.685.914.176.265.336.537.445.848.067.195-.019.354-.25.452z", fill: "#4D6BFE" },
      ],
    },
  ];
  const modelBrandIcons = [
    { color: "#3186ff", paths: ["M21.751 22.607"] },
    { color: "#d97757", paths: ["M4.709 15.955", "M 233.959793 800.214905"] },
    { color: "#10a37f", paths: ["M21.55 10.004", "M22.282 9.821"] },
    { color: "#8e75c2", paths: ["M11.04 19.32"] },
    { color: "#4f46e5", paths: ["M395.479 633.828", "M325.226 695.251"] },
    { color: "#7c3aed", paths: ["M19.514 7.342"] },
    { color: "#2563eb", paths: ["M2.4 4.8H21.6V19.2H2.4Z", "M24 20.541H3.428"] },
  ];
  const fallbackModelIconColor = "#0891b2";
  const modelIconContextPattern =
    /(?:^|[-_])(?:agent|model|provider)(?:[-_]|$)|^(?:schedule|schedules|session|sessions|import-session|user-message)(?:[-_]|$)/;
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
  const originalArtwork = new Map();
  const pendingElements = new Set();
  let animationFrameIdentifier = null;
  let observer = null;
  let routeIntervalIdentifier = null;
  let routePathname = window.location.pathname;
  const originalRouteAttribute = document.documentElement?.getAttribute("data-paseo-skin-route");
  let usesNativeTheme = false;
  // Unistyles resolves built-in, system and plugin themes into these variables.
  // Keep the references live: a host theme switch must not freeze computed colors.
  const nativeColorTokens = {
    background: "surface0",
    panel: "popover",
    panelAlt: "surface1",
    text: "foreground",
    muted: "foreground-muted",
    accent: "accent",
    glow: "ring",
    line: "border",
  };
  const palette = Object.fromEntries(Object.entries(nativeColorTokens).map(([key, token]) =>
    [key, `var(--colors-${token}, ${configuration.theme.colors[key]})`],
  ));

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

  const restoreInlineStyles = () => {
    for (const [element, elementStyles] of originalInlineStyles) {
      for (const [property, originalStyle] of elementStyles) {
        if (originalStyle.value) {
          element.style.setProperty(property, originalStyle.value, originalStyle.priority);
        } else {
          element.style.removeProperty(property);
        }
      }
    }
    originalInlineStyles.clear();
  };

  const restoreArtwork = () => {
    for (const [element, snapshot] of originalArtwork) {
      for (const name of element.getAttributeNames()) {
        if (!(name in snapshot.attributes)) element.removeAttribute(name);
      }
      for (const [name, value] of Object.entries(snapshot.attributes)) {
        element.setAttribute(name, value);
      }
      element.replaceChildren(...snapshot.children);
    }
    originalArtwork.clear();
  };

  const replaceModelProviderArtwork = (element, artwork) => {
    if (!originalArtwork.has(element)) {
      originalArtwork.set(element, {
        attributes: Object.fromEntries(
          element.getAttributeNames().map((name) => [name, element.getAttribute(name)]),
        ),
        children: [...element.children],
      });
    }
    for (const name of ["fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin"]) {
      element.removeAttribute(name);
    }
    for (const property of ["color", "fill", "stroke"]) {
      rememberInlineStyle(element, property);
      element.style.removeProperty(property);
    }
    element.setAttribute("viewBox", "0 0 24 24");
    const paths = artwork.paths.map(({ d, fill }) => {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      path.setAttribute("fill", fill);
      return path;
    });
    element.replaceChildren(...paths);
  };

  const findModelProviderArtwork = (element) => {
    let current = element;
    while (current) {
      const testIdentifier = current.getAttribute?.("data-testid") ?? "";
      const artwork = modelProviderArtwork.find(
        ({ provider }) =>
          testIdentifier === `model-provider-${provider}` ||
          testIdentifier.startsWith(`model-row-${provider}-`),
      );
      if (artwork) return artwork;
      current = current.parentElement;
    }
    return null;
  };

  const syncNativeTheme = () => {
    if (!document.documentElement) return;
    const rootStyle = getComputedStyle(document.documentElement);
    const background = parseColor(rootStyle.getPropertyValue("--colors-surface0").trim());
    const foreground = parseColor(rootStyle.getPropertyValue("--colors-foreground").trim());
    const nextUsesNativeTheme = background?.alpha === 1 && foreground?.alpha === 1;
    if (nextUsesNativeTheme === usesNativeTheme) return;
    // Early injection can run before the host stylesheet is mounted. Remove any
    // fallback recoloring once native tokens arrive, including on existing nodes.
    restoreInlineStyles();
    usesNativeTheme = nextUsesNativeTheme;
    pendingElements.add(document.documentElement);
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

  const applyModelIconTheme = (element) => {
    if (!(element instanceof SVGElement) || element.tagName.toLowerCase() !== "svg") {
      return;
    }
    const pathData = [...element.querySelectorAll("path")]
      .map((path) => path.getAttribute("d")?.trim() ?? "")
      .filter(Boolean);
    const isFallbackModelIcon = pathData.some((data) => data.startsWith("M12 8V4H8"));
    if (isFallbackModelIcon) {
      const artwork = findModelProviderArtwork(element);
      if (artwork) {
        replaceModelProviderArtwork(element, artwork);
        return;
      }
    }
    const brandIcon = modelBrandIcons.find((candidate) =>
      candidate.paths.some((signature) => pathData.some((data) => data.startsWith(signature))),
    );
    let color = brandIcon?.color;
    if (!color && isFallbackModelIcon) {
      let current = element;
      while (current) {
        const testIdentifier = current.getAttribute?.("data-testid") ?? "";
        if (modelIconContextPattern.test(testIdentifier)) {
          color = fallbackModelIconColor;
          break;
        }
        current = current.parentElement;
      }
    }
    if (color) {
      setImportantStyle(element, "color", color);
      const fill = element.getAttribute("fill");
      if (fill && fill !== "none" && fill !== "currentColor" && !fill.startsWith("url(")) {
        setImportantStyle(element, "fill", color);
      }
      const stroke = element.getAttribute("stroke");
      if (stroke && stroke !== "none" && stroke !== "currentColor" && !stroke.startsWith("url(")) {
        setImportantStyle(element, "stroke", color);
      }
      for (const descendant of element.querySelectorAll("[stroke]")) {
        const descendantStroke = descendant.getAttribute("stroke");
        if (
          descendantStroke &&
          descendantStroke !== "none" &&
          descendantStroke !== "currentColor" &&
          !descendantStroke.startsWith("url(")
        ) {
          setImportantStyle(descendant, "stroke", color);
        }
      }
    }
  };

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
          `color-mix(in srgb, ${palette.background} 4%, transparent)`,
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
          `linear-gradient(90deg, color-mix(in srgb, ${palette.background} 34%, transparent), transparent)`,
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
          `linear-gradient(180deg, transparent, color-mix(in srgb, ${palette.background} 28%, transparent))`,
        );
        setImportantStyle(element, "backdrop-filter", "blur(12px) saturate(0.92)");
      } else if (isTopChromeSurface) {
        setImportantStyle(
          element,
          "background-color",
          `color-mix(in srgb, ${palette.panelAlt} 24%, transparent)`,
        );
        setImportantStyle(element, "backdrop-filter", "blur(10px) saturate(0.92)");
      } else if (!usesNativeTheme && !isStagePaletteColor(backgroundColor) && isAccentColor(backgroundColor)) {
        setImportantStyle(element, "background-color", configuration.theme.colors.accent);
      } else if (!usesNativeTheme && !isStagePaletteColor(backgroundColor) && backgroundColor.saturation < 0.22) {
        setImportantStyle(
          element,
          "background-color",
          resolveSurfaceColor(backgroundColor.luminance),
        );
      }
    }

    const foregroundColor = parseColor(computedStyle.color);
    if (!usesNativeTheme && foregroundColor && foregroundColor.alpha > 0.03) {
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
        !usesNativeTheme && borderColor &&
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
    applyModelIconTheme(element);
    applyElementTheme(element);
    for (const descendant of element.querySelectorAll("*")) {
      applyModelIconTheme(descendant);
      applyElementTheme(descendant);
    }
  };

  const flushPendingElements = () => {
    animationFrameIdentifier = null;
    syncNativeTheme();
    for (const element of pendingElements) {
      scanElement(element);
    }
    pendingElements.clear();
  };

  const scheduleElement = (element) => {
    if (!(element instanceof HTMLElement) && !(element instanceof SVGElement)) {
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
        background: ${palette.background} !important;
        color-scheme: var(--color-scheme, ${configuration.theme.appearance === "light" ? "light" : "dark"}) !important;
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
        background: color-mix(in srgb, ${palette.accent} 32%, transparent) !important;
      }
      #root [data-testid="user-message"]::selection,
      #root [data-testid="user-message"] ::selection {
        background: ${palette.text} !important;
        color: ${palette.background} !important;
        text-shadow: none !important;
      }
      #root input, #root textarea, #root [contenteditable="true"] {
        caret-color: ${palette.accent} !important;
      }
      #root * {
        scrollbar-color: ${palette.glow} transparent;
      }
      ${sidebarInteractiveItemSelector} {
        background-color: transparent !important;
        transition: background-color 140ms ease !important;
      }
      ${sidebarInteractiveItemHoverSelector} {
        background-color: color-mix(in srgb, ${palette.accent} 14%, transparent) !important;
      }
      ${sidebarInteractiveItemSelectedSelector} {
        background-color: color-mix(in srgb, ${palette.accent} 18%, transparent) !important;
      }
      #root [data-testid^="sidebar-workspace-kebab-"] {
        background-color: transparent !important;
      }
      #root [data-testid^="sidebar-workspace-row-"] [id^="sidebar-scrim-"] stop {
        stop-color: transparent !important;
      }
      #root [data-testid="sidebar-workspace-trailing-scrim"] {
        display: none !important;
      }
      #root [data-testid^="sidebar-workspace-row-"] div:has(> [data-testid="sidebar-workspace-trailing-scrim"]) {
        padding-right: 24px !important;
      }
      #root [data-testid="sidebar-global-new-workspace"]:hover,
      #root [data-testid="sidebar-sessions"]:hover,
      #root [data-testid="sidebar-schedules"]:hover,
      #root [data-testid="settings-sidebar"] button:hover {
        background-color: color-mix(in srgb, ${palette.accent} 14%, transparent) !important;
      }
      #${configuration.overlayIdentifier} {
        position: fixed;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        overflow: hidden;
        background: ${palette.background};
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
            color-mix(in srgb, ${palette.background} 34%, transparent) 0%,
            color-mix(in srgb, ${palette.background} 18%, transparent) 24%,
            color-mix(in srgb, ${palette.background} 8%, transparent) 50%,
            color-mix(in srgb, ${palette.background} 6%, transparent) 76%,
            color-mix(in srgb, ${palette.background} 20%, transparent) 100%),
          linear-gradient(0deg,
            color-mix(in srgb, ${palette.background} 30%, transparent) 0%,
            transparent 28%, transparent 72%,
            color-mix(in srgb, ${palette.background} 24%, transparent) 100%);
      }
      #${configuration.overlayIdentifier} [data-paseo-skin-layer="grain"] {
        opacity: 0.14;
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.26'/%3E%3C/svg%3E");
        mix-blend-mode: soft-light;
      }
      #better-paseo-find {
        background: ${palette.panel} !important;
        color: ${palette.text} !important;
        border-color: ${palette.line} !important;
      }
      #better-paseo-find input {
        background: ${palette.panelAlt} !important;
        color: ${palette.text} !important;
        border-color: ${palette.line} !important;
      }
      #better-paseo-find::placeholder {
        color: ${palette.muted} !important;
      }
      #better-paseo-find button {
        color: ${palette.text} !important;
      }
      #better-paseo-find button:hover {
        background: color-mix(in srgb, ${palette.accent} 14%, transparent) !important;
      }
      #root button,
      #root input,
      #root textarea,
      #root [contenteditable="true"],
      #root [role="dialog"],
      #root [role="menu"] {
        border-color: ${palette.line} !important;
      }
      #root [role="dialog"],
      #root [role="menu"] {
        background: ${palette.panel} !important;
        backdrop-filter: blur(28px) saturate(0.84) !important;
        box-shadow: 0 28px 90px rgba(0, 0, 0, 0.58), 0 0 0 1px ${palette.line} !important;
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
    restoreInlineStyles();
    restoreArtwork();
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
          if (mutation.target?.tagName === "STYLE") {
            scheduleElement(document.documentElement);
          }
          for (const node of mutation.addedNodes) {
            scheduleElement(node);
          }
        } else if (mutation.type === "characterData") {
          if (mutation.target.parentElement?.tagName === "STYLE") {
            scheduleElement(document.documentElement);
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
      characterData: true,
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
