# Paseo Theme v2

主题由同一目录中的 JSON 清单和一张 PNG、JPEG 或 WebP 图片组成。主题是纯数据，不允许 JavaScript、任意 CSS、SVG、字体或远程资源。

```text
my-theme/
├── my-theme.theme.json
└── my-theme.webp
```

公开 JSON Schema：[`schema/paseo-theme-v2.schema.json`](../schema/paseo-theme-v2.schema.json)

## 最快创建方式

网页端打开主题画廊的“上传一张图，自动生成主题”。图片只在浏览器本地处理，下载清单后和原图放在同一目录。

Agent 或终端可直接运行：

```bash
paseo-skin create \
  --image '/absolute/path/hero.jpg' \
  --name 'Mountain Night' \
  --id mountain-night \
  --output '/absolute/path/mountain-night'

paseo-skin inspect \
  --theme '/absolute/path/mountain-night/mountain-night.theme.json'
```

`create` 会用 macOS `sips` 在临时目录生成 96 px 缩样，自动提取主色，不修改原图；最终清单记录图片 SHA-256、字节数和像素尺寸。

## v2 示例

```json
{
  "$schema": "https://huangguang1999.github.io/paseo-skins/schema/paseo-theme-v2.schema.json",
  "schemaVersion": 2,
  "id": "morning-mist",
  "version": "1.0.0",
  "name": "晨雾山水",
  "description": "雾起千山，静心成事。 DreamSkin 原主题包适配，保留原背景图。",
  "image": "morning-mist.jpg",
  "appearance": "light",
  "art": {
    "focusX": 0.78,
    "focusY": 0.5,
    "homeOpacity": 0.96,
    "workspaceOpacity": 0.2,
    "utilityOpacity": 0.32
  },
  "colors": {
    "background": "#f2eee5",
    "panel": "#fbf9f3",
    "panelAlt": "#e8e2d6",
    "accent": "#66776f",
    "glow": "#4f6259",
    "text": "#272b28",
    "muted": "#747971",
    "line": "rgba(102, 119, 111, 0.28)"
  },
  "integrity": {
    "algorithm": "sha256",
    "sha256": "d490297c1e663c1160f4d41bf6f50b25148a67f280031c0b65f6c116f1a3dd84",
    "bytes": 670152,
    "width": 2400,
    "height": 1350
  }
}
```

## 字段与限制

- `$schema`：v2 固定指向公开 Schema URL。
- `schemaVersion`：新主题固定为 `2`；加载器继续兼容旧 v1 清单，但公开画廊和 Release 只接受 v2。
- `id`：小写字母、数字和连字符，最长 64 字符。
- `version`：三段语义版本号。
- `image`：清单同目录文件名，不能包含子目录、`..` 或软链接。
- `appearance`：使用 `dark` 或 `light`，同时控制系统表单控件、滚动条和文字渲染采用的明暗方案。Studio 的“自动”只用于编辑预览，导出时会解析为这两个稳定值之一。
- `art.focusX` / `focusY`：图片焦点，范围 `0`–`1`。
- `homeOpacity` / `workspaceOpacity` / `utilityOpacity`：不同路由的背景强度。
- `colors`：只接受六位 hex、`rgb()` 或 `rgba()`，不能借清单注入任意 CSS。
- `integrity`：固定 `sha256`，同时绑定文件内容、大小和像素尺寸。
- 图片：PNG/JPEG/WebP，不超过 16 MB、单边 16384 px、总像素 5000 万。

建议使用 16:9 横图，让主要人物或视觉主体避开左侧导航；workspace 背景强度建议为 `0.15`–`0.35`。

## 远程分发

把 JSON 清单和图片放在同一个 HTTPS 目录即可：

```text
https://example.com/themes/
├── mountain-night.theme.json
└── mountain-night.webp
```

```bash
paseo-skin inspect --theme-url 'https://example.com/themes/mountain-night.theme.json'
paseo-skin start --theme-url 'https://example.com/themes/mountain-night.theme.json'
# 需要关闭终端、退出 Paseo 或重启电脑后自动恢复时：
paseo-skin autostart install --theme-url 'https://example.com/themes/mountain-night.theme.json'
```

加载器逐跳检查重定向协议，限制下载大小，要求图片与清单保持同源、同目录，并在缓存前重新验证 Theme v2 和 SHA-256。主题永远不会执行代码。
