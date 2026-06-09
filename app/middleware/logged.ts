import { useUsersStore } from '~/stores/users'

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  const usersStore = useUsersStore()

  try {
    await usersStore.fetchMe()

    if (usersStore.isAdmin && to.path === '/admin/login') {
      return navigateTo('/admin')
    }

    if (usersStore.isLoggedIn) {
      return navigateTo('/')
    }
  } catch {
    return
  }
})
