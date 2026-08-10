import { createThemePackageBytes } from "../shared/stored-zip.mjs";

const textDecoder = new TextDecoder("utf-8", { fatal: true });

function basename(url) {
  return decodeURIComponent(new URL(url).pathname.split("/").at(-1));
}

async function sha256(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function fetchBytes(url, label) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${label}下载失败：HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

export async function createVerifiedBrowserThemePackage(theme) {
  const [manifestBytes, imageBytes] = await Promise.all([
    fetchBytes(theme.manifestUrl, "主题清单"),
    fetchBytes(theme.previewUrl, "主题原图"),
  ]);
  let manifest;
  try {
    manifest = JSON.parse(textDecoder.decode(manifestBytes));
  } catch {
    throw new Error("主题清单不是有效的 UTF-8 JSON");
  }
  if (
    manifest.schemaVersion !== 2 ||
    manifest.id !== theme.id ||
    manifest.image !== basename(theme.previewUrl) ||
    manifest.integrity?.bytes !== imageBytes.byteLength ||
    manifest.integrity?.sha256 !== theme.sourceImageSha256
  ) {
    throw new Error("主题清单与目录记录不一致");
  }
  const imageSha256 = await sha256(imageBytes);
  if (imageSha256 !== manifest.integrity.sha256) {
    throw new Error("主题原图 SHA-256 校验失败");
  }
  const archive = createThemePackageBytes({
    identifier: theme.id,
    imageFilename: manifest.image,
    imageBytes,
    manifestFilename: basename(theme.manifestUrl),
    manifestBytes,
    sourceAuthor: theme.author,
    sourceLicense: theme.sourceLicense,
    sourceImageSha256: theme.sourceImageSha256,
    sourcePackageSha256: theme.sourcePackageSha256,
    sourceUrl: theme.sourceUrl,
    sourceVersionId: theme.sourceVersionId,
  });
  return {
    archive,
    filename: basename(new URL(theme.package, theme.manifestUrl)),
  };
}

export async function downloadThemePackage(theme) {
  const { archive, filename } = await createVerifiedBrowserThemePackage(theme);
  const objectUrl = URL.createObjectURL(new Blob([archive], { type: "application/zip" }));
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
  return { bytes: archive.byteLength, filename };
}
