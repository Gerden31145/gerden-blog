<template>
  <div class="font-serif relative">
    <nav v-if="postDetail?.toc?.length" class="toc-sidebar">
      <h3 class="toc-title">TOC</h3>
      <ul class="toc-list">
        <li
          v-for="item in postDetail.toc"
          :key="item.id"
          :style="{ paddingLeft: (item.depth - 1) * 12 + 'px' }"
        >
          <a
            class="toc-link"
            :class="{ active: activeTocId === item.id }"
            @click.prevent="scrollToHeading(item.id)"
          >{{ item.text }}</a>
        </li>
      </ul>
    </nav>
    <div>
      <h1 class="text-4xl font-extrabold">{{ postDetail?.title }}</h1>
      <h2 class="text-xl mt-1.5">{{ postDetail?.summary }}</h2>
      <div class="w-full h-0.5 bg-text-primary mt-5 mb-5 rounded"></div>
      <div v-if="postDetail?.contentHTML">
        <div
        v-html="postDetail?.contentHTML"
        class="post"
        >
        </div>
      </div>
      <div v-else>
        <h1>文章正文加载失败</h1>
      </div>
      <p v-if="isCommentsLoading" class="mt-8 text-sm opacity-70">Loading comments...</p>
      <PostsPostComments
        v-if="postDetail?.id"
        :post-id="postDetail.id"
        :comments="comments"
        @refresh="refreshComments"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { PostApi } from '~/services/posts';
import { CommentApi } from '~/services/comments';
import type { CommentItem } from '~/types/comments';
import { useRoute } from 'vue-router';

const route = useRoute()

const {data} = await PostApi.getDetail(route.params.slug as string)

const postDetail = data.value?.data
const commentsResult = postDetail?.id
  ? await CommentApi.getList(postDetail.id)
  : null

const comments = computed<CommentItem[]>(() => commentsResult?.data.value?.data ?? [])
const isCommentsLoading = computed(() => commentsResult?.pending.value ?? false)

const refreshComments = async () => {
  if (!commentsResult) return

  await commentsResult.refresh()
}

useHead({
  title:computed(() => postDetail?.title ?? '')
})


const activeTocId = ref<string>('')

function scrollToHeading(id: string) {
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

onMounted(() => {
  if (!postDetail?.toc?.length) return

  const postEl = document.querySelector('.post')
  if (!postEl) return

  const headings = postEl.querySelectorAll('h1, h2, h3, h4, h5, h6')

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          activeTocId.value = entry.target.id
        }
      }
    },
    { rootMargin: '-80px 0px -70% 0px' }
  )

  headings.forEach((h) => observer.observe(h))

  onUnmounted(() => observer.disconnect())
})
</script>

<style>

</style>
