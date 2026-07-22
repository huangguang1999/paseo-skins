# Security Policy

## 安全模型

本项目不修改 `/Applications/Paseo.app`、`app.asar`、Paseo 配置或 agent 数据。CDP 仅绑定 `127.0.0.1`，且加载器会拒绝端口不一致、非回环地址或非 page 形态的 WebSocket URL。

回环地址不是认证机制。Electron CDP 默认没有额外身份验证，同机、同用户权限下的其他进程仍可能访问 renderer。请勿把 CDP 端口通过 SSH、反向代理、容器端口映射或路由器转发到其他机器。

## 安全使用

- 只加载你信任并检查过的本地或远程主题。
- 远程主题只接受 HTTPS（回环地址开发环境除外），且必须是同目录 JSON 与 PNG/JPEG；加载器不会执行主题中的代码。
- 安装第三方主题前可先用 `doctor --theme-url <URL>` 查看主题身份、图片类型、尺寸和缓存路径。
- 用完后可停止 watcher、执行 `npm run reset -- --port 9224`，并正常退出 Paseo。
- `doctor` 和 `status` 是只读命令；`verify` 仅读取 renderer 状态，可选在指定路径写入截图。
- `start` 不会强制退出或重启一个已经运行但未启用 CDP 的 Paseo。

## 报告问题

报告安全问题时，请提供复现步骤、受影响版本和预期影响。不要在 issue 中上传 cookies、token、agent 内容、完整用户目录或包含私密对话的截图。
