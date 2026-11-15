# 国学经典共读（Monorepo）

> guoxue.aiyazone.com — 六部经典共读站的统一站点：书架首页 + 各书阅读器，单仓部署。

《大学》《中庸》《止学》《素书》《长短经》《冰鉴》的共读阅读器全部收录在本仓库中，
由**同一套阅读器模板**渲染各自的 `data.json` 数据。新增一本书 = 新增一个目录 + 两个数据文件，首页书架自动收录。

---

## 仓库结构

```
├── index.html              # 首页书架（读取 books.json，自动收录）
├── books.json              # 书目清单（由 scripts/gen_meta.py 生成）
├── vercel.json             # 旧域名 301 → 主站子路径
├── shared/
│   ├── reader.css          # 唯一一份阅读器样式（含暗色模式）
│   └── reader.js           # 唯一一份阅读器逻辑（数据驱动渲染）
├── zhixue/                 # 每本书一个目录，结构完全一致
│   ├── index.html          # 入口壳（title/主题色/favicon）
│   ├── data.json           # 全部内容数据：章节/原文(含ruby注音)/译文/注释/朱注/四视角解读/经证链/安心签/省察
│   ├── study.html          # 研读专区（结构脉络/概念词典/名句/经典互参/以经解经）
│   └── favicon.svg
├── sushu/ daxue/ zhongyong/ changduanjing/ bingjian/
└── scripts/
    ├── extract.py          # 一次性迁移工具：从旧版单文件站点抽取 data.json + study.html
    ├── gen_meta.py         # 扫描 */data.json → books.json + 各书入口壳
    └── validate.py         # 数据完整性校验（章数/译文/省察问题/meta）
```

## 本地预览

```bash
python3 -m http.server 8080
# 打开 http://localhost:8080/            首页书架
# 打开 http://localhost:8080/zhixue/     止学阅读器
```

## 修改内容的正确姿势

1. 编辑 `<book>/data.json`（或 `<book>/study.html`）；
2. `python3 scripts/validate.py` 校验；
3. `python3 scripts/gen_meta.py` 重新生成 `books.json`（章数变化时必须）；
4. 提交推送，Vercel 自动部署。

**新增一本书**：建 `<book>/data.json`（结构照抄现有书目）+ `<book>/study.html` + `<book>/favicon.svg`，
在 `scripts/gen_meta.py` 的 `CATS` 里登记分类，运行 `gen_meta.py` 即可在首页与各书工具箱出现。

## 部署与域名

- 单个 Vercel 项目绑定本仓库，`guoxue.aiyazone.com` 为主域名。
- 旧书站域名（`zhixue.aiyazone.com` 等 6 个）通过 `vercel.json` 301 重定向到
  `guoxue.aiyazone.com/<book>/`——旧域名也需绑定到本 Vercel 项目，重定向才会生效。
- 重定向后旧外链、书签、搜索引擎收录全部无损迁移。

## 阅读器功能

目录进度 / 今日共读定位 / 开始日期设置 / 分页与连续双模式 / 逐句译文 /
疑难字注音开关 / 通假字点按说明 / 朱注 / 四视角解读（点按展开所本）/ 经证链 /
安心签分享 / 章尾省察笔记（localStorage，可导出 txt）/ 站内搜索 / 夜览模式 /
顶部阅读进度条 / 键盘翻章 / 滚动监听高亮目录 / 打印样式。

## 视觉与交互规范

全站令牌集中在 **`shared/palette.css`**（首页与六本书共用），其余样式只准引用变量、不准写死色值。

### 五套可切换配色

| 键 | 名称 | 主色（日间） | 气质 |
|---|---|---|---|
| `e` | 赭红（默认） | `#8d4a34` | 纸墨偏印泥，印章最像真印 |
| `a` | 纸墨 | `#8b5e3c` | 宣纸 + 旧书，温润 |
| `b` | 朱砂 | `#9e3b32` | 藏书印、朱批 |
| `c` | 黛青 | `#33566e` | 青衿文人，冷静 |
| `d` | 竹绿 | `#47694f` | 竹简茶烟，清雅 |

每套配色都有日间 / 暗色两个变体：`[data-pal="x"]` 定义日间，`[data-pal="x"][data-theme="dark"]` 覆盖暗色主色（`c`/`d` 另换冷灰中性底）。选择写入 `localStorage.guoxue_pal`，主题写入 `guoxue_theme`。

切换入口：首页顶栏「配色」下拉（按钮文案固定，前置色点表示当前配色）；阅读器「工具箱 → 阅读设置 → 主题配色」。

### 令牌表（以纸墨为例）

| 变量 | 日间 | 暗色 | 用途 |
|---|---|---|---|
| `--paper` / `--card` | `#faf8f5` / `#fff` | `#1c1915` / `#252119` | 纸色 / 卡片 |
| `--ink` / `--soft` / `--muted` | `#2b2418` / `#6b5e4a` / `#9a8d7b` | `#e9e3d5` / `#b0a693` / `#8a8070` | 正文 / 次级 / 辅助文字 |
| `--accent` / `--accent-deep` | `#8b5e3c` / `#74482b` | `#c99b6c` / `#dbae7f` | 印章、按钮、进度 |
| `--accent-bg` | `#f5efe8` | `#332a22` | 标签 / 高亮底色 |
| `--line` / `--line-strong` | `#e6dfd3` / `#d8cdb9` | `#3a342b` / `#4c4438` | 描边 |
| `--dot` | 主色极淡 | 米白极淡 | 纸面颗粒点 |

字体：正文宋体（Songti/Noto Serif），标题与书名楷体（Kaiti/STKaiti）。**新增书目不要自带配色**，一律沿用令牌。

外观属性同时挂在 `<html>` 与 `<body>` 上（`data-pal` + `data-theme`），并在 `<head>` 内用一小段内联脚本先行应用，避免暗色闪白。

导航层级（避免「首页」二义）：

- 左侧栏顶部：`← 国学经典共读`（回总站）+ 印章式书名（回本书封面）+ `共 N 章 · 一天一章`；宽屏下头部 / 研读 / 搜索固定，仅目录区独立滚动
- 顶栏：面包屑 `国学经典共读 / 书名` + `封面 · 研读 · 今日 · 夜览 · 工具箱`
- 页脚：`📚 国学经典共读 · 更多经典 →` 指向本站根路径 `/`

阅读进度写在 `localStorage`（`<book>_last_v1`），首页据此显示「继续共读」。

## PWA（安装到主屏 / 离线阅读）

站点是纯静态的，用一个 Service Worker 做离线缓存，可在手机浏览器里「添加到主屏幕」后当 App 用。

| 文件 | 作用 |
|---|---|
| `manifest.webmanifest` | 名称、`standalone` 显示、主题色、三档图标（192 / 512 / maskable） |
| `sw.js` | 预缓存外壳与全部书目；运行时按类型分流 |
| `icons/` | `icon-192.png` / `icon-512.png`（含内框印章）、`maskable-512.png`（留安全区）、`apple-touch-icon.png` |
| `favicon.svg` | 站徽：朱砂方章 + 白文「读」（小尺寸去掉内框，保证 16px 可辨） |

缓存策略：

- **安装期**：预缓存首页、共享 CSS/JS、图标，再读 `books.json` 动态铺开每本书的入口页 / `data.json` / `study.html`——**新增书目不需要改 `sw.js`**
- **页面导航**：network-first，断网回退同地址缓存，再退回首页
- **`data.json` / `study.html`**：network-first，保证勘误与新增章节即时可见
- **`/shared/*`**：network-first，避免改版后新 DOM 配旧 CSS
- **图标 / favicon / manifest**：cache-first + 后台更新

改了 `sw.js` 的缓存清单或策略时，把 `VERSION` 加一（如 `guoxue-v2`），旧缓存在 `activate` 中自动清理。

`vercel.json` 已为 `/sw.js`、`/manifest.webmanifest` 设置 `must-revalidate`，避免 CDN 缓存住旧版本。

本地验证离线：浏览器 DevTools → Network → Offline，刷新任意书籍页仍可翻章；或 `curl` 检查 `/manifest.webmanifest` 与三张图标均为 200。

## 迁移说明

本仓库由原 7 个独立仓库（6 部书 + 导航页）合并而来，内容数据于 2026-11 用
`scripts/extract.py` 从旧版 `index.html` 中无损抽取，`validate.py` 校验通过：

| 书 | 章 | 译文句 | 注释 | 解读组 | 朱注章 |
|---|---|---|---|---|---|
| 止学 | 10 | 100 | 102 | 60 | 0 |
| 素书 | 6 | 132 | 0 | 6 | 0 |
| 大学 | 11 | 106 | 54 | 41 | 11 |
| 中庸 | 33 | 294 | 0 | 165 | 33 |
| 长短经 | 64 | 45* | 51 | 33 | 0 |
| 冰鉴 | 7 | 156 | 89 | 7 | 0 |

\* 长短经原站仅 16 篇核心章有逐句译文，余者只有原文与串讲。

旧仓库（zhixue/sushu/daxue/zhongyong/changduanjing/bingjian）将归档并由 README 指向本仓库。
