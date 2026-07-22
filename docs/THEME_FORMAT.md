# 主题格式

主题由同一目录中的 JSON 清单和一张 PNG/JPEG 图片组成：

```text
my-theme/
├── my-theme.json
└── hero.png
```

最小完整示例：

```json
{
  "schemaVersion": 1,
  "id": "my-theme",
  "version": "1.0.0",
  "name": "我的主题",
  "description": "一句话说明视觉方向。",
  "image": "hero.png",
  "appearance": "dark",
  "art": {
    "focusX": 0.72,
    "focusY": 0.48,
    "homeOpacity": 1,
    "workspaceOpacity": 0.3,
    "utilityOpacity": 0.46
  },
  "colors": {
    "background": "#050505",
    "panel": "rgba(10, 9, 8, 0.90)",
    "panelAlt": "rgba(14, 13, 11, 0.74)",
    "accent": "#d9b86f",
    "glow": "#e8c377",
    "text": "#f6f1e7",
    "muted": "#b9aa8d",
    "line": "rgba(220, 188, 122, 0.24)"
  }
}
```

## 字段

- `schemaVersion`：当前固定为 `1`。
- `id`：小写字母、数字和连字符，最长 64 字符。
- `version`：三段语义版本号，例如 `1.0.0`。
- `name` / `description`：显示名称与简述。
- `image`：必须是清单同目录下的文件名，不能包含 `../`、子目录或软链接。
- `appearance`：当前只支持 `dark`。
- `art.focusX` / `art.focusY`：图片焦点，范围 `0`–`1`。
- `art.homeOpacity`：新建 workspace 首页的 Hero 强度。
- `art.workspaceOpacity`：对话/任务 workspace 的 Hero 强度，建议 `0.15`–`0.35`。
- `art.utilityOpacity`：设置、搜索等其他路由的 Hero 强度。
- `colors`：只接受六位 hex、`rgb()` 或 `rgba()`，防止将任意 CSS 注入清单。
- `colors.panelAlt`：侧栏等次级磨砂面颜色；可省略，默认复用 `panel`。
- `colors.glow`：光效和滚动条颜色；可省略，默认复用 `accent`。

## 图片限制

- 格式：PNG 或 JPEG。
- 文件大小：不超过 16 MB。
- 单边：不超过 16384 px。
- 总像素：不超过 5000 万。
- 建议：16:9 横图；主体放在右半区，左侧为 Paseo 导航和 workspace 列表留安全区。

运行以下命令同时检查清单和图片：

```bash
npm run doctor -- --theme /absolute/path/to/my-theme.json
```

## 远程分发

把 JSON 清单和图片放在同一个 HTTPS 目录下即可分发，不需要服务端程序：

```text
https://example.com/themes/
├── my-theme.theme.json
└── hero.png
```

用户可以先检查，再启动：

```bash
paseo-skin doctor --theme-url 'https://example.com/themes/my-theme.theme.json'
paseo-skin start --theme-url 'https://example.com/themes/my-theme.theme.json'
```

远程加载器会逐跳检查重定向协议，限制清单为 64 KB、图片为 16 MB，并要求图片与清单保持同源、同目录。下载内容通过本地主题校验后才写入 `~/.paseo-skin-loader/themes/` 缓存；主题不能携带或执行 JavaScript。

画廊目录格式见 `site/catalog.json`。目录只负责展示元数据，真正安装仍以每个主题的 `.theme.json` 为准。
