import { defineStore } from 'pinia'
import { loginAPI } from '~/services/login'
import type { User } from '~/types/user'

const USER_STORAGE_KEY = 'gerden-shop:user'

type UsersState = {
  user: User | null
  initialized: boolean
  loading: boolean
}

const isUser = (value: unknown): value is User => {
  if (!value || typeof value !== 'object') return false

  const user = value as Partial<User>

  return typeof user.id === 'string' &&
    typeof user.username === 'string' &&
    typeof user.email === 'string' &&
    (user.role === 'user' || user.role === 'admin')
}

export const useUsersStore = defineStore('users', {
  state: (): UsersState => ({
    user: null,
    initialized: false,
    loading: false
  }),

  getters: {
    isLoggedIn: (state) => state.user !== null,
    isAdmin: (state) => state.user?.role === 'admin'
  },

  actions: {
    initFromStorage() {
      if (!import.meta.client || this.initialized) return

      const rawUser = localStorage.getItem(USER_STORAGE_KEY)

      if (!rawUser) {
        this.initialized = true
        return
      }

      try {
        const parsedUser = JSON.parse(rawUser)
        this.user = isUser(parsedUser) ? parsedUser : null
      } catch {
        this.user = null
      }

      if (!this.user) {
        localStorage.removeItem(USER_STORAGE_KEY)
      }

      this.initialized = true
    },

    setUser(user: User) {
      this.user = user
      this.initialized = true

      if (import.meta.client) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
      }
    },

    clearUser() {
      this.user = null
      this.initialized = true

      if (import.meta.client) {
        localStorage.removeItem(USER_STORAGE_KEY)
      }
    },

    async login(username: string, password: string) {
      this.loading = true

      try {
        const response = await loginAPI.login(username, password)
        this.setUser(response.data.user)

        return response.data.user
      } finally {
        this.loading = false
      }
    },

    async adminLogin(username: string, password: string) {
      this.loading = true

      try {
        const response = await loginAPI.adminLogin(username, password)
        this.setUser(response.data.user)

        return response.data.user
      } finally {
        this.loading = false
      }
    },

    async fetchMe() {
      this.loading = true

      try {
        const response = await loginAPI.me()
        this.setUser(response.data)

        return response.data
      } catch (error) {
        this.clearUser()
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchAdminMe() {
      this.loading = true

      try {
        const response = await loginAPI.adminMe()
        this.setUser(response.data)

        return response.data
      } catch (error) {
        this.clearUser()
        throw error
      } finally {
        this.loading = false
      }
    },

    async logout() {
      this.loading = true

      try {
        await loginAPI.logout()
      } finally {
        this.clearUser()
        this.loading = false
      }
    },

    async adminLogout() {
      this.loading = true

      try {
        await loginAPI.adminLogout()
      } finally {
        this.clearUser()
        this.loading = false
      }
    }
  }
})
