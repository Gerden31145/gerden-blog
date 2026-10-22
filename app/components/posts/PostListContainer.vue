<template>
  <div class="font-serif py-3 cursor-default">
    <header class="flex justify-between">
    <h1 class="text-3xl font-extrabold hover:text-primary">
      {{ props.posts.title }}
    </h1>

    </header>
    <h2 class="text-xl mt-1">{{ props.posts.summary??'' }}</h2>
    <div class="flex justify-between">
      <div>{{ props.posts.published_at.slice(0, 10) }}</div>
      <div class=" text-primary flex gap-2.5" >
        <span v-for="tag in props.posts.tags">{{ tag }}</span>
    </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { PostList } from '~/types/posts';
const props = defineProps<{
  posts:PostList
}>()
</script>

<style>

</style>
