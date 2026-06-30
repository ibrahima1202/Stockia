import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

export const teamService = {
  async getTeamMembers(businessId: string): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data
  },

  async updateRole(userId: string, role: 'admin' | 'caissier'): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async toggleActive(userId: string, isActive: boolean): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', userId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getTeamCount(businessId: string): Promise<number> {
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('is_active', true)
    if (error) throw error
    return count ?? 0
  },
}
