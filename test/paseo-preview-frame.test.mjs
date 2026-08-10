import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { renderPaseoPreviewFrame } from "../site/paseo-preview-frame.js";

test("shared Paseo preview matches the current workspace shell", async () => {
  const markup = renderPaseoPreviewFrame();
  assert.match(markup, /paseo-preview-sidebar/);
  assert.match(markup, /paseo-preview-toolbar/);
  assert.match(markup, /新建 workspace/);
  assert.match(markup, /给 Agent 发消息/);
  assert.match(markup, /Paseo Skins⌄/);
  assert.match(markup, /data-icon="history"/);
  assert.match(markup, /data-icon="calendarClock"/);
  assert.match(markup, /paseo-preview-workspace-root/);
  assert.match(markup, /paseo-preview-workspace-tab is-selected/);
  assert.match(markup, /paseo-preview-workspace-tab is-live/);
  assert.match(markup, /demo-workspace/);
  assert.match(markup, /paseo-labs/);
  assert.deepEqual(
    [...markup.matchAll(/paseo-preview-workspace-root[^>]*>.*?<strong>([^<]+)<\/strong>/g)].map((match) => match[1]),
    ["demo-workspace", "paseo-labs", "paseo-skins", "theme-tooling"],
  );
  assert.ok((markup.match(/paseo-preview-workspace-tab/g) ?? []).length >= 10);
  assert.doesNotMatch(markup, />＋ |◷|▣|⌕|◧/);
  assert.doesNotMatch(markup, /今天想完成什么|继续当前任务|Mac|simulator-titlebar/);

  const [gallery, simulator, styles] = await Promise.all([
    readFile(new URL("../site/gallery.js", import.meta.url), "utf8"),
    readFile(new URL("../site/simulator.js", import.meta.url), "utf8"),
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
  ]);
  assert.match(gallery, /renderPaseoPreviewFrame/);
  assert.match(simulator, /renderPaseoPreviewFrame/);
  assert.doesNotMatch(gallery, /community-mini-window|community-mini-app/);
  assert.match(styles, /\.paseo-preview-sidebar\s*\{[^}]*width:\s*23\.2%/s);
  assert.match(styles, /\.paseo-preview-toolbar\s*\{[^}]*height:\s*4\.5%/s);
  assert.match(styles, /\.paseo-preview-workspace-tab\.is-selected\s*\{[^}]*color:\s*var\(--preview-text\)/s);
  assert.match(styles, /\.paseo-preview-workspace-tab\.is-selected\s*>\s*i::after/);
  assert.match(styles, /\.community-card-preview\s*\{[^}]*aspect-ratio:\s*16\/9/s);
});
