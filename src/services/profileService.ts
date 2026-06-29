import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

export const profileService = {
  async updateProfile(userId: string, updates: { full_name: string }): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  },

  async updateEmail(newEmail: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    if (error) throw error
  },

  async cleanDemoData(): Promise<void> {
    await supabase.from('reglements_clients').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('reglements_fournisseurs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('achat_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('achats_fournisseurs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('fournisseurs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('sales').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('stock_movements').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('journal_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('products').update({ stock_current: 0 }).neq('id', '00000000-0000-0000-0000-000000000000')
  },
}
