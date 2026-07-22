import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { acquireWatcherLock, readWatcherLock } from "../src/watcher-lock.mjs";

test("watcher lock prevents competing processes and releases cleanly", async (context) => {
  const stateRoot = await mkdtemp(path.join(os.tmpdir(), "paseo-watcher-lock-"));
  context.after(() => rm(stateRoot, { force: true, recursive: true }));
  const lock = await acquireWatcherLock(
    { remoteDebuggingPort: 19224, themeId: "aurora-ridge" },
    { stateRoot },
  );
  const status = await readWatcherLock(19224, { stateRoot });
  assert.equal(status.active, true);
  assert.equal(status.record.themeId, "aurora-ridge");
  await assert.rejects(
    () => acquireWatcherLock(
      { remoteDebuggingPort: 19224, themeId: "tokyo-rain" },
      { stateRoot },
    ),
    /already active/,
  );
  await lock.release();
  assert.equal((await readWatcherLock(19224, { stateRoot })).active, false);
});

test("watcher lock replaces a stale owner", async (context) => {
  const stateRoot = await mkdtemp(path.join(os.tmpdir(), "paseo-watcher-stale-"));
  context.after(() => rm(stateRoot, { force: true, recursive: true }));
  await writeFile(path.join(stateRoot, "watcher-19225.lock"), JSON.stringify({
    schemaVersion: 1,
    nonce: "0".repeat(32),
    pid: 999999,
    processStart: null,
    port: 19225,
    themeId: "stale-theme",
    createdAt: new Date(0).toISOString(),
  }), { mode: 0o600 });
  const lock = await acquireWatcherLock(
    { remoteDebuggingPort: 19225, themeId: "fresh-theme" },
    { stateRoot },
  );
  assert.equal(lock.record.themeId, "fresh-theme");
  await lock.release();
});
