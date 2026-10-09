# 线上静态资源 HTTP 压缩排查

状态：2026-10-07 用户完成博客 Nginx 配置修改后，匿名 GET 复测确认 JS/CSS gzip 生效，传输正文分别减少 57.07% / 70.61%，内容一致性检查通过。代理未操作服务器或发布应用；未据此宣称 LCP 或执行耗时改善。

## 1. 当前问题与证据

本地 gzip 实验已证明入口传输量可减少，但不能据此认定线上已经开启。通知按需加载实验因收益小、首次通知额外等待而撤回后，本轮回到实际资源交付链路。

2026-10-06 请求 `https://gerden-shop.cn/`，从其 HTML 提取当前入口与样式路径，没有沿用本地文件名。首页 release 为 `a9297f4fdb31eae18e901e45b19e82c9c8d4483c-35087566284-1`；Server 响应头为 `nginx/1.24.0 (Ubuntu)`。

脚本 `.perf-results/home-first-screen/probe-production-compression-20261006.mjs`，执行 `node .perf-results/home-first-screen/probe-production-compression-20261006.mjs 01`，退出 0。完整结果为同目录 `production-compression-20261006-01.json`。使用 Node HTTPS GET 读取原始响应体，不自动解压计数，不携带 Cookie；只保存选定的公共响应头、长度与哈希。请求带 `Cache-Control: no-cache`，不据此假设所有中间缓存均已绕过。本轮不是浏览器导航或延迟 benchmark。

| 请求对象 | Accept-Encoding | Content-Encoding | 编码后正文 | 解码后正文 |
| --- | --- | --- | ---: | ---: |
| 首页 HTML | gzip, br | gzip | 2221 B | 4723 B |
| `/_nuxt/DGTyN2uU.js` | identity | 无 | 206248 B | 206248 B |
| 同一 JS | gzip, br | 无 | 206248 B | 206248 B |
| `/_nuxt/entry.O8qImWRx.css` | identity | 无 | 16045 B | 16045 B |
| 同一 CSS | gzip, br | 无 | 16045 B | 16045 B |

全部返回 200。同一资源两种协商请求的解码后哈希相同。JS 响应 MIME 为 `text/javascript; charset=utf-8`，CSS 为 `text/css; charset=utf-8`，两者均声明 `public, max-age=31536000, immutable`；本次静态资源响应没有 Vary。

JS SHA-256：`b3c7a8a1d9fb01545d25b644579bb3ba77953dfc338dec56fc692f88bd820eac`。CSS SHA-256：`7b011fbeb0dad6f8ef3437ba1d4bc5e3c1bfd0a156d787908a797e0320ca0453`。

线上 JS 与此前本地入口虽然均为 206248 B，但哈希不同，不能当作相同文件。线上响应的离线 gzip level 9 估算分别为 JS 77938 B、CSS 4159 B；这仅说明压缩空间，不是已部署后的传输值或建议采用的实时压缩等级。

## 2. 原因假设与待查看配置

Nginx 文档中，gzip 默认关闭；开启后 `gzip_types` 默认只覆盖 `text/html`，其他 MIME 需明确配置。这与本次“HTML 已压缩、JS/CSS 未压缩”的结果相符，但尚不能确认真实原因。站点/location 作用域、覆盖规则和响应路径也需要核对。[Nginx gzip 模块文档](https://nginx.org/en/docs/http/ngx_http_gzip_module.html#gzip_types)

仓库仅有前端部署工作流与健康检查文档，没有线上生效的 Nginx 配置。已向用户索取 gzip 相关指令，以及 `gerden-shop.cn` 对应的 server/location/include 片段；可在 VPS 使用 `sudo nginx -T` 只读查看。未请求、读取 SSH 密钥或尝试连接服务器。

## 3. 下一步与验收口径

拿到配置后，先确认相应 MIME 是否在正确作用域启用压缩，给出针对现有配置的最小修改。不要仅凭响应头替换整份站点配置；应用发布、TLS、静态资源缓存规则和健康检查需继续有效。

如后续实施配置修改，需先验证 Nginx 配置语法，再按用户授权范围使之生效。验证时再次请求当前页面引用的实际 JS/CSS，比较 identity 与 gzip 协商响应：状态应为 200、解码后内容一致，实际编码和正文长度符合预期，并检查 `Vary: Accept-Encoding`。[Nginx gzip_vary](https://nginx.org/en/docs/http/ngx_http_gzip_module.html#gzip_vary)

资源传输字节下降与页面 LCP 改善分别验证。当前线上仍有外部入口 CSS，本地已验收的 CSS 内联修改尚未上线；后续不能混合两种修改后把效果全部归给压缩。

## 4. 生效配置核对与本轮练习（2026-10-07）

用户提供的 `nginx -T` 输出通过语法检查。全局 http 块启用了 `gzip on`，但 `gzip_types`、`gzip_vary` 被注释；博客 HTTPS server 和其 location/include 中没有覆盖 gzip 类型。这解释了此前 HTML 已压缩而 JS/CSS 未压缩的结果。

在 `/etc/nginx/sites-enabled/blog` 的第一个 server（监听 443）中，紧接 `server_name` 增加：

```nginx
gzip_types text/css text/javascript application/javascript;
gzip_vary on;
```

继承全局 `gzip on`，保持默认压缩等级；这次只扩展博客响应类型，不修改同机其他站点。实际代理 JS 响应为 `text/javascript`，不能只根据 mime.types 中 js 对应 `application/javascript` 来配置。`gzip_vary` 使缓存区分客户端的 Accept-Encoding。

用户保存后在 VPS 执行 `sudo nginx -t && sudo systemctl reload nginx`。此前的语法检查不代表修改后已验证。完成后复测当前页面引用的资源，核对编码、字节、Vary 和解码后哈希；默认等级的实际压缩大小不要求等于之前 level 9 的离线估算。此处仅记录待执行方案，不代表配置已经生效。

## 5. 用户执行后的线上验收（2026-10-07）

用户反馈已完成上述操作。北京时间 11:48:32 开始执行 `node .perf-results/home-first-screen/probe-production-compression-20261006.mjs after-20261007-01`，退出 0；原始结果保存为 `.perf-results/home-first-screen/production-compression-20261006-after-20261007-01.json`。脚本沿用此前日期文件名，实际测量时间以 JSON 的 measuredAt 为准。

| 资源 | 修改前传输正文 | 修改后传输正文 | 减少 | 修改后编码 |
| --- | ---: | ---: | ---: | --- |
| 首页 HTML | 2221 B | 2221 B | 0% | gzip |
| `DGTyN2uU.js` | 206248 B | 88544 B | 57.07% | gzip |
| `entry.O8qImWRx.css` | 16045 B | 4715 B | 70.61% | gzip |

以上均为原始响应正文长度，不含 HTTP 头或传输协议开销。全部请求返回 200，HTML 与 JS/CSS 响应均带 `Vary: Accept-Encoding`。JS/CSS 的 identity 响应仍无压缩，gzip 协商响应解压后的 SHA-256 与 identity 相同，也与修改前记录相同；页面 release、资源路径和内容均未变化。原有静态资源 Cache-Control 仍保留。

结论：本轮线上压缩交付验收通过，保留配置。浏览器解压后仍需处理同一份 206248 B 的入口代码，不能把传输量下降解释为代码减少、执行更快或 LCP 已改善。下一步在浏览器禁用缓存后检查同一资源的 Content-Encoding、传输大小与资源大小，建立对 Network 两种体积口径的直观认识；若评估 LCP，需另做固定条件的页面测量。
