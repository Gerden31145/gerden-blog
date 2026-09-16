# 阶段 2 实验 02：清理未启用的 nuxt-auth-utils

状态：已验证并保留。本组依赖与类型声明清理、静态审查、正常构建、客户端产物复测及指定范围人工页面检查完成。电池供电下的耗时不参与性能对比，不声称提速。

## 假设与范围

本组从 Prisma 清理后的候选源码开始，不把上一组的删除重复计为本组收益。计划移除根依赖 nuxt-auth-utils 及其遗留类型扩展 shared/types/auth.d.ts，保持当前应用的登录请求和用户状态实现不变。

预期客户端 JS/CSS 体积基本不变，是否如此以正常构建后逐文件对比为准。不预先声称构建或安装提速。

## 引用证据

- nuxt.config.ts 的 modules 仅包含 @pinia/nuxt，未启用 nuxt-auth-utils。
- 在当前 app、shared、scripts、tests、.github、Worker 源码及相关声明配置的检索中，找到根依赖声明和 shared/types/auth.d.ts 中的 #auth-utils 模块扩展，未发现其会话 API 的调用。
- shared/types/auth.d.ts 扩展的是 #auth-utils 模块中的 User，字段为 id、可选 name、role:'admin'，属于类型声明，不负责运行时登录。
- app/stores/users.ts 与 app/services/login.ts 显式从 ~/types/user 导入 User，对应 app/types/user.ts（单数），字段包括 id、username、email、role:'user'|'admin'。
- 当前调用链为 Pinia action → loginAPI → $api → 配置的 Worker API。不能把两个同名 User 认定为相同模块来源；TypeScript 的结构兼容性也不等同模块来源相同。

## 用户执行与证据保存

1. 将当前 package.json、package-lock.json 和 shared/types/auth.d.ts 复制到独立的 .perf-results/phase-2-auth/，保留本组修改前状态。
2. 删除 shared/types/auth.d.ts，在根目录执行 npm uninstall nuxt-auth-utils。
3. 教练对比保存的本组 before 与实际 after，核对锁文件变化、剩余引用及源码范围。

## 本组静态审查

2026-09-14，教练将当前文件与 `.perf-results/phase-2-auth/` 的 before 比较：

- before 锁文件 SHA-256 为 658e139300b29f42e789b806d69645aae33bd5b97efc57ad947b9cc8162aadbc，与上一组 Prisma 清理后相同，分组基点正确。
- package.json 仅移除 nuxt-auth-utils 一项声明，其余内容不变。
- 锁文件 packages 表减少 16 个安装路径条目，没有新增条目；保留的非根条目内容不变，没有附带依赖升级。该数量不是浏览器依赖减少数量。
- after 锁文件 SHA-256 为 94268a0a69fba452f1f16ace1f4747db14d95bb901083b9a8f2f37d6366f637b。
- shared/types/auth.d.ts 已删除；其备份内容按统一换行与 baseline 对应文件一致。node_modules/nuxt-auth-utils 已不存在。
- 所检查的 app、shared、scripts、tests、.github、Worker 源码、根依赖声明及 Nuxt 配置中未检出该包、#auth-utils 或所查会话 API 名称的剩余引用。
- app、nuxt.config.ts、worker/package.json、worker/package-lock.json 无 diff；本组类型文件删除符合计划。

## 构建与人工页面验证

用户报告构建成功、preview 页面检查无异常。教练核对 `.perf-results/baseline/auth-cleanup-battery-check/result.json`：

- preparedAt：2026-09-14T06:28:10.436Z；命令 npm run build，退出码 0。
- Node v24.18.1、npm 11.16.0、Git Bash 5.2.37；API 为 http://localhost:8787/api，release 为 perf-baseline。
- 锁文件 SHA-256 与本组 after 及当前工作区一致：94268a0a69fba452f1f16ace1f4747db14d95bb901083b9a8f2f37d6366f637b。
- 条件：电池供电，电源模式未记录；卸载后保留现有缓存，未清理。
- 原始记录耗时 10.083 秒，仅保留为该次运行信息，不纳入此前插电条件的对比，不计算改善或退化比例。
- 人工检查按此前布置的公开页面、站内导航和登录页展示范围记录；未执行自动化测试，也未据此声称完整认证回归通过。

## 客户端产物复测

用户已保存 `.perf-results/phase-2-auth/client-assets-after.json`，测量时间为 2026-09-14T06:31:12.366Z。教练与上一组 `.perf-results/phase-2-prisma/client-assets-after.json` 对比：

- Node、zlib、Brotli 版本，gzip level 9、Brotli quality 11，以及测量脚本 SHA-256 均一致。
- JS 仍为 18 个文件，原始 248706 B、gzip 96872 B、Brotli 85507 B。
- CSS 仍为 4 个文件，原始 34576 B、gzip 6261 B、Brotli 5298 B。
- 22 个文件的路径、字节数及内容 SHA-256 全部相同，没有新增或移除文件；当前磁盘产物与 after 报告相符。
- 当前锁文件哈希仍与构建记录相同，未出现后续依赖变化。

结论：本次移除未启用的模块及类型扩展没有改变客户端 JS/CSS 产物。不能将此结论扩展到所有服务端输出、HTML 或运行时认证场景。

## 决策与范围限制

- 保留清理：移除 1 个根依赖声明、16 个锁文件安装路径条目和 1 个遗留类型声明文件，正常构建与指定页面人工验证通过。
- 本轮验证的是依赖维护范围缩减、客户端产物不变；没有客户端体积下降或构建/安装提速结论。
- 只有后续确实需要验证构建提速时，再安排同条件测量；本组不以补测耗时作为完成前提。
- 人工检查未覆盖完整认证与后台写操作，原有管理员认证异常继续按用户要求不展开。
- 阶段 2 继续下一组 Markdown 处理依赖的归属审计，本组完成不等于阶段 2 全部完成。
