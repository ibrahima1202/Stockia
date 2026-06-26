import { useState, useEffect, useCallback } from 'react'
import { saleService } from '@/services/saleService'
import type { Sale, CreateSalePayload } from '@/types'
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

  return { sales, isLoading, reload: load, createSale }
}
