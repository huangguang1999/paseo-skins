export const PUBLIC_THEME_CATALOG_URL =
  "https://huangguang1999.github.io/paseo-skins/catalog.json";

const MAXIMUM_CATALOG_BYTES = 1024 * 1024;
const CATALOG_REQUEST_TIMEOUT_MILLISECONDS = 15_000;

function validateCatalogUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname))) {
    throw new Error("Theme catalog URLs must use HTTPS or loopback HTTP");
  }
  if (url.username || url.password) {
    throw new Error("Theme catalog URLs must not contain credentials");
  }
  url.hash = "";
  return url;
}

function assertText(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Catalog ${fieldName} must be non-empty text`);
  }
  return value.trim();
}

export function validateThemeCatalog(rawCatalog, catalogUrl = PUBLIC_THEME_CATALOG_URL) {
  if (!rawCatalog || typeof rawCatalog !== "object" || Array.isArray(rawCatalog)) {
    throw new Error("Theme catalog must be a JSON object");
  }
  if (rawCatalog.schemaVersion !== 1 || !Array.isArray(rawCatalog.themes)) {
    throw new Error("Unsupported theme catalog schema");
  }
  if (rawCatalog.themes.length < 1 || rawCatalog.themes.length > 500) {
    throw new Error("Theme catalog must contain between 1 and 500 themes");
  }
  const identifiers = new Set();
  const themes = rawCatalog.themes.map((theme, index) => {
    if (!theme || typeof theme !== "object" || Array.isArray(theme)) {
      throw new Error(`Catalog theme ${index} must be an object`);
    }
    const id = assertText(theme.id, `theme ${index} id`);
    if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id) || identifiers.has(id)) {
      throw new Error(`Catalog theme id is invalid or duplicated: ${id}`);
    }
    identifiers.add(id);
    const manifestUrl = new URL(assertText(theme.manifest, `${id} manifest`), catalogUrl);
    const previewUrl = new URL(assertText(theme.preview, `${id} preview`), catalogUrl);
    const catalogOrigin = new URL(catalogUrl).origin;
    if (manifestUrl.origin !== catalogOrigin || previewUrl.origin !== catalogOrigin) {
      throw new Error(`Catalog theme ${id} assets must stay on the catalog origin`);
    }
    return {
      id,
      name: assertText(theme.name, `${id} name`),
      englishName: assertText(theme.englishName, `${id} englishName`),
      description: assertText(theme.description, `${id} description`),
      tags: Array.isArray(theme.tags) ? theme.tags.map((tag) => assertText(tag, `${id} tag`)) : [],
      manifestUrl: manifestUrl.href,
      previewUrl: previewUrl.href,
    };
  });
  return {
    schemaVersion: 1,
    name: assertText(rawCatalog.name, "name"),
    sourceUrl: new URL(catalogUrl).href,
    themes,
  };
}

export async function loadThemeCatalog(
  catalogUrl = PUBLIC_THEME_CATALOG_URL,
  { fetchImplementation = fetch } = {},
) {
  const initialUrl = validateCatalogUrl(catalogUrl);
  let currentUrl = initialUrl;
  let response;
  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    response = await fetchImplementation(currentUrl, {
      redirect: "manual",
      signal: AbortSignal.timeout(CATALOG_REQUEST_TIMEOUT_MILLISECONDS),
    });
    if (response.status < 300 || response.status >= 400) break;
    const location = response.headers.get("location");
    if (!location) throw new Error("Theme catalog redirect has no location");
    if (redirectCount === 3) throw new Error("Theme catalog has too many redirects");
    const redirectedUrl = validateCatalogUrl(new URL(location, currentUrl));
    if (redirectedUrl.origin !== initialUrl.origin) {
      throw new Error(`Theme catalog redirects must remain on ${initialUrl.origin}`);
    }
    currentUrl = redirectedUrl;
  }
  const responseUrl = validateCatalogUrl(response.url || currentUrl);
  if (responseUrl.origin !== initialUrl.origin) {
    throw new Error(`Theme catalog redirects must remain on ${initialUrl.origin}`);
  }
  if (!response.ok) {
    throw new Error(`Theme catalog download failed with HTTP ${response.status}`);
  }
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAXIMUM_CATALOG_BYTES) {
    throw new Error("Theme catalog exceeds the supported size");
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length > MAXIMUM_CATALOG_BYTES) {
    throw new Error("Theme catalog exceeds the supported size");
  }
  let rawCatalog;
  try {
    rawCatalog = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new Error("Theme catalog is not valid UTF-8 JSON");
  }
  return validateThemeCatalog(rawCatalog, responseUrl);
}
