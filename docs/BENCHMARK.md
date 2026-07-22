# GitHub 同类项目基准研究

调研快照：2026-07-22。指标来自 GitHub GraphQL 与各仓库当前默认分支；Star、Issue 和 Release 数会继续变化，因此这里只用于解释工程决策，不作为质量排名。

## 样本矩阵

| 项目 | Star 快照 | 值得借鉴的已验证能力 | 本项目决策 |
|---|---:|---|---|
| [Fei-Away/Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin) | 11,745 | macOS/Windows、图片换肤、菜单栏/托盘切换、恢复与真实预览 | 保留零 patch、原生 UI、路由降噪和恢复边界；Paseo 平台范围不凭空扩成 Windows |
| [b-nnett/codex-plusplus](https://github.com/b-nnett/codex-plusplus) | 3,560 | Manifest、安装/更新/恢复生命周期、安全与贡献文档 | 借鉴版本同步、发布前检查和明确文件边界，不采用修改官方应用文件的 tweak 路线 |
| [HeiGeAi/heige-codex-skin-studio](https://github.com/HeiGeAi/heige-codex-skin-studio) | 310 | 一图一主题、自动取色、主题中心、用户控制持久化、事务/锁、素材来源门禁、58 个测试文件 | 落地 Theme v2、自动取色、watcher 进程锁、素材 provenance 和社区投稿门禁；持久化必须继续保持用户显式控制 |
| [CodeDrobe/skills](https://github.com/CodeDrobe/skills) | 222 | Skill 只负责编排，运行时集中在 Core；真实 DOM 探测、包检查、probe/apply/verify/restore 闭环 | Skill 不复制注入器；新增 list/create/inspect，并继续要求 doctor → apply → verify → reset |
| [JasonSTong/codex-theme-studio](https://github.com/JasonSTong/codex-theme-studio) | 112 | 本地可视化主题编辑、热更新、Schema、安全模型和路线图 | 网站加入纯本地主题工坊；图片不上传，浏览器生成标准清单 |
| [Finderchangchang/codex-autoskin](https://github.com/Finderchangchang/codex-autoskin) | 106 | 自动取色、亮暗路径、macOS LaunchAgent、故障熔断、一句 Agent 指令 | 采用自动取色与 Agent 自描述；不默认安装后台持久化，避免在用户未明确授权时改变系统启动项 |
| [cdredfox/workbuddy-skin-studio](https://github.com/cdredfox/workbuddy-skin-studio) | 64 | App 专用适配、双平台脚本、图片主题与内嵌切换菜单 | 坚持 Paseo 专用 target/renderer 识别，不使用“Electron 通用选择器”猜兼容性 |
| [Wangnov/awesome-codex-skins](https://github.com/Wangnov/awesome-codex-skins) | 29 | `.codexskin` 规范、自动目录、真实截图质量门、投稿流程 | 先把无执行代码的 Theme v2 目录标准做稳；画廊主题必须有独立清单、图片、完整性和来源记录 |
| [xuhuanstudio/codex-styler](https://github.com/xuhuanstudio/codex-styler) | 14 | JSON Schema、data-only 包、视觉编辑器、87 个测试文件、CodeQL、Lighthouse、校验和、SBOM 和构建证明 | 落地公开 JSON Schema、CodeQL、Release checksum/attestation、站点链接检查；保持零运行时依赖，不为桌面编辑器引入 Tauri/Rust |
| [CodeDrobe/desktop](https://github.com/CodeDrobe/desktop) | 26 | 独立主题管理器、deep link、导入包、类型检查和桌面安装包 | 当前网站 + Agent 已覆盖发现与安装；只有出现必须离线管理的真实需求后才增加独立桌面 App |

## 得出的产品原则

1. **主题必须是数据，不是代码。** Paseo Theme v2 只允许 JSON 与同目录 PNG/JPEG/WebP，并记录 SHA-256、字节数和像素尺寸。
2. **一图一主题必须真的简单。** CLI 和网页都能从本地图片自动取色；网页处理不上传图片。
3. **Agent 只编排，CLI 才执行。** Skill 不复制运行时代码，所有安全校验只有一份实现。
4. **真实状态优先于“安装成功”。** `doctor`、`status`、`verify`、截图与 `reset` 构成验收闭环；双 watcher 在运行前被锁阻止。
5. **公开资产必须可追溯。** CI 核对每个视觉文件都恰好有一条作者、来源、许可证和公开发布状态。
6. **Release 必须可验证。** 版本、Changelog、主题完整性、包内容、内部链接、SHA-256 和 GitHub artifact attestation 都进入自动门禁。

## 明确不做的事情

- 不修改 `Paseo.app`、`app.asar`、代码签名、daemon 或 Agent 数据。
- 不把参考项目的 IP 图片、CSS、选择器或实现代码复制进来。
- 不因为其他项目支持 Windows 就宣称 Paseo Windows 兼容；平台支持必须有真实安装与验收证据。
- 不默认安装 LaunchAgent 或强退正在执行任务的 Paseo。持久化和重启属于需要用户明确授权的系统行为。
- 不用同一背景换滤镜冒充多个主题，也不接受来源不明的公开投稿。
