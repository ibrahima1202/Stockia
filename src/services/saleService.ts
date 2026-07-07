import { supabase } from '@/lib/supabase'
import type { Sale, CreateSalePayload } from '@/types'
import { generateReference } from '@/lib/utils'
import { getBusinessId } from '@/lib/business'
import { format as dateFormat } from 'date-fns'

export const saleService = {
  async getAll(limit = 100): Promise<Sale[]> {
    const { data, error } = await supabase
      .from('sales')
      .select('*, sale_items(*, product:products(name, reference)), profile:profiles(full_name), client:clients(name)')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data
  },

  async getById(id: string): Promise<Sale> {
    const { data, error } = await supabase
      .from('sales')
      .select('*, sale_items(*, product:products(name, reference, selling_price)), profile:profiles(full_name), client:clients(name)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async getTodayStats(): Promise<{ revenue: number; count: number }> {
    const today = dateFormat(new Date(), 'yyyy-MM-dd')
    const { data, error } = await supabase
      .from('sales')
      .select('total_amount, montant_paye, statut')
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`)
    if (error) throw error
    const revenue = (data || []).reduce((sum, s) => {
      if (s.statut === 'credit') return sum
      if (s.statut === 'partiel') return sum + (s.montant_paye ?? 0)
      return sum + s.total_amount
    }, 0)
    return { revenue, count: (data || []).length }
  },

  async create(payload: CreateSalePayload, userId: string): Promise<Sale> {
    const reference = generateReference('VTE')
    const businessId = getBusinessId()

    const subtotal = payload.items.reduce((sum, item) => sum + item.total_price, 0)
    const discountAmount = payload.discount?.amount ?? 0
    const totalAmount = Math.max(0, subtotal - discountAmount)

    const statut = payload.statut ?? 'paye'
    const montantPaye = statut === 'paye'
      ? totalAmount
      : statut === 'credit'
      ? 0
      : (payload.montant_paye ?? 0)
    const montantDu = totalAmount - montantPaye

    // 1. Créer la vente
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        reference,
        total_amount: totalAmount,
        discount_amount: discountAmount,
        payment_method: payload.payment_method,
        notes: payload.notes,
        client_id: payload.client_id ?? null,
        statut,
        montant_paye: montantPaye,
        created_by: userId,
        business_id: businessId,
      })
      .select()
      .single()
    if (saleError) throw saleError

    // 2. Articles
    const saleItems = payload.items.map((item) => ({
      sale_id: sale.id,
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      unit_id: item.unit_id ?? null,
      unit_name: item.unit_name ?? null,
      conversion_rate: item.conversion_rate ?? 1,
      quantity_in_base: item.quantity_in_base ?? item.quantity,
      discount_amount: item.discount_amount ?? 0,
      total_price: item.total_price,
      business_id: businessId,
    }))
    const { error: itemsError } = await supabase.from('sale_items').insert(saleItems)
    if (itemsError) throw itemsError

    // 3. Mise à jour stock — utilise quantity_in_base pour les conversions
    for (const item of payload.items) {
      const quantityToDeduct = item.quantity_in_base ?? item.quantity

      const { data: product, error: pError } = await supabase
        .from('products')
        .select('stock_current')
        .eq('id', item.product.id)
        .single()
      if (pError) throw pError

      const newStock = product.stock_current - quantityToDeduct
      if (newStock < 0) throw new Error(`Stock insuffisant pour ${item.product.name}`)

      const { error: stockError } = await supabase
        .from('products')
        .update({ stock_current: newStock })
        .eq('id', item.product.id)
      if (stockError) throw stockError

      // Mouvement de stock avec la quantité en unité de base
      const unitLabel = item.unit_name && item.unit_name !== item.product.base_unit
        ? `${item.quantity} ${item.unit_name} (${quantityToDeduct} ${item.product.base_unit || 'pcs'})`
        : `${quantityToDeduct}`

      const { error: movError } = await supabase.from('stock_movements').insert({
        product_id: item.product.id,
        type: 'sortie',
        quantity: quantityToDeduct,
        reason: `Vente ${reference} — ${unitLabel}`,
        reference,
        created_by: userId,
        business_id: businessId,
      })
      if (movError) throw movError
    }

    // 4. Journal
    if (montantPaye > 0) {
      const discountLabel = discountAmount > 0 ? ` (remise ${discountAmount} XOF)` : ''
      const { error: journalError } = await supabase.from('journal_entries').insert({
        entry_date: dateFormat(new Date(), 'yyyy-MM-dd'),
        reference,
        label: `Vente - ${payload.items.map((i) => i.product.name).join(', ')}${discountLabel}`,
        debit: montantPaye,
        credit: 0,
        source_type: 'vente',
        source_id: sale.id,
        business_id: businessId,
      })
      if (journalError) throw journalError
    }

    // 5. Crédit client
    if (payload.client_id && montantDu > 0) {
      const { data: client, error: cError } = await supabase
        .from('clients')
        .select('solde')
        .eq('id', payload.client_id)
        .single()
      if (cError) throw cError

      const { error: uError } = await supabase
        .from('clients')
        .update({ solde: client.solde + montantDu })
        .eq('id', payload.client_id)
      if (uError) throw uError

      const { error: rError } = await supabase.from('reglements_clients').insert({
        client_id: payload.client_id,
        sale_id: sale.id,
        montant: montantDu,
        payment_method: 'especes',
        notes: `Crédit vente ${reference}`,
        reglement_date: dateFormat(new Date(), 'yyyy-MM-dd'),
        created_by: userId,
        business_id: businessId,
      })
      if (rError) throw rError
    }

    return sale
  },

  async delete(id: string): Promise<void> {
    const { data: sale, error: fetchError } = await supabase
      .from('sales')
      .select('reference, statut, montant_paye, total_amount, client_id, sale_items(product_id, quantity, quantity_in_base, conversion_rate)')
      .eq('id', id)
      .single()
    if (fetchError) throw fetchError

    // Restituer le stock en unité de base
    for (const item of (sale.sale_items || [])) {
      const quantityToRestore = item.quantity_in_base ?? item.quantity

      const { data: product, error: pError } = await supabase
        .from('products')
        .select('stock_current')
        .eq('id', item.product_id)
        .single()
      if (pError) throw pError

      const { error: stockError } = await supabase
        .from('products')
        .update({ stock_current: product.stock_current + quantityToRestore })
        .eq('id', item.product_id)
      if (stockError) throw stockError
    }

    if (sale.client_id && sale.statut !== 'paye') {
      const montantDu = sale.total_amount - (sale.montant_paye ?? 0)
      const { data: client, error: cError } = await supabase
        .from('clients')
        .select('solde')
        .eq('id', sale.client_id)
        .single()
      if (!cError && client) {
        await supabase
          .from('clients')
          .update({ solde: Math.max(0, client.solde - montantDu) })
          .eq('id', sale.client_id)
      }
    }

    await supabase.from('journal_entries').delete().eq('source_type', 'vente').eq('source_id', id)
    await supabase.from('stock_movements').delete().eq('reference', sale.reference)
    await supabase.from('reglements_clients').delete().eq('sale_id', id)
    const { error } = await supabase.from('sales').delete().eq('id', id)
    if (error) throw error
  },
}
