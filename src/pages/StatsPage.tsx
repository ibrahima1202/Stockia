import { useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, Wallet, Package, Users, Truck, RefreshCw } from 'lucide-react'
import { Card, LoadingScreen, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '@/components/ui/index'
import { useStats, type StatsPeriod } from '@/hooks/useStats'
import { formatCurrency } from '@/lib/utils'
import { BarChart3 } from 'lucide-react'

export default function StatsPage() {
  const navigate = useNavigate()
  const {
    period, setPeriod, customStart, setCustomStart, customEnd, setCustomEnd,
    periodStats, fondsRoulement, isLoading, reload
  } = useStats()

  const periodLabels: Record<StatsPeriod, string> = {
    today: "Aujourd'hui",
    week: 'Cette semaine',
    month: 'Ce mois',
    custom: 'Personnalisé',
  }

  if (isLoading) return <LoadingScreen text="Calcul des statistiques..." />

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Retour au tableau de bord
      </button>

      <div className="page-header">
        <div>
          <h1 className="page-title">Statistiques</h1>
          <p className="text-sm text-muted-foreground">Fonds de roulement et bénéfices</p>
        </div>
        <button onClick={reload} className="p-2 rounded-lg border bg-white hover:bg-muted transition-colors">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Filtres période */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {(['today', 'week', 'month', 'custom'] as StatsPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-orange-500 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="flex gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Du</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="block h-9 rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Au</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="block h-9 rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Fonds de roulement */}
      {fondsRoulement && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-purple-500" />
            <h2 className="font-semibold text-sm">Fonds de roulement</h2>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl p-4 text-white">
            <p className="text-xs text-purple-100 uppercase tracking-wide">Total disponible</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(fondsRoulement.total)}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="border rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Package className="h-3.5 w-3.5 text-blue-500" />
                <p className="text-xs text-muted-foreground">Valeur stock</p>
              </div>
              <p className="text-sm font-bold">{formatCurrency(fondsRoulement.stockValue)}</p>
            </div>
            <div className="border rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Wallet className="h-3.5 w-3.5 text-emerald-500" />
                <p className="text-xs text-muted-foreground">Solde caisse</p>
              </div>
              <p className="text-sm font-bold">{formatCurrency(fondsRoulement.cashBalance)}</p>
            </div>
            <div className="border rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Users className="h-3.5 w-3.5 text-orange-500" />
                <p className="text-xs text-muted-foreground">Créances clients</p>
              </div>
              <p className="text-sm font-bold text-orange-600">+{formatCurrency(fondsRoulement.clientsReceivables)}</p>
            </div>
            <div className="border rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Truck className="h-3.5 w-3.5 text-red-500" />
                <p className="text-xs text-muted-foreground">Dettes fournisseurs</p>
              </div>
              <p className="text-sm font-bold text-red-600">-{formatCurrency(fondsRoulement.fournisseursDebts)}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Bénéfice période */}
      {periodStats && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <h2 className="font-semibold text-sm">Bénéfice — {periodLabels[period]}</h2>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-600 font-medium">CA généré</p>
              <p className="text-lg font-bold text-blue-700">{formatCurrency(periodStats.revenue)}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-600 font-medium">Coût marchandise</p>
              <p className="text-lg font-bold text-slate-700">{formatCurrency(periodStats.cost)}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3">
              <p className="text-xs text-emerald-600 font-medium">Bénéfice net</p>
              <p className="text-lg font-bold text-emerald-700">{formatCurrency(periodStats.profit)}</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">{periodStats.salesCount} vente(s) sur la période</p>
        </Card>
      )}

      {/* Tableau par produit */}
      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-slate-500" />
          <h2 className="font-semibold text-sm">Bénéfice par produit — {periodLabels[period]}</h2>
        </div>
        {!periodStats || periodStats.productStats.length === 0 ? (
          <EmptyState icon={BarChart3} title="Aucune vente" description="Aucun produit vendu sur cette période" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead className="text-center">Qté vendue</TableHead>
                  <TableHead className="text-right">CA</TableHead>
                  <TableHead className="text-right">Coût</TableHead>
                  <TableHead className="text-right">Bénéfice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periodStats.productStats.map((p) => (
                  <TableRow key={p.product_id}>
                    <TableCell>
                      <p className="text-sm font-medium">{p.product_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{p.reference}</p>
                    </TableCell>
                    <TableCell className="text-center text-sm">{p.quantity_sold}</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(p.revenue)}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{formatCurrency(p.cost)}</TableCell>
                    <TableCell className="text-right">
                      <span className={`text-sm font-bold ${p.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {formatCurrency(p.profit)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  )
}
