import { useState, useEffect, useCallback } from 'react'
import { saleService } from '@/services/saleService'
import type { Sale, CreateSalePayload, PaymentMethod } from '@/types'
import { useToast } from '@/store/toastStore'
import { useAuthStore } from '@/store/authStore'

export function useSales() {
  const [sales, setSales] = useState<Sale[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const toast = useToast()
  const { user } = useAuthStore()

  const load = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await saleService.getAll()
      setSales(data)
    } catch {
      toast.error('Erreur', 'Impossible de charger les ventes')
    } finally {
      setIsLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const createSale = async (payload: CreateSalePayload) => {
    if (!user) throw new Error('Non authentifié')
    const sale = await saleService.create(payload, user.id)
    setSales((prev) => [sale, ...prev])
    toast.success('Vente enregistrée', `Référence: ${sale.reference}`)
    return sale
  }

  // NOUVEAU : annuler une vente
  const deleteSale = async (id: string) => {
    await saleService.delete(id)
    setSales((prev) => prev.filter((s) => s.id !== id))
  }

  // NOUVEAU : modifier mode de paiement et notes
  const updateSale = async (
    id: string,
    updates: { payment_method?: PaymentMethod; notes?: string }
  ) => {
    const { error } = await (await import('@/lib/supabase')).supabase
      .from('sales')
      .update(updates)
      .eq('id', id)
    if (error) throw error
    setSales((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    )
  }

  return { sales, isLoading, reload: load, createSale, deleteSale, updateSale }
}
