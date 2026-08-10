const catalogUrl = new URL("./catalog.json", import.meta.url);
export const INSTALLER_PACKAGE = "github:huangguang1999/paseo-skins";

let catalogPromise;

export function loadCatalog() {
  catalogPromise ??= fetch(catalogUrl).then(async (response) => {
    if (!response.ok) throw new Error(`主题目录加载失败：HTTP ${response.status}`);
    const catalog = await response.json();
    if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.themes)) {
      throw new Error("主题目录格式不受支持");
    }
    return {
      ...catalog,
      themes: catalog.themes.map((theme) => ({
        ...theme,
        manifestUrl: new URL(theme.manifest, catalogUrl).href,
        packageUrl: new URL(theme.package, catalogUrl).href,
        previewUrl: new URL(theme.preview, catalogUrl).href,
      })),
    };
  });
  return catalogPromise;
}

export function resolveCatalogTheme(catalog, themeIdentifier, { fallbackToFirst = false } = {}) {
  const firstTheme = catalog.themes[0];
  if (!firstTheme) throw new Error("主题目录为空");
  const summary = catalog.themes.find((theme) => theme.id === themeIdentifier);
  if (summary) {
    return { fallbackUsed: false, requestedThemeId: themeIdentifier, summary };
  }
  if (!fallbackToFirst) throw new Error(`未找到主题：${themeIdentifier}`);
  return { fallbackUsed: true, requestedThemeId: themeIdentifier, summary: firstTheme };
}

export async function loadTheme(themeIdentifier, options = {}) {
  const catalog = await loadCatalog();
  const resolution = resolveCatalogTheme(catalog, themeIdentifier, options);
  const { summary } = resolution;
  const response = await fetch(summary.manifestUrl);
  if (!response.ok) throw new Error(`主题清单加载失败：HTTP ${response.status}`);
  return { ...resolution, manifest: await response.json() };
}

export function getApplyCommand(themeIdentifier) {
  return `npx --yes ${INSTALLER_PACKAGE} apply ${themeIdentifier}`;
}

export async function copyText(value) {
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
  if (!copied) throw new Error("浏览器未开放剪贴板权限");
}

let toastTimer;
export function showToast(message) {
  let toast = document.querySelector("#site-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "site-toast";
    toast.className = "site-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.append(toast);
  }
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

export async function copyWithFeedback(value, successMessage = "已复制") {
  try {
    await copyText(value);
    showToast(successMessage);
    return true;
  } catch (error) {
    showToast(error.message);
    return false;
  }
}

export function readSavedThemeGroups() {
  try {
    const value = JSON.parse(localStorage.getItem("paseo-skins-groups") ?? "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value)
      .filter(([name, themeIdentifiers]) =>
        typeof name === "string" &&
        name.length <= 40 &&
        !["__proto__", "constructor", "prototype"].includes(name) &&
        Array.isArray(themeIdentifiers),
      )
      .map(([name, themeIdentifiers]) => [
        name,
        themeIdentifiers.filter((identifier) => /^[a-z0-9][a-z0-9-]{0,63}$/.test(identifier)),
      ]));
  } catch {
    return {};
  }
}

export function saveThemeGroups(groups) {
  localStorage.setItem("paseo-skins-groups", JSON.stringify(groups));
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
