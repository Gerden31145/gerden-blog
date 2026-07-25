<template>
  <div class="font-serif py-3 flex flex-wrap text-text-primary justify-between items-center mb-6
  sticky z-40 top-0 bg-background
  ">
    <div class="text-3xl">
      <img src="/icon.svg" class=" h-12" alt="Gerden Blog logo">
    </div>
    <div>
      <div class="flex gap-4 w-full">
        <div class="w-[30%] text-center text-primary"
       :class="isActive('/') ? 'text-text-primary':''"
        >
          <NuxtLink to="/">HOME</NuxtLink> 
        </div>
        <div class="text-primary">|</div>
        <div class="w-[30%] text-center text-primary"
          :class="isActive('/posts') ? 'text-text-primary':''"  
        >
          <NuxtLink to="/posts">POSTS</NuxtLink> 
        </div> 
        <div class="text-primary">|</div>
        <div
          class="w-[30%] text-center text-primary"
          :class="isActive('/login') ? 'text-text-primary' : ''"
        >
          <button
            type="button"
            class="cursor-pointer"
            @click="handleAuthClick"
          >
            {{ usersStore.isLoggedIn ? 'LOGOUT' : 'LOGIN' }}
          </button>
        </div>
        <div v-if="isAdmin" class="text-primary">|</div>
        <div class="w-[30%] text-primary"
        :class="isActive('/admin')?'text-text-primary':''" 
        v-if="isAdmin"
        >
          <NuxtLink to="/admin">ADMIN</NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useRoute } from 'vue-router'
import { useUsersStore } from '~/stores/users'

const isAdmin = computed(() => usersStore.isAdmin)
const route = useRoute()
const usersStore = useUsersStore()

function isActive(prefix:string) {
  return route.path.startsWith(prefix+'/') || route.path === prefix
}

const handleAuthClick = async () => {
  if (!usersStore.isLoggedIn) {
    await navigateTo('/login')
    return
  }

  await usersStore.logout()
  await navigateTo('/login')
}


</script>

<style>

</style>
