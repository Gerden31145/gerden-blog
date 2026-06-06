// 博客文章相关API模块
import type { APIResponse } from "~/types/api";
import type { PostList, Posts, editedPost } from "~/types/posts";

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

    return $api<APIResponse<{ message: string }>>('posts', {
      method: 'POST',
      body: formData
    })
  },
  deletePost(slug: string) {
    const { $api } = useNuxtApp()

    return $api<APIResponse<{ message: string }>>(`posts/${slug}`, {
      method: 'DELETE'
    })
  }
}