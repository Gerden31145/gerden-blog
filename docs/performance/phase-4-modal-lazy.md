# 阶段 4：后台弹窗按需加载

状态：已验收并保留。2026-09-15 用户反馈“阶段4验收完毕”，结合已有分包、HAR 和加载/错误/超时受控检查，关闭本阶段。用户未提供逐项业务操作日志，人工结果按用户反馈记录；不将其写成新增自动测试或性能计时。阶段 3 人工验收单独跟踪。

## 假设与边界

用户判断：将弹窗代码推迟到首次打开时加载，可能减少进入后台时需要下载的代码，但首次点击会增加网络等待；弹窗较小，收益可能有限。

修正：v-if 控制组件是否创建和挂载，不自动建立动态导入边界。当前 BaseModal 的代码跟随后台页面 chunk 下载；不能仅根据 modalOpen 是 JavaScript 变量来判断整个组件是否已下载。后台页面已是动态路由模块，本次考察进入后台后的增量收益，不能预先称为首页加载优化。

“代码极小”暂作为假设。当前整个后台页面 chunk 9371 B，包含弹窗及后台页面逻辑，不是弹窗自身大小。首次加载变快需要浏览器证据，不能由拆包直接推导。

## before 证据

生产构建：`modal-before-coach-check`，退出码 0，7.220 s，现有缓存未清理。供电、电源模式和后台条件未确认，不作构建耗时对比。

归档目录：`.perf-results/phase-4-modal/before/`。包含当前 app 全部源文件、Nuxt 配置、根 manifest/lockfile、Git 差异、构建运行信息、客户端产物、逐文件压缩报告和生产资源映射。

- 后台页面模块：pages/admin/index.vue。
- 对应文件：DkD9_-98.js；raw 9371 B，gzip 3247 B，Brotli 2846 B（离线逐文件估算）。
- 该文件包含弹窗特征文本 `Post Infomation` 和 `Please upload file first`。
- 生产映射将后台页面标记为动态入口。参见 bundle-observation.json。
- 没有采集真实管理员会话下的 before HAR 或首次打开延迟，暂不计算运行时收益；匿名重定向页不能替代后台基线。

## 用户的唯一修改

app/pages/admin/index.vue：把 BaseModal 的开始、结束标签均改为 LazyBaseModal；保留 v-if、post/status、close/refetch 绑定，保留组件文件名及业务逻辑。

Nuxt 的 Lazy 前缀支持动态导入，条件渲染可以控制异步组件何时被使用，但其他引用及预取仍可能影响实际下载时机：[Nuxt 组件文档](https://nuxt.com/docs/4.x/directory-structure/app/components)。

本轮不修复原有 post props 声明与 Upload 场景 undefined 的类型不一致，也不处理已排除的认证异常。若影响后续验证，单独记录和处理。

## 验证计划

1. 教练核对唯一变量，构建并保存 after；识别后台 chunk、弹窗 chunk、共享依赖及全量 JS 的变化。
2. 在真实本地管理员会话下，观察进入后台但不开弹窗、冷首次打开、关闭后再次打开。保留 Network/HAR、预取状态和观察窗口；运行时前后对比需补齐同条件 before。
3. 用户检查打开、关闭、重开、Upload/Update/Delete 三种界面。测试数据上的提交成功与失败反馈另行记录；只看表单出现不算写操作通过。
4. 若保留异步方案，再依据真实等待和失败表现判断是否需要加载反馈及重试。不得将后台组件拆包数量增加等同于优化成功。

## 决策

已确认组件被拆成独立动态模块；用户在后台观察到下载推迟到首次点击，再次打开未新增请求。暂保留最小改动，继续保存网络证据及确认交互代价，不把本阶段标为全部完成。可记录“验证弹窗代码按交互加载”，暂不写加载提速或整体首屏减少百分比。

## after 构建与产物

相对 before 归档，仅 app/pages/admin/index.vue 的成对标签由 BaseModal 改为 LazyBaseModal。其余已归档 app 文件、Nuxt 配置、根 package.json/lockfile 内容未变。

生产构建运行 `modal-lazy-coach-check`，退出码 0，7.364 s。现有缓存未清理，供电、电源模式未核实，不比较构建速度。preview 已重启到当前产物：http://localhost:3000/。

after 证据：`.perf-results/phase-4-modal/after/`，含 app 源码、配置/锁文件、Git 差异、build-run、_nuxt、client-assets.json、client.precomputed.mjs、bundle-observation.json。

| 指标（B） | before | after |
| --- | ---: | ---: |
| 后台页面自身 chunk raw | 9371 | 2236 |
| 后台页面自身 chunk gzip 估算 | 3247 | 1165 |
| 后台页面自身 chunk Brotli 估算 | 2846 | 1067 |
| 独立弹窗 chunk raw | 未独立 | 7534 |
| 全量 JS raw | 248706 | 249127 |
| 全量 JS gzip 估算 | 96847 | 97364 |
| 全量 JS Brotli 估算 | 85436 | 85933 |
| JS 文件数 | 18 | 19 |
| 全量 CSS raw | 22110 | 22110 |

后台文件 DsFU4S4-.js 通过 dynamicImports 指向 components/BaseModal.vue；弹窗文件 CNvcgcxG.js 包含原弹窗特征文本，gzip 2601 B / Brotli 2258 B。后台和弹窗仍共享入口与 posts 服务模块。

后台自身 chunk 减少 7135 B；全量 JS 增加 421 B（gzip +517 B / Brotli +497 B）。这是拆包后的产物成本变化。全量独立压缩之和、页面自身 chunk、实际首屏请求是不同指标；不能将 7135 B 直接写成后台总首屏下载减少量，也不能宣称加载时间改善。

## 当前用户验收步骤

本地 Worker /api/health 已返回 200。使用原有本地管理员账号登录；若认证异常阻止进入后台，记录为未验证，不把登录页面代替后台，不在本实验顺手修复认证。

1. DevTools Network 打开 Disable cache，刷新 /admin，等待页面稳定且先不点击 +。筛选 CNvcgcxG.js，记录是否已请求。
2. 第一次点击 +，观察该文件是否此时才请求、状态码、表单等待感及错误；保留 Network 的 JS 请求，不只保存筛选后的截图。
3. 关闭后再次打开，观察是否新增相同文件请求。即使 Disable cache 开启，当前文档中已加载的 JS 模块通常仍会复用；刷新后是另一场景。
4. 检查 Upload/Update/Delete 三种界面及关闭、重开。涉及真实测试数据的提交成功/失败仍单独记录，不由“打开正常”推定通过。
5. 导出包含上述操作的 HAR，建议保存为 `.perf-results/phase-4-modal/after/admin-modal.har`，仅本地保留。需记录网络/CPU限速、登录状态、浏览器视口和操作顺序。

当前没有访问用户的管理员会话，没有执行写入接口，也没有测量首次打开延迟。无头匿名检查不能替代本步骤。

## 用户反馈与证据范围

用户原话：“点击前未请求，首次点击会请求，再次点击不请求，界面正常”。对应当前实验弹窗文件 CNvcgcxG.js。

- 点击前不请求：在这次用户观察窗口内，弹窗文件未提前下载。
- 首次点击会请求：与 v-if 触发异步组件加载的预期一致。
- 再次点击不请求：当前页面生命周期内复用已加载模块，不表示 v-if 隐藏后保留了组件实例，也不能仅归因于 HTTP 缓存。
- 界面正常：记录为用户报告的基本界面验证通过；未据此推定 Upload/Update/Delete 的全部提交成功、失败分支均已验证。

这是一条用户人工观察记录。未提供首次打开毫秒数、网络/CPU限速和浏览器视口，不能计算交互变快或变慢的幅度。后续已收到 HAR，审查如下。

## HAR 审查

文件：`.perf-results/phase-4-modal/after/admin-modal.har`，418352 B，SHA-256 `868bfdd086f40e7f5126a7426137dd97ddcc83b71e705e96dfa86253620d8a04`。提取摘要保存为同目录 admin-modal-har-summary.json，不复制用户身份、Cookie 或认证响应正文到文档。

- 记录包含 /admin 文档及 /api/admin/me 200 响应，共 16 个请求，均返回 200。
- 弹窗 CNvcgcxG.js 只有 1 次请求，发生于 /admin 文档请求开始后 5566 ms，由 script 发起。结合用户观察，支持首次点击后下载；HAR 本身没有点击事件标记，5566 ms 不是点击等待时间。
- 弹窗资源正文 7534 B，实际响应正文哈希与归档构建文件一致；无 Content-Encoding。HAR transferSize 为 7845 B，不能与脚本的 gzip/Brotli 估算混用。
- 本次弹窗请求耗时约 6.536 ms，只是请求耗时，不包括从点击到表单可交互的完整过程。
- 弹窗请求前记录 9 个 JS 请求、解码后正文合计 220393 B；计入弹窗为 10 个、227927 B。该统计按本次请求时序划分，可能包含路由预取，不能称为首屏必需 JS 或前后对比收益。
- 捕获中没有第二次弹窗文件请求，与用户再次打开未请求的观察一致；再次打开动作本身来自用户反馈，HAR 未单独标注。

缺少同条件 before 浏览器记录，不计算后台首屏提速；HAR 也不能确认本轮网络/CPU限速或浏览器视口。下一项小检查：保持 Disable cache，选择并记录一种慢网配置，刷新后台后首次点击 +，观察加载期间是否有可见反馈、等待是否可接受。该步骤用于检查异步加载体验，不追加性能提升结论。

## 慢网反馈与加载提示练习

用户使用 DevTools“慢速 4G”，反馈首次点击没有加载提示，明显等待约 0.8 秒。这是用户主观估计，未通过点击/可交互标记计时；不与之前 HAR 的 6.536 ms 请求耗时作比较。后者也未确认采用相同限速条件。

当前结论：拆包机制已验证，但首开体验有明显代价。加载提示只改善反馈，不消除网络等待；暂不认定最终应保留拆分。如果提示和错误处理的复杂度大于这约 7.5 KB 延后下载的收益，可以恢复同步组件。

下一次独立练习由用户编码，先补加载反馈：

1. 新建 app/components/ModalLoading.vue，小型遮罩/提示，显示“正在加载表单…”，用 role="status" 提供状态文本，并提供关闭按钮，通过 close 事件让父页面关闭。可用 Teleport to="body"；该提示组件本身不依赖 BaseModal、不请求 API。若 Teleport 为根且不打算传递 post/status 等无关属性，可设置 defineOptions({ inheritAttrs: false })。
2. 在后台页面显式静态 import ModalLoading，并从 vue 导入 defineAsyncComponent。定义 AsyncBaseModal，loader 使用 () => import('~/components/BaseModal.vue')，loadingComponent 为 ModalLoading，delay: 150，suspensible: false。这让异步包装器自行管理加载提示，不交由祖先 Suspense；不添加同步 BaseModal import。
3. 将模板成对 LazyBaseModal 改为 AsyncBaseModal，保留现有 v-if、props、close/refetch 绑定。定义放在 script setup 顶层，不放进 openModal，避免每次点击重新创建包装器。
4. delay 只决定何时显示提示，不推迟下载，也不是强制等待 150 ms；快网完成得早时可避免提示闪一下。
5. 用户改完后由教练构建并核对依赖/产物，再在相同慢速 4G 下检查等待提示、加载中关闭后不自动弹回、再次打开，以及原弹窗业务。错误提示/失败重试仍是独立待办，本次不因有 loading 提示就声称异步流程已完整。

参考：[Vue 异步组件](https://vuejs.org/guide/components/async.html)。以上为最初的练习安排；用户随后授权教练实现，结果见下文。

## 加载提示实现与验证

用户授权：“你来完成加载组件”。教练实现 app/components/ModalLoading.vue，并在后台页面使用显式定义的 AsyncBaseModal 接入。loader 继续动态 import BaseModal，loadingComponent 静态引入，delay: 150、suspensible: false；原表单业务未改。

加载提示使用原生 dialog 与 Teleport：等待超过 150 ms 时显示“正在加载表单…”和关闭按钮；支持 Esc、原生模态焦点约束及遮罩。关闭发出 close 事件，由原有 closeModal 将 v-if 设为 false。卸载时关闭原生 dialog，清理模态状态。关闭 UI 不等于取消已发出的模块网络请求；请求完成后不得自动重新打开。

生产构建 `modal-loading-coach-check` 退出码 0，7.985 s，不作速度对比。产物、源码快照和检查脚本存于 `.perf-results/phase-4-modal-loading/`。当前 preview 已重启。

相对前一版无提示 LazyBaseModal：全量 JS 249127 → 249992 B（+865 B），CSS 22110 → 22496 B（+386 B）；后台页面自身 chunk 为 3106 B，弹窗独立 chunk C1hRwhJV.js 为 7533 B。加载反馈增加了代码和样式，不能把它当作体积优化；本步目的为反馈与可取消的等待界面。

生产 preview 上的 Playwright 检查已通过：

- 进入后台时未请求弹窗；点击后人为暂缓弹窗文件响应，能显示提示；放行后切换到表单，提示移除。
- 等待期间点击关闭，放行模块后表单不会弹回；再次点击正常打开，未重复请求模块。
- 等待期间按 Esc，同样关闭且不自动弹回；窄屏 390 px 提示未横向溢出。桌面检查视口为 1365×768。
- 三种场景均没有 pageerror，截图和 browser-check.json 已归档。已查看窄屏截图，提示及按钮可见。

测试边界：浏览器 /api/admin/me 使用人工 fixture，仅为进入页面测试 UI，不是验证真实认证；未执行文章新增、修改、删除接口。资源响应通过测试门控延迟，不是复测慢速 4G 的 0.8 秒，也未声称改善实际下载速度。加载失败提示与重试仍未实现。下一步由用户在原有真实会话及慢速 4G 下检查反馈是否合适。

## 独立界面修复：正式弹窗遮罩覆盖导航

用户反馈 BaseModal 遮罩未覆盖顶部导航，授权修复。原因：NavBar 的 sticky z-40 建立层叠上下文，BaseModal 的 fixed 外层未设置 z-index；内部面板的 z-10 只在弹窗内部排序，不能提升整个弹窗。Teleport 到 body 只改变 DOM 挂载位置，不自动获得最高层级。此前加载提示使用原生 dialog.showModal() 的顶层显示，因此它正常并不表示正式弹窗的层级正确。

最小修改：BaseModal.vue 的 fixed 外层增加 z-50，遮罩与面板作为整体高于 z-40 导航，不改变表单逻辑。该修复与按需加载收益分开记录。

正常构建 `modal-overlay-coach-check` 成功，7.105 s，不作速度对比。生产预览重启。Playwright 在模拟浏览器管理员身份下，分别检查 Upload、Update、Delete 三种界面，在导航 HOME 链接坐标处用 elementFromPoint 验证命中弹窗覆盖层；把 z-index 临时改回 auto 可复现命中导航，恢复为 50 后重新覆盖。三种检查均通过，未执行提交/删除 API。证据为 `.perf-results/phase-4-modal-loading/overlay-check.json`、check-overlay.mjs 和 overlay-fixed.png。

## 下一步：请求失败观察

当前显式异步组件只有 loader/loadingComponent/delay/suspensible，未提供 errorComponent、timeout 或重试处理。先让用户观察失败表现，再设计小范围错误处理，不预先假定会一直 loading、出现错误页或自动刷新。

本次生产映射中的 BaseModal 文件为 `S0d2gmf_.js`（修复遮罩后 hash 已变化，旧 CNvcgcxG.js / C1hRwhJV.js 不适用）。在 DevTools 的 Network request blocking / Request conditions 中，启用单 URL 阻止规则 `*S0d2gmf_.js*`。保持 DevTools 开启，恢复 No throttling、勾选 Disable cache 后刷新 /admin，等页面稳定再点击 +。刷新是为了清除当前文档已加载模块的影响，不能只关闭重开。

观察并反馈：Network 是否显示 blocked:devtools；界面显示什么；是否能关闭或出现整页错误/刷新；Console 第一条相关错误（只记录消息，不收集 Cookie 等信息）。该实验模拟弹窗文件加载失败，不阻断 API 或整个 localhost 域名。测试后取消阻止规则并刷新，恢复正常环境。

用户反馈：阻止请求后仍显示“加载表单”弹窗，可以关闭；Console 报 `TypeError: Failed to fetch dynamically imported module: http://localhost:3000/_nuxt/S0d2gmf_.js`。这是本地请求阻止触发的模块下载失败，不是文章 API 失败。用户未提供此场景 HAR，作为人工反馈记录。参考：[Edge 请求阻止工具](https://learn.microsoft.com/en-us/microsoft-edge/devtools/network-request-blocking/network-request-blocking-tool)。

当前 Vue 运行时代码在加载失败后，有 errorComponent 才进入错误界面分支；本配置没有该项，后续仍可能走 loadingComponent 分支，因此“还显示 loading”不能证明请求仍在进行。该表现与用户反馈相符。

下一步由用户实施小范围错误提示，不修改业务表单：

1. ModalLoading.vue 添加可选 failed: boolean prop。failed 为 true 时将标题和状态文本改为“表单加载失败”，说明改为“请检查网络后刷新页面再试”；使用 role="alert"。false 时保持原 loading 文案、role="status"。保留关闭按钮、Esc 和 dialog 生命周期处理。
2. 后台页面从 vue 导入 h，把异步组件定义放在 closeModal 定义之后；增加 `errorComponent: () => h(ModalLoading, { failed: true, onClose: closeModal })` 和 `timeout: 10000`，保留 loader、loadingComponent、delay、suspensible 配置。
3. 用显式 onClose 是因为当前 Vue 的错误组件分支仅传入 error 属性，不像 loading 分支那样转发原组件的 props/事件；直接配置 errorComponent: ModalLoading 既不能自动设置 failed，也不能保证接到原有 close 监听。
4. timeout 为最长等待提示阈值，超时也显示错误界面；它不是 AbortController，不会取消正在进行的模块请求。此步不实现自动刷新或无限重试，也不声称已解决所有模块失败缓存情况。
5. 用户改完后教练构建并验证加载、失败、超时、关闭事件；更新后的 chunk hash 需重新核对阻止规则。用户测试后移除规则并刷新恢复环境。

以上为原练习安排，用户随后授权教练实现。模块失败/超时可显示错误组件的官方说明：[Vue 异步组件](https://vuejs.org/guide/components/async.html#loading-and-error-states)。

## 错误提示实现与验证（2026-09-15）

授权：用户“你来帮我改”。修改范围为 ModalLoading.vue 和 app/pages/admin/index.vue：

- ModalLoading 接收可选 failed 属性，使用 v-if 切换加载/失败文案；失败文本使用 role="alert"，dialog 名称也切换为“表单加载失败”。关闭按钮、Esc 和原生 dialog 的挂载/卸载处理保留。
- AsyncBaseModal 移到 closeModal 后定义；新增 errorComponent，通过 h 显式传入 failed: true 与 onClose: closeModal；timeout: 10000。未实现自动刷新或自动重试。
- 超时不会中止网络请求。失败界面提示检查网络后刷新页面再试；不保证同一文档内对失败模块直接再次 import 就能恢复。

生产构建 `modal-error-coach-check`：退出码 0，11.719 s，供电条件未核实，不比较构建耗时。预览已重启。当前弹窗文件为 **CF2aubFz.js**，手动阻止请求时需更新规则。

证据目录 `.perf-results/phase-4-modal-error/`：源文件/锁文件和 _nuxt 快照、生产映射、client-assets.json、check-error.mjs、browser-check.json 和失败界面截图。

全量客户端 JS 为 19 文件、250281 B；CSS 为 4 文件、22496 B。作为带加载/错误反馈的候选产物记录，不能拿无提示版本的体积直接代替最终实现的成本。

受控 Playwright 检查通过四个场景：

1. 暂缓模块响应时显示 loading，放行后切换到真实表单，不显示错误提示。
2. 中止模块请求后切换到失败提示；关闭按钮正常。移除阻止并刷新后能正常打开表单。
3. 同样的请求失败场景下 Esc 可关闭；使用 390×768 窄屏截图检查失败文字及关闭按钮可见。
4. 保持请求 pending 超过真实配置的 10 秒，显示失败提示；关闭后放行迟到响应，表单不会自动弹回，再次打开复用已加载模块。

四个场景均无 pageerror。测试使用模拟的浏览器 /api/admin/me 身份响应，模块响应人为放行/阻断；不是实际认证或文章写操作测试，也不是慢速 4G 延迟测量。完整 Upload/Update/Delete 提交回归尚未完成。git diff --check 通过，仅有原有 LF/CRLF 警告。

## 用户验收与决定（2026-09-15）

上述“尚未完成”描述受控检查当时的状态。用户随后明确反馈“阶段4验收完毕”，本阶段按用户人工验收通过收尾，保留当前异步弹窗及加载、失败、关闭处理。未新增逐项提交日志或计时，不扩展既有自动检查的覆盖范围。

可支持的结论是弹窗模块延后至首次打开下载，并提供等待和失败反馈。首次等待仍有网络成本，反馈组件也增加代码；缺少同条件 before/after 浏览器计时，不宣称后台首屏提速。
