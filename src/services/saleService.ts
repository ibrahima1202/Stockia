import { supabase } from '@/lib/supabase'
import type { Sale, CreateSalePayload } from '@/types'
import { generateReference } from '@/lib/utils'
import { format as dateFormat } from 'date-fns'

export const saleService = {
  async getAll(limit = 100): Promise<Sale[]> {
    const { data, error } = await supabase
      .from('sales')
      .select('*, sale_items(*, product:products(name, reference)), profile:profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data
  },

  async getById(id: string): Promise<Sale> {
    const { data, error } = await supabase
      .from('sales')
      .select('*, sale_items(*, product:products(name, reference, selling_price)), profile:profiles(full_name)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async getTodayStats(): Promise<{ revenue: number; count: number }> {
    const today = dateFormat(new Date(), 'yyyy-MM-dd')
    const { data, error } = await supabase
      .from('sales')
      .select('total_amount')
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`)
    if (error) throw error
    const revenue = (data || []).reduce((sum, s) => sum + s.total_amount, 0)
    return { revenue, count: (data || []).length }
  },

  async create(payload: CreateSalePayload, userId: string): Promise<Sale> {
    const reference = generateReference('VTE')
    const totalAmount = payload.items.reduce((sum, item) => sum + item.total_price, 0)

    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        reference,
        total_amount: totalAmount,
        payment_method: payload.payment_method,
        notes: payload.notes,
        created_by: userId,
      })
      .select()
      .single()
    if (saleError) throw saleError

    const saleItems = payload.items.map((item) => ({
      sale_id: sale.id,
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
    }))

    const { error: itemsError } = await supabase.from('sale_items').insert(saleItems)
    if (itemsError) throw itemsError

    for (const item of payload.items) {
      const { data: product, error: pError } = await supabase
        .from('products')
        .select('stock_current')
        .eq('id', item.product.id)
        .single()
      if (pError) throw pError

      const newStock = product.stock_current - item.quantity
      if (newStock < 0) throw new Error(`Stock insuffisant pour ${item.product.name}`)

      const { error: stockError } = await supabase
        .from('products')
        .update({ stock_current: newStock })
        .eq('id', item.product.id)
      if (stockError) throw stockError

      await supabase.from('stock_movements').insert({
        product_id: item.product.id,
        type: 'sortie',
        quantity: item.quantity,
        reason: `Vente ${reference}`,
        reference,
        created_by: userId,
      })
    }

    await supabase.from('journal_entries').insert({
      entry_date: dateFormat(new Date(), 'yyyy-MM-dd'),
      reference,
      label: `Vente - ${payload.items.map((i) => i.product.name).join(', ')}`,
      debit: totalAmount,
      credit: 0,
      source_type: 'vente',
      source_id: sale.id,
    })

    return sale
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('sales').delete().eq('id', id)
    if (error) throw error
  },
}
