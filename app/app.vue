<template>
 <NuxtLayout>
  <NuxtPage></NuxtPage>
 </NuxtLayout> 
</template>
<script setup lang="ts">
useHead({
  titleTemplate:(title) => title?`${title} - Gerden Blog`:'Gerden Blog'
})
</script>