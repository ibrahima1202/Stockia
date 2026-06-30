import { useState, useEffect, useCallback } from 'react'
import { statsService, type PeriodStats, type FondsRoulement } from '@/services/statsService'
import { format, startOfDay, startOfWeek, startOfMonth, endOfDay } from 'date-fns'

export type StatsPeriod = 'today' | 'week' | 'month' | 'custom'

export function useStats() {
  const [period, setPeriod] = useState<StatsPeriod>('today')
  const [customStart, setCustomStart] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'))

  const [periodStats, setPeriodStats] = useState<PeriodStats | null>(null)
  const [fondsRoulement, setFondsRoulement] = useState<FondsRoulement | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const getDateRange = useCallback((): { start: string; end: string } => {
    const now = new Date()
    switch (period) {
      case 'today':
        return {
          start: format(startOfDay(now), 'yyyy-MM-dd'),
          end: format(endOfDay(now), 'yyyy-MM-dd'),
        }
      case 'week':
        return {
          start: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
          end: format(endOfDay(now), 'yyyy-MM-dd'),
        }
      case 'month':
        return {
          start: format(startOfMonth(now), 'yyyy-MM-dd'),
          end: format(endOfDay(now), 'yyyy-MM-dd'),
        }
      case 'custom':
        return { start: customStart, end: customEnd }
    }
  }, [period, customStart, customEnd])

  const load = useCallback(async () => {
    try {
      setIsLoading(true)
      const { start, end } = getDateRange()
      const [stats, fr] = await Promise.all([
        statsService.getPeriodStats(start, end),
        statsService.getFondsRoulement(),
      ])
      setPeriodStats(stats)
      setFondsRoulement(fr)
    } catch {
    } finally {
      setIsLoading(false)
    }
  }, [getDateRange])

  useEffect(() => { load() }, [load])

  return {
    period,
    setPeriod,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    periodStats,
    fondsRoulement,
    isLoading,
    reload: load,
  }
}
