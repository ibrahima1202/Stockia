import { supabase } from '@/lib/supabase'
import type { StockMovement, StockMovementType } from '@/types'
import { generateReference } from '@/lib/utils'

export const stockService = {
  async getMovements(limit = 100): Promise<StockMovement[]> {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*, product:products(name, reference), profile:profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data
  },

  async getMovementsByProduct(productId: string): Promise<StockMovement[]> {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*, product:products(name, reference), profile:profiles(full_name)')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async addMovement(
    productId: string,
    type: StockMovementType,
    quantity: number,
    reason?: string,
    reference?: string,
    userId?: string
  ): Promise<StockMovement> {
    const ref = reference || generateReference(type === 'entree' ? 'ENT' : 'SOR')

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('stock_current')
      .eq('id', productId)
      .single()
    if (productError) throw productError

    if (type === 'sortie' && product.stock_current < quantity) {
      throw new Error(`Stock insuffisant. Stock actuel: ${product.stock_current}`)
    }

    const { data: movement, error: movError } = await supabase
      .from('stock_movements')
      .insert({
        product_id: productId,
        type,
        quantity,
        reason,
        reference: ref,
        created_by: userId ?? null,
      })
      .select('*, product:products(name, reference)')
      .single()
    if (movError) throw movError

    const newStock =
      type === 'entree'
        ? product.stock_current + quantity
        : product.stock_current - quantity

    const { error: updateError } = await supabase
      .from('products')
      .update({ stock_current: newStock })
      .eq('id', productId)
    if (updateError) throw updateError

    return movement
  },
}
