import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildRendererStyleAuditReport,
  buildRendererStylePageSnapshotExpression,
  isVisibleThemedHover,
  RENDERER_STYLE_AUDIT_HOVER_PLAN,
  RENDERER_STYLE_AUDIT_PAGE_PLAN,
} from "../src/renderer-style-audit.mjs";

const auditScriptPath = fileURLToPath(new URL("../scripts/audit-renderer-styles.mjs", import.meta.url));

function createCleanPages() {
  return RENDERER_STYLE_AUDIT_PAGE_PLAN.map(({ label }, index) => ({
    auxiliaryLayerIssues: [],
    label,
    lowContrastControls: [],
    path: `/audit-page-${index}`,
    persistentInlineBackgrounds: [],
    skinVersion: 15,
  }));
}

function createCleanHoverChecks() {
  return RENDERER_STYLE_AUDIT_HOVER_PLAN.map(({ label }) => ({
    after: "rgba(0, 0, 0, 0)",
    before: "rgba(0, 0, 0, 0)",
    entered: true,
    exited: true,
    label,
    persistentInlineBackground: false,
    visible: true,
  }));
}

test("renderer style audit covers every supported application surface exactly once", () => {
  const pageLabels = RENDERER_STYLE_AUDIT_PAGE_PLAN.map(({ label }) => label);
  const hoverLabels = RENDERER_STYLE_AUDIT_HOVER_PLAN.map(({ label }) => label);

  assert.equal(pageLabels.length, 21);
  assert.equal(new Set(pageLabels).size, pageLabels.length);
  assert.deepEqual(pageLabels.slice(0, 3), ["settings:通用", "settings:外观", "settings:编辑器"]);
  assert.deepEqual(pageLabels.slice(-3), ["workspace", "history", "schedules"]);
  assert.deepEqual(hoverLabels, [
    "sidebar:new-workspace",
    "sidebar:history",
    "sidebar:schedules",
    "sidebar:workspace-row",
    "settings:navigation",
  ]);
});

test("renderer page snapshot expression is self-contained renderer JavaScript", () => {
  const expression = buildRendererStylePageSnapshotExpression("settings:通用");

  assert.doesNotThrow(() => new Function(`return ${expression}`));
  assert.match(expression, /lowContrastControls/);
  assert.match(expression, /persistentInlineBackgrounds/);
  assert.match(expression, /sidebar-scrim-/);
  assert.match(expression, /4\.5/);
});

test("renderer hover visibility rejects imperceptible and native opaque backgrounds", () => {
  assert.equal(
    isVisibleThemedHover(
      "rgba(0, 0, 0, 0)",
      "color(srgb 0.188235 0.54902 0.792157 / 0.14)",
      true,
    ),
    true,
  );
  assert.equal(
    isVisibleThemedHover(
      "rgba(0, 0, 0, 0)",
      "color(srgb 0.188235 0.54902 0.792157 / 0.04)",
      true,
    ),
    false,
  );
  assert.equal(isVisibleThemedHover("rgba(0, 0, 0, 0)", "rgb(233, 233, 236)", true), false);
  assert.equal(
    isVisibleThemedHover(
      "rgba(0, 0, 0, 0)",
      "color(srgb 0.188235 0.54902 0.792157 / 0.14)",
      false,
    ),
    false,
  );
});

test("renderer style audit report rejects contrast, hover, auxiliary layer, and restoration regressions", () => {
  const pages = createCleanPages();
  pages[0].lowContrastControls.push({ contrast: 1.21, text: "中断" });
  pages[18].auxiliaryLayerIssues.push({ kind: "workspace-scrim", value: "rgb(233, 233, 236)" });
  pages[19].persistentInlineBackgrounds.push({ text: "计划" });
  const hoverChecks = createCleanHoverChecks();
  hoverChecks[0] = {
    ...hoverChecks[0],
    entered: false,
    exited: false,
    persistentInlineBackground: true,
    visible: false,
  };

  const report = buildRendererStyleAuditReport({
    hoverChecks,
    originalPath: "/h/server/workspace/workspace-id",
    originalSidebarScrollTop: 240,
    pages,
    restoredPath: "/settings/general",
    restoredSidebarScrollTop: 0,
  });

  assert.equal(report.pass, false);
  assert.deepEqual(new Set(report.failures.map(({ code }) => code)), new Set([
    "auxiliary-layer",
    "hover-not-entered",
    "hover-not-exited",
    "hover-not-visible",
    "incomplete-restoration",
    "incomplete-scroll-restoration",
    "low-contrast",
    "persistent-hover-background",
  ]));
});

test("renderer style audit report passes complete clean coverage", () => {
  const report = buildRendererStyleAuditReport({
    hoverChecks: createCleanHoverChecks(),
    originalPath: "/h/server/workspace/workspace-id",
    originalSidebarScrollTop: 240,
    pages: createCleanPages(),
    restoredPath: "/h/server/workspace/workspace-id",
    restoredSidebarScrollTop: 240,
  });

  assert.equal(report.pass, true);
  assert.equal(report.pageCount, 21);
  assert.equal(report.hoverCheckCount, 5);
  assert.equal(report.restoredSidebarScrollTop, 240);
  assert.deepEqual(report.failures, []);
});

test("renderer style audit CLI exposes help without connecting to Paseo", () => {
  const help = spawnSync(process.execPath, [auditScriptPath, "--help"], { encoding: "utf8" });
  const invalidPort = spawnSync(process.execPath, [auditScriptPath, "--port", "80"], {
    encoding: "utf8",
  });

  assert.equal(help.status, 0);
  assert.match(help.stdout, /npm run audit:renderer/);
  assert.equal(invalidPort.status, 1);
  assert.match(invalidPort.stderr, /Invalid CDP port/);
});
