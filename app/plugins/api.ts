import { useUsersStore } from '~/stores/users'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  const api = $fetch.create({
    baseURL: config.public.apiBase,
    credentials: 'include',

    onRequest({ request, options }) {
    },

    onResponse() {
    },
    onResponseError({ response }) {
      if (response.status === 401) {
        if (import.meta.client) {
          const usersStore = useUsersStore()
          usersStore.clearUser()
        }
      }

      console.log('响应错误！错误代码:', response.status, ' 错误内容:', response._data)
    }


  })

  return {
    provide: {
      api
    }
  }
})
