import assert from "node:assert/strict";
import test from "node:test";

import {
  getAgentPrompt,
  getApplyCommand,
  getInstallCommand,
  SKILL_INSTALL_COMMAND,
} from "../site/agent-integration.js";

const theme = {
  id: "morning-mist",
  name: "晨雾山水",
  manifest: "./themes/morning-mist.theme.json",
};
const pageUrl = "https://huangguang1999.github.io/paseo-skins/";

test("agent prompt contains the selected theme, skill, safety boundary, and verification", () => {
  const prompt = getAgentPrompt(theme, pageUrl);

  assert.match(prompt, /晨雾山水/);
  assert.match(prompt, /https:\/\/huangguang1999\.github\.io\/paseo-skins\/SKILL\.md/);
  assert.match(prompt, /themes\/morning-mist\.theme\.json/);
  assert.match(prompt, /doctor/);
  assert.match(prompt, /verify/);
  assert.match(prompt, /不要强退或重启/);
});

test("manual and persistent connection commands target the public project", () => {
  assert.equal(
    getApplyCommand(theme),
    "npx --yes github:huangguang1999/paseo-skins apply morning-mist",
  );
  assert.equal(
    getInstallCommand(theme, pageUrl),
    "npx --yes github:huangguang1999/paseo-skins start --theme-url " +
      "'https://huangguang1999.github.io/paseo-skins/themes/morning-mist.theme.json'",
  );
  assert.equal(
    SKILL_INSTALL_COMMAND,
    "npx skills add huangguang1999/paseo-skins --skill paseo-skins -g",
  );
});
