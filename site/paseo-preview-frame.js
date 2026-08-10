const PREVIEW_ICONS = {
  addProject: '<path d="M4 6.5h6l2 2h8v9.5H4z"/><path d="M12 11v5m-2.5-2.5h5"/>',
  calendarClock: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h8"/><circle cx="16" cy="16" r="3.5"/><path d="M16 14v2l1.5 1"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.3 2.3 0 0 1 4.4 1c0 1.8-2.2 2-2.2 3.7M12 17h.01"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5m4-1v5l3 2"/>',
  home: '<path d="m4 11 8-7 8 7v9h-6v-6h-4v6H4z"/>',
  panel: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 4v16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 4 4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21h-4v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3.1 14H3v-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3.1V3h4v.1A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1v4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  sliders: '<path d="M4 7h7m4 0h5M4 17h4m4 0h8"/><circle cx="13" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  stack: '<rect x="4" y="4" width="16" height="6" rx="1.5"/><rect x="4" y="14" width="16" height="6" rx="1.5"/><path d="M8 7h.01M8 17h.01"/>',
};

function renderPreviewIcon(name) {
  return `<svg class="paseo-preview-icon" data-icon="${name}" viewBox="0 0 24 24" aria-hidden="true">${PREVIEW_ICONS[name]}</svg>`;
}

export function renderPaseoPreviewFrame() {
  return `
    <div class="paseo-preview-scrim" aria-hidden="true"></div>
    <aside class="paseo-preview-sidebar" aria-label="Paseo 侧栏预览">
      <nav class="paseo-preview-global-nav">
        <span>${renderPreviewIcon("plus")}<b>新建工作区</b></span>
        <span>${renderPreviewIcon("history")}<b>历史</b></span>
        <span>${renderPreviewIcon("calendarClock")}<b>计划</b></span>
      </nav>
      <div class="paseo-preview-workspace-heading"><small>Workspaces</small><span>${renderPreviewIcon("search")}${renderPreviewIcon("sliders")}</span></div>
      <div class="paseo-preview-workspace-list">
        <section class="paseo-preview-workspace-group">
          <div class="paseo-preview-workspace-root"><i class="is-presence"><b>D</b></i><strong>demo-workspace</strong></div>
        </section>
        <section class="paseo-preview-workspace-group">
          <div class="paseo-preview-workspace-root"><i><b>P</b></i><strong>paseo-labs</strong></div>
          <div class="paseo-preview-workspace-tab is-live"><i></i><span>主题包适配</span></div>
          <div class="paseo-preview-workspace-tab is-selected"><i></i><span>预览效果检查</span></div>
          <div class="paseo-preview-workspace-tab"><i></i><span>交互样式验证</span></div>
          <div class="paseo-preview-workspace-tab"><i></i><span>兼容性检查</span></div>
        </section>
        <section class="paseo-preview-workspace-group">
          <div class="paseo-preview-workspace-root"><i><b>S</b></i><strong>paseo-skins</strong></div>
          <div class="paseo-preview-workspace-tab"><i></i><span>修正主题预览结构</span></div>
          <div class="paseo-preview-workspace-tab"><i></i><span>检查全局交互样式</span><em><b>+89</b> -0</em></div>
          <div class="paseo-preview-workspace-tab"><i></i><span>发布主题包</span></div>
          <div class="paseo-preview-workspace-tab is-live"><i></i><span>视觉回归验收</span><em><b>+30</b> -0</em></div>
        </section>
        <section class="paseo-preview-workspace-group">
          <div class="paseo-preview-workspace-root"><i class="is-warm"><b>T</b></i><strong>theme-tooling</strong></div>
          <div class="paseo-preview-workspace-tab"><i></i><span>主题架构文档</span></div>
          <div class="paseo-preview-workspace-tab is-live"><i></i><span>自动化发布检查</span><em><b>+3</b> -0</em></div>
        </section>
      </div>
      <footer><span>${renderPreviewIcon("addProject")}添加 project</span><span>${renderPreviewIcon("stack")}${renderPreviewIcon("home")}${renderPreviewIcon("help")}${renderPreviewIcon("settings")}</span></footer>
    </aside>
    <header class="paseo-preview-toolbar"><span>${renderPreviewIcon("panel")}</span></header>
    <main class="paseo-preview-canvas">
      <section class="paseo-preview-home" data-preview-surface="home">
        <h2>新建 workspace</h2>
        <div class="paseo-preview-context">
          <span><i>P</i>Paseo Skins⌄</span>
          <span><i></i>本机⌄</span>
          <span>◯ Chat⌄</span>
        </div>
        <div class="paseo-preview-composer">
          <p>给 Agent 发消息，标记 @files，或使用 /commands 和 /skills</p>
          <footer><span>＋　◉ GPT-5　⌄　♧ Extra high　⌄</span><span>⚡　☷　↑</span></footer>
        </div>
      </section>
      <section class="paseo-preview-tasks" data-preview-surface="tasks">
        <h2>任务</h2>
        <div><span>主题预览结构校准</span><b>进行中</b></div>
        <div><span>样式与下载验收</span><b>待处理</b></div>
        <div><span>发布主题包</span><b>待处理</b></div>
      </section>
    </main>`;
}
