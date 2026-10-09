# 首页主线程诊断：线上 gzip 生效后

状态：已完成三次线上录制与本地字体对照（2026-10-09）。线上初始 Layout 在 58–63 ms；本地临时替换为 Arial 未获收益，保留原字体。未修改应用代码，尚未确定线上布局耗时的内部原因。

## 1. 假设与证据

验证用户最初的“水合可能占用较多首屏时间”假设。读取既有录制，不重新导航、不修改代码、不把脚本总耗时当作水合耗时。

- 原始文件：`.perf-results/home-first-screen/production-main-thread-01.json`，3,629,272 B。
- SHA-256：`beb26ac3d994f315e25139b855f25d2abf1cc9866be0fc48d24f66961119e123`。
- 解析脚本：`.perf-results/home-first-screen/analyze-main-thread-20261007.mjs`，执行 `node` 加同一路径，退出 0。
- 派生结果：`.perf-results/home-first-screen/production-main-thread-01-analysis.json`，包含任务区间、嵌套事件、CPU 样本调用栈、请求时序；原始录制未覆盖。
- 导出时间：2026-10-07 12:26:45.772（北京时间）。目标为 `https://gerden-shop.cn/`。

## 2. 环境与口径

录制 metadata 确认 CPU 4 倍降速、快速 4G（下载 1,012,500 B/s、上传 168,750 B/s、latency 165 ms，另记录 targetLatency 60 ms）。主页面 viewport 事件约为 1689.33 × 282 CSS px，DPR 1.5；另一个 48 × 48 的 viewport 不是主页面，不混为一谈。实际视口明显不同于此前本地实验。

按练习要求使用未登录窗口，但原始 trace 不独立证明登录状态。所列页面请求均为 200、fromCache=false、fromServiceWorker=false；连接已复用，不能称为 DNS/TLS 全冷启动。浏览器版本、机器后台负载、供电与服务器缓存状态未独立确认。

以主页面非空 URL 的 navigationStart 为时间零点（ts=18693514551 µs，pid=24856，tid=2488），按相同 navigationId 匹配 FCP/LCP。只读取目标渲染主线程的 RunTask，CPU ProfileChunk 通过 profile id 关联，不根据 chunk 所在 tid 判断采样线程。保留原始事件时间，采样次数用于识别调用栈，不换算成精确水合时间。

## 3. 时间线

| 事件 | 相对导航的时间 | 说明 |
| --- | ---: | --- |
| HTML 收到响应事件 | 199.179 ms | 事件送达渲染线程的时刻，不等同精确网络 TTFB |
| CSS 网络接收结束 | 418.635 ms | gzip；入口样式标记为 renderBlocking=blocking |
| 最大主线程任务 | 423.003–493.489 ms | 总长 70.486 ms，以布局为主 |
| FCP / LCP | 505.293 ms | 同一时刻；LCP 是主标题下的副标题 p |
| 入口 JS 网络接收结束 | 509.601 ms | ResourceFinish 事件稍后在 515.029 ms 送达 |
| 模块执行事件 | 521.467–535.720 ms | v8.evaluateModule，14.253 ms |
| 较长 JS 任务 | 567.038–621.987 ms | 54.949 ms；内部 RunMicrotasks 53.935 ms |
| 后续 JS 任务 | 623.591–660.881 ms | 37.290 ms；内部 RunMicrotasks 35.481 ms |

网络结束使用 ResourceFinish.args.data.finishTime，不把晚到的 ResourceFinish 事件时间当作字节抵达时刻。入口 trace 传输量 88,868 B、解压正文 206,248 B；包含头部的传输量不等于此前独立探测的 gzip 正文 88,544 B。

## 4. 任务归属与结论

导航后录制窗口中有两个超过 50 ms 的 RunTask。最大的 70.486 ms 任务内部，UpdateLayoutTree 为 6.451 ms、Layout 为 59.454 ms；Layout 明确归属主页面 frame，dirtyObjects=77、totalObjects=77、partialLayout=false，布局根为 #document。嵌套的 LocalFrameView::performLayout 是同一次工作，不能再加一次。

这表明 LCP 前可见的大块主线程工作是初始样式计算和布局。现有数据没有证明布局抖动、强制同步布局、某个 CSS 规则或 DOM 数量是问题根源；单次 4 倍降速下的 59 ms 不足以直接确定改法。

567 ms 后的 CPU 样本包含入口中的 `mount`、`t.mount`、`run`、`callHook` 和 `callHookWith` 调用链，后续还出现组件 setup 与定时器、requestIdleCallback 调度。它们与应用初始化、组件挂载/水合相关，但混合了不同工作，不能将 54.949 ms 或相邻任务之和宣称为精确水合耗时。没有用本地不同哈希的入口产物去解释线上压缩函数的位置。

本次文字 LCP 先于入口网络接收结束，也先于上述模块执行/挂载任务。把 LCP 后的这段 JS 加速，不能直接消除已经发生在 LCP 前的布局成本；不过 LCP 后主线程繁忙仍可能影响早期交互，本次未测 INP。单次线上 505 ms 与此前本地或更早线上记录不构成受控前后对比，不能据此计算 gzip 的 LCP 收益。

## 5. 下一步练习

在原录制中定位导航后约 430 ms 的 Layout 与约 568 ms 的 RunMicrotasks，分别查看 Summary 和调用栈，说明渲染工作与脚本工作的区别。Main 轨道按类别着色，事件详情及 Bottom-up 可辅助定位：[Chrome Performance 文档](https://developer.chrome.com/docs/devtools/performance/reference)。

暂不增加 Lazy、memo 或 CSS containment。若继续追查 Layout，先固定视口重复录制，确认 59 ms 是否可复现，再定位具体原因；本次记录保留。此前本地 CSS 内联方案与当前线上外部 CSS 仍是不同版本，不能混合归因。

## 6. 重复录制核对（2026-10-09）

用户补充 `production-main-thread-02.json`（3,648,893 B，SHA-256 `a1cfacd2eecb794f052373117e11188f3ae0b71bc97a30d081b09662dce564de`）和 `production-main-thread-03.json`（3,915,891 B，SHA-256 `cc072b6bcc2dbbd0804066c05aa64c301ed8529f78a0323956f2801c7ee0ce3e`）。录制起始时间分别为北京时间 10:52:26.684 与 10:53:09.844。

执行 `.perf-results/home-first-screen/compare-main-thread-20261009.mjs`，退出 0，派生数据保存为同目录 `production-main-thread-repeat-20261009-01.json`，未覆盖原始录制与第 1 次分析。按主页面 frame 过滤 Layout，排除内部 SVG 等子文档布局；未将嵌套的 performLayout 重复计数。

三次均为 CPU 4 倍降速、相同快速 4G 参数、主页面约 1689.33 × 282 CSS px / DPR 1.5。LCP 均为相同副标题 p，候选面积 48,514；入口 JS/CSS 路径、ETag、Last-Modified、解压大小相同，均 gzip；请求全部 200、未命中浏览器或 Service Worker 缓存。trace 不含响应正文哈希，不能将 ETag 核对表述为重新验证正文哈希。

| 指标（ms） | 01 | 02 | 03 |
| --- | ---: | ---: | ---: |
| 初始 Layout 耗时 | 59.454 | 62.818 | 58.356 |
| 包含该布局的整段任务耗时 | 70.486 | 71.238 | 70.449 |
| CSS 网络接收结束 | 418.635 | 395.775 | 426.320 |
| LCP | 505.293 | 485.015 | 508.375 |
| 入口 JS 网络接收结束 | 509.601 | 847.126 | 524.398 |
| 主文档后续 Layout 耗时 | 0.402 | 0.212 | 0.215 |

初始 Layout 中位数 59.454 ms，范围 58.356–62.818 ms。每次初始布局 dirtyObjects=77、totalObjects=77，之后只有一次不足 0.5 ms 的主文档布局；没有连续昂贵布局的证据。77 是布局对象数量，不等同 DOM 元素数量。Layout 内部仅记录 performLayout，没有字体整形等更细分子事件，无法由这份录制直接归因到字体或某条 CSS。

LCP 中位数 505.293 ms、范围 485.015–508.375 ms。02 的入口 JS 明显更晚下载完成，而文字仍在 485 ms 出现，再次说明该文字呈现不等待入口执行。网络耗时差异原因未调查；不能假定完全相同网络状态，也不能把 LCP 差异归为优化收益。

决策：约 60 ms 的首次布局在现有设备/视口/限速条件下可复现，进入原因排查；三次跨两天，后台负载与浏览器内部缓存未完全控制，不能推广为所有设备固定成本。没有应用代码修改，不计算优化百分比。

下一项小练习：核对副标题实际使用的字体。当前源码在首页 section 使用 `font-serif`，但 CSS 候选字体列表不等于浏览器实际选中的字体；在 Elements 选中副标题 p，打开 Computed 底部 Rendered Fonts，记录 Font family 与 Font origin。字体测量/选择只是待检验方向，不先断言换字体会加速；当前录制也未出现独立字体网络请求。[Chrome 查看实际字体说明](https://developer.chrome.com/docs/devtools/rendering/apply-effects#disable-local-fonts)

### 实际字体反馈（2026-10-09）

用户从副标题 Rendered Fonts 反馈：Family name=Georgia，PostScript name=Georgia，Font origin=Local file（88 glyphs）。这确认该段文字使用本地 Georgia，与录制中未出现字体网络请求一致；不代表字体选择、字形测量和换行计算没有成本，也不证明初始 Layout 的约 60 ms 主要由 Georgia 导致。

拟定下一项诊断对照：在隔离的本地预览中，临时将首页及导航使用的 `.font-serif` 统一指定为 `Arial, sans-serif`，与原字体比较；先由用户预测 Layout/LCP 的变化及视觉代价，再实施。覆盖首页所有同类字体是为了避免只改副标题而其他区域仍初始化原字体。固定文本、字号、行高、视口、CPU/网络和缓存条件；字体本身会改变字宽和换行，需记录 LCP 元素及排版变化，不能将差异简单解释为字体文件处理速度。此处仅为诊断提案，尚未修改字体或运行对照，也未决定替换博客字体。

## 7. 本地字体对照完成（2026-10-09）

用户假设：字体主要影响绘制，若宽高不同可能影响布局，但换字体未必明显改变 Layout 耗时。讨论后明确字体参与字宽与换行计算；本次检验替换字体能否减少布局成本，不预设 Arial 更快。用户确认开始，本轮由教练执行已授权的测量工作。

### 来源和方法

- 复用已验收的 `css-inline-toast/output` 生产产物，包含 CSS 内联方案。HEAD 为 `3ab8f78b83583ed9a0edbe2f8b8ac5956d7bebc2`；锁文件、Nuxt 配置、main.css、NoticeContainer.vue 的当前哈希与验收快照全部一致，未重复构建。
- 本地启动该 Nitro SSR 服务于 3110，实验代理于 `http://127.0.0.1:3111/`。只在返回 HTML 的 head 末尾添加等字节长度的实验 style；A 为 `.font-serif{font-family:var(--font-serif)!important}`，B 为 `.font-serif{font-family:Arial,sans-serif!important}`。两组规则同样覆盖 3 个 font-serif 容器，分别为导航及首页两个 section。A 保持原字体计算结果。
- 两组 HTML 均为 19,828 B，去掉各自实验 style 后逐字一致；其他资源透传相同产物。本地未启用 HTTP 压缩，不与线上外部 CSS + gzip 的结果混算。
- Node v24.18.1、Windows 10.0.19044、i9-13980HX，Playwright Chromium 153.0.8010.12，无头模式。每次新启浏览器进程和匿名上下文，HTTP 缓存关闭、Service Worker 禁用。系统字体缓存、供电、后台负载未独立控制。
- 视口 1689 × 282 CSS px（比用户手动录制的宽度少 0.33 px），DPR 1.5，CPU 4 倍降速；网络 latency 165 ms、下载 1,012,500 B/s、上传 168,750 B/s。
- 顺序 ABBAABBAAB，每组 5 次；记录导航至 load 后 2 秒，无交互。停止 tracing 后读取实际字体与文本尺寸、保存截图，避免这些检查污染测量窗口。

执行 `node .perf-results/home-first-screen/font-ab-20261009.mjs` 退出 0。证据目录 `.perf-results/home-first-screen/font-ab-20261009-01/`：results.json、每次原始 trace、两版 HTML、A.png/B.png、frontend.patch、服务器日志。results 含源文件哈希、22 个客户端 JS/CSS 产物清单、环境、逐次请求及字体检查。补充布局窗口统计保存在 layout-window-analysis.json。

### 测量结果

| 指标（ms） | A 原字体：中位数 / 范围 | B Arial：中位数 / 范围 |
| --- | --- | --- |
| 第一次 Layout | 49.537 / 47.672–53.827 | 83.544 / 63.981–91.803 |
| 导航至 LCP 的 Layout 累计 | 50.305 / 49.317–53.827 | 83.544 / 63.981–91.803 |
| LCP | 296.827 / 278.221–298.551 | 321.731 / 316.631–345.988 |

各组按出现顺序的原始值：

- A 第一次 Layout：47.672、49.537、49.317、53.827、50.305；LCP：297.336、296.827、298.551、291.363、278.221。
- B 第一次 Layout：91.803、63.981、85.655、67.396、83.544；LCP：345.988、316.631、316.873、326.373、321.731。

首个 A 样本的第一次布局包含 69 个布局对象，随后还有一次短布局；其他样本首次均为 77。为防止只比较第一次漏掉工作，补算主文档 Layout 与 [navigationStart, LCP] 区间相交的时长之和，排除子文档和嵌套 performLayout。补算后仍不支持 Arial 更快。首个样本保留，没有删除偏高/偏低值。

### 内容和视觉核对

10 次实际平台字体检查均通过：A 副标题使用 Georgia，B 使用 Arial，均为本地字体、88 glyphs。检查使用 CDP CSS.getPlatformFontsForNode，不只依据候选 font-family。[协议说明](https://chromedevtools.github.io/devtools-protocol/tot/CSS/#method-getPlatformFontsForNode)

两组 LCP 始终为副标题 p，副标题均 2 行，容器宽 704 px、高 82.5 px，字号 30 px、行高 41.25 px。字形实际宽高不同，LCP 面积 A 为 49,096，B 为 48,100；截图还显示 About me 正文换行变化。因此它是字体与其排版后果的整体对照，不能宣称所有视觉结果完全相同或隔离了纯字体算法耗时。

两组观察窗口均为 7 个 JS 请求、解压正文共 218,045 B。所有运行无记录到的页面脚本错误、水合告警或 HTTP 错误；未命中磁盘/Service Worker 缓存。截图人工检查由教练完成，不等于用户的最终设计验收。源码哈希结束后复核不变，临时 SSR 与代理均已关闭。

### 决策和边界

本轮 Arial 的布局与 LCP 都更慢，没有证据支持为性能替换字体；保留 Georgia，实验规则仅存在于临时代理，不需撤回应用代码。不能推广成“Georgia 在所有浏览器和设备一定更快”，也不能据此断言线上约 60 ms 都是 Georgia 本身造成。

本轮已完成字体诊断对照，保留原始数据。后续优先整理已验证的 CSS 内联方案及上线前检查；如继续深挖原生 Layout 内部，则需要更细的浏览器跟踪证据，不能凭函数总时长反复猜测、替换样式。
