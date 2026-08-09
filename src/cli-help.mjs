const COMMAND_HELP = {
  apply: `Apply a public theme after validating its catalog entry and Theme v2 assets.

Usage:
  paseo-skin apply <theme-id> [options]

Options:
  --catalog-url <url>    Override the public catalog URL
  --port <number>        CDP port (default: 9224)
  --json                 Print machine-readable output where supported

Examples:
  paseo-skin list
  paseo-skin apply stage-black-gold
  paseo-skin apply aurora-ridge --port 9225`,
  autostart: `Manage the opt-in macOS login agents that restore the skin after Paseo restarts.

Usage:
  paseo-skin autostart <install|uninstall|status> [options]

Options:
  --theme <manifest>     Restore a local theme
  --theme-url <url>      Restore an HTTPS theme
  --port <number>        CDP port (default: 9224)
  --json                 Print machine-readable status

Examples:
  paseo-skin autostart install --theme ./my-theme.theme.json
  paseo-skin autostart status --json
  paseo-skin autostart uninstall`,
  create: `Create an integrity-verified Theme v2 package from one local image.

Usage:
  paseo-skin create --image <path> --name <text> --output <directory> [options]

Options:
  --id <slug>            Lowercase theme id
  --description <text>   Theme description
  --focus-x <0..1>       Horizontal artwork focus (default: 0.7)
  --focus-y <0..1>       Vertical artwork focus (default: 0.5)
  --force                Replace generated files

Examples:
  paseo-skin create --image ./night.jpg --name "Mountain Night" --id mountain-night --output ./mountain-night`,
  verify: `Verify the skin currently installed in every Paseo renderer.

Usage:
  paseo-skin verify [options]

Options:
  --theme <manifest>     Also require this exact theme id
  --theme-url <url>      Also require this exact remote theme id
  --screenshot <path>    Save a PNG screenshot after verification
  --port <number>        CDP port (default: 9224)
  --json                 Print machine-readable output

Examples:
  paseo-skin verify --screenshot ./paseo.png
  paseo-skin verify --theme ./my-theme.theme.json`,
};

const GLOBAL_HELP = `Paseo Skin Loader

Usage:
  paseo-skin <command> [options]
  paseo-skin <command> --help

Commands:
  start      Launch Paseo when needed, then watch all renderer windows
  inject     Attach the watcher to an already CDP-enabled Paseo instance
  pause      Remove the live skin; alias of reset
  reset      Restore native renderer styles without restarting Paseo
  status     Report Paseo, CDP, renderer, and watcher state
  doctor     Validate runtime, app path, theme assets, and live connection
  verify     Verify active renderer safety and optionally save a screenshot
  list       List themes from the public catalog
  apply      Apply a public theme by id
  inspect    Validate and describe a local or remote theme
  create     Create a Theme v2 package from a local image
  autostart  Manage opt-in macOS login agents

Common options:
  --port <number>        CDP port (default: 9224)
  --app <path>           Paseo executable path
  --theme <manifest>     Local theme manifest path
  --theme-url <url>      HTTPS theme manifest URL
  --json                 Print machine-readable output where supported
  --include-development-targets
                         Include Paseo localhost development renderers

Quick examples:
  paseo-skin list
  paseo-skin apply <theme-id>
  paseo-skin verify --screenshot ./paseo.png

Run 'paseo-skin <command> --help' for command-specific options and examples.`;

export function buildCliHelp(command = null) {
  return COMMAND_HELP[command] ?? GLOBAL_HELP;
}
