# TOC 实现流程

这份文档简单说明博客文章的 TOC 从后端到前端是怎么工作的。

## 1. 后端接收 Markdown 文件

创建或更新文章时，前端会用 `FormData` 上传：

- `meta`：文章标题、摘要、标签、发布状态等信息
- `file`：Markdown 文件

后端入口在：

- `backend/src/Controllers/PostsController.php`

核心流程是：

```php
$contentMd = file_get_contents($file['tmp_name']);
$rendered = MarkdownService::render($contentMd);
```

`MarkdownService::render()` 会返回两份数据：

```php
[
  'html' => $html,
  'toc' => $toc
]
```

其中：

- `html` 是 Markdown 转换后的文章正文 HTML
- `toc` 是文章标题目录数组

## 2. 后端生成 heading id 和 toc

实现位置：

- `backend/src/Services/MarkdownService.php`

当前实现不是直接用正则从 Markdown 里提取标题，而是：

1. 先用 `Parsedown` 把 Markdown 转成 HTML。
2. 再用 `DOMDocument` 解析真实 HTML。
3. 遍历真实 HTML 里的 `h1` 到 `h6`。
4. 给每个 heading 生成 `id`。
5. 同时生成 TOC 数组。

这样可以避免代码块里的 `## xxx` 被误判成标题。

例如 Markdown：

````md
## A

```ts
## Not heading
```

### B
````

生成后的 TOC 只会包含真实标题：

```json
[
  {
    "id": "a",
    "text": "A",
    "depth": 2
  },
  {
    "id": "b",
    "text": "B",
    "depth": 3
  }
]
```

生成后的 HTML 类似：

```html
<h2 id="a">A</h2>
<pre><code class="language-ts">## Not heading</code></pre>
<h3 id="b">B</h3>
```

## 3. 后端保存到数据库

保存文章时，Repository 会把 HTML 和 TOC 存进 `posts` 表：

- `content_html`：文章正文 HTML
- `toc`：JSON 字符串

实现位置：

- `backend/src/Repositories/PostsRepository.php`

创建文章和更新文章都会保存：

```php
json_encode($payload['toc'] ?? [], JSON_UNESCAPED_UNICODE)
```

## 4. 后端详情接口返回 TOC

文章详情接口：

```http
GET /api/posts/{slug}
```

后端会查询文章详情，并把数据库里的 `toc` 从 JSON 字符串转换成数组：

```php
'toc' => $first['toc'] ? json_decode($first['toc'], true) : []
```

返回给前端的数据里会包含：

```ts
{
  contentHTML: string,
  toc: TocItem[]
}
```

前端类型定义在：

- `app/types/posts.ts`

```ts
export interface TocItem {
  id: string
  text: string
  depth: number
}
```

## 5. 前端渲染文章和 TOC

文章详情页位置：

- `app/pages/posts/[slug].vue`

前端先请求详情接口：

```ts
const { data } = await PostApi.getDetail(route.params.slug as string)
const postDetail = data.value?.data
```

正文 HTML 通过 `v-html` 渲染：

```vue
<div
  v-html="postDetail?.contentHTML"
  class="post"
/>
```

TOC 通过 `postDetail.toc` 渲染：

```vue
<li
  v-for="item in postDetail.toc"
  :key="item.id"
  :style="{ paddingLeft: (item.depth - 1) * 12 + 'px' }"
>
  <a
    class="toc-link"
    :class="{ active: activeTocId === item.id }"
    @click.prevent="scrollToHeading(item.id)"
  >
    {{ item.text }}
  </a>
</li>
```

这里的 `depth` 用来控制缩进：

- `h1` 的 `depth` 是 `1`
- `h2` 的 `depth` 是 `2`
- `h3` 的 `depth` 是 `3`

所以层级越深，左侧缩进越多。

## 6. 点击 TOC 跳转到对应标题

点击 TOC 时，前端会用 TOC 项里的 `id` 找到正文里的 heading：

```ts
function scrollToHeading(id: string) {
  const el = document.getElementById(id)

  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
```

因为后端已经把相同的 `id` 同时写入了：

- `toc[i].id`
- 正文 HTML 的 heading `id`

所以前端只需要通过 `document.getElementById(id)` 就能跳转。

## 7. 滚动时高亮当前 TOC

详情页还使用了 `IntersectionObserver` 监听正文里的 heading：

```ts
const headings = postEl.querySelectorAll('h1, h2, h3, h4, h5, h6')
```

当某个 heading 进入视口时，把它的 `id` 记录到：

```ts
activeTocId.value = entry.target.id
```

然后模板里通过 class 控制高亮：

```vue
:class="{ active: activeTocId === item.id }"
```

## 总结

整体链路是：

```txt
Markdown 文件
  -> Parsedown 转 HTML
  -> DOMDocument 遍历真实 heading
  -> 生成 heading id 和 toc
  -> 保存 content_html 和 toc 到数据库
  -> 详情接口返回 contentHTML 和 toc
  -> 前端 v-html 渲染正文
  -> 前端根据 toc 渲染目录
  -> 点击 toc 通过 id 滚动到对应 heading
```

关键点是：TOC 的 `id` 和正文 heading 的 `id` 必须由同一套逻辑生成。否则就容易出现目录点击错位的问题。
