import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ShoppingCart, Wallet, Banknote, User } from 'lucide-react'
import { LoadingScreen, Card, Badge } from '@/components/ui/index'
import { clientService, type ClientHistoriqueEntry } from '@/services/clientService'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Client } from '@/types'

const typeConfig = {
  vente: {
    label: 'Vente à crédit',
    icon: ShoppingCart,
    color: 'text-red-500',
    bg: 'bg-red-50',
    badge: 'danger' as const,
    sign: '+',
  },
  reglement: {
    label: 'Règlement',
    icon: Wallet,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
    badge: 'success' as const,
    sign: '-',
  },
  pret: {
    label: 'Prêt espèces',
    icon: Banknote,
    color: 'text-purple-500',
    bg: 'bg-purple-50',
    badge: 'info' as const,
    sign: '+',
  },
}

export default function ClientHistoriquePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [client, setClient] = useState<Client | null>(null)
  const [historique, setHistorique] = useState<ClientHistoriqueEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      setIsLoading(true)
      try {
        const [c, h] = await Promise.all([
          clientService.getById(id),
          clientService.getHistorique(id),
        ])
        setClient(c)
        setHistorique(h)
      } catch {
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id])

  if (isLoading) return <LoadingScreen text="Chargement de l'historique..." />

  if (!client) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Client introuvable</p>
        <button onClick={() => navigate('/clients')} className="text-orange-500 text-sm mt-2 hover:underline">
          Retour aux clients
        </button>
      </div>
    )
  }

  const totalVentes = historique.filter((e) => e.type === 'vente').reduce((s, e) => s + e.montant, 0)
  const totalReglements = historique.filter((e) => e.type === 'reglement').reduce((s, e) => s + e.montant, 0)
  const totalPrets = historique.filter((e) => e.type === 'pret').reduce((s, e) => s + e.montant, 0)

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/clients')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Retour aux clients
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
            <User className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <h1 className="page-title">{client.name}</h1>
            {client.phone && (
              <p className="text-sm text-muted-foreground">{client.phone}</p>
            )}
          </div>
        </div>
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Solde actuel dû</p>
            <Badge variant={client.solde > 0 ? 'danger' : 'success'}>
              {client.solde > 0 ? formatCurrency(client.solde) : 'À jour'}
            </Badge>
          </div>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Total crédits</p>
          <p className="text-lg font-bold text-red-500 mt-0.5">{formatCurrency(totalVentes + totalPrets)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Total réglé</p>
          <p className="text-lg font-bold text-emerald-500 mt-0.5">{formatCurrency(totalReglements)}</p>
        </Card>
      </div>

      {/* Historique */}
      <div>
        <h2 className="font-semibold text-sm text-slate-700 mb-3">
          Historique ({historique.length} opération(s))
        </h2>

        {historique.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground text-sm">Aucune opération enregistrée</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {historique.map((entry) => {
              const config = typeConfig[entry.type]
              const Icon = config.icon
              return (
                <div key={entry.id} className="bg-white rounded-lg border shadow-sm p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-full ${config.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`h-4 w-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {entry.label}
                        </p>
                        <p className={`text-sm font-bold shrink-0 ${
                          entry.type === 'reglement' ? 'text-emerald-600' : 'text-red-500'
                        }`}>
                          {entry.type === 'reglement' ? '-' : '+'}{formatCurrency(entry.montant)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={config.badge} >{config.label}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(entry.date)}
                        </span>
                        {entry.reference && (
                          <span className="text-xs font-mono text-muted-foreground">
                            {entry.reference}
                          </span>
                        )}
                      </div>
                      {entry.notes && entry.notes !== entry.label && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
