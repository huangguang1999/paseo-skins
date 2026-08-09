# Renderer 样式安全手册

本文记录 Paseo renderer 换肤时最容易复发的交互样式问题，以及对应的机械检查。它适用于 `src/stage-black-gold-skin.mjs`、CDP 注入生命周期和所有会改变 Paseo 可见样式的代码。

## 核心原则

1. hover、selected 等瞬态背景必须由 CSS 状态控制，不能把计算后的颜色写成永久内联 `!important`。
2. 文字颜色必须根据实际承载它的交互祖先背景计算，不能分别映射背景色和前景色。普通文字最低对比度为 4.5。
3. 视觉检查必须覆盖完整 DOM 树、伪元素、SVG 和 `pointer-events: none` 辅助层。`elementsFromPoint()` 只能发现参与命中的元素，不能证明覆盖层不存在。
4. 同一页面必须验证两种生命周期：皮肤在目标页上冷注入，以及皮肤已运行后通过 SPA（单页应用）导航进入目标页。
5. Renderer 修复只有在自动测试、真实页面巡检、hover 进入/移出和可逆恢复都通过后才算完成。

## 已知问题与防复发规则

| 症状 | 根因 | 修复与防护 |
|---|---|---|
| hover 后背景固定 | 把 hover 计算色复制成内联 `!important`，移出后 CSS 状态无法接管 | 交互条目只使用状态 CSS；巡检报告中的 `persistentInlineBackgrounds` 必须为空 |
| 工作区操作区出现白块 | 原生 kebab 按钮白底与 48×20 SVG `sidebar-scrim-*` 同时覆盖主题背景 | kebab 继承父行背景；SVG stop 必须透明；hover 时检查 `auxiliaryLayerIssues` |
| 深色按钮显示深色文字 | 背景和文字被独立转换，或嵌套文字节点没有读取按钮背景 | 从真实文字节点向上找到交互祖先，以最终填充背景计算对比度；最低 4.5 |
| 冷注入异常，导航进入正常 | 初始全量扫描与 React 复用节点后的增量扫描看到的 DOM 状态不同 | 目标页冷注入和导航进入各验证一次；文字子节点不能因扫描时机改变颜色 |
| 顶部 hover 太浅或没有主题色 | 全局入口或设置导航漏出统一 hover 选择器，继续使用 Paseo 原生中性灰 | 侧栏 hover 使用 14% 主题 accent，selected 使用 18%；真实触发 `:hover` 后比较前后颜色 |
| 代码判断正常但截图仍有残留 | 只检查命中栈或按钮祖先，没有检查不参与命中的兄弟遮罩 | 截图放大目标区域，并扫描所有相交节点、SVG gradient 与伪元素 |

## 自动巡检

先保持 Paseo 窗口可见并位于前台，且只打开一个 Paseo renderer 窗口：

```bash
npm run audit:renderer -- --port 9224
```

命令会执行以下操作：

- 保存当前路径和 workspace 列表滚动位置。
- 安全访问应用设置 9 项、主机设置 9 项、workspace、历史和计划，共 21 类页面。
- 从真实文字节点读取颜色，并与交互祖先的最终填充背景计算 WCAG 对比度。
- 检查 5 类 hover：新建工作区、历史、计划、workspace 行和设置导航。
- 检查 hover 是否真正进入、能否移出、颜色是否可见，以及是否留下永久内联背景。
- 为避免后台窗口的 CSS transition 停在透明中间帧，巡检会临时关闭这 5 类被测控件的动画，结束时删除临时样式。
- 检查 workspace kebab 与 SVG scrim 是否残留不透明背景。
- 最后恢复原路径和侧栏滚动位置；恢复不完整会让命令失败。

命令输出 JSON，失败时退出码非零。需要保存纯 JSON 证据时使用 `--silent`，避免 npm 自身的命令前缀混入文件：

```bash
npm --silent run audit:renderer -- --port 9224 \
  > /tmp/paseo-renderer-style-audit.json
```

报告的关键字段：

- `pass`：所有检查是否通过。
- `failures`：带稳定 `code` 的问题列表。
- `pages`：每个页面的低对比度、内联背景和辅助层结果。
- `hoverChecks`：hover 进入、移出、可见性与残留结果。
- `originalPath` / `restoredPath`：用于证明巡检没有改变用户最终页面。
- `originalSidebarScrollTop` / `restoredSidebarScrollTop`：用于证明 workspace 列表滚动位置也已恢复。

## Renderer 变更验证顺序

1. 在正确 seam（可替换行为的接缝）补回归测试，并确认修改前失败。
2. 实现最小修复；`stage-black-gold-skin.mjs` 行为变化必须提升注入版本。
3. 运行目标测试，再运行 `npm run check`。
4. 让 Paseo 停留在受影响页面，重载 watcher，验证冷注入。
5. 从其他页面导航进入目标页，验证增量扫描路径。
6. 运行 `npm run audit:renderer -- --port 9224`。
7. 运行 `status`、`verify`，截取真实页面并放大问题区域。
8. 运行 `npm run release:check`，再提交代码。

## 视觉证据规则

- 本地截图、JSON 报告和临时探针写入 `/tmp`，不要提交 `tmp/`、`_site/` 或个人主题素材。
- Pull Request 可以上传截图或录屏附件，但仓库只保留可复用规则、脚本和测试。
- 截图必须包含修改前后的关键状态；hover 问题至少包含移入和移出结果。
- 被权限或数据状态阻挡时，先使用安全 fixture 或 mock 触发目标状态，不以代码推理替代真实视觉验收。

## 新问题排查清单

- 问题发生在静态态、hover、selected、focus 还是弹层打开后？
- 颜色来自元素本身、祖先、伪元素、SVG 还是 portal？
- 目标元素是否参与 pointer hit testing？
- 文字颜色来自按钮还是嵌套文字节点？
- 冷注入与 SPA 导航是否得到相同结果？
- 移出 hover、切换路由或执行 `reset` 后是否完全恢复？
- 同类控件是否存在于设置、计划、历史和 workspace 等其他页面？
