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
  "id": "aurora-ridge",
  "version": "1.0.0",
  "name": "极光雪境",
  "description": "墨绿极光掠过雪岭，安静、冷冽，适合深夜专注。",
  "image": "aurora-ridge.jpg",
  "appearance": "dark",
  "art": {
    "focusX": 0.67,
    "focusY": 0.42,
    "homeOpacity": 0.94,
    "workspaceOpacity": 0.22,
    "utilityOpacity": 0.34
  },
  "colors": {
    "background": "#06100d",
    "panel": "rgba(5, 17, 15, 0.92)",
    "panelAlt": "rgba(8, 27, 23, 0.76)",
    "accent": "#79c9a1",
    "glow": "#4f9f7b",
    "text": "#eff8f3",
    "muted": "#9db8aa",
    "line": "rgba(121, 201, 161, 0.24)"
  },
  "integrity": {
    "algorithm": "sha256",
    "sha256": "068f0b8744758abebb5665630ae5f726f7a612f76302aebf83f27dfdb619e205",
    "bytes": 391592,
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
- `appearance`：当前只支持 `dark`。
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
```

加载器逐跳检查重定向协议，限制下载大小，要求图片与清单保持同源、同目录，并在缓存前重新验证 Theme v2 和 SHA-256。主题永远不会执行代码。
