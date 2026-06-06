<template>
  <div class="flex justify-between mt-4">
    <div class="text-2xl"><span class="text-xl">No.{{ props.post.id }}  </span><span class=" ml-3">  {{ props.post.title }}</span></div>
    <div class="flex gap-6">
      <button class="text-red-700" @click="handleClick('Delete')">DELETE</button>
      <button class="text-blue-900" @click="handleClick('Update')">UPDATE</button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { PostList } from '~/types/posts';
import { PostApi } from '~/services/posts';
import type { modalStatusType } from '~/types/modal';

const emit = defineEmits(['openModal'])

const props = defineProps<{
  post:PostList
}>()

const handleClick = (status:modalStatusType) => {
  emit('openModal', status)
}
</script>

<style>

</style>