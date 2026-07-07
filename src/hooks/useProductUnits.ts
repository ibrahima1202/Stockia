import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getBusinessId } from '@/lib/business'
import type { ProductUnit } from '@/types'
import { useToast } from '@/store/toastStore'

export function useProductUnits(productId: string | null) {
  const [units, setUnits] = useState<ProductUnit[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const toast = useToast()

  const load = useCallback(async () => {
    if (!productId) return
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('product_units')
        .select('*')
        .eq('product_id', productId)
        .eq('is_active', true)
        .order('conversion_rate', { ascending: true })
      if (error) throw error
      setUnits(data ?? [])
    } catch {
      toast.error('Erreur', 'Impossible de charger les unités')
    } finally {
      setIsLoading(false)
    }
  }, [productId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const createUnit = async (unit: {
    unit_name: string
    conversion_rate: number
    selling_price: number
    is_base_unit: boolean
  }): Promise<ProductUnit> => {
    const businessId = getBusinessId()
    const { data, error } = await supabase
      .from('product_units')
      .insert({
        ...unit,
        product_id: productId,
        business_id: businessId,
      })
      .select()
      .single()
    if (error) throw error
    setUnits((prev) => [...prev, data].sort((a, b) => a.conversion_rate - b.conversion_rate))
    toast.success('Unité ajoutée', unit.unit_name)
    return data
  }

  const updateUnit = async (id: string, updates: Partial<ProductUnit>): Promise<ProductUnit> => {
    const { data, error } = await supabase
      .from('product_units')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setUnits((prev) => prev.map((u) => (u.id === id ? data : u)))
    toast.success('Unité mise à jour')
    return data
  }

  const deleteUnit = async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('product_units')
      .update({ is_active: false })
      .eq('id', id)
    if (error) throw error
    setUnits((prev) => prev.filter((u) => u.id !== id))
    toast.success('Unité supprimée')
  }

  return { units, isLoading, reload: load, createUnit, updateUnit, deleteUnit }
}
