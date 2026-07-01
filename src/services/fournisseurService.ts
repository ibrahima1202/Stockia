import { supabase } from '@/lib/supabase'
import type { Fournisseur, AchatFournisseur, ReglementFournisseur, PaymentMethod, CreateAchatPayload, Product } from '@/types'
import { generateReference } from '@/lib/utils'
import { getBusinessId } from '@/lib/business'
import { format } from 'date-fns'

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
      .insert({ ...fournisseur, solde: 0, created_by: userId, business_id: getBusinessId() })
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

  async createProduct(
    product: { name: string; reference: string; category_id?: string; purchase_price: number; selling_price: number }
  ): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .insert({
        ...product,
        stock_current: 0,
        stock_minimum: 5,
        is_active: true,
        business_id: getBusinessId(),
      })
      .select('*, category:categories(*)')
      .single()
    if (error) throw error
    return data
  },

  async getAchats(fournisseurId: string): Promise<AchatFournisseur[]> {
    const { data, error } = await supabase
      .from('achats_fournisseurs')
      .select('*, fournisseur:fournisseurs(name), achat_items(*, product:products(name, reference))')
      .eq('fournisseur_id', fournisseurId)
      .order('achat_date', { ascending: false })
    if (error) throw error
    return data
  },

  async addAchat(payload: CreateAchatPayload, userId: string): Promise<AchatFournisseur> {
    const reference = generateReference('ACH')
    const today = format(new Date(), 'yyyy-MM-dd')
    const montantTotal = payload.items.reduce((sum, i) => sum + i.total_price, 0)
    const statut = payload.statut
    const montantPaye = statut === 'comptant'
      ? montantTotal
      : statut === 'credit'
      ? 0
      : (payload.montant_paye ?? 0)
    const montantDu = montantTotal - montantPaye
    const businessId = getBusinessId()

    // 1. Créer la facture d'achat
    const { data: achat, error: aError } = await supabase
      .from('achats_fournisseurs')
      .insert({
        fournisseur_id: payload.fournisseur_id,
        reference,
        montant_total: montantTotal,
        montant_paye: montantPaye,
        statut,
        payment_method: payload.payment_method ?? 'especes',
        notes: payload.notes,
        achat_date: today,
        created_by: userId,
        business_id: businessId,
      })
      .select()
      .single()
    if (aError) throw aError

    // 2. Créer les lignes d'achat
    const achatItems = payload.items.map((item) => ({
      achat_id: achat.id,
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      business_id: businessId,
    }))
    const { error: itemsError } = await supabase.from('achat_items').insert(achatItems)
    if (itemsError) throw itemsError

    // 3. Mettre à jour le stock de chaque produit
    for (const item of payload.items) {
      const { data: product, error: pError } = await supabase
        .from('products')
        .select('stock_current')
        .eq('id', item.product.id)
        .single()
      if (pError) throw pError

      const { error: stockError } = await supabase
        .from('products')
        .update({ stock_current: product.stock_current + item.quantity })
        .eq('id', item.product.id)
      if (stockError) throw stockError

      const { error: movError } = await supabase.from('stock_movements').insert({
        product_id: item.product.id,
        type: 'entree',
        quantity: item.quantity,
        reason: `Achat fournisseur ${reference}`,
        reference,
        created_by: userId,
        business_id: businessId,
      })
      if (movError) throw movError
    }

    // 4. Journal
    if (montantPaye > 0) {
      const { error: jError } = await supabase.from('journal_entries').insert({
        entry_date: today,
        reference,
        label: `Achat fournisseur - ${payload.notes ?? reference}`,
        debit: 0,
        credit: montantPaye,
        source_type: 'achat_fournisseur',
        source_id: achat.id,
        business_id: businessId,
      })
      if (jError) throw jError
    }

    // 5. Si crédit ou partiel → augmenter solde fournisseur
    if (montantDu > 0) {
      const { data: fourn, error: fError } = await supabase
        .from('fournisseurs')
        .select('solde')
        .eq('id', payload.fournisseur_id)
        .single()
      if (fError) throw fError

      const { error: uError } = await supabase
        .from('fournisseurs')
        .update({ solde: fourn.solde + montantDu })
        .eq('id', payload.fournisseur_id)
      if (uError) throw uError
    }

    return achat
  },

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
    const businessId = getBusinessId()

    const { data: reglement, error: rError } = await supabase
      .from('reglements_fournisseurs')
      .insert({
        fournisseur_id: fournisseurId,
        montant,
        payment_method: paymentMethod,
        notes,
        reglement_date: format(new Date(), 'yyyy-MM-dd'),
        created_by: userId,
        business_id: businessId,
      })
      .select()
      .single()
    if (rError) throw rError

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

    const reference = generateReference('RFO')
    const { error: jError } = await supabase.from('journal_entries').insert({
      entry_date: format(new Date(), 'yyyy-MM-dd'),
      reference,
      label: `Règlement fournisseur`,
      debit: 0,
      credit: montant,
      source_type: 'reglement_fournisseur',
      source_id: reglement.id,
      business_id: businessId,
    })
    if (jError) throw jError

    return reglement
  },
}
