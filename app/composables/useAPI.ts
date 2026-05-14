// 自定义useFetch 避免重复请求
export const useAPI = createUseFetch((callerOptions) => {
  const config = useRuntimeConfig()

  return {
    baseURL: config.public.apiBase,
    $fetch: useNuxtApp().$api as typeof $fetch,
    ...callerOptions,
  }
}) 