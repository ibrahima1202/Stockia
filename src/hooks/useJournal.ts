import { useState, useEffect, useCallback } from 'react'
import { journalService } from '@/services/journalService'
import type { JournalEntry } from '@/types'
import { useToast } from '@/store/toastStore'

export function useJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const toast = useToast()

  const load = useCallback(async (from?: string, to?: string) => {
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

  useEffect(() => { load() }, [load])

  return { entries, isLoading, reload: load }
}
