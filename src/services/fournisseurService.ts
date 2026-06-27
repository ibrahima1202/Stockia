import { supabase } from '@/lib/supabase'
import type { Fournisseur, AchatFournisseur, ReglementFournisseur, PaymentMethod } from '@/types'
import { generateReference } from '@/lib/utils'

export const fournisseurService = {
  async getAll(): Promise<Fournisseur[]> {
    const { data, error } = await supabase
      .from('fournisseurs')
      .select('*')
      .order('name')
    if (error) throw error
    return data
  },

  async getById(id: string): Promise<Fournisseur> {
    const { data, error } = await supabase
      .from('fournisseurs')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async create(
    fournisseur: { name: string; phone?: string; address?: string; notes?: string },
    userId: string
  ): Promise<Fournisseur> {
    const { data, error } = await supabase
      .from('fournisseurs')
      .insert({ ...fournisseur, solde: 0, created_by: userId })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(
    id: string,
    updates: { name?: string; phone?: string; address?: string; notes?: string }
  ): Promise<Fournisseur> {
    const { data, error } = await supabase
      .from('fournisseurs')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('fournisseurs').delete().eq('id', id)
    if (error) throw error
  },

  // ============================================================
  // ACHATS À CRÉDIT
  // ============================================================
  async getAchats(fournisseurId: string): Promise<AchatFournisseur[]> {
    const { data, error } = await supabase
      .from('achats_fournisseurs')
      .select('*, fournisseur:fournisseurs(name)')
      .eq('fournisseur_id', fournisseurId)
      .order('achat_date', { ascending: false })
    if (error) throw error
    return data
  },

  async addAchat(
    fournisseurId: string,
    montantTotal: number,
    notes: string,
    userId: string
  ): Promise<AchatFournisseur> {
    const reference = generateReference('ACH')

    // 1. Enregistrer l'achat
    const { data: achat, error: aError } = await supabase
      .from('achats_fournisseurs')
      .insert({
        fournisseur_id: fournisseurId,
        reference,
        montant_total: montantTotal,
        montant_paye: 0,
        notes,
        achat_date: new Date().toISOString().split('T')[0],
        created_by: userId,
      })
      .select()
      .single()
    if (aError) throw aError

    // 2. Augmenter le solde du fournisseur (on lui doit)
    const { data: fourn, error: fError } = await supabase
      .from('fournisseurs')
      .select('solde')
      .eq('id', fournisseurId)
      .single()
    if (fError) throw fError

    const { error: uError } = await supabase
      .from('fournisseurs')
      .update({ solde: fourn.solde + montantTotal })
      .eq('id', fournisseurId)
    if (uError) throw uError

    // 3. Entrée journal (crédit = sortie future)
    const { error: jError } = await supabase.from('journal_entries').insert({
      entry_date: new Date().toISOString().split('T')[0],
      reference,
      label: `Achat fournisseur - ${notes}`,
      debit: 0,
      credit: montantTotal,
      source_type: 'achat_fournisseur',
      source_id: achat.id,
    })
    if (jError) throw jError

    return achat
  },

  // ============================================================
  // RÈGLEMENTS FOURNISSEURS
  // ============================================================
  async getReglements(fournisseurId: string): Promise<ReglementFournisseur[]> {
    const { data, error } = await supabase
      .from('reglements_fournisseurs')
      .select('*')
      .eq('fournisseur_id', fournisseurId)
      .order('reglement_date', { ascending: false })
    if (error) throw error
    return data
  },

  async addReglement(
    fournisseurId: string,
    montant: number,
    paymentMethod: PaymentMethod,
    notes: string,
    userId: string
  ): Promise<ReglementFournisseur> {
    // 1. Enregistrer le règlement
    const { data: reglement, error: rError } = await supabase
      .from('reglements_fournisseurs')
      .insert({
        fournisseur_id: fournisseurId,
        montant,
        payment_method: paymentMethod,
        notes,
        reglement_date: new Date().toISOString().split('T')[0],
        created_by: userId,
      })
      .select()
      .single()
    if (rError) throw rError

    // 2. Réduire le solde du fournisseur
    const { data: fourn, error: fError } = await supabase
      .from('fournisseurs')
      .select('solde')
      .eq('id', fournisseurId)
      .single()
    if (fError) throw fError

    const { error: uError } = await supabase
      .from('fournisseurs')
      .update({ solde: Math.max(0, fourn.solde - montant) })
      .eq('id', fournisseurId)
    if (uError) throw uError

    // 3. Entrée journal (débit = sortie caisse)
    const reference = generateReference('RFO')
    const { error: jError } = await supabase.from('journal_entries').insert({
      entry_date: new Date().toISOString().split('T')[0],
      reference,
      label: `Règlement fournisseur`,
      debit: 0,
      credit: montant,
      source_type: 'reglement_fournisseur',
      source_id: reglement.id,
    })
    if (jError) throw jError

    return reglement
  },
}
