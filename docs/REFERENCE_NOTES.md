# 参考说明

本项目在 2026-07-21 对以下公开项目做了结构和安全审阅：

- [Fei-Away/Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin)：MIT；参考其 CDP 零 patch、主题清单、`doctor` / `verify` / restore、路由降噪和素材声明思路。
- [b-nnett/codex-plusplus](https://github.com/b-nnett/codex-plusplus)：MIT；参考其 manifest、可停止生命周期、权限/安全文档和测试约束。
- [BigPizzaV3/CodexPlusPlus](https://github.com/BigPizzaV3/CodexPlusPlus)：AGPL-3.0；只用于比较仓库结构和发布规范，没有复制其代码，也没有采用其修改 `app.asar` 的实现路线。

Paseo Skin Loader 的实现保持独立：target 协议、DOM 适配、主题样式、测试和原创图片均针对 Paseo 编写。
