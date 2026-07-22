# Compatibility

Paseo Skins 通过运行时 DOM 与 CDP target 能力判断兼容性，不只比较应用版本号。版本号用于记录证据和定位回归，不作为“应该能用”的替代证明。

| Paseo | Platform | Last checked | Evidence |
|---|---|---|---|
| 0.1.108 | macOS arm64 | 2026-07-22 | Installed app identity `sh.paseo.desktop`; loader tests, target filtering, Theme v2 validation and renderer verification contract |

0.7.0 发布审计时 Paseo 正在运行且未开放 `127.0.0.1:9224`。`doctor` 通过，但为避免中断现有 Agent，本轮没有重启应用或重新执行 live injection；表中证据因此明确是安装身份与自动化 contract 级验证，不冒充实时 renderer 验收。

## Runtime contract

- App bundle identifier：`sh.paseo.desktop`
- Renderer target：`paseo://app/`
- Required native root：`#root` 必须存在且保持可见
- Injection lifecycle：单一 scene overlay、单一 style、幂等更新和完整 `destroy`
- Theme marker：`window.__PASEO_STAGE_BLACK_GOLD_SKIN__`
- CDP：指定端口、page target、回环 WebSocket，拒绝凭据、query、fragment 和非 page endpoint
- Restore：注销 reload hook，再移除 observer、overlay、style 和动态内联样式

## After a Paseo update

1. 先运行 `paseo-skin doctor --json` 和 `paseo-skin status --json`。
2. 在独立窗口检查首页、普通 workspace、设置/搜索和弹窗。
3. 运行 `paseo-skin verify --screenshot <absolute-path>`。
4. 停止 watcher，运行 `paseo-skin reset`，确认原生 UI 恢复。
5. 只有上述证据全部通过，才更新本表的版本和日期。

Windows、Linux 和 Intel Mac 当前均未声明支持；新增平台必须提供真实设备证据和对应 CI/恢复测试。
