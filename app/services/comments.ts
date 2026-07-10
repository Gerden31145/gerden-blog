import type { UseFetchOptions } from '#app'
import type { APIResponse } from '~/types/api'
import type { CommentItem } from '~/types/comments'

export const CommentApi = {
  getList(
    postId: string,
    options: UseFetchOptions<APIResponse<CommentItem[]>>
  ) {
    return useAPI<APIResponse<CommentItem[]>>(`posts/${postId}/comments`, options)
  },

  create(postId: string, content: string) {
    const { $api } = useNuxtApp()

    return $api<APIResponse<CommentItem>>(`posts/${postId}/comments`, {
      method: 'POST',
      body: {
        content
      }
    })
  },

  deleteComment(commentId: string) {
    const { $api } = useNuxtApp()

    return $api<APIResponse<null>>(`comments/${commentId}`, {
      method: 'DELETE'
    })
  }
}
