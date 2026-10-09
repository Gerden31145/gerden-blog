# 首页入口 JS 成本诊断

状态：已完成本地文件/HTTP 核对、入口 gzip 单变量实验、bundle 组成分析、通知条件异步加载的自动检查及首次使用等待对照。通知方案初始窗口 JS 仅减少 502 B、请求增加 1 个，首次触发到可见样式帧的中位数增加约 205.5 ms；用户已决定撤回，2026-10-06 执行并验证完成。CSS 内联实验独立保留，未部署本轮修改。

## 1. 问题与范围

面试中入口 JS 约 207 kB，需要区分源码组成、实际传输量和解析/执行成本。此前首页文字 LCP 在入口 JS 下载完成前出现，说明这段文字展示不以入口 JS 下载完成为前提；不能单凭入口文件大小认定其为 LCP 的主要瓶颈。

本轮先检查已验收 CSS 内联版本的入口文件和本地 HTTP 响应。没有以所有路由文件之和代替首页加载量，没有重新执行分析构建。

## 2. 环境与原始证据

- 来源：上一实验保存的 `.perf-results/home-first-screen/css-inline-toast/` 生产产物；源码身份、构建环境与差异见[CSS 内联实验](home-css-inline-2026-09-29.md)。
- 从保存的首页 HTML 的 `script type="module"` 定位入口，并确认本地正在提供的首页引用同一入口。
- 入口：`/_nuxt/C7AuO8xu.js`，SHA-256：`e3e5bdb0698d2cbe055a15661fcc5a1cfe5bd45177a68596c42a3e48eede6a57`。
- 脚本：`.perf-results/home-first-screen/inspect-entry-js-20261006-01.mjs`；执行命令为 `node .perf-results/home-first-screen/inspect-entry-js-20261006-01.mjs`，退出 0。
- 原始结果：`.perf-results/home-first-screen/entry-js-diagnostic-20261006-01.json`。
- HTTP 地址：`http://localhost:3000/_nuxt/C7AuO8xu.js`，由 Node HTTP 客户端读取响应体，非浏览器导航测试。不读取 Cookie，不包含响应头/TLS 开销或缓存命中测量。

## 3. 测量结果

| 口径 | 字节数 |
| --- | ---: |
| 入口文件原始大小 | 206248 |
| 离线 gzip（level 9） | 77939 |
| 离线 Brotli（quality 11） | 69119 |
| 本地 HTTP 实际响应体 | 206248 |

请求声明 `Accept-Encoding: gzip, br`；实际响应 200，没有 `Content-Encoding`，解码前后响应体大小相同，正文哈希与保存产物一致。`Cache-Control` 为 `public, max-age=31536000, immutable`。

离线压缩值只表明此文件可压缩到相应大小，不证明部署环境已启用压缩，也不证明相应压缩等级适合作为实时压缩配置。本轮没有重新核查线上响应，不能将本地结果推广到线上。

## 4. 当前判断与下一步

本地入口传输压缩有可验证的空间。下一次实验建议先保持 JS 内容不变，比较相同网络和冷缓存条件下，开启与关闭 HTTP 压缩时的实际编码、响应体大小、下载耗时和页面指标。由用户先预测哪些指标可能改变，再安排实验；不能预设 LCP 或水合 CPU 时间必然下降。

模块占比、是否有多余业务依赖、主线程长任务和水合耗时尚未在本轮诊断中测量。若要优化这些成本，需要进一步证据，不能用压缩率替代。

Network 面板可区分传输量与资源大小，并通过响应头检查编码，操作参考 [Chrome DevTools Network 文档](https://developer.chrome.com/docs/devtools/network/reference)。

## 5. 入口 gzip 对照实验（2026-10-06）

用户假设：“下载耗时会减少，JS 执行肯定是不变的，文字 LCP 按道理不受 JS 下载阻塞，应该也不变。”修正口径：代码内容不变，执行工作量预计基本不变，不保证测得耗时完全一致；JS 可能与关键资源争用带宽，因此也不保证 LCP 完全不变。需分别验证传输、执行与绘制指标。

### 方法

- 脚本：`.perf-results/home-first-screen/run-entry-gzip-ab-20261006-01.mjs`，同名命令 `node .perf-results/home-first-screen/run-entry-gzip-ab-20261006-01.mjs` 执行退出 0。
- 原始结果：`.perf-results/home-first-screen/entry-gzip-ab-20261006-01.json`，保存每次资源时序、响应编码、解码后哈希、请求清单、LCP、长任务与 CDP 指标。
- A 为不压缩入口，B 为同一入口预先 gzip（level 9）；其他响应内容与编码不变。HTTP 压缩保留原始内容，浏览器按 `Content-Encoding` 解码，见 [MDN Content-Encoding](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Encoding)。
- 两组均从内存提供同一份保存的 SSR HTML 和静态资源，地址 `http://127.0.0.1:3104/`。这是对保存响应的本地重放，双方均不含 SSR 计算、磁盘读文件或实时压缩成本；不能与之前实际 SSR 服务的计时混算。
- HTML 哈希为 `a74fde2c47b3d73dddf3c1c17ee811f5816cb7f2bd3ec65d906d1014176c085c`，入口解码后哈希与第 2 节一致。
- Node v24.18.1、Windows 10.0.19044、i9-13980HX、Chromium 153.0.8010.12；每次新启动无头浏览器和匿名上下文，禁用 HTTP 缓存并阻止 Service Worker。两组服务端均声明 `no-store`。操作系统缓存、供电和后台负载未独立控制。
- 视口 1365 × 768、DPR 1、CPU 4 倍降速；CDP 网络 latency=165 ms、下载 1,012,500 B/s、上传 168,750 B/s。
- 顺序 A、B、B、A、A、B、B、A、A、B，各 5 次；观察窗口为导航开始到 load 后 5 秒，不交互。自动预取纳入窗口，请求清单保留。
- 执行辅助指标为 CDP `ScriptDuration` 在窗口前后的差值，包含页面各脚本及观察代码，不能称为入口 JS 独占执行时间、水合耗时、TTI 或 INP。压缩改变到达时机，不保证运行调度和计时完全一致。

### 结果

| 指标 | A 未压缩 | B gzip |
| --- | ---: | ---: |
| 入口实际编码后正文 | 206248 B | 77939 B |
| 入口解码后正文 | 206248 B | 206248 B |
| 入口请求 duration 中位数 | 425.2 ms | 303.5 ms |
| duration 范围 | 415.1–429.1 ms | 286.8–310.4 ms |
| 入口 responseEnd 中位数（相对导航） | 621.1 ms | 514.7 ms |
| 文字 LCP 中位数 | 288 ms | 300 ms |
| LCP 范围 | 276–908 ms | 288–304 ms |
| 窗口累计 ScriptDuration 中位数 | 36.460 ms | 27.347 ms |
| ScriptDuration 范围 | 27.892–39.431 ms | 24.516–32.619 ms |

入口传输正文减少 128,309 B，约 62.21%；请求总耗时中位数减少 121.7 ms，约 28.62%。请求 duration 包含等待等阶段，不等于纯字节传输时间；CDP 模拟网络时序也不代表真实链路每个阶段的耗时。

按各版本出现顺序，原始 LCP：A 为 908、312、276、288、280 ms；B 为 296、288、300、304、304 ms。两组 LCP 均为 About me 段落。第 1 次 A 的 908 ms 偏高，同次记录到 108 ms 长任务；尚未定位偏高原因，不把两者直接视为因果，也不剔除该样本。其余 9 次 LCP 均早于入口下载完成。LCP 的 12 ms 中位数差异不足以证明稳定改善或退化。

累计 ScriptDuration 的中位数有差异、范围部分重叠，但这是全窗口累计指标，没有隔离入口执行与水合。不能将它包装为 gzip 使入口计算快了约 25%，也不能据此宣称执行耗时严格不变。

### 验收、决策与下一步

10 次页面加载均成功，没有 pageerror、捕获到的水合警告或 HTTP 错误；所有入口正文解码后哈希一致，浏览器记录的编码前后大小符合预期，未命中磁盘或 Service Worker 缓存。实验服务已关闭，原本本地预览未修改。

保留实验结论：压缩在此本地条件下减少传输量并使入口请求更早完成；未证实文字 LCP 收益，未证明水合 CPU 收益。预压缩本地重放不等于生产已开启 gzip，本轮不更改部署配置或宣称线上优化完成。

下一项可回到源码与 bundle 组成，确认入口实际包含哪些模块，再决定是否有值得减少或推迟执行的代码。本轮未运行新的 bundle 分析。

## 6. 当前版本入口组成分析（2026-10-06）

### 来源与验证

旧报告来自早期版本，因此重新执行 `node node_modules/@nuxt/cli/bin/nuxi.mjs analyze --name home-entry-20261006 --no-serve`。本地 Nuxt CLI v3.35.1 会把分析构建的入口改名为 `_nuxt/entry.js`，生成结果不作为浏览器性能测试或部署产物。

分析完成后执行 `npm run build` 恢复正常生产构建，两条命令均退出 0。环境保持 `NUXT_PUBLIC_API_BASE=http://localhost:8787/api`、`BUILD_RELEASE_ID=perf-home-css`。没有修改应用代码、依赖或构建配置，不比较本轮构建耗时。

新构建入口恢复为 `C7AuO8xu.js`，206,248 B，SHA-256 与此前 CSS/gzip 实验一致。锁文件、Nuxt 配置及本轮 CSS 涉及文件的哈希也与保存快照一致；HEAD 仍为 `3ab8f78b83583ed9a0edbe2f8b8ac5956d7bebc2`。正常构建恢复不代表分析入口与生产入口逐字相同，而是证明当前源码恢复的正常入口对应此前测量对象。

证据目录：`.perf-results/home-first-screen/entry-bundle-20261006-01/`，包含 `frontend.patch`、`source-hashes.json`、`head.txt`、`build-status.json`、两次构建日志，以及：

- `report/client.html`：可在浏览器打开的客户端交互式 treemap。
- `report/nitro.html`：服务端报告，不作为浏览器 JS 体积依据。
- `report/meta.json`：本次实际 buildDir/analyzeDir。
- `report/client-data.json`：从 HTML 提取的数据；`summary.json`：按包与模块归组的数据和引入关系；生成脚本 `summarize.mjs`。
- `production-client.manifest.mjs`：从实际 buildDir 复制的生产 manifest。最初误从根 `.nuxt` 复制的 `analyze-client.manifest.mjs` 是陈旧开发 manifest，已明确排除，不用它做映射；保留文件并在 summary 中标记。

### 体积口径与发现

已检查本地 Nuxt 的分析插件实现：先对每个模块代码独立 minify，再由 visualizer 计算模块字节。本报告 `sourcemap=false`，入口模块估算合计 **253,311 B**，实际正常入口为 **206,248 B**。逐模块估算不等于整包最终优化后的精确贡献，不能用下面数据除以 206,248 B 得到可靠占比；各模块 gzip 估算之和也不等于完整入口的实际 gzip 大小。[visualizer 参数说明](https://github.com/btd/rollup-plugin-visualizer#options)

| 入口中的分组 | 分析器 rendered 估算 | 主要用途 |
| --- | ---: | --- |
| Vue：runtime-core、runtime-dom、reactivity、shared | 118596 B | 组件运行、水合、DOM 更新与响应式 |
| Nuxt 包内模块 | 38824 B | 应用初始化、路由接入、数据与 payload 等运行逻辑 |
| vue-router | 30856 B | 页面导航、路由匹配与相关辅助代码 |
| unhead + @unhead/vue | 18674 B | 页面 head/SEO 元信息管理 |
| ofetch | 6126 B | 请求封装 |
| pinia + @pinia/nuxt | 4922 B | 状态管理及 Nuxt 集成 |
| 入口内 app/ 项目代码 | 4899 B | 全局插件、用户 store、登录服务、通知等 |

该表仅列主要分组，不是入口全部模块清单。完整分组见 summary.json。首页组件自身位于独立的 `pages/index.vue` chunk，默认布局与 NavBar 也在另一 chunk；入口内 app/ 4,899 B 不能被解释成整个首页的所有业务 JS。

### 为什么这些代码进入首页

源码与报告共同确认两条可读的引入链：

```text
Nuxt 全局插件
  ├─ app/plugins/users.client.ts → stores/users.ts → Pinia + services/login.ts
  └─ app/plugins/api.ts          → stores/users.ts

app/app.vue → NoticeContainer.vue → Notification.vue + useToast.ts
```

首页没有登录表单，也会因全局用户初始化、API 错误处理及导航登录状态使用用户 store。当前 store 的登录、管理员登录等 actions 与状态逻辑在同一模块，引用该 store 会带入对应服务代码。此处服务模块估算只有 613 B，不能预设拆它会带来显著首屏收益。

通知相关组件及 composable 合计估算约 1,544 B（另有共享框架逻辑），属于可能按需处理的小范围教学对象；将它异步化并不能移除整套 Vue 运行时。下一步是否改动要先比较预期收益、首次通知显示延迟和实现复杂度。

### 已排除的误判

- `BaseModal.vue` 已是独立动态 chunk，生产文件为 `CK9yXQcr.js`（7,538 B）；不是入口 206 kB 的组成部分。之前首页实验的请求窗口内也未加载该文件。
- 后台页面在入口中出现的少量 `macro=true` 模块是路由元信息，不能据此宣称整个后台编辑页面已被打进入口。
- 本次客户端模块报告没有匹配到 zod、marked、Shiki、highlight、@vue/devtools-core 或 @vue/devtools-kit；不能因为 package.json 声明了依赖，就认定它占用入口体积。
- vue-router 的 `devtools-*.js` 文件实际还包含 URL 编解码、query、导航守卫、滚动恢复等辅助函数，不能仅凭文件名把它全部视为可删除的调试工具。

### 本步结论与练习

面试官关于 Vue 运行时的判断有实际证据支持；这个入口主要承担框架与全局启动职责。本轮没有发现一个明显误入入口的大型编辑器或 Markdown 渲染库。是否进一步优化需要看首次加载必须执行的范围，而非只追求某个文件变小。

读图练习：打开 `report/client.html`，定位 `_nuxt/entry.js`，观察 `@vue`、`nuxt` 和 `app` 的相对规模。随后回答：如果只把 Vue 拆到单独的 vendor 文件，但首页仍须立即下载并执行它，入口文件变小是否意味着首页所需 JS 总量也减少？需要用实际请求集合与加载时机验证，不能把拆分本身当成收益。

## 7. 通知按需加载：首次代码审查（2026-10-06）

用户已正确指出：仅拆出 vendor 不会减少首页必需的代码；通知容器无条件渲染时，即使没有消息仍会加载。接着在 `app.vue` 改用 `LazyNoticeContainer` 并增加 `v-if="isNotice"`。

本次读取到的条件为：

```ts
const toast = useToast()
const isNotice = ref(toast.toasts.value.length > 1)
```

静态审查发现两个问题：

1. `ref` 收到的是 setup 执行时算出的布尔值，不是一个持续跟踪列表长度的表达式。初始列表为空时该值为 false，后续添加通知不会自动更新这个独立 ref。
2. `length > 1` 表示至少两条，而目标是第一条通知出现时就显示，应判断 `length > 0`。

建议用户将该条件改成 `computed(() => toast.toasts.value.length > 0)`。本轮没有代改应用代码，也没有为此错误版本执行构建或报告性能收益。待条件修正后，再验证首页通知 chunk 请求、首条/后续通知、自动移除和最后一条通知的离场动画。列表清空导致容器卸载的动画影响仍是待测项。

## 8. 通知首次触发后保持挂载：构建与浏览器验证（2026-10-06）

用户将 `isNotice` 修正为计算属性，增加初始为 false 的 `isFirstLoad`，通过带 `immediate: true` 的 watch 在首次有通知时设为 true，之后不重置。`LazyNoticeContainer` 的 `v-if` 改为这个持久标志。本轮修改仅在 `app.vue`，未代改应用代码。

该实现将“当前是否有消息”与“是否曾触发容器加载”分开。初始没有消息时不挂载容器；首次有消息后容器保持挂载，因此最后一条消息移除不会同时卸载整个 TransitionGroup。代价是首次挂载后，空列表时原有每秒定时器仍运行。

### 环境与证据

- 基线：已保存的 `css-inline-toast/output`；候选：`.perf-results/home-first-screen/toast-lazy-20261006-01/output`。
- 候选执行 `npm run build`，退出 0；API/release 与基线一致，仍为 `http://localhost:8787/api`、`perf-home-css`。没有部署或修改后端。
- 候选目录保存 `app.vue`、`frontend.patch`、`head.txt`、`source-hashes.json`、构建日志和状态、正常生产 manifest。
- 最终浏览器脚本 `check-04.mjs`，运行 `node .perf-results/home-first-screen/toast-lazy-20261006-01/check-04.mjs` 退出 0；原始结果 `browser-check-04.json`、汇总 `summary.json`、资源清单 `assets.json`。
- 同一端口 `127.0.0.1:3105` 依次运行两个保存产物。Chromium 153.0.8010.12，DPR 1、CPU 4 倍降速、latency=165 ms、下载 1,012,500 B/s、上传 168,750 B/s；每个场景新建匿名上下文，禁用 HTTP 缓存、阻止 Service Worker。基线桌面 1365×844；候选桌面 1365×844、移动端 390×844。
- 初始观察窗口为 load 后 5 秒，不交互，自动预取纳入统计。之后通过页面共享 state 注入通知，分别验证首次显示、手动清空最后一条、再次显示与定时自动移除；没有真实提交业务数据。

### 字节与请求结果

| 指标 | 基线 | 候选 |
| --- | ---: | ---: |
| 入口 JS 原始大小 | 206248 B | 205637 B |
| 初始窗口 JS 正文合计（桌面） | 218045 B | 217543 B |
| 初始窗口 JS 请求数 | 7 | 8 |
| 全量客户端 JS 原始大小 | 250374 B | 250974 B |
| 全量 JS 文件数 | 19 | 21 |

候选通知独立 chunk 为 `CFz-gOcE.js`，980 B，SSR HTML 没有该文件的 preload，宽窄屏初始窗口均未请求。第一条通知注入后才请求一次，第二条通知没有再次请求。候选移动端初始窗口的请求数和字节与桌面一致。本地资源未启用 HTTP 压缩，编码前后正文大小一致。

入口减少 611 B，而实际初始窗口只减少 502 B；初始请求增加 1 个，全量 JS 增加 600 B。不能把独立通知文件大小当作净节省，不能把本轮结果描述为显著首屏提速。没有进行 LCP 重复对照或精确水合耗时测量。

### 行为结果及待修正项

- 初始候选页面没有通知容器；第一条消息加载完成后正常显示。
- 手动清空最后一条消息后，通知节点先进入 `toast-leave-active`，规则时长 0.5s，约 484–500 ms 后移除；原容器 DOM 保持不变。后续消息正常入场，并在定时器处理后完成离场、自动移除。
- 候选宽窄屏均通过，无页面脚本错误、捕获到的水合警告或 HTTP 错误，通知未超出视口。
- **体验差异尚待修正：候选第一条通知没有渐入动画，基线有；第二条通知仍有渐入。** 容器在第一条消息已存在时首次挂载，TransitionGroup 默认不对初次渲染执行入场过渡。建议用户在原 TransitionGroup 上添加 `appear`，保留其他属性，再验证首条通知动画。[Vue 内置组件 API](https://vuejs.org/api/built-in-components#transition)、[TransitionGroup 共用的过渡属性](https://vuejs.org/guide/built-ins/transition-group.html#differences-from-transition)

### 测试修正与验收边界

保留前三次失败运行及 `selector-probe.json`：初版依赖 SSR 容器残留的 name 属性，客户端新挂载没有该属性，造成定位超时，通知实际已显示；第二版对 document 捕获到 transitionend 且保留 CSS 类作过强断言，基线也失败；第三版误把 TransitionGroup 用于测量的空克隆节点移除当成通知移除。最终按通知正文匹配真实节点，核对 leave 开始、节点保留时间和最终移除，避免这些测试假设。修正均仅发生在测试脚本，未改应用。

本轮加载与保留容器逻辑通过，首条渐入待补齐，尚未最终验收。首次异步 chunk 加载失败/超时反馈、真实业务通知链路及用户人工体验尚未覆盖。临时测试服务已停止；已有旧预览产物未替换。

## 9. appear 修正与复测（2026-10-06）

用户在 `NoticeContainer.vue` 的现有 `TransitionGroup` 上添加 `appear`，其余通知逻辑保持不变。重新执行正常生产构建，退出 0；候选与证据保存到 `.perf-results/home-first-screen/toast-lazy-20261006-02/`，包含本轮两个 Vue 文件、源码 diff/哈希、HEAD、构建日志、manifest、生产产物与截图。

复用第 8 节已修正的行为检查，对新候选增加“首条通知必须出现并完成 opacity 入场过渡”的断言；没有重复未改动的基线测试。执行 `node .perf-results/home-first-screen/toast-lazy-20261006-02/check.mjs` 退出 0，证据为 `browser-check.json`、`summary.json`、`assets.json`。网络、CPU、缓存与视口条件沿用第 8 节。

桌面和移动端均通过：

- 初始窗口没有通知 chunk 请求，首次消息后才请求一次；第二条消息不新增通知 chunk 请求。
- 第一条通知恢复渐入：捕获到 opacity 的 transitionrun 和 transitionend，事件间隔分别约 484.5 ms、483.6 ms，对应现有 0.5s CSS 过渡；此事件间隔不是点击到可见的延迟或性能收益统计。
- 清空最后一条消息时离场过程保留，容器 DOM 不变；后续通知入场、定时自动移除及离场检查通过。
- 无页面脚本错误、捕获到的水合警告或 HTTP 错误。仍为受控 state 注入，不扩展为真实业务链路验收。

最终候选入口 `jHSMDNu4.js` 为 205,637 B，通知 chunk `DGOe2ZsV.js` 为 990 B；初始窗口仍为 8 个 JS 请求、217,543 B 正文。全量 JS 为 21 个文件、250,984 B。相对原始通知实现，初始窗口减少 502 B，请求增加 1 个，全量 JS 增加 610 B。

首条渐入问题已解决，本轮自动行为验收通过。建议将此作为“动态 import、条件挂载、首次渲染动画”的学习实验记录；体积收益很小，不宣称显著首屏优化。首次消息会承担异步加载等待、首次挂载后空列表定时器仍运行，这些取舍保留；实际业务通知、加载失败反馈、人工最终体验与 LCP 收益尚未验证。临时测试服务已退出，没有部署或替换已有旧预览。

## 10. 首次使用等待与保留决策（2026-10-06）

为核实“首屏少加载一点，但首次消息需要等待”的代价，对已保存的两个生产版本做受控重复对照，没有修改应用代码或重新构建。

- A：`css-inline-toast/output`，普通常驻通知容器；B：`toast-lazy-20261006-02/output`，首次触发后保留挂载的异步容器，含 appear。
- 脚本：`.perf-results/home-first-screen/toast-first-use-20261006.mjs`，执行同路径的 `node` 命令退出 0；原始结果：`toast-first-use-20261006.json`。
- 地址固定为 `http://127.0.0.1:3107/`，逐次启动所需保存产物并预热 SSR。Chromium 153.0.8010.12、1365×844、DPR 1、CPU 4 倍降速，网络 latency=165 ms、下载 1,012,500 B/s、上传 168,750 B/s。机器与前述本地实验相同，供电和后台负载未独立控制。
- 顺序 ABBAABBAAB，各 5 次。每次新建匿名上下文、禁用 HTTP 缓存、阻止 Service Worker；load 后等 5 秒再通过共享 state 注入消息，暂停通知计时器以免混入自动移除。首条出现后等待动画，清空并等离场完成，再注入第二条消息。
- 指标为 `performance.now()` 记录的“修改通知 state → 首个 requestAnimationFrame 中目标节点有尺寸、非隐藏且 opacity > 0.01”的时间。它近似观察到可见样式的等待，不是实际像素呈现时间，不是动画完成时间，也不是真实点击 INP 或业务接口总耗时。

| 观察指标，各 5 次 | A 常驻容器：中位数 / 范围 | B 按需容器：中位数 / 范围 |
| --- | --- | --- |
| 首次触发 → 可见样式帧 | 51.5 ms / 49.3–59.7 ms | 257.0 ms / 251.6–272.2 ms |
| 再次触发 → 可见样式帧 | 51.9 ms / 42.2–54.3 ms | 53.6 ms / 42.5–59.7 ms |

原始值，按各版本出现顺序，单位 ms：

- A 首次：58.8、50.1、49.3、59.7、51.5；再次：44.9、42.2、53.8、51.9、54.3。
- B 首次：251.6、254.0、257.0、272.2、266.1；再次：59.7、49.0、54.1、53.6、42.5。

10 次页面加载与 20 次通知触发均完成，无记录到的页面脚本或 HTTP 错误。B 的全部 5 次中，通知 chunk 均仅在首次触发阶段请求一次，再次触发不重复请求。首次中位数增加约 205.5 ms，而再次触发范围重叠，符合首次额外代码加载带来等待的解释。不能把此设备模拟条件下的差值作为所有用户的固定延迟。

决策建议：撤回通知异步拆包。理由是已经确认的初始字节收益仅 502 B、初始请求增加 1 个、全量 JS 增加 610 B，同时首次通知需要更多等待；没有测得足以抵消这些代价的首页 LCP 收益。保留完整实验记录用于解释优化取舍，不以“已经实现并修好了动画”作为必须保留的理由。

撤回范围仅为本轮通知实验：`app.vue` 恢复普通 `NoticeContainer`，去掉为此增加的 v-if、watch、计算属性和标志量；`NoticeContainer.vue` 去掉本轮新增 appear，以恢复原通知挂载方式。此前已验收的 CSS 内联配置和通知动画 CSS 移入 main.css 的改动继续保留。用户仍负责代码练习，本轮没有代为撤回，最终采用决定及源码恢复待后续反馈。

## 11. 撤回完成（2026-10-06）

用户明确要求“帮我撤回吧”，已按第 10 节范围恢复代码。`app.vue` 与 HEAD 一致；`NoticeContainer.vue` 恢复为 CSS 内联实验验收时的保存版本，继续使用 main.css 中的动画规则。没有撤销 `features.inlineStyles: true`、全局通知动画 CSS 或其他用户改动。

重新执行 `npm run build`，退出 0，恢复正常生产产物。22 个客户端 JS/CSS 文件的文件名及 SHA-256 均与通知实验前的 `css-inline-toast/output/public/_nuxt` 一致。入口恢复为 `C7AuO8xu.js`，哈希仍为 `e3e5bdb0698d2cbe055a15661fcc5a1cfe5bd45177a68596c42a3e48eede6a57`。未重复已有基线的浏览器测试，不将此描述为新的一轮浏览器验收。

证据保存在 `.perf-results/home-first-screen/toast-rollback-20261006/`：`build.log`、`build-status.json`、`asset-verification.json`。源码恢复后仅消除本次引入的格式差异，不影响已核验的产物内容。

最终决策：通知按需加载实验完成并放弃实现，保留原始数据及复盘。CSS 内联方案继续保留；线上部署和生产压缩配置未在本轮变更。
