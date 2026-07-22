const INSTALLER_PACKAGE = "github:huangguang1999/paseo-skins";

const state = {
  activeFilter: "全部",
  catalog: null,
  dialogTheme: null,
  query: "",
};

const elements = {
  dialog: document.querySelector("#theme-dialog"),
  dialogClose: document.querySelector("#dialog-close"),
  dialogCommand: document.querySelector("#dialog-command"),
  dialogCopy: document.querySelector("#dialog-copy"),
  dialogCredit: document.querySelector("#dialog-credit"),
  dialogDescription: document.querySelector("#dialog-description"),
  dialogPreview: document.querySelector("#dialog-preview"),
  dialogTags: document.querySelector("#dialog-tags"),
  dialogTitle: document.querySelector("#dialog-title"),
  emptyState: document.querySelector("#empty-state"),
  filters: document.querySelector("#theme-filters"),
  grid: document.querySelector("#theme-grid"),
  resultCount: document.querySelector("#result-count"),
  search: document.querySelector("#theme-search"),
  themeCount: document.querySelector("#theme-count"),
  toast: document.querySelector("#toast"),
};

function getManifestUrl(theme) {
  return new URL(theme.manifest, window.location.href).href;
}

function getInstallCommand(theme) {
  return `npx --yes ${INSTALLER_PACKAGE} start --theme-url '${getManifestUrl(theme)}'`;
}

function createTag(label) {
  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = label;
  return tag;
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Clipboard API is unavailable");
}

let toastTimer;
function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("visible"), 2200);
}

async function copyThemeCommand(theme, button) {
  const originalText = button.textContent;
  try {
    await copyText(getInstallCommand(theme));
    button.textContent = "已复制 ✓";
    showToast("安装命令已复制，去终端粘贴即可");
  } catch {
    button.textContent = "复制失败";
    showToast("浏览器未允许访问剪贴板，请从详情中手动复制");
  }
  window.setTimeout(() => { button.textContent = originalText; }, 1800);
}

function applyThemeVariables(element, theme) {
  element.style.setProperty("--card-accent", theme.accent);
  element.style.setProperty("--card-hue", `${theme.previewHue ?? 0}deg`);
  element.style.setProperty("--card-saturation", theme.previewSaturation ?? 1);
}

function openTheme(theme) {
  state.dialogTheme = theme;
  elements.dialogTitle.textContent = theme.name;
  elements.dialogDescription.textContent = theme.description;
  elements.dialogCredit.href = theme.sourceUrl;
  elements.dialogCredit.textContent = `图片：${theme.author} · ${theme.license} ↗`;
  elements.dialogCommand.textContent = getInstallCommand(theme);
  elements.dialogPreview.style.backgroundImage =
    `linear-gradient(180deg, color-mix(in srgb, ${theme.accent} 10%, transparent), rgba(4,6,8,.32)), url("${new URL(theme.preview, window.location.href).href}")`;
  elements.dialogPreview.style.filter =
    `saturate(${theme.previewSaturation ?? 1}) hue-rotate(${theme.previewHue ?? 0}deg)`;
  elements.dialogTags.replaceChildren(...theme.tags.map(createTag));
  elements.dialog.showModal();
}

function createThemeCard(theme, index) {
  const card = document.createElement("article");
  card.className = "theme-card";
  applyThemeVariables(card, theme);

  const preview = document.createElement("div");
  preview.className = "theme-preview";
  preview.tabIndex = 0;
  preview.setAttribute("role", "button");
  preview.setAttribute("aria-label", `查看 ${theme.name} 详情`);
  const image = document.createElement("img");
  image.src = theme.preview;
  image.alt = `${theme.name} Paseo 皮肤预览`;
  image.loading = index > 2 ? "lazy" : "eager";
  const badge = document.createElement("span");
  badge.className = "theme-badge";
  badge.textContent = "✓ 可直接安装";
  const number = document.createElement("span");
  number.className = "theme-index";
  number.textContent = String(index + 1).padStart(2, "0");
  preview.append(image, badge, number);

  const content = document.createElement("div");
  content.className = "theme-card-content";
  const title = document.createElement("h3");
  title.textContent = theme.name;
  const description = document.createElement("p");
  description.textContent = theme.description;
  const credit = document.createElement("a");
  credit.className = "theme-credit";
  credit.href = theme.sourceUrl;
  credit.target = "_blank";
  credit.rel = "noreferrer";
  credit.textContent = `图片：${theme.author} ↗`;
  credit.addEventListener("click", (event) => event.stopPropagation());
  const footer = document.createElement("div");
  footer.className = "theme-card-footer";
  const tags = document.createElement("div");
  tags.className = "tag-list";
  tags.append(...theme.tags.slice(0, 2).map(createTag));
  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "copy-button";
  copyButton.textContent = "复制安装命令";
  copyButton.addEventListener("click", () => copyThemeCommand(theme, copyButton));
  footer.append(tags, copyButton);
  content.append(title, description, credit, footer);
  card.append(preview, content);

  preview.addEventListener("click", () => openTheme(theme));
  preview.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openTheme(theme);
    }
  });
  return card;
}

function getVisibleThemes() {
  const normalizedQuery = state.query.trim().toLocaleLowerCase("zh-CN");
  return state.catalog.themes.filter((theme) => {
    const matchesFilter = state.activeFilter === "全部" || theme.tags.includes(state.activeFilter);
    const searchText = [theme.name, theme.description, ...theme.tags].join(" ").toLocaleLowerCase("zh-CN");
    return matchesFilter && (!normalizedQuery || searchText.includes(normalizedQuery));
  });
}

function renderThemes() {
  const themes = getVisibleThemes();
  elements.grid.replaceChildren(...themes.map(createThemeCard));
  elements.emptyState.hidden = themes.length > 0;
  elements.resultCount.textContent = `${themes.length} 款主题`;
}

function renderFilters() {
  const filters = ["全部", ...new Set(state.catalog.themes.flatMap((theme) => theme.tags))];
  elements.filters.replaceChildren(...filters.map((filter) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-button";
    button.textContent = filter;
    button.setAttribute("aria-pressed", String(filter === state.activeFilter));
    button.addEventListener("click", () => {
      state.activeFilter = filter;
      renderFilters();
      renderThemes();
    });
    return button;
  }));
}

async function loadCatalog() {
  const response = await fetch("./catalog.json");
  if (!response.ok) throw new Error(`Theme catalog returned HTTP ${response.status}`);
  const catalog = await response.json();
  if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.themes)) {
    throw new Error("Unsupported theme catalog");
  }
  state.catalog = catalog;
  elements.themeCount.textContent = catalog.themes.length;
  renderFilters();
  renderThemes();
}

elements.search.addEventListener("input", () => {
  state.query = elements.search.value;
  renderThemes();
});
elements.dialogClose.addEventListener("click", () => elements.dialog.close());
elements.dialog.addEventListener("click", (event) => {
  if (event.target === elements.dialog) elements.dialog.close();
});
elements.dialogCopy.addEventListener("click", () => {
  if (state.dialogTheme) copyThemeCommand(state.dialogTheme, elements.dialogCopy);
});

loadCatalog().catch((error) => {
  elements.grid.textContent = `主题目录加载失败：${error.message}`;
  elements.resultCount.textContent = "加载失败";
});
