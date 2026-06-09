import { useUsersStore } from '~/stores/users'

export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return

  const usersStore = useUsersStore()

  try {
    await usersStore.fetchAdminMe()

    if (!usersStore.isAdmin) {
      return navigateTo('/admin/login')
    }
  } catch {
    return navigateTo('/admin/login')
  }
})
