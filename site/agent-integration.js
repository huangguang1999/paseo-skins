export const SKILL_INSTALL_COMMAND =
  "npx skills add huangguang1999/paseo-skins --skill paseo-skins -g";

const INSTALLER_PACKAGE = "github:huangguang1999/paseo-skins";

export function getManifestUrl(theme, pageUrl) {
  return new URL(theme.manifest, pageUrl).href;
}

export function getInstallCommand(theme, pageUrl) {
  return `npx --yes ${INSTALLER_PACKAGE} start --theme-url '${getManifestUrl(theme, pageUrl)}'`;
}

export function getSkillUrl(pageUrl) {
  return new URL("./SKILL.md", pageUrl).href;
}

export function getAgentPrompt(theme, pageUrl) {
  return `请使用 Paseo Skins Agent Skill 为我安装并应用「${theme.name}」。\n\n` +
    `先完整读取并严格遵循：${getSkillUrl(pageUrl)}\n` +
    `主题清单：${getManifestUrl(theme, pageUrl)}\n\n` +
    "要求：先运行 doctor 检查，再安全启动或注入 watcher，最后用 verify 验证；" +
    "不得修改 Paseo.app、app.asar、daemon 或 agent 数据；" +
    "如果 Paseo 正在运行但未启用回环 CDP，不要强退或重启，先告诉我安全的下一步；" +
    "完成后汇报验证结果和一键还原命令。";
}
