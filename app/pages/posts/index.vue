<template>
  <div class="text-text-primary">
    <title>Gerden Blog - Posts & shit</title>
    <h1 class="text-5xl font-serif">Posts</h1>
    <p class="text-4xl font-serif mt-4">Writing shit</p>
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

const {data, pending:isLoading, status} = await PostApi.getList()
const postList = computed(() => data.value?.data ?? [])

// console.log(postList.value)

</script>

<style>

</style>