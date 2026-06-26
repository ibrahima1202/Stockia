import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types'

interface AuthState {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  setLoading: (isLoading: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      profile: null,
      isLoading: true,
      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setLoading: (isLoading) => set({ isLoading }),
      reset: () => set({ user: null, profile: null, isLoading: false }),
    }),
    {
      name: 'quincaillerie-auth',
      partialize: (state) => ({ profile: state.profile }),
      // CORRIGÉ : isLoading toujours réinitialisé à true au démarrage
      onRehydrateStorage: () => (state) => {
        if (state) state.isLoading = true
      },
    }
  )
)
