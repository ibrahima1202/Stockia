import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/authService'
import { useToast } from '@/store/toastStore'

export function useAuth() {
  const { user, profile, isLoading, setUser, setProfile, setLoading, reset } =
    useAuthStore()
  const toast = useToast()

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 5000)

    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(session.user)
          try {
            const p = await authService.getProfile(session.user.id)
            setProfile(p)
          } catch {}
        }
      } catch {}
      finally {
        clearTimeout(timeout)
        setLoading(false)
      }
    }

    initSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          try {
            const p = await authService.getProfile(session.user.id)
            setProfile(p)
          } catch {}
        } else if (event === 'SIGNED_OUT') {
          reset()
          window.location.href = '/login'
        }
      }
    )

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = async (email: string, password: string) => {
    try {
      await authService.signIn(email, password)
      // Rechargement complet pour vider tous les caches React
      window.location.href = '/'
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur de connexion'
      toast.error('Connexion échouée', msg)
      throw err
    }
  }

  const signOut = async () => {
    try {
      await authService.signOut()
    } catch {
      reset()
    } finally {
      window.location.href = '/login'
    }
  }

  return { user, profile, isLoading, signIn, signOut }
}
