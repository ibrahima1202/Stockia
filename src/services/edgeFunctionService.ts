import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/types'
export const edgeFunctionService = {
  async createTeamMember(payload: {
    phone: string
    password: string
    fullName: string
    role: UserRole
    businessId: string
  }): Promise<{ success: boolean; userId?: string; error?: string }> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Non authentifié')
    const { data, error } = await supabase.functions.invoke('create-team-member', {
      body: payload,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })
    if (error) throw error
    return data
  },
  async deleteTeamMember(payload: {
    userId: string
    businessId: string
  }): Promise<{ success: boolean; error?: string }> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Non authentifié')
    const { data, error } = await supabase.functions.invoke('delete-team-member', {
      body: payload,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })
    if (error) throw error
    return data
  },
}
