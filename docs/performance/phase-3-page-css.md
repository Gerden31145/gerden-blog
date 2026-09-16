# 阶段 3 实验 02：文章样式改为页面级引入

状态：已验证并保留。页面 style 块方案的构建与真实正文 SSR 样式检查通过，阶段 7 最终 A/B 后用户反馈人工检查通过，补齐本阶段的页面验收。下文保留实施时 API 未启动等历史问题。构建、测量与分析由教练执行，用户负责页面及交互检查。

## 唯一变量与假设

基于实验 01 已保留的 @reference 修改，调整 post.css 的引入位置：从 nuxt.config.ts 的全局 css 数组中移除，在 app/pages/posts/[slug].vue 的 script setup 中直接 import。

main.css 继续作为全局样式，post.css 内的 @reference 和选择器均保持原样。两处编辑合起来是一个变量：文章样式的引入范围。

预期：首页全局 CSS 中的文章/TOC 规则减少，文章详情仍能及时获取所需样式；全量 CSS 未必减少，可能只是重新分块。Nuxt 样式内联与链接预取可能影响实际传输，不能凭 import 位置就宣称首页绝不会请求文章 CSS。

## before 证据

教练保存 `.perf-results/phase-3-page-css/before/`，包含 Nuxt 配置、文章页面、main.css/post.css、锁文件、上一实验产物报告、当前客户端 precomputed 映射与 _nuxt 文件。

对当前 preview 的首页、列表和固定文章进行 HTTP 读取，均返回 200；三份 HTML 与 document-resources.json 已保存。这是 SSR 文档及静态链接观察，不是执行 hydration/预取后的完整浏览器请求记录。

- 三个文档均链接 entry.Ck_cnU87.css，原始 17691 B，其中仍含文章规则。
- 首页和列表各有 511 B 内联 style 文本，固定文章另有 28 B 内联 style；这些块未包含 .post 规则。
- 全量 CSS 为 4 个文件，22057 B；gzip 6156 B、Brotli 5299 B。
- 固定文章：/posts/测试文章-37236f02。

## 用户修改

1. nuxt.config.ts：css 数组只保留 ./app/assets/css/main.css。
2. app/pages/posts/[slug].vue：在 script setup 的导入区添加 import '~/assets/css/post.css'。
3. 保留 post.css 原来的 @reference "./main.css"；不改为 scoped，不改样式声明或页面数据逻辑。

## 验证计划

- 教练核对 diff，正常构建，保留运行条件；未知供电或电池状态不用于提速比较。
- 测量全量 JS/CSS 及分块变化，比较首页与文章 SSR 文档的 stylesheet/内联样式，进一步核对浏览器初始窗口与预取请求。
- 用户人工检查：文章地址直接刷新、从首页经列表进入文章、返回再进入、宽窄屏、标题/代码块/TOC，以及是否出现样式闪烁。
- 同时保持主题与正文样式正确，再根据页面实际资源成本决定保留或调整。

## 结果

2026-09-14 用户完成约定的两处编辑。post.css 的 @reference 与选择器未变。

构建运行：`.perf-results/baseline/page-css-coach-check/`，退出码 0，7.400 s。现有缓存未清理，供电/电源模式未经确认，不用于构建提速比较。原有 Git ignore 读取权限警告未阻止构建。

| 指标（B） | before | script 导入 after | 差值 |
| --- | ---: | ---: | ---: |
| 全局入口 CSS raw | 17691 | 15190 | -2501（-14.14%） |
| 全局入口 CSS gzip 估算 | 4532 | 4021 | -511 |
| 全局入口 CSS Brotli 估算 | 3932 | 3465 | -467 |
| 文章页 CSS raw | 29 | 2583 | +2554 |
| 全量 CSS raw（4 文件） | 22057 | 22110 | +53 |
| 全量 CSS gzip 估算 | 6156 | 6461 | +305 |
| 全量 CSS Brotli 估算 | 5299 | 5529 | +230 |
| 全量 JS raw（18 文件） | 248706 | 248706 | 0 |

新文件为 entry.Ch7Sxcho.css 与 _slug_.DeBTnI-C.css。全量 CSS 增加，收益候选是加载范围缩小。gzip/Brotli 是脚本固定参数逐文件估算，不能称为真实传输节省；JS raw 一样也不表示哈希或内容一样。

证据保存在 `.perf-results/phase-3-page-css/`：client-assets-after.json、after/_nuxt、after/client.precomputed.mjs、源码快照、source-changes.patch，以及 inspect-after.mjs。patch 相对 Git HEAD，包含上一实验的 @reference 修改；本组独立差异以 before 源码快照比较。

### HTTP 与浏览器观察

preview 已重启到本次生产构建，地址 http://localhost:3000/。首页、列表、文章 HTTP 均为 200；HTML 大小分别保持 4677、4731、42004 B。三者仍只链接全局入口 CSS；文章内联 style 只有原有 28 B 与 511 B，未含文章正文/TOC 样式。

Playwright 无头 Chromium、1365×768、每页新建匿名上下文、不节流、默认预取，观察 load 后 5 秒。候选版本请求记录保存在 after/*.har 和 after/browser-resources.json：

- 首页仅请求入口 CSS：15190 B，无文章 CSS 请求。
- 列表页还请求了文章 CSS：合计 17773 B；未打开正文也发生请求，与路由预取相符，尚未通过关闭预取对照实验确认唯一原因。
- 文章页请求入口和文章 CSS：合计 17773 B。
- 上述 CSS 均返回 200，无 Content-Encoding；三个页面未观察到 pageerror 或 requestfailed。

这是候选版本固定窗口的一次资源观察，before 只有 SSR 文档证据，没有本组同条件 before 浏览器请求记录。不能推导加载时间、LCP 或整站性能提升。

### 未通过项：SSR 正文样式依赖客户端脚本补齐

文章 HTML 没有链接或内联 post.css，运行 JS 后才补请求文章样式。进一步在同一候选 SSR DOM 阻止 script 请求，读取计算样式，再注入归档的 before 全局 CSS 作诊断：

- 正文 h1：当前 16px / weight 400 / margin-bottom 0；补 before 样式后为 30px / 800 / 48px。
- TOC：当前 position: static；补样式后为 fixed。
- 代码块字体：当前 16px；补样式后为 18px。

见 after/ssr-style-check.json。这是阻止脚本的诊断，证实 SSR 文档本身未提供必要样式；没有量化正常网络下的闪烁时长或 CLS。首次尝试禁用 JS 后通过 addStyleTag 注入的辅助命令未完成，已中止且不作为结果；以上记录来自成功完成的 script 请求阻断实验。

决定：本方案暂不验收。此前建议 script setup import 在语法上有效，但在本次 Nuxt 构建中未满足文章 SSR 初次样式完整的要求。不能把首页入口减少 2501 B 单独视为可保留结论。

### 下一步：用页面 style 块声明样式依赖

由用户删除 script setup 中的 post.css import，在文章页已有的非 scoped style 块顶部添加 `@import '~/assets/css/post.css';`，保留原 html scroll-behavior 规则。nuxt.config.ts 仍只全局加载 main.css，post.css 不改。

教练随后独立构建，核对文章 HTML 是否通过内联或 stylesheet 提供完整正文样式，并复查首页成本。这个调整是否解决 SSR 样式缺失，以新产物验证为准，不能预先宣称成功。

## style 块导入方案实测

用户已移除 script setup 的 CSS import，在已有非 scoped style 块中添加 @import。相对上一候选版本，仅改变文章页的引入方式；main.css、post.css、Nuxt 配置及根锁文件不变。

构建运行 `.perf-results/baseline/page-css-style-coach-check/`：退出码 0，10.258 s；现有缓存未清理，供电和后台条件未经确认，不用于提速比较。正常构建产物已启动于 http://localhost:3000/。

独立证据目录：`.perf-results/phase-3-page-css-style/`。包括 client-assets-after.json、script-to-style.patch（相对上一候选）、source-changes.patch（相对 Git HEAD）、源文件与产物快照、服务端文章内联样式文件、HTML、HAR、浏览器观察及 inline-rule-check.json；保留上一候选的证据不覆盖。

- 入口 CSS 仍是 entry.Ch7Sxcho.css，15190 B，内容哈希与上一候选一致。
- 文章 CSS 为 _slug_.BfrQLYHh.css，2583 B；全量 CSS 仍为 22110 B，gzip 6461 B / Brotli 5529 B（固定参数估算）。
- 全量 JS 为 18 文件、248706 B；只表示原始字节总数相同。
- 文章 SSR HTML 现在包含 **2582 B 的文章内联样式**，原来只有 28 B。用 PostCSS 比较其中 20 条 .post/.toc-* 规则的选择器、祖先 at-rule 及声明列表，均与全局引入 before 版本一致。本检查不比较规则之间的顺序，不替代视觉验收。
- 首页没有正文规则内联，只请求 15190 B 入口 CSS。这次观察条件仍为无头 Chromium、1365×768、匿名新上下文、无节流、load 后 5 秒。
- 文章页在 JS 执行后仍请求 2583 B 的外部文章 CSS；因此当前存在正文样式内联后再下载外部 CSS 的成本，不能只报告首页收益。相对全局 before，文章内联 style 文本增加 2554 B，外部入口 CSS 减少 2501 B，且观察到额外文章 CSS 请求；尚未在真实正文恢复后完成同条件总传输对比。

### 本轮验证限制与待办

本地 http://localhost:8787/api/health 连接被拒绝（ECONNREFUSED）。文章 HTML 显示“文章正文加载失败”，浏览器 .post 元素数为 0；列表数据同样缺失。因此当前首页/列表/文章 HTTP 均为 200、浏览器没有 pageerror，也不能视为功能通过。当前文章 HTML 的 5987 B 和列表 3401 B 是缺少 API 数据的结果，不能与原来的 42004 B / 4731 B 作优化比较；空列表也不能用于推断正常列表的文章 CSS 预取行为。

已确认本方案让正文/TOC 规则进入 SSR HTML，修复了上一候选的样式交付缺口；实际正文计算样式、客户端导航、宽窄屏和闪烁仍待本地 Worker 恢复后由用户检查。用户启动原有 Worker 开发服务后，用当前 preview 检查固定文章直接刷新、从首页经列表进入、返回再进入、标题/代码块/TOC。

补充验证（阶段 4 LazyBaseModal 构建后，文章源码与 CSS 未改）：本地 API 已恢复。固定文章 HTTP 200，HTML 44558 B，真实 .post 元素为 1。在阻止 script 请求的浏览器中，正文 h1 为 30px / weight 800 / margin-bottom 48px，TOC 为 position: fixed，确认真实文章在客户端 JS 执行前已获得这些样式。证据保存在 `.perf-results/phase-4-modal/after/post-detail-api-restored.html` 与 `post-ssr-api-restored.json`。这不替代宽窄屏、导航和闪烁的人工验收；上面的 API 不可用记录保留为历史异常样本。

最终补验（2026-09-16）：阶段 7 使用已提交版本 2e2c906 的生产产物和真实固定文章，复查正文 SSR 样式、客户端导航与目录响应行为；用户明确反馈人工检查通过，覆盖已布置的宽窄屏、文章直接刷新/站内导航、代码块、目录与明显样式闪烁。按人工反馈记录，不扩展成自动视觉差异测试。最终 A/B 指标及文章内联/外部 CSS 成本见 [阶段 7](phase-7-results.md)。
