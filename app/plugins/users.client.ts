import { useUsersStore } from '~/stores/users'

export default defineNuxtPlugin(() => {
  const usersStore = useUsersStore()

  usersStore.initFromStorage()
})
