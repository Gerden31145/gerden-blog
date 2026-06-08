// 博客文章相关API模块
import type { APIResponse } from "~/types/api";
import type { PostList, Posts, editedPost, updatedPost } from "~/types/posts";

export const PostApi = {
  getList() { // 获取博客文章列表
    return useAPI<APIResponse<PostList[]>>('posts')
  },
  getDetail(slug: string) {
    return useAPI<APIResponse<Posts>>(`posts/${slug}`)
  },
  create(post: editedPost) {
    const { $api } = useNuxtApp()
    const formData = new FormData()
    const meta = JSON.stringify({
      title: post.title,
      summary: post.summary,
      tags: post.tags,
      post_status: 'published'
    })

    formData.append('meta', meta)
    if (!post.file) throw createError({
      message: 'Please upload file',
      statusCode: 400
    })
    formData.append('file', post.file)

    return $api<APIResponse<{ message: string }>>('admin/posts', {
      method: 'POST',
      body: formData
    })
  },
  deletePost(id: string) {
    const { $api } = useNuxtApp()

    return $api<APIResponse<{ message: string }>>(`admin/posts/${id}`, {
      method: 'DELETE'
    })
  },
  updatePost(post: updatedPost) {
    const formData = new FormData()

    const meta = JSON.stringify({
      id: post.id,
      title: post.title,
      summary: post.summary,
      slug: post.slug,
      tags: post.tags,
      post_status: post.post_status,
      published_at: post.published_at
    })

    formData.append('meta', meta)

    if (!post.file) throw createError({
      message: 'please upload file'
    })

    formData.append('file', post.file)

    const { $api } = useNuxtApp()
    return $api<APIResponse<{ message: string }>>(
      `admin/posts/${post.id}/update`,
      {
        method: 'POST',
        body: formData
      }
    )
  }
}
