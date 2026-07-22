import { THEME_SCHEMA_URL } from "../shared/theme-standard.mjs";

export async function sha256Hex(bytes) {
  const input = bytes instanceof ArrayBuffer
    ? bytes
    : bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", input));
  return [...digest].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export function buildBrowserThemeManifest({
  colors,
  description,
  digest,
  file,
  focusX,
  focusY,
  height,
  identifier,
  name,
  width,
}) {
  return {
    $schema: THEME_SCHEMA_URL,
    schemaVersion: 2,
    id: identifier,
    version: "1.0.0",
    name,
    description,
    image: file.name,
    appearance: "dark",
    art: {
      focusX,
      focusY,
      homeOpacity: 0.92,
      workspaceOpacity: 0.2,
      utilityOpacity: 0.32,
    },
    colors,
    integrity: {
      algorithm: "sha256",
      sha256: digest,
      bytes: file.size,
      width,
      height,
    },
  };
}
