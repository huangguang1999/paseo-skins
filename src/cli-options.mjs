import path from "node:path";

import { PUBLIC_THEME_CATALOG_URL } from "./catalog-client.mjs";
import { DEFAULT_PASEO_EXECUTABLE } from "./electron-launcher.mjs";
import { DEFAULT_THEME_MANIFEST_URL } from "./theme-loader.mjs";

export const DEFAULT_REMOTE_DEBUGGING_PORT = 9224;

function createDefaultOptions(command, helpCommand = null) {
  return {
    command,
    helpCommand,
    autostartAction: null,
    catalogUrl: PUBLIC_THEME_CATALOG_URL,
    description: null,
    focusX: 0.7,
    focusY: 0.5,
    force: false,
    includeDevelopmentTargets: false,
    imagePath: null,
    json: false,
    outputDirectory: null,
    paseoExecutable: DEFAULT_PASEO_EXECUTABLE,
    persist: false,
    publicThemeId: null,
    remoteDebuggingPort: DEFAULT_REMOTE_DEBUGGING_PORT,
    screenshotPath: null,
    themeManifest: DEFAULT_THEME_MANIFEST_URL,
    themeId: null,
    themeName: null,
    themeUrl: null,
    themeWasExplicit: false,
  };
}

function optionValue(argumentsList, argumentIndex, optionName) {
  const value = argumentsList[argumentIndex + 1];
  if (value === undefined) throw new Error(`${optionName} requires a value`);
  return value;
}

export function parseArguments(argumentsList) {
  const requestedCommand = argumentsList[0];
  const globalHelp = requestedCommand === undefined || requestedCommand === "--help" || requestedCommand === "-h";
  const commandHelp = !globalHelp && argumentsList.slice(1).some((argument) => argument === "--help" || argument === "-h");
  if (globalHelp || commandHelp) {
    return createDefaultOptions("help", commandHelp ? requestedCommand : null);
  }

  const options = createDefaultOptions(requestedCommand);
  let firstOptionIndex = 1;
  if (requestedCommand === "autostart") {
    const action = argumentsList[1];
    if (!["install", "uninstall", "status"].includes(action)) {
      throw new Error("autostart requires one of: install, uninstall, status");
    }
    options.autostartAction = action;
    firstOptionIndex = 2;
  } else if (requestedCommand === "apply") {
    const themeIdentifier = argumentsList[1];
    if (!themeIdentifier || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(themeIdentifier)) {
      throw new Error("apply requires a valid lowercase theme id");
    }
    options.publicThemeId = themeIdentifier;
    firstOptionIndex = 2;
  }

  for (let argumentIndex = firstOptionIndex; argumentIndex < argumentsList.length; argumentIndex += 1) {
    const argument = argumentsList[argumentIndex];
    if (argument === "--port") {
      options.remoteDebuggingPort = Number(optionValue(argumentsList, argumentIndex, argument));
      argumentIndex += 1;
    } else if (argument === "--app") {
      options.paseoExecutable = optionValue(argumentsList, argumentIndex, argument);
      argumentIndex += 1;
    } else if (argument === "--theme") {
      options.themeManifest = path.resolve(optionValue(argumentsList, argumentIndex, argument));
      options.themeWasExplicit = true;
      argumentIndex += 1;
    } else if (argument === "--theme-url") {
      options.themeUrl = optionValue(argumentsList, argumentIndex, argument);
      options.themeWasExplicit = true;
      argumentIndex += 1;
    } else if (argument === "--screenshot") {
      options.screenshotPath = path.resolve(optionValue(argumentsList, argumentIndex, argument));
      argumentIndex += 1;
    } else if (argument === "--catalog-url") {
      options.catalogUrl = optionValue(argumentsList, argumentIndex, argument);
      argumentIndex += 1;
    } else if (argument === "--image") {
      options.imagePath = path.resolve(optionValue(argumentsList, argumentIndex, argument));
      argumentIndex += 1;
    } else if (argument === "--name") {
      options.themeName = optionValue(argumentsList, argumentIndex, argument);
      argumentIndex += 1;
    } else if (argument === "--id") {
      options.themeId = optionValue(argumentsList, argumentIndex, argument);
      argumentIndex += 1;
    } else if (argument === "--description") {
      options.description = optionValue(argumentsList, argumentIndex, argument);
      argumentIndex += 1;
    } else if (argument === "--output") {
      options.outputDirectory = path.resolve(optionValue(argumentsList, argumentIndex, argument));
      argumentIndex += 1;
    } else if (argument === "--focus-x") {
      options.focusX = Number(optionValue(argumentsList, argumentIndex, argument));
      argumentIndex += 1;
    } else if (argument === "--focus-y") {
      options.focusY = Number(optionValue(argumentsList, argumentIndex, argument));
      argumentIndex += 1;
    } else if (argument === "--force") {
      options.force = true;
    } else if (argument === "--persist") {
      options.persist = true;
    } else if (argument === "--json") {
      options.json = true;
    } else if (argument === "--include-development-targets") {
      options.includeDevelopmentTargets = true;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (
    !Number.isInteger(options.remoteDebuggingPort) ||
    options.remoteDebuggingPort < 1_024 ||
    options.remoteDebuggingPort > 65_535
  ) {
    throw new Error(`Invalid CDP port: ${options.remoteDebuggingPort}`);
  }
  if (typeof options.paseoExecutable !== "string" || options.paseoExecutable.length === 0) {
    throw new Error("Paseo executable path is required");
  }
  if (options.persist && options.command !== "apply") {
    throw new Error("--persist is only supported by apply");
  }
  if (options.command === "create") {
    if (!options.imagePath || !options.themeName || !options.outputDirectory) {
      throw new Error("create requires --image, --name, and --output");
    }
    if (!Number.isFinite(options.focusX) || options.focusX < 0 || options.focusX > 1) {
      throw new Error("focus-x must be between 0 and 1");
    }
    if (!Number.isFinite(options.focusY) || options.focusY < 0 || options.focusY > 1) {
      throw new Error("focus-y must be between 0 and 1");
    }
  }
  return options;
}
