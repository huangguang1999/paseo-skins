import { execFile, spawn } from "node:child_process";
import { access, constants as fileSystemConstants } from "node:fs/promises";
import { promisify } from "node:util";

const executeFile = promisify(execFile);

export const DEFAULT_PASEO_EXECUTABLE = "/Applications/Paseo.app/Contents/MacOS/Paseo";

export function mergeElectronFlags(existingFlags, remoteDebuggingPort) {
  const tokens = String(existingFlags ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter(
      (token) =>
        !token.startsWith("--remote-debugging-address=") &&
        !token.startsWith("--remote-debugging-port="),
    );

  tokens.push("--remote-debugging-address=127.0.0.1");
  tokens.push(`--remote-debugging-port=${remoteDebuggingPort}`);
  return tokens.join(" ");
}

export function buildPaseoLaunchEnvironment(environment, remoteDebuggingPort) {
  return {
    ...environment,
    PASEO_ELECTRON_FLAGS: mergeElectronFlags(environment.PASEO_ELECTRON_FLAGS, remoteDebuggingPort),
  };
}

export async function isPaseoApplicationRunning({
  paseoExecutable = DEFAULT_PASEO_EXECUTABLE,
  executeFileImplementation = executeFile,
} = {}) {
  const { stdout } = await executeFileImplementation("/bin/ps", ["-axo", "command="]);
  return stdout
    .split("\n")
    .map((command) => command.trim())
    .some((command) => command === paseoExecutable || command.startsWith(`${paseoExecutable} `));
}

export async function launchPaseoWithCdp({
  remoteDebuggingPort,
  paseoExecutable = DEFAULT_PASEO_EXECUTABLE,
  environment = process.env,
  spawnImplementation = spawn,
} = {}) {
  await access(paseoExecutable, fileSystemConstants.X_OK);

  const childProcess = spawnImplementation(paseoExecutable, [], {
    detached: true,
    env: buildPaseoLaunchEnvironment(environment, remoteDebuggingPort),
    stdio: "ignore",
  });
  childProcess.unref();
  return childProcess.pid;
}
