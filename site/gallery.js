import {
  copyWithFeedback,
  escapeHtml,
  getApplyCommand,
  loadCatalog,
  readSavedThemeGroups,
  saveThemeGroups,
  showToast,
} from "./common.js";

const PAGE_SIZE = 6;
const state = {
  appearance: "all",
  catalog: [],
  group: "all",
  groups: readSavedThemeGroups(),
  manifests: new Map(),
  page: 1,
  query: "",
  sort: "featured",
};

const elements = {
  appearance: document.querySelector("#appearance-filter"),
  applyCommand: document.querySelector("#apply-command"),
  applyDialog: document.querySelector("#apply-dialog"),
  applyTitle: document.querySelector("#apply-title"),
  closeDialog: document.querySelector("#close-apply-dialog"),
  copyCommand: document.querySelector("#copy-command"),
  count: document.querySelector("#gallery-count"),
  createGroup: document.querySelector("#create-group"),
  empty: document.querySelector("#gallery-empty"),
  grid: document.querySelector("#gallery-grid"),
  group: document.querySelector("#group-filter"),
  groupDialog: document.querySelector("#group-dialog"),
  groupDialogHint: document.querySelector("#group-dialog-hint"),
  groupDialogTitle: document.querySelector("#group-dialog-title"),
  groupForm: document.querySelector("#group-form"),
  groupName: document.querySelector("#group-name"),
  groupNameOptions: document.querySelector("#group-name-options"),
  pagination: document.querySelector("#pagination"),
  reset: document.querySelector("#reset-filters"),
  search: document.querySelector("#gallery-search"),
  sort: document.querySelector("#sort-filter"),
};

function isLightBackground(theme) {
  const manifest = state.manifests.get(theme.id);
  if (manifest?.appearance) return manifest.appearance === "light";
  const color = manifest?.colors?.background ?? "#000000";
  const match = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!match) return false;
  const [red, green, blue] = match.slice(1).map((part) => Number.parseInt(part, 16));
  return red * .2126 + green * .7152 + blue * .0722 > 160;
}

function getFavoriteIds() {
  return new Set(state.groups.favorites ?? []);
}

function normalizeGroupName(value) {
  const name = String(value ?? "").trim().slice(0, 40);
  return name && !["all", "favorites", "__proto__", "constructor", "prototype"].includes(name)
    ? name
    : null;
}

function updateGroupOptions() {
  const active = state.group;
  const options = [
    ["all", "全部主题"],
    ["favorites", `我的收藏 (${(state.groups.favorites ?? []).length})`],
    ...Object.keys(state.groups).filter((name) => name !== "favorites").map((name) => [name, name]),
  ];
  elements.group.innerHTML = options.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join("");
  elements.group.value = options.some(([value]) => value === active) ? active : "all";
}

function getVisibleThemes() {
  const query = state.query.trim().toLocaleLowerCase("zh-CN");
  const groupIds = state.group === "all" ? null : new Set(state.groups[state.group] ?? []);
  const visible = state.catalog.filter((theme) => {
    const haystack = [theme.name, theme.englishName, theme.description, theme.englishDescription, ...theme.tags].join(" ").toLocaleLowerCase("zh-CN");
    const appearanceMatches = state.appearance === "all" || (state.appearance === "light") === isLightBackground(theme);
    return (!query || haystack.includes(query)) && appearanceMatches && (!groupIds || groupIds.has(theme.id));
  });
  if (state.sort === "name") visible.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  if (state.sort === "accent") visible.sort((a, b) => a.accent.localeCompare(b.accent));
  return visible;
}

function openApplyDialog(theme) {
  elements.applyTitle.textContent = `应用「${theme.name}」`;
  elements.applyCommand.textContent = getApplyCommand(theme.id);
  elements.applyDialog.showModal();
}

function toggleFavorite(themeId) {
  const favorites = getFavoriteIds();
  favorites.has(themeId) ? favorites.delete(themeId) : favorites.add(themeId);
  state.groups.favorites = [...favorites];
  saveThemeGroups(state.groups);
  updateGroupOptions();
  render();
}

function openGroupDialog(themeId = null) {
  const names = Object.keys(state.groups).filter((name) => name !== "favorites");
  elements.groupForm.dataset.themeId = themeId ?? "";
  elements.groupDialogTitle.textContent = themeId ? "加入收藏夹" : "新建收藏夹";
  elements.groupDialogHint.textContent = themeId
    ? "选择已有名称，或输入新名称后保存。"
    : "用收藏夹整理适合不同工作场景的主题。";
  elements.groupNameOptions.innerHTML = names
    .map((name) => `<option value="${escapeHtml(name)}"></option>`)
    .join("");
  elements.groupName.value = themeId && names.length > 0 ? names[0] : "";
  elements.groupName.placeholder = themeId ? "例如：深夜工作" : "例如：我的工作主题";
  elements.groupDialog.showModal();
  queueMicrotask(() => {
    elements.groupName.focus();
    elements.groupName.select();
  });
}

function renderCard(theme) {
  const favorite = getFavoriteIds().has(theme.id);
  return `<article class="gallery-card" data-theme-id="${escapeHtml(theme.id)}">
    <div class="gallery-card-art">
      <img src="${escapeHtml(theme.previewUrl)}" alt="${escapeHtml(theme.name)} Paseo 主题预览" loading="eager" />
      <span>${isLightBackground(theme) ? "浅色适配" : "深色适配"}</span>
      <a class="gallery-card-preview-link" href="../preview/?themeId=${encodeURIComponent(theme.id)}" aria-label="在模拟器中预览${escapeHtml(theme.name)}"></a>
      <button class="favorite-button" type="button" data-action="favorite" aria-label="${favorite ? "取消收藏" : "收藏"}${escapeHtml(theme.name)}" aria-pressed="${favorite}">${favorite ? "★" : "☆"}</button>
    </div>
    <div class="gallery-card-body">
      <div class="gallery-card-title"><h2>${escapeHtml(theme.name)}</h2><small>${escapeHtml(theme.englishName)}</small></div>
      <p>${escapeHtml(theme.description)}</p>
      <div class="theme-tags">${theme.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
      <div class="gallery-card-actions">
        <a href="../preview/?themeId=${encodeURIComponent(theme.id)}">模拟器预览</a>
        <a href="../studio/?theme=${encodeURIComponent(theme.id)}">在 Studio 打开</a>
        <button class="apply-button" type="button" data-action="apply">一条命令换肤</button>
        <button type="button" data-action="group">加入收藏夹</button>
        <a href="${escapeHtml(theme.manifestUrl)}" download>下载清单</a>
      </div>
    </div>
  </article>`;
}

function renderPagination(pageCount) {
  if (pageCount <= 1) {
    elements.pagination.replaceChildren();
    return;
  }
  elements.pagination.innerHTML = Array.from({ length: pageCount }, (_, index) => {
    const page = index + 1;
    return `<button type="button" data-page="${page}" ${page === state.page ? 'aria-current="page"' : ""}>${page}</button>`;
  }).join("");
}

function render() {
  const visible = getVisibleThemes();
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  state.page = Math.min(state.page, pageCount);
  const pageThemes = visible.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);
  elements.grid.innerHTML = pageThemes.map(renderCard).join("");
  elements.empty.hidden = visible.length !== 0;
  elements.count.textContent = `共 ${visible.length} 款主题${state.group !== "all" ? " · 当前收藏夹" : ""}`;
  renderPagination(pageCount);
}

elements.search.addEventListener("input", () => { state.query = elements.search.value; state.page = 1; render(); });
elements.appearance.addEventListener("change", () => { state.appearance = elements.appearance.value; state.page = 1; render(); });
elements.sort.addEventListener("change", () => { state.sort = elements.sort.value; render(); });
elements.group.addEventListener("change", () => { state.group = elements.group.value; state.page = 1; render(); });
elements.pagination.addEventListener("click", (event) => { const button = event.target.closest("[data-page]"); if (button) { state.page = Number(button.dataset.page); render(); scrollTo({ top: elements.grid.offsetTop - 20, behavior: "smooth" }); } });
elements.grid.addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]");
  if (!action) return;
  event.preventDefault();
  const themeId = action.closest("[data-theme-id]")?.dataset.themeId;
  const theme = state.catalog.find((item) => item.id === themeId);
  if (!theme) return;
  if (action.dataset.action === "favorite") toggleFavorite(themeId);
  if (action.dataset.action === "apply") openApplyDialog(theme);
  if (action.dataset.action === "group") openGroupDialog(themeId);
});
elements.reset.addEventListener("click", () => {
  Object.assign(state, { appearance: "all", group: "all", page: 1, query: "", sort: "featured" });
  elements.search.value = ""; elements.appearance.value = "all"; elements.sort.value = "featured"; updateGroupOptions(); render();
});
elements.createGroup.addEventListener("click", () => openGroupDialog());
elements.groupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = normalizeGroupName(elements.groupName.value);
  if (!name) {
    elements.groupName.setCustomValidity("请输入有效的收藏夹名称");
    elements.groupName.reportValidity();
    return;
  }
  elements.groupName.setCustomValidity("");
  const themeId = elements.groupForm.dataset.themeId;
  state.groups[name] ??= [];
  if (themeId) state.groups[name] = [...new Set([...state.groups[name], themeId])];
  saveThemeGroups(state.groups);
  updateGroupOptions();
  render();
  elements.groupDialog.close();
  showToast(themeId ? `已加入「${name}」` : `已创建「${name}」`);
});
document.querySelector("#cancel-group-dialog").addEventListener("click", () => elements.groupDialog.close());
elements.copyCommand.addEventListener("click", () => copyWithFeedback(elements.applyCommand.textContent, "换肤命令已复制"));
elements.closeDialog.addEventListener("click", () => elements.applyDialog.close());
elements.applyDialog.addEventListener("click", (event) => { if (event.target === elements.applyDialog) elements.applyDialog.close(); });
elements.groupDialog.addEventListener("click", (event) => { if (event.target === elements.groupDialog) elements.groupDialog.close(); });

try {
  const catalog = await loadCatalog();
  state.catalog = catalog.themes;
  await Promise.all(state.catalog.map(async (theme) => {
    const response = await fetch(theme.manifestUrl);
    if (response.ok) state.manifests.set(theme.id, await response.json());
  }));
  updateGroupOptions();
  render();
} catch (error) {
  elements.grid.innerHTML = `<p class="empty-state">主题目录加载失败：${escapeHtml(error.message)}</p>`;
  elements.count.textContent = "加载失败";
}
