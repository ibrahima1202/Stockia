import { supabase } from '@/lib/supabase'
import type { JournalEntry } from '@/types'
import { format } from 'date-fns'
export const journalService = {
  // Solde caisse global, recalculé par somme totale (immunisé contre l'antidatage).
  // Remplace l'ancienne version qui lisait la dernière `balance` stockée en base.
  // Placé en premier car getAll() s'appuie dessus comme point d'ancrage.
  async getCurrentBalance(): Promise<number> {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('debit, credit')
    if (error) return 0
    return (data || []).reduce((sum, e) => sum + e.debit - e.credit, 0)
  },
  async getAll(limit = 200): Promise<JournalEntry[]> {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error

    const batch = data || []

    // Ne jamais faire confiance à la colonne `balance` stockée : elle peut être
    // fausse dès qu'une écriture a été insérée après coup avec une date antérieure
    // (solde d'ouverture ajouté tardivement, correction manuelle, etc.)
    // On ancre le calcul sur le solde global réel (getCurrentBalance), puis on
    // retire la variation apportée par ce lot pour retrouver le solde d'ouverture
    // du lot — utile si `limit` exclut des écritures plus anciennes.
    const batchDelta = batch.reduce((sum, e) => sum + e.debit - e.credit, 0)
    const totalBalance = await this.getCurrentBalance()
    let running = totalBalance - batchDelta

    // Calcul en ordre chronologique (ancien → récent), puis ré-affichage
    // du plus récent au plus ancien comme avant.
    const ascending = [...batch].reverse()
    const withRecalculatedBalance = ascending.map(entry => {
      running += entry.debit - entry.credit
      return { ...entry, balance: running }
    })
    return withRecalculatedBalance.reverse()
  },
  async getByDateRange(from: string, to: string): Promise<JournalEntry[]> {
    // Solde d'ouverture : somme de toutes les écritures AVANT la période filtrée.
    // Sans ça, le solde affiché sur chaque ligne repartait de zéro au début du
    // filtre au lieu de refléter le vrai solde cumulé depuis le début de l'activité.
    const { data: priorData, error: priorError } = await supabase
      .from('journal_entries')
      .select('debit, credit')
      .lt('entry_date', from)
    if (priorError) throw priorError
    const openingBalance = (priorData || []).reduce((sum, e) => sum + e.debit - e.credit, 0)

    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .gte('entry_date', from)
      .lte('entry_date', to)
      .order('entry_date', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) throw error

    // Recalcul du solde cumulé à la volée, en ordre chronologique réel, à partir
    // du solde d'ouverture. Ne fait jamais confiance à la colonne `balance` stockée,
    // qui peut être faussée par des écritures créées après-coup avec une entry_date
    // antérieure (solde d'ouverture, dette oubliée, correction manuelle, etc.)
    let running = openingBalance
    const withRecalculatedBalance = (data || []).map(entry => {
      running += entry.debit - entry.credit
      return { ...entry, balance: running }
    })
    return withRecalculatedBalance
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
  // Modification d'une écriture manuelle uniquement.
  // Le filtre .eq('source_type', 'manuel') empêche toute modification
  // d'une écriture générée automatiquement (vente, achat, règlement...),
  // même si l'appel est déclenché par erreur avec un mauvais id.
  async updateManualEntry(
    id: string,
    updates: { entry_date: string; label: string; debit: number; credit: number }
  ): Promise<void> {
    const { error } = await supabase
      .from('journal_entries')
      .update(updates)
      .eq('id', id)
      .eq('source_type', 'manuel')
    if (error) throw error
  },
  // Suppression d'une écriture manuelle uniquement (même garde-fou que ci-dessus).
  async deleteManualEntry(id: string): Promise<void> {
    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', id)
      .eq('source_type', 'manuel')
    if (error) throw error
  },
}
