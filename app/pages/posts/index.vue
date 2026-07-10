<template>
  <div class="text-text-primary">
    <h1 class="text-5xl font-serif">Posts</h1>
    <p class="text-4xl font-serif mt-4"></p>
    <div v-for="(post) in postList"
    :key="post.id"
    >
      <NuxtLink
      :to="`/posts/${post.slug}`"
      >
        <PostsPostListContainer
        :posts="post"
      /> 
      </NuxtLink>
   </div>
  </div>
</template>

<script lang="ts" setup>
import { ref , computed} from 'vue';
import { PostApi } from '~/services/posts';
import type { PostList } from '~/types/posts';

useHead({
  title:'Posts'
})

useSeoMeta({
  description:'Browse technical articles and study notes on frontend development, programming, web technologies and AI-assisted learning.'
})

const {data, pending:isLoading, status} = await PostApi.getList()
const postList = computed(() => data.value?.data ?? [])

// console.log(postList.value)

</script>

<style>

</style>