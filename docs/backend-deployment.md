# Gerden Blog 后端部署手册

本文档用于把 `worker/` 中的 Hono 后端部署到 Cloudflare Workers。生产依赖包括 Cloudflare D1、Cloudflare Queues 和 Worker Secret。

> 所有命令都在 PowerShell 中执行，并默认当前仓库位于 `D:\project\gerden-shop`。
>
> 最后核对日期：2026-08-19。

## 一、以后部署只看这里

下面是已经完成过首次初始化后的日常部署流程：

```powershell
cd D:\project\gerden-shop\worker
npm ci
npx wrangler@latest login --device
npx wrangler whoami
npm run typecheck
npx wrangler d1 migrations list gerden-blog-db --remote
npx wrangler d1 migrations apply gerden-blog-db --remote
npm run deploy
Invoke-RestMethod 'https://api.gerden-shop.cn/api/health'
```

注意：

- `npm run deploy` 已经等价于 `wrangler deploy --minify`。
- 没有待执行的迁移时，`migrations apply` 会安全地提示没有需要应用的迁移。
- 远程数据库命令必须带 `--remote`。仓库里的 `npm run db:migrate:local` 只操作本地 D1，不能代替生产迁移。
- 如果 `api.gerden-shop.cn` 尚未配置，先使用部署输出中的 `*.workers.dev` 地址验证健康检查，再完成本文的“配置生产域名”步骤。

## 二、当前项目的生产资源

| 项目 | 当前配置 |
| --- | --- |
| Worker 名称 | `gerden-blog-api` |
| Worker 配置 | `worker/wrangler.jsonc` |
| D1 数据库 | `gerden-blog-db` |
| D1 Binding | `DB` |
| D1 迁移目录 | `worker/drizzle/` |
| Queue | `post-render-queue` |
| Queue Binding | `POST_RENDER_QUEUE` |
| Worker Secret | `JWT_SECRET` |
| 健康检查 | `GET /api/health` |
| 推荐生产 API | `https://api.gerden-shop.cn/api` |

`database_id` 已经写在 `worker/wrangler.jsonc` 中。它只属于创建该 D1 数据库的 Cloudflare 账号；如果换账号部署，必须重新创建数据库并替换 ID。

## 三、第一次部署

### 1. 准备环境并登录 Cloudflare

当前 lockfile 安装的是 Wrangler 4.x，需使用 Node.js 22 或更高版本。

```powershell
cd D:\project\gerden-shop\worker
node --version
npm ci
npx wrangler --version
npx wrangler login
npx wrangler whoami
```

浏览器授权后，`whoami` 应显示正确的 Cloudflare 账号。后续创建的 D1、Queue 和 Worker 必须位于同一个账号。

### 2. 确认或创建远程 D1

先检查当前账号能否访问项目已经绑定的数据库：

```powershell
npx wrangler d1 info gerden-blog-db
```

如果数据库存在，不要重复创建，继续下一步。

如果这是一个全新的 Cloudflare 账号，则创建数据库：

```powershell
npx wrangler d1 create gerden-blog-db
```

命令会输出新的 `database_id`。把 `worker/wrangler.jsonc` 中原有的 `database_id` 替换为新 ID，同时保留：

```jsonc
{
  "binding": "DB",
  "database_name": "gerden-blog-db",
  "database_id": "这里替换成新 ID",
  "migrations_dir": "drizzle"
}
```

### 3. 确认或创建 Queue

文章发布依赖异步渲染队列。先查看已有队列：

```powershell
npx wrangler queues list
```

只有列表中不存在 `post-render-queue` 时才执行：

```powershell
npx wrangler queues create post-render-queue
```

队列名称必须与 `worker/wrangler.jsonc` 中 producer 和 consumer 的 `queue` 完全一致。

### 4. 检查代码并应用生产迁移

部署过程不负责生成迁移。`worker/drizzle/*.sql` 应当已经经过代码审查并提交到 Git。

```powershell
npm run typecheck
npx wrangler deploy --dry-run
npx wrangler d1 migrations list gerden-blog-db --remote
```

如果生产库已有重要数据，建议在迁移前额外导出一份备份。备份可能包含用户数据，不要提交到 Git：

```powershell
New-Item -ItemType Directory -Force '.\backups' | Out-Null
npx wrangler d1 export gerden-blog-db --remote --output '.\backups\gerden-blog-db-before-deploy.sql'
```

如果同名备份已经存在，请先把输出文件名改成当前日期，不要覆盖仍需保留的备份。

确认目标数据库名称和待执行文件后，再应用迁移：

```powershell
npx wrangler d1 migrations apply gerden-blog-db --remote
```

不要在部署时临时运行 `npm run db:generate`。如果数据库结构发生变化，应先在开发阶段生成、检查并本地验证迁移文件。

### 5. 设置 JWT Secret

第一次部署必须设置：

```powershell
npx wrangler secret put JWT_SECRET
```

Wrangler 会交互式要求输入值。使用密码管理器生成足够长的随机值并粘贴，不要把真实值写入源码、`wrangler.jsonc`、命令参数或文档。

检查 Secret 名称是否存在：

```powershell
npx wrangler secret list
```

`secret list` 只显示名称，不会显示 Secret 的值。再次执行 `secret put` 会轮换密钥，并让现有登录 Cookie 全部失效，所以日常部署不需要重复设置。

`wrangler secret put` 本身会创建并立即部署一个新的 Worker 版本。后面仍执行一次 `npm run deploy`，用于明确发布当前代码与完整配置。

### 6. 部署 Worker

```powershell
npm run deploy
```

记录命令输出中的部署版本和 `https://...workers.dev` 地址，然后先验证公开接口：

```powershell
$workerUrl = 'https://gerden-blog-api.你的-workers-dev-子域.workers.dev'
Invoke-RestMethod "$workerUrl/api/health"
Invoke-RestMethod "$workerUrl/api/tags"
```

健康检查的响应数据中应包含：

```json
{
  "ok": true,
  "service": "worker"
}
```

实际响应外层还会包含项目统一的 API 响应结构。

## 四、配置生产域名和前端

### 1. 给 Worker 绑定同站点 API 域名

推荐使用 `api.gerden-shop.cn`：

1. 打开 Cloudflare Dashboard。
2. 进入 **Workers & Pages**。
3. 选择 `gerden-blog-api`。
4. 进入 **Settings → Domains & Routes → Add → Custom Domain**。
5. 输入 `api.gerden-shop.cn` 并确认。
6. 等待 DNS 和证书生效后访问 `https://api.gerden-shop.cn/api/health`。

当前认证 Cookie 使用 `SameSite=Lax`。`gerden-shop.cn` 与 `api.gerden-shop.cn` 属于同一站点，适合当前实现；生产前端若直接调用 `*.workers.dev`，公开接口可能正常，但登录 Cookie 在跨站请求中可能不会发送。

`https://gerden-blog.pages.dev` 与 `api.gerden-shop.cn` 也不是同一站点，因此 Pages 预览域名不适合作为当前 Cookie 配置下的完整登录验收地址。请使用 `https://gerden-shop.cn` 或 `https://www.gerden-shop.cn` 验证登录、评论和后台功能。

### 2. 设置前端 API 地址

在前端生产部署环境中设置：

```text
NUXT_PUBLIC_API_BASE=https://api.gerden-shop.cn/api
```

设置后重新构建并部署 Nuxt 前端。

后端 `worker/src/index.ts` 当前允许以下来源携带 Cookie：

- `http://localhost:3000`
- `https://gerden-blog.pages.dev`
- `https://gerden-shop.cn`
- `https://www.gerden-shop.cn`

如果前端域名变化，先把新的完整 Origin 加入 CORS 列表并重新部署 Worker。启用 `credentials` 时不能把允许来源写成 `*`。

## 五、第一次创建管理员

数据库迁移不会自动插入管理员。首次上线时：

1. 通过前端注册页注册一个普通用户。
2. 在 `worker/` 目录执行下面的远程 SQL，把占位用户名替换成刚注册的用户名：

```powershell
npx wrangler d1 execute gerden-blog-db --remote --command "UPDATE users SET role = 'admin', updated_at = CURRENT_TIMESTAMP WHERE username = '你的用户名';"
```

3. 检查更新结果：

```powershell
npx wrangler d1 execute gerden-blog-db --remote --command "SELECT id, username, email, role, status FROM users WHERE username = '你的用户名';"
```

4. 退出后重新登录，让新签发的 JWT 包含 `admin` 角色。

务必确认命令中带有 `--remote`，否则只会修改本地 D1。

## 六、上线验收清单

部署完成后逐项检查：

- `GET https://api.gerden-shop.cn/api/health` 返回成功。
- 首页、标签列表、文章列表和文章详情可读取。
- 普通用户可以注册、登录、退出和发表评论。
- 管理员可以登录后台并创建、更新、删除文章。
- 创建或更新文章后，`post-render-queue` 的 consumer 能完成 Markdown 渲染。
- 刷新页面后登录态仍然存在，浏览器请求中带有 Cookie。
- Cloudflare Dashboard 的 D1 中能看到新数据，证明操作的不是本地数据库。

需要实时查看生产日志时执行：

```powershell
npx wrangler tail
```

## 七、常见问题

### D1 报无权限、找不到数据库或 ID 不匹配

先运行 `npx wrangler whoami`，确认登录的是创建该 D1 的账号。换账号部署时，旧 `database_id` 不能复用。

### D1 提示表不存在

通常是只执行了本地迁移。运行：

```powershell
npx wrangler d1 migrations list gerden-blog-db --remote
npx wrangler d1 migrations apply gerden-blog-db --remote
```

### 部署时报 Queue 不存在

运行 `npx wrangler queues list`。如果缺少 `post-render-queue`，先创建它再部署。

### 登录成功后刷新又变成未登录

依次检查：

1. 前端请求是否使用 `credentials: 'include'`；当前 API 插件已经配置。
2. `NUXT_PUBLIC_API_BASE` 是否为 `https://api.gerden-shop.cn/api`。
3. 前端是否从 `gerden-shop.cn` 或 `www.gerden-shop.cn` 访问，而不是 `pages.dev` 预览域名。
4. 请求 Origin 是否在 `worker/src/index.ts` 的 CORS 白名单中。
5. `npx wrangler secret list` 中是否存在 `JWT_SECRET`。

### 代码部署成功，但文章一直没有渲染

确认 Queue 已创建且 producer、consumer 都绑定到 `post-render-queue`，然后运行 `npx wrangler tail`，再创建或更新一篇文章观察 consumer 日志。

## 八、回滚

只回滚 Worker 代码：

```powershell
npx wrangler rollback
```

该命令会立即把上一版本部署为当前版本，但不会回滚 D1 数据、迁移、Queue 或 Secret。数据库结构已经变化时，旧代码也不一定与新结构兼容。

D1 恢复属于破坏性操作。需要恢复数据时，先停止写入，确认目标时间或备份文件，并参考 Cloudflare D1 Time Travel 文档，不要凭记忆直接执行恢复命令。

## 九、官方参考

- [Wrangler commands](https://developers.cloudflare.com/workers/wrangler/commands/)
- [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- [Cloudflare Queues getting started](https://developers.cloudflare.com/queues/get-started/)
- [Workers secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Workers custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Workers real-time logs](https://developers.cloudflare.com/workers/observability/logs/real-time-logs/)
- [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)
