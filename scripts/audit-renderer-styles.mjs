#!/usr/bin/env node

import { auditRendererStyles } from "../src/renderer-style-audit.mjs";

function printHelp() {
  console.log(`Paseo renderer style audit

Usage:
  npm run audit:renderer -- [--port <number>] [--include-development-targets]

The audit safely visits supported Paseo pages, checks visible text contrast,
hover enter/exit behavior, persistent inline backgrounds, and workspace action
scrims, then restores the original route and sidebar scroll position.

Keep the Paseo window visible and foregrounded so native hover events can run.
The command prints JSON and exits non-zero when a check fails.`);
}

function parseArguments(argumentsList) {
  const options = {
    includeDevelopmentTargets: false,
    remoteDebuggingPort: 9224,
  };
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--help" || argument === "-h") {
      return { help: true, ...options };
    }
    if (argument === "--include-development-targets") {
      options.includeDevelopmentTargets = true;
      continue;
    }
    if (argument === "--port") {
      const value = argumentsList[index + 1];
      if (!value) throw new Error("--port requires a value");
      options.remoteDebuggingPort = Number(value);
      index += 1;
      continue;
    }
    throw new Error(`Unknown option: ${argument}`);
  }
  if (
    !Number.isInteger(options.remoteDebuggingPort) ||
    options.remoteDebuggingPort < 1024 ||
    options.remoteDebuggingPort > 65535
  ) {
    throw new Error(`Invalid CDP port: ${options.remoteDebuggingPort}`);
  }
  return options;
}

try {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    printHelp();
  } else {
    const report = await auditRendererStyles(options);
    console.log(JSON.stringify(report, null, 2));
    if (!report.pass) process.exitCode = 1;
  }
} catch (error) {
  console.error(`[paseo-skin] ${error.message}`);
  process.exitCode = 1;
}
