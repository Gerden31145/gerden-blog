# 阶段 2 实验 03：Markdown 依赖归属

状态：已验证并保留。Worker 直接依赖补齐与 Nuxt 根项目 7 项声明清理完成，静态审查、用户报告的 Worker 类型检查、本地转换函数检查、Nuxt 构建、客户端产物复测及指定页面人工检查通过。不声称安装或构建提速。

## 当前处理链路

当前源码为 Worker queue 入口 → render-post.consumer.ts → processPostRenderJob → markdownToHTML → 渲染 HTML/TOC 写入数据库。文章 API 从数据库读取 contentHTML，Nuxt 详情页通过 v-html 展示；API 当前同时返回 Markdown 原文 content，不是只返回 HTML。

Nuxt 根项目的旧 server 已在实验 01 中归档移除。Worker 仍需要实际调用的 unified、remark、rehype 和 Shiki，不能随根项目声明一起删除。

## 准备步骤：声明直接使用的依赖

用户通过 npm --prefix worker explain 检查 @shikijs/langs 和 @shikijs/types，二者当前由 Worker 内的 shiki 等包间接安装。这里 npm 输出中的 root project 是 worker，不是仓库根目录。教练核对安装目录与 Worker 锁文件版本一致。

markdown.service.ts 还直接使用 mdast 与 vfile 的类型；以下四项在 Worker 根声明中缺失：

| 声明 | 当前安装/锁定版本 | Worker 源码用途 | 拟声明位置 |
| --- | --- | --- | --- |
| @shikijs/langs | 4.2.0 | 运行时语言语法导入 | dependencies |
| @shikijs/types | 4.2.0 | import type | devDependencies |
| @types/mdast | 4.0.4 | 为 mdast 的类型导入提供声明 | devDependencies |
| vfile | 6.0.3 | import type 与模块类型扩展 | devDependencies |

直接声明可以明确 Worker 自己的代码依赖契约，避免依赖传递安装布局。纯类型用途的直接声明放在 devDependencies；若其他运行时依赖也需要同一个包，它仍可出现在生产安装树中，不等于强制从生产树移除。

计划固定使用当前已安装版本，预期不改变渲染代码和依赖实际版本。此为依赖归属修正，不记作前端性能优化成果。

## 用户执行顺序

1. 保存当前 worker/package.json 与 worker/package-lock.json 到独立证据目录。
2. 运行现有 npm --prefix worker run typecheck，先记录修改前结果；如失败，先报告，不将既有失败归因于新依赖声明。
3. 添加上表的四个直接声明，保持当前版本。
4. 再次 typecheck；审查 Worker 清单/锁文件的实际 diff，与前端根项目清理分开。
5. 之后再验证 Worker 模块解析来源，并准备根项目 Markdown 依赖卸载实验。

## Worker 准备改动验证

教练将当前 Worker 清单/锁文件与 `.perf-results/phase-2-markdown/worker-before/` 对比：

- 恰好增加上表 4 个直接声明，版本均与原安装版本相同。
- Worker 锁文件没有新增或移除安装路径，保留的非根条目完全不变；只有根条目添加直接声明。
- Worker 当前锁文件 SHA-256：bb951520c5b08612de436a444062986fb91f6a5496317c49509f36d9d3209ca7。
- Nuxt 根锁文件仍为上一组结果：94268a0a69fba452f1f16ace1f4747db14d95bb901083b9a8f2f37d6366f637b，尚未发生本组根依赖清理。
- 用户报告安装完成、类型检查无报错；未单独提供修改前后的完整日志，不伪造两份命令结果。
- 从 markdown.service.ts 所在路径进行 Node 模块路径解析，unified、remark-parse、remark-gfm、remark-rehype、rehype-sanitize、rehype-stringify、@shikijs/rehype/core、shiki/core、shiki/engine/javascript、@shikijs/langs/bash 均落在 worker/node_modules。
- 使用 Worker 安装的 TypeScript 进行 Bundler 模式类型解析，mdast、vfile、@shikijs/types 分别解析到 worker/node_modules 内的 @types/mdast、vfile 和 @shikijs/types。
- 上述是当前磁盘布局下的指定模块解析证据，不是完整隔离安装测试，也不等同实际渲染执行。

## Nuxt 根依赖清理计划

根项目旧 server 已移除；对 app、shared、scripts、tests、.github、nuxt.config.ts 的检索未发现这组包的直接引用，根 package.json 仍保留以下 7 项：unified、remark-parse、remark-gfm、remark-rehype、rehype-sanitize、rehype-stringify、@shikijs/rehype。

用户先备份根 package.json/package-lock.json 到 `.perf-results/phase-2-markdown/root-before/`，保存当前 Worker 清单与锁文件到 worker-pre-root-removal/，再从项目根目录卸载上述 7 项。保留 Worker 同名依赖，后续核对根卸载是否影响 Worker 锁文件与解析。

## 根依赖清理静态审查

教练对比 `.perf-results/phase-2-markdown/root-before/` 与当前根清单、锁文件：

- dependencies 移除 unified、remark-parse、remark-gfm、remark-rehype、rehype-sanitize、rehype-stringify；devDependencies 移除 @shikijs/rehype，恰好 7 项。
- 根锁文件减少 99 个安装路径条目，没有新增条目；保留的非根条目没有变化，未附带升级其他包。
- after 根锁文件 SHA-256：45d28ed32b2e9571f66c6428b76ca4a723a1c921eeb53869f598834ec8054d36。
- worker/package.json 和 worker/package-lock.json 与 worker-pre-root-removal/ 的副本逐字节一致，根卸载没有修改 Worker 的依赖配置。
- Worker 锁文件仍为 bb951520c5b08612de436a444062986fb91f6a5496317c49509f36d9d3209ca7。
- 用户报告根卸载后 Worker 类型检查通过，尚未报告实际渲染执行。
- 当前 app、shared、scripts、tests、.github、nuxt.config.ts、根 package.json 未检出本组包的直接引用；Worker 业务源码无 diff。

## 本地 Markdown 转换检查

用户明确授权教练直接执行。2026-09-14，教练使用 `node.exe --import tsx --input-type=module -` 调用当前 Worker 的 markdownToHTML，命令退出码 0。

- 样例含一级标题、GFM 表格及 JavaScript 代码块。
- 断言检查标题和表格 HTML、Shiki class、代码 token 颜色样式，以及 TOC 文本与 HTML 标题 id 对应关系，全部通过。
- 原始输入、生成 HTML、TOC、Node 版本和通过项保存于 `.perf-results/phase-2-markdown/render-check-after.json`，以独占创建模式写入。
- tsx 是根项目已有的执行工具；本次调用使用 Worker 转换实现，不访问队列或数据库，不等同 Worker 运行时、完整隔离安装或队列端到端验证。
- 本次结果证明卸载后样例转换可以执行，没有卸载前同一样例输出快照，不声称前后 HTML 字节完全一致。

## Nuxt 构建与客户端产物复测

用户执行构建并完成页面检查。教练读取 `.perf-results/baseline/markdown-cleanup-check/result.json`：

- preparedAt：2026-09-14T08:31:45.897Z；命令 npm run build；退出码 0，耗时 8.266 秒。
- 电池供电、电源模式未记录，卸载后未清缓存；仅功能验证，不与之前插电样本比较耗时。
- Node v24.18.1、npm 11.16.0、Git Bash 5.2.37；API 为 http://localhost:8787/api、release 为 perf-baseline。
- 构建记录中的根锁文件 SHA-256 与本组 after 及当前工作区一致。

产物报告 `.perf-results/phase-2-markdown/client-assets-after.json` 测量时间为 2026-09-14T08:32:09.645Z。与上一组 phase-2-auth/client-assets-after.json 比较，运行时版本、压缩参数和脚本 SHA-256 均相同：

| 指标 | before | after |
| --- | ---: | ---: |
| JS 文件数 | 18 | 18 |
| JS 原始 B | 248706 | 248706 |
| JS gzip B | 96872 | 96872 |
| JS Brotli B | 85507 | 85507 |
| CSS 文件数 | 4 | 4 |
| CSS 原始 B | 34576 | 34576 |
| CSS gzip B | 6261 | 6261 |
| CSS Brotli B | 5298 | 5298 |

22 个文件的路径和内容 SHA-256 全部一致，当前磁盘产物与 after 报告相符。本组同样没有改变客户端 JS/CSS 内容，不据此推断 HTML 或服务端产物完全相同。

用户报告 preview 无异常，按此前布置范围记录：首页、列表、站内导航、固定文章的正文、代码高亮、TOC 跳转和评论请求。属于人工验证，不扩展为完整认证/队列端到端回归。

`.perf-results/phase-2-markdown/source-changes.patch` 为 161827 B，按统一换行与当前对应源码 diff 一致，包含 baseline 至当前的累计清理及 Worker 依赖声明修正。各组锁文件变化仍按各自 before 分别计算，不重复累加累计 diff。

## 决策与范围限制

当前未改 Worker 业务、队列逻辑、数据库、部署或认证行为。类型检查不能替代 Markdown 渲染执行；根依赖清理前后需要验证渲染流程或适当的独立渲染样例，不能仅打开数据库已有 HTML 的文章就声称 Markdown 生成仍正常。

决定保留：Nuxt 根项目移除 7 个直接声明、99 个锁文件安装路径条目；Worker 明确声明实际直接使用的 4 项依赖，已安装版本不变。验证覆盖本地类型与渲染函数、Nuxt 构建、客户端产物及指定公开页面。

不声称 Worker 完成隔离安装验证、完全摆脱父目录所有依赖或通过队列端到端测试。电池供电期间的构建耗时不纳入此前插电条件的性能对比。

至此阶段 2 的三组既定清理完成。累计根项目移除 12 个直接声明、190 个锁文件安装路径条目；对 baseline 的累计锁文件检查无新增条目，保留的非根条目不变。客户端 22 个 JS/CSS 内容始终不变。结论是依赖维护范围与职责边界得到整理，没有可报告的客户端体积下降或安装/构建提速。
