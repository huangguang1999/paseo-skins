import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import test from "node:test";

const repositoryRoot = new URL("../", import.meta.url);
test("local preview serves browser modules with executable MIME types", async (context) => {
  const server = spawn(process.execPath, ["./scripts/serve-site.mjs"], {
    cwd: repositoryRoot,
    env: { ...process.env, PORT: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  context.after(() => server.kill("SIGTERM"));

  const port = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Preview server did not start")), 5_000);
    server.once("error", reject);
    server.stdout.on("data", (chunk) => {
      const match = chunk.toString().match(/site ready at http:\/\/127\.0\.0\.1:(\d+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(Number(match[1]));
      }
    });
  });

  const [moduleResponse, faviconResponse, sitemapResponse] = await Promise.all([
    fetch(`http://127.0.0.1:${port}/shared/theme-palette.mjs`),
    fetch(`http://127.0.0.1:${port}/favicon.svg`),
    fetch(`http://127.0.0.1:${port}/sitemap.xml`),
  ]);
  assert.match(moduleResponse.headers.get("content-type"), /^text\/javascript/);
  assert.equal(faviconResponse.headers.get("content-type"), "image/svg+xml");
  assert.match(sitemapResponse.headers.get("content-type"), /^application\/xml/);
});
