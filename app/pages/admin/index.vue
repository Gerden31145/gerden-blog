<template>
  <div class="text-text-primary flex justify-start items-start font-serif flex-col">
    <div class="text-5xl">ADMIN PANEL</div>
    <div class="w-full mt-4">
      <div class="mt-3 w-full text-left flex justify-between">
        <span class="text-4xl">Posts List</span>
        <span class="text-3xl cursor-pointer" @click="openModal('Upload')">+</span>
      </div>
      <div v-for="item in list"
      :key="item.id" 
      >
        <AdminPostContainer
        :post="item" 
        @open-modal="openModal('Update', item)"
        ></AdminPostContainer>
      </div>
      <div v-if="list.length === 0">
        No data
      </div>
    </div>
    <div class="flex w-full items-center justify-end mt-8">
      <button 
      @click="handleLogout"
      class="text-2xl text-red-50 bg-text-primary rounded-lg p-1">Logout</button>
    </div>
    <BaseModal v-if="modalOpen" @close="closeModal" :post="postInfo" :status="modalStatus"></BaseModal>
      </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { PostApi } from '~/services/posts';
import type { PostList } from '~/types/posts';
import { loginAPI } from '~/services/login';

definePageMeta({
  layout:'default',
  middleware:'admin'
})

const { data } = await PostApi.getList()

const list:PostList[] = data.value?.data?? []

const handleLogout = async () => {
  const { clear } = useUserSession()
  await clear()
  navigateTo('/')
}

const modalOpen = ref<boolean>(false)
const closeModal = () => {
  modalOpen.value = false
}

const postInfo = ref<PostList | undefined>()

const modalStatus = ref<'Upload' | 'Update'>('Upload')

const openModal = (status:'Upload' | 'Update', post?:PostList) => {
  modalOpen.value = true
  postInfo.value = post
  modalStatus.value = status
}

</script>

<style>

</style>