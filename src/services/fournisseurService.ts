import { supabase } from '@/lib/supabase'
import { getBusinessId } from '@/lib/business'
import { generateReference } from '@/lib/utils'
import { format } from 'date-fns'
import type {
  Fournisseur, AchatFournisseur, ReglementFournisseur,
  PaymentMethod, CreateAchatPayload, Product
} from '@/types'

export interface FournisseurAchatEntry {
  id: string
  reference: string
  date: string
  montant_total: number
  montant_paye: number
  statut: string
  notes?: string | null
  achat_items?: Array<{
    quantity: number
    unit_price: number
    total_price: number
    unit_name?: string | null
    conversion_rate?: number | null
    quantity_in_base?: number | null
    product?: { name: string; reference: string; base_unit?: string | null } | null
  }>
}

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

  async getHistorique(fournisseurId: string): Promise<FournisseurAchatEntry[]> {
    const { data, error } = await supabase
      .from('achats_fournisseurs')
      .select(`
        id, reference, achat_date, montant_total, montant_paye, statut, notes,
        achat_items(
          quantity, unit_price, total_price, unit_name, conversion_rate, quantity_in_base,
          product:products(name, reference, base_unit)
        )
      `)
      .eq('fournisseur_id', fournisseurId)
      .order('achat_date', { ascending: false })
    if (error) throw error

    return (data || []).map((a) => ({
      id: a.id,
      reference: a.reference,
      date: a.achat_date,
      montant_total: a.montant_total,
      montant_paye: a.montant_paye,
      statut: a.statut,
      notes: a.notes,
      achat_items: (a.achat_items || []).map((item: any) => ({
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        unit_name: item.unit_name,
        conversion_rate: item.conversion_rate,
        quantity_in_base: item.quantity_in_base,
        product: Array.isArray(item.product) ? item.product[0] : item.product,
      })),
    }))
  },

  async create(
    fournisseur: { name: string; phone?: string; address?: string; notes?: string },
    userId: string
  ): Promise<Fournisseur> {
    const businessId = getBusinessId()
    const { data, error } = await supabase
      .from('fournisseurs')
      .insert({ ...fournisseur, business_id: businessId, created_by: userId, solde: 0 })
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

  async createProduct(product: {
    name: string
    reference: string
    category_id?: string
    purchase_price: number
    selling_price: number
  }): Promise<Product> {
    const businessId = getBusinessId()
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('business_id', businessId)
    const count = (existing?.length ?? 0) + 1
    const timestamp = Date.now().toString().slice(-4)
    const reference = `PRD-${String(count).padStart(4, '0')}-${timestamp}`
    const { data, error } = await supabase
      .from('products')
      .insert({
        ...product,
        reference,
        business_id: businessId,
        stock_current: 0,
        stock_minimum: 5,
        is_active: true,
      })
      .select('*, category:categories(*)')
      .single()
    if (error) throw error
    return data
  },

  async addAchat(payload: CreateAchatPayload, userId: string): Promise<AchatFournisseur> {
    const businessId = getBusinessId()
    const reference = generateReference('ACH')
    const montantTotal = payload.items.reduce((s, i) => s + i.total_price, 0)
    const montantPaye = payload.statut === 'comptant'
      ? montantTotal
      : payload.statut === 'credit'
      ? 0
      : (payload.montant_paye ?? 0)
    const montantDu = montantTotal - montantPaye

    const { data: achat, error: achatError } = await supabase
      .from('achats_fournisseurs')
      .insert({
        fournisseur_id: payload.fournisseur_id,
        reference,
        montant_total: montantTotal,
        montant_paye: montantPaye,
        statut: payload.statut,
        payment_method: payload.payment_method,
        notes: payload.notes,
        achat_date: format(new Date(), 'yyyy-MM-dd'),
        created_by: userId,
        business_id: businessId,
      })
      .select()
      .single()
    if (achatError) throw achatError

    const achatItems = payload.items.map((item) => ({
      achat_id: achat.id,
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      unit_id: (item as any).unit_id ?? null,
      unit_name: (item as any).unit_name ?? null,
      conversion_rate: (item as any).conversion_rate ?? 1,
      quantity_in_base: (item as any).quantity_in_base ?? item.quantity,
      business_id: businessId,
    }))
    const { error: itemsError } = await supabase.from('achat_items').insert(achatItems)
    if (itemsError) throw itemsError

    for (const item of payload.items) {
      const qtyInBase = (item as any).quantity_in_base ?? item.quantity
      const { data: product, error: pError } = await supabase
        .from('products')
        .select('stock_current, base_unit')
        .eq('id', item.product.id)
        .single()
      if (pError) throw pError

      const { error: stockError } = await supabase
        .from('products')
        .update({ stock_current: product.stock_current + qtyInBase })
        .eq('id', item.product.id)
      if (stockError) throw stockError

      const unitName = (item as any).unit_name
      const convRate = (item as any).conversion_rate ?? 1
      const unitLabel = unitName && convRate > 1
        ? `${item.quantity} ${unitName} (${qtyInBase} ${product.base_unit || 'pcs'})`
        : `${qtyInBase}`

      const { error: movError } = await supabase.from('stock_movements').insert({
        product_id: item.product.id,
        type: 'entree',
        quantity: qtyInBase,
        reason: `Achat ${reference} — ${unitLabel}`,
        reference,
        created_by: userId,
        business_id: businessId,
      })
      if (movError) throw movError
    }

    if (montantPaye > 0) {
      const { error: journalError } = await supabase.from('journal_entries').insert({
        entry_date: format(new Date(), 'yyyy-MM-dd'),
        reference,
        label: `Achat fournisseur - ${payload.items.map((i) => i.product.name).join(', ')}`,
        debit: 0,
        credit: montantPaye,
        source_type: 'achat_fournisseur',
        source_id: achat.id,
        business_id: businessId,
      })
      if (journalError) throw journalError
    }

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

  async addReglement(
    fournisseurId: string,
    montant: number,
    paymentMethod: PaymentMethod,
    notes: string,
    userId: string
  ): Promise<ReglementFournisseur> {
    const businessId = getBusinessId()
    const { data, error } = await supabase
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
    if (error) throw error

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

    const { error: journalError } = await supabase.from('journal_entries').insert({
      entry_date: format(new Date(), 'yyyy-MM-dd'),
      reference: `REG-${Date.now()}`,
      label: `Règlement fournisseur`,
      debit: 0,
      credit: montant,
      source_type: 'reglement_fournisseur',
      source_id: data.id,
      business_id: businessId,
    })
    if (journalError) throw journalError

    return data
  },
}
