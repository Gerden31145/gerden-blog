import type { APIResponse } from "~/types/api";
import type { User } from "~/types/user";

type LoginResult = {
  ok: boolean
  user: User
}

export const loginAPI = {
  register(username: string, email: string, password: string) {
    const { $api } = useNuxtApp()

    return $api<APIResponse<User>>('register', {
      method: 'POST',
      body: {
        username,
        email,
        password
      }
    })
  },
  login(username: string, password: string) {
    const { $api } = useNuxtApp()

    return $api<APIResponse<LoginResult>>('login', {
      method: 'POST',
      body: {
        username,
        password
      }
    })
  },
  adminLogin(username: string, password: string) {
    const { $api } = useNuxtApp()

    return $api<APIResponse<LoginResult>>('admin/login', {
      method: 'POST',
      body: {
        username,
        password
      }
    })
  },
  me() {
    const { $api } = useNuxtApp()

    return $api<APIResponse<User>>('me')
  },
  adminMe() {
    const { $api } = useNuxtApp()

    return $api<APIResponse<User>>('admin/me')
  },
  logout() {
    const { $api } = useNuxtApp()

    return $api<APIResponse<{ ok: true }>>('logout', {
      method: 'POST'
    })
  },
  adminLogout() {
    const { $api } = useNuxtApp()

    return $api<APIResponse<{ ok: true }>>('admin/logout', {
      method: 'POST'
    })
  }
}
