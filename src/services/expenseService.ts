import { supabase } from '@/lib/supabase'
import type { Expense, ExpenseCategory } from '@/types'
import { generateReference } from '@/lib/utils'
import { format } from 'date-fns'

export const expenseService = {
  async getAll(): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*, profile:profiles(full_name)')
      .order('expense_date', { ascending: false })
    if (error) throw error
    return data
  },

  async create(
    expense: {
      category: ExpenseCategory
      description: string
      amount: number
      expense_date: string
    },
    userId: string
  ): Promise<Expense> {
    const { data, error } = await supabase
      .from('expenses')
      .insert({ ...expense, created_by: userId })
      .select()
      .single()
    if (error) throw error

    // Add journal entry automatically
    const reference = generateReference('DEP')
    await supabase.from('journal_entries').insert({
      entry_date: expense.expense_date,
      reference,
      label: `Dépense ${expense.category} - ${expense.description}`,
      debit: 0,
      credit: expense.amount,
      source_type: 'depense',
      source_id: data.id,
    })

    return data
  },

  async update(
    id: string,
    updates: Partial<{
      category: ExpenseCategory
      description: string
      amount: number
      expense_date: string
    }>
  ): Promise<Expense> {
    const { data, error } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) throw error
  },

  async getTotalToday(): Promise<number> {
    const today = format(new Date(), 'yyyy-MM-dd')
    const { data, error } = await supabase
      .from('expenses')
      .select('amount')
      .eq('expense_date', today)
    if (error) throw error
    return (data || []).reduce((sum, e) => sum + e.amount, 0)
  },
}
