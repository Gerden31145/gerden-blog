# 阶段 6：CI 构建效率与资源预算

状态：阶段 6 已按本轮范围验收。用户确认收尾完成、检查通过；已回到学习分支并提交记录 2e2c906。基线采样、真实 warn、strict 受控失败及恢复报告均已核验，失败后附件留存验证通过。未宣称已配置强制合并门禁或验证生产部署；后端响应精简不纳入本阶段。

## 目标与工作方式

把安装、构建、上传与发布耗时分开观察，为后续 PR 提供可追溯的客户端资源报告，再逐步加入预算失败条件。用户实施学习代码，教练负责检查、已授权的构建和测量；现有生产发布流程保持独立。

## 当前工作流事实

源码：`.github/workflows/test-vps-ssh.yml`。虽然名为 Test VPS SSH，实际已经承担生产部署：

- 触发器为 main 分支 push 与 workflow_dispatch，尚无独立 pull_request 资源检查。
- ubuntu-latest，Node 24.7.0；setup-node 已配置 cache: npm。此前本地测量使用 Node 24.18.1，两者不当作同一环境。
- npm ci、安装 Chromium、Nuxt build 是不同步骤。
- 构建时写入 API base 和 release 标记，打包完整 .output，并上传保留 3 天的构建 artifact。
- 随后配置 SSH、连接 VPS、上传包、切换发布目录并重启 PM2；本地健康检查失败时回滚。
- 继续检查公网 HTTP、版本标记和 Chromium 页面；浏览器报告 artifact 保留 7 天。公网检查失败并不自动触发相同的回滚过程。

这些是文件审计结果，不能作为已执行的 CI 耗时或缓存命中证据。本阶段不通过触发现有部署工作流来采样。

## 可复用的测量能力

`scripts/measure-build.mjs` 递归读取指定目录内的 JS/CSS，输出逐文件哈希、rawBytes、gzipBytes、brotliBytes 与全量汇总；记录 Node、压缩库版本和测量脚本哈希。它当前没有预算比较，也没有超预算退出逻辑；遇到输入错误则以非零退出。

`summary.js.rawBytes` 是指定目录全部 JS 的原始字节，不是首页首次下载量；压缩估计也不是实际 HTTP 传输。报告需另补源码标识、构建配置与 CI run 信息，才能作为可追溯的 PR artifact。

阶段 5 最近一组本地产物为 JS 250399 B、CSS 22965 B，仅作候选参考，不直接拍板为跨平台 CI 阈值。先固定检查的 Node、构建环境与配置，保存 CI 自身基线；Windows 本地耗时不与 Ubuntu runner 比较。

## 分步安排

1. 阅读工作流与测量脚本，划清 PR 验证和生产发布的边界；从已有 Actions 运行记录拆分耗时。
2. 设计明确指标，先报告全量客户端 JS/CSS；若进一步约束入口加载集合，使用生产 manifest 解析静态依赖，不绑定哈希文件名。
3. 用户编写独立 PR 验证工作流，安装、构建、测量，输出 JSON、可读摘要与带源码标识的 artifact；不引用 SSH 或生产 secrets。先仅报告。
4. 在一致环境的真实产物上决定阈值及余量；用户编写预算检查，异常输入不能被默认为通过。
5. 以独立临时分支/检出中的已知超预算改动验证失败，再撤回测试改动验证通过；保留成功和失败报告，不在生产分支推送验证性膨胀代码。
6. 总结实际收益、误报边界与仍未覆盖的指标。未经同条件实测，不宣称 CI 提速；能输出报告不等于预算已经阻断合并，需核实仓库 required checks 配置。

缓存实验只有在已有耗时记录支持必要性时进行。对现有 npm 缓存分别记录命中与未命中；不把浏览器安装时间归为 Nuxt 编译，不直接持久化整个 .nuxt，也不为本次学习升级依赖或添加 Lighthouse。

## 第一项阅读练习

先读工作流的触发器、Setup Node.js、安装、构建、打包、artifact 和 SSH 后续步骤，再读测量脚本的 main 与 summary。

请回答：

1. 新的 PR 资源检查需要复用哪些步骤？哪些步骤会改变生产环境，不能直接搬过来？
2. 如果报告中的 summary.js.rawBytes 增加，能否直接得出“首页首次下载的 JS 增加”这个结论？为什么？
3. 现有脚本输出体积后，还缺什么逻辑才能让 CI 因资源超预算而失败？

本步先阅读，不修改工作流、不指定未经验证的阈值。回答后再给出最小实现任务。

## 阅读反馈与第一项实现

用户回答方向正确，补充以下边界：

- PR 资源检查需要检出源码、配置 Node、npm ci、实际运行 npm run build、验证产物并测量；不能只验证文件存在而省略当前源码的构建。
- 类型检查是独立质量项，当前根 package.json 没有 typecheck 脚本，Nuxt 默认 build 也不能替代完整类型检查。最小版本不添加不存在的命令，工具接入另行处理。
- Playwright 可用于 PR 的功能测试；本轮只检查构建与体积，暂不安装浏览器。现有针对生产站点的发布后冒烟步骤不能原样代替 PR 产物的验证。
- 全量 JS 指的是统计目录内所有浏览器构建资源，路由与异步模块可能在后续访问时下载。它不包含 .output/server，不能称为服务端代码，也不等于首页首次下载集合。
- 超预算必须报告超限指标并返回非零退出码；仅打印错误或提前正常退出不足以让 CI 失败。初版先报告，阈值随后确定。

下一步由用户新建 `.github/workflows/frontend-build-check.yml`，先实现一个 job：

1. `pull_request` 仅针对目标 main，另加 workflow_dispatch；contents: read，ubuntu-latest，设置合理 timeout-minutes。
2. 从现有文件复用 checkout/setup-node 的写法，新的检查明确固定 Node 24.18.1（与前端本地记录一致）并保留 cache: npm。现有部署工作流 Node 不在本步修改；Ubuntu 与 Windows 仍需分别记录。
3. npm ci，然后 npm run build。检查用固定 NUXT_PUBLIC_API_BASE 为 http://localhost:8787/api，BUILD_RELEASE_ID 为 github.sha；当前只构建，不把该地址视作已启动的 API 或业务回归环境，不读取生产 secrets。
4. 验证 .output/server/index.mjs 和 .output/public/_nuxt 存在。
5. 创建 .perf-results/ci，执行 `node scripts/measure-build.mjs .output/public/_nuxt > .perf-results/ci/client-assets.json`。

本轮先检查 YAML 和执行顺序；下一步再接入人类可读摘要、源码元信息、artifact 留存和预算判断。尚未编写/提交该工作流，也未运行远程 CI。

参考：[GitHub 工作流语法](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)、[Nuxt TypeScript 检查说明](https://nuxt.com/docs/4.x/guide/concepts/typescript)。

## 耗时证据模板

之后从已有 GitHub Actions 运行详情填写，暂无数据时保留未记录。记录 run URL/id、commit、日期、Node、runner 和 cache 日志；不要为了收集数据重跑带生产部署的工作流。

| 步骤 | 运行 A 耗时 | 运行 B 耗时 | 备注 |
| --- | --- | --- | --- |
| Setup Node.js / 缓存恢复 | 未记录 | 未记录 | 另记缓存命中或未命中 |
| npm ci | 未记录 | 未记录 | 含安装及生命周期 |
| Install Playwright Chromium | 未记录 | 未记录 | 环境准备 |
| Build Nuxt | 未记录 | 未记录 | 编译构建 |
| Verify and package output | 未记录 | 未记录 | 检查与压缩归档 |
| Upload build artifact | 未记录 | 未记录 | GitHub artifact 上传 |
| SSH / 上传 VPS / 激活发布 | 未记录 | 未记录 | 各步骤保留原始耗时 |
| 公网 HTTP / Chromium 检查 | 未记录 | 未记录 | 各步骤保留原始耗时 |

不以一次快慢确定优化收益，机器和网络波动需单独判断。

## 初版实现与代码导读

用户授权：“你来帮我完成脚本，并带我导读代码”。本步新增 `.github/workflows/frontend-build-check.yml`，复用原 measure-build.mjs，没有修改生产部署工作流或引入新的依赖。

按 YAML 从上到下阅读：

1. `name` 是 Actions 中显示的工作流名称。`on.pull_request.branches: [main]` 表示面向 main 的 PR；`workflow_dispatch` 声明手动触发。手动触发通常需要该工作流已存在于默认分支，新增本地文件并不会自动出现按钮。
2. `permissions.contents: read` 设置 GITHUB_TOKEN 对仓库内容的权限，不是操作系统目录权限，也不会替代仓库原有发布配置。
3. `jobs.build-and-measure` 是任务标识；ubuntu-latest 提供执行环境，15 分钟限制整个 job 的运行时间。steps 按顺序执行，默认前一步成功后才继续。
4. `defaults.run.shell: bash` 使 run 步骤使用 Bash 的失败处理。`uses` 引用已有 Action，`with` 传入 Action 参数；`run` 执行 shell 命令。
5. job 级 env 供该任务的步骤使用。固定本地 API 地址仅用于编译配置，不表示启动 Worker；当前使用 nuxt build 而不是文章预渲染。BUILD_RELEASE_ID 来自 github.sha；PR 默认检出的通常是测试合并提交，不应把它直接标为 PR 源分支 HEAD，后续元信息会分别记录。
6. Checkout 把检出源码放到 runner。setup-node 固定 Node 24.18.1 并用根 package-lock.json 关联 npm 缓存；缓存不是 node_modules，仍需 npm ci 按锁文件安装。原部署 job 仍为 Node 24.7.0，未借本步升级它。
7. npm ci 之后执行 npm run build。当前没有完整类型检查或浏览器测试；构建通过不代表两者通过。
8. `test -f` 检查 SSR 启动文件，`test -d` 检查客户端资源目录。条件不满足会返回非零，步骤失败；不必写“检查失败后继续执行”的额外分支。
9. `mkdir -p` 创建报告目录；`>` 将测量脚本标准输出写入 client-assets.json。反斜杠连接下一行，路径是同一个 Node 命令的输出重定向。错误仍输出到 stderr；测量脚本失败时 Node 返回非零，工作流不应吞掉它。

当前 JSON 只留在 runner 工作目录，没有上传，不是可下载的 CI artifact，也没有资源预算阻断。下一项练习正是把这一结果转为可读摘要、带源码标识的留存报告，再建立阈值。

参考：[setup-node v4 缓存说明](https://github.com/actions/setup-node/blob/v4/README.md)、[GitHub 工作流语法](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)。

## 本地验证记录

- 使用已安装 yaml 解析器检查 YAML 和预期结构，对各 run 命令执行 Bash -n：通过。没有安装 actionlint，不将这些检查称为 GitHub 完整 schema 校验。
- 第一次构建 ci-initial-coach-check 因 EBUSY 无法删除 .output，退出 1，日志保留。进程查询确认 3000 端口的 node server/index.mjs 由本项目 nuxt preview 启动；停止该已确认预览后重试。
- ci-initial-coach-retry 构建退出 0，7.541 s，不比较速度；使用现有 node_modules，未执行本地 npm ci。构建包装脚本使用 perf-baseline 标记，不假装本地具有 GitHub PR 合并提交上下文。
- 从 YAML 读取并执行 Verify output、Measure client assets 两步：通过。报告 `.perf-results/ci/client-assets.json`，全量 JS 250399 B、CSS 22965 B，与阶段 5 最近产物一致。
- `.perf-results/phase-6-ci/initial/` 保存工作流、报告和 validation.json。初版只进行本地 Windows 检查，未测 Ubuntu runner、npm 缓存命中或真实 CI 耗时，未运行线上发布。
- 已从项目根目录重启 `node.exe .output/server/index.mjs`，恢复 3000 端口预览，避免进程以 .output 为工作目录占用构建目录。

## Artifact 步骤首次复查

用户已添加 upload-artifact 步骤，位置、文件路径、7 天保留和缺失文件报错的意图正确。但 uses/with 比同级 name 多缩进两格，YAML 解析失败，需先对齐。

教练之前的示例还遗漏了隐藏路径设置：报告位于 .perf-results，upload-artifact v4.4+ 默认排除隐藏文件。此处补充 include-hidden-files: true，path 仍精确限定为 .perf-results/ci/client-assets.json，不扩大为整个隐藏目录。参见 [upload-artifact v4 文档](https://github.com/actions/upload-artifact/blob/v4/README.md)。

本次为审查反馈，尚未代改用户工作流或运行远程上传；修正后再验证配置。

## Artifact 修正复查与源码追溯练习

用户已修正缩进并添加 include-hidden-files: true。YAML 解析通过；上传步骤位于测量之后，精确上传 client-assets.json，保留 7 天、缺失时报错，参数检查通过。尚未在 GitHub Actions 实际上传或下载附件；本次配置调整不重复构建。

下一步先为报告添加独立的源码上下文，保持原 measure-build.mjs 的统计口径不变：用户新建 scripts/build-context.mjs，将上下文 JSON 写到标准输出。第一版记录实际 checkoutSha（execFileSync 调用 git rev-parse HEAD，并 trim）、githubSha（GITHUB_SHA）、eventName（GITHUB_EVENT_NAME）、runId（GITHUB_RUN_ID）、runAttempt（GITHUB_RUN_ATTEMPT）、release（BUILD_RELEASE_ID）、node（process.version）。缺失的 GitHub 环境变量明确设为 null，不伪造本地 runId。

checkoutSha 记录脚本执行时真实检出提交；PR 的 githubSha 通常是测试合并提交，不直接称为 PR 源分支 HEAD。后续再补 PR head/base、锁文件哈希和构建配置，并将元信息与体积报告一起上传；单独写出元信息函数尚不代表 CI 已具备完整可追溯报告。

本步先完成脚本，再审查并接入工作流。不将本地脏工作区的 HEAD 当作完整源码快照；原有差异和新增文件归档仍需保留。

## build-context.mjs 实现与导读

用户授权教练完成脚本并导读。已新增 `scripts/build-context.mjs`，从仓库根目录运行 `node scripts/build-context.mjs`，向 stdout 输出上述七个字段的 JSON；暂未接入工作流，不改变体积测量算法。

- execFileSync 执行 Git 程序，参数数组为 rev-parse 与 HEAD；encoding: utf8 使结果为字符串，trim 去掉结尾换行。同步调用等待 Git 返回后才组装报告。
- checkoutSha 使用真实 Git 输出，githubSha 来自事件环境，分别记录不相互替代。自定义 checkout ref 时两者可能不同；PR 默认测试合并提交也不是源分支 HEAD。
- process.env 读取当前 Node 进程收到的环境变量，缺失时为 undefined；?? null 明确记录缺失。runId/runAttempt 保持环境变量字符串，不做无必要的数值转换。
- process.version 是实际运行此脚本的 Node 版本。脚本记录当前执行环境，不会验证现有 .output 一定由该提交/环境构建；需依靠后续工作流的顺序和报告关联。
- JSON.stringify(context, null, 2) 的第二项 null 表示不提供替换规则，第三项 2 表示两空格缩进。console.log 写 stdout，可由 shell 的 > 保存。
- Git 不可用等错误进入 catch，console.error 写 stderr，exitCode = 1 使进程以失败结束；不会输出伪造的成功上下文。

验证：Node 语法检查通过；移除 GitHub 环境变量后各对应字段为 null，checkoutSha 与真实 HEAD 相同；注入明确标为 fixture 的环境验证字段读取；模拟 Git 不可用验证退出 1、stdout 为空。没有新建自动测试套件或安装依赖。

`.perf-results/phase-6-ci/context/` 保存 local.json、simulated-ci.json、validation.json 和脚本快照。模拟输出不是实际 GitHub CI 运行证据。本地 HEAD 为 40c3e259b3e2e70f12c90b1c6dee4abd0065bd2d，工作区仍有未提交改动，不把该 SHA 单独当作完整源码身份。

下一步将上下文输出保存为 .perf-results/ci/build-context.json，并与 client-assets.json 一起明确列入上传路径。PR head/base、锁文件和构建配置、摘要与预算仍待完善。

## 下一项练习：把上下文接入报告附件

用户进入下一步，当前工作流仍只生成并上传 client-assets.json。本步由用户修改两个位置：在 Install dependencies 之后、Build Nuxt 之前添加 Record build context，创建 .perf-results/ci 并运行 `node scripts/build-context.mjs > .perf-results/ci/build-context.json`；随后将上传 Action 的 path 改成 YAML 多行字符串，逐行列出 client-assets.json 和 build-context.json。保留精确文件路径、include-hidden-files: true、7 天保留和缺失报错。

上下文生成发生在同一 job、同一检出和构建环境中；脚本失败时正常流程停止，不将失败当成成功报告上传。if-no-files-found: error 只保证完全没有匹配文件时失败，不等于自动验证列表中每个文件都存在；本步依靠两个生成步骤均成功后才执行上传，后续调整失败报告上传条件时需重新检查此边界。

改完后教练检查 YAML 解析、两个输出路径与上传路径的对应关系。此步尚不触发远程 CI、不设置预算；之后再补可读摘要及完整的源码元信息。

## 上下文接入复查与摘要练习

用户已补充两处配置。YAML 解析、Bash 语法通过；Record build context 位于安装之后与构建之前；上传步骤明确列出两个正确的 JSON 路径。仅验证配置，不宣称已在 GitHub 上传成功，不因本次 YAML 调整重复构建。

下一步编写 scripts/summarize-build.mjs：两个位置参数依次为体积 JSON 和上下文 JSON；用 readFileSync(..., 'utf8') 与 JSON.parse 读取，输出 Markdown。摘要显示 checkoutSha、Node、全量 JS/CSS 文件数与 rawBytes，并注明不是首页首次下载量。第一版只显示原始字节，避免把离线 gzip/Brotli 估计写成实际网络传输。

脚本输出 stdout，本地可直接阅读；后续工作流将输出先保存 summary.md，确认脚本成功后，再追加到 GITHUB_STEP_SUMMARY 指定的文件并一并上传。GITHUB_STEP_SUMMARY 是 GitHub 提供的文件路径，不是摘要正文；本地未设置时不应盲目重定向到它。参考 [GitHub Job Summary](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands#adding-a-job-summary)。

摘要脚本缺少参数、JSON 无效或必要字段缺失时应清楚报错并返回非零，不把无效数据替换为 0 后展示。本步尚未创建摘要脚本或修改工作流来执行它。

## 摘要脚本实现与导读

用户授权教练实现并导读。已新增 scripts/summarize-build.mjs，本步只完成 JSON 到 Markdown 的转换，尚未接入 GITHUB_STEP_SUMMARY，也未触发 GitHub Actions。

按执行顺序阅读：

1. main 通过 process.argv.slice(2) 获取两个报告路径；参数数量不是 2 时抛出包含调用方式的错误。
2. readJson 用 UTF-8 读取文件并 JSON.parse；捕获文件缺失或语法错误后，附上文件路径再抛出，方便定位。
3. 检查资产报告 schemaVersion=1、unit=B；上下文具有完整 Git SHA 和 Node 版本。两份报告的 Node 必须一致，避免明显混用环境；这不能单独证明来自同一次构建。
4. validateMetrics 检查 JS/CSS 的 count 和 rawBytes 为非负安全整数。metrics?.[key] 在对象缺失时返回 undefined，Number.isSafeInteger 会拒绝它；明确存在的 0 合法，缺失值不会被默认为 0。
5. 所有字段验证后，使用数组中的字符串与模板字符串构造 Markdown 行；join('\n') 把它们连接成带换行的文本。空字符串形成段落/表格前的空行。
6. console.log 输出 Markdown，脚本不直接写 GitHub 专用文件，便于本地阅读或后续重定向保存。catch 将错误写入 stderr 并设置退出码 1，失败时 stdout 不输出半张表格。

验证使用已归档本地上下文和当前保存的资产 JSON：正常输出含 JS 19 文件/250399 B、CSS 4 文件/22965 B；参数不足、文件不存在、坏 JSON、缺失指标、负数指标、Node 不一致六种输入均返回 1 且无部分 Markdown 输出。Node 语法检查通过。本轮未新增应用构建或持久化测试套件，未安装依赖。

证据在 `.perf-results/phase-6-ci/summary/`：summary.md、validation.json、脚本快照和明确无效的输入样本。报告里的本地 checkout SHA 不包含未提交改动，展示测试不被当成新的完整源码或 CI 基线。

下一步再将脚本输出保存到 .perf-results/ci/summary.md，成功后追加至 "$GITHUB_STEP_SUMMARY"，并把 Markdown 加入 artifact 的明确路径列表。阈值、PR head/base、锁文件/构建配置与远程验证仍待完成。

## 下一项练习：展示并保存 Markdown 摘要

用户已理解 schemaVersion/unit 校验。当前工作流仍没有执行 summarize-build.mjs。本步由用户在 Measure client assets 后、Upload client assets report 前插入 Summarize client assets：运行摘要脚本，按顺序传入 client-assets.json 与 build-context.json，将 stdout 保存为 .perf-results/ci/summary.md；下一条命令 `cat .perf-results/ci/summary.md >> "$GITHUB_STEP_SUMMARY"` 将同一份文本追加到当前步骤的 GitHub 摘要文件。

`>` 生成本次独立报告，`>>` 追加页面摘要；GITHUB_STEP_SUMMARY 的值是 runner 提供的路径。Bash 的失败处理保证摘要生成失败时不继续发布该摘要。随后将 .perf-results/ci/summary.md 加入 artifact 的 path 多行列表，保留两个 JSON。

本步先由用户编辑、教练复查，不在本地直接执行依赖 GitHub 环境变量的重定向，不宣称已出现远程页面摘要。完成后再完善来源元信息与预算设计。

## 摘要接入复查与模块扩展名说明

用户已接入 Summarize client assets，并将 summary.md 加入附件。YAML、Bash 语法、测量→摘要→上传顺序及三个文件路径核对通过；尚未实际执行 GitHub 页面摘要和附件上传。

用户询问 .mjs 是否必须：根 package.json 已声明 type: module，在该包作用域下 .js 也会按 ES Module 执行，因此这些脚本可以使用 .js。选择 .mjs 是显式声明模块格式并统一现有脚本命名，不依赖所在包的 type 配置；它不代表压缩文件，也不带来构建性能收益。若改名，应同步修改工作流与调用路径，本次只是解释、不实施改名。

## 下一项练习：补齐比较所需的元信息

在真实 CI 采样前完善 build-context.mjs，避免仅凭 HEAD 和 Node 判断两份报告可比。本步由用户补两类信息：

- 实际文件/运行环境：读取根 package-lock.json 的 SHA-256，记录 process.platform、process.arch、NUXT_PUBLIC_API_BASE。这些字段用于解释平台、依赖和配置差异；相同哈希只证明该文件内容一致，不能保证整个环境一致。
- PR 来源：在 Record build context 步骤的 env 明确传入 PR_HEAD_SHA = github.event.pull_request.head.sha、PR_BASE_SHA = github.event.pull_request.base.sha，脚本读取为 prHeadSha/prBaseSha；手动运行时可能为空，使用 || null 明确标记缺失。保留 checkoutSha 与 githubSha，不用 PR head 替换实际被构建的测试合并提交。

锁文件计算沿用 Node 内置 readFileSync 与 createHash：`createHash('sha256').update(readFileSync('package-lock.json')).digest('hex')`，不是压缩操作，也不是 git 提交哈希。错误继续由脚本现有 catch 处理，不静默忽略丢失的锁文件。

这一步不需要修改体积测量脚本或重新安装依赖。修改后先验证元信息，再准备真实 PR 检查；仍不设未经 CI 基线验证的阈值。参考 [GitHub 上下文](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts#github-context)。

## 元信息扩展实施与验证

用户授权“你来帮我改”。已在 build-context.mjs 增加 lockfileSha256、platform、arch、apiBase、prHeadSha、prBaseSha；工作流仅在 Record build context 步骤 env 显式映射 PR head/base，原 job 的 API base/release 环境继续生效。未修改生产发布工作流、锁文件或测量算法。

验证通过：YAML/Bash/Node 语法、本地缺失值转 null、模拟 workflow_dispatch 的空 PR 字段转 null、模拟 pull_request 的 head/base 值保留且不覆盖实际 checkoutSha；新上下文仍能被 summarize-build.mjs 读取。通过 Git Bash sha256sum 独立核对锁文件 SHA-256 一致；辅助验证最初尝试的 PowerShell Get-FileHash 在该子进程环境不可用，改用已有工具完成，不属于应用脚本失败。

证据保存于 `.perf-results/phase-6-ci/context-enriched/`，含本地与两种明确标记为模拟的上下文、摘要、源码快照和 validation.json。本地 lockfileSha256 为 45d28ed32b2e9571f66c6428b76ca4a723a1c921eeb53869f598834ec8054d36，platform=win32、arch=x64。GitHub 运行与 PR 字段测试属于本地模拟，不能作为 Actions 成功运行证据。没有重新构建或安装依赖。

下一步准备可审查的提交范围与真实 PR 验证，收集 runner 上的首次产物报告、安装/构建步骤耗时和缓存日志，再决定报告模式与预算阈值。避免把尚未提交的源码与 CI 中的 HEAD 混为同一版本。

## 第一轮真实 PR 检查（2026-09-16）

Git 操作由用户手动完成，形成三个提交：334e3f9（遗留代码与依赖）、6b0edef（前端优化）、42a044f（CI 与记录）。本地数据库和问答.md 改动未纳入这三次提交。用户推送学习分支并创建 PR，反馈检查通过，随后下载 artifact 到 `.perf-results/phase-6-ci/github-run-01/`。

已读取 client-assets.json、build-context.json、summary.md；逐文件统计与汇总一致，使用摘要脚本重新生成的文本与下载摘要一致。review.json 记录三个原始附件的 SHA-256、核验范围与用户提供的日志/耗时来源，未覆盖或修改原文件。

| 项目 | 第一轮 |
| --- | --- |
| Run ID / attempt | 35051119776 / 1 |
| 实际 checkout / GitHub SHA / release | 9f5897b53ed836e8057d49b24945a00a59b8aa00 |
| PR head | 42a044f5dc3dfab8d6609cb44092adbb313a22e3 |
| PR base | 60d3b914045826d8ed1a6e6832bbac4ea4188203 |
| 事件 / 平台 / 架构 | pull_request / linux / x64 |
| Node / npm | v24.18.1 / 11.16.0 |
| API 配置 | http://localhost:8787/api |
| npm 缓存 | 未命中，用户粘贴日志：npm cache is not found |
| Install dependencies | 20 s，用户记录的 Actions 步骤耗时 |
| Build Nuxt | 9 s，用户记录的 Actions 步骤耗时 |
| 全量 JS | 19 文件，250399 B；逐文件 gzip 估计合计 98084 B、Brotli 86546 B |
| 全量 CSS | 4 文件，22965 B；逐文件 gzip 估计合计 6599 B、Brotli 5662 B |

checkoutSha 与 PR head 不同符合 PR 测试合并提交的记录方式，不拿源分支 SHA 替代实际被构建的版本。附件 prHeadSha 与已提交学习分支一致。本次核验依据下载附件与用户提供的运行状态/日志，没有直接调用 GitHub API 审计运行。

CI 锁文件 SHA-256 为 29158a03b6408ab42ea2ace4ca874555a3710120e0d4e56d9bc1b9739753dc31；测量脚本 SHA-256 为 2ea4d6459ba737aed2843f13a0e9491f09a58cbf11f6f06916130d1d31ae4ab1。两者均与 git show 对应 PR head 中的原始文件字节一致。Windows 工作区中的不同哈希，经精确比较确认仅由 CRLF 与已提交 LF 差异造成，不是依赖内容或测量算法变更；保留双方真实字节哈希，不篡改历史证据。

本轮全量 JS/CSS 原始大小与最近本地记录相同，但部分 JS 文件哈希与压缩估计不同，不宣称所有产物逐字节一致。安装 20 s 与构建 9 s 属于一轮观察，不据此计算缓存收益，不与 Windows 的 Bash 构建计时直接比较。

下一步由用户在该 Frontend Build Check 运行页面使用 Re-run all jobs 重跑，保留相同事件 SHA/ref，暂不提交新改动或合并。观察 Setup Node.js 恢复缓存日志及安装/构建步骤耗时，下载 attempt 2 附件到 github-run-02。重复运行是否命中需要读实际日志，不预先认定。报告原始数据需单独留存，避免覆盖第一轮。

## 第二轮真实 CI 与预算设计（2026-09-16）

用户重跑同一个 run（35051119776，attempt 2），下载文件到 `.perf-results/phase-6-ci/github-run-02/`。上下文与首轮仅 runAttempt 不同；源码提交、PR head/base、release、平台、Node、锁文件、API 配置相同。测量工具与压缩环境字段一致，全部 23 个资源的路径、SHA-256、原始/压缩字节记录逐项一致，摘要可由 JSON 重现。review.json 保存核验与用户日志来源。

| 项目 | attempt 1 | attempt 2 |
| --- | ---: | ---: |
| npm 缓存 | 未命中 | 命中 |
| 安装步骤耗时 | 20 s | 8 s |
| Nuxt 构建步骤耗时 | 9 s | 9 s |
| 全量 JS rawBytes | 250399 B | 250399 B |
| 全量 CSS rawBytes | 22965 B | 22965 B |

第二轮用户日志显示 Cache hit、Cache restored successfully，恢复的 npm 缓存为 66935367 B，缓存 key 为 node-cache-Linux-x64-npm-ae3b026e67f971ce90ef43d5061726e1e3b5236e06d6064c5aeaee1fc0b1e2eb。Node 仍需下载与 npm 缓存恢复是不同层次。已有 npm 缓存配置并非本轮新增优化；这组记录验证其作用边界，不把单次安装少 12 s 写成稳定 60% 提速，也不宣称 Nuxt 编译变快。

报告模式采样后，最初建议以本次两轮同版本 CI 的全量 rawBytes 为起点，分别给 JS/CSS 5% 增长余量并向上取整：JS 262919 B、CSS 24114 B。这是可调整的工程策略，不是测得 5% 随机波动，也不是通用行业标准。两轮一致只支持该版本两次观察稳定，不能保证未来环境无变化。

用户指出小博客未来新增作品页面、加载与动画功能可能合理地超过 5%，因此不采用全量资源增长 5% 就阻断日常 PR 的方案。最终约定：5% 作为初始复查提醒线，warn 模式超线继续通过，strict 模式用于受控的失败验证。分别比较 JS/CSS，避免一项减少抵消另一项增加。

预算覆盖全量客户端产物，不是首页首载、页面时延或构建耗时；不为 CI 的 9 s 设置时间失败线。新增功能确有成本时应评审原因和调整限额，不自动抬高预算。远程失败/恢复验证与 required check 状态仍待完成。

## 预算检查实现与导读（2026-09-16）

用户授权教练实现。按以下顺序阅读：

1. `scripts/build-budget.json`：baseline 是两轮真实 CI 的固定测量值，limits 是向上取整后的初始提醒线。baselineSource 记录来源 run、attempt、提交与环境；它用于追溯，不会自动验证本次构建环境相同。预算范围为全量 JS/CSS 原始字节。
2. `scripts/check-build-budget.mjs`：读取产物 JSON、预算 JSON 和可选的第三个参数 warn/strict，默认 warn。先检查版本、单位、范围、整数指标，再用 map 分别计算 JS/CSS 相对固定基线的增量和增长率；实际值大于 limit 才超线，等于时通过。
3. `rows.some(...)`：任一资源超线就需要复查。先向 stdout 输出完整 Markdown，再向 stderr 输出超线提示。GitHub 环境使用 warning/error annotation；普通终端使用文本提示。
4. `if (exceeded && mode === 'strict') process.exitCode = 1`：只有有效数据超线且采用 strict 才因体积失败。输入缺失、坏 JSON、指标非法、模式拼错由 catch 在两种模式中都返回 1，不能当作“仅提醒”忽略。
5. `.github/workflows/frontend-build-check.yml`：BUILD_BUDGET_MODE 固定为 warn。先复制本次使用的预算配置到报告目录，再执行检查。用 `|| budget_status=$?` 暂存退出码，写入页面摘要后 `exit "$budget_status"` 恢复失败状态，没有吞掉错误。
6. Upload 步骤在原资源摘要成功且运行未取消时仍可执行，预算失败不应阻止证据上传。新增 budget.md 与 build-budget.json，连同原来的三份报告留存；若输入校验失败，budget.md 可能为空，错误原因在日志中，不把该次视为完整预算报告。

GitHub 注解格式与步骤条件依据 [workflow commands](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands#setting-a-warning-message) 和 [workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idstepsif)。检查失败不等于已设置分支保护；是否禁止合并还取决于仓库 required check 配置。

本地导读命令（项目根目录、Git Bash）：

```bash
node.exe scripts/check-build-budget.mjs \
  .perf-results/phase-6-ci/github-run-02/client-assets.json \
  scripts/build-budget.json warn

node.exe --test scripts/check-build-budget.test.mjs
```

第一条重读已下载报告，不重新构建；改为 strict 时这份真实报告也应通过，因为两项都未超线。

验证：27 项自动测试通过，覆盖默认模式、等于边界、JS/CSS 单独多 1 B、另一项减少不能抵消超线、缺失/负数/小数/超安全整数指标、坏 JSON、错误版本/单位/范围和拼错模式。测试文件明确使用合成输入，不把它们记为项目体积实测。

另用工作流中的实际 Bash 命令在本地执行四种组合：真实 attempt 2 报告在 warn/strict 均退出 0；明确标记为合成的超线样本在 warn 退出 0、strict 退出 1，均保存了 budget.md 和页面摘要文件内容。YAML 解析与全部 run 块的 Bash 语法检查通过。证据：`.perf-results/phase-6-ci/budget-check-QwzixO/validation.json`，同目录保留输入、结果和源码快照。合成样本只改汇总指标以测试比较逻辑，不作为逐文件一致的测量报告。

本轮未重新构建应用、安装依赖或提交推送；本地未执行 GitHub 上传动作，上传条件仅做静态核对。下一步由用户先阅读，再手动提交并验证日常 PR 报告；随后按计划在临时验证分支使用 strict 和受控阈值验证失败、证据上传及恢复，结束后保留日常 warn 策略。阶段 6 尚未验收完毕。

## 真实 warn 模式报告核验（2026-09-16）

用户提交 e5c53dc 并推送原 PR，反馈检查通过，附件解压至 `.perf-results/phase-6-ci/github-budget-warn/`。五份原始附件齐全，未覆盖；新增 review.json 保存文件哈希和核验范围。

- Run ID / attempt：35065399589 / 1。
- 实际 checkout / release：030619f9145d3ae9f508d7aa46ffe3993587c122。
- PR head：e5c53dc38f9c5a2209663062b9193e83de36e73f，与本地已提交 HEAD 一致。
- PR base：60d3b914045826d8ed1a6e6832bbac4ea4188203。
- 全量 JS：250399 B，提醒线 262919 B；全量 CSS：22965 B，提醒线 24114 B。均与固定基线相同。
- budget.md 显示 warn / 通过；预算配置与该提交中的配置一致。summary.md、budget.md 均可从下载 JSON 重新生成并逐字节匹配。
- 全部 23 个资源的路径、哈希及三种字节指标与基线 attempt 2 相同，逐文件汇总与 summary 一致。

这轮证明正常输入未超线时的远程预算接入与五份附件留存；不能证明远程超线警告、严格失败或失败后上传已经验证。检查状态来自用户反馈，附件在本地核验，没有调用 GitHub API 审计。

下一项练习：从当前学习分支创建临时分支 `test/frontend-budget-strict`，仅将工作流 BUILD_BUDGET_MODE 改为 strict，并把预算 limits.jsRawBytes 临时改为 1 B；保留 baseline 与 CSS 阈值。用户手动提交这两个文件、推送并创建目标为 main 的草稿 PR，标明仅验证预算、不要合并。预期 Build Nuxt 成功、预算步骤因 JS 超线失败、Upload 仍成功。保存附件到 `.perf-results/phase-6-ci/github-budget-strict-fail/` 后再检查，随后恢复 JS 阈值为 262919 B 并保留 strict，验证恢复通过。临时阈值是受控测试，不代表真实性能退化；原学习分支继续保留日常 warn。

## 真实 strict 超线失败与附件留存（2026-09-16）

用户在临时验证分支提交 7e8d73b，反馈构建成功、预算失败、上传成功；上传日志给出 Artifact ID 10434952178、压缩包 4018 B，附件解压至 `.perf-results/phase-6-ci/github-budget-strict-fail/`。五份原文件完整，新增 review.json 保存哈希和核验结果；日志中的 ZIP 哈希仅记录来源，未对原 ZIP 独立复核。

- Run ID / attempt：35068173653 / 1；实际 checkout / release：9aaa3ae130350ddeced1fc7bd61ae1abe5944c19。
- PR head：7e8d73bfa20e0816d890d6f12f91a8952686b3d7，与本地 HEAD 一致；该提交的模式为 strict，附件预算与提交配置一致。
- JS 实际 250399 B > 临时上限 1 B，CSS 22965 B < 上限 24114 B。budget.md 正确显示 strict / 失败，仅 JS 超线。
- 全部 23 个资源记录及汇总与 warn 运行一致。失败由主动降低阈值触发，不是体积增长或应用构建错误。
- 用下载数据本地重放检查脚本返回 1，生成的 budget.md 与附件逐字节一致；summary.md 也可重现。远程步骤状态依据用户反馈及日志，本地未调用 GitHub API 审计。

已验证预算失败后仍可上传并下载报告。下一步用户只恢复 limits.jsRawBytes 为 262919，保留 strict、baseline 和 CSS 阈值，提交推送同一临时分支，预期预算和整个检查重新通过。新附件保存为 `.perf-results/phase-6-ci/github-budget-strict-recovery/`。恢复检查完成前不关闭验证 PR；该 PR 仅用于实验，不合并到 main。记录文件当前未提交，后续回到学习分支统一保存。

## 恢复阶段附件来源排查（2026-09-16）

用户反馈恢复后仍提示 JS 超过 1 B。核对发现本地最新提交 e4a0c34 已正确把 limits.jsRawBytes 恢复为 262919；但 github-budget-strict-recovery 目录中的五份文件与上一轮失败附件逐字节相同，记录的仍是 run 35068173653 / attempt 1、PR head 7e8d73b、阈值 1 B。因此这批附件属于旧失败运行，不能作为新恢复提交失败的证据。原文件保留，不覆盖。

下一步从测试 PR 的最新提交 e4a0c34 进入对应 Checks，核对新的运行与附件；下载后保存至 `.perf-results/phase-6-ci/github-budget-strict-recovery-02/`，用 build-context.json 的 prHeadSha 确认来源。尚未通过 GitHub API 查询最新运行，恢复验收仍待正确版本的附件和状态。

## strict 恢复报告核验与收尾（2026-09-16）

正确附件保存于 `.perf-results/phase-6-ci/github-budget-strict-recovery-02/`，五份原文件完整；新增 review.json 保存哈希与核验结果。

- Run ID / attempt：35069958908 / 1；实际 checkout / release：d37cfe5205eed3c91b4a73837ada8b2e808be5ad。
- PR head：e4a0c345e7837964f43fb2e23176bb7b2953ebae，与恢复提交和本地 HEAD 一致。
- 该提交保持 strict，JS 阈值已恢复为 262919 B，CSS 阈值为 24114 B；附件预算配置与提交一致。
- 实际 JS 250399 B、CSS 22965 B；budget.md 显示 strict / 通过。本地重放返回 0，预算与资源 Markdown 均可逐字节重现。
- 全部 23 个资源与失败运行的记录一致，逐文件汇总匹配；失败到恢复仅由阈值变化解释，不是应用性能优化。
- 原学习分支仍为 warn；从预算实现提交到恢复提交，生产部署工作流无改动。本轮没有重新执行生产健康检查，不据此宣称生产发布已验收。

核心预算实验已形成正常通过→受控失败且保留附件→恢复阈值后通过的证据。整体 job 状态未通过 GitHub API 独立查询，最后仍由用户在页面确认；required check / 分支保护未验证，不能宣称已经强制阻止合并。

收尾由用户手动完成：确认本次运行整体绿色后关闭临时验证 PR（不合并），切回 perf/frontend-build-learning，只提交本轮两份阶段记录并推送原优化 PR。未提交的文档修改可随切换保留；本地数据库与问答.md 不纳入记录提交。原优化 PR 的合并与生产发布另行安排，不与临时验证混在一起。

用户随后反馈“已完成，测试也通过”。本地确认当前分支 perf/frontend-build-learning，最新提交 2e2c906f32d26648a7f0ea81f62651fb7038a4f6 为记录提交；其余未提交改动仅为原有本地数据库与问答.md。远程收尾状态按用户反馈记录，未独立查询 GitHub。阶段 6 完成，进入阶段 7 证据整理与最终复测。
