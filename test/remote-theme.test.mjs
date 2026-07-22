import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { loadRemoteTheme, validateRemoteThemeUrl } from "../src/remote-theme.mjs";

const sourceThemeDirectory = new URL("../assets/", import.meta.url);

test("validateRemoteThemeUrl requires HTTPS except on loopback", () => {
  assert.equal(
    validateRemoteThemeUrl("https://themes.example.com/night.theme.json").protocol,
    "https:",
  );
  assert.equal(
    validateRemoteThemeUrl("http://127.0.0.1:4173/night.theme.json").protocol,
    "http:",
  );
  assert.throws(
    () => validateRemoteThemeUrl("http://themes.example.com/night.theme.json"),
    /must use HTTPS/,
  );
});

test("loadRemoteTheme rejects a redirect that downgrades to public HTTP", async () => {
  let requestCount = 0;
  const fetchImplementation = async () => {
    requestCount += 1;
    return new Response(null, {
      status: 302,
      headers: { location: "http://themes.example.com/unsafe.theme.json" },
    });
  };

  await assert.rejects(
    () => loadRemoteTheme("https://themes.example.com/safe.theme.json", { fetchImplementation }),
    /must use HTTPS/,
  );
  assert.equal(requestCount, 1);
});

test("loadRemoteTheme downloads, validates, and caches a theme", async (context) => {
  const cacheRoot = await mkdtemp(path.join(os.tmpdir(), "paseo-skin-cache-"));
  context.after(() => rm(cacheRoot, { force: true, recursive: true }));
  const [manifestBytes, imageBytes] = await Promise.all([
    readFile(new URL("stage-black-gold.theme.json", sourceThemeDirectory)),
    readFile(new URL("stage-black-gold-wuxia-hero-v1.png", sourceThemeDirectory)),
  ]);
  const server = createServer((request, response) => {
    if (request.url === "/themes/stage-black-gold.theme.json") {
      response.setHeader("content-type", "application/json");
      response.end(manifestBytes);
      return;
    }
    if (request.url === "/themes/stage-black-gold-wuxia-hero-v1.png") {
      response.setHeader("content-type", "image/png");
      response.end(imageBytes);
      return;
    }
    response.writeHead(404).end();
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address();

  const loadedTheme = await loadRemoteTheme(
    `http://127.0.0.1:${address.port}/themes/stage-black-gold.theme.json`,
    { cacheRoot },
  );

  assert.equal(loadedTheme.theme.id, "stage-black-gold");
  assert.equal(loadedTheme.image.mediaType, "image/png");
  assert.match(loadedTheme.manifestPath, /stage-black-gold\/1\.0\.0\/[a-f0-9]{16}/);
  assert.match(loadedTheme.sourceUrl, /^http:\/\/127\.0\.0\.1:/);
});
