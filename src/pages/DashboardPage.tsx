import { useEffect, useState } from 'react'
import { TrendingUp, ShoppingCart, Wallet, RefreshCw, ArrowRight, BarChart3 } from 'lucide-react'
import { LoadingScreen, Badge } from '@/components/ui/index'
import { dashboardService } from '@/services/dashboardService'
import { productService } from '@/services/productService'
import { saleService } from '@/services/saleService'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'
import type { DashboardStats, Product, Sale } from '@/types'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [recentSales, setRecentSales] = useState<Sale[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { profile } = useAuthStore()
  const navigate = useNavigate()

  const load = async (silent = false) => {
    if (!silent) setIsLoading(true)
    else setRefreshing(true)
    try {
      const [statsData, lowStock, sales] = await Promise.all([
        dashboardService.getStats(),
        productService.getLowStock(),
        saleService.getAll(5),
      ])
      setStats(statsData)
      setLowStockProducts(lowStock.slice(0, 5))
      setRecentSales(sales)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Bonjour' : now.getHours() < 18 ? 'Bon après-midi' : 'Bonsoir'
  const firstName = profile?.full_name?.split(' ')[0] ?? ''
  const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  if (isLoading) return <LoadingScreen text="Chargement du tableau de bord..." />

  return (
    <div className="space-y-5">

      {/* Entête */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {greeting}{firstName ? `, ${firstName}` : ''} 👋
          </h1>
          <p className="text-sm text-muted-foreground capitalize mt-0.5">{dateStr}</p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="p-2 rounded-lg border bg-white hover:bg-muted transition-colors"
        >
          <RefreshCw className={`h-4 w-4 text-muted-foreground ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 2 grandes cartes principales */}
      <div className="grid grid-cols-2 gap-3">
        {/* CA du jour */}
        <button
          onClick={() => navigate('/chiffre-affaires')}
          className="col-span-1 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white shadow-sm text-left hover:from-emerald-600 hover:to-emerald-700 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-emerald-100 uppercase tracking-wide">CA du jour</p>
            <div className="bg-white/20 p-1.5 rounded-lg">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold leading-tight">
            {formatCurrency(stats?.revenue_today ?? 0)}
          </p>
          <p className="text-xs text-emerald-100 mt-1">Chiffre d'affaires</p>
        </button>

        {/* Solde caisse */}
        <div className="col-span-1 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl p-4 text-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-slate-300 uppercase tracking-wide">Solde caisse</p>
            <div className="bg-white/10 p-1.5 rounded-lg">
              <Wallet className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold leading-tight">
            {formatCurrency(stats?.cash_balance ?? 0)}
          </p>
          <p className="text-xs text-slate-400 mt-1">Solde journal</p>
        </div>
      </div>

      {/* 2 petites cartes indicateurs */}
      <div className="grid grid-cols-2 gap-3">
        {/* Ventes du jour */}
        <div
          className="bg-white rounded-xl border shadow-sm p-4 flex items-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => navigate('/sales')}
        >
          <div className="bg-blue-50 p-2.5 rounded-lg">
            <ShoppingCart className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats?.sales_count_today ?? 0}</p>
            <p className="text-xs text-muted-foreground">Ventes aujourd'hui</p>
          </div>
        </div>

        {/* Statistiques */}
        <div
          className="rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 shadow-sm p-4 flex items-center gap-3 cursor-pointer transition-colors"
          onClick={() => navigate('/stats')}
        >
          <div className="bg-orange-100 p-2.5 rounded-lg">
            <BarChart3 className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <p className="text-lg font-bold text-orange-700">
              Voir le détail
            </p>
            <p className="text-xs text-orange-600">Bénéfices et fonds de roulement</p>
          </div>
        </div>
      </div>

      {/* Dernières ventes */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold text-sm">Dernières ventes</h2>
          <button
            onClick={() => navigate('/sales')}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Voir tout <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        {recentSales.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Aucune vente aujourd'hui</p>
          </div>
        ) : (
          <div className="divide-y">
            {recentSales.map((sale) => {
              const mainItem = sale.sale_items?.[0]
              const itemCount = sale.sale_items?.length ?? 0
              return (
                <div key={sale.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {mainItem?.product?.name ?? 'Vente'}
                      {itemCount > 1 && (
                        <span className="text-xs text-muted-foreground ml-1">+{itemCount - 1} article(s)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(sale.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <p className="font-bold text-emerald-600 text-sm">
                    {formatCurrency(sale.total_amount)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Alertes stock faible */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold text-sm">Alertes stock faible</h2>
          <button
            onClick={() => navigate('/stocks')}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Gérer <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        {lowStockProducts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">✓ Tous les stocks sont suffisants</p>
          </div>
        ) : (
          <div className="divide-y">
            {lowStockProducts.map((p) => (
              <div key={p.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{p.reference}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={p.stock_current === 0 ? 'danger' : 'warning'}>
                    {p.stock_current}
                  </Badge>
                  <span className="text-xs text-muted-foreground">/ {p.stock_minimum}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
