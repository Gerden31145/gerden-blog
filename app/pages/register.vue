<template>
  <div class="font-serif flex-col justify-center items-center flex h-full">
    <div class="text-4xl mt-4 text-text-primary">Create Account</div>
    <form class="text-xl mt-8" v-if="!registerSuccess" @submit.prevent="handleSubmit">
      <div class="mt-4">
        <input
          placeholder="USERNAME"
          type="text"
          class="outline-none border-b text-lg border-b-[#4b596a]"
          v-model="form.username"
          @blur="validateUname"
        >
      </div>
      <p class="text-red-400 text-base" v-if="usernameError">Format Error</p>
      <div class="mt-2">
        <input
          type="email"
          placeholder="EMAIL"
          class="outline-none border-b text-lg border-b-[#4b596a]"
          v-model="form.email"
          @blur="validateEmail"
        >
      </div>
      <p class="text-red-400 text-base" v-if="emailError">Format Error</p>
      <div class="mt-2">
        <input
          type="password"
          placeholder="PASSWORD"
          class="outline-none border-b text-lg border-b-[#4b596a]"
          v-model="form.password"
          @blur="validatePsw"
        >
      </div>
      <p class="text-red-400 text-base" v-if="pswError">Format Error</p>
      <button
        type="submit"
        class="
          mt-5 cursor-pointer text-amber-50 p-2 text-lg w-full bg-text-primary rounded-xl
          hover:bg-[#3d4c5e] transition hover:text-white disabled:cursor-not-allowed disabled:opacity-70
        "
        :disabled="isSubmiting"
      >
        Register
      </button>
      <div class="text-base text-text-primary mt-4 text-center">
        <NuxtLink to="/login" class="underline underline-offset-4">Back to login</NuxtLink>
      </div>
    </form>
    <div class="text-3xl text-text-primary mt-10" v-if="registerSuccess">Register success</div>
    <NuxtLink
      v-if="registerSuccess"
      to="/login"
      class="text-base text-text-primary mt-4 underline underline-offset-4"
    >
      Login now
    </NuxtLink>
    <div class="text-base text-text-primary mt-2" v-if="isSubmiting">Creating account, please wait...</div>
    <div class="text-base text-red-400 mt-2" v-if="registerError">Error: {{ registerMsg }}</div>
  </div>
</template>

<script lang="ts" setup>
import { reactive, ref } from 'vue'
import { loginAPI } from '~/services/login'

definePageMeta({
  layout: 'blank',
  middleware: 'logged'
})

useHead({
  title: 'Register'
})

type RegisterForm = {
  username: string
  email: string
  password: string
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

const form = reactive<RegisterForm>({
  username: '',
  email: '',
  password: ''
})

const isSubmiting = ref<boolean>(false)

const usernameError = ref<boolean>(false)
const emailError = ref<boolean>(false)
const pswError = ref<boolean>(false)
const registerError = ref<boolean>(false)
const registerMsg = ref<string>('')
const registerSuccess = ref<boolean>(false)

const validateUname = () => {
  usernameError.value = !/^[A-Za-z0-9_]{3,64}$/.test(form.username)
}

const validateEmail = () => {
  emailError.value = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) || form.email.length > 255
}

const validatePsw = () => {
  pswError.value = form.password.length < 6 || form.password.length > 30
}

const getErrorMessage = (error: unknown) => {
  const apiError = error as APIError

  return apiError.data?.message ||
    apiError.response?._data?.message ||
    apiError.message ||
    'Register failed'
}

const handleSubmit = async () => {
  isSubmiting.value = true
  validateUname()
  validateEmail()
  validatePsw()
  registerError.value = false
  registerMsg.value = ''

  if (usernameError.value || emailError.value || pswError.value) {
    isSubmiting.value = false
    return
  }

  try {
    await loginAPI.register(form.username, form.email, form.password)
    registerSuccess.value = true
  } catch (error) {
    registerError.value = true
    registerMsg.value = getErrorMessage(error)
  } finally {
    isSubmiting.value = false
  }
}
</script>
