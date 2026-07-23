import { supabase } from '@/lib/supabase'
import {
  format,
  startOfWeek,
  endOfWeek,
  eachWeekOfInterval,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  eachMonthOfInterval,
  startOfYear,
  endOfYear,
} from 'date-fns'
import { fr } from 'date-fns/locale'

export interface CAPeriodPoint {
  key: string
  label: string
  start: string
  end: string
  revenue: number
}

type JournalRevenueRow = { entry_date: string; debit: number }

// CA = encaissements réels enregistrés au journal (ventes payées + règlements
// clients reçus), exactement comme la carte "CA du jour" du tableau de bord
// (voir saleService.getTodayStats). Les ventes à crédit non réglées
// n'apparaissent donc ici qu'au moment de leur règlement.
async function fetchRevenueEntries(startStr: string, endStr: string): Promise<JournalRevenueRow[]> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('entry_date, debit')
    .in('source_type', ['vente', 'reglement_client'])
    .gte('entry_date', startStr)
    .lte('entry_date', endStr)
  if (error) throw error
  return data || []
}

function sumBetween(entries: JournalRevenueRow[], startStr: string, endStr: string): number {
  return entries
    .filter((e) => e.entry_date >= startStr && e.entry_date <= endStr)
    .reduce((s, e) => s + e.debit, 0)
}

export const caService = {
  /** CA jour par jour, pour le mois contenant `monthAnchor`. Plus récent en premier. */
  async getDailyCA(monthAnchor: Date): Promise<CAPeriodPoint[]> {
    const start = startOfMonth(monthAnchor)
    const end = endOfMonth(monthAnchor)
    const startStr = format(start, 'yyyy-MM-dd')
    const endStr = format(end, 'yyyy-MM-dd')
    const entries = await fetchRevenueEntries(startStr, endStr)

    const days = eachDayOfInterval({ start, end })
    return days
      .map((day) => {
        const dayStr = format(day, 'yyyy-MM-dd')
        return {
          key: dayStr,
          label: format(day, 'EEEE dd MMMM', { locale: fr }),
          start: dayStr,
          end: dayStr,
          revenue: sumBetween(entries, dayStr, dayStr),
        }
      })
      .reverse()
  },

  /** CA semaine par semaine, pour l'année contenant `yearAnchor`. Plus récent en premier. */
  async getWeeklyCA(yearAnchor: Date): Promise<CAPeriodPoint[]> {
    const start = startOfYear(yearAnchor)
    const end = endOfYear(yearAnchor)
    const startStr = format(start, 'yyyy-MM-dd')
    const endStr = format(end, 'yyyy-MM-dd')
    const entries = await fetchRevenueEntries(startStr, endStr)

    const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 })
    return weeks
      .map((w) => {
        const wStart = startOfWeek(w, { weekStartsOn: 1 })
        const wEnd = endOfWeek(w, { weekStartsOn: 1 })
        const wStartStr = format(wStart, 'yyyy-MM-dd')
        const wEndStr = format(wEnd, 'yyyy-MM-dd')
        return {
          key: wStartStr,
          label: `${format(wStart, 'dd MMM', { locale: fr })} – ${format(wEnd, 'dd MMM', { locale: fr })}`,
          start: wStartStr,
          end: wEndStr,
          revenue: sumBetween(entries, wStartStr, wEndStr),
        }
      })
      .reverse()
  },

  /** CA mois par mois, pour l'année `yearAnchor`. Plus récent en premier. */
  async getMonthlyCA(yearAnchor: Date): Promise<CAPeriodPoint[]> {
    const start = startOfYear(yearAnchor)
    const end = endOfYear(yearAnchor)
    const startStr = format(start, 'yyyy-MM-dd')
    const endStr = format(end, 'yyyy-MM-dd')
    const entries = await fetchRevenueEntries(startStr, endStr)

    const months = eachMonthOfInterval({ start, end })
    return months
      .map((m) => {
        const mStart = startOfMonth(m)
        const mEnd = endOfMonth(m)
        const mStartStr = format(mStart, 'yyyy-MM-dd')
        const mEndStr = format(mEnd, 'yyyy-MM-dd')
        return {
          key: mStartStr,
          label: format(m, 'MMMM yyyy', { locale: fr }),
          start: mStartStr,
          end: mEndStr,
          revenue: sumBetween(entries, mStartStr, mEndStr),
        }
      })
      .reverse()
  },

  /** CA année par année, depuis la toute première écriture jusqu'à aujourd'hui. Plus récent en premier. */
  async getYearlyCA(): Promise<CAPeriodPoint[]> {
    const { data: firstEntry, error: fError } = await supabase
      .from('journal_entries')
      .select('entry_date')
      .in('source_type', ['vente', 'reglement_client'])
      .order('entry_date', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (fError) throw fError

    const currentYear = new Date().getFullYear()
    const firstYear = firstEntry ? new Date(firstEntry.entry_date).getFullYear() : currentYear

    const startStr = `${firstYear}-01-01`
    const endStr = `${currentYear}-12-31`
    const entries = await fetchRevenueEntries(startStr, endStr)

    const years: CAPeriodPoint[] = []
    for (let y = firstYear; y <= currentYear; y++) {
      const yStartStr = `${y}-01-01`
      const yEndStr = `${y}-12-31`
      years.push({
        key: String(y),
        label: String(y),
        start: yStartStr,
        end: yEndStr,
        revenue: sumBetween(entries, yStartStr, yEndStr),
      })
    }
    return years.reverse()
  },
}
