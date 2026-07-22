import { deriveThemeColors, slugifyThemeIdentifier } from "../shared/theme-palette.mjs";
import { buildBrowserThemeManifest, sha256Hex } from "./theme-builder-core.js";

const elements = {
  accent: document.querySelector("#builder-accent"),
  description: document.querySelector("#builder-description"),
  download: document.querySelector("#builder-download"),
  file: document.querySelector("#builder-file"),
  focusX: document.querySelector("#builder-focus-x"),
  focusXValue: document.querySelector("#builder-focus-x-value"),
  focusY: document.querySelector("#builder-focus-y"),
  focusYValue: document.querySelector("#builder-focus-y-value"),
  identifier: document.querySelector("#builder-id"),
  name: document.querySelector("#builder-name"),
  palette: document.querySelector("#builder-palette"),
  preview: document.querySelector("#builder-preview"),
  previewName: document.querySelector("#builder-preview-name"),
  rights: document.querySelector("#builder-rights"),
  status: document.querySelector("#builder-status"),
};

const state = {
  colors: null,
  digest: null,
  file: null,
  height: null,
  objectUrl: null,
  width: null,
};

function updateDownloadState() {
  const identifierValid = /^[a-z0-9][a-z0-9-]{0,63}$/.test(elements.identifier.value);
  elements.download.disabled = !(
    state.file &&
    state.colors &&
    state.digest &&
    elements.name.value.trim() &&
    elements.description.value.trim() &&
    identifierValid &&
    elements.rights.checked
  );
}

function updatePreviewFocus() {
  const focusX = Number(elements.focusX.value);
  const focusY = Number(elements.focusY.value);
  elements.focusXValue.textContent = `${Math.round(focusX * 100)}%`;
  elements.focusYValue.textContent = `${Math.round(focusY * 100)}%`;
  elements.preview.style.backgroundPosition = `${focusX * 100}% ${focusY * 100}%`;
}

function renderPalette(colors) {
  elements.palette.replaceChildren(...[
    ["主色", colors.accent],
    ["光效", colors.glow],
    ["背景", colors.background],
    ["文字", colors.text],
  ].map(([label, color]) => {
    const item = document.createElement("span");
    item.title = `${label} ${color}`;
    item.style.setProperty("--swatch", color);
    item.textContent = label;
    return item;
  }));
}

async function readImage(file) {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 16 * 1024 * 1024) {
    throw new Error("请选择不超过 16 MB 的 PNG、JPEG 或 WebP 图片");
  }
  const bitmap = await createImageBitmap(file);
  try {
    if (
      bitmap.width < 1 ||
      bitmap.height < 1 ||
      bitmap.width > 16384 ||
      bitmap.height > 16384 ||
      bitmap.width * bitmap.height > 50_000_000
    ) {
      throw new Error("图片尺寸超出主题限制");
    }
    const scale = Math.min(1, 96 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const rgb = new Uint8Array((rgba.length / 4) * 3);
    for (let inputOffset = 0, outputOffset = 0; inputOffset < rgba.length; inputOffset += 4) {
      const alpha = rgba[inputOffset + 3] / 255;
      rgb[outputOffset++] = Math.round(rgba[inputOffset] * alpha);
      rgb[outputOffset++] = Math.round(rgba[inputOffset + 1] * alpha);
      rgb[outputOffset++] = Math.round(rgba[inputOffset + 2] * alpha);
    }
    return {
      colors: deriveThemeColors(rgb),
      digest: await sha256Hex(await file.arrayBuffer()),
      height: bitmap.height,
      width: bitmap.width,
    };
  } finally {
    bitmap.close();
  }
}

elements.file.addEventListener("change", async () => {
  const [file] = elements.file.files;
  if (!file) return;
  elements.status.textContent = "正在读取图片并自动取色…";
  elements.download.disabled = true;
  try {
    const result = await readImage(file);
    if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
    state.file = file;
    state.colors = result.colors;
    state.digest = result.digest;
    state.width = result.width;
    state.height = result.height;
    state.objectUrl = URL.createObjectURL(file);
    elements.preview.style.backgroundImage = `linear-gradient(90deg, rgba(4,6,8,.84), rgba(4,6,8,.08)), url("${state.objectUrl}")`;
    elements.preview.style.setProperty("--builder-accent", result.colors.accent);
    elements.accent.value = result.colors.accent;
    if (!elements.name.value.trim()) {
      elements.name.value = file.name.replace(/\.[^.]+$/, "");
    }
    if (!elements.identifier.value.trim()) {
      elements.identifier.value = slugifyThemeIdentifier(elements.name.value) ?? "my-paseo-theme";
    }
    if (!elements.description.value.trim()) {
      elements.description.value = `${elements.name.value.trim()}：由本地图片自动取色生成的 Paseo 深色主题。`;
    }
    elements.previewName.textContent = elements.name.value.trim();
    renderPalette(result.colors);
    elements.status.textContent = `${result.width}×${result.height} · ${(file.size / 1024 / 1024).toFixed(2)} MB · SHA-256 已生成`;
  } catch (error) {
    state.file = null;
    state.colors = null;
    state.digest = null;
    elements.status.textContent = error.message;
  }
  updateDownloadState();
});

elements.name.addEventListener("input", () => {
  elements.previewName.textContent = elements.name.value.trim() || "你的 Paseo 主题";
  updateDownloadState();
});
elements.identifier.addEventListener("input", updateDownloadState);
elements.description.addEventListener("input", updateDownloadState);
elements.rights.addEventListener("change", updateDownloadState);
elements.focusX.addEventListener("input", updatePreviewFocus);
elements.focusY.addEventListener("input", updatePreviewFocus);

elements.download.addEventListener("click", () => {
  const manifest = buildBrowserThemeManifest({
    colors: state.colors,
    description: elements.description.value.trim(),
    digest: state.digest,
    file: state.file,
    focusX: Number(elements.focusX.value),
    focusY: Number(elements.focusY.value),
    height: state.height,
    identifier: elements.identifier.value,
    name: elements.name.value.trim(),
    width: state.width,
  });
  const blob = new Blob([`${JSON.stringify(manifest, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${manifest.id}.theme.json`;
  link.click();
  URL.revokeObjectURL(url);
  elements.status.textContent = `已下载 ${link.download}；把它和原图放在同一目录即可使用。`;
});

updatePreviewFocus();
