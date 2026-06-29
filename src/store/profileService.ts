import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

export const profileService = {
  // ============================================================
  // PROFIL
  // ============================================================
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

  // ============================================================
  // NETTOYAGE DES DONNÉES DE TEST
  // ============================================================
  async cleanDemoData(): Promise<void> {
    // 1. Supprimer les règlements clients
    await supabase.from('reglements_clients').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // 2. Supprimer les règlements fournisseurs
    await supabase.from('reglements_fournisseurs').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // 3. Supprimer les achats fournisseurs (items + achats)
    await supabase.from('achat_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('achats_fournisseurs').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // 4. Supprimer les clients et fournisseurs
    await supabase.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('fournisseurs').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // 5. Supprimer les ventes (sale_items supprimés en cascade)
    await supabase.from('sales').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // 6. Supprimer les dépenses
    await supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // 7. Supprimer les mouvements de stock
    await supabase.from('stock_movements').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // 8. Supprimer le journal
    await supabase.from('journal_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // 9. Remettre tous les stocks à 0
    await supabase.from('products').update({ stock_current: 0 }).neq('id', '00000000-0000-0000-0000-000000000000')
  },
}
