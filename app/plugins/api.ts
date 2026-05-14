export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  const api = $fetch.create({
    baseURL: config.public.apiBase,

    onRequest({ request, options }) {
      // 请求拦截器，用于添加token等 
    },

    onResponse() {
      // 响应拦截器
    },
    onResponseError({ response }) {
      if (response.status === 401) {
        console.log('响应错误！...')
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