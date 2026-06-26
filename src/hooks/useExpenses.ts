import { useState, useEffect, useCallback } from 'react'
import { expenseService } from '@/services/expenseService'
import type { Expense, ExpenseCategory } from '@/types'
import { useToast } from '@/store/toastStore'
import { useAuthStore } from '@/store/authStore'

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const toast = useToast()
  const { user } = useAuthStore()

  const load = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await expenseService.getAll()
      setExpenses(data)
    } catch {
      toast.error('Erreur', 'Impossible de charger les dépenses')
    } finally {
      setIsLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const createExpense = async (data: {
    category: ExpenseCategory
    description: string
    amount: number
    expense_date: string
  }) => {
    if (!user) throw new Error('Non authentifié')
    const expense = await expenseService.create(data, user.id)
    setExpenses((prev) => [expense, ...prev])
    toast.success('Dépense enregistrée')
    return expense
  }

  const deleteExpense = async (id: string) => {
    await expenseService.delete(id)
    setExpenses((prev) => prev.filter((e) => e.id !== id))
    toast.success('Dépense supprimée')
  }

  return { expenses, isLoading, reload: load, createExpense, deleteExpense }
}
