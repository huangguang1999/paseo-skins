import { getApplyCommand, loadCatalog, copyWithFeedback, escapeHtml } from "./common.js";
import { mountSimulator } from "./simulator.js";

const catalog = await loadCatalog();
const count = document.querySelector("#theme-count");
if (count) count.textContent = String(catalog.themes.length);

const simulator = document.querySelector("#home-simulator");
if (simulator) {
  mountSimulator(simulator, {
    shareUrl: new URL("./preview/", window.location.href),
    showShare: true,
    themeLimit: 4,
  }).catch((error) => { simulator.textContent = `模拟器加载失败：${error.message}`; });
}

const grid = document.querySelector("#featured-grid");
if (grid) {
  grid.innerHTML = catalog.themes.slice(0, 3).map((theme, index) => `
    <article class="editorial-theme-card" style="--card-accent:${escapeHtml(theme.accent)}">
      <a class="editorial-theme-art" href="./preview/?themeId=${encodeURIComponent(theme.id)}">
        <img src="${escapeHtml(theme.previewUrl)}" alt="${escapeHtml(theme.name)} 主题预览" ${index > 0 ? 'loading="lazy"' : ""} />
        <span>${String(index + 1).padStart(2, "0")}</span>
        <b>在线预览</b>
      </a>
      <div class="editorial-theme-copy">
        <div><p>${escapeHtml(theme.englishName)}</p><h3>${escapeHtml(theme.name)}</h3></div>
        <p>${escapeHtml(theme.description)}</p>
        <div class="card-actions">
          <a href="./preview/?themeId=${encodeURIComponent(theme.id)}">模拟器预览</a>
          <button type="button" data-apply="${escapeHtml(theme.id)}">复制换肤命令</button>
        </div>
      </div>
    </article>`).join("");
  grid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-apply]");
    if (button) copyWithFeedback(getApplyCommand(button.dataset.apply), "换肤命令已复制");
  });
}
