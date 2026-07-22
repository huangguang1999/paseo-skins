# Contributing

感谢改进 Paseo Skins。提交变更前请遵循以下约束：

1. 不 patch Paseo 安装包、`app.asar`、daemon 或 agent 数据。
2. CDP 必须保持回环地址绑定，并继续校验 target 与 WebSocket URL。
3. 所有注入都必须有幂等 `destroy`，清理 observer、event、timer、style、DOM 和改过的内联样式。
4. 不隐藏、替换或删除 `#root`；视觉层必须 `pointer-events: none`。
5. 新主题图片必须说明来源与使用权，不接受直接搬运影视、游戏或其他主题站素材。
6. 改 UI 后在独立临时窗口验收首页与 workspace，避免影响正在使用的主窗口。
7. 画廊主题必须同时提交可校验的 `.theme.json`、同目录图片和 `site/catalog.json` 元数据。

本地检查：

```bash
npm install
npm run check
npm run doctor
```

Pull Request 请说明改动目标、风险、验证证据和恢复方式。不要顺手重构无关代码。
