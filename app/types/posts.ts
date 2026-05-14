type PostsStatus = 'draft' | 'published' | 'hidden'

export interface Posts {
  id: number,
  title: string,
  slug: string,
  summary?: string,
  content: string,
  postStatus: PostsStatus,
  coverImage?: string,
  published_at: string,
  post_tags: Array<string>
}

export interface PostList {
  id: string,
  title: string,
  summary?: string,
  coverImage?: string,
  published_at: Date,
  tags: string[]
}
