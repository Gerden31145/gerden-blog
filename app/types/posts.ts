type PostsStatus = 'draft' | 'published' | 'hidden'

export interface Posts {
  id: string,
  title: string,
  slug: string,
  summary?: string,
  content: string,
  contentHTML: string,
  post_status: PostsStatus,
  coverImage?: string,
  published_at: string,
  post_tags: Array<string>
}

export interface PostList {
  id: string,
  title: string,
  summary?: string,
  coverImage?: string,
  published_at: string,
  slug: string,
  tags: string[]
}
