import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("public site typography uses the shared readable scale", async () => {
  const styles = await readFile(new URL("../site/styles.css", import.meta.url), "utf8");
  assert.match(styles, /--font-size-micro:\s*10px/);
  assert.match(styles, /--font-size-caption:\s*11px/);
  assert.match(styles, /--font-size-interface:\s*12px/);
  assert.match(styles, /--font-size-control:\s*13px/);
  assert.match(styles, /--font-size-body:\s*14px/);
  assert.match(styles, /\.community-card-copy dl div[^\n]+font:\s*var\(--font-size-caption\)/);
  assert.match(styles, /\.community-inspiration[^\n]+font-size:\s*var\(--font-size-caption\)/);
  assert.match(styles, /\.community-card-actions a[^\n]+font-size:\s*var\(--font-size-caption\)/);
  assert.match(styles, /\.hero h1 \{ font-size:\s*clamp\(52px,15\.5vw,68px\); \}/);
  assert.match(styles, /\.section-heading h2 \{ font-size:\s*38px; \}/);
  assert.match(styles, /\.page-hero h1 \{ font-size:\s*clamp\(42px,11\.5vw,52px\); line-height:\s*\.94; \}/);
  assert.match(styles, /\.studio-heading h1 \{ font-size:\s*36px; line-height:\s*1\.08; \}/);
  assert.match(styles, /\.cli-grid > \* \{ min-width:\s*0; \}/);
  assert.match(styles, /\.cli-primary h2 \{ font-size:\s*32px; \}/);

  const undersizedRules = styles.split("\n").filter((line) => {
    if (line.includes(".paseo-preview-")) return false;
    const declarations = [...line.matchAll(/(?:font-size|font)\s*:\s*([^;}]+)/g)];
    return declarations.some(([, value]) => {
      const pixelSize = value.match(/(?:^|\s)(\d+(?:\.\d+)?)px(?:\s|\/|$)/)?.[1];
      return pixelSize && Number(pixelSize) > 0 && Number(pixelSize) < 10;
    });
  });
  assert.deepEqual(undersizedRules, []);
});
