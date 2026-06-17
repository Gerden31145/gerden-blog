// 博客文章相关API模块
import type { APIResponse } from "~/types/api";
import type { PostList, Posts, editedPost, updatedPost, PostSlugRedirect } from "~/types/posts";

export const PostApi = {
  getList() { // 获取博客文章列表
    return useAPI<APIResponse<PostList[]>>('posts')
  },
  getDetail(slug: string) {
    return useAPI<APIResponse<Posts | PostSlugRedirect>>(`posts/${slug}`)
  },
  create(post: editedPost) {
    const { $api } = useNuxtApp()

    return $api<APIResponse<{ message: string }>>('admin/posts', {
      method: 'POST',
      body: {
        title: post.title,
        summary: post.summary,
        post_tags: post.tags,
        post_status: 'published',
        content: post.content
      }
    })
  },
  deletePost(id: string) {
    const { $api } = useNuxtApp()

    return $api<APIResponse<{ message: string }>>(`admin/posts/${id}`, {
      method: 'DELETE'
    })
  },
  updatePost(post: updatedPost) {

    const { $api } = useNuxtApp()
    return $api<APIResponse<{ message: string }>>(
      `admin/posts/${post.id}/update`,
      {
        method: 'POST',
        body: {
          title: post.title,
          summary: post.summary,
          post_tags: post.tags,
          post_status: 'published',
          content: post.content
        }
      }
    )
  }
}
