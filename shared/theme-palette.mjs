export const THEME_IDENTIFIER_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function toHex(red, green, blue) {
  return `#${[red, green, blue].map((value) => clampByte(value).toString(16).padStart(2, "0")).join("")}`;
}

function mix(color, target, ratio) {
  return color.map((channel, index) => channel * (1 - ratio) + target[index] * ratio);
}

function relativeLuminance([red, green, blue]) {
  return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
}

function saturation([red, green, blue]) {
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  return maximum === 0 ? 0 : (maximum - minimum) / maximum;
}

export function deriveThemeColors(pixels) {
  if (!(pixels instanceof Uint8Array) || pixels.length < 3 || pixels.length % 3 !== 0) {
    throw new Error("Theme palette requires RGB pixel bytes");
  }
  const buckets = new Map();
  let totalRed = 0;
  let totalGreen = 0;
  let totalBlue = 0;
  let pixelCount = 0;
  for (let offset = 0; offset < pixels.length; offset += 3) {
    const color = [pixels[offset], pixels[offset + 1], pixels[offset + 2]];
    totalRed += color[0];
    totalGreen += color[1];
    totalBlue += color[2];
    pixelCount += 1;
    const key = `${color[0] >> 4}-${color[1] >> 4}-${color[2] >> 4}`;
    const bucket = buckets.get(key) ?? { count: 0, red: 0, green: 0, blue: 0 };
    bucket.count += 1;
    bucket.red += color[0];
    bucket.green += color[1];
    bucket.blue += color[2];
    buckets.set(key, bucket);
  }

  const average = [totalRed / pixelCount, totalGreen / pixelCount, totalBlue / pixelCount];
  let accent = average;
  let bestScore = -1;
  for (const bucket of buckets.values()) {
    const color = [bucket.red / bucket.count, bucket.green / bucket.count, bucket.blue / bucket.count];
    const luminance = relativeLuminance(color);
    const colorSaturation = saturation(color);
    if (luminance < 0.13 || luminance > 0.9 || colorSaturation < 0.12) continue;
    const score = Math.sqrt(bucket.count)
      * Math.pow(0.15 + colorSaturation, 2.4)
      * (0.4 + luminance);
    if (score > bestScore) {
      bestScore = score;
      accent = color;
    }
  }
  if (relativeLuminance(accent) < 0.48) {
    accent = mix(accent, [255, 255, 255], 0.35);
  }
  const background = mix(average, [0, 0, 0], 0.88);
  const panel = mix(average, [0, 0, 0], 0.82);
  const panelAlternative = mix(accent, [0, 0, 0], 0.72);
  const glow = mix(accent, [255, 255, 255], 0.15);
  const muted = mix(accent, [178, 182, 190], 0.62);

  return {
    background: toHex(...background),
    panel: `rgba(${panel.map(clampByte).join(", ")}, 0.93)`,
    panelAlt: `rgba(${panelAlternative.map(clampByte).join(", ")}, 0.78)`,
    accent: toHex(...accent),
    glow: toHex(...glow),
    text: "#f7f7f4",
    muted: toHex(...muted),
    line: `rgba(${accent.map(clampByte).join(", ")}, 0.24)`,
  };
}

export function slugifyThemeIdentifier(value) {
  const identifier = String(value)
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/g, "");
  return THEME_IDENTIFIER_PATTERN.test(identifier) ? identifier : null;
}
