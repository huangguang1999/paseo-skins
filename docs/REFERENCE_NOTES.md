# 参考说明

本项目在 2026-07-21 至 2026-07-22 对公开项目做了结构、安全、分发和主题生态审阅：

- [Fei-Away/Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin)：MIT；参考其 CDP 零 patch、主题清单、`doctor` / `verify` / restore、路由降噪和素材声明思路。
- [b-nnett/codex-plusplus](https://github.com/b-nnett/codex-plusplus)：MIT；参考其 manifest、可停止生命周期、权限/安全文档和测试约束。
- [BigPizzaV3/CodexPlusPlus](https://github.com/BigPizzaV3/CodexPlusPlus)：AGPL-3.0；只用于比较仓库结构和发布规范，没有复制其代码，也没有采用其修改 `app.asar` 的实现路线。

第二轮横向对比覆盖 HeiGe Skin Studio、CodeDrobe、Codex AutoSkin、Codex Theme Studio、Awesome Codex Skins、Codex Styler 和 WorkBuddy Skin Studio。完整证据矩阵、采纳与拒绝理由见 [GitHub 同类项目基准研究](BENCHMARK.md)。

Paseo Skin Loader 的实现保持独立：target 协议、DOM 适配、主题样式、测试和原创图片均针对 Paseo 编写。
