import { useState, useEffect, useCallback } from 'react'
import { clientService } from '@/services/clientService'
import type { Client, ReglementClient, PaymentMethod } from '@/types'
import { useToast } from '@/store/toastStore'
import { useAuthStore } from '@/store/authStore'

export function useClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const toast = useToast()
  const { user } = useAuthStore()

  const load = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await clientService.getAll()
      setClients(data)
    } catch {
      toast.error('Erreur', 'Impossible de charger les clients')
    } finally {
      setIsLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const createClient = async (
    client: { name: string; phone?: string; address?: string; notes?: string }
  ) => {
    if (!user) throw new Error('Non authentifié')
    const newClient = await clientService.create(client, user.id)
    setClients((prev) => [...prev, newClient].sort((a, b) => a.name.localeCompare(b.name)))
    toast.success('Client ajouté', newClient.name)
    return newClient
  }

  const updateClient = async (
    id: string,
    updates: { name?: string; phone?: string; address?: string; notes?: string }
  ) => {
    const updated = await clientService.update(id, updates)
    setClients((prev) => prev.map((c) => (c.id === id ? updated : c)))
    toast.success('Client modifié')
    return updated
  }

  const deleteClient = async (id: string) => {
    await clientService.delete(id)
    setClients((prev) => prev.filter((c) => c.id !== id))
    toast.success('Client supprimé')
  }

  const addReglement = async (
    clientId: string,
    montant: number,
    paymentMethod: PaymentMethod,
    notes: string,
    saleId: string | null = null
  ): Promise<ReglementClient> => {
    if (!user) throw new Error('Non authentifié')
    const reglement = await clientService.addReglement(
      clientId, montant, paymentMethod, notes, saleId, user.id
    )
    // Mettre à jour le solde localement
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId
          ? { ...c, solde: Math.max(0, c.solde - montant) }
          : c
      )
    )
    toast.success('Règlement enregistré', `${montant.toLocaleString()} XOF reçu`)
    return reglement
  }

  return { clients, isLoading, reload: load, createClient, updateClient, deleteClient, addReglement }
}
