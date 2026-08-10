import { deriveThemeColors, slugifyThemeIdentifier } from "../shared/theme-palette.mjs";
import {
  buildBrowserThemeManifest,
  quoteShellArgument,
  resolveThemeAppearance,
  sha256Hex,
} from "./theme-builder-core.js";
import { copyWithFeedback, loadTheme, showToast } from "./common.js";
import { mountSimulator } from "./simulator.js";

const elements = {
  accent: document.querySelector("#builder-accent"),
  appearance: document.querySelector("#builder-appearance"),
  cliCommand: document.querySelector("#builder-cli-command"),
  copyCli: document.querySelector("#builder-copy-cli"),
  copyManifest: document.querySelector("#builder-copy-manifest"),
  css: document.querySelector("#builder-css"),
  cssStatus: document.querySelector("#css-status"),
  description: document.querySelector("#builder-description"),
  download: document.querySelector("#builder-download"),
  downloadCss: document.querySelector("#builder-download-css"),
  exportStatus: document.querySelector("#export-status"),
  file: document.querySelector("#builder-file"),
  focusX: document.querySelector("#builder-focus-x"),
  focusXValue: document.querySelector("#builder-focus-x-value"),
  focusY: document.querySelector("#builder-focus-y"),
  focusYValue: document.querySelector("#builder-focus-y-value"),
  identifier: document.querySelector("#builder-id"),
  manifest: document.querySelector("#builder-manifest"),
  name: document.querySelector("#builder-name"),
  palette: document.querySelector("#builder-palette"),
  redo: document.querySelector("#builder-redo"),
  reset: document.querySelector("#builder-reset"),
  rights: document.querySelector("#builder-rights"),
  status: document.querySelector("#builder-status"),
  undo: document.querySelector("#builder-undo"),
  uploadZone: document.querySelector("#builder-upload-zone"),
  validateCss: document.querySelector("#validate-css"),
};

const state = {
  baseManifest: null,
  colors: null,
  digest: null,
  file: null,
  height: null,
  history: [],
  historyIndex: -1,
  initialSnapshot: null,
  objectUrl: null,
  objectUrls: new Set(),
  previewUrl: null,
  simulator: null,
  width: null,
};

function getSnapshot() {
  return {
    accent: elements.accent.value,
    appearance: elements.appearance.value,
    colors: state.colors ? structuredClone(state.colors) : null,
    css: elements.css.value,
    description: elements.description.value,
    digest: state.digest,
    file: state.file,
    focusX: elements.focusX.value,
    focusY: elements.focusY.value,
    height: state.height,
    identifier: elements.identifier.value,
    name: elements.name.value,
    objectUrl: state.objectUrl,
    rights: elements.rights.checked,
    width: state.width,
  };
}

function setSnapshot(snapshot) {
  elements.accent.value = snapshot.accent;
  elements.appearance.value = snapshot.appearance;
  elements.css.value = snapshot.css;
  elements.description.value = snapshot.description;
  elements.rights.checked = snapshot.rights;
  elements.focusX.value = snapshot.focusX;
  elements.focusY.value = snapshot.focusY;
  elements.identifier.value = snapshot.identifier;
  elements.name.value = snapshot.name;
  state.colors = snapshot.colors ? structuredClone(snapshot.colors) : state.colors;
  state.digest = snapshot.digest;
  state.file = snapshot.file;
  state.height = snapshot.height;
  state.objectUrl = snapshot.objectUrl;
  state.width = snapshot.width;
}

function pushHistory() {
  const snapshot = getSnapshot();
  const current = state.history[state.historyIndex];
  if (current && JSON.stringify(current) === JSON.stringify(snapshot)) return;
  state.history = state.history.slice(0, state.historyIndex + 1);
  state.history.push(snapshot);
  state.historyIndex = state.history.length - 1;
  updateHistoryButtons();
}

function updateHistoryButtons() {
  elements.undo.disabled = state.historyIndex <= 0;
  elements.redo.disabled = state.historyIndex >= state.history.length - 1;
}

function buildCurrentManifest() {
  const colors = { ...(state.colors ?? state.baseManifest.colors), accent: elements.accent.value };
  if (state.file) {
    const manifest = buildBrowserThemeManifest({
      appearance: elements.appearance.value,
      colors,
      description: elements.description.value.trim(),
      digest: state.digest,
      file: state.file,
      focusX: Number(elements.focusX.value),
      focusY: Number(elements.focusY.value),
      height: state.height,
      identifier: elements.identifier.value.trim(),
      name: elements.name.value.trim(),
      width: state.width,
    });
    return manifest;
  }
  return {
    ...structuredClone(state.baseManifest),
    id: elements.identifier.value.trim(),
    name: elements.name.value.trim(),
    description: elements.description.value.trim(),
    appearance: resolveThemeAppearance(elements.appearance.value, colors.background),
    art: {
      ...state.baseManifest.art,
      focusX: Number(elements.focusX.value),
      focusY: Number(elements.focusY.value),
    },
    colors,
  };
}

function isManifestReady() {
  return /^[a-z0-9][a-z0-9-]{0,63}$/.test(elements.identifier.value)
    && Boolean(elements.name.value.trim() && elements.description.value.trim())
    && (!state.file || elements.rights.checked);
}

function renderPalette(colors) {
  elements.palette.innerHTML = [
    ["主色", colors.accent], ["光效", colors.glow], ["背景", colors.background], ["文字", colors.text],
  ].map(([label, color]) => `<div title="${label} ${color}" style="background:${color}">${label}</div>`).join("");
}

async function render() {
  elements.focusXValue.textContent = `${Math.round(Number(elements.focusX.value) * 100)}%`;
  elements.focusYValue.textContent = `${Math.round(Number(elements.focusY.value) * 100)}%`;
  const manifest = buildCurrentManifest();
  elements.manifest.textContent = JSON.stringify(manifest, null, 2);
  const manifestReady = isManifestReady();
  elements.download.disabled = !manifestReady;
  elements.copyManifest.disabled = !manifestReady;
  if (state.file && !elements.rights.checked) {
    elements.exportStatus.textContent = "请先在“设计”页确认图片使用和再分发权，才能导出新主题。";
  } else if (!manifestReady) {
    elements.exportStatus.textContent = "请填写有效的主题 ID、名称和描述。";
  } else {
    elements.exportStatus.textContent = "主题清单已就绪，可以复制或下载。";
  }
  renderPalette(manifest.colors);
  const themeIdentifier = manifest.id || "my-theme";
  elements.cliCommand.textContent = [
    "npx --yes github:huangguang1999/paseo-skins create",
    `--image ${quoteShellArgument(`/absolute/path/${manifest.image}`)}`,
    `--name ${quoteShellArgument(manifest.name || "我的主题")}`,
    `--id ${quoteShellArgument(themeIdentifier)}`,
    `--output ${quoteShellArgument(`./${themeIdentifier}`)}`,
  ].join(" ");
  await state.simulator.setCustomTheme({
    manifest,
    previewUrl: state.objectUrl ?? state.previewUrl,
    summary: { name: manifest.name || "我的主题" },
  });
  await state.simulator.setState({ appearance: elements.appearance.value });
}

async function readImage(file) {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 16 * 1024 * 1024) throw new Error("请选择不超过 16 MB 的 PNG、JPEG 或 WebP 图片");
  const bitmap = await createImageBitmap(file);
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width > 16384 || bitmap.height > 16384 || bitmap.width * bitmap.height > 50_000_000) throw new Error("图片尺寸超出主题限制");
    const scale = Math.min(1, 96 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const rgb = new Uint8Array((rgba.length / 4) * 3);
    for (let input = 0, output = 0; input < rgba.length; input += 4) {
      const alpha = rgba[input + 3] / 255;
      rgb[output++] = Math.round(rgba[input] * alpha);
      rgb[output++] = Math.round(rgba[input + 1] * alpha);
      rgb[output++] = Math.round(rgba[input + 2] * alpha);
    }
    return { colors: deriveThemeColors(rgb), digest: await sha256Hex(await file.arrayBuffer()), height: bitmap.height, width: bitmap.width };
  } finally { bitmap.close(); }
}

async function importFile(file) {
  if (!file) return;
  elements.status.textContent = "正在读取图片、计算 SHA-256 并自动取色…";
  try {
    const result = await readImage(file);
    const objectUrl = URL.createObjectURL(file);
    state.objectUrls.add(objectUrl);
    Object.assign(state, { file, ...result, objectUrl });
    elements.accent.value = result.colors.accent;
    if (!elements.name.value.trim() || elements.name.value === state.baseManifest.name) elements.name.value = file.name.replace(/\.[^.]+$/, "");
    elements.identifier.value = slugifyThemeIdentifier(elements.name.value) ?? "my-paseo-theme";
    elements.description.value = `${elements.name.value}：由本地图片自动取色生成的 Paseo 主题。`;
    elements.rights.checked = false;
    elements.status.textContent = `${result.width}×${result.height} · ${(file.size / 1024 / 1024).toFixed(2)} MB · SHA-256 已生成`;
    pushHistory();
    await render();
  } catch (error) {
    elements.status.textContent = error.message;
  }
}

function downloadBlob(contents, filename, type) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function validateSafeCss() {
  const css = elements.css.value;
  const forbidden = /@import|url\s*\(|javascript:|expression\s*\(|position\s*:\s*fixed|display\s*:\s*none|visibility\s*:\s*hidden|pointer-events\s*:\s*none/i;
  if (css.length > 6000) throw new Error("Safe CSS 不能超过 6000 个字符");
  if (forbidden.test(css)) throw new Error("检测到远程资源、脚本表达式或会隐藏/覆盖界面的规则");
  let balance = 0;
  for (const character of css) { if (character === "{") balance += 1; if (character === "}") balance -= 1; if (balance < 0) break; }
  if (balance !== 0) throw new Error("CSS 大括号不完整");
  const styleSheet = new CSSStyleSheet();
  try {
    styleSheet.replaceSync(css);
  } catch {
    throw new Error("CSS 语法无效");
  }
  const allowedProperties = new Set([
    "background", "background-color", "border-color", "border-radius", "box-shadow",
    "color", "filter", "font-family", "font-size", "font-weight", "letter-spacing", "line-height",
  ]);
  for (const rule of styleSheet.cssRules) {
    if (!(rule instanceof CSSStyleRule)) throw new Error("Safe CSS 不支持 @ 规则");
    if (rule.selectorText.split(",").some((selector) => !selector.trim().startsWith(".paseo-skin-root"))) {
      throw new Error("所有选择器都必须限定在 .paseo-skin-root 内");
    }
    for (const property of rule.style) {
      if (!property.startsWith("--paseo-") && !allowedProperties.has(property)) {
        throw new Error(`属性 ${property} 不在 Safe CSS 白名单中`);
      }
    }
  }
  return true;
}

for (const tab of document.querySelectorAll('[role="tab"]')) {
  tab.addEventListener("click", () => {
    for (const candidate of document.querySelectorAll('[role="tab"]')) {
      const selected = candidate === tab;
      candidate.setAttribute("aria-selected", String(selected));
      document.querySelector(`#${candidate.getAttribute("aria-controls")}`).hidden = !selected;
    }
  });
}

elements.file.addEventListener("change", () => importFile(elements.file.files[0]));
for (const eventName of ["dragenter", "dragover"]) elements.uploadZone.addEventListener(eventName, (event) => { event.preventDefault(); elements.uploadZone.classList.add("is-dragging"); });
for (const eventName of ["dragleave", "drop"]) elements.uploadZone.addEventListener(eventName, (event) => { event.preventDefault(); elements.uploadZone.classList.remove("is-dragging"); });
elements.uploadZone.addEventListener("drop", (event) => importFile(event.dataTransfer.files[0]));
elements.uploadZone.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  elements.file.click();
});

for (const input of [elements.name, elements.identifier, elements.description, elements.appearance, elements.accent, elements.focusX, elements.focusY, elements.rights]) {
  input.addEventListener("input", () => render());
  input.addEventListener("change", () => {
    pushHistory();
    render();
  });
}
elements.css.addEventListener("change", pushHistory);
elements.undo.addEventListener("click", async () => { if (state.historyIndex > 0) { state.historyIndex -= 1; setSnapshot(state.history[state.historyIndex]); updateHistoryButtons(); await render(); } });
elements.redo.addEventListener("click", async () => { if (state.historyIndex < state.history.length - 1) { state.historyIndex += 1; setSnapshot(state.history[state.historyIndex]); updateHistoryButtons(); await render(); } });
elements.reset.addEventListener("click", async () => {
  for (const objectUrl of state.objectUrls) URL.revokeObjectURL(objectUrl);
  state.objectUrls.clear();
  setSnapshot(state.initialSnapshot);
  state.colors = structuredClone(state.baseManifest.colors);
  elements.file.value = "";
  state.history = [getSnapshot()];
  state.historyIndex = 0;
  updateHistoryButtons();
  elements.status.textContent = "已恢复到最初载入的主题。";
  await render();
});
elements.validateCss.addEventListener("click", () => { try { validateSafeCss(); elements.cssStatus.textContent = "验证通过：没有发现被禁止的规则。"; } catch (error) { elements.cssStatus.textContent = `验证失败：${error.message}`; } });
elements.copyManifest.addEventListener("click", () => {
  if (isManifestReady()) copyWithFeedback(elements.manifest.textContent, "theme.json 已复制");
});
elements.copyCli.addEventListener("click", () => copyWithFeedback(elements.cliCommand.textContent, "CLI 命令已复制"));
elements.downloadCss.addEventListener("click", () => { try { validateSafeCss(); downloadBlob(`${elements.css.value}\n`, `${elements.identifier.value || "paseo-theme"}.safe.css`, "text/css"); } catch (error) { elements.cssStatus.textContent = `验证失败：${error.message}`; } });
elements.download.addEventListener("click", () => {
  if (!isManifestReady()) return;
  const manifest = buildCurrentManifest();
  downloadBlob(`${JSON.stringify(manifest, null, 2)}\n`, `${manifest.id}.theme.json`, "application/json");
  elements.status.textContent = `已下载 ${manifest.id}.theme.json${state.file ? "；请与原图放在同一目录。" : "。"}`;
});

const themeIdentifier = new URLSearchParams(location.search).get("theme") ?? "morning-mist";
const loaded = await loadTheme(themeIdentifier, { fallbackToFirst: true });
if (loaded.fallbackUsed) {
  const url = new URL(window.location.href);
  url.searchParams.set("theme", loaded.summary.id);
  history.replaceState(null, "", url);
  showToast(`未找到主题「${themeIdentifier}」，已载入「${loaded.summary.name}」`);
}
state.baseManifest = loaded.manifest;
state.colors = structuredClone(loaded.manifest.colors);
state.previewUrl = loaded.summary.previewUrl;
elements.name.value = loaded.manifest.name;
elements.identifier.value = loaded.manifest.id;
elements.description.value = loaded.manifest.description;
elements.appearance.value = loaded.manifest.appearance ?? "dark";
elements.accent.value = loaded.manifest.colors.accent;
elements.focusX.value = loaded.manifest.art.focusX;
elements.focusY.value = loaded.manifest.art.focusY;
elements.css.value = `.paseo-skin-root {\n  --paseo-accent: ${loaded.manifest.colors.accent};\n}`;
state.simulator = await mountSimulator(document.querySelector("#studio-simulator"), { showShare: false, themeId: loaded.summary.id });
state.initialSnapshot = getSnapshot();
pushHistory();
await render();
