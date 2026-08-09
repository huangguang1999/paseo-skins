import assert from "node:assert/strict";
import test from "node:test";

import { buildBrowserThemeManifest, quoteShellArgument, sha256Hex } from "../site/theme-builder-core.js";
import { validateThemeManifest } from "../src/theme-loader.mjs";

test("browser builder emits a loader-compatible integrity manifest", async () => {
  const bytes = new TextEncoder().encode("paseo-theme-image");
  const digest = await sha256Hex(bytes);
  const manifest = buildBrowserThemeManifest({
    colors: {
      background: "#050505",
      panel: "rgba(10, 10, 10, 0.93)",
      panelAlt: "rgba(20, 20, 20, 0.78)",
      accent: "#79c9a1",
      glow: "#8bd3af",
      text: "#f7f7f4",
      muted: "#a8b8ae",
      line: "rgba(121, 201, 161, 0.24)",
    },
    appearance: "light",
    description: "Browser generated theme",
    digest,
    file: { name: "my-image.webp", size: bytes.length },
    focusX: 0.7,
    focusY: 0.5,
    height: 1080,
    identifier: "browser-theme",
    name: "Browser Theme",
    width: 1920,
  });

  assert.equal(validateThemeManifest(manifest).id, "browser-theme");
  assert.equal(manifest.appearance, "light");
  assert.equal(manifest.integrity.sha256, digest);
  assert.equal(digest.length, 64);
});

test("browser builder resolves auto appearance from the background color", () => {
  const common = {
    colors: {
      background: "#f6f2e8",
      panel: "rgba(255, 255, 255, 0.93)",
      panelAlt: "rgba(241, 235, 222, 0.78)",
      accent: "#8b6837",
      glow: "#ad8b55",
      text: "#191713",
      muted: "#6f685c",
      line: "rgba(90, 70, 40, 0.24)",
    },
    description: "Light browser theme",
    digest: "a".repeat(64),
    file: { name: "light.png", size: 4 },
    focusX: 0.5,
    focusY: 0.5,
    height: 1,
    identifier: "light-browser-theme",
    name: "Light Browser Theme",
    width: 1,
  };
  assert.equal(buildBrowserThemeManifest({ ...common, appearance: "auto" }).appearance, "light");
});

test("browser builder shell-quotes user-controlled names", () => {
  assert.equal(quoteShellArgument("Mira's night"), `'Mira'"'"'s night'`);
});
