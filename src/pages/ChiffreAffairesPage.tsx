import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, TrendingUp, Info, Sparkles, BarChart2 } from 'lucide-react'
import { LoadingScreen } from '@/components/ui/index'
import { caService, type CAPeriodPoint } from '@/services/caService'
import { formatCurrency } from '@/lib/utils'
import { format, addMonths, subMonths, addYears, subYears, isSameMonth, isSameYear } from 'date-fns'
import { fr } from 'date-fns/locale'

type FilterType = 'jour' | 'semaine' | 'mois' | 'annee'

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'jour', label: 'Jour' },
  { value: 'semaine', label: 'Semaine' },
  { value: 'mois', label: 'Mois' },
  { value: 'annee', label: 'Année' },
]

const UNIT_LABEL: Record<FilterType, string> = {
  jour: 'jour',
  semaine: 'semaine',
  mois: 'mois',
  annee: 'année',
}

export default function ChiffreAffairesPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<FilterType>('jour')
  const [anchor, setAnchor] = useState(new Date())
  const [data, setData] = useState<CAPeriodPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const load = async () => {
    setIsLoading(true)
    try {
      let points: CAPeriodPoint[] = []
      if (filter === 'jour') points = await caService.getDailyCA(anchor)
      else if (filter === 'semaine') points = await caService.getWeeklyCA(anchor)
      else if (filter === 'mois') points = await caService.getMonthlyCA(anchor)
      else points = await caService.getYearlyCA()
      setData(points)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [filter, anchor])

  const handleFilterChange = (f: FilterType) => {
    setFilter(f)
    setAnchor(new Date())
  }

  const showNav = filter !== 'annee'
  const isAtCurrentPeriod = filter === 'jour'
    ? isSameMonth(anchor, new Date())
    : filter === 'semaine' || filter === 'mois'
    ? isSameYear(anchor, new Date())
    : true

  const goPrev = () => {
    if (filter === 'jour') setAnchor((d) => subMonths(d, 1))
    else if (filter === 'semaine' || filter === 'mois') setAnchor((d) => subYears(d, 1))
  }

  const goNext = () => {
    if (isAtCurrentPeriod) return
    if (filter === 'jour') setAnchor((d) => addMonths(d, 1))
    else if (filter === 'semaine' || filter === 'mois') setAnchor((d) => addYears(d, 1))
  }

  const anchorLabel = useMemo(() => {
    if (filter === 'jour') return format(anchor, 'MMMM yyyy', { locale: fr })
    if (filter === 'semaine' || filter === 'mois') return format(anchor, 'yyyy')
    return 'Historique complet'
  }, [filter, anchor])

  const total = useMemo(() => data.reduce((s, p) => s + p.revenue, 0), [data])
  const average = data.length > 0 ? total / data.length : 0
  const best = useMemo(
    () => (data.length > 0 ? data.reduce((a, b) => (b.revenue > a.revenue ? b : a)) : null),
    [data]
  )
  const maxRevenue = Math.max(1, ...data.map((p) => p.revenue))

  return (
    <div className="space-y-5">
      {/* Entête */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-lg border bg-white hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Chiffre d'Affaires</h1>
          <p className="text-sm text-muted-foreground">Historique de vos encaissements</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="grid grid-cols-4 gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => handleFilterChange(f.value)}
            className={`py-2 rounded-lg text-sm font-semibold border transition-all ${
              filter === f.value
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-200'
                : 'bg-white text-muted-foreground border-input hover:bg-muted/50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Navigation période */}
      {showNav && (
        <div className="flex items-center justify-between bg-white rounded-lg border px-2 py-1.5">
          <button onClick={goPrev} className="p-2 hover:bg-muted rounded-md transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="text-sm font-semibold capitalize">{anchorLabel}</p>
          <button
            onClick={goNext}
            disabled={isAtCurrentPeriod}
            className="p-2 hover:bg-muted rounded-md transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {isLoading ? (
        <LoadingScreen text="Chargement du chiffre d'affaires..." />
      ) : (
        <>
          {/* Total période — carte principale */}
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 rounded-2xl p-5 text-white shadow-lg shadow-emerald-200/50">
            <div className="absolute -right-6 -top-6 opacity-10">
              <TrendingUp className="h-32 w-32" />
            </div>
            <div className="relative flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">
                {showNav ? `Total — ${anchorLabel}` : 'Total sur tout l\'historique'}
              </p>
              <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
            </div>
            <p className="relative text-3xl font-bold leading-tight tracking-tight">{formatCurrency(total)}</p>
          </div>

          {/* Cartes stats secondaires */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border shadow-sm p-3.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <BarChart2 className="h-3.5 w-3.5 text-blue-500" />
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Moyenne / {UNIT_LABEL[filter]}
                </p>
              </div>
              <p className="text-lg font-bold text-foreground">{formatCurrency(Math.round(average))}</p>
            </div>
            <div className="bg-white rounded-xl border shadow-sm p-3.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Meilleur{filter === 'jour' ? '' : filter === 'annee' ? 'e année' : ''}
                </p>
              </div>
              {best && best.revenue > 0 ? (
                <>
                  <p className="text-lg font-bold text-emerald-600">{formatCurrency(best.revenue)}</p>
                  <p className="text-[11px] text-muted-foreground truncate capitalize mt-0.5">{best.label}</p>
                </>
              ) : (
                <p className="text-lg font-bold text-muted-foreground">—</p>
              )}
            </div>
          </div>

          {/* Note explicative */}
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3.5 py-3">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700 leading-relaxed">
              Ce chiffre représente l'argent réellement encaissé (ventes payées et règlements clients reçus),
              comme la carte « CA du jour » du tableau de bord. Les ventes à crédit non encore réglées
              n'apparaissent qu'au moment de leur paiement.
            </p>
          </div>

          {/* Historique */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b bg-slate-50/50">
              <h2 className="font-semibold text-sm text-slate-700">
                Détail par {UNIT_LABEL[filter]}
              </h2>
            </div>
            {data.length === 0 || total === 0 ? (
              <div className="text-center py-10">
                <TrendingUp className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Aucun encaissement sur cette période</p>
              </div>
            ) : (
              <div className="divide-y">
                {data.map((point) => (
                  <div key={point.key} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-sm font-medium capitalize text-foreground truncate">{point.label}</p>
                        {point.isCurrent && (
                          <span className="flex-shrink-0 text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                            En cours
                          </span>
                        )}
                      </div>
                      <p className={`flex-shrink-0 text-sm font-bold ml-2 ${point.revenue > 0 ? 'text-emerald-600' : 'text-muted-foreground/60'}`}>
                        {formatCurrency(point.revenue)}
                      </p>
                    </div>
                    {point.revenue > 0 && (
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all"
                          style={{ width: `${Math.max(4, (point.revenue / maxRevenue) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
