<template>
  <div class="flex justify-between mt-4">
    <div class="text-2xl"><span class="text-xl">No.{{ props.post.id }}  </span><span class=" ml-3">  {{ props.post.title }}</span></div>
    <div class="flex gap-6">
      <button class="text-red-700">DELETE</button>
      <button class="text-blue-900">UPDATE</button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { PostList } from '~/types/posts';

const props = defineProps<{
  post:PostList
}>()
</script>

<style>

</style>