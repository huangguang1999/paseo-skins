# Contributing

感谢改进 Paseo Skins。提交变更前请遵循以下约束：

1. 不 patch Paseo 安装包、`app.asar`、daemon 或 agent 数据。
2. CDP 必须保持回环地址绑定，并继续校验 target 与 WebSocket URL。
3. 所有注入都必须有幂等 `destroy`，清理 observer、event、timer、style、DOM 和改过的内联样式。
4. 不隐藏、替换或删除 `#root`；视觉层必须 `pointer-events: none`。
5. 新主题图片必须说明来源与使用权，不接受没有可复核原包、作者、许可证和哈希的网络素材。DreamSkin 公共主题只能通过受限适配器导入，并保留原包条款，不得手工改图或重新许可。
6. 改 UI 后在独立临时窗口验收首页与 workspace，避免影响正在使用的主窗口。
7. 画廊主题必须使用 Theme v2，同时提交可校验的 `.theme.json`、同目录图片和 `site/catalog.json` 元数据。
8. Theme v2 的 `integrity` 必须由 `npm run create` 生成或由 `inspect` 验证，不要手写 SHA-256、尺寸和字节数。
9. 每个新增视觉素材都必须在 `ASSET_PROVENANCE.md` 登记作者、来源、许可证、修改情况和分发状态。
10. 主题预览图与实际加载图片必须分别登记；不接受只提供搜索结果页、模糊“网络来源”或无法复核的授权声明。
11. Renderer 的 hover、selected、focus 等瞬态背景必须由 CSS 状态管理，不得固化为内联计算色。
12. 深色或彩色填充控件需要按实际交互祖先背景检查文字节点，对比度不得低于 4.5。
13. Renderer 改动必须同时验证目标页冷注入和 SPA 导航进入，并按 [Renderer 样式安全手册](docs/RENDERER_STYLE_SAFETY.md) 检查 SVG、伪元素及 `pointer-events: none` 辅助层。
14. 第三方主题适配包只允许包含 Theme v2 清单、原背景图和来源说明；上游 CSS、JavaScript、字体或其他可执行内容不得进入发布物。
15. 画廊缩略图、完整模拟器和 Studio 必须复用 `site/paseo-preview-frame.js`，并以当前真实 Paseo 截图校准父级比例与侧栏 Workspace 树；不得自行添加 Mac 标题栏、旧首页任务卡、整行选中背景或其他不存在的界面。
16. 修改 `apply`、Watcher 或 autostart 时，必须覆盖无 Watcher、同主题、Guardian 切换和手动 Watcher 冲突四种所有权状态；成功切换还要真实验证 status、verify、reload 与回退。
17. 网站内容与控件必须使用 `--font-size-*` 字体层级，除 `.paseo-preview-frame` 的微缩界面外不得小于 10px；修改字号后要同时检查三列卡片、完整预览、Studio 和 390px。

本地检查：

```bash
npm install
npm run check
npm run doctor
npm run audit:renderer -- --port 9224
npm run release:check
```

`audit:renderer` 需要 Paseo 窗口可见、位于前台且只有一个 renderer 窗口。它会遍历支持页面并恢复原路径；保存纯 JSON 报告时使用 `npm --silent run audit:renderer -- --port 9224 > /tmp/paseo-renderer-style-audit.json`。

制作本地主题时优先使用：

```bash
npm run create -- \
  --image /absolute/path/to/background.webp \
  --name "Theme name" \
  --id theme-id \
  --output ./generated-theme
```

更新 DreamSkin 适配主题时，把热门榜 API 返回的前 30 条元数据和对应原始 ZIP 保存在仓库外，再运行：

```bash
npm run import:dreamskin-themes -- \
  --metadata /absolute/path/to/metadata.json \
  --packages /absolute/path/to/source-packages
```

导入器要求元数据按下载量降序排列，并逐包核对包体大小、原包 SHA-256、内部文件哈希与图片元数据。它只发布原背景图和新生成的 Theme v2 清单，不发布上游 `theme.css` 或脚本。原始 ZIP 不得提交到仓库；导入后必须运行 `npm run release:check` 并完成桌面端、390 px 和真实下载验收。

公开投稿可以直接使用 GitHub 的 **Theme submission** Issue 模板；代码 Pull Request 请说明改动目标、风险、验证证据和恢复方式。不要顺手重构无关代码。
