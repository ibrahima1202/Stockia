import { useAuthStore } from '@/store/authStore'

export function getBusinessId(): string {
  const profile = useAuthStore.getState().profile
  if (!profile?.business_id) throw new Error('Business ID introuvable')
  return profile.business_id
}
