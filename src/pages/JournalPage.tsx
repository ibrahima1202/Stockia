import { useState } from 'react'
import { BookOpen, FileDown, Lock } from 'lucide-react'
import {
  LoadingScreen, Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Badge, EmptyState, Card
} from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { useJournal } from '@/hooks/useJournal'
import { useSubscription } from '@/hooks/useSubscription'
import { formatCurrency, formatDate } from '@/lib/utils'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { pdfService } from '@/services/pdfService'

const sourceLabels: Record<string, { label: string; variant: 'success' | 'danger' | 'info' }> = {
  vente: { label: 'Vente', variant: 'success' },
  depense: { label: 'Dépense', variant: 'danger' },
  manuel: { label: 'Manuel', variant: 'info' },
}

export default function JournalPage() {
  const today = new Date()
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(today), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(endOfMonth(today), 'yyyy-MM-dd'))
  const { entries, isLoading, reload } = useJournal()
  const { canExportPDF, business } = useSubscription()

  const totalDebit = entries.reduce((s, e) => s + e.debit, 0)
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0)
  const lastBalance = entries.length > 0 ? entries[0].balance : 0

  const handleFilter = () => {
    reload(dateFrom, dateTo)
  }

  const handleExportPDF = () => {
    const period = `${dateFrom} au ${dateTo}`
    pdfService.exportJournal(entries, business?.name ?? 'Mon Commerce', period)
  }

  if (isLoading) return <LoadingScreen text="Chargement du journal..." />

  return (
    <div className="space-y-5">
      <div className="page-header flex-wrap gap-3">
        <div>
          <h1 className="page-title">Livre Journal</h1>
          <p className="text-sm text-muted-foreground">{entries.length} écriture(s)</p>
        </div>
        {canExportPDF ? (
          <Button onClick={handleExportPDF} disabled={entries.length === 0}>
            <FileDown className="h-4 w-4" />
            <span className="hidden sm:inline">Exporter PDF</span>
            <span className="sm:hidden">PDF</span>
          </Button>
        ) : (
          <button
            onClick={() => {}}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 text-slate-400 text-sm cursor-not-allowed"
            title="Fonctionnalité Pro"
          >
            <Lock className="h-3.5 w-3.5" /> PDF (Pro)
          </button>
        )}
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
          <Button onClick={handleFilter} variant="outline" size="sm">
            Filtrer
          </Button>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => {
                const src = entry.source_type ? sourceLabels[entry.source_type] : null
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
              </tr>
            </tfoot>
          </Table>
        )}
      </div>
    </div>
  )
}
