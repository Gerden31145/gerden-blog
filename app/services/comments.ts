import type { APIResponse } from '~/types/api'
import type { CommentItem } from '~/types/comments'

export const CommentApi = {
  getList(postId: string) {
    return useAPI<APIResponse<CommentItem[]>>(`posts/${postId}/comments`)
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
