import { useState, useEffect, useCallback } from 'react'
import { fournisseurService } from '@/services/fournisseurService'
import type { Fournisseur, AchatFournisseur, ReglementFournisseur, PaymentMethod, CreateAchatPayload, Product } from '@/types'
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

  // NOUVEAU : création rapide de produit depuis achat
  const createProduct = async (
    product: { name: string; reference: string; category_id?: string; purchase_price: number; selling_price: number }
  ): Promise<Product> => {
    if (!user) throw new Error('Non authentifié')
    return await fournisseurService.createProduct(product, user.id)
  }

  // NOUVEAU : achat avec plusieurs produits
  const addAchat = async (payload: CreateAchatPayload): Promise<AchatFournisseur> => {
    if (!user) throw new Error('Non authentifié')
    const achat = await fournisseurService.addAchat(payload, user.id)
    const montantDu = achat.montant_total - achat.montant_paye
    if (montantDu > 0) {
      setFournisseurs((prev) =>
        prev.map((f) =>
          f.id === payload.fournisseur_id
            ? { ...f, solde: f.solde + montantDu }
            : f
        )
      )
    }
    toast.success('Achat enregistré', `Stock mis à jour automatiquement`)
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
    createProduct,
    addAchat,
    addReglement,
  }
}
