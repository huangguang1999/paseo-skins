import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const DEFAULT_POLL_INTERVAL_MILLISECONDS = 1_000;
const DEFAULT_CDP_STARTUP_TIMEOUT_MILLISECONDS = 20_000;
const LOOPBACK_HOSTNAMES = new Set(["127.0.0.1", "localhost", "[::1]"]);

async function fetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
  if (!response.ok) {
    throw new Error(`CDP request failed with HTTP ${response.status}: ${url}`);
  }
  return response.json();
}

export function isPaseoApplicationTarget(target, { includeDevelopmentTargets = false } = {}) {
  if (target?.type !== "page" || typeof target.url !== "string") {
    return false;
  }
  if (target.url.startsWith("paseo://app/")) {
    return true;
  }
  return (
    includeDevelopmentTargets &&
    /^http:\/\/(localhost|127\.0\.0\.1):80(8[1-9]|9\d)\//.test(target.url)
  );
}

export async function getCdpVersion(remoteDebuggingPort) {
  return fetchJson(`http://127.0.0.1:${remoteDebuggingPort}/json/version`);
}

export async function isCdpAvailable(remoteDebuggingPort) {
  try {
    const version = await getCdpVersion(remoteDebuggingPort);
    return typeof version.webSocketDebuggerUrl === "string";
  } catch {
    return false;
  }
}

export async function waitForCdp(
  remoteDebuggingPort,
  { timeoutMilliseconds = DEFAULT_CDP_STARTUP_TIMEOUT_MILLISECONDS } = {},
) {
  const deadline = Date.now() + timeoutMilliseconds;
  while (Date.now() < deadline) {
    if (await isCdpAvailable(remoteDebuggingPort)) {
      return;
    }
    await delay(250);
  }
  throw new Error(`Paseo CDP did not become ready on 127.0.0.1:${remoteDebuggingPort}`);
}

export async function listCdpTargets(remoteDebuggingPort) {
  const targets = await fetchJson(`http://127.0.0.1:${remoteDebuggingPort}/json/list`);
  return Array.isArray(targets) ? targets : [];
}

export function validateCdpWebSocketUrl(target, remoteDebuggingPort) {
  if (typeof target?.webSocketDebuggerUrl !== "string") {
    throw new Error("CDP target is missing its WebSocket debugger URL");
  }
  const debuggerUrl = new URL(target.webSocketDebuggerUrl);
  if (
    debuggerUrl.protocol !== "ws:" ||
    !LOOPBACK_HOSTNAMES.has(debuggerUrl.hostname) ||
    Number(debuggerUrl.port) !== remoteDebuggingPort ||
    debuggerUrl.username ||
    debuggerUrl.password ||
    debuggerUrl.search ||
    debuggerUrl.hash ||
    !/^\/devtools\/page\/[A-Za-z0-9._-]{1,200}$/.test(debuggerUrl.pathname)
  ) {
    throw new Error("Rejected a CDP WebSocket URL outside the expected loopback page endpoint");
  }
  return debuggerUrl.href;
}

export async function evaluatePaseoTargets(
  remoteDebuggingPort,
  expression,
  { includeDevelopmentTargets = false } = {},
) {
  const targets = (await listCdpTargets(remoteDebuggingPort)).filter((target) =>
    isPaseoApplicationTarget(target, { includeDevelopmentTargets }),
  );
  const evaluations = [];

  for (const target of targets) {
    if (typeof target.webSocketDebuggerUrl !== "string") {
      continue;
    }
    const connection = new CdpConnection(
      validateCdpWebSocketUrl(target, remoteDebuggingPort),
    );
    try {
      await connection.connect();
      await connection.send("Runtime.enable");
      const evaluation = await connection.send("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true,
      });
      if (evaluation?.exceptionDetails) {
        throw new Error(
          `Paseo evaluation failed: ${evaluation.exceptionDetails.text ?? "unknown exception"}`,
        );
      }
      evaluations.push({
        targetUrl: target.url,
        value: evaluation?.result?.value,
      });
    } finally {
      connection.close();
    }
  }
  return evaluations;
}

export async function capturePaseoScreenshot(
  remoteDebuggingPort,
  outputPath,
  { includeDevelopmentTargets = false, targetUrl = null } = {},
) {
  const resolvedOutputPath = path.resolve(outputPath);
  const fileExtension = path.extname(resolvedOutputPath).toLowerCase();
  const screenshotFormat = fileExtension === ".jpg" || fileExtension === ".jpeg"
    ? "jpeg"
    : "png";
  const target = (await listCdpTargets(remoteDebuggingPort)).find((candidate) =>
    isPaseoApplicationTarget(candidate, { includeDevelopmentTargets }) &&
    (!targetUrl || candidate.url === targetUrl),
  );
  if (!target) {
    throw new Error("No Paseo renderer target was found for the screenshot");
  }

  const connection = new CdpConnection(
    validateCdpWebSocketUrl(target, remoteDebuggingPort),
  );
  try {
    await connection.connect();
    await connection.send("Page.enable");
    const screenshot = await connection.send("Page.captureScreenshot", {
      captureBeyondViewport: false,
      format: screenshotFormat,
      fromSurface: screenshotFormat === "jpeg" ? false : true,
      ...(screenshotFormat === "jpeg" ? { quality: 92 } : {}),
    });
    await mkdir(path.dirname(resolvedOutputPath), { recursive: true });
    await writeFile(resolvedOutputPath, Buffer.from(screenshot.data, "base64"));
    return { outputPath: resolvedOutputPath, targetUrl: target.url };
  } finally {
    connection.close();
  }
}

class CdpConnection {
  constructor(webSocketDebuggerUrl) {
    this.webSocketDebuggerUrl = webSocketDebuggerUrl;
    this.webSocket = null;
    this.nextMessageIdentifier = 0;
    this.pendingMessages = new Map();
  }

  async connect() {
    if (typeof WebSocket !== "function") {
      throw new Error("Node.js 22 or newer is required because WebSocket is unavailable");
    }

    await new Promise((resolve, reject) => {
      const webSocket = new WebSocket(this.webSocketDebuggerUrl);
      this.webSocket = webSocket;

      const timeoutIdentifier = setTimeout(() => {
        webSocket.close();
        reject(new Error(`Timed out connecting to ${this.webSocketDebuggerUrl}`));
      }, 5_000);

      webSocket.addEventListener(
        "open",
        () => {
          clearTimeout(timeoutIdentifier);
          resolve();
        },
        { once: true },
      );
      webSocket.addEventListener(
        "error",
        () => {
          clearTimeout(timeoutIdentifier);
          reject(new Error(`Failed to connect to ${this.webSocketDebuggerUrl}`));
        },
        { once: true },
      );
      webSocket.addEventListener("message", (event) => this.handleMessage(event));
      webSocket.addEventListener("close", () => this.rejectPendingMessages());
    });
  }

  isOpen() {
    return this.webSocket?.readyState === WebSocket.OPEN;
  }

  async handleMessage(event) {
    const text =
      typeof event.data === "string"
        ? event.data
        : Buffer.from(await event.data.arrayBuffer()).toString("utf8");
    const message = JSON.parse(text);
    if (typeof message.id !== "number") {
      return;
    }

    const pendingMessage = this.pendingMessages.get(message.id);
    if (!pendingMessage) {
      return;
    }
    this.pendingMessages.delete(message.id);

    if (message.error) {
      pendingMessage.reject(
        new Error(`${pendingMessage.method} failed: ${message.error.message ?? "unknown error"}`),
      );
      return;
    }
    pendingMessage.resolve(message.result);
  }

  rejectPendingMessages() {
    for (const pendingMessage of this.pendingMessages.values()) {
      pendingMessage.reject(new Error("CDP connection closed"));
    }
    this.pendingMessages.clear();
  }

  send(method, parameters = {}) {
    if (!this.isOpen()) {
      return Promise.reject(new Error("CDP connection is not open"));
    }

    const messageIdentifier = ++this.nextMessageIdentifier;
    return new Promise((resolve, reject) => {
      this.pendingMessages.set(messageIdentifier, { method, resolve, reject });
      this.webSocket.send(JSON.stringify({ id: messageIdentifier, method, params: parameters }));
    });
  }

  close() {
    this.webSocket?.close();
    this.rejectPendingMessages();
  }
}

export class PaseoSkinWatcher {
  constructor({
    remoteDebuggingPort,
    injectionSource,
    includeDevelopmentTargets = false,
    pollIntervalMilliseconds = DEFAULT_POLL_INTERVAL_MILLISECONDS,
    onStatus = () => {},
    skinName = "skin",
  }) {
    this.remoteDebuggingPort = remoteDebuggingPort;
    this.injectionSource = injectionSource;
    this.includeDevelopmentTargets = includeDevelopmentTargets;
    this.pollIntervalMilliseconds = pollIntervalMilliseconds;
    this.onStatus = onStatus;
    this.skinName = skinName;
    this.connections = new Map();
  }

  async injectTarget(target) {
    const connection = new CdpConnection(
      validateCdpWebSocketUrl(target, this.remoteDebuggingPort),
    );
    let earlyScriptIdentifier = null;
    await connection.connect();
    try {
      await connection.send("Page.enable");
      await connection.send("Runtime.enable");
      const registration = await connection.send("Page.addScriptToEvaluateOnNewDocument", {
        source: this.injectionSource,
      });
      earlyScriptIdentifier = registration.identifier ?? null;
      const evaluation = await connection.send("Runtime.evaluate", {
        expression: this.injectionSource,
        awaitPromise: true,
        returnByValue: true,
      });
      if (evaluation?.exceptionDetails) {
        throw new Error(
          `Skin injection failed: ${evaluation.exceptionDetails.text ?? "unknown exception"}`,
        );
      }
    } catch (error) {
      if (earlyScriptIdentifier && connection.isOpen()) {
        await connection
          .send("Page.removeScriptToEvaluateOnNewDocument", {
            identifier: earlyScriptIdentifier,
          })
          .catch(() => {});
      }
      connection.close();
      throw error;
    }
    this.connections.set(target.id, { connection, earlyScriptIdentifier });
    this.onStatus(`Injected ${this.skinName} into ${target.url}`);
  }

  async closeTarget(targetIdentifier) {
    const record = this.connections.get(targetIdentifier);
    if (!record) {
      return;
    }
    this.connections.delete(targetIdentifier);
    if (record.earlyScriptIdentifier && record.connection.isOpen()) {
      try {
        await record.connection.send("Page.removeScriptToEvaluateOnNewDocument", {
          identifier: record.earlyScriptIdentifier,
        });
      } catch (error) {
        this.onStatus(`Could not unregister the reload hook: ${error.message}`);
      }
    }
    record.connection.close();
  }

  async synchronize() {
    const targets = (await listCdpTargets(this.remoteDebuggingPort)).filter((target) =>
      isPaseoApplicationTarget(target, {
        includeDevelopmentTargets: this.includeDevelopmentTargets,
      }),
    );
    const currentTargetIdentifiers = new Set(targets.map((target) => target.id));

    for (const [targetIdentifier, record] of this.connections) {
      if (!currentTargetIdentifiers.has(targetIdentifier) || !record.connection.isOpen()) {
        await this.closeTarget(targetIdentifier);
      }
    }

    for (const target of targets) {
      if (this.connections.has(target.id) || typeof target.webSocketDebuggerUrl !== "string") {
        continue;
      }
      try {
        await this.injectTarget(target);
      } catch (error) {
        this.onStatus(`Injection retry scheduled for ${target.url}: ${error.message}`);
      }
    }
  }

  async run(abortSignal) {
    try {
      while (!abortSignal.aborted) {
        try {
          await this.synchronize();
        } catch (error) {
          this.onStatus(`Waiting for Paseo CDP: ${error.message}`);
        }
        try {
          await delay(this.pollIntervalMilliseconds, undefined, { signal: abortSignal });
        } catch (error) {
          if (error.name !== "AbortError") {
            throw error;
          }
        }
      }
    } finally {
      await Promise.all([...this.connections.keys()].map((targetIdentifier) =>
        this.closeTarget(targetIdentifier)));
    }
  }
}
