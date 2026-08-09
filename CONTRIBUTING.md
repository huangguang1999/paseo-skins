# Contributing

感谢改进 Paseo Skins。提交变更前请遵循以下约束：

1. 不 patch Paseo 安装包、`app.asar`、daemon 或 agent 数据。
2. CDP 必须保持回环地址绑定，并继续校验 target 与 WebSocket URL。
3. 所有注入都必须有幂等 `destroy`，清理 observer、event、timer、style、DOM 和改过的内联样式。
4. 不隐藏、替换或删除 `#root`；视觉层必须 `pointer-events: none`。
5. 新主题图片必须说明来源与使用权，不接受直接搬运影视、游戏或其他主题站素材。
6. 改 UI 后在独立临时窗口验收首页与 workspace，避免影响正在使用的主窗口。
7. 画廊主题必须使用 Theme v2，同时提交可校验的 `.theme.json`、同目录图片和 `site/catalog.json` 元数据。
8. Theme v2 的 `integrity` 必须由 `npm run create` 生成或由 `inspect` 验证，不要手写 SHA-256、尺寸和字节数。
9. 每个新增视觉素材都必须在 `ASSET_PROVENANCE.md` 登记作者、来源、许可证、修改情况和分发状态。
10. 主题预览图与实际加载图片必须分别登记；不接受只提供搜索结果页、模糊“网络来源”或无法复核的授权声明。
11. Renderer 的 hover、selected、focus 等瞬态背景必须由 CSS 状态管理，不得固化为内联计算色。
12. 深色或彩色填充控件需要按实际交互祖先背景检查文字节点，对比度不得低于 4.5。
13. Renderer 改动必须同时验证目标页冷注入和 SPA 导航进入，并按 [Renderer 样式安全手册](docs/RENDERER_STYLE_SAFETY.md) 检查 SVG、伪元素及 `pointer-events: none` 辅助层。

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

公开投稿可以直接使用 GitHub 的 **Theme submission** Issue 模板；代码 Pull Request 请说明改动目标、风险、验证证据和恢复方式。不要顺手重构无关代码。
