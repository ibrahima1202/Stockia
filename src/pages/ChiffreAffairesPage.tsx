import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, TrendingUp, Info } from 'lucide-react'
import { LoadingScreen } from '@/components/ui/index'
import { caService, type CAPeriodPoint } from '@/services/caService'
import { formatCurrency } from '@/lib/utils'
import { format, addMonths, subMonths, addYears, subYears } from 'date-fns'
import { fr } from 'date-fns/locale'

type FilterType = 'jour' | 'semaine' | 'mois' | 'annee'

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'jour', label: 'Jour' },
  { value: 'semaine', label: 'Semaine' },
  { value: 'mois', label: 'Mois' },
  { value: 'annee', label: 'Année' },
]

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

  // Revenir sur "aujourd'hui" quand on change de filtre pour éviter de rester
  // bloqué sur une ancienne période de navigation
  const handleFilterChange = (f: FilterType) => {
    setFilter(f)
    setAnchor(new Date())
  }

  const goPrev = () => {
    if (filter === 'jour') setAnchor((d) => subMonths(d, 1))
    else if (filter === 'semaine' || filter === 'mois') setAnchor((d) => subYears(d, 1))
  }

  const goNext = () => {
    if (filter === 'jour') setAnchor((d) => addMonths(d, 1))
    else if (filter === 'semaine' || filter === 'mois') setAnchor((d) => addYears(d, 1))
  }

  const anchorLabel = useMemo(() => {
    if (filter === 'jour') return format(anchor, 'MMMM yyyy', { locale: fr })
    if (filter === 'semaine' || filter === 'mois') return format(anchor, 'yyyy')
    return 'Historique complet'
  }, [filter, anchor])

  const total = useMemo(() => data.reduce((s, p) => s + p.revenue, 0), [data])
  const maxRevenue = useMemo(() => Math.max(1, ...data.map((p) => p.revenue)), [data])
  const showNav = filter !== 'annee'

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
            className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
              filter === f.value
                ? 'bg-emerald-600 text-white border-emerald-600'
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
          <button onClick={goPrev} className="p-2 hover:bg-muted rounded-md">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="text-sm font-semibold capitalize">{anchorLabel}</p>
          <button onClick={goNext} className="p-2 hover:bg-muted rounded-md">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {isLoading ? (
        <LoadingScreen text="Chargement du chiffre d'affaires..." />
      ) : (
        <>
          {/* Total période */}
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 text-white shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-emerald-100 uppercase tracking-wide">
                Total {!showNav ? '(tout l\'historique)' : anchorLabel}
              </p>
              <div className="bg-white/20 p-1.5 rounded-lg">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold leading-tight">{formatCurrency(total)}</p>
          </div>

          {/* Note explicative */}
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700">
              Ce chiffre représente l'argent réellement encaissé (ventes payées et règlements clients reçus),
              comme la carte « CA du jour » du tableau de bord. Les ventes à crédit non encore réglées
              n'apparaissent qu'au moment de leur paiement.
            </p>
          </div>

          {/* Historique */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b">
              <h2 className="font-semibold text-sm">Détail par {filter === 'jour' ? 'jour' : filter === 'semaine' ? 'semaine' : filter === 'mois' ? 'mois' : 'année'}</h2>
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
                      <p className="text-sm font-medium capitalize text-foreground">{point.label}</p>
                      <p className={`text-sm font-bold ${point.revenue > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                        {formatCurrency(point.revenue)}
                      </p>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${Math.max(2, (point.revenue / maxRevenue) * 100)}%` }}
                      />
                    </div>
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
