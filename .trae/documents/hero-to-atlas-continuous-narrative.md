# 首屏到星图的连续叙事 · 实施方案

## Context

站点已具备辨识度（「环」「杀死命运」「代码与诗歌」），但首屏星空、星图 `#ring`、作品 `#works` 目前是三块互不相干的系统：星空只是氛围画布，星图是独立卡片，作品是常规网格；动效时长与缓动也各写各的。下一步的高价值投入不是继续润色按钮，而是把三者串成**一条可被记住的连续叙事**，让「环」成为整站脊柱。

目标体验：**同一片星空**。首屏的轨道星空在滚动中收束、停靠为可探索的星图；选中的星域化作一颗"携带星"落进作品区的「环」条目；反向滚动完全可逆。所有文案与链接仍在 DOM，画布只做装饰。

本轮**不做**：作品页的创作过程/个人角色/阶段成果（下一轮）、共享 CSS/导航模板重构、删除弹幕/点赞、推送与部署（需你单独授权）。

## 叙事分镜（一个状态机）

以 `#hero` 顶部到 `.work-row[data-no="01"]` 顶部为总进度，拆成四段：

- **P0 首屏 0–0.15**：保持现有三星环与星野；环心桌面 `w*0.7 / h*0.47`，移动端 `w*0.5 / h*0.4`。不驱动文字，避免与 `heroIn` 冲突；hero 底部加 ink 渐变让星空自然接管到下一屏。
- **P1 宣言 0.15–0.45**：星野透明度降到 ~0.55、密度减 30%；三个环向视口中线收拢并轻微左移，从宣言文字背后穿过。宣言区不加文字视差。
- **P2 星图停靠 0.45–0.78**：环向 `.mini-map` 的实时包围盒插值。因卡片不透明，**最外环停在略大于卡片的位置**（半径 ≈ `max(w,h)*0.62`，可见地环抱卡片），另外两环缩小并淡出；同时 SVG 星点与 7 个主节点一次性 600ms 点亮，形成"星空冷凝成星图"的手感。不复制 34 颗 SVG 星到画布（延后）。
- **P3 携带星 0.78–1**：用户选中主星域后，一颗亮星从该节点沿二次贝塞尔离开星图，落在 `#workOrbit`（放在 row 01 卡片右上角）；半径 1.6→3.4→2.6，落点展开一圈细环；row 01 加 `.has-domain`，标签写入域名（如 `HESSARION`），`href` 改为 `ring.html?atlas=hessarion`，并补 `aria-label`。
- **无选择态**：不伪造星域。携带星退化为第三条环上的 accent 点，落到 `#workOrbit`，标签固定 `STAR MAP`，row 01 保持 `href="ring.html"`，不加 `.has-domain`。
- `#works` 之后画布 alpha 归零；`#poetry` 是不透明纸面色，天然截断。`unnamed` 仍走 404，不参与携带。

## 技术架构

### 1. 画布层

- 新建全视口 `position:fixed` 画布 `#narrative-sky`（`z-index:-1; pointer-events:none`），放在 `index.html` body 内、`<main>` 之前；删除 hero 内的 `<canvas id="sky">`（index.html:1288）。
- 选 fixed 而非跨区 absolute：只占一屏像素，DPR2 下显存/重绘可控；文档坐标减 `scrollY` 即视口坐标。
- 让背景透出：`.editorial-hero` 的 `background:var(--ink)`（interact.css:228）改为 `transparent`（body 已是 ink）。`#ring` 的渐变依赖自引用的 `--surface-2`（interact.css:167），当前计算无效、实际透明，需在浏览器确认；**本轮不修复该 token**，否则会遮住画布。
- `.mini-atlas`（interact.css:269）保持不透明，保证星图可读；`#work-row` 卡片保持不透明。

### 2. 进度与坐标

- `measureAnchors()` 一次性读取并缓存文档坐标：`#hero`、`.mini-map`、`#workOrbit`、`#miniOverview [data-mini]`、`.mini-sky`。
- 每帧只读一次 `window.scrollY`，不读 DOM。`resize` / `orientationchange` / `visualViewport.resize` / `document.fonts.ready` / 星图切换 `transitionend+100ms` 后防抖重测。
- `pDock`：`dockStart = docY('#ring') - vh*0.55`，`dockEnd = docY('.mini-atlas') - vh*0.30`，用 smootherstep；`pCarry`：从星图底部到 row 01，用 smoothstep。渲染值做 `d += (p-d)*0.14` 阻尼，差值 <0.0005 吸附，保证可逆。
- 移动目标：`#miniMap` 点击捕获阶段先冻结被点节点的 `getBoundingClientRect()` 为 `state.domainAnchor`（`openMiniDomain` 会缩放并隐藏节点）；返回总览时清空，回落地图中心。

### 3. 绘制分层

`Sky.render()` 顺序：静态星野（离屏 canvas 一次绘制 + 仅 ~24 颗闪烁）→ `drawGuideRings(p)`（圆心/半径/旋转/alpha/dash 插值，`ctx.lineDashOffset` 旋转）→ `drawBeacons()` → `drawCarried(p)`。

预算：`min(110, round(w*h/16000))`，宽 ≤900 上限 60；DPR `min(dpr,2)`，移动端 1.5。单一 rAF；`document.hidden` 不排帧；越过 `#works` 后停帧，scroll 唤醒。

### 4. 与星图/作品的接线

- 保留现有 `miniData` / `miniDomains` / `openMiniDomain()` / `returnToMiniOverview()` / `showMiniDetail()`（index.html:1930-2088），只在两处末尾派发 `ring:domainchange`（`detail:{key,label}`），返回总览时 `key:null`；仅主节点派发，子星不改变携带目标。
- `Bridge.setDomain(d)` 写 `#workOrbit` 标签、class、`href`、`aria-label`；反向滚动调用 `clearDomain()` 完全复原。复用 ring.html 已有的 `?atlas=` 初始化（ring.html:715-717），无需改子页。
- 在 row 01（index.html:1483）的 `.work-row` 内加入 `<span class="work-orbit" id="workOrbit" aria-hidden="true">…</span>`；桌面绝对定位到卡片右上，≤640 改为行内、排在 `(01)` 前。

## 文件改动

| 文件 | 改动 |
| --- | --- |
| `index.html` | 新增 `#narrative-sky`；删除旧 `#sky` canvas 与 2090-2183 星空 JS；hero 图加 `preload`/`fetchpriority`；row 01 加 `#workOrbit`；星图两处派发事件；加载 `assets/narrative.css` 与 `assets/narrative.js`（带 `?v=`） |
| `assets/narrative.js`（新建，约 300 行） | 单一 IIFE：`state` / `ScrollDirector` / `Sky` / `Bridge`；首页专用、defer、可缓存 |
| `assets/narrative.css`（新建） | 画布、`#workOrbit`、移动端编排、reduced-motion |
| `assets/interact.css` | 只加动效 token；`.editorial-hero` 背景透明；首页可见项的时长迁移 |

明确不改 `ring.html`；不新增任何第三方依赖（环境无浏览器测试库）。

## 统一动效语言

在 interact.css 的 `:root`（162-178）补：

```css
--dur-xs:.16s;--dur-sm:.24s;--dur-md:.4s;--dur-lg:.7s;--dur-xl:1.1s;
```

沿用 `--ease:cubic-bezier(.22,1,.36,1)`。本轮只迁移首页可见项：`.btn`(193)、`.js .reveal`(184)、`.work-row`/`.work-art` hover(277、287)、`.mini-scene`(662)、`.mini-node`(674-676)、hero 入场（index.html:451/465/535）。预加载器、弹幕、粒子、cursor 不动。**不新增粒子系统**。

## 移动端（重新构图，不是压窄）

- **≤900**：hero 已是非满屏（interact.css:451），改为纵向"下降"：环心固定在首屏底部地平线，随滚动上移收缩；停靠目标仍是 `.mini-map` 中心；砍指针视差、第三条环、虚线旋转；星数 60、DPR 1.5。
- **≤640**：取消环抱卡片，只保留一颗携带星作纵向主轴，从星图中心近乎垂直落到 row 01；星图区画布 alpha 压到 0.3；`#workOrbit` 行内化，不压作品图；砍 ripple、beacon 闪烁。

## 首屏性能前提（只做这些）

- `index.html` 第 9 行后加 `<link rel="preload" as="image" href="assets/kashiu-hero.webp" fetchpriority="high">`；1307 行 img 补 `fetchpriority="high" loading="eager"`（宽高已有，防 CLS）。
- 字体保持现有 `preconnect` + `display=swap`；`narrative.js` 在 `Promise.race([document.fonts.ready, 1200ms])` 后测量并给 `html` 加 `.sky-ready`（画布初始 `opacity:0`，就绪后 0.9），避免字体替换导致锚点漂移。标签文本等 `.sky-ready` 后再写。
- 不引入加载器、不阻塞首屏渲染；画布失败时页面与现状一致。

## 可访问性与降级

- `prefers-reduced-motion`：`narrative.js` 直接返回；`narrative.css` 隐藏 `#narrative-sky`，`#workOrbit` 用静态点 + 标签呈现，选中仍更新 `href`。
- 画布与 `#workOrbit` 均 `aria-hidden`；保留 `mini-detail[aria-live=polite]`、`aria-pressed`、`miniBack.focus()` 的键盘路径。
- 无 JS：文案与链接完整，`#workOrbit` 显示中性 `STAR MAP`，row 01 仍指向 `ring.html`。

## 风险与对策

1. 固定画布被不透明区挡住 → hero 背景透明；星图卡片保持不透明；works 后 alpha=0。
2. iOS 工具栏改变视口 → 用 `visualViewport.height` 写画布像素尺寸，尺寸未变不重建。
3. 滚动卡顿 → 每帧只读 `scrollY`、坐标缓存、单 rAF、阻尼、越区停帧。
4. 目标在动 → 点击瞬间冻结节点锚点；缩放/返回后重测；失效回落中心。
5. 星图可读性 → 画布在其后，`#ring` 内星野 alpha ≤0.45；必要时跳过落在 `.mini-map` 矩形内的星点。
6. SEO / 无 JS → 全内容在 DOM，画布纯装饰。
7. 仓库状态 → 改动单独 commit，不混入未推送的 CTA 修复 `636deff`。

## 实施分期

1. **P0 基线**：preload/fetchpriority；把旧星空原样迁入 `narrative.js`，视觉零变化。
2. **P1 连续层**：fixed 画布、透明背景、`ScrollDirector`、hero→宣言→星图停靠（仅桌面）。
3. **P2 携带星**：星图事件、锚点冻结、row 01 标记与 href、无选择态、反向复原。
4. **P3 移动端 + 降级**：≤900/≤640 编排、reduced-motion 静态版。
5. **P4 token 迁移与收尾**。

## 验证

```bash
cd /workspace && python3 -m http.server 8080
```

- 视口 1440×900、960×571、390×844：滚动上/下往返，确认无跳变、无布局抖动、环与星图停靠位置准确。
- 交互：点选 7 个主星域 → 携带星落点与标签正确；返回总览复原；刷新后回到无选择态；`unnamed` 仍 404。
- 键盘：Tab 走完 7 个主节点 → 子场景 → `#miniBack` 焦点回归；`aria-live` 文本更新。
- 降级：DevTools 仿真 `prefers-reduced-motion`；禁用 JS；`index.html#works` 直达。
- 性能：Performance 面板录 6 秒滚动查长任务；Rendering 查层；Lighthouse 对比 LCP/CLS 不退化；确认离屏停帧。
- 视觉：hero 立绘、CTA、星图详情、作品网格均不受画布层级影响。

## 复用的既有实现

- `miniData` / `miniDomains` / `openMiniDomain` / `returnToMiniOverview` / `showMiniDetail`（index.html:1930-2088）
- ring.html 的 `?atlas=` 深链（715-717）
- `--ease` 与 `.reveal` / `heroIn`（index.html 与 interact.css）
- 现有 reduced-motion 判定（index.html:1777、interact.js:9）
