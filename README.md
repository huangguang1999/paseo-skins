# Paseo Skins

[![CI](https://github.com/huangguang1999/paseo-skins/actions/workflows/ci.yml/badge.svg)](https://github.com/huangguang1999/paseo-skins/actions/workflows/ci.yml)
[![CodeQL](https://github.com/huangguang1999/paseo-skins/actions/workflows/codeql.yml/badge.svg)](https://github.com/huangguang1999/paseo-skins/actions/workflows/codeql.yml)
[![GitHub Pages](https://github.com/huangguang1999/paseo-skins/actions/workflows/pages.yml/badge.svg)](https://huangguang1999.github.io/paseo-skins/)
[![MIT License](https://img.shields.io/badge/license-MIT-d5b36b.svg)](LICENSE)
[![Agent Skill](https://img.shields.io/badge/Agent%20Skill-paseo--skins-79c9a1.svg)](skills/paseo-skins/SKILL.md)

**Open-source Paseo themes and skins, a browser-based theme builder Studio, a live simulator, a standard Agent Skill, and a safe macOS CDP theme loader.** Browse independent backgrounds, preview complete UI states, turn one image into a verified theme, apply it with one CLI command, and restore the native Paseo UI at any time.

一个面向 Paseo 的非官方开源主题皮肤画廊、Agent Skill 与本地加载器。网页负责主题预览、搜索和一键复制 Agent 任务；Skill 负责安全工作流，CLI 负责下载声明式主题，并通过 `127.0.0.1` 上的 Chrome DevTools Protocol（CDP）只向 `paseo://app/` 渲染窗口注入样式。

**[在线浏览 Paseo 主题](https://huangguang1999.github.io/paseo-skins/gallery/)** · **[打开主题 Studio](https://huangguang1999.github.io/paseo-skins/studio/)** · **[使用快捷 CLI](https://huangguang1999.github.io/paseo-skins/download/)** · **[查看主题文档](https://huangguang1999.github.io/paseo-skins/docs/)**

运行时边界、组件职责和按改动类型划分的验证门禁见 [Architecture](ARCHITECTURE.md)。

默认主题是原创「暗夜江湖·黑金」。公开画廊另提供极光、星云、雨夜城市、暖色书房、荒漠落日、水墨、月夜、猫咪暖室、奶油极简、海盐玻璃与霓虹终端等 12 套主题；每套主题分别配置焦点、安全区和颜色。首页完整展示主视觉，进入 workspace 后自动降低背景强度，避免影响代码与对话阅读。

![暗夜江湖黑金预览](docs/images/stage-black-gold-preview.png)

## 特性

- 不 patch Paseo，不覆盖官方文件，Paseo 升级不会删除本仓库。
- CDP 固定绑定回环地址，并校验 WebSocket 仍指向指定端口的 page target。
- watcher 覆盖当前窗口、reload 和后续新窗口；停止时注销 reload hook，同一端口只允许一个 watcher。
- `pause` / `reset` 可恢复根节点、样式、overlay 和动态内联样式。
- Theme v2 提供公开 JSON Schema；加载前校验图片类型、SHA-256、字节数、尺寸和像素数。
- 一张本地 PNG、JPEG 或 WebP 即可自动取色并生成完整性可验证的主题，浏览器端不会上传图片。
- 支持通过 `--theme-url` 安装远程主题；只接受 HTTPS 同目录 JSON 与图片，不执行远程脚本。
- `doctor` 提供只读环境诊断，`verify` 检查根节点可见性、overlay 安全和横向溢出。
- 主题素材逐项记录作者、来源和许可证；Release 同时生成校验和与 GitHub artifact attestation。
- Node.js 原生实现，无运行时第三方依赖。

## 皮肤画廊

| Paseo 主题 | English name | 风格 |
|---|---|---|
| 暗夜江湖·黑金 | Midnight Wuxia Gold | 武侠、黑金、深色 |
| 极光雪境 | Aurora Ridge | 自然、极光、冷色 |
| 深空泡影 | Deep Space Nebula | 太空、蓝紫、科幻 |
| 东京雨幕 | Tokyo Rain | 城市、雨夜、霓虹 |
| 暖灯书页 | Warm Library | 书房、暖色、安静 |
| 赤沙落日 | Desert Sunset | 荒漠、落日、橙色 |
| 水墨晨岚 | Ink Mountain Dawn | 水墨、山景、浅色 |
| 月松静夜 | Moon Pine Night | 月夜、松林、深色 |
| 暖室猫眠 | Cozy Cat Studio | 猫咪、居家、暖色 |
| 奶油纸境 | Cream Paper Garden | 极简、奶油、浅色 |
| 海盐玻璃 | Ocean Glass Tide | 海洋、玻璃、浅色 |
| 霓虹终端 | Neon Terminal Grid | 科技、霓虹、深色 |

本地预览站点：

```bash
npm run site
```

打开 `http://127.0.0.1:4173` 即可浏览和收藏主题、在隔离模拟器中切换首页/任务页/宽窄窗口、从一张本地图片生成 Theme v2，并复制一键换肤命令。站点是纯静态 HTML/CSS/JS，可直接发布到 GitHub Pages；主题目录位于 `site/catalog.json`。

## 一条命令换肤

主题库和模拟器会为每款公开主题生成稳定的快捷命令：

```bash
npx --yes github:huangguang1999/paseo-skins apply aurora-ridge
```

`apply` 从同源公开 catalog 解析主题 ID，下载并验证 Theme v2 清单与图片，然后复用与 `start` 相同的安全 watcher 流程。网页不会直接连接或控制本机 Paseo。

## Agent Skill 接入

网页主题卡默认复制一份完整 Agent 任务，包含标准 Skill URL、主题清单和安全约束。用户也可以全局安装 Skill：

```bash
npx skills add huangguang1999/paseo-skins --skill paseo-skins -g
```

安装后可直接对支持 Agent Skills 的 Codex、Claude Code、Cursor 等工具说“使用 `$paseo-skins` 换成极光雪境”。Skill 源码位于 `skills/paseo-skins/`，网站同时将它发布为 `https://huangguang1999.github.io/paseo-skins/SKILL.md`，供尚未安装 Skill 的 Agent 临时读取。

## 环境要求

- macOS
- `/Applications/Paseo.app`
- Node.js 22 或更高版本

## 快速开始

```bash
cd paseo-skins
npm install
npm run doctor
npm start
```

如果 Paseo 尚未运行，`npm start` 会用官方可执行文件启动它，并只在 `127.0.0.1:9224` 开启 CDP。如果 Paseo 已经运行但没有 CDP，加载器会安全退出，不会替你强制重启或中断 agents；完成或 handoff 当前任务后，正常退出 Paseo再重试。

终端需要保持运行。按 `Ctrl+C` 会停止 watcher 并注销 reload hook，但当前窗口的主题会保留，直到执行 `pause` / `reset` 或关闭窗口。

从画廊安装远程主题时，命令形态如下：

```bash
npx --yes github:huangguang1999/paseo-skins start \
  --theme-url 'https://huangguang1999.github.io/paseo-skins/themes/stage-black-gold.theme.json'
```

## 常用命令

| 命令 | 作用 |
|---|---|
| `npm start` | 必要时启动 Paseo，并持续注入当前及新窗口 |
| `npx --yes github:huangguang1999/paseo-skins apply <theme-id>` | 从公开目录解析主题 ID，校验后持续应用 |
| `npm run inject -- --port 9224` | 连接已经启用 CDP 的 Paseo |
| `npm run status -- --port 9224` | 查看应用、CDP、renderer 和主题状态 |
| `npm run doctor -- --port 9224` | 只读检查环境、主题资源和可选实时连接 |
| `npm run verify -- --port 9224` | 验证根节点、主题生命周期和布局安全 |
| `npm run verify -- --port 9224 --screenshot /tmp/paseo-skin.jpg` | 验证并保存当前 renderer 截图；4K 窗口推荐 JPEG |
| `npm run audit:renderer -- --port 9224` | 开发/发布前巡检 21 类页面、5 类 hover、文字对比度和状态恢复 |
| `npm run list -- --json` | 列出公开目录中的所有 Paseo 主题 |
| `npm run inspect -- --theme /path/to/theme.json` | 不连接 Paseo，校验并说明本地或远程主题 |
| `npm run create -- --image /path/to/image.webp --name "山海夜航" --output ./my-theme` | 从一张图自动取色并生成 Theme v2 |
| `npm run pause -- --port 9224` | 移除当前主题，恢复官方渲染样式 |
| `npm run reset -- --port 9224` | 与 `pause` 相同，用于故障恢复 |
| `npm run autostart:install` | 安装 macOS 登录代理，让皮肤在每次 Paseo 重启后自动恢复 |
| `npm run autostart:status` | 查看开机自启代理是否已加载 |
| `npm run autostart:uninstall` | 移除开机自启代理 |
| `npm run check` | 运行语法检查和全部测试 |
| `npm run release:check` | 执行发布前测试、站点链接、素材权利和包内容审计 |

一键恢复的推荐顺序：

```bash
# 先在 watcher 终端按 Ctrl+C
npm run reset -- --port 9224
```

`reset` 不退出 Paseo，也不重启 daemon。

## 开机自启（可选，macOS）

默认情况下皮肤是运行时注入的：Paseo 一退出，皮肤随渲染进程内存消失；而通过 Dock、Spotlight、自动更新或开机重新打开的 Paseo 不会开启 CDP，皮肤也就无法自动注入回来。如果你希望**每次重启后皮肤自动恢复、无需手动 `npm start`**，安装开机自启代理：

```bash
npm run autostart:install
# 指定主题：
npm run autostart:install -- --theme-url 'https://huangguang1999.github.io/paseo-skins/themes/stage-black-gold.theme.json'
```

它会安装两个只作用于当前用户的 macOS 登录代理（launchd LaunchAgents）：

- `com.paseo-skins.cdp-env`：每次登录时通过 `launchctl setenv` 注入 `PASEO_ELECTRON_FLAGS`，使任何方式启动的 Paseo 都自动开启只绑 `127.0.0.1` 的 CDP。
- `com.paseo-skins.guardian`：keepalive 常驻一个 `inject` watcher，检测到 CDP 就绪后自动注入皮肤，并跟随 Paseo 的后续重启与新窗口。

安装后退出并重新打开一次 Paseo 即可确认。随时可移除：

```bash
npm run autostart:uninstall
```

自启代理不会 patch 或重启 Paseo，也不会重启 daemon；它只在登录时注入环境变量并守护皮肤 watcher。生成的文件位于 `~/Library/LaunchAgents/com.paseo-skins.*.plist` 和 `~/.paseo-skin-loader/guardian.mjs`。

## 自定义主题

最省事的方式是打开[在线主题 Studio](https://huangguang1999.github.io/paseo-skins/studio/)：图片只在浏览器本地处理，不会上传，并可直接在模拟器中调整焦点、外观和颜色。也可以直接用 CLI：

```bash
npm run create -- \
  --image /absolute/path/to/background.webp \
  --name "山海夜航" \
  --id mountain-night \
  --output ./my-theme

npm run inspect -- --theme "$PWD/my-theme/mountain-night.theme.json"
npm start -- --theme "$PWD/my-theme/mountain-night.theme.json"
```

如需切回原黑金主题：

```bash
npm start -- --theme "$PWD/assets/stage-black-gold.theme.json"
```

远程主题可用 `doctor` 先检查：

```bash
npm run doctor -- --theme-url 'https://example.com/themes/my-theme.theme.json'
```

主题格式、字段范围和图片限制见 [Theme v2 格式](docs/THEME_FORMAT.md) 与公开 [JSON Schema](schema/paseo-theme-v2.schema.json)。当前支持 PNG、JPEG、WebP，单图不超过 16 MB、单边不超过 16384 px、总像素不超过 5000 万。建议使用 16:9 横图，并让主体避开左侧导航区域。公开投稿还需在 [ASSET_PROVENANCE.md](ASSET_PROVENANCE.md) 登记作者、来源和许可证。

## 工作原理

```text
PASEO_ELECTRON_FLAGS
        │
        ▼
127.0.0.1:9224 CDP ──► target 过滤与 WebSocket 校验
        │
        ▼
watcher ──► Page.addScriptToEvaluateOnNewDocument
        │
        ├──► 当前 renderer 立即注入
        └──► reload / 新窗口自动注入

Ctrl+C ──► 注销 reload hook
reset  ──► destroy observer + overlay + style + 动态内联样式
```

主要文件：

- `src/cli-options.mjs` / `src/cli-help.mjs`：纯参数解析、无副作用帮助和 CLI 交互契约。
- `src/cli.mjs`：命令编排、诊断、验收和安全启动流程。
- `src/electron-launcher.mjs`：合并 localhost-only Electron flags。
- `src/cdp-client.mjs`：target 过滤、CDP 校验、watcher 生命周期和截图。
- `src/renderer-style-audit.mjs`：Renderer 页面覆盖、文字对比度、hover、辅助层和状态恢复巡检。
- `src/theme-loader.mjs`：主题清单与图片安全校验。
- `src/theme-creator.mjs`：本地图片取色、Theme v2 生成和事务式写入。
- `src/catalog-client.mjs`：公开目录读取与同源 URL 约束。
- `src/watcher-lock.mjs`：单端口 watcher 所有权和陈旧锁恢复。
- `src/remote-theme.mjs`：HTTPS 下载、重定向约束、体积限制和本地缓存。
- `src/stage-black-gold-skin.mjs`：路由感知的视觉层和完整 destroy 生命周期。
- `site/`：静态皮肤商店、主题目录与公开原创资源。
- `assets/`：本地内置主题清单、原创图片和已注明来源的本地壁纸。
- `ARCHITECTURE.md`：系统边界、不可破坏约束和变更验证矩阵。

## 安全边界

CDP 对 renderer 拥有完整控制能力。绑定 `127.0.0.1` 可以避免局域网直接访问，但同一台电脑、同一用户权限下的其他本地进程仍可能连接该端口。只运行可信代码，用完可退出 Paseo；不要将端口转发到公网或局域网。

更多边界和报告方式见 [SECURITY.md](SECURITY.md)。

## 参考与许可证

项目的安全与生命周期设计参考了多个公开 Codex 主题、主题编辑器与 Agent Skill 项目，但没有复制 Paseo、Codex 或第三方主题代码。量化对比、采用项和拒绝项见 [GitHub 同类项目基准](docs/BENCHMARK.md)；素材来源与权利说明见 [ASSET_PROVENANCE.md](ASSET_PROVENANCE.md) 和 [NOTICE.md](NOTICE.md)，Paseo 兼容范围见 [COMPATIBILITY.md](COMPATIBILITY.md)。

代码采用 [MIT License](LICENSE)。品牌与素材声明见 [NOTICE.md](NOTICE.md)。
