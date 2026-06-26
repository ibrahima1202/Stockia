import { supabase } from '@/lib/supabase'
import type { JournalEntry } from '@/types'
import { format } from 'date-fns'

export const journalService = {
  async getAll(limit = 200): Promise<JournalEntry[]> {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data
  },

  async getByDateRange(from: string, to: string): Promise<JournalEntry[]> {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .gte('entry_date', from)
      .lte('entry_date', to)
      .order('entry_date', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) throw error
    return data
  },

  async getCurrentBalance(): Promise<number> {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('balance')
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (error) return 0
    return data?.balance ?? 0
  },

  async getTodaySummary(): Promise<{ total_debit: number; total_credit: number }> {
    const today = format(new Date(), 'yyyy-MM-dd')
    const { data, error } = await supabase
      .from('journal_entries')
      .select('debit, credit')
      .eq('entry_date', today)
    if (error) throw error
    const total_debit = (data || []).reduce((s, e) => s + e.debit, 0)
    const total_credit = (data || []).reduce((s, e) => s + e.credit, 0)
    return { total_debit, total_credit }
  },
}
