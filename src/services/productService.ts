import { supabase } from '@/lib/supabase'
import { getBusinessId } from '@/lib/business'
import type { Product, Category } from '@/types'

export const productService = {
  async getAll(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .order('name')
    if (error) throw error
    return data
  },

  async getActive(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('is_active', true)
      .order('name')
    if (error) throw error
    return data
  },

  async getLowStock(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('is_active', true)
    if (error) throw error
    return (data || []).filter(
      (p: Product) => p.stock_current <= p.stock_minimum
    )
  },

  async getLowStockCount(): Promise<number> {
    const { data, error } = await supabase
      .from('products')
      .select('id, stock_current, stock_minimum')
      .eq('is_active', true)
    if (error) throw error
    return (data || []).filter(
      (p) => p.stock_current <= p.stock_minimum
    ).length
  },

  async getById(id: string): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

 async create(
  product: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'category'>
): Promise<Product> {
  // Générer une référence automatique
  const { data: existing } = await supabase
    .from('products')
    .select('id')
  const count = (existing?.length ?? 0) + 1
  const reference = `PRD-${String(count).padStart(4, '0')}`

  const { data, error } = await supabase
    .from('products')
    .insert({ ...product, reference })
    .select('*, category:categories(*)')
    .single()
  if (error) throw error
  return data
},

  async update(
    id: string,
    updates: Partial<Omit<Product, 'id' | 'created_at' | 'updated_at' | 'category'>>
  ): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select('*, category:categories(*)')
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', id)
    if (error) throw error
  },

  async updateStock(id: string, newStock: number): Promise<void> {
    const { error } = await supabase
      .from('products')
      .update({ stock_current: newStock })
      .eq('id', id)
    if (error) throw error
  },

  async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name')
    if (error) throw error
    return data
  },

  async createCategory(name: string): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .insert({ name, business_id: getBusinessId() })
      .select()
      .single()
    if (error) throw error
    return data
  },
}
