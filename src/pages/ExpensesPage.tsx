import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Receipt, Lock } from 'lucide-react'
import {
  LoadingScreen, Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Badge, Modal, EmptyState, Card
} from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useExpenses } from '@/hooks/useExpenses'
import { useRole } from '@/hooks/useRole'
import { formatCurrency, formatDate, formatExpenseCategory } from '@/lib/utils'
import type { ExpenseCategory } from '@/types'
import { format } from 'date-fns'

const expenseSchema = z.object({
  category: z.enum(['transport', 'loyer', 'divers']),
  description: z.string().min(2, 'Description requise'),
  amount: z.coerce.number().min(1, 'Montant invalide'),
  expense_date: z.string().min(1, 'Date requise'),
})
type ExpenseForm = z.infer<typeof expenseSchema>

const categoryVariants: Record<ExpenseCategory, 'info' | 'warning' | 'default'> = {
  transport: 'info',
  loyer: 'warning',
  divers: 'default',
}

export default function ExpensesPage() {
  const { expenses, isLoading, createExpense, deleteExpense } = useExpenses()
  const { canManageExpenses } = useRole()
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string>('')

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { expense_date: format(new Date(), 'yyyy-MM-dd') },
  })

  const filtered = useMemo(
    () => (!filterCategory ? expenses : expenses.filter((e) => e.category === filterCategory)),
    [expenses, filterCategory]
  )

  const totalAmount = filtered.reduce((sum, e) => sum + e.amount, 0)

  const onSubmit = async (data: ExpenseForm) => {
    setSubmitting(true)
    try {
      await createExpense(data)
      setModalOpen(false)
      reset()
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading) return <LoadingScreen text="Chargement des dépenses..." />

  // Blocage par rôle
  if (!canManageExpenses) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
          <Lock className="h-10 w-10 text-red-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Accès non autorisé</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Vous n'avez pas les permissions pour accéder aux dépenses.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dépenses</h1>
          <p className="text-sm text-muted-foreground">{expenses.length} dépense(s)</p>
        </div>
        <Button onClick={() => { reset({ expense_date: format(new Date(), 'yyyy-MM-dd') }); setModalOpen(true) }}>
          <Plus className="h-4 w-4" /> Nouvelle dépense
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {(['transport', 'loyer', 'divers'] as ExpenseCategory[]).map((cat) => {
          const total = expenses
            .filter((e) => e.category === cat)
            .reduce((s, e) => s + e.amount, 0)
          return (
            <Card key={cat} className="p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {formatExpenseCategory(cat)}
              </p>
              <p className="text-xl font-bold mt-1">{formatCurrency(total)}</p>
            </Card>
          )
        })}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-3">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Toutes les catégories</option>
            <option value="transport">Transport</option>
            <option value="loyer">Loyer</option>
            <option value="divers">Divers</option>
          </select>
          <div className="ml-auto text-sm font-medium flex items-center gap-1.5">
            Total filtré :
            <span className="font-bold text-foreground">{formatCurrency(totalAmount)}</span>
          </div>
        </div>
      </Card>

      {/* Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={Receipt} title="Aucune dépense" description="Enregistrez vos dépenses ici" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(expense.expense_date)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={categoryVariants[expense.category]}>
                      {formatExpenseCategory(expense.category)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{expense.description}</TableCell>
                  <TableCell className="text-right font-semibold text-red-600">
                    {formatCurrency(expense.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      onClick={() => setDeleteConfirm(expense.id)}
                      className="p-1.5 rounded hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle dépense" size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select
            label="Catégorie"
            required
            error={errors.category?.message}
            options={[
              { value: 'transport', label: 'Transport' },
              { value: 'loyer', label: 'Loyer' },
              { value: 'divers', label: 'Divers' },
            ]}
            placeholder="Sélectionner..."
            {...register('category')}
          />
          <Input label="Description" required placeholder="Ex: Carburant livraison..." error={errors.description?.message} {...register('description')} />
          <Input label="Montant (XOF)" type="number" min="1" required error={errors.amount?.message} {...register('amount')} />
          <Input label="Date" type="date" required error={errors.expense_date?.message} {...register('expense_date')} />
          <div className="flex gap-2 pt-2">
            <Button type="submit" isLoading={submitting} className="flex-1">Enregistrer</Button>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Supprimer la dépense" size="sm">
        <p className="text-sm text-muted-foreground mb-4">
          Voulez-vous vraiment supprimer cette dépense ?
        </p>
        <div className="flex gap-2">
          <Button
            variant="destructive"
            className="flex-1"
            onClick={async () => {
              if (deleteConfirm) {
                await deleteExpense(deleteConfirm)
                setDeleteConfirm(null)
              }
            }}
          >
            Supprimer
          </Button>
          <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Annuler</Button>
        </div>
      </Modal>
    </div>
  )
}
