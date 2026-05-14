<template>
  <div class="font-serif py-3 cursor-default">
    <h1 class="text-3xl font-extrabold hover:text-accent">{{ props.posts.title }}</h1>
    <h2 class="text-xl">{{ props.posts.summary??'' }}</h2>
    <div>{{ props.posts.published_at.slice(0, 10) }}</div>
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