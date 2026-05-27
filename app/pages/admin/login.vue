<template>
  <div class="font-serif flex-col justify-center items-center flex h-full">
   <div class="text-4xl mt-4 text-text-primary">Welcome Back</div> 
   <form class="text-xl mt-8" v-if="!logSuccess">
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
    @click.prevent="handleSubmit"
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
import { loginAPI } from '~/services/login'
import type { APIResponse } from '~/types/api'

definePageMeta({
  layout:'blank'
})

type User = {
  username:string
  password:string
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

const validateUname = () => {
  if (form.username === '' || form.username.length > 20) usernameError.value = true
  else usernameError.value = false
}

const validatePsw = () => {
  if (form.password === '' || form.password.length > 30) pswError.value = true
  else pswError.value = false
}

const handleSubmit = async () => {
  isSubmiting.value = true
  validatePsw()
  validateUname()
  if (usernameError.value || pswError.value) {
    isSubmiting.value = false
    return
  }
  const {data, error} = await loginAPI.login(form.username, form.password)
  if (error.value) {
    logError.value = true
    logMsg.value = error.value?.data.message ?? 'Login fail'
    console.error(error)
  }
  else {
    logSuccess.value = true  
  }

  isSubmiting.value = false

}

</script>

<style>

</style>