import { randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { chmod, lstat, mkdir, open, readFile, unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const LOCK_SCHEMA_VERSION = 1;
const MAXIMUM_LOCK_BYTES = 4096;

function defaultStateRoot() {
  return path.join(os.homedir(), ".paseo-skin-loader");
}

async function getProcessStart(processIdentifier) {
  try {
    const { stdout } = await execFileAsync("/bin/ps", [
      "-p",
      String(processIdentifier),
      "-o",
      "lstart=",
    ], { timeout: 2_000 });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

function isProcessPresent(processIdentifier) {
  try {
    process.kill(processIdentifier, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

function validateLockRecord(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    value.schemaVersion !== LOCK_SCHEMA_VERSION ||
    !Number.isInteger(value.pid) ||
    value.pid < 1 ||
    !Number.isInteger(value.port) ||
    value.port < 1024 ||
    value.port > 65535 ||
    typeof value.nonce !== "string" ||
    !/^[0-9a-f]{32}$/.test(value.nonce) ||
    typeof value.themeId !== "string" ||
    typeof value.createdAt !== "string" ||
    !Number.isFinite(Date.parse(value.createdAt)) ||
    (value.processStart !== null && typeof value.processStart !== "string")
  ) {
    throw new Error("Watcher lock has an invalid schema");
  }
  return value;
}

async function ensurePrivateStateRoot(stateRoot) {
  await mkdir(stateRoot, { mode: 0o700, recursive: true });
  const metadata = await lstat(stateRoot);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new Error("Watcher state root must be a real directory");
  }
  if (typeof process.getuid === "function" && metadata.uid !== process.getuid()) {
    throw new Error("Watcher state root must be owned by the current user");
  }
  await chmod(stateRoot, 0o700);
}

async function readRecord(lockPath) {
  const metadata = await lstat(lockPath);
  if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size > MAXIMUM_LOCK_BYTES) {
    throw new Error("Watcher lock must be a small regular file");
  }
  if (typeof process.getuid === "function" && metadata.uid !== process.getuid()) {
    throw new Error("Watcher lock must be owned by the current user");
  }
  return validateLockRecord(JSON.parse(await readFile(lockPath, "utf8")));
}

async function isRecordActive(record) {
  if (!isProcessPresent(record.pid)) return false;
  if (!record.processStart) return true;
  return (await getProcessStart(record.pid)) === record.processStart;
}

export async function readWatcherLock(remoteDebuggingPort, { stateRoot = defaultStateRoot() } = {}) {
  const lockPath = path.join(stateRoot, `watcher-${remoteDebuggingPort}.lock`);
  try {
    const record = await readRecord(lockPath);
    return { active: await isRecordActive(record), lockPath, record };
  } catch (error) {
    if (error.code === "ENOENT") return { active: false, lockPath, record: null };
    return { active: false, error: error.message, lockPath, record: null };
  }
}

export async function acquireWatcherLock(
  { remoteDebuggingPort, themeId },
  { stateRoot = defaultStateRoot() } = {},
) {
  await ensurePrivateStateRoot(stateRoot);
  const lockPath = path.join(stateRoot, `watcher-${remoteDebuggingPort}.lock`);
  const nonce = randomBytes(16).toString("hex");
  const record = {
    schemaVersion: LOCK_SCHEMA_VERSION,
    nonce,
    pid: process.pid,
    processStart: await getProcessStart(process.pid),
    port: remoteDebuggingPort,
    themeId,
    createdAt: new Date().toISOString(),
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let fileHandle;
    try {
      fileHandle = await open(lockPath, "wx", 0o600);
      await fileHandle.writeFile(`${JSON.stringify(record)}\n`);
      await fileHandle.sync();
      await fileHandle.close();
      return {
        lockPath,
        record,
        async release() {
          try {
            const current = await readRecord(lockPath);
            if (current.nonce === nonce && current.pid === process.pid) {
              await unlink(lockPath);
            }
          } catch (error) {
            if (error.code !== "ENOENT") throw error;
          }
        },
      };
    } catch (error) {
      await fileHandle?.close().catch(() => {});
      if (error.code !== "EEXIST") throw error;
      const current = await readRecord(lockPath);
      if (await isRecordActive(current)) {
        throw new Error(
          `A Paseo skin watcher is already active on port ${remoteDebuggingPort} ` +
          `(pid ${current.pid}, theme ${current.themeId})`,
        );
      }
      await unlink(lockPath);
    }
  }
  throw new Error(`Could not acquire the watcher lock for port ${remoteDebuggingPort}`);
}
