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

    // Recalcul du solde cumulé à la volée, en ordre chronologique réel.
    // Ne fait jamais confiance à la colonne `balance` stockée, qui peut être
    // faussée par des écritures créées après-coup avec une entry_date antérieure
    // (solde d'ouverture, dette oubliée, correction manuelle, etc.)
    let running = 0
    const withRecalculatedBalance = (data || []).map(entry => {
      running += entry.debit - entry.credit
      return { ...entry, balance: running }
    })
    return withRecalculatedBalance
  },

  // Solde caisse global, recalculé par somme totale (immunisé contre l'antidatage).
  // Remplace l'ancienne version qui lisait la dernière `balance` stockée en base.
  async getCurrentBalance(): Promise<number> {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('debit, credit')
    if (error) return 0
    return (data || []).reduce((sum, e) => sum + e.debit - e.credit, 0)
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
