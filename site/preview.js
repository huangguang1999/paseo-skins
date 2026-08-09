import { copyWithFeedback, getApplyCommand, loadTheme, showToast } from "./common.js";
import { mountSimulator } from "./simulator.js";

const parameters = new URLSearchParams(window.location.search);
const initialState = {
  appearance: parameters.get("appearance") ?? "auto",
  page: parameters.get("page") ?? "home",
  sidebar: parameters.get("sidebar") ?? "expanded",
  viewport: parameters.get("viewport") ?? "wide",
};
const themeIdentifier = parameters.get("themeId") ?? parameters.get("theme") ?? "stage-black-gold";
const loadedTheme = await loadTheme(themeIdentifier, { fallbackToFirst: true });
const { manifest, summary } = loadedTheme;
if (loadedTheme.fallbackUsed) {
  const url = new URL(window.location.href);
  url.searchParams.delete("theme");
  url.searchParams.set("themeId", summary.id);
  history.replaceState(null, "", url);
  showToast(`未找到主题「${themeIdentifier}」，已显示「${summary.name}」`);
}

document.title = `${summary.name} 在线预览 — Paseo Skins`;
document.querySelector("#theme-name").textContent = summary.name;
document.querySelector("#theme-english-name").textContent = summary.englishName;
document.querySelector("#theme-description").textContent = summary.description;
document.querySelector("#theme-author").textContent = summary.author;
document.querySelector("#theme-license").textContent = summary.license;
document.querySelector("#open-studio").href = `../studio/?theme=${encodeURIComponent(summary.id)}`;
document.querySelector("#download-manifest").href = summary.manifestUrl;
document.querySelector("#manifest-panel").textContent = JSON.stringify(manifest, null, 2);
document.querySelector("#css-panel").textContent = `:root {\n  --paseo-accent: ${manifest.colors.accent};\n  --paseo-background: ${manifest.colors.background};\n  --paseo-panel: ${manifest.colors.panel};\n  --paseo-panel-alt: ${manifest.colors.panelAlt};\n  --paseo-text: ${manifest.colors.text};\n  --paseo-muted: ${manifest.colors.muted};\n  --paseo-line: ${manifest.colors.line};\n}\n\n/* Safe CSS 只能调整视觉属性，不应隐藏安全或权限界面。 */`;

await mountSimulator(document.querySelector("#preview-simulator"), {
  initialState,
  shareUrl: window.location.href,
  syncUrl: true,
  themeId: summary.id,
  themeLimit: Number.POSITIVE_INFINITY,
});

document.querySelector("#apply-theme").addEventListener("click", () => copyWithFeedback(getApplyCommand(summary.id), "换肤命令已复制"));

const tabs = [...document.querySelectorAll('[role="tab"]')];
for (const tab of tabs) {
  tab.addEventListener("click", () => {
    for (const candidate of tabs) {
      const selected = candidate === tab;
      candidate.setAttribute("aria-selected", String(selected));
      document.querySelector(`#${candidate.getAttribute("aria-controls")}`).hidden = !selected;
    }
  });
}
