# 阶段 1：生产构建基线

状态：阶段 1 于 2026-09-13 在本轮公开页面与构建测量范围内完成，进入阶段 2 依赖审计。已完成首次构建、5 次重复构建计时、客户端 JS/CSS 原始及固定参数压缩体积统计、bundle 分析练习及归档、三个公开页面的 HAR 核对，以及文章详情单次 Lighthouse 报告。认证异常按用户要求暂不展开，管理员场景未完成验收；公开页人工检查不等同完整回归。

## 源码与环境

- 测量日期：2026-09-12。
- commit：`40c3e259b3e2e70f12c90b1c6dee4abd0065bd2d`。
- 分支：`perf/frontend-build-learning`。
- 锁文件 SHA-256：`2e3259ff1ad637d3148aa4829569d94a5199c5d1a22a6170c186c3081dcf3839`。
- 系统：Windows 10 企业版 LTSC，10.0.19044，x64。
- CPU：i9-13980HX，24 核、32 逻辑处理器；内存：15.62 GiB。
- Node：v24.18.1；npm：11.16.0；Git Bash：5.2.37(1)-release。
- 命令：`npm run build`，由 `scripts/measure-build.sh` 包装记录。
- API 地址：`http://localhost:8787/api`；构建版本标记：`perf-baseline`。
- 计时范围：Bash time 测量构建命令，包含 npm 启动和重定向日志写入，不包含前置环境信息采集。
- 工作区状态：非干净工作区，原始记录包含文档、Git 配置文件及测量脚本等改动。5 次 source-status.txt 内容一致；核对时 app、nuxt.config.ts、package.json、package-lock.json 相对 baseline 未显示差异。
- Git 状态清单不能替代源码快照；后续对照实验还需保留测量脚本版本与相关未提交内容。

## 首次构建：单独保留

| 编号 | 耗时 | 退出码 | 缓存条件 |
| --- | --- | --- | --- |
| build-first | 9.901 秒 | 0 | Existing caches; not cleared |

此处“首次”指本轮第一次记录，不代表冷构建。供电、电源模式、后台负载未记录，本次事后确认不扩展到该样本。

日志中 Client built 为 1950 ms，Server built 为 554 ms。它们是子阶段耗时，不能相加当成完整构建耗时，也不能把总耗时减去它们的结果直接等同于 Nitro 耗时。

## 5 次重复构建

缓存标签一致：`Repeated build; caches not cleared`。5 次提交、锁文件哈希、工具版本、API 地址和 release 配置一致。

| 编号 | 耗时（秒） | 退出码 |
| --- | ---: | ---: |
| build-01 | 6.949 | 0 |
| build-02 | 6.871 | 0 |
| build-03 | 6.893 | 0 |
| build-04 | 6.976 | 0 |
| build-05 | 6.984 | 0 |

- 中位数：6.949 秒。
- 最小值：6.871 秒；最大值：6.984 秒。
- 极差：0.113 秒，约为中位数的 1.63%。这只是该组的波动描述，不是统计置信区间或通用改善阈值。
- 首次样本不并入这 5 次重复构建的汇总。

### 运行条件的事后补充

原始 JSON 的 notes 仍是示例占位文字。用户在运行后确认，这 5 次构建均插着电，使用最高电源模式。此说明为事后补充，未修改原始 JSON。

- 供电：插电。
- 电源模式：最高电源模式（沿用用户描述，未核实系统中的具体选项名称）。
- 后台负载、开发服务器是否运行：未知。

后续测量在运行前将真实条件填入 PERF_NOTES，尽量保持条件一致。如果开始另一组不同条件的实验，使用新编号并单独汇总。

## 客户端产物原始体积

2026-09-12，用户在重复构建后统计 `.output/public/_nuxt` 下的 JS/CSS 文件，教练核对当前文件结果一致。单位采用实际字节数及 KiB（1 KiB = 1024 B）。

| 类型 | 文件数 | 原始字节 | 原始 KiB |
| --- | ---: | ---: | ---: |
| JS | 18 | 248706 | 242.88 |
| CSS | 4 | 34576 | 33.77 |

此统计覆盖该目录的所有 JS/CSS，不是首页请求清单，不包含 HTML、图片等其他资源，也不代表 gzip/Brotli 传输体积。

### 较大的文件及构建映射

| 文件 | 原始字节 | 构建映射中的归属 |
| --- | ---: | --- |
| BAEg6M9T.js | 206230 | Nuxt 应用入口 chunk |
| entry.BCNpZ84U.css | 30210 | 入口关联 CSS |
| wrYOuu6I.js | 9371 | pages/admin/index.vue |
| DD5pSaoc.js | 5438 | pages/posts/[slug].vue |

归属根据本次构建生成的 client manifest/precomputed 映射核对。哈希文件名属于本次产物标识，后续构建可能变化，比较时应按模块角色定位。

入口 JS 占该目录全部 JS 原始字节的约 82.92%，因此优先分析其依赖组成。这不表示 82.92% 都可以优化，也不证明存在无用依赖。页面已经有路由分块，后续需要评估额外拆分的增量收益。

## 入口文件离线压缩估算

用户在 Git Bash 运行 `node scripts/measure-build.mjs .output/public/_nuxt/BAEg6M9T.js` 后提供输出；教练只读检查脚本，没有代为重跑测量。

| 指标 | 字节数 | KiB |
| --- | ---: | ---: |
| 原始文件 | 206230 | 201.40 |
| gzip，level 9 | 77937 | 76.11 |
| Brotli，quality 11 | 69135 | 67.51 |

Node 为 v24.18.1。脚本以 Buffer 读取文件，对压缩前后的 Buffer.length 计数，计算口径正确。原始大小与正常构建产物及 HAR 入口正文一致。

原始用户输出：

```json
{"path":".output/public/_nuxt/BAEg6M9T.js","node":"v24.18.1","brotliParamQuality":11,"rawBytes":206230,"gzipBytes":77937,"brotliBytes":69135}
```

本次 gzip level 9 从已审阅的脚本确认，原始 JSON 未记录该参数。用户随后将脚本实现交由教练完成，现已补充参数记录与离线估算说明，并扩展目录统计；上述原始输出不改写。

这是相同入口文件采用两种固定参数压缩的估算，不是代码优化前后对比，也不是服务器已启用压缩的证据。

## 全量客户端文件离线压缩估算

2026-09-12，用户授权教练完成 `scripts/measure-build.mjs`。教练运行 `node scripts/measure-build.mjs .output/public/_nuxt` 核对当前正常构建产物，并保存完整 stdout 到 `.perf-results/baseline/client-compression-coach-20260912.json`。这是教练执行的产物测量，不是用户新增的构建计时样本。

| 类型 | 文件数 | 原始 B | gzip B | Brotli B |
| --- | ---: | ---: | ---: | ---: |
| JS | 18 | 248706 | 96872 | 85507 |
| CSS | 4 | 34576 | 6261 | 5298 |
| 合计 | 22 | 283282 | 103133 | 90805 |

Node v24.18.1，zlib 1.3.1-e00f703，Brotli 1.2.0；gzip level 9、Brotli quality 11，其余采用该运行时的默认参数。结果记录脚本 SHA-256、各文件 SHA-256、完整清单、分类汇总及按原始大小排序的 Top 10。

每个文件分别压缩后累加，不是首屏资源量、HTTP 传输量或发布归档大小。原始总量与已有基线相同，入口压缩结果与用户的单文件结果相同。

脚本验证覆盖嵌套目录、UTF-8 字节计数、扩展名筛选、分类汇总、Top 10 排序、单文件输入，以及缺少参数、空目录、不存在路径和不支持文件类型。临时验证夹具最初因 Windows 文本写入转换换行导致预期字节数不一致，改为写入明确的字节后验证通过；未因此修改压缩实现。

## 首页网络样本：带管理员界面，非匿名基线

原始 HAR 原位置：`.perf-results/baseline/home-first.har/localhost.har`（home-first.har 是目录）。用户随后确认误删了原文件；以下统计来自删除前的解析记录，目前无法从原 HAR 重新复核。保留为历史观察，不作为后续优化对比的原始证据。

- 页面 URL：`http://localhost:3000/`。
- HAR 导航开始时间：2026-09-12T11:00:38.453Z。
- HTML 中的 app-release：`perf-baseline`，与正常预览构建标记一致。
- HAR User-Agent：Edge 152 / Chromium 152，Windows x64；完整浏览器补丁版本未单独记录。
- 共 14 个请求，全部来自 `http://localhost:3000`，状态均为 200。
- 用户事后确认：采集时首页显示 LOGOUT 和 ADMIN；随后点击 ADMIN 被跳转到登录页。因此此样本不是匿名界面样本，也不能认定为已验证的有效管理员会话。
- HAR 未提供足够信息独立证明无痕模式、无扩展、视口、限速或严格的 load 后 5 秒观察窗口，这些条件尚未完整记录。

| 资源类型 | 请求数 | 内容大小（B） | HAR _transferSize 合计（B） |
| --- | ---: | ---: | ---: |
| HTML document | 1 | 4677 | 4861 |
| JavaScript | 9 | 227506 | 230298 |
| CSS | 1 | 30210 | 30515 |
| 图片 icon.svg | 1 | 11643 | 11886 |
| 其他 favicon.ico | 1 | 15086 | 15340 |
| 构建元数据 JSON | 1 | 88 | 381 |
| 合计 | 14 | 289210 | 293281 |

内容大小汇总来自 HAR response.content.size，传输量采用浏览器导出的 response._transferSize。两者属于不同口径，不把响应头等开销算成资源正文。该样本的 JS 内容约 222.17 KiB，全部资源传输量约 286.41 KiB。

### 入口压缩与缓存

- 入口请求为 `/_nuxt/BAEg6M9T.js`，content.size 与 bodySize 都为 206230 B，_transferSize 为 206544 B。
- 入口响应没有 Content-Encoding，结合响应正文大小与磁盘文件一致，可判定本次本地入口响应没有应用 gzip/Brotli 内容压缩。
- 本次 HAR 中所有响应均未出现 Content-Encoding。此结论仅针对本地预览样本，尚未检查线上反向代理或 CDN。
- 哈希 JS/CSS 响应带有 `Cache-Control: public, max-age=31536000, immutable`，已经具有长期缓存策略；不能把未启用内容压缩等同于没有缓存配置。
- HAR 的 DOMContentLoaded 约 79.92 ms，load 约 159.25 ms。单次本地事件时间不等于 LCP、INP 或线上真实用户表现。

### 额外页面代码与样本边界

9 个 JS 中包含文章列表 chunk `aCVGVxv4.js`、后台管理 chunk `wrYOuu6I.js` 及管理员中间件 `SDcUMYXl.js`，相关请求的 initiator 类型为 script。

结合当前 NavBar 使用 NuxtLink 的实现和用户确认的 ADMIN 可见状态，可见链接预取是这些页面代码加载的合理解释。ADMIN 链接由 isAdmin 条件控制，而客户端用户插件会尝试从 localStorage 恢复用户状态。仅凭本 HAR 仍无法还原具体触发路径或证明会话有效；不把上述解释记作已追踪验证的调用栈。[NuxtLink 预取机制](https://nuxt.com/docs/4.x/api/components/nuxt-link)

用户明确将“页面显示管理员状态，但进入后台被跳转到登录页”的认证行为排除在本次讨论范围之外。本轮只记录现象，不修改或排查认证代码。

该 HAR 已误删，保留上述文字记录。后续使用独立的匿名首页 HAR 固定对比场景。

不能将所有记录到的 JS 都直接标记为渲染首页必需，也不能为了得到更小的数字直接从基线删除预取请求。应按用户场景记录其资源成本，并将渲染需要与提前为后续导航加载区分开。

用户此前提供的面板汇总为 55 请求、约 1.5 MB，JS 为 31 请求、约 940 kB；该组数据与本 HAR 的条目数和事件时间不同，暂不能合并。HAR 中没有那两个 index-*.js 或扩展来源请求，无法据此证明此前的额外请求来自插件。保留此前汇总为来源未确认的观察，不作为已核验的首页基线。

## 首页网络样本：匿名场景重新采集

实际文件：`.perf-results/baseline/home-first.har/home-anonymous.har`。用户按匿名采样步骤重新导出后，教练只读解析并核对；文件仍在 home-first.har 目录内，无需为更名重新采样。

- 页面 URL：`http://localhost:3000/`；导航开始时间：2026-09-12T11:13:43.120Z。
- HTML 中 app-release 为 `perf-baseline`，导航文字包含 LOGIN，不含 LOGOUT、ADMIN。此为 SSR HTML 证据，不能单独证明 hydration 后界面或浏览器会话状态。
- 本轮要求全新无痕会话、Disable cache、No throttling、关闭 Preserve log、All 筛选，刷新后等待 load + 5 秒且不交互。用户报告已保存文件，具体视口与上述设置仍待本人确认；HAR 不能独立证明完整操作条件。
- 用户随后确认：首页显示 LOGIN、无 ADMIN，首页与文章列表采样期间窗口大小不变。具体视口像素未记录，其余操作条件按本轮指引执行，未独立核验。
- 12 个请求，全部来自 `http://localhost:3000`，全部状态为 200。

| 资源类型 | 请求数 | 内容大小（B） | HAR _transferSize 合计（B） |
| --- | ---: | ---: | ---: |
| HTML document | 1 | 4677 | 4861 |
| JavaScript | 7 | 217904 | 220077 |
| CSS | 1 | 30210 | 30515 |
| 图片 icon.svg | 1 | 11643 | 11886 |
| 其他 favicon.ico | 1 | 15086 | 15340 |
| 构建元数据 JSON | 1 | 88 | 381 |
| 合计 | 12 | 279608 | 283060 |

JS 内容大小为 212.80 KiB，全部资源传输量为 276.43 KiB。DOMContentLoaded 约 77.92 ms，load 约 144.88 ms，仅作为本次本地事件时间记录，不用于声称性能改善。

入口仍为 BAEg6M9T.js，正文 206230 B、传输量 206544 B，没有 Content-Encoding。本次所有响应均无 Content-Encoding；哈希 JS/CSS 仍带长期缓存响应头。

与旧样本的文字记录相比，本次没有后台页面 wrYOuu6I.js（9371 B）和管理员中间件 SDcUMYXl.js（231 B），JS 内容恰好少 9602 B。入口大小未变，不能把登录界面场景变化带来的请求差异记为代码优化收益。旧 HAR 已丢失，这一比较仅基于先前汇总及当前文件。

本次仍加载文章列表 aCVGVxv4.js 和 posts service D-wdG-40.js，二者 initiator 为 script，开始时间晚于 load。与链接预取的解释一致，但当前 HAR 未证明完整触发链；将它们纳入本次观察窗口的资源成本，不直接称为首页渲染必需代码。

## 文章列表网络样本：匿名场景

实际文件：`.perf-results/baseline/home-first.har/posts-anonymous.har`，已只读解析核对。用户确认 LOGIN、无 ADMIN，窗口大小与首页采样一致。

- 页面 URL：`http://localhost:3000/posts`；导航开始时间：2026-09-12T11:22:47.581Z。
- HTML 中 app-release 为 `perf-baseline`，包含文章详情链接及 Nuxt 内联数据脚本。
- 14 个请求，全部来自 `http://localhost:3000`，全部状态为 200。

| 资源类型 | 请求数 | 内容大小（B） | HAR _transferSize 合计（B） |
| --- | ---: | ---: | ---: |
| HTML document | 1 | 4731 | 4915 |
| JavaScript | 8 | 223342 | 225826 |
| CSS | 2 | 30239 | 30844 |
| 图片 icon.svg | 1 | 11643 | 11886 |
| 其他 favicon.ico | 1 | 15086 | 15340 |
| 构建元数据 JSON | 1 | 88 | 381 |
| 合计 | 14 | 285129 | 289192 |

JS 内容大小为 218.11 KiB，全部资源传输量为 282.41 KiB。DOMContentLoaded 约 106.22 ms，load 约 174.36 ms。所有响应均未出现 Content-Encoding，入口正文仍为 206230 B。

### 与首页的资源差异

- 观察窗口内比首页多文章详情 DD5pSaoc.js（5438 B）和详情 CSS _slug_.C6XpIQV4.css（29 B），二者 initiator 均为 script。
- 列表 chunk 与 posts service 在本次由 parser 发起加载；首页 chunk IpYfVnbp.js 在本次由 script 发起加载。说明即使相同文件出现在两个页面的 HAR 中，其加载用途也可能不同。
- 当前列表页使用 NuxtLink 指向文章详情，可见链接预取是额外详情资源的合理解释；未追踪具体调用栈，不把所有资源都列为列表渲染必需。

### API 请求观察

本 HAR 没有浏览器发往 localhost:8787 的业务 API 请求，唯一 fetch 条目是 Nuxt 构建元数据。当前列表页在 setup 中 await PostApi.getList()，后者使用 useAPI('posts')，结合 HTML 已有文章链接，与 SSR 获取列表并通过 Nuxt 数据传递供客户端复用的流程一致。浏览器 HAR 不能记录 Nuxt 服务端向 Worker 发起的请求，因此不能据此断言后端没有被调用或后端请求耗时为零。

详情页已按以下固定文章采集，后续对比保持同一文章及内容。

## 文章详情网络样本：匿名场景

实际文件：`.perf-results/baseline/home-first.har/post-detail-anonymous.har`，已只读解析核对。沿用匿名、窗口大小不变的采样约定；用户确认 Network 中能看到评论请求。

- 页面：`http://localhost:3000/posts/测试文章-37236f02`（HAR 中中文路径为百分号编码）；标题为“测试文章”。
- 导航开始时间：2026-09-12T11:26:25.409Z；HTML 的 app-release 为 `perf-baseline`。
- 15 个请求，全部状态为 200；其中 14 个来自 localhost:3000，1 个评论请求来自 localhost:8787。

| 资源类型 | 请求数 | 内容大小（B） | HAR _transferSize 合计（B） |
| --- | ---: | ---: | ---: |
| HTML document | 1 | 42004 | 42189 |
| JavaScript | 8 | 223342 | 225826 |
| CSS | 2 | 30239 | 30844 |
| 图片 icon.svg | 1 | 11643 | 11886 |
| 其他 favicon.ico | 1 | 15086 | 15340 |
| 构建元数据 JSON | 1 | 88 | 381 |
| 评论 API | 1 | 61 | 314 |
| 合计 | 15 | 322463 | 326780 |

JS 内容大小为 218.11 KiB，全部资源传输量为 319.12 KiB。DOMContentLoaded 约 112.41 ms，load 约 204.63 ms。上述事件时间为单次本地观察。

### 评论请求与压缩边界

- 浏览器发起 `GET http://localhost:8787/api/posts/3/comments`，HTTP 200，响应业务 status 为 200，data 是空数组。该样本覆盖成功返回空评论，不覆盖有评论或失败场景。
- HAR 请求耗时约 14.73 ms，为浏览器观测到的请求总时长，不能直接当作 Worker 函数执行时间。
- 详情页调用 CommentApi.getList 时传入 server:false、lazy:true；其中 server:false 决定不在 SSR 阶段请求评论，符合本次浏览器观测。lazy:true 不能解释为滚动到评论区才加载。
- 评论 API 响应带 `Content-Encoding: gzip`，而本次 localhost:3000 的入口及其他响应没有 Content-Encoding。应分别记录两个服务的响应，不能笼统声称项目全部请求未压缩。

### HTML 与 JS 的不同成本

本次列表页与详情页观察窗口内加载的 JS 文件集合及总字节一致，详情页中的首页和列表 chunk 由 script 发起，详情 chunk 由 parser 发起。这不代表两个页面的渲染成本相同。

详情 HTML 为 42004 B，列表 HTML 为 4731 B。详情 HTML 内 `__NUXT_DATA__` 脚本内容按 UTF-8 计为 23808 B（不含 script 标签），已包含在 HTML 正文字节中，不能重复相加。该数值是整个 Nuxt 内联数据脚本的大小，不能全当成可删除的文章冗余字段；后续 payload 阶段需核对数据结构与实际使用字段。

三个公开页面的网络采样已核对，尚无代码优化或优化收益。下一步补齐客户端文件的固定参数压缩估算，并继续核对阶段 1 的其余验收项。

### 已报告的功能检查

用户报告正常构建 preview 下首页、文章列表和文章详情能正常运行，属于人工检查结果。尚未据此声称执行过自动化冒烟测试或完整后台写操作回归。

## 文章详情 Lighthouse：单次桌面实验

原始文件：`.perf-results/baseline/lighthouse-post-desktop-01.json`。用户操作并导出，教练读取报告，没有代为重新运行浏览器审计。

- Lighthouse 13.4.1；fetchTime：2026-09-12T13:21:29.957Z。
- 请求和最终页面均为 `http://localhost:3000/posts/测试文章-37236f02`；无 runtimeError，runWarnings 为空。
- formFactor 为 desktop，throttlingMethod 为 simulate；配置 RTT 40 ms、吞吐量 10240 Kbps、CPU slowdown multiplier 1。此为 Lighthouse 模拟条件，不与之前 HAR 的 No throttling 事件时间混算。
- 实际 onlyCategories 包含 performance、accessibility、best-practices、seo，未按原指引仅选择 Performance。报告有效，按实际配置记录；后续若用此样本对比，应保持四项类别一致。
- hostUserAgent 为 Windows 上 Edge/Chromium 152。网络请求 UA 的 Mac 标识不能作为真实操作系统依据。
- screenEmulation.disabled 为 true，不能把同一对象内的 mobile:true、412×823 字段当成实际生效的移动端视口。

| 指标 | 本次结果 |
| --- | ---: |
| Performance 分数 | 100 / 100 |
| FCP | 547.87 ms |
| LCP | 626.75 ms |
| Speed Index | 547.87 ms |
| TBT | 0 ms |
| CLS | 0 |

该次加载表现良好，但只是本地单次模拟实验。TBT 不是 INP；没有交互采样和线上用户分布，不能声称所有场景流畅或线上 Core Web Vitals 达标。若后续要报告加载指标改善，需按同一配置补充重复采样，当前分数也不能写成优化成果。

### 报告建议的解释与优先级

- unused-javascript 将入口 BAEg6M9T.js 标记为预计可节省 64735 B（约 63.22 KiB）。这反映本次加载覆盖范围内未使用的代码，不是可直接删除的清单；需要结合交互、其他路由和模块引入链验证。报告 metricSavings 的 FCP/LCP 为 50 ms，而 opportunity overallSavingsMs 为 40 ms；均是工具估算，不是实际优化结果。[Coverage 说明](https://developer.chrome.com/docs/devtools/coverage)
- 文档请求未压缩，报告估算字节节省为 28143 B，与此前本地 HTML 未压缩的观察一致；本次该建议对 FCP/LCP 的估算收益均为 0 ms。后续按传输成本及实际部署配置评估，不据此声称存在明显加载瓶颈。
- icon.svg 缓存 TTL 报为 0、大小 11886 B；应与已经长期缓存的哈希 JS/CSS 区分。本次相关 FCP/LCP 节省估算为 0 ms。
- logo 缺少显式 width/height 属性被提示，但本次 CLS 为 0；只记录潜在布局稳定性检查项，不声称已观察到偏移。
- 入口 CSS 被列为渲染阻塞请求，表中的 163 ms 不是可直接获得的 LCP 改善量；该项 metricSavings 的 FCP/LCP 均为 0 ms，暂不据此改变加载方式。
- LCP 元素定位为文章正文的 `div.post > p`。报告 breakdown 来自观察数据，不强行与模拟后的 LCP 626.75 ms 相加核对。

### 归档核对

`.perf-results/baseline/assets-before-analyze/_nuxt` 中 22 个 JS/CSS 与当前正常构建产物逐文件 SHA-256 一致。此结论仅覆盖 JS/CSS，不表示两个构建的元数据 JSON 相同。

2026-09-13 已确认 `.perf-results/baseline/bundle-report` 包含 client.html、nitro.html、meta.json，三个文件的 SHA-256 均与缓存目录原报告一致，归档核对完成。缓存中的报告后续可被重建，引用时使用已归档副本。

## 当前可支持的结论

在上述 Windows 环境和保留现有缓存的条件下，5 次连续生产构建全部成功，中位数为 6.949 秒，范围为 6.871～6.984 秒；后台负载未记录。

当前没有修改构建实现，不能把相对 build-first 变快写成代码优化收益。缓存和机器状态可能影响差异，尚未单独验证原因。

首次日志中的 `Total size: 2.93 MB (734 kB gzip)` 是本地 Nitro 对服务端输出目录的统计，包含其运行依赖；gzip 是逐文件压缩大小累加。它不等于浏览器首屏传输量，也不等于整个 .output 的发布归档大小。

构建成功不等于页面功能验收通过。日志中的 npm 用户配置警告和 sourcemap 警告作为基线现象保留，尚未开展专项排查。

## 原始证据与下一步

原始结果位于项目本地 `.perf-results/baseline/`，每个 run-id 目录保存 result.json、environment.json、source-status.txt、elapsed.txt 和 build.log。该目录被 Git 忽略；分享或长期归档时，需要另行保存证据并关联源码版本，不能只依赖本文汇总。

固定参数压缩统计、正常构建 JS/CSS 快照一致性及 bundle 报告归档已核对。三个公开页面有网络证据和用户报告的人工可用性检查；性能数据只覆盖固定详情页的单次 Lighthouse 实验，管理员与完整交互回归不在本次已完成范围内。

2026-09-13 进入阶段 2，第一组审计对象为根项目 Prisma/MariaDB 相关依赖及 dotenv 的配置用途。先追踪旧 server、生成客户端、CLI 配置和 CI 引用，形成保留或删除依据，再由用户修改。当前没有可报告的优化收益；若计划声称安装时间改善，须在卸载前另建同条件安装基线。
