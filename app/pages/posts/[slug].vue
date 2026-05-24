<template>
  <div class="font-serif">
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
  </div>
</template>

<script lang="ts" setup>
import { PostApi } from '~/services/posts';
import type { Posts } from '~/types/posts';
import { useRoute } from 'vue-router';

const route = useRoute()

const {data} = await PostApi.getDetail(route.params.slug as string)

const postDetail = data.value?.data

</script>

<style>

</style>