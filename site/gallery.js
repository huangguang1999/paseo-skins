import {
  copyWithFeedback,
  escapeHtml,
  getApplyCommand,
  loadCatalog,
  showToast,
} from "./common.js";
import { renderPaseoPreviewFrame } from "./paseo-preview-frame.js";
import { downloadThemePackage } from "./theme-package-browser.js";

const PAGE_SIZE = 6;
const SORTS = new Set(["newest", "popular", "creator"]);
const searchParameters = new URLSearchParams(location.search);
const state = {
  catalog: [],
  manifests: new Map(),
  page: Math.max(1, Number.parseInt(searchParameters.get("page") ?? "1", 10) || 1),
  renderRevision: 0,
  sort: SORTS.has(searchParameters.get("sort")) ? searchParameters.get("sort") : "popular",
};

const elements = {
  applyCommand: document.querySelector("#apply-command"),
  applyDialog: document.querySelector("#apply-dialog"),
  applyTitle: document.querySelector("#apply-title"),
  closeDialog: document.querySelector("#close-apply-dialog"),
  copyCommand: document.querySelector("#copy-command"),
  count: document.querySelector("#community-count"),
  footerCount: document.querySelector("#community-footer-count"),
  grid: document.querySelector("#community-grid"),
  jumpForm: document.querySelector("#community-page-jump"),
  pageInput: document.querySelector("#community-page-input"),
  pagination: document.querySelector("#community-pagination"),
  sortTabs: document.querySelector("#community-sort-tabs"),
  status: document.querySelector("#community-status"),
};

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function sortedThemes() {
  const themes = [...state.catalog];
  if (state.sort === "popular") themes.sort((first, second) => first.popularRank - second.popularRank);
  if (state.sort === "newest") {
    themes.sort((first, second) =>
      Date.parse(second.sourceReviewedAt ?? second.sourceSubmittedAt ?? 0) -
      Date.parse(first.sourceReviewedAt ?? first.sourceSubmittedAt ?? 0),
    );
  }
  if (state.sort === "creator") {
    themes.sort((first, second) => first.author.localeCompare(second.author, "zh-CN") || first.name.localeCompare(second.name, "zh-CN"));
  }
  return themes;
}

function updateLocation() {
  const url = new URL(location.href);
  url.searchParams.set("sort", state.sort);
  url.searchParams.set("page", String(state.page));
  history.replaceState(null, "", url);
}

function openApplyDialog(theme) {
  elements.applyTitle.textContent = `应用「${theme.name}」`;
  elements.applyCommand.textContent = getApplyCommand(theme.id);
  elements.applyDialog.showModal();
}

function renderPaseoPreview(theme, manifest) {
  const colors = manifest?.colors ?? {};
  const background = colors.background ?? "#f4f5f6";
  const panel = colors.panel ?? "rgba(15, 18, 24, .86)";
  const panelAlt = colors.panelAlt ?? panel;
  const text = colors.text ?? "#ffffff";
  const muted = colors.muted ?? "#a5abb2";
  const line = colors.line ?? "rgba(255, 255, 255, .16)";
  const accent = colors.accent ?? theme.accent;
  const focusX = Math.round((manifest?.art?.focusX ?? 0.5) * 100);
  const focusY = Math.round((manifest?.art?.focusY ?? 0.5) * 100);
  return {
    frame: `<div class="paseo-preview-frame community-paseo-frame" data-preview-page="home" style="--preview-background:${escapeHtml(background)};--preview-panel:${escapeHtml(panel)};--preview-panel-alt:${escapeHtml(panelAlt)};--preview-text:${escapeHtml(text)};--preview-muted:${escapeHtml(muted)};--preview-line:${escapeHtml(line)};--preview-accent:${escapeHtml(accent)}">${renderPaseoPreviewFrame()}</div>`,
    objectPosition: `${focusX}% ${focusY}%`,
  };
}

function renderCard(theme) {
  const manifest = state.manifests.get(theme.id);
  const preview = renderPaseoPreview(theme, manifest);
  return `<article class="community-card" data-theme-id="${escapeHtml(theme.id)}">
    <a class="community-card-preview" href="../preview/?themeId=${encodeURIComponent(theme.id)}" aria-label="预览${escapeHtml(theme.name)}">
      <img src="${escapeHtml(theme.previewUrl)}" alt="${escapeHtml(theme.name)} Paseo 主题预览" loading="${theme.popularRank <= PAGE_SIZE ? "eager" : "lazy"}" style="object-position:${preview.objectPosition}" />
      ${preview.frame}
      <span class="community-rank">TOP ${String(theme.popularRank).padStart(2, "0")}</span>
    </a>
    <div class="community-card-copy">
      <div class="community-card-title">
        <div><h3>${escapeHtml(theme.name)}</h3><p>by ${escapeHtml(theme.author)}</p></div>
        <button class="community-download-button" type="button" data-action="download" aria-label="下载${escapeHtml(theme.name)}主题包">下载主题包</button>
      </div>
      <dl>
        <div><dt>版本</dt><dd>v${escapeHtml(theme.version)}</dd></div>
        <div><dt>许可</dt><dd>${escapeHtml(theme.license)}</dd></div>
        <div><dt>大小</dt><dd>${formatBytes(theme.packageBytes ?? theme.imageBytes)}</dd></div>
        <div><dt>原站下载</dt><dd>↓ ${theme.sourceDownloads.toLocaleString("zh-CN")}</dd></div>
      </dl>
      <p class="community-inspiration" title="${escapeHtml(theme.sourceProvenance)}">来源：DreamSkin · ${escapeHtml(theme.author)} · ${escapeHtml(theme.sourceLicense)}</p>
      <div class="community-card-actions">
        <a href="../preview/?themeId=${encodeURIComponent(theme.id)}">完整预览</a>
        <a href="../studio/?theme=${encodeURIComponent(theme.id)}">工作室</a>
        <button type="button" data-action="apply">复制命令</button>
      </div>
    </div>
  </article>`;
}

function renderPagination(pageCount) {
  const visiblePages = new Set([1, pageCount]);
  for (let page = state.page - 2; page <= state.page + 2; page += 1) {
    if (page >= 1 && page <= pageCount) visiblePages.add(page);
  }
  const items = [];
  let previousPage = 0;
  for (const page of [...visiblePages].sort((first, second) => first - second)) {
    if (page - previousPage > 1) {
      items.push('<span class="community-pagination-gap" aria-hidden="true">…</span>');
    }
    items.push(`<button type="button" data-page="${page}" ${page === state.page ? 'aria-current="page"' : ""}>${page}</button>`);
    previousPage = page;
  }
  elements.pagination.innerHTML = items.join("");
  elements.pageInput.max = String(pageCount);
  elements.pageInput.value = String(state.page);
}

async function loadVisibleManifests(themes) {
  await Promise.all(themes.map(async (theme) => {
    if (state.manifests.has(theme.id)) return;
    try {
      const response = await fetch(theme.manifestUrl);
      if (response.ok) state.manifests.set(theme.id, await response.json());
    } catch {
      // The card still has a catalog-level preview when an optional manifest request fails.
    }
  }));
}

async function render() {
  const revision = ++state.renderRevision;
  const themes = sortedThemes();
  const pageCount = Math.max(1, Math.ceil(themes.length / PAGE_SIZE));
  state.page = Math.min(Math.max(1, state.page), pageCount);
  const visibleThemes = themes.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);
  elements.count.textContent = `${themes.length} 款`;
  elements.footerCount.textContent = `${themes.length} 款`;
  elements.grid.setAttribute("aria-busy", "true");
  elements.grid.innerHTML = visibleThemes.map(renderCard).join("");
  elements.status.textContent = `正在加载第 ${state.page} / ${pageCount} 页…`;
  elements.sortTabs.querySelectorAll("[data-sort]").forEach((button) => {
    button.setAttribute("aria-selected", String(button.dataset.sort === state.sort));
  });
  renderPagination(pageCount);
  updateLocation();
  await loadVisibleManifests(visibleThemes);
  if (revision !== state.renderRevision) return;
  elements.grid.innerHTML = visibleThemes.map(renderCard).join("");
  elements.grid.setAttribute("aria-busy", "false");
  elements.status.textContent = `共 ${themes.length} 款可安装主题 · 第 ${state.page} / ${pageCount} 页`;
}

function goToPage(page, { scroll = true } = {}) {
  state.page = page;
  void render();
  if (scroll) document.querySelector("#community-themes").scrollIntoView({ behavior: "smooth" });
}

elements.sortTabs.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-sort]");
  if (!tab) return;
  state.sort = tab.dataset.sort;
  goToPage(1, { scroll: false });
});
elements.pagination.addEventListener("click", (event) => {
  const button = event.target.closest("[data-page]");
  if (button) goToPage(Number(button.dataset.page));
});
elements.jumpForm.addEventListener("submit", (event) => {
  event.preventDefault();
  goToPage(Number(elements.pageInput.value));
});
elements.grid.addEventListener("click", async (event) => {
  const download = event.target.closest("[data-action='download']");
  if (download) {
    const theme = state.catalog.find((item) => item.id === download.closest("[data-theme-id]")?.dataset.themeId);
    if (!theme || download.disabled) return;
    download.disabled = true;
    download.textContent = "校验并打包…";
    try {
      await downloadThemePackage(theme);
      showToast("Paseo 主题包已下载");
    } catch (error) {
      showToast(error.message);
    } finally {
      download.disabled = false;
      download.textContent = "下载主题包";
    }
    return;
  }
  const action = event.target.closest("[data-action='apply']");
  if (!action) return;
  const theme = state.catalog.find((item) => item.id === action.closest("[data-theme-id]")?.dataset.themeId);
  if (theme) openApplyDialog(theme);
});
elements.copyCommand.addEventListener("click", () => copyWithFeedback(elements.applyCommand.textContent, "换肤命令已复制"));
elements.closeDialog.addEventListener("click", () => elements.applyDialog.close());
elements.applyDialog.addEventListener("click", (event) => {
  if (event.target === elements.applyDialog) elements.applyDialog.close();
});

try {
  const catalog = await loadCatalog();
  state.catalog = catalog.themes;
  await render();
} catch (error) {
  elements.grid.innerHTML = `<p class="empty-state">主题目录加载失败：${escapeHtml(error.message)}</p>`;
  elements.status.textContent = "加载失败";
}
