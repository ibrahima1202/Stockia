import { useState, useEffect, useCallback } from 'react'
import { fournisseurService } from '@/services/fournisseurService'
import type { Fournisseur, AchatFournisseur, ReglementFournisseur, PaymentMethod } from '@/types'
import { useToast } from '@/store/toastStore'
import { useAuthStore } from '@/store/authStore'

export function useFournisseurs() {
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const toast = useToast()
  const { user } = useAuthStore()

  const load = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await fournisseurService.getAll()
      setFournisseurs(data)
    } catch {
      toast.error('Erreur', 'Impossible de charger les fournisseurs')
    } finally {
      setIsLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const createFournisseur = async (
    fournisseur: { name: string; phone?: string; address?: string; notes?: string }
  ) => {
    if (!user) throw new Error('Non authentifié')
    const newFourn = await fournisseurService.create(fournisseur, user.id)
    setFournisseurs((prev) => [...prev, newFourn].sort((a, b) => a.name.localeCompare(b.name)))
    toast.success('Fournisseur ajouté', newFourn.name)
    return newFourn
  }

  const updateFournisseur = async (
    id: string,
    updates: { name?: string; phone?: string; address?: string; notes?: string }
  ) => {
    const updated = await fournisseurService.update(id, updates)
    setFournisseurs((prev) => prev.map((f) => (f.id === id ? updated : f)))
    toast.success('Fournisseur modifié')
    return updated
  }

  const deleteFournisseur = async (id: string) => {
    await fournisseurService.delete(id)
    setFournisseurs((prev) => prev.filter((f) => f.id !== id))
    toast.success('Fournisseur supprimé')
  }

  const addAchat = async (
    fournisseurId: string,
    montantTotal: number,
    notes: string
  ): Promise<AchatFournisseur> => {
    if (!user) throw new Error('Non authentifié')
    const achat = await fournisseurService.addAchat(
      fournisseurId, montantTotal, notes, user.id
    )
    setFournisseurs((prev) =>
      prev.map((f) =>
        f.id === fournisseurId
          ? { ...f, solde: f.solde + montantTotal }
          : f
      )
    )
    toast.success('Achat enregistré', `${montantTotal.toLocaleString()} XOF`)
    return achat
  }

  const addReglement = async (
    fournisseurId: string,
    montant: number,
    paymentMethod: PaymentMethod,
    notes: string
  ): Promise<ReglementFournisseur> => {
    if (!user) throw new Error('Non authentifié')
    const reglement = await fournisseurService.addReglement(
      fournisseurId, montant, paymentMethod, notes, user.id
    )
    setFournisseurs((prev) =>
      prev.map((f) =>
        f.id === fournisseurId
          ? { ...f, solde: Math.max(0, f.solde - montant) }
          : f
      )
    )
    toast.success('Règlement envoyé', `${montant.toLocaleString()} XOF payé`)
    return reglement
  }

  return {
    fournisseurs,
    isLoading,
    reload: load,
    createFournisseur,
    updateFournisseur,
    deleteFournisseur,
    addAchat,
    addReglement,
  }
}
