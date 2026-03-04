import { create } from 'zustand'

export type User = {
  id: number
  name: string
  lastname: string
  email: string
  createdAt: string
  updatedAt: string | null
}

type AuthState = {
  user: User | null
  isLoading: boolean
  error: string | null
  setUser: (user: User | null) => void
  setIsLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  logout: () => void
}

const LOCAL_STORAGE_KEY = 'miimbo-user'

export const useAuthStore = create<AuthState>((set) => {
  let initialUser: User | null = null

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (stored) {
        initialUser = JSON.parse(stored) as User
        console.log('[MIIMBO] [AUTH] Store init: usuario hidratado desde localStorage', initialUser.email)
      } else {
        console.log('[MIIMBO] [AUTH] Store init: sin usuario en localStorage')
      }
    } catch (error) {
      console.error('[MIIMBO] [AUTH] Error leyendo localStorage', error)
    }
  }

  return {
    user: initialUser,
    isLoading: false,
    error: null,
    setUser: (user) => {
      if (typeof window !== 'undefined') {
        try {
          if (user) {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(user))
            console.log('[MIIMBO] [AUTH] setUser: usuario guardado', user.email)
          } else {
            localStorage.removeItem(LOCAL_STORAGE_KEY)
            console.log('[MIIMBO] [AUTH] setUser: usuario removido')
          }
        } catch (error) {
          console.error('[MIIMBO] [AUTH] Error escribiendo localStorage', error)
        }
      }

      set({ user, error: null })
    },
    setIsLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
    logout: () => {
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(LOCAL_STORAGE_KEY)
          console.log('[MIIMBO] [AUTH] logout: sesión cerrada, localStorage limpiado')
        } catch (error) {
          console.error('[MIIMBO] [AUTH] Error removiendo localStorage', error)
        }
      }

      set({ user: null, error: null, isLoading: false })
    },
  }
})

