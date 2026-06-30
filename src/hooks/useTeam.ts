import { useState, useEffect, useCallback } from 'react'
import { teamService } from '@/services/teamService'
import { edgeFunctionService } from '@/services/edgeFunctionService'
import type { Profile, UserRole } from '@/types'
import { useToast } from '@/store/toastStore'
import { useAuthStore } from '@/store/authStore'

export function useTeam() {
  const [members, setMembers] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const toast = useToast()
  const { profile } = useAuthStore()

  const load = useCallback(async () => {
    if (!profile?.business_id) {
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      const data = await teamService.getTeamMembers(profile.business_id)
      setMembers(data)
    } catch {
      toast.error('Erreur', 'Impossible de charger l\'équipe')
    } finally {
      setIsLoading(false)
    }
  }, [profile?.business_id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const updateRole = async (userId: string, role: UserRole) => {
    const updated = await teamService.updateRole(userId, role)
    setMembers((prev) => prev.map((m) => (m.id === userId ? updated : m)))
    toast.success('Rôle mis à jour')
    return updated
  }

  const toggleActive = async (userId: string, isActive: boolean) => {
    const updated = await teamService.toggleActive(userId, isActive)
    setMembers((prev) => prev.map((m) => (m.id === userId ? updated : m)))
    toast.success(isActive ? 'Membre réactivé' : 'Membre désactivé')
    return updated
  }

  const createMember = async (data: {
    email: string
    password: string
    fullName: string
    role: UserRole
  }) => {
    if (!profile?.business_id) throw new Error('Commerce introuvable')

    const result = await edgeFunctionService.createTeamMember({
      email: data.email,
      password: data.password,
      fullName: data.fullName,
      role: data.role,
      businessId: profile.business_id,
    })

    if (!result.success) {
      throw new Error(result.error ?? 'Erreur lors de la création')
    }

    toast.success('Membre ajouté', `${data.fullName} peut maintenant se connecter`)
    await load()
    return result
  }

  return { members, isLoading, reload: load, updateRole, toggleActive, createMember }
}
