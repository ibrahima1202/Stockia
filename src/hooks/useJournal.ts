import { useState, useEffect, useCallback, useRef } from 'react'
import { journalService } from '@/services/journalService'
import type { JournalEntry } from '@/types'
import { useToast } from '@/store/toastStore'

export function useJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const toast = useToast()

  // Mémorise les derniers filtres de date utilisés, pour pouvoir
  // recharger avec les mêmes filtres après une modification/suppression.
  const lastParams = useRef<{ from?: string; to?: string }>({})

  const load = useCallback(async (from?: string, to?: string) => {
    lastParams.current = { from, to }
    try {
      setIsLoading(true)
      const data = from && to
        ? await journalService.getByDateRange(from, to)
        : await journalService.getAll()
      setEntries(data)
    } catch {
      toast.error('Erreur', 'Impossible de charger le journal')
    } finally {
      setIsLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const reloadWithLastParams = useCallback(() => {
    const { from, to } = lastParams.current
    return load(from, to)
  }, [load])

  const updateEntry = useCallback(async (
    id: string,
    updates: { entry_date: string; label: string; debit: number; credit: number }
  ) => {
    try {
      await journalService.updateManualEntry(id, updates)
      toast.success('Modifié', 'Écriture mise à jour')
      await reloadWithLastParams()
      return true
    } catch {
      toast.error('Erreur', "Impossible de modifier l'écriture")
      return false
    }
  }, [reloadWithLastParams]) // eslint-disable-line react-hooks/exhaustive-deps

  const deleteEntry = useCallback(async (id: string) => {
    try {
      await journalService.deleteManualEntry(id)
      toast.success('Supprimé', 'Écriture supprimée')
      await reloadWithLastParams()
      return true
    } catch {
      toast.error('Erreur', "Impossible de supprimer l'écriture")
      return false
    }
  }, [reloadWithLastParams]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  return { entries, isLoading, reload: load, updateEntry, deleteEntry }
}
