<template>
  <div class="font-serif flex-col justify-center items-center flex h-full">
   <div class="text-4xl mt-4 text-text-primary">Welcome Back</div> 
   <form class="text-xl mt-8" v-if="!logSuccess" @submit.prevent="handleSubmit">
    <div class="mt-4">
      <input 
        placeholder="USERNAME" type="text" class="outline-none border-b text-lg border-b-[#4b596a]"
        v-model="form.username" 
        @blur="validateUname"
        >
    </div>
    <p class="text-red-400 text-base" v-if="usernameError">Format Error</p>
    <div class="mt-2">
      <input
       type="password" placeholder="PASSWORD" class="outline-none border-b text-lg border-b-[#4b596a]"
       v-model="form.password" 
       @blur="validatePsw"
       >
    </div>
    <p class=" text-red-400 text-base" v-if="pswError">Format Error</p>
    <button type="submit" class="
    mt-5 cursor-pointer text-amber-50 p-2 text-lg w-full bg-text-primary rounded-xl
    hover:bg-[#3d4c5e] transition hover:text-white
    "
    :disabled="isSubmiting"
    >
      Login
    </button>
   </form>
   <div class="text-3xl text-text-primary mt-10" v-if="logSuccess">Redirecting to admin page...</div>
   <div class="text-base text-text-primary mt-2" v-if="isSubmiting">Logging in, please wait...</div>
   <div class="text-base text-red-400 mt-2" v-if="logError">Error: {{ logMsg }}</div>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive } from 'vue'
import { useUsersStore } from '~/stores/users'

definePageMeta({
  layout: 'blank',
  middleware: 'logged'
})

useHead({
  title: 'Admin Login'
})

type User = {
  username:string
  password:string
}

type APIError = {
  data?: {
    message?: string
  }
  response?: {
    _data?: {
      message?: string
    }
  }
  message?: string
}

const form = reactive<User>({
  username:'',
  password:''
})

const isSubmiting = ref<boolean>(false)

const usernameError = ref<boolean>(false)
const pswError = ref<boolean>(false)
const logError = ref<boolean>(false)
const logMsg = ref<string>('')
const logSuccess = ref<boolean>(false)
const usersStore = useUsersStore()

const validateUname = () => {
  if (form.username === '' || form.username.length > 64) usernameError.value = true
  else usernameError.value = false
}

const validatePsw = () => {
  if (form.password === '' || form.password.length > 30) pswError.value = true
  else pswError.value = false
}

const getErrorMessage = (error: unknown) => {
  const apiError = error as APIError

  return apiError.data?.message ||
    apiError.response?._data?.message ||
    apiError.message ||
    'Login failed'
}

const handleSubmit = async () => {
  isSubmiting.value = true
  validatePsw()
  validateUname()
  logError.value = false
  logMsg.value = ''
  if (usernameError.value || pswError.value) {
    isSubmiting.value = false
    return
  }

  try {
    await usersStore.adminLogin(form.username, form.password)
    logSuccess.value = true
    await navigateTo('/admin')
  } catch (error) {
    logError.value = true
    logMsg.value = getErrorMessage(error)
  } finally {
    isSubmiting.value = false
  }

}

</script>

<style>

</style>
