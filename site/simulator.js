import { copyWithFeedback, loadCatalog, loadTheme, showToast } from "./common.js";
import { renderPaseoPreviewFrame } from "./paseo-preview-frame.js";

const DEFAULT_STATE = {
  appearance: "auto",
  page: "home",
  sidebar: "expanded",
  viewport: "wide",
};
const STATE_OPTIONS = {
  appearance: ["auto", "light", "dark"],
  page: ["home", "tasks"],
  sidebar: ["expanded", "collapsed"],
  viewport: ["wide", "narrow"],
};

function isLightColor(color) {
  const match = String(color).match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!match) return false;
  const channels = match.slice(1).map((value) => Number.parseInt(value, 16) / 255);
  const luminance = channels.reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  return luminance > 0.62;
}

function createButton(label, action, value, selected = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.action = action;
  if (value !== undefined) button.dataset.value = value;
  button.textContent = label;
  button.setAttribute("aria-pressed", String(selected));
  return button;
}

function getAppearanceColors(manifest, appearance) {
  const colors = manifest.colors;
  const light = appearance === "light" || (appearance === "auto" && isLightColor(colors.background));
  if (!light) return colors;
  return {
    ...colors,
    background: "#f7f7f5",
    line: "rgba(20, 24, 31, 0.14)",
    muted: "#686b70",
    panel: "rgba(255, 255, 255, 0.90)",
    panelAlt: "rgba(238, 239, 241, 0.84)",
    text: "#121418",
  };
}

export async function mountSimulator(root, options = {}) {
  const catalog = await loadCatalog();
  const state = {
    ...DEFAULT_STATE,
    ...options.initialState,
    themeId: options.themeId ?? catalog.themes[0]?.id,
  };
  for (const [key, allowed] of Object.entries(STATE_OPTIONS)) {
    if (!allowed.includes(state[key])) state[key] = DEFAULT_STATE[key];
  }
  let activeTheme = null;
  let customTheme = null;
  let compareActive = false;
  let focusBeforeFullscreen = null;
  let renderRequestIdentifier = 0;

  root.classList.add("simulator");
  root.innerHTML = `
    <div class="simulator-toolbar" aria-label="模拟器控制">
      <div class="simulator-theme-options" data-slot="themes"></div>
      <div class="segmented" data-slot="appearance" aria-label="外观"></div>
      <div class="segmented" data-slot="page" aria-label="页面"></div>
      <div class="segmented" data-slot="viewport" aria-label="窗口尺寸"></div>
      <button class="quiet-button" type="button" data-action="sidebar">收起侧栏</button>
      <button class="quiet-button" type="button" data-action="compare">按住看原版</button>
      ${options.showFullscreen === false ? "" : '<button class="quiet-button" type="button" data-action="fullscreen">全屏预览</button>'}
      ${options.showShare === false ? "" : '<button class="quiet-button" type="button" data-action="share">分享预览</button>'}
    </div>
    <div class="simulator-viewport" data-slot="viewport-frame">
      <div class="simulator-window">
        <div class="simulator-theme-art" aria-hidden="true"></div>
        <div class="paseo-preview-frame" data-preview-page="home">${renderPaseoPreviewFrame()}</div>
      </div>
    </div>`;

  const themeSlot = root.querySelector('[data-slot="themes"]');
  const appearanceSlot = root.querySelector('[data-slot="appearance"]');
  const pageSlot = root.querySelector('[data-slot="page"]');
  const viewportSlot = root.querySelector('[data-slot="viewport"]');
  const frame = root.querySelector('[data-slot="viewport-frame"]');

  const renderControls = () => {
    themeSlot.replaceChildren(...catalog.themes.slice(0, options.themeLimit ?? 6).map((theme) => {
      const button = createButton(theme.name, "theme", theme.id, theme.id === state.themeId);
      button.title = theme.englishName;
      button.style.setProperty("--option-accent", theme.accent);
      return button;
    }));
    const selectedThemeButton = themeSlot.querySelector('[aria-pressed="true"]');
    if (selectedThemeButton) themeSlot.scrollLeft = Math.max(0, selectedThemeButton.offsetLeft - 16);
    appearanceSlot.replaceChildren(
      createButton("自动", "appearance", "auto", state.appearance === "auto"),
      createButton("浅色", "appearance", "light", state.appearance === "light"),
      createButton("深色", "appearance", "dark", state.appearance === "dark"),
    );
    pageSlot.replaceChildren(
      createButton("首页", "page", "home", state.page === "home"),
      createButton("任务", "page", "tasks", state.page === "tasks"),
    );
    viewportSlot.replaceChildren(
      createButton("宽屏", "viewport", "wide", state.viewport === "wide"),
      createButton("窄窗", "viewport", "narrow", state.viewport === "narrow"),
    );
    root.querySelector('[data-action="sidebar"]').textContent =
      state.sidebar === "expanded" ? "收起侧栏" : "展开侧栏";
  };

  const renderTheme = async () => {
    const requestIdentifier = ++renderRequestIdentifier;
    const nextTheme = state.themeId === "__custom__" && customTheme
      ? customTheme
      : await loadTheme(state.themeId);
    if (requestIdentifier !== renderRequestIdentifier) return;
    activeTheme = nextTheme;
    if (state.themeId !== "__custom__") state.themeId = activeTheme.summary.id;
    const colors = getAppearanceColors(activeTheme.manifest, state.appearance);
    const previewUrl = activeTheme.summary.previewUrl;
    root.style.setProperty("--sim-accent", colors.accent);
    root.style.setProperty("--sim-background", colors.background);
    root.style.setProperty("--sim-line", colors.line);
    root.style.setProperty("--sim-muted", colors.muted);
    root.style.setProperty("--sim-panel", colors.panel);
    root.style.setProperty("--sim-panel-alt", colors.panelAlt);
    root.style.setProperty("--sim-text", colors.text);
    root.style.setProperty("--sim-image", `url("${previewUrl}")`);
    root.style.setProperty("--sim-focus-x", `${activeTheme.manifest.art.focusX * 100}%`);
    root.style.setProperty("--sim-focus-y", `${activeTheme.manifest.art.focusY * 100}%`);
    root.dataset.appearance = state.appearance;
    root.dataset.compare = String(compareActive);
    root.dataset.page = state.page;
    root.dataset.sidebar = state.sidebar;
    root.dataset.viewport = state.viewport;
    root.querySelector(".paseo-preview-frame").dataset.previewPage = state.page;
    frame.classList.toggle("is-narrow", state.viewport === "narrow");
    renderControls();
    options.onStateChange?.({ ...state, theme: activeTheme });
  };

  const updateState = async (key, value) => {
    state[key] = value;
    await renderTheme();
    if (options.syncUrl) {
      const url = new URL(window.location.href);
      for (const [stateKey, stateValue] of Object.entries(state)) url.searchParams.set(stateKey, stateValue);
      history.replaceState(null, "", url);
    }
  };

  const setFullscreen = (fullscreen, fullscreenButton) => {
    if (fullscreen) focusBeforeFullscreen = document.activeElement;
    root.classList.toggle("is-fullscreen", fullscreen);
    if (fullscreen) {
      root.setAttribute("role", "dialog");
      root.setAttribute("aria-modal", "true");
      root.setAttribute("aria-label", "Paseo 主题全屏预览");
      fullscreenButton?.focus();
    } else {
      root.removeAttribute("role");
      root.removeAttribute("aria-modal");
      root.removeAttribute("aria-label");
      focusBeforeFullscreen?.focus?.();
      focusBeforeFullscreen = null;
    }
    if (fullscreenButton) fullscreenButton.textContent = fullscreen ? "退出全屏" : "全屏预览";
  };

  root.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const { action, value } = button.dataset;
    if (["theme", "appearance", "page", "viewport"].includes(action)) {
      await updateState(action === "theme" ? "themeId" : action, value);
    } else if (action === "sidebar") {
      await updateState("sidebar", state.sidebar === "expanded" ? "collapsed" : "expanded");
    } else if (action === "share") {
      const url = new URL(options.shareUrl ?? window.location.href);
      for (const [key, stateValue] of Object.entries(state)) url.searchParams.set(key, stateValue);
      await copyWithFeedback(url.href, "预览链接已复制");
    } else if (action === "fullscreen") {
      const fullscreen = !root.classList.contains("is-fullscreen");
      setFullscreen(fullscreen, button);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !root.classList.contains("is-fullscreen")) return;
    const button = root.querySelector('[data-action="fullscreen"]');
    setFullscreen(false, button);
  });

  const compareButton = root.querySelector('[data-action="compare"]');
  const setCompare = (active) => {
    compareActive = active;
    root.dataset.compare = String(active);
  };
  compareButton.addEventListener("pointerdown", () => setCompare(true));
  for (const eventName of ["pointerup", "pointercancel", "pointerleave"]) {
    compareButton.addEventListener(eventName, () => setCompare(false));
  }
  compareButton.addEventListener("keydown", (event) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      setCompare(true);
    }
  });
  compareButton.addEventListener("keyup", () => setCompare(false));

  await renderTheme();
  return {
    getState: () => ({ ...state }),
    setState: async (nextState) => {
      for (const [key, value] of Object.entries(nextState)) {
        if (STATE_OPTIONS[key]?.includes(value)) state[key] = value;
      }
      await renderTheme();
    },
    setTheme: (themeId) => updateState("themeId", themeId),
    setCustomTheme: async ({ manifest, previewUrl, summary = {} }) => {
      customTheme = {
        manifest,
        summary: {
          accent: manifest.colors.accent,
          englishName: summary.englishName ?? manifest.name,
          id: "__custom__",
          name: summary.name ?? manifest.name,
          previewUrl,
          ...summary,
        },
      };
      state.themeId = "__custom__";
      await renderTheme();
    },
    showMessage: showToast,
  };
}
