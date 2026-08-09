import { THEME_SCHEMA_URL } from "../shared/theme-standard.mjs";

export async function sha256Hex(bytes) {
  const input = bytes instanceof ArrayBuffer
    ? bytes
    : bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", input));
  return [...digest].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export function quoteShellArgument(value) {
  return `'${String(value).replaceAll("'", `'"'"'`)}'`;
}

export function resolveThemeAppearance(appearance, background) {
  if (appearance === "dark" || appearance === "light") return appearance;
  const match = String(background).match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!match) return "dark";
  const channels = match.slice(1).map((value) => Number.parseInt(value, 16) / 255);
  const luminance = channels.reduce(
    (sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index],
    0,
  );
  return luminance > 0.62 ? "light" : "dark";
}

export function buildBrowserThemeManifest({
  appearance = "dark",
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
    appearance: resolveThemeAppearance(appearance, colors.background),
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
