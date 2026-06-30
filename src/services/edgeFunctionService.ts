import { supabase } from '@/lib/supabase'

export const edgeFunctionService = {
  async createTeamMember(payload: {
    email: string
    password: string
    fullName: string
    role: 'admin' | 'caissier'
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
}
