import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { loadTheme, validateThemeManifest } from "./theme-loader.mjs";

const MAXIMUM_REMOTE_MANIFEST_BYTES = 64 * 1024;
const MAXIMUM_REMOTE_IMAGE_BYTES = 16 * 1024 * 1024;
const REMOTE_REQUEST_TIMEOUT_MILLISECONDS = 15_000;

function isLoopbackHostname(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export function validateRemoteThemeUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Invalid remote theme URL: ${value}`);
  }
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopbackHostname(url.hostname))) {
    throw new Error("Remote theme URLs must use HTTPS; HTTP is allowed only for loopback development");
  }
  if (url.username || url.password) {
    throw new Error("Remote theme URLs must not contain credentials");
  }
  url.hash = "";
  return url;
}

async function readLimitedResponse(response, label, maximumBytes) {
  if (!response.ok) {
    throw new Error(`${label} download failed with HTTP ${response.status}`);
  }
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new Error(`${label} exceeds the ${maximumBytes}-byte limit`);
  }
  if (!response.body) {
    throw new Error(`${label} response has no body`);
  }

  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of response.body) {
    totalBytes += chunk.byteLength;
    if (totalBytes > maximumBytes) {
      throw new Error(`${label} exceeds the ${maximumBytes}-byte limit`);
    }
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks, totalBytes);
}

async function downloadBytes(url, label, maximumBytes, fetchImplementation) {
  const initialUrl = validateRemoteThemeUrl(url);
  let currentUrl = initialUrl;
  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    const response = await fetchImplementation(currentUrl, {
      redirect: "manual",
      signal: AbortSignal.timeout(REMOTE_REQUEST_TIMEOUT_MILLISECONDS),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error(`${label} redirect has no location`);
      if (redirectCount === 3) throw new Error(`${label} has too many redirects`);
      const redirectedUrl = validateRemoteThemeUrl(new URL(location, currentUrl));
      if (redirectedUrl.origin !== initialUrl.origin) {
        throw new Error(`${label} redirects must remain on ${initialUrl.origin}`);
      }
      currentUrl = redirectedUrl;
      continue;
    }
    const responseUrl = validateRemoteThemeUrl(response.url || currentUrl);
    if (responseUrl.origin !== initialUrl.origin) {
      throw new Error(`${label} redirects must remain on ${initialUrl.origin}`);
    }
    return readLimitedResponse(response, label, maximumBytes);
  }
  throw new Error(`${label} has too many redirects`);
}

function parseRemoteManifest(manifestBytes, manifestUrl) {
  let rawTheme;
  try {
    rawTheme = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(manifestBytes));
  } catch {
    throw new Error(`Remote theme manifest is not valid UTF-8 JSON: ${manifestUrl}`);
  }
  return validateThemeManifest(rawTheme);
}

export async function loadRemoteTheme(
  remoteThemeUrl,
  {
    cacheRoot = path.join(os.homedir(), ".paseo-skin-loader", "themes"),
    fetchImplementation = fetch,
  } = {},
) {
  const manifestUrl = validateRemoteThemeUrl(remoteThemeUrl);
  const manifestBytes = await downloadBytes(
    manifestUrl,
    "Remote theme manifest",
    MAXIMUM_REMOTE_MANIFEST_BYTES,
    fetchImplementation,
  );
  const theme = parseRemoteManifest(manifestBytes, manifestUrl);
  const imageUrl = validateRemoteThemeUrl(new URL(theme.image, manifestUrl));
  if (imageUrl.origin !== manifestUrl.origin || new URL(".", imageUrl).href !== new URL(".", manifestUrl).href) {
    throw new Error("Remote theme image must stay beside its manifest on the same origin");
  }
  const imageBytes = await downloadBytes(
    imageUrl,
    "Remote theme image",
    MAXIMUM_REMOTE_IMAGE_BYTES,
    fetchImplementation,
  );

  await mkdir(cacheRoot, { mode: 0o700, recursive: true });
  const temporaryDirectory = await mkdtemp(path.join(cacheRoot, ".download-"));
  const manifestFileName = `${theme.id}.theme.json`;
  const temporaryManifestPath = path.join(temporaryDirectory, manifestFileName);
  try {
    await Promise.all([
      writeFile(temporaryManifestPath, manifestBytes, { mode: 0o600 }),
      writeFile(path.join(temporaryDirectory, theme.image), imageBytes, { mode: 0o600 }),
    ]);
    await loadTheme(temporaryManifestPath);
    const contentHash = createHash("sha256")
      .update(manifestBytes)
      .update(imageBytes)
      .digest("hex")
      .slice(0, 16);
    const finalDirectory = path.join(cacheRoot, theme.id, theme.version, contentHash);
    await mkdir(path.dirname(finalDirectory), { mode: 0o700, recursive: true });
    try {
      await rename(temporaryDirectory, finalDirectory);
    } catch (error) {
      if (error.code !== "EEXIST" && error.code !== "ENOTEMPTY") {
        throw error;
      }
      await rm(temporaryDirectory, { force: true, recursive: true });
    }
    const loadedTheme = await loadTheme(path.join(finalDirectory, manifestFileName));
    return {
      ...loadedTheme,
      sourceUrl: manifestUrl.href,
      downloadedBytes: manifestBytes.length + imageBytes.length,
    };
  } catch (error) {
    await rm(temporaryDirectory, { force: true, recursive: true });
    throw error;
  }
}
