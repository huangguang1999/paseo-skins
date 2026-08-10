import assert from "node:assert/strict";
import test from "node:test";

import {
  buildScreenshotCaptureParameters,
  isPaseoApplicationTarget,
  validateCdpWebSocketUrl,
} from "../src/cdp-client.mjs";

test("screenshot capture stays compatible with high-DPI Node WebSocket limits", () => {
  assert.deepEqual(
    buildScreenshotCaptureParameters({
      deviceScaleFactor: 2,
      screenshotFormat: "jpeg",
      viewport: { pageX: 0, pageY: 0, clientWidth: 1920, clientHeight: 1080 },
    }),
    {
      captureBeyondViewport: false,
      format: "jpeg",
      fromSurface: true,
      quality: 92,
    },
  );
  assert.deepEqual(
    buildScreenshotCaptureParameters({
      deviceScaleFactor: 2,
      screenshotFormat: "png",
      viewport: { pageX: 0, pageY: 0, clientWidth: 1920, clientHeight: 1080 },
    }),
    {
      captureBeyondViewport: false,
      format: "png",
      fromSurface: true,
      clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 0.5 },
    },
  );
});

test("isPaseoApplicationTarget accepts the packaged renderer", () => {
  assert.equal(
    isPaseoApplicationTarget({ type: "page", url: "paseo://app/settings/appearance" }),
    true,
  );
});

test("isPaseoApplicationTarget rejects browser webviews and devtools", () => {
  assert.equal(isPaseoApplicationTarget({ type: "page", url: "https://example.com" }), false);
  assert.equal(
    isPaseoApplicationTarget({ type: "page", url: "devtools://devtools/bundled/inspector.html" }),
    false,
  );
});

test("isPaseoApplicationTarget can include a local development renderer", () => {
  assert.equal(
    isPaseoApplicationTarget(
      { type: "page", url: "http://localhost:8082/settings/appearance" },
      { includeDevelopmentTargets: true },
    ),
    true,
  );
});

test("validateCdpWebSocketUrl accepts only the configured loopback page endpoint", () => {
  assert.equal(
    validateCdpWebSocketUrl(
      { webSocketDebuggerUrl: "ws://127.0.0.1:9224/devtools/page/ABC-123" },
      9224,
    ),
    "ws://127.0.0.1:9224/devtools/page/ABC-123",
  );
  assert.throws(
    () => validateCdpWebSocketUrl(
      { webSocketDebuggerUrl: "ws://192.168.1.4:9224/devtools/page/ABC-123" },
      9224,
    ),
    /outside the expected loopback/,
  );
  assert.throws(
    () => validateCdpWebSocketUrl(
      { webSocketDebuggerUrl: "ws://127.0.0.1:9333/devtools/page/ABC-123" },
      9224,
    ),
    /outside the expected loopback/,
  );
});
