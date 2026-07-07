<template>
  <div class="font-serif relative">
    <nav v-if="postDetail?.toc?.length" class="
    hidden lg:block
    toc-sidebar">
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
import type { PostSlugRedirect } from '~/types/posts';

const route = useRoute()

function isSlugRedirect(data:unknown):data is PostSlugRedirect {
  return Boolean(
    data&&
    typeof data === 'object' &&
      'redirect_to' in data
  )
}

const {data} = await PostApi.getDetail(route.params.slug as string)

const payload = data.value?.data

if (isSlugRedirect(payload)) {
  await navigateTo(`/posts/${payload.redirect_to}`,
    {
      redirectCode:301,
      replace:true
    }
  )
}

const postDetail = isSlugRedirect(payload) ? null :payload
const commentsResult = postDetail?.id
  ? CommentApi.getList(postDetail.id, {
    server:false,
    lazy:true,
  })
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

useSeoMeta({
  description:postDetail?.summary ?? ''
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
