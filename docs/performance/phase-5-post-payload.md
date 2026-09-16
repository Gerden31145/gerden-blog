# 阶段 5：文章详情 Nuxt payload 精简

状态：2026-09-15 前端 transform 实验已验证并保留。生产构建、固定文章数据对比、用户正常页面/404 检查、受控 SSR/客户端重定向验证通过。真实数据库旧 slug 查询未覆盖，范围见末节；后端精简是后续独立实验。阶段 3 人工视觉验收仍单独跟踪。

## 目标与范围

本次考察文章数据随 Nuxt payload 传给浏览器的成本。先研究是否可以从阅读页数据中排除原始 Markdown content，保留正文 contentHTML、TOC 与页面所需信息。只调整前端数据转换，Worker API、数据库和 Markdown 处理不属于本组实现范围。

## 当前源码事实

- app/types/posts.ts 的 Posts 同时声明 content 与 contentHTML；PostSlugRedirect 是另一种合法详情返回结构。
- app/services/posts.ts 的 getDetail 当前直接调用 useAPI<APIResponse<Posts | PostSlugRedirect>>，没有转换响应字段。
- app/composables/useAPI.ts 基于 createUseFetch，合并 baseURL、$api 及调用方选项。
- worker/src/repositories/posts.repository.ts 的 findPublishedPostBySlug 实际选择并返回 content 与 contentHTML。这是对当前源码的检查，还不能替代本次实时响应测量。
- 文章页当前直接读取 title、summary、contentHTML、toc 和 id；id 用于评论请求与组件，title/summary 同时用于页面元信息。重定向路径依赖 redirect_to。

## 第一项阅读练习

阅读 Posts 类型、详情服务和文章页面，回答：哪些字段被页面实际使用，哪些字段可能不需要？只从 TypeScript 类型中删除一个字段，是否会让实际传输数据减少，为什么？

此时先不删字段。之后基于回答提出唯一变量和测量假设，再冻结本组 before。不得改写原始 Posts 类型使其不再描述 Worker 实际响应，也不得丢弃 API envelope 的 status/message 或合法重定向分支。

## 后续证据计划

- 选择有真实正文的固定文章，保存 slug、内容哈希、Worker 响应、SSR HTML、内嵌 payload、配置、源码状态和构建产物；之前文章内容可能已变，不能直接沿用阶段 1 的字节数。
- 比较同一文章在转换前后的 payload 和完整 HTML 字节数，分别记录 JS/CSS 产物。
- 区分 SSR 服务端请求与浏览器客户端导航请求：前端 transform 可以精简 Nuxt 序列化结果，但不能让未修改的 Worker 原始响应自动变小。
- 验证直接访问、客户端导航、正文/TOC、评论、页面元信息、重定向和失败分支；不把 payload 下降当作 JS bundle 下降。

当前没有性能改善结论。

## 阅读回答与本次变量

用户正确指出正常详情直接使用 title、toc、summary、contentHTML、id；另有合法重定向分支依赖 redirect_to。只删除 TypeScript 类型字段不会移除运行时数据。

本组仅移除阅读结果的 content，保留其他元数据、status/message 和重定向分支，避免同时改变多项契约。预计减少 SSR 序列化 payload 和相应 HTML 字节；不预期减少未修改 Worker 的原始响应。实际减少值必须测量，不能直接把 Markdown 长度作为 payload 差值。

## Before（2026-09-15）

证据目录：`.perf-results/phase-5-post-payload/before/`。包含 source、完整 output、build-run、相关 Git 二进制差异、client-assets.json、worker-response.json、document.html、payload.json 和 measurement.json；捕获脚本保存在上一级 capture-before.mjs。

- 构建：`payload-before-coach-check`，退出码 0，8.584 s；缓存未清理，供电条件未核实，仅记录，不比较耗时。
- 源码：HEAD `40c3e259b3e2e70f12c90b1c6dee4abd0065bd2d` 加归档的相关差异与新增文件。锁文件 SHA-256 为 `45d28ed32b2e9571f66c6428b76ca4a723a1c921eeb53869f598834ec8054d36`。
- 固定文章：id 3，slug `测试文章-37236f02`；API 和文章文档均返回 200。捕获前后重复读取 API 的正文哈希相同。
- 请求方式：Node v24.18.1 fetch，无登录 Cookie；本地 Worker 8787、生产预览 3000。不是浏览器性能计时。

| 指标 | before，B |
| --- | ---: |
| Worker JSON 响应正文 | 17849 |
| 完整 SSR HTML | 44558 |
| HTML 内嵌 __NUXT_DATA__ 文本 | 23808 |
| 原始 Markdown content UTF-8 长度 | 2345 |
| contentHTML UTF-8 长度 | 13895 |

以上是解码后的正文 UTF-8 字节，不含 HTTP 头；payload 已包含在完整 HTML 中，不能重复相加。Worker 响应有 Content-Encoding: gzip，Node fetch 自动解压，因此 17849 B 不是压缩传输量；预览 HTML 无 Content-Encoding。原始 content 和 contentHTML 均在 payload 的序列化字符串表中得到精确匹配。文章内容及响应哈希见 measurement.json，after 必须再次核对内容未变。

## 下一项用户练习：先写转换函数

1. 在 app/types/posts.ts 增加 `ReadingPost = Omit<Posts, 'content'>`，保留原 Posts 对 Worker 响应的描述。
2. 在 app/services/posts.ts 写纯函数，输入 `APIResponse<Posts | PostSlugRedirect>`，输出 `APIResponse<ReadingPost | PostSlugRedirect>`。
3. 先判断 redirect_to 分支并原样返回；正常详情用对象解构排除 content，返回保留原 envelope 的新对象。不使用 any 或类型断言掩盖数据问题。
4. 这一步先不接入 getDetail。用户完成后检查函数，再核对当前 createUseFetch 的输入/输出泛型并接入 transform；纯函数尚未被调用时不会产生体积收益。

后续仍由教练构建和读取结果、用户检查页面。接入 transform 前后各自保留证据；不要改测试文章内容。

## 转换函数复查与接入练习

用户初版在解构后仍返回原 response，因此 content 并未移除。修正为 `{ ...response, data: rest }` 后，源码复查通过：正常详情生成排除 content 的数据对象，重定向原样返回，外层 status/message 保留。

已用项目 Worker 中安装的 TypeScript 编译器，在内存中对当前函数及根项目 Nuxt 实际 createUseFetch 声明做独立类型核对：不显式指定请求泛型、传入 `transform: toReadingResponse` 时，data.value 推断为 `APIResponse<ReadingPost | PostSlugRedirect> | undefined`，诊断 0。这不是整个 Nuxt 应用的类型检查，也未执行新的生产构建。

下一步由用户将 getDetail 改为：

```ts
getDetail(slug: string) {
  return useAPI(`posts/${slug}`, {
    transform: toReadingResponse,
  })
},
```

移除旧调用显式指定的单个泛型，让已声明输入/输出类型的转换函数参与推断；传入函数本身，由 Nuxt 获得响应后调用。接入后再进行生产构建、固定文章 payload 对比和页面验收。

## Transform 接入后测量（2026-09-15）

生产构建 `payload-transform-coach-check` 退出码 0，7.338 s；缓存未清理，供电条件未核实，不与 before 比较速度。预览已重启至当前产物。证据位于 `.perf-results/phase-5-post-payload/after/`；包含源码、完整 output、构建日志、API 响应、SSR HTML、payload 与逐文件资产统计。上一级 capture-after.mjs、compare.mjs 和 comparison.json 保存采集与对比过程。

| 指标（解码后字节） | before | after | 差值 |
| --- | ---: | ---: | ---: |
| Worker 原始 JSON | 17849 | 17849 | 0 |
| 内嵌 payload | 23808 | 21204 | -2604（-10.94%） |
| 完整 SSR HTML | 44558 | 41954 | -2604（-5.84%） |
| 全量客户端 JS（19 文件） | 250281 | 250399 | +118 |
| 全量客户端 CSS（4 文件） | 22496 | 22965 | +469 |

API 响应全文、原始 Markdown、contentHTML 和锁文件哈希均与 before 相同。归档的应用源码/配置比较仅 app/services/posts.ts 和 app/types/posts.ts 改变。

使用 devalue 解码两份真实 payload，确认唯一数据差异为文章 data.content 被移除，其余字段、envelope 与 payload 状态深比较一致。SSR HTML 排除 payload 文本、资源文件名和构建 ID 后完全相同。比较脚本初次未归一化 buildId 导致断言失败，定位为每次构建生成的 UUID 差异；加入明确归一化后通过，并非页面内容变化。

原始 Markdown 长度为 2345 B，而序列化 payload 减少 2604 B；字符串转义、对象键和引用索引等序列化开销参与最终大小，不能以原始字段长度直接代替实测差值。payload 已包含在 HTML 内，两项减少量不能相加。

CSS 增量定位到全局 entry：新增 `.transform` 规则及五个 rotate/skew 自定义属性的注册和初始化。文章 CSS 哈希未变。Tailwind 按纯文本扫描候选类名，不理解属性所在的 JavaScript 语义；新增 transform 文本被识别为工具类是与产物相符的原因判断，未逐个隔离源码与文档中的触发位置。参见 [Tailwind 源码扫描说明](https://tailwindcss.com/docs/detecting-classes-in-source-files)。本组保留真实增量，不修改扫描配置混入另一项优化。

结论：当前固定文章的前端转换确实减少 SSR payload；没有减少 Worker 原始响应，全量 JS/CSS 反而略增。尚未测量浏览器加载时间，不宣称页面提速。构建不等同于完整类型检查；本轮 git diff --check 通过，仅原有 LF/CRLF 警告。

下一项人工验收：保持文章内容不变，在生产预览直接打开固定文章，再从列表点击进入，确认正文/代码高亮、TOC、标题/描述、评论加载正常且无 hydration 错误。旧 slug 重定向和失败分支另行覆盖；本次 Node fetch 对比不能代替浏览器验收。

## 页面验收反馈与剩余分支

用户随后反馈“检查页面通过”，按上一轮要求记录正常文章的直接访问和列表进入检查通过；没有新增浏览器原始记录或性能计时。当前收益结论仍限于固定文章的字节对比。

下一步先检查不存在的 slug：访问 `/posts/perf-missing-post-20260915`，记录页面提示、详情 API 的 HTTP 状态与控制台错误。直接访问时详情 API 在 Nuxt 服务端请求，浏览器 Network 不一定显示这条 API；可单独打开 `http://localhost:8787/api/posts/perf-missing-post-20260915` 确认接口返回。Nuxt 当前代码在请求成功后执行 transform，请求拒绝走错误处理路径；区分预期 HTTP 错误与新增的属性读取/解构异常。API 404 与页面文档 HTTP 状态分别记录，不预设两者相同。

重定向优先使用已有旧 slug，不为测试修改固定文章；若没有现成旧链接，后续采用独立受控响应验证并标注覆盖范围。尚未验收这些分支，阶段 5 暂不标记全部完成。

## 失败与重定向验收结果（2026-09-15）

上述待验收项随后补充如下：

- 用户验证不存在文章：页面显示“文章正文加载失败”，浏览器控制台无异常；API 返回 HTTP 404，正文为 `{"status":404,"message":"文章不存在"}`。这里未报告页面文档 HTTP 状态，不把 API 404 直接写成页面 404。验证说明本次转换没有使该错误路径出现属性读取异常，不代表已完善页面错误设计。
- 使用 Node SQLite readOnly 模式仅查询本地 post_slug_redirects 与 posts 的 slug/status 关联，两个业务库的重定向表均无记录。未写入数据库，未修改文章。
- check-redirect.mjs 在真实生产预览的文章列表点击链接，用浏览器拦截把一次详情成功响应替换为包含 redirect_to 的合法结构，再请求真实目标文章。最终 URL、文章标题和正文通过；pageerror 和 hydration 警告均为空。结果：redirect-browser-check.json。
- check-redirect-ssr.mjs 使用相同生产 output，在 3001 临时启动独立预览，通过运行时 API base 指向只返回固定重定向 JSON 的本地临时服务。直接请求旧路径，确认 HTTP 301 与 Location 指向固定文章；只有一次详情请求。结果：redirect-ssr-check.json。检查结束关闭自建服务，3000 日常预览保留。

所有脚本和结果在 `.perf-results/phase-5-post-payload/`。两项重定向检查验证前端 transform、页面分支和导航集成；不是实际 Worker 旧 slug 数据库查询的端到端测试。前端转换实验按此范围收尾并保留，无新构建或性能计时，不扩展速度结论。

下一项学习复盘：解释 Worker 接口 404 为什么没有进入正常转换逻辑，以及客户端导航时 Worker 仍返回完整响应为什么不与 SSR payload 减少相矛盾。后端响应精简需要先审计公开阅读接口与后台编辑数据来源，再独立冻结实验数据。

## 路由观察与用户复盘

用户完成直接访问与客户端路由导航的观察后，正确解释：直接访问文章 URL 时，Nuxt 服务端请求数据并执行 transform，排除 content 后序列化的 payload 变小；从列表通过客户端路由进入时，浏览器 useAPI 请求 Worker，Worker 仍返回包含原始 content 的完整数据，因此 API 传输量没有减少。这与 SSR payload 减少并不矛盾。

补充精确表述：直接访问时，Nuxt 返回已渲染的正文 HTML，同时携带用于 hydration 的 payload；此次移除的是 payload 中未使用的原始 Markdown，而正文 HTML 与 payload 中供组件使用的 contentHTML 均保留。客户端 transform 在响应接收后执行，无法撤回已经发生的下载。

上述路由观察按用户反馈记录，本轮未收到新的 HAR 文件路径，也不据此增加独立网络量或耗时测量结论。用户已能解释两种访问路径与优化边界。
