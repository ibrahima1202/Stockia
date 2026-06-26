import { useEffect, useState } from 'react'
import { TrendingUp, ShoppingCart, AlertTriangle, Wallet, RefreshCw } from 'lucide-react'
import { StatCard, LoadingScreen, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { dashboardService } from '@/services/dashboardService'
import { productService } from '@/services/productService'
import { saleService } from '@/services/saleService'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { DashboardStats, Product, Sale } from '@/types'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [recentSales, setRecentSales] = useState<Sale[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const load = async () => {
    setIsLoading(true)
    try {
      const [statsData, lowStock, sales] = await Promise.all([
        dashboardService.getStats(),
        productService.getLowStock(),
        saleService.getAll(5),
      ])
      setStats(statsData)
      setLowStockProducts(lowStock.slice(0, 8))
      setRecentSales(sales)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (isLoading) return <LoadingScreen text="Chargement du tableau de bord..." />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </Button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="CA du jour"
          value={formatCurrency(stats?.revenue_today ?? 0)}
          subtitle="Chiffre d'affaires"
          icon={TrendingUp}
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Ventes du jour"
          value={stats?.sales_count_today ?? 0}
          subtitle="Transactions"
          icon={ShoppingCart}
          iconColor="text-blue-600"
        />
        <StatCard
          title="Ruptures de stock"
          value={stats?.low_stock_count ?? 0}
          subtitle="Produits à réapprovisionner"
          icon={AlertTriangle}
          iconColor="text-orange-500"
          alert={(stats?.low_stock_count ?? 0) > 0}
        />
        <StatCard
          title="Solde de caisse"
          value={formatCurrency(stats?.cash_balance ?? 0)}
          subtitle="Solde journal"
          icon={Wallet}
          iconColor="text-purple-600"
        />
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent sales */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-sm">Dernières ventes</h2>
            <a href="/sales" className="text-xs text-primary hover:underline">Voir tout</a>
          </div>
          <div className="overflow-hidden">
            {recentSales.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune vente aujourd'hui</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Référence</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Heure</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-mono text-xs">{sale.reference}</TableCell>
                      <TableCell className="font-semibold text-emerald-600">
                        {formatCurrency(sale.total_amount)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(sale.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        {/* Low stock */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-sm">Alertes stock faible</h2>
            <a href="/stocks" className="text-xs text-primary hover:underline">Gérer</a>
          </div>
          <div className="overflow-hidden">
            {lowStockProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">✓ Tous les stocks sont suffisants</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Min</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockProducts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{p.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{p.reference}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={p.stock_current === 0 ? 'danger' : 'warning'}>
                          {p.stock_current}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {p.stock_minimum}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
