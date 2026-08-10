export function renderPaseoPreviewFrame() {
  return `
    <div class="paseo-preview-scrim" aria-hidden="true"></div>
    <aside class="paseo-preview-sidebar" aria-label="Paseo 侧栏预览">
      <nav class="paseo-preview-global-nav">
        <span>＋ <b>新建工作区</b></span>
        <span>◷ <b>历史</b></span>
        <span>▣ <b>计划</b></span>
      </nav>
      <div class="paseo-preview-workspace-heading"><small>Workspaces</small><span>⌕　⌘</span></div>
      <div class="paseo-preview-workspace-list">
        <section>
          <strong><i>P</i>Paseo Skins</strong>
          <span><i></i>主题包适配</span>
          <span class="is-selected"><i></i>个人项目</span>
          <span><i></i>样式回归检查</span>
        </section>
        <section>
          <strong><i>S</i>skin-gallery</strong>
          <span><i></i>热门主题</span>
          <span><i></i>发布前验收</span>
        </section>
      </div>
      <footer><span>⊞ 添加 project</span><span>▤　⌂　?　⚙</span></footer>
    </aside>
    <header class="paseo-preview-toolbar"><span>◧</span></header>
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
