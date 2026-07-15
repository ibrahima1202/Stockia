import { useState } from 'react'
import { BookOpen, FileDown, Lock, Plus, Pencil, Trash2 } from 'lucide-react'
import {
  LoadingScreen, Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Badge, EmptyState, Card
} from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { useJournal } from '@/hooks/useJournal'
import { useSubscription } from '@/hooks/useSubscription'
import { useRole } from '@/hooks/useRole'
import { formatCurrency, formatDate } from '@/lib/utils'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { pdfService } from '@/services/pdfService'
import { supabase } from '@/lib/supabase'
import { getBusinessId } from '@/lib/business'
import { generateReference } from '@/lib/utils'
import type { JournalEntry } from '@/types'

const sourceLabels: Record<string, { label: string; variant: 'success' | 'danger' | 'info' }> = {
  vente: { label: 'Vente', variant: 'success' },
  depense: { label: 'Dépense', variant: 'danger' },
  manuel: { label: 'Manuel', variant: 'info' },
  reglement_client: { label: 'Règlement', variant: 'success' },
  achat_fournisseur: { label: 'Achat', variant: 'danger' },
  reglement_fournisseur: { label: 'Fournisseur', variant: 'danger' },
}

export default function JournalPage() {
  const today = new Date()
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(today), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(endOfMonth(today), 'yyyy-MM-dd'))
  const { entries, isLoading, reload, updateEntry, deleteEntry } = useJournal()
  const { canExportPDF, business } = useSubscription()
  const { canViewJournal, canExportPDFRole } = useRole()

  // Modal entrée manuelle (création ET édition)
  const [showManual, setShowManual] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [manualLabel, setManualLabel] = useState('')
  const [manualAmount, setManualAmount] = useState('')
  const [manualType, setManualType] = useState<'debit' | 'credit'>('debit')
  const [manualDate, setManualDate] = useState(format(today, 'yyyy-MM-dd'))
  const [manualSubmitting, setManualSubmitting] = useState(false)

  // Modal de confirmation de suppression
  const [deletingEntry, setDeletingEntry] = useState<JournalEntry | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  const totalDebit = entries.reduce((s, e) => s + e.debit, 0)
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0)
  const lastBalance = entries.length > 0 ? entries[0].balance : 0

  const handleFilter = () => reload(dateFrom, dateTo)

  const handleExportPDF = () => {
    const period = `${dateFrom} au ${dateTo}`
    pdfService.exportJournal(entries, business?.name ?? 'Mon Commerce', period)
  }

  const resetManualForm = () => {
    setShowManual(false)
    setEditingId(null)
    setManualLabel('')
    setManualAmount('')
    setManualType('debit')
    setManualDate(format(today, 'yyyy-MM-dd'))
  }

  const openCreateModal = () => {
    setEditingId(null)
    setManualLabel('')
    setManualAmount('')
    setManualType('debit')
    setManualDate(format(today, 'yyyy-MM-dd'))
    setShowManual(true)
  }

  const openEditModal = (entry: JournalEntry) => {
    setEditingId(entry.id)
    setManualLabel(entry.label)
    setManualAmount(String(entry.debit > 0 ? entry.debit : entry.credit))
    setManualType(entry.debit > 0 ? 'debit' : 'credit')
    setManualDate(entry.entry_date)
    setShowManual(true)
  }

  const handleManualEntry = async () => {
    if (!manualLabel.trim() || !manualAmount || parseFloat(manualAmount) <= 0) return
    setManualSubmitting(true)
    try {
      const amount = parseFloat(manualAmount)

      if (editingId) {
        // Édition d'une écriture manuelle existante
        const success = await updateEntry(editingId, {
          entry_date: manualDate,
          label: manualLabel.trim(),
          debit: manualType === 'debit' ? amount : 0,
          credit: manualType === 'credit' ? amount : 0,
        })
        if (success) resetManualForm()
      } else {
        // Création d'une nouvelle écriture manuelle
        const reference = generateReference('MAN')
        const businessId = getBusinessId()

        await supabase.from('journal_entries').insert({
          entry_date: manualDate,
          reference,
          label: manualLabel.trim(),
          debit: manualType === 'debit' ? amount : 0,
          credit: manualType === 'credit' ? amount : 0,
          source_type: 'manuel',
          business_id: businessId,
        })

        resetManualForm()
        reload(dateFrom, dateTo)
      }
    } catch {
    } finally {
      setManualSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingEntry) return
    setDeleteSubmitting(true)
    try {
      const success = await deleteEntry(deletingEntry.id)
      if (success) setDeletingEntry(null)
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const canExport = canExportPDF && canExportPDFRole

  if (isLoading) return <LoadingScreen text="Chargement du journal..." />

  if (!canViewJournal) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
          <Lock className="h-10 w-10 text-red-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Accès non autorisé</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Vous n'avez pas les permissions pour accéder au journal comptable.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="page-header flex-wrap gap-3">
        <div>
          <h1 className="page-title">Livre Journal</h1>
          <p className="text-sm text-muted-foreground">{entries.length} écriture(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openCreateModal} variant="outline">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Entrée manuelle</span>
          </Button>
          {canExport ? (
            <Button onClick={handleExportPDF} disabled={entries.length === 0}>
              <FileDown className="h-4 w-4" />
              <span className="hidden sm:inline">Exporter PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>
          ) : (
            <button
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 text-slate-400 text-sm cursor-not-allowed"
              title="Fonctionnalité Pro"
            >
              <Lock className="h-3.5 w-3.5" /> PDF (Pro)
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card className="p-3 sm:p-4 min-w-0">
          <p className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Entrées</p>
          <p className="text-sm sm:text-xl font-bold text-emerald-600 mt-1 leading-snug">{formatCurrency(totalDebit)}</p>
        </Card>
        <Card className="p-3 sm:p-4 min-w-0">
          <p className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Sorties</p>
          <p className="text-sm sm:text-xl font-bold text-red-500 mt-1 leading-snug">{formatCurrency(totalCredit)}</p>
        </Card>
        <Card className="p-3 sm:p-4 min-w-0">
          <p className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Solde actuel</p>
          <p className={`text-sm sm:text-xl font-bold mt-1 leading-snug ${lastBalance >= 0 ? 'text-foreground' : 'text-red-600'}`}>
            {formatCurrency(lastBalance)}
          </p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Du</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Au</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <Button onClick={handleFilter} variant="outline" size="sm">Filtrer</Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDateFrom(format(startOfMonth(today), 'yyyy-MM-dd'))
              setDateTo(format(endOfMonth(today), 'yyyy-MM-dd'))
              reload()
            }}
          >
            Ce mois
          </Button>
        </div>
      </Card>

      {/* Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        {entries.length === 0 ? (
          <EmptyState icon={BookOpen} title="Aucune écriture" description="Les ventes et dépenses apparaîtront automatiquement ici" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Référence</TableHead>
                <TableHead>Libellé</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right text-emerald-600">Entrée (Débit)</TableHead>
                <TableHead className="text-right text-red-500">Sortie (Crédit)</TableHead>
                <TableHead className="text-right">Solde</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => {
                const src = entry.source_type ? sourceLabels[entry.source_type] : null
                const isManual = entry.source_type === 'manuel'
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(entry.entry_date)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{entry.reference}</TableCell>
                    <TableCell className="text-sm max-w-xs truncate">{entry.label}</TableCell>
                    <TableCell>
                      {src ? (
                        <Badge variant={src.variant}>{src.label}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-emerald-600 font-medium">
                      {entry.debit > 0 ? formatCurrency(entry.debit) : '—'}
                    </TableCell>
                    <TableCell className="text-right text-red-500 font-medium">
                      {entry.credit > 0 ? formatCurrency(entry.credit) : '—'}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${entry.balance < 0 ? 'text-red-600' : ''}`}>
                      {formatCurrency(entry.balance)}
                    </TableCell>
                    <TableCell className="text-right">
                      {isManual ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(entry)}
                            className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Modifier"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingEntry(entry)}
                            className="p-1.5 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
            <tfoot>
              <tr className="bg-muted/50 font-semibold text-sm border-t-2">
                <td colSpan={4} className="px-3 py-2.5 text-right text-muted-foreground">Totaux période</td>
                <td className="px-3 py-2.5 text-right text-emerald-600">{formatCurrency(totalDebit)}</td>
                <td className="px-3 py-2.5 text-right text-red-500">{formatCurrency(totalCredit)}</td>
                <td className="px-3 py-2.5 text-right">{formatCurrency(totalDebit - totalCredit)}</td>
                <td></td>
              </tr>
            </tfoot>
          </Table>
        )}
      </div>

      {/* Modal entrée manuelle (création / édition) */}
      {showManual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-semibold text-lg">
              {editingId ? "Modifier l'écriture" : 'Entrée manuelle'}
            </h2>
            {!editingId && (
              <p className="text-sm text-muted-foreground">
                Utilisez cette option pour enregistrer un solde d'ouverture, une recette ou une sortie hors vente.
              </p>
            )}

            <div className="space-y-3">
              {/* Type */}
              <div>
                <label className="block text-sm font-medium mb-1">Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setManualType('debit')}
                    className={`py-2.5 rounded-lg text-sm font-semibold border-2 transition-colors ${
                      manualType === 'debit'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    ↑ Entrée caisse
                  </button>
                  <button
                    onClick={() => setManualType('credit')}
                    className={`py-2.5 rounded-lg text-sm font-semibold border-2 transition-colors ${
                      manualType === 'credit'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    ↓ Sortie caisse
                  </button>
                </div>
              </div>

              {/* Libellé */}
              <div>
                <label className="block text-sm font-medium mb-1">Libellé *</label>
                <input
                  type="text"
                  value={manualLabel}
                  onChange={(e) => setManualLabel(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Ex: Solde d'ouverture, Recette marché..."
                  autoFocus
                />
              </div>

              {/* Montant */}
              <div>
                <label className="block text-sm font-medium mb-1">Montant (XOF) *</label>
                <input
                  type="number"
                  min="1"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="0"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium mb-1">Date *</label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              {/* Résumé */}
              {manualAmount && parseFloat(manualAmount) > 0 && (
                <div className={`rounded-md px-3 py-2 text-sm font-medium ${
                  manualType === 'debit'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-red-50 text-red-700'
                }`}>
                  {manualType === 'debit' ? '↑ Entrée' : '↓ Sortie'} de{' '}
                  <strong>{formatCurrency(parseFloat(manualAmount))} XOF</strong>
                  {manualLabel ? ` — ${manualLabel}` : ''}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={resetManualForm}>
                Annuler
              </Button>
              <Button
                className="flex-1"
                onClick={handleManualEntry}
                isLoading={manualSubmitting}
                disabled={!manualLabel.trim() || !manualAmount || parseFloat(manualAmount) <= 0}
              >
                {editingId ? 'Enregistrer' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {deletingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="font-semibold text-lg">Supprimer cette écriture ?</h2>
            <p className="text-sm text-muted-foreground">
              Cette action est irréversible. L'écriture <strong>{deletingEntry.label}</strong> du{' '}
              {formatDate(deletingEntry.entry_date)} pour un montant de{' '}
              <strong>
                {formatCurrency(deletingEntry.debit > 0 ? deletingEntry.debit : deletingEntry.credit)}
              </strong>{' '}
              sera définitivement supprimée.
            </p>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDeletingEntry(null)}
                disabled={deleteSubmitting}
              >
                Annuler
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleConfirmDelete}
                isLoading={deleteSubmitting}
              >
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
