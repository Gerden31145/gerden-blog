<template>
  <div class="font-serif py-3 flex text-text-primary justify-between mt-4">
    <div class="text-3xl">GDB</div>
    <div class="w-[50%]">
      <div class="flex gap-4 w-[100%]">
        <div class="w-[30%] text-center"
       :class="isActive('/')?'font-extrabold':''"  
        >
          <NuxtLink to="/">HOME</NuxtLink> 
        </div>
        <div>|</div>
        <div class="w-[30%] text-center"
       :class="isActive('/posts')?'font-extrabold':''"  
        >
          <NuxtLink to="/posts">POSTS</NuxtLink> 
        </div> 
        <div>|</div>
        <div
          class="w-[30%] text-center"
          :class="isActive('/login') ? 'font-extrabold' : ''"
        >
          <button
            type="button"
            class="cursor-pointer"
            @click="handleAuthClick"
          >
            {{ usersStore.isLoggedIn ? 'LOGOUT' : 'LOGIN' }}
          </button>
        </div>
        <div v-if="isAdmin">|</div>
        <div class="w-[30%]"
        :class="isActive('/admin')?'font-extrabold':''" 
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
