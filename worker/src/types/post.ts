export type PostStatus = 'draft' | 'published' |
  'hidden'

export type TocItem = {
  id: string
  text: string
  depth: number
}

export type TagItem = {
  id: string
  name: string
  slug: string
}

export type PostListItem = {
  id: string
  title: string
  slug: string
  summary: string
  published_at: string | null
  tags: string[]
  post_status: PostStatus
}

export type PostDetail = {
  id: string
  title: string
  slug: string
  summary: string
  content: string
  contentHTML: string
  post_status: PostStatus
  published_at: string | null
  post_tags: string[]
  toc: TocItem[]
}

export type CreatePostInput = {
  title: string
  summary: string
  content: string
  contentHTML: string
  post_status: PostStatus
  published_at: string | null
  post_tags: string[]
  toc: string
}

export type UpdatePostInput = Pick<PostDetail,
  'content' | 'title' | 'post_tags' | 'summary' | 'toc' | 'contentHTML' | 'post_status' | 'post_tags'
>

export type AdminPostInput = {
  title: string
  summary?: string
  content: string
  postStatus: PostStatus
  tags: string[]
}

export type AdminPostResult =
  PostDetail