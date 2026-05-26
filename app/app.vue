<template>
  <div class=" max-w-[50%] mx-auto">
    <NavBar />
    <NuxtPage />   
  </div>
</template>
<script setup lang="ts">
useHead({
  titleTemplate:(title) => title?`${title} - Gerden Blog`:'Gerden Blog'
})
</script>