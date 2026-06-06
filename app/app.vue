<template>
 <NuxtLayout>
  <NuxtPage></NuxtPage>
 </NuxtLayout> 
 <NoticeContainer></NoticeContainer>
</template>
<script setup lang="ts">
useHead({
  titleTemplate:(title) => title?`${title} - Gerden Blog`:'Gerden Blog'
})
</script>