# 阶段 3 实验 01：文章样式引用主 Tailwind 入口

状态：已验证并保留。教练完成正常构建、产物测量与规则对比，用户报告页面检查通过。阶段 3 的第一个实验完成，继续独立的页面级样式加载实验。

## 假设与唯一变量

阶段 2 完成后的 main.css 与 post.css 都以 @import "tailwindcss" 开头，且 nuxt.config.ts 全局 css 同时包含两者。

@import 会引入 CSS 内容并参与构建处理，不是只声明使用工具类。源码两处导入不能单独证明最终产物包含两份完整 Tailwind，需检查生成样式；压缩、合并和生成行为可能影响结果。

本轮唯一改动：将 app/assets/css/post.css 第一行替换为 @reference "./main.css"。主入口继续负责 Tailwind 输出，文章样式通过 reference 使用主题、工具类等定义，保留自身规则与 @apply 的展开输出。[Tailwind 官方说明](https://tailwindcss.com/docs/functions-and-directives#reference)

预期：若原构建确有额外输出，客户端 CSS 可能减少；若已经有效合并，体积可能不变。两种结果均需记录。不预先声称减少重复 CSS，也不预计 CSS 必然减半。

潜在影响：文章标题、正文、代码块的 @apply 展开以及主题样式可能变化，需要视觉核对。当前正文通过 v-html 注入，保留现有普通选择器，不引入 scoped。

## 与第二个实验的边界

本次保持 nuxt.config.ts 的全局 css 配置不变。首页加载文章相关样式的原因是它们被全局引入；.post 选择器决定规则匹配哪个元素，不决定样式文件何时加载。把 post.css 改为页面级导入属于下一次独立实验。

## before 证据

- 根锁文件以阶段 2 末尾为准：45d28ed32b2e9571f66c6428b76ca4a723a1c921eeb53869f598834ec8054d36。
- 客户端体积参考 .perf-results/phase-2-markdown/client-assets-after.json，18 个 JS 共 248706 B、4 个 CSS 共 34576 B；CSS gzip 6261 B、Brotli 5298 B。
- 修改前需保存 main.css、post.css、nuxt.config.ts、锁文件和正常构建的 _nuxt 目录，以便直接比较具体 CSS 内容，而不只比较文件大小。
- 固定文章：/posts/测试文章-37236f02；保持文章内容及浏览器窗口一致，修改前保存文章显示截图供核对。

## 验证计划

1. 用户保存 before 后只修改 post.css 第一行。
2. 正常 npm run build；使用相同 API/release 和压缩测量脚本。供电条件如实记录，电池样本不纳入先前插电耗时对比。
3. 对比全量 CSS、入口 CSS、gzip/Brotli 估算及具体规则变化，检查 JS 是否受到影响。哈希文件名变化按角色映射，不按文件名强行一一对应。
4. preview 人工对照首页/文章主题色、标题字号/间距、列表、代码高亮与长代码块、TOC；覆盖直接刷新文章、站内进入以及宽窄屏。
5. 数据与视觉结果核对后决定保留、调整或撤回。未完成前不进入页面级样式加载实验。

## 修改与 before 核对

教练确认当前 diff 仅将 post.css 第一行从 @import "tailwindcss" 改为 @reference "./main.css"，main.css 与 nuxt.config.ts 没有本轮改动。

`.perf-results/phase-3-css-entry/before/` 已保存 main.css、post.css、nuxt.config.ts、package-lock.json 和 _nuxt 目录。备份 main.css、Nuxt 配置、锁文件按统一换行与当前一致；备份中的 22 个 JS/CSS 文件集合及 SHA-256 与阶段 2 末尾的测量报告完全一致。

本次构建前提已具备，尚未据此判断 CSS 是否减少或视觉是否一致。

## 构建与测量结果

用户授权后续由教练执行构建、测量和分析，用户负责页面及交互检查。本次教练通过 Git Bash 执行测量脚本，run 为 css-reference-coach-check，退出码 0，耗时 7.091 秒。供电、电源模式和后台进程条件未独立核验；该耗时只记作运行信息，不参与提速比较。

- 构建记录：`.perf-results/baseline/css-reference-coach-check/`。
- 完整测量：`.perf-results/phase-3-css-entry/client-assets-after.json`。
- after 文件快照：`.perf-results/phase-3-css-entry/after/_nuxt/`，另存 post.css。
- CSS 规则分析：`.perf-results/phase-3-css-entry/css-rule-comparison.json`。
- JS 引用变化分析：`.perf-results/phase-3-css-entry/js-reference-comparison.json`。

| 指标 | before B | after B | 差值 B（after − before） |
| --- | ---: | ---: | ---: |
| CSS 原始总量 | 34576 | 22057 | -12519 |
| CSS gzip 总量 | 6261 | 6156 | -105 |
| CSS Brotli 总量 | 5298 | 5299 | +1 |
| 入口 CSS 原始大小 | 30210 | 17691 | -12519 |
| JS 原始总量 | 248706 | 248706 | 0 |
| JS gzip 总量 | 96872 | 96844 | -28 |
| JS Brotli 总量 | 85507 | 85369 | -138 |

文件数仍为 18 JS、4 CSS。CSS 原始总量减少约 36.21%；固定参数 gzip 仅减少 105 B，Brotli 增加 1 B。重复文本容易被压缩，因此不能把原始大小降幅直接当成压缩传输降幅。当前没有 after HAR 或新的加载性能数据，不声称 LCP 改善。

入口从 entry.BCNpZ84U.css 变为 entry.Ck_cnU87.css，其他三个 CSS 文件名与大小不变。JS 文件名及内部资源引用随之改变；按本次唯一的原始长度配对，再替换已知 JS/CSS 文件名后，18 个 JS 的剩余完整文本均一致。此检查不是 manifest 模块身份比对，不把原始总量相同说成 JS 原始文件哈希不变；小幅压缩差异不作为业务 JS 优化成果。

## CSS 规则核对

用当前安装的 PostCSS 解析 before/after 入口 CSS：

- before 有两组 theme/base/components/utilities 输出，after 保留主入口对应的一组；主入口这四个 layer 的原始内容长度分别为 1669/3680/17/8540 B，前后相同。
- 以祖先 at-rule、选择器、声明文本为键计数，有 191 种原有规则的重复次数减少。另有 properties 辅助规则变化，不能说只是原样删除整段文本。
- .post 与 TOC 相关规则仍生成；部分 @apply 输出加入变量默认值，例如 var(--text-3xl) 变为 var(--text-3xl,1.875rem)。样式规则文本并非逐字节不变，视觉结果仍需用户确认。

教练已启动本次 `.output/server/index.mjs`，监听端口 3000。用户随后报告检查通过，按此前布置的首页/文章主题、标题间距、正文与代码块、TOC、直接导航及窄屏范围记录为人工验收，不作为自动化视觉对比。

决定保留 @reference 修改：减少重复 Tailwind 规则，CSS 原始总量降低约 36.21%，用户未发现视觉异常。gzip 节省 105 B、Brotli 增加 1 B，压缩传输收益有限；不声称页面加载提速。后续基线使用本实验 after，避免把本次收益重复计算到页面级加载实验中。
