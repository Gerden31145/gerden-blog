<template>
  <section class="mt-12 border-t border-text-primary/30 pt-8 text-text-primary">
    <h2 class="font-serif text-3xl font-extrabold">Comments</h2>

    <form class="mt-5" @submit.prevent="handleSubmit">
      <textarea
        v-model="content"
        class="min-h-28 w-full resize-y rounded border border-text-primary/40 bg-transparent p-3 text-base outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-70"
        placeholder="Write a comment..."
        :disabled="isSubmitting"
      />

      <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p
          v-if="notice"
          class="text-sm"
          :class="noticeType === 'error' ? 'text-red-500' : 'text-text-primary'"
        >
          {{ notice }}
        </p>
        <span v-else></span>

        <button
          type="submit"
          class="cursor-pointer rounded bg-text-primary px-4 py-2 text-sm text-white transition hover:bg-[#3d4c5e] disabled:cursor-not-allowed disabled:opacity-70"
          :disabled="isSubmitting"
        >
          {{ isSubmitting ? 'Posting...' : 'Comment' }}
        </button>
      </div>
    </form>

    <div class="mt-8 space-y-5">
      <article
        v-for="comment in props.comments"
        :key="comment.id"
        class="border-b border-text-primary/20 pb-5"
      >
        <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
          <div class="font-bold">{{ comment.user.username }}</div>
          <time class="opacity-70">{{ formatDate(comment.created_at) }}</time>
        </div>

        <p class="mt-3 whitespace-pre-wrap break-words text-base leading-7">
          {{ comment.content }}
        </p>

        <div v-if="canDelete(comment)" class="mt-3 text-right">
          <button
            type="button"
            class="cursor-pointer text-sm text-red-500 underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="deletingId === comment.id"
            @click="handleDelete(comment.id)"
          >
            {{ deletingId === comment.id ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </article>

      <p v-if="props.comments.length === 0" class="text-sm opacity-70">
        No comments yet.
      </p>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { CommentApi } from '~/services/comments'
import { useUsersStore } from '~/stores/users'
import type { CommentItem } from '~/types/comments'

const props = defineProps<{
  postId: string
  comments: CommentItem[]
}>()

const emit = defineEmits<{
  (event: 'refresh'): void
}>()

type NoticeType = 'info' | 'error'

type APIError = {
  data?: {
    message?: string
  }
  response?: {
    _data?: {
      message?: string
    }
  }
  message?: string
}

const usersStore = useUsersStore()
const content = ref('')
const notice = ref('')
const noticeType = ref<NoticeType>('info')
const isSubmitting = ref(false)
const deletingId = ref<string | null>(null)

const setNotice = (message: string, type: NoticeType = 'info') => {
  notice.value = message
  noticeType.value = type
}

const getErrorMessage = (error: unknown, fallback: string) => {
  const apiError = error as APIError

  return apiError.data?.message ||
    apiError.response?._data?.message ||
    apiError.message ||
    fallback
}

const formatDate = (value: string) => {
  return value.slice(0, 16).replace('T', ' ')
}

const canDelete = (comment: CommentItem) => {
  const user = usersStore.user

  if (!user) return false

  return user.role === 'admin' || comment.user_id === user.id
}

const handleSubmit = async () => {
  if (!usersStore.isLoggedIn) {
    setNotice('Please login first', 'error')
    return
  }

  const nextContent = content.value.trim()

  if (!nextContent) {
    setNotice('Unable to send blank comment', 'error')
    return
  }

  isSubmitting.value = true
  setNotice('')

  try {
    await CommentApi.create(props.postId, nextContent)
    content.value = ''
    setNotice('Send comment success')
    emit('refresh')
  } catch (error) {
    setNotice(getErrorMessage(error, 'Send comment fail'), 'error')
  } finally {
    isSubmitting.value = false
  }
}

const handleDelete = async (commentId: string) => {
  if (!usersStore.isLoggedIn) {
    setNotice('请先登录', 'error')
    return
  }

  deletingId.value = commentId
  setNotice('')

  try {
    await CommentApi.deleteComment(commentId)
    setNotice('评论删除成功')
    emit('refresh')
  } catch (error) {
    setNotice(getErrorMessage(error, '评论删除失败'), 'error')
  } finally {
    deletingId.value = null
  }
}
</script>
