import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as null | { email: string },
    token: null as null | string
  }),
  getters: {
    isAuthenticated: (state) => !!state.user
  },
  actions: {
    async login(email: string, password: string) {
      // TODO replace with real login logic via api and jwt
      if (email === 'filip@blichstudio.com' && password === 'secret') {
        this.user = { email }
        this.token = 'fake-jwt-token'
        return true
      }
      throw new Error('Invalid credentials')
    },
    logout() {
      this.user = null
      this.token = null
    }
  }
})
