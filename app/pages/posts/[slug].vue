<template>
  <div class="font-serif">
   <h1 class="text-4xl font-extrabold">{{ postDetail?.title }}</h1> 
   <h2 class="text-3xl">{{ postDetail?.summary }}</h2>
   <p class="text-2xl">
    
   </p>
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