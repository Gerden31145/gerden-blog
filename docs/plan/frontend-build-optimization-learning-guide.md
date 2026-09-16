# 前端构建与打包优化实战学习指引

适用项目：Gerden Blog，Nuxt 4 + Vue 3 + Tailwind CSS 4，业务 API 由独立 Hono Worker 提供。

创建日期：2026-09-11。本文中的路径与现状来自创建时的工作区；进入每个阶段时重新核对实际代码和锁文件。

## 学习目标与协作方式

完成后，你应该能从源码找到构建入口，读懂产物与浏览器请求的关系，独立提出优化假设，完成小范围修改，用可复现的数据判断是否保留，并解释限制与取舍。

推荐采用“自己动手 + 教练审查”的方式：

本轮协作约定更新（2026-09-14）：用户已熟悉构建和验证流程，后续由教练执行生产构建、产物测量、证据保存与结果分析，用户负责页面和交互检查。代码学习及修改仍按每次约定进行；不将这项授权扩展为自动实施全部优化。供电或后台条件不明确时如实记录，不作构建提速比较，无需每轮重新请求构建授权。

1. 先读当前阶段涉及的文件，用自己的话解释它们的关系。
2. 写下假设：改什么、为什么可能改善、看哪个指标、可能损失什么。
3. 自己实现一个小改动；卡住时先要求提示或局部示例。
4. 保留原始记录，完成同条件对比和功能回归。
5. 让教练审查代码与数据，并追问你两三个原理问题。
6. 根据证据保留、调整或放弃方案，再进入下一阶段。

允许某个阶段结论是“收益太小，不保留”。不要为了完成清单而堆配置，也不要为了简历先写提升百分比。

项目教学 skill：`frontend-build-coach`。例如：

```text
使用 $frontend-build-coach，带我开始阶段 0。先解释要读的文件和数据口径，由我执行。
```

若当前会话尚未发现这个 skill，可以明确要求读取 `.codex/skills/frontend-build-coach/SKILL.md`。有需要再开新会话核对发现结果。

## 路线与阶段状态

| 阶段 | 主题 | 主要交付物 | 状态 |
| --- | --- | --- | --- |
| 0 | 理解构建链路与实验规则 | 构建链路图、环境表、可复现源码状态 | 已完成（2026-09-12，见[学习记录](../阶段%200%20学习记录.md)） |
| 1 | 建立生产基线 | 构建日志、产物清单、页面请求与功能基线 | 进行中（见[基线记录](../performance/build-baseline.md)） |
| 2 | 分析依赖与清理遗留内容 | 使用关系表、依赖清理实验 | 既定三组清理已完成，详见阶段 2 记录 |
| 3 | Tailwind 与页面 CSS 优化 | CSS 产物对比、视觉回归结果 | @reference 已验收；页面 style 与真实 SSR 样式已验证，人工验收待补 |
| 4 | 组件按需加载与拆包边界 | 弹窗加载实验、可选评论实验 | 已验收并保留（2026-09-15 用户确认），未宣称首屏提速 |
| 5 | Nuxt payload 精简 | 数据流图、HTML/payload 体积对比 | 前端实验已验证并保留：payload -10.94%，页面/404 与受控重定向通过 |
| 6 | CI 构建效率与资源预算 | 分阶段耗时、资源预算检查设计 | PR 构建、元信息、摘要与附件配置已接入并本地验证，真实 CI 与预算待补，见[记录](../performance/phase-6-ci-budget.md) |
| 7 | 复现、复盘与面试表达 | 最终报告、证据索引、可核验简历表述 | 未开始 |

阶段 0、1 必须先完成。阶段 2—5 按基线发现的收益调整顺序；每次只做其中一项实验。阶段 6 使用稳定方案建立检查，阶段 7 重新验证整体结果。

## 开始前要理解的项目现状

- `package.json`：`build` 是 `nuxt build`，`preview` 是 `nuxt preview`；安装生命周期还会执行 `nuxt prepare`。
- `nuxt.config.ts`：`serverDir: 'disabled-server'` 禁用旧业务 API 目录，但 Nuxt 仍然可以生成前端 SSR 的服务端产物。
- `nuxt.config.ts`：全局引入 `main.css`、`post.css`；两者目前都有 Tailwind 入口，这是待验证项，不代表已经证明产物重复。
- `app/pages/admin/index.vue`：`BaseModal` 有条件渲染，目前未使用 `Lazy` 前缀。
- `app/pages/posts/[slug].vue`：正文由 SSR 数据获取后通过 `v-html` 展示；评论已设置 `server: false, lazy: true`。
- 文章 API 返回 `content` 和 `contentHTML`，阅读页主要使用后者。
- 根目录还有 Prisma 和 Markdown 处理依赖；旧 `server/` 存在引用，Worker 也有自己的 Markdown 依赖。清理根目录与清理 Worker 是不同任务。
- `.github/workflows/test-vps-ssh.yml` 已经使用 `npm ci`、npm 下载缓存、Nuxt 构建、产物上传、发布健康检查和 Chromium 冒烟检查。
- 当前工作区可能有尚未提交的用户修改。建立基线时不能假设 `HEAD` 就等于正在运行的代码。

## 数据规则：从第一天执行

### 分清指标

| 指标 | 观测方式 | 能支持的结论 |
| --- | --- | --- |
| 安装耗时 | 单独计时 `npm ci`，注明下载缓存和生命周期脚本 | 依赖安装效率 |
| 构建耗时 | 单独计时 `npm run build`，保存退出码与日志 | 特定环境下构建效率 |
| 发布包体积 | 统一打包命令得到的压缩归档实际字节 | 上传与存储成本变化 |
| 客户端产物体积 | `.output/public/_nuxt` 中 JS/CSS 的逐文件清单 | 浏览器资源集合大小 |
| 页面实际加载量 | 浏览器 Network 按固定观察窗口记录 | 指定页面与操作场景的网络负担 |
| HTML / payload | 文档响应及存在时的 payload 文件 | SSR 数据交付开销 |
| LCP / TBT / CLS | 固定配置的实验室测试 | 实验室页面加载与稳定性表现 |
| INP | 真实用户测量或明确的交互实验 | 相应用户与交互场景的响应表现 |

`node_modules` 体积不等于客户端 JS；`.output` 总体积不等于首页体积；磁盘原始字节不等于 HTTP 压缩传输字节。HTML 内联的数据已经算入 HTML，不要再累加一次。

Lighthouse 普通导航测试不能测得真实用户 INP，TBT 不能直接替代它。真实 Core Web Vitals 达标需按移动端/桌面端分别看足够样本的 p75；小流量项目可先报告实验室结果及样本限制。[Web Vitals](https://web.dev/articles/vitals)

### 固定条件与原始证据

- 记录 OS、CPU、内存、Node/npm 版本、锁文件、源码版本、浏览器版本、API 地址及固定文章内容版本。
- 测量生产构建；开发服务器的数据另列为开发体验实验。
- 区分直接打开 URL、站内跳转、点击弹窗和滚动加载。预取请求也要记录。
- 固定视口、网络限速、CPU 限速、登录状态、浏览器扩展状态和测试操作。
- 构建至少保留 5 次同条件成功运行的原始时间，汇总中位数和最小/最大值；浏览器核心对比也尽量运行 5 次。
- 首次构建单独记录。后续连续构建标为“缓存已预热的重复生产构建”；不要仅因删除 `.output` 就宣称完全冷构建。
- 比较完整冷构建时，先列清缓存目录、准备步骤和安装步骤，A/B 两边执行相同流程。操作前核对待清理路径确属项目生成目录。
- 安装缓存、框架缓存、操作系统文件缓存、浏览器缓存、API/CDN 缓存分别描述。不要统称“开了缓存”。
- 每次保存成功/失败状态。若排除异常样本，保留它并写出具体原因；不能只保留最好的一次。
- `改善比例 = (before - after) / before × 100%`，仅用于同口径且数值越低越好的指标；before 为 0 时不计算。
- 小于自然波动的变化标为“未证实稳定改善”，不要将单次快几十毫秒写成优化成果。

实验模板：[experiment-template.md](../performance/experiment-template.md)。建议每个实验复制一份到 `docs/performance/experiments/`。大型报告存 CI artifact 或项目本地 `.perf-results/`，文档保存路径、版本、运行编号和可持久保留的摘要；需要长期面试展示的证据要在 CI artifact 过期前归档。HAR、trace 和日志分享前清理 Cookie、令牌与私人内容。

## 阶段 0：读懂构建链路，冻结实验起点

**目标：** 能解释为什么同一个 Nuxt 项目会有客户端和服务端两类产物，并能重新找到实验前的源码。

按顺序阅读：

1. `package.json` 与 `package-lock.json`：区分声明版本范围和实际锁定版本。
2. `nuxt.config.ts`：入口、模块、全局 CSS、Vite 配置、API 地址。
3. `app/app.vue`、`app/layouts/default.vue`、`app/pages/index.vue`：首屏组件链路。
4. `app/plugins/api.ts`、`app/composables/useAPI.ts`、`app/services/posts.ts`：数据获取链路。
5. `.github/workflows/test-vps-ssh.yml`：安装、构建、打包、部署和验证边界。

在项目根目录用 PowerShell 执行只读检查：

```powershell
git status --short
git rev-parse HEAD
node --version
npm --version
npm ls nuxt vite @nuxt/cli tailwindcss --depth=2
```

`npm ls` 若报告依赖异常，先保留原始输出并查原因。不要为了让命令变绿直接升级所有依赖。

自己画出下面两条链，并补充每一步的输入、输出：

```text
Vue / TS / CSS → Nuxt + 构建器 → 客户端资源与前端 SSR 产物 → 发布归档
浏览器 → Nuxt HTML → JS/CSS 与 hydration → 用户交互 → Worker API
```

建立自己的实验分支。先检查已有改动，用明确文件列表形成可复现的基线提交；不要直接 `git add .` 把无关内容混进去，也不要 reset/clean 丢弃当前修改。暂不提交时，记录 HEAD 和相关差异及未跟踪文件快照，且必须能恢复同一状态。

**验收：** 写出“我如何恢复 baseline”，并解释 `.output/public` 与 `.output/server` 的职责。

**追问：** `optimizeDeps` 解决什么问题？能否把调整它称为生产拆包优化？Vite 依赖预构建用于开发模式，生产构建要看生产产物。[Vite 依赖预构建](https://vite.dev/guide/dep-pre-bundling.html)

## 阶段 1：运行生产构建，建立 baseline

**目标：** 先得到可信的原始数据，这个阶段不修改业务代码。

### 1.1 准备依赖与运行环境

确认环境变量指向可用的开发/测试 API。本文不要求修改或发布 Worker，按已有后端文档启动现有环境即可。

需要从锁文件恢复根项目依赖时执行 `npm ci`；它会重建根 `node_modules`，安装后的 `nuxt prepare` 时间属于安装总时间。Worker 子项目是否单独安装由其现有配置决定，不以根目录安装成功代替验证。

生产构建例子：

```powershell
$env:NUXT_PUBLIC_API_BASE = 'http://localhost:8787/api'
$env:BUILD_RELEASE_ID = 'perf-baseline'
npm run build
```

如果使用其他 API，替换为自己的测试地址，并在所有对照实验中保持一致。

### 1.2 记录构建耗时

当前练习采用 Git Bash，由本人执行项目提供的 [measure-build.sh](../../scripts/measure-build.sh)：

```bash
PERF_NOTES='填写实际供电、电源模式和后台负载' bash scripts/measure-build.sh build-first
```

脚本默认使用 `http://localhost:8787/api` 和 `perf-baseline`，可通过 `NUXT_PUBLIC_API_BASE`、`BUILD_RELEASE_ID` 环境变量覆盖；`--help` 可查看完整说明。需要已安装 Node/npm 和项目依赖。

每次结果保存在 `.perf-results/baseline/<run-id>/`，包含 `build.log`、`elapsed.txt`、`environment.json`、`source-status.txt` 和 `result.json`。已有编号不会覆盖；构建失败仍保存结果，并返回构建退出码。查看首次结果：

```bash
cat .perf-results/baseline/build-first/result.json
tail -n 40 .perf-results/baseline/build-first/build.log
```

脚本以 Bash time 测量 `npm run build`，包含 npm 启动和日志写入，不包含环境信息采集。它不安装依赖、不清缓存、不启动服务、不部署。默认缓存记录为“现有缓存，未清理”，首次记录不能直接称为冷构建。中断的运行可能没有 result.json，不作为成功样本。

Git 状态文件不是完整源码快照；遇到相关未提交代码仍要另行保留。脚本本身与测量工具也需要版本可追溯，A/B 使用同一版本和同一 shell 环境。Git Bash 与 WSL 是不同运行环境，不混合计时。

下面保留 PowerShell 手动计时方式作为学习参考，正式对比固定选用一种方式：

在本地建立 `.perf-results/` 目录；自行将它加入本地 Git 排除配置或项目 `.gitignore`，避免意外提交大型结果。下面每次使用新编号，不覆盖旧记录：

```powershell
New-Item -ItemType Directory -Force .perf-results/baseline
$runId = 'build-01'
$timer = [System.Diagnostics.Stopwatch]::StartNew()
npm run build *> ".perf-results/baseline/$runId.log"
$buildExit = $LASTEXITCODE
$timer.Stop()
[pscustomobject]@{
  run = $runId
  seconds = $timer.Elapsed.TotalSeconds
  exitCode = $buildExit
} | ConvertTo-Json | Set-Content ".perf-results/baseline/$runId.json"
if ($buildExit -ne 0) { throw 'Build failed; inspect the saved log.' }
```

该计时包含 npm 启动和日志重定向的开销。A/B 使用同一命令。首次单独记录，再执行至少 5 次预热后的重复构建，每次更换编号；只汇总同一组条件。

同时从日志读取 client、server、Nitro 等阶段时间。日志阶段可能有重叠，不能强行相加代替总墙钟时间。

### 1.3 建立产物清单

```powershell
Get-ChildItem -LiteralPath .output/public/_nuxt -Recurse -File |
  Where-Object { $_.Extension -in '.js', '.css' } |
  Select-Object FullName, Length |
  Export-Csv .perf-results/baseline/client-files.csv -NoTypeInformation -Encoding UTF8
```

把 JS、CSS 分别求和，统一用 B 或 KiB（1 KiB = 1024 B）。这只是原始大小。

本轮用户完成单文件测量练习后，将目录统计脚本交由教练实现。现有 `scripts/measure-build.mjs` 使用 Node 文件系统和 `node:zlib`，支持单个 JS/CSS 文件或递归目录统计，输出固定参数的原始/gzip/Brotli 字节数、JS/CSS 汇总、完整清单及 Top 10。目录遍历跳过符号链接。输出保留运行时版本、压缩参数和文件哈希；文件独立压缩之和不能叫做发布归档大小，也不能假设部署服务器采用相同压缩。

在项目根目录的 Git Bash 执行：

```bash
node scripts/measure-build.mjs .output/public/_nuxt
```

如需保存结果，使用新的文件名；Bash 的 `>` 会覆盖已有文件，可先通过 `set -o noclobber` 禁止覆盖：

```bash
set -o noclobber
node scripts/measure-build.mjs .output/public/_nuxt > .perf-results/baseline/client-compression-01.json
```

命令成功后再使用结果；错误输出走 stderr 并返回非零退出码。脚本不会执行构建或写入产物，压缩估算用时不计入 build 耗时。

### 1.4 读 bundle 分析报告

先核对本地 CLI，再运行分析：

```powershell
npx --no-install nuxt analyze --help
npx --no-install nuxt analyze --name baseline --no-serve
```

以命令输出中的报告目录为准，及时复制到 baseline 证据目录，后续 analyze 可能清理原报告。分别观察客户端报告和 Nitro 报告，找出最大的模块、引入链和路由归属。

当前本地 Nuxt CLI 的 analyze 实现会覆盖部分构建输出命名，并明确提示分析产物不用于部署。**分析完成后重新运行正常 `npm run build`，再做浏览器测量或打包发布。** 不把 analyze 运行时间混进普通 build 数据。[Nuxt analyze](https://nuxt.com/docs/3.x/api/commands/analyze)（该链接为 CLI 参考；当前项目以本地 `--help` 和实现为准）。

### 1.5 测量实际页面并确认功能

另一个终端启动：

```powershell
npm run preview
```

固定测量 `/`、`/posts`、一篇内容稳定的 `/posts/<slug>`，以及测试管理员进入 `/admin` 的场景。登录态使用同一主机名；不要在 localhost 和 127.0.0.1 之间切换后把 Cookie 差异当成性能变化。

浏览器操作步骤：

1. 使用干净的浏览器配置，固定窗口与限速，Network 清空记录；冷浏览器实验启用 Disable cache。
2. 直接打开页面，从导航开始到 load 后 5 秒作为“初始加载观察窗口”，期间不交互；记录窗口内资源及任何自动预取。这个窗口只是实验约定，不等于 LCP。
3. 单独记录 document、JS、CSS、API、图片以及 payload 文件；区分 transferred 和 resource size。
4. 保存 HAR 或截图；从 Response Headers 查看实际 `Content-Encoding`，并标记 memory/disk cache。
5. 用 Performance 或 Lighthouse 保存页面报告。随后另开一次记录进行站内导航或点击弹窗，避免与初始窗口混算。

本地 HTTP/preview 与线上反向代理压缩、TLS、网络条件可能不同，两组数据分别记录。

现有冒烟检查例子（preview 与测试 API 已运行）：

```powershell
$env:PLAYWRIGHT_BASE_URL = 'http://127.0.0.1:3000'
$env:PLAYWRIGHT_API_BASE = 'http://localhost:8787/api'
$env:RELEASE_ID = 'perf-baseline'
npm run test:smoke
```

`RELEASE_ID` 必须匹配构建时的 `BUILD_RELEASE_ID`。首次缺 Chromium 时按 Playwright 的实际提示安装；这属于环境准备，不计入 Nuxt 构建。当前测试不自动启动服务器，也没有覆盖全部文章详情、评论和管理员写操作，需要后续按改动补充人工验收。

**验收：** baseline 至少有源码标识、5 次同条件构建时间、逐文件清单、指定页面网络证据、功能结果。没有现成 `typecheck` 脚本时不能声称执行过它；若引入检查工具，单独记录其依赖改动。

**追问：** 为什么总 JS 变少而首页 JS 不变？为什么相同代码第二次构建更快？

## 阶段 2：审计依赖，逐组清理遗留内容

**本轮状态（2026-09-14）：已完成既定三组清理并保留改动。** [Prisma 清理](../performance/phase-2-prisma-cleanup.md)、[nuxt-auth-utils 清理](../performance/phase-2-auth-cleanup.md)、[Markdown 依赖归属](../performance/phase-2-markdown-cleanup.md)分别记录审计和验证证据。根项目累计移除 12 个直接声明、190 个锁文件安装路径条目；客户端 22 个 JS/CSS 内容哈希不变。Worker 补齐 4 个直接声明且既有依赖版本不变。未验证安装提速；后两组因电池供电不进行构建耗时对比，原有管理员认证异常不在本轮修复范围内。

**目标：** 根据实际引用确认哪些依赖仍参与开发、构建或运行，理解 tree shaking 的边界。

先搜索，避免凭依赖名称删除。以下命令为清理前练习记录；清理后的旧 server 和 Prisma 配置已归档，不再位于原路径：

```powershell
rg -n 'prisma|adapter-mariadb|nuxt-auth-utils|dotenv|unified|remark-|rehype-|shiki' app server worker prisma.config.ts package.json
rg -n 'prisma|nuxt-auth-utils|dotenv|unified|remark-|rehype-|shiki' .github docs -g '*.yml' -g '*.md'
```

对每个候选包建立表：声明在哪个 package.json、谁引用、是否活跃入口、是否有 CLI/生命周期用途、客户端报告是否出现、删除会影响哪部分。必要时运行 `npm explain <真实包名>` 追踪传递依赖。

修改顺序：

1. 核对旧 `server/`、Prisma 配置及生成代码仍有无有效用途。
2. 选择一组已证明不再需要的根依赖，列出保留或归档旧文件的理由。
3. 使用 `npm uninstall` 加实际包名，同步更新 `package.json` 与 `package-lock.json`；不要手工只删锁文件条目。
4. 若旧配置引用了已移除包，处理这些失效配置或明确归档位置，更新对应文档。
5. 验证 Worker 自己声明并能独立解析仍需的 Markdown 等依赖；存在隐式依赖时，先单独处理归属问题。
6. 正常生产构建、运行相关回归，再按阶段 1 复测。

**为什么：** 不进入客户端依赖图的包，删除后可能只改善安装与维护成本；移到 devDependencies 也不会自动改变客户端是否打包。

**容易踩坑：** `zod` 还被现有冒烟测试引用；关闭业务 serverDir 不代表所有工具都不会检查旧文件；前端暂时没引入某个包不等于 CI 脚本没使用。

**验收：** 每个删除决定都有引用证据、对应 diff 和运行验证；安装、构建、客户端体积分别报告，允许某项没有变化。

**追问：** tree shaking 为什么不能保证删除所有未使用代码？副作用、静态可分析性、服务端 external 依赖分别影响什么？

## 阶段 3：Tailwind 入口与文章 CSS

**目标：** 通过一个容易观察的实验掌握 CSS 生成、全局引入和路由样式加载。

按顺序修改这些文件，但分两次实验：

1. `app/assets/css/main.css`：保留主 Tailwind 入口与项目主题。
2. `app/assets/css/post.css`：先尝试将重复入口替换为引用主样式的指令，其他规则保持不变。

```css
/* post.css：引用主题/工具定义供 @apply 使用，不再次输出主样式。 */
@reference "./main.css";
```

先正常构建并对比 CSS 产物，确认是否减少重复输出。源码里两个 import 并不能证明构建器最终输出了两份。[Tailwind @reference](https://tailwindcss.com/docs/functions-and-directives#reference-directive)

第二次实验再调整加载范围：从 `nuxt.config.ts` 全局 `css` 中移除 post.css，然后在 `app/pages/posts/[slug].vue` 的 setup 中引入：

**本项目实测更新：** 下方 script import 是已试验但未保留的候选，出现 SSR 正文样式收集缺失。当前改为在文章页面已有的非 scoped `<style>` 顶部写 `@import '~/assets/css/post.css';`，已确认正文规则进入 SSR HTML。客户端仍会请求外部文章 CSS，需记录内联与外部请求的双重成本。真实正文和交互验收待本地 Worker 恢复。详见[页面 CSS 实验记录](../performance/phase-3-page-css.md)。

```ts
import '~/assets/css/post.css'
```

正文用 `v-html`，初次实验保留 `.post` 等普通选择器；不要顺手全部改为 scoped，否则可能无法命中注入的正文元素。

比较三个维度：CSS 全量产物、首页实际 CSS、文章页实际 CSS。路由预取、共享 chunk 和框架内联 CSS 都可能影响结果，以生产 HTML 和 Network 为准。

视觉验收：直接打开文章、首页点击进入文章、返回再进入、窄屏、TOC、长代码块、列表和主题颜色。检查是否出现未加载样式的闪烁。懒加载不是延迟首屏必要文章样式的理由。

**验收：** 两次实验分别有数据，能说明收益来自减少重复生成还是减少页面加载范围。小体积变化不能直接推导 LCP 明显改善。

**追问：** `@import` 和 `@reference` 差在哪里？按页面引入为什么仍可能被预取？

## 阶段 4：从后台弹窗理解按需加载

本轮进度：已完成动态分包、HAR 核对与加载/失败/超时反馈，2026-09-15 用户明确反馈阶段 4 验收完毕，保留当前实现。首次点击仍存在网络等待，未宣称首屏提速。数据、受控检查与用户反馈的范围见[弹窗实验记录](../performance/phase-4-modal-lazy.md)。阶段 3 的真实文章人工验收单独跟踪。

**目标：** 区分路由分包、条件渲染、动态 import、资源预取和 hydration。

先阅读 `app/pages/admin/index.vue`、`app/components/BaseModal.vue` 和相关服务。追踪点击 `+` 到 `modalOpen`、组件渲染、表单提交的过程。

第一次只做最小实验：把模板中的 `BaseModal` 成对替换为 `LazyBaseModal`，保留原有 `v-if`、props 和事件绑定。不要把原本不合法的 props 类型问题计入性能收益；如需修复，单独记录。

Nuxt 支持通过 Lazy 组件形成动态导入，是否推迟下载取决于何时渲染及其他引入/预取路径。[Nuxt 组件文档](https://nuxt.com/docs/4.x/directory-structure/app/components)

测量两个场景：

- 测试管理员直接进入后台，不打开弹窗，记录初始 JS 与 chunk 归属。
- 冷浏览器条件下第一次点击 `+`，记录新请求及点击到表单可用时间；再次打开作为暖缓存场景，单独记录。

如果弹窗很小，拆包可能增加请求开销而收益有限。比较后可以保留原实现，并在报告中解释原因。若保留异步加载，按实际需要完善加载反馈和失败重试体验。

功能验收：打开、关闭、再次打开，Upload/Update/Delete 三种状态，测试环境提交成功与失败反馈。现有匿名冒烟测试无法代替这些流程。

进阶实验（基础完成后可选）：把文章评论移入按需挂载的容器。页面保留占位与观察目标，接近视口时渲染 Lazy 组件；让请求随着该组件 setup 启动，保留刷新、登录与删除权限行为。`lazy: true` 的数据获取选项不等于视口触发；只延迟 hydration 也不等于阻止页面级请求。卸载时清理 observer，并验证短文章、滚动后离开再返回的行为。

**验收：** 能指出请求何时发起、谁触发，以及首次交互是否变慢。不以 chunk 数量越多为优化目标，不先手写一个巨大的 vendor 分组。

**追问：** 为什么 `v-if` 不等于代码分割？为什么后台已有路由分包后还要测弹窗分包的增量收益？

## 阶段 5：减少不需要的 Nuxt payload

本轮进度：2026-09-15 前端 transform 实验已验证并保留。固定文章 payload 23808 → 21204 B，Worker 响应哈希不变；全量 JS/CSS 略增。正常页面和 404 由用户检查通过，SSR 301 与客户端重定向使用受控 API 响应验证通过；未覆盖真实数据库旧 slug 查询，未宣称加载提速。见[文章 payload 实验记录](../performance/phase-5-post-payload.md)。后端精简可作为独立延伸实验；其他阶段的待验收项仍单独跟踪。

**目标：** 理解 JS bundle 和 SSR 序列化数据是两条不同的传输路径。

按顺序阅读 `app/types/posts.ts`、`app/services/posts.ts`、`app/composables/useAPI.ts`、`app/pages/posts/[slug].vue`。只为确认返回结构阅读 Worker 的详情查询，本阶段不修改 Worker API。

画出：Worker JSON → useAPI/useFetch → 序列化的 Nuxt payload → 页面 hydration。标出原始 Markdown、HTML、TOC 和重定向数据。

第一次实现前端转换：

1. 定义阅读页所需的明确类型，正常详情移除原始 `content` 字段，保留 `contentHTML`、TOC 和页面需要的元数据。
2. 在详情服务的数据转换处处理正常详情；重定向分支原样保留。
3. 如果需要让 `getDetail` 接受选项，先核对现有 `createUseFetch` 包装的泛型和 transform 签名，避免用 `any` 绕过类型。
4. 保留 API envelope 中现有状态字段。外层 `pick` 只选择 `data` 不会自动移除 `data.content`。

Nuxt 支持用 transform/pick 控制交给组件和序列化的数据，具体嵌套结构需要自己正确处理。[Nuxt 数据获取](https://nuxt.com/docs/4.x/getting-started/data-fetching)

验收两条路径：直接打开文章的 SSR + hydration，以及列表点击文章的客户端导航。两者都验证正文、TOC、旧 slug 重定向和错误状态。

分别记录 Worker API 原始 JSON、SSR 文档大小、存在时的独立 payload 文件大小，确认去掉的字段没有进入 Nuxt payload。前端 transform 并不会减少 Worker → Nuxt 的原始响应，客户端导航的 API 原始响应也仍可能完整下载。API 精简作为后续独立实验，届时同步修改类型、服务和接口文档。

**验收：** 数据变化有实际响应证据；不把 payload 下降写成 JS bundle 下降。

**追问：** 为什么已经渲染过的正文还可能出现在 payload？保留客户端导航和 hydration 正确性需要哪些字段？

## 阶段 6：让构建优化进入 CI

本轮进度：frontend-build-check.yml 已接入安装、源码与环境元信息、构建、JSON 测量、Markdown 摘要及 artifact 上传。本地语法/脚本验证和初版构建通过，尚未运行 GitHub Actions；下一步准备真实 PR 采样并建立预算。见[阶段 6 记录](../performance/phase-6-ci-budget.md)。后端接口精简不在本轮范围。

**目标：** 找出开发交付中的真实耗时，并防止资源体积在后续修改中回退。

先读现有工作流，不覆盖它已经具备的 npm 缓存、版本标记、发布回滚和冒烟检查。

分步练习：

1. 把安装、浏览器安装、Nuxt 构建、打包、上传、部署、测试的时间分别列出。浏览器安装变快属于 CI 效率，不属于 Nuxt 编译变快。
2. 对已有 npm 缓存分别记录命中与未命中。它主要复用下载内容；`npm ci` 仍会执行依赖安装及生命周期脚本。
3. 仅在某个构建缓存确实被本地安装版本复用时考虑持久化。记录缓存目录、OS、Node、锁文件、配置变化和失效策略，验证旧结果不会污染新构建。不直接照抄缓存整个 `.nuxt` 的方案。
4. 把阶段 1 自己写的测量脚本接入独立 PR 检查，输出机器可读 JSON 与人类可读摘要。PR 检查只构建验证；SSH 和生产 secrets 留在受信任的部署流程。
5. 在实测 baseline 和波动范围基础上建立资源预算，覆盖“入口依赖闭包”或明确页面的加载集合；如果只统计所有 JS 总和，就把指标命名为全量 JS。
6. 预算初期先报告，稳定后再设置失败阈值。使用业务角色或 manifest 解析定位资源，避免绑定每次变化的哈希文件名。
7. 保存结果为带源码标识的 CI artifact，注明保留时间。网络类指标有波动，固定 fixture 与环境后再决定是否作为阻断条件。

如果引入 Lighthouse CI 或额外测量依赖，单独提交工具接入，并重建工具一致的 A/B 基线，避免把工具升级混进优化效果。功能用例可以使用稳定 fixture，但不能把纯 mock 下的测试宣称为真实 API 性能。

**验收：** 用临时分支的一次已知超预算改动确认检查会失败，撤回该验证改动后检查通过。报告能够关联 commit/release，原发布健康检查仍有效。

**追问：** 为什么缓存命中但构建没有明显变快？预算如何避免误报？为什么不能根据文件名中的 hash 追踪逻辑模块？

## 阶段 7：整理能复现的成果与面试答案

**目标：** 用完整证据解释自己的贡献，不把框架默认能力包装成新增工作。

建立最终报告，至少包含：

1. 项目原有行为与瓶颈证据。
2. baseline 和最终版本的准确源码状态、环境、命令与固定数据。
3. 每项实验的假设、最小修改、原始记录索引、前后汇总和回归结果。
4. 一次收益不明显或被放弃的实验，以及为什么放弃。
5. 最终整体 A/B 复测。不要把不同阶段百分比直接相加；有条件时交替测 A/B 降低机器状态漂移影响。
6. 尚未验证的线上效果与现实限制。

复现旧版本优先用独立 worktree/检出目录。每个版本安装各自锁文件中的依赖；不要共享已被更改的 node_modules，不覆盖当前用户工作区。

建议每项优化用下面的逻辑讲 2 分钟：

```text
业务场景 → 基线证据 → 原因定位 → 修改方案 → 原始数据与验证 → 代价和适用边界
```

自测追问：

- 这个改动改善的是下载、解析执行、渲染还是构建效率？证据在哪？
- 哪个优化是 Nuxt 默认已有的，你新增了什么？
- 你如何排除缓存、文章内容变少或机器状态造成的差异？
- 如果把优化撤回，如何重复验证变化来自这项修改？
- 有没有失败实验？第一次打开弹窗更慢时怎么权衡？
- 同事新引入一个重依赖，你的检查能发现吗？如何定位到引入链？

简历句式（字母仅是占位，实测前不能使用）：

> 基于 Nuxt 构建产物和浏览器请求分析，完成文章 CSS 加载范围优化与后台弹窗按需加载，将指定页面初始加载 JS 从 A KiB 降至 B KiB；建立资源预算和 CI 回归检查，并覆盖首次交互与文章阅读流程。

如果实际收益主要在工程效率，就写安装/构建效率；如果只有本地结果，明确写本地固定环境。只有数据足够支持时再报告线上用户体验改善。

## 第一次开始时，你只需要完成这些

- 阅读阶段 0 中的五组文件。
- 建立环境表与可恢复的 baseline 状态。
- 画出构建和页面请求两条链。
- 向教练提交自己的解释和疑问，然后开始阶段 1。

可以这样提问：

```text
使用 frontend-build-coach 审查阶段 1。
我的代码版本与环境是……；运行命令是……；记录文件在……。
我认为最大的开销来自……，依据是……。
请先检查我的数据口径，再给下一步提示，不要直接替我修改业务代码。
```

本路线结束后，可另开页面渲染缓存、图片优化和真实用户监控专题。先把构建与交付链路讲透，再扩展性能领域。
