# 前端发布健康检查

工作流：`.github/workflows/test-vps-ssh.yml`。

## 版本标记

每次发布使用 `提交 SHA-运行 ID-重跑次数` 作为 `RELEASE_ID`。即使是同一提交重新运行工作流，也会有不同的发布编号。

构建步骤通过 `BUILD_RELEASE_ID` 把编号传入 `nuxt.config.ts`，由 `app.head.meta` 写入服务端渲染的 HTML：

```html
<meta name="app-release" content="提交SHA-运行ID-重跑次数">
```

标记在构建时固定，不从 PM2 的运行时环境变量中读取。旧构建启动后仍返回旧编号。本地未设置 `BUILD_RELEASE_ID` 时使用 `local`。

## 检查顺序

1. 部署前检查 VPS 原有首页的 HTTP 200 和 `Welcome to Gerden Blog!`，不要求匹配新版本。
2. 激活新版本后，在 VPS 请求 `http://127.0.0.1:3000/`，同时检查 HTTP 200、首页标题和本次版本标记。失败会重试，耗尽重试后执行原有回滚。
3. 本地检查通过后，由 GitHub Actions runner 请求 `https://gerden-shop.cn/`，执行同样的三项检查。
4. 公网 HTTP 检查通过后，运行 Chromium 浏览器冒烟测试。浏览器检查也通过后才输出最终发布成功。

公网请求携带 `Cache-Control: no-cache` 要求缓存重新验证，仍请求正常首页路径。该请求头不保证所有代理都遵循；响应中缺失版本标记或包含旧标记时，检查必须失败。若旧缓存持续存在，需要检查 CDN 或反向代理的 HTML 缓存策略。

公网检查最多尝试 10 次，每次请求最多 10 秒，失败间隔 3 秒，步骤超时为 3 分钟。公网失败让工作流失败，但保留已通过本地检查的版本，供定位 DNS、TLS、代理、缓存或应用问题。

## Playwright 浏览器检查

配置：`playwright.config.ts`；用例：`tests/smoke/frontend.spec.ts`。

- 首页：HTTP 200、本次版本标记、标题可见，以及点击 LOGIN 后客户端导航成功。
- 文章列表：从首页点击 POSTS，由真实浏览器请求配置的 API，要求 HTTP 200 和正确响应结构，再核对文章链接数量及前 3 篇的标题和地址。只有 API 成功返回空数组，零篇文章才算通过。
- 登录页：版本标记、表单可编辑、密码字段类型、按钮可用，以及用户名失焦校验。不提交登录或创建生产数据。
- 所有用例收集未捕获的 JavaScript 异常、hydration mismatch、文档/JS/CSS 请求失败与 HTTP 错误，以及 API 错误。匿名访问时 `GET /me` 的 401 属于预期结果。

CI 使用真实站点和 API，不 mock 业务响应。每个用例使用独立的匿名浏览器上下文；单 worker 运行，失败重试一次。浏览器检查失败让工作流失败，保留当前版本，不自动回滚。

Chromium 在部署前安装，避免浏览器依赖安装失败发生在版本切换之后。测试完成后上传 `playwright-report-运行ID-重跑次数` artifact，保留 7 天；失败尝试保留截图、trace，检测到浏览器错误时额外附加 JSON 诊断。下载并解压 artifact 后，可用 `npx playwright show-report playwright-report` 查看报告。

本地验证已有构建（PowerShell，另一个终端先启动 Nuxt 和对应 API）：

```powershell
npx playwright install chromium
$env:PLAYWRIGHT_BASE_URL = 'http://127.0.0.1:3000'
$env:PLAYWRIGHT_API_BASE = 'http://localhost:8787/api'
$env:RELEASE_ID = 'local' # 必须与该构建的 BUILD_RELEASE_ID 一致
npm run test:smoke
```

测试不会自动启动或部署服务。CI 要求明确设置以上三个变量；工作流复用构建的 `RELEASE_ID` 和现有 `NUXT_PUBLIC_API_BASE` 仓库变量。

## 维护注意

- 首页标题变化时，同步修改工作流中的内容检查。
- 版本检查匹配完整的 meta 标签；调整标记名称或 HTML 输出格式时，同步更新本地和公网检查。
- 版本检查和浏览器冒烟测试覆盖本次访问的页面及资源，不代表所有 CDN 节点都已更新，也不覆盖完整登录、后台管理或评论流程。
- 推送工作流到 `main` 会触发部署；修改文件本身不会更新线上站点。
