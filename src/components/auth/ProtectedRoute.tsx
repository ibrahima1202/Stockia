import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useAuth } from '@/hooks/useAuth'
import { LoadingScreen } from '@/components/ui/index'
import type { UserRole } from '@/types'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isLoading, user, profile } = useAuthStore()
  // CORRIGÉ : forcer l'initialisation de useAuth ici
  useAuth()

  if (isLoading) return <LoadingScreen text="Vérification de la session..." />
  if (!user) return <Navigate to="/login" replace />
  if (requiredRole && profile?.role !== requiredRole) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
