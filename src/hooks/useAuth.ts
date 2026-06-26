import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/authService'
import { useToast } from '@/store/toastStore'

export function useAuth() {
  const { user, profile, isLoading, setUser, setProfile, setLoading, reset } =
    useAuthStore()
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        authService
          .getProfile(session.user.id)
          .then(setProfile)
          .catch(() => {})
          .finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    // Listen to auth changes
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
          navigate('/login')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = async (email: string, password: string) => {
    try {
      await authService.signIn(email, password)
      navigate('/')
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
      navigate('/login')
    }
  }

  return { user, profile, isLoading, signIn, signOut }
}
