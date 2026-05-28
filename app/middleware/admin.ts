export default defineNuxtRouteMiddleware((to, from) => {
  const { loggedIn, user } = useUserSession()

  if (!loggedIn.value || !user.value) {
    return navigateTo('/admin/login')
  }
})