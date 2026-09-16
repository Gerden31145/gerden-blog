# 阶段 2 实验 01：清理旧 Nuxt Prisma 链路

状态：已验证并保留。静态审查、正常构建、产物复测、指定公开页面人工验证及候选版本 5 次重复构建记录完成；未观察到构建提速，客户端 JS/CSS 内容不变。阶段 2 的本组实验完成，其他依赖分组仍待审计。

## 假设与范围

- 日期：2026-09-13。
- 原始源码：`perf-baseline-source`，commit `40c3e259b3e2e70f12c90b1c6dee4abd0065bd2d`。
- 核对时，server、prisma、prisma.config.ts、package.json、package-lock.json 相对该 tag 没有差异。现有文档、脚本和 Worker 本地数据库状态有改动，不属于本次清理范围。
- 主要变量：从根项目移除旧 Nuxt Prisma/MariaDB 链路及其专用配置，并清理不再有直接用途的依赖声明。
- 预期：消除旧数据库实现及其依赖维护成本；客户端原始与压缩体积预计基本不变，构建耗时是否改变待测。
- 当前没有安装时间基线，不声称 npm 安装提速。若要验证此项，须在卸载前另行建立同条件安装实验。
- 本次保留 Worker、PHP 参考 backend、前端认证行为及其他根依赖；后续分组审计 Markdown、nuxt-auth-utils 等。

## 引用证据

| 对象 | 已核对的用途 | 本轮判断 |
| --- | --- | --- |
| prisma | 根 devDependency；prisma.config.ts 引用 prisma/config | 随旧 CLI 配置一起清理 |
| @prisma/client | 根 dependency；generated/prisma 使用其 runtime | 随旧生成客户端链路一起清理 |
| @prisma/adapter-mariadb | server/utils/prisma.ts 构造旧数据库适配器 | 随旧 server 实现一起清理 |
| dotenv 根声明 | prisma.config.ts 引用 dotenv/config | 移除根声明；允许必要传递依赖保留 |

用户的 npm explain 输出表明，@prisma/client@7.8.0 由根项目直接引入。dotenv@17.4.2 同时由根项目和 c12@3.3.4 依赖；c12 属于 Nuxt CLI/Kit、Nitro 及 Prisma 配置等链路。删除根 dotenv 声明不代表它从安装树消失，也不能手工删除 Nuxt 仍需的传递依赖。

旧调用链：server API 路由或 service → server/utils/prisma.ts → generated/prisma → @prisma/client runtime 与 MariaDB 适配器 → 数据库。Nuxt 当前 serverDir 为 disabled-server；根 scripts 和当前 CI 未发现显式 Prisma generate/migrate 命令，app、shared、tests、scripts、当前 Worker 源码未检出对上述旧实现路径的引用。

配置与生成代码也属于引用证据，不能只搜索 app。当前生成的 Nuxt tsconfig.server.json 包含 disabled-server；未断言现有类型检查必然扫描旧 Prisma 文件。保留失效引用会给今后工具使用带来风险，是否触发报错仍取决于执行入口及扫描范围。

## 用户执行方案

1. 在 `.perf-results/phase-2-prisma/` 归档 baseline tag 中的 server、prisma、prisma.config.ts。先查看 zip 文件清单，确认包含预期文件。
2. 从工作区移除旧 server/、prisma/、prisma.config.ts，以及可重新生成且被 Git 忽略的 generated/prisma/。归档整个旧 server 可以避免留下仍引用 Prisma 的路由和 service；历史实现仍可由 baseline tag 与 zip 查阅。此归档是源码参考，不是独立可运行应用，不包含环境凭据。
3. 在根目录通过 npm uninstall 移除 prisma、@prisma/client、@prisma/adapter-mariadb、dotenv，由 npm 更新 package.json 与 package-lock.json。
4. 用户报告 diff 与卸载结果后，教练检查实际变更及剩余引用，防止把残留问题或无关锁文件变更混入实验。

## 候选改动静态审查

2026-09-13，用户提供清理后的 diff，教练进一步核对工作区：

- package.json 恰好移除预定的四个根依赖声明。
- 与 baseline 锁文件逐条比较，packages 表删除 75 个安装路径条目，没有新增条目。保留的非根条目内容完全一致，未发现附带升级；根条目的变化对应上述四项声明。
- dotenv@17.4.2 仍保留在根锁文件中，符合 Nuxt/c12 仍依赖它的预期。75 个锁文件路径条目不等同于 75 个唯一包名、实际磁盘删除数量或浏览器依赖数量。
- server/、prisma/、prisma.config.ts、generated/prisma/ 均已移除。当前 app、shared、scripts、tests、.github、Worker 源码及相关配置范围中未检出 Prisma 或 dotenv 直接引用。
- ZIP 包含预期的 22 个历史源码文件；归一化 CRLF/LF 后，全部内容与 baseline tag 一致。ZIP 与 Git blob 的换行不同，未记录为字节完全一致；未发现其他内容差异。
- app、nuxt.config.ts、worker/package.json、worker/package-lock.json 无 diff。
- 用户 diff 中的文档、.gitignore、问答笔记和 Worker 本地 SQLite 状态变化属于已存在的其他工作，不计入本轮清理收益，也不一并恢复或提交。
- git diff --check 未发现空白错误；文档 LF/CRLF 提示是换行转换提示，不是构建失败。

## 候选版本首次正常构建

用户执行测量脚本并报告成功，教练核对 `.perf-results/baseline/prisma-cleanup-first/result.json`：

- 开始时间：2026-09-13T15:07:58.113Z；run 为 prisma-cleanup-first。
- 命令：npm run build；退出码 0；耗时 8.734 秒。
- Node v24.18.1、npm 11.16.0、Git Bash 5.2.37；API 为 http://localhost:8787/api，release 为 perf-baseline。
- 锁文件 SHA-256：658e139300b29f42e789b806d69645aae33bd5b97efc57ad947b9cc8162aadbc。
- 用户记录条件：插电、最高电源模式、Nuxt dev/preview 停止、Worker dev 运行；卸载后保留现有缓存，未清理。
- HEAD 仍为 baseline commit，清理属于未提交差异，不能仅凭 HEAD 识别候选源码。
- 用户日志尾的服务端摘要仍为 2.93 MB（734 kB gzip）。摘要经过格式化取整，仅能记录显示值一致，不证明服务端逐文件完全相同，也不能用作客户端体积。

本次只验证候选源码能够正常构建。它是卸载后的首次记录且与原五次样本跨日，不与原中位数直接计算改善或退化比例。

## 客户端产物复测与功能验证

用户保存 `.perf-results/phase-2-prisma/client-assets-after.json`，教练与 baseline 的 client-compression-coach-20260912.json 对比。测量时间为 2026-09-13T15:36:29.396Z；Node、zlib、Brotli 版本、压缩参数和测量脚本 SHA-256 均与 baseline 相同。

| 指标 | before | after | 差值 |
| --- | ---: | ---: | ---: |
| JS 文件数 | 18 | 18 | 0 |
| JS 原始 B | 248706 | 248706 | 0 |
| JS gzip B | 96872 | 96872 | 0 |
| JS Brotli B | 85507 | 85507 | 0 |
| CSS 文件数 | 4 | 4 | 0 |
| CSS 原始 B | 34576 | 34576 | 0 |
| CSS gzip B | 6261 | 6261 | 0 |
| CSS Brotli B | 5298 | 5298 | 0 |

22 个文件的路径和 SHA-256 全部一致，测量报告也与当前磁盘文件一致。这是客户端 JS/CSS 内容没有变化的直接证据；不扩展为 HTML、构建元数据或 SSR 服务端产物完全一致。

`.perf-results/phase-2-prisma/source-changes.patch` 已保存 package.json、package-lock.json 和旧 Prisma/server 路径的变更，按统一换行核对与当前对应 diff 一致。候选版本可由 baseline tag 加此差异识别；测量脚本另由报告哈希及项目脚本文件关联。

用户报告新构建 preview 页面检查完成、无异常，覆盖此前布置的首页直达、首页到列表再到详情的站内导航，以及固定文章刷新后的正文与评论请求。此为用户人工验证，未执行自动化测试，也不声称覆盖登录与后台操作。

测量时遇到 Git Bash 的 stdout is not a tty：原 client-assets-after.json 为 0 B，源码 patch 已生成。随后改用 node.exe 绕过可能的 winpty 别名，并用 >| 覆盖空结果；现 JSON 完整、可解析，旧失败文件未作为有效测量。

## 候选版本 5 次重复构建

用户完成运行，教练读取 `.perf-results/baseline/prisma-cleanup-01` 至 `prisma-cleanup-05` 的 result.json 核对：

| 编号 | 耗时（秒） | 退出码 |
| --- | ---: | ---: |
| prisma-cleanup-01 | 6.984 | 0 |
| prisma-cleanup-02 | 7.086 | 0 |
| prisma-cleanup-03 | 7.095 | 0 |
| prisma-cleanup-04 | 7.145 | 0 |
| prisma-cleanup-05 | 7.192 | 0 |

- 中位数：7.095 秒；范围：6.984～7.192 秒；极差：0.208 秒。
- 本组 Node/npm/Bash、API、release、commit/branch、锁文件哈希、缓存标签及运行条件记录一致；5 份 source-status.txt 内容一致。
- 记录条件：插电、最高电源模式、Nuxt dev/preview 停止、Worker dev 运行；重复构建期间未清缓存。
- 当前对应源码 diff 与已存 source-changes.patch 一致，当前锁文件 SHA-256 与运行记录一致；最后一次构建后的 JS/CSS 文件集合和内容哈希仍与已测候选产物一致。
- 此前 baseline 中位数 6.949 秒、范围 6.871～6.984 秒。本组中位数多 0.146 秒，约 +2.10%；这是两组观察差异，不是已确认的清理导致退化。
- 两组跨日，原 baseline 后台负载与服务器运行状态未完整记录；本组耗时随运行次序增加，未查明原因，不直接归因于温度、缓存或代码。
- 没有构建提速证据，不为追求更好数字反复挑选样本。若后续需验证约 0.1 秒量级的因果差异，另做同环境交替 A/B 采样。

## 结果与结论

before 参考 [构建基线](build-baseline.md)。after：已确认四个直接声明、75 个锁文件安装路径条目及旧源码被清理；正常构建与指定公开页人工检查通过。客户端 22 个 JS/CSS 内容与压缩体积完全不变，符合清理未进入客户端依赖图的遗留代码这一预期。候选重复构建中位数 7.095 秒，未观察到构建提速；安装时间无 before 数据，不声称安装提速。

决定保留清理：它移除了已停用的数据库实现与根依赖声明，减少遗留维护内容，且本次覆盖范围内未发现功能回归。认证异常与后台写操作仍未验证。

可以用于面试说明的事实：通过引用链、依赖树和构建报告识别遗留 Prisma/MariaDB 链路，清理 4 个根依赖声明及 75 个锁文件安装路径条目；以正常构建、公开页人工验证和客户端逐文件哈希对比确认本轮影响范围。不能改写为“首屏体积减少”“构建提速”或“安装提速”。

后续进入下一组 nuxt-auth-utils 的依赖及类型声明审计，继续保持现有认证行为不变；不将本组完成等同于阶段 2 全部完成。
