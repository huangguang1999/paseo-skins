import {
  getAgentPrompt,
  getInstallCommand,
  SKILL_INSTALL_COMMAND,
} from "./agent-integration.js";

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
  dialogAgentCopy: document.querySelector("#dialog-agent-copy"),
  dialogCredit: document.querySelector("#dialog-credit"),
  dialogDescription: document.querySelector("#dialog-description"),
  dialogPreview: document.querySelector("#dialog-preview"),
  dialogTags: document.querySelector("#dialog-tags"),
  dialogTitle: document.querySelector("#dialog-title"),
  dialogTerminalCopy: document.querySelector("#dialog-terminal-copy"),
  emptyState: document.querySelector("#empty-state"),
  filters: document.querySelector("#theme-filters"),
  grid: document.querySelector("#theme-grid"),
  resultCount: document.querySelector("#result-count"),
  search: document.querySelector("#theme-search"),
  skillInstallCopy: document.querySelector("#skill-install-copy"),
  themeCount: document.querySelector("#theme-count"),
  toast: document.querySelector("#toast"),
};

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

async function copyValue(value, button, successMessage) {
  const originalText = button.textContent;
  try {
    await copyText(value);
    button.textContent = "已复制 ✓";
    showToast(successMessage);
  } catch {
    button.textContent = "复制失败";
    showToast("浏览器未允许访问剪贴板，请从详情中手动复制");
  }
  window.setTimeout(() => { button.textContent = originalText; }, 1800);
}

function copyAgentPrompt(theme, button) {
  return copyValue(
    getAgentPrompt(theme, window.location.href),
    button,
    "Agent 任务已复制，直接粘贴给它即可",
  );
}

function copyTerminalCommand(theme, button) {
  return copyValue(getInstallCommand(theme, window.location.href), button, "终端命令已复制");
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
  elements.dialogCommand.textContent = getInstallCommand(theme, window.location.href);
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
  const englishName = document.createElement("p");
  englishName.className = "theme-english-name";
  englishName.lang = "en";
  englishName.textContent = theme.englishName;
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
  const agentButton = document.createElement("button");
  agentButton.type = "button";
  agentButton.className = "copy-button";
  agentButton.textContent = "复制给 Agent";
  agentButton.addEventListener("click", () => copyAgentPrompt(theme, agentButton));
  const actions = document.createElement("div");
  actions.className = "theme-card-actions";
  const detailLink = document.createElement("a");
  detailLink.className = "detail-link";
  detailLink.href = `./themes/${theme.id}/`;
  detailLink.textContent = "详情";
  detailLink.setAttribute("aria-label", `查看 ${theme.name} 主题详情`);
  actions.append(detailLink, agentButton);
  footer.append(tags, actions);
  content.append(title, englishName, description, credit, footer);
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
    const searchText = [theme.name, theme.englishName, theme.description, theme.englishDescription, ...theme.tags]
      .join(" ")
      .toLocaleLowerCase("zh-CN");
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
elements.dialogAgentCopy.addEventListener("click", () => {
  if (state.dialogTheme) copyAgentPrompt(state.dialogTheme, elements.dialogAgentCopy);
});
elements.dialogTerminalCopy.addEventListener("click", () => {
  if (state.dialogTheme) copyTerminalCommand(state.dialogTheme, elements.dialogTerminalCopy);
});
elements.skillInstallCopy.addEventListener("click", () => {
  copyValue(SKILL_INSTALL_COMMAND, elements.skillInstallCopy, "Skill 接入命令已复制");
});

loadCatalog().catch((error) => {
  elements.grid.textContent = `主题目录加载失败：${error.message}`;
  elements.resultCount.textContent = "加载失败";
});
