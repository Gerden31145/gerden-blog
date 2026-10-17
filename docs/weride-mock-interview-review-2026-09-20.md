# WeRide 全栈实习模拟面试复盘

日期：2026-09-20  
项目：Gerden Blog  
范围：SSR、评论交互、认证安全、Markdown 渲染、队列与并发。

> 本次为口述模拟与代码阅读，未运行测试、未修改业务代码。下面区分现有实现、静态阅读发现的问题和讨论中的改进方案；经提示后理解的内容，还需要脱离提示重新作答。

## 1. 本次表现

三个相对较好的方面：

- 能区分“评论发表成功”和“刷新评论列表失败”，分别设计提示。
- 经追问能说明作者／管理员的删除权限，以及不能信任前端传入的用户 ID 和角色。
- 在超时接管场景中，能主动提出执行版本号，让失去资格的旧消费者无法写回。

三个最高优先级的薄弱点：

1. **异步执行机制**：曾将 `async/await` 理解成转移到浏览器异步线程，混淆微任务与消息队列。
2. **SSR 与请求状态**：对 payload、hydration、`$fetch`／`useFetch`、`lazy` 的具体作用不够熟悉。
3. **实现与设计的对应关系**：多处记不清角色来源、渲染状态、内容哈希和失败通知，需要能沿实际代码讲清链路。

## 2. 应记住的正确机制

| 主题 | 正确表述 |
| --- | --- |
| SSR 与 payload | HTML 已包含正文；payload 把服务端数据交给客户端恢复组件状态。hydration 会再次执行 setup，但 `useFetch` 命中对应 payload 时通常不会重复发请求。 |
| `$fetch` 与 `useFetch` | 顶层直接调用 `$fetch` 可在服务端和客户端各执行一次，它本身不负责 SSR 数据传递。评论列表使用 `useAPI`，发表／删除评论直接使用 `$api`。 |
| 评论加载 | `server: false` 控制不在服务端取数；`lazy: true` 控制客户端导航不等待该数据。当前评论调用没有 `await`，不能断言去掉 lazy 就一定阻塞导航。 |
| 评论空状态 | 请求成功且评论数组为空，才是“暂无评论”；没有数据不能直接等同于加载中。 |
| JWT 与 session | Cookie 存放 JWT，JWT 的 `sid` 关联数据库 session。验签通过后仍需检查用户、版本和会话，因此当前属于有状态校验的混合方案。 |
| 退出登录 | 撤销当前 session 可使该会话的旧 JWT 被拒绝；增加用户 `token_version` 使旧版本 access token 失效，但不会自动修改所有 session 记录。 |
| HttpOnly、XSS、CSRF | HttpOnly 限制脚本读取 Cookie，不阻止浏览器按规则发送 Cookie。XSS 在目标页面环境执行代码；典型 CSRF 从攻击者页面诱导请求，二者都不一定需要读取 Cookie。 |
| HTML 净化 | 当前使用 `rehype-sanitize` 的 schema 规则检查标签、属性和链接协议，不是自己写正则，也不是一律删除 `<a>`。净化后还有 Shiki，后续转换也需保持安全。 |
| 异步与队列 | `async/await` 不自动创建线程；同步计算仍占用执行线程。接口内 await 渲染，响应仍需等待。队列将渲染移出保存请求的等待链路。 |
| 内容过期保护 | `contentHash` 标识正文内容。写回时在同一条 UPDATE 中比较文章 ID 和 hash，避免旧内容覆盖新内容；它不保证任务只执行一次。 |
| 队列并发与重复 | `max_batch_size: 1` 是每批一条，不是并发数为 1。即使串行消费，也可能重复投递，因此需要幂等处理。 |

参考：[Nuxt 数据获取](https://nuxt.com/docs/4.x/getting-started/data-fetching)、[MDN async 函数](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)、[Queues 投递保证](https://developers.cloudflare.com/queues/reference/delivery-guarantees/)。

## 3. 面试后待修／验证

- [ ] **只改摘要等信息后文章不可见**：`updatePostWithTags` 先写入 `pending`，随后发现正文 hash 没变就直接返回，不投递任务。原本 ready 的文章因此无法满足公开查询条件。应在更新前判断内容变化；未变化时保留原渲染状态。
- [ ] **旧 JWT 的角色可能过时**：认证虽查询用户表，但上下文使用 `payload.role`。若数据库降级而 token 版本和 session 未变，旧管理员权限仍可能通过。考虑使用数据库当前角色或同步失效旧凭证。
- [ ] **重复渲染可能破坏成功状态**：相同任务再次执行会把文章改为 rendering，若失败再改成 failed，已成功渲染的文章也可能不可见。需验证并完善任务幂等和状态转换。
- [ ] **管理端缺少异步渲染结果反馈**：当前保存请求成功就提示成功，没有后续渲染状态轮询／订阅；管理端复用公开列表，pending／failed 文章也被过滤。
- [ ] **评论空状态不够准确**：组件仅按数组为空展示“No comments yet.”，可能与加载中或失败状态混淆。

上述为代码阅读结论或可推演的风险，尚未通过运行用例复现。

## 4. 讨论过但尚未实现的改进

- **发表评论幂等键**：同一次发表的重试复用 key，主动再次发表使用新 key；数据库对用户和 key 建唯一约束。同 key 不同请求内容应拒绝，不能仅按评论内容去重。
- **任务原子抢占**：把检查与修改放在一条语句中，根据返回行判断是否取得执行资格：

  ```sql
  UPDATE render_jobs
  SET status = 'running'
  WHERE id = ? AND status = 'queued'
  RETURNING id;
  ```

- **超时恢复与执行版本**：扫描超时任务并重新投递；失效旧执行资格时更新执行版本。正文写回及任务成功／失败更新都需原子校验资格，避免旧消费者恢复后干扰新执行。仅增加字段或先查询版本并不足够，这还不是完整的恢复实现。

## 5. 复习顺序与代码入口

1. **P0：SSR 和异步基础**。不看提示讲清 HTML、payload、hydration、微任务、队列的区别。
   - [文章详情页](../app/pages/posts/[slug].vue)、[useAPI](../app/composables/useAPI.ts)、[评论 service](../app/services/comments.ts)。
2. **P0：认证和安全边界**。画出 Cookie → JWT → 用户 → session → 业务权限的链路，再复述 XSS／CSRF 的区别。
   - [认证中间件](../worker/src/middlewares/auth.ts)、[登录退出路由](../worker/src/routes/auth.routes.ts)、[Markdown 渲染](../worker/src/services/markdown.service.ts)。
3. **P1：队列状态和失败窗口**。分别推演旧内容、重复消息、消费者崩溃、超时接管。
   - [文章保存](../worker/src/services/post.services.ts)、[公开查询与更新](../worker/src/repositories/posts.repository.ts)、[渲染处理](../worker/src/services/render-jobs.service.ts)、[渲染写回](../worker/src/repositories/render-jobs.repository.ts)、[表结构](../worker/src/db/schema.ts)。
4. **P2：性能证据**。准备优化前后测量条件和数据；“任务重”“页面更快”不能只凭推测。本次未验证性能指标。

## 6. 下次从这里继续

尚未作答的问题：

> 文章和 render_jobs 已写入数据库，但 Worker 在调用 queue.send() 前异常退出。数据库有任务，队列没有消息，怎样保证任务最终能被执行？

建议下次使用 **Answer clinic（回答修订）**：先独立录述 SSR、认证、队列各一段 60–90 秒回答，再按代码核对。先巩固本次暴露的基础与实现细节，再继续深入并发恢复。
