<template>
  <div>
    <div class=" justify-center text-center bg-[#eff6ff] border border-blue-700/55 w-72 p-2 rounded text-lg font-serif">
      {{ props.content }}
    </div>
  </div>
</template>

<script lang="ts" setup>
const props = defineProps<{
  content:string
}>()
</script>

<style>

</style>