import { useState, useEffect, useCallback } from 'react'
import { stockService } from '@/services/stockService'
import type { StockMovement, StockMovementType } from '@/types'
import { useToast } from '@/store/toastStore'
import { useAuthStore } from '@/store/authStore'

export function useStocks() {
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const toast = useToast()
  const { user } = useAuthStore()

  const load = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await stockService.getMovements()
      setMovements(data)
    } catch {
      toast.error('Erreur', 'Impossible de charger les mouvements de stock')
    } finally {
      setIsLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const addMovement = async (
    productId: string,
    type: StockMovementType,
    quantity: number,
    reason?: string
  ) => {
    const movement = await stockService.addMovement(productId, type, quantity, reason, undefined, user?.id)
    setMovements((prev) => [movement, ...prev])
    toast.success(
      type === 'entree' ? 'Entrée de stock enregistrée' : 'Sortie de stock enregistrée'
    )
    return movement
  }

  return { movements, isLoading, reload: load, addMovement }
}
