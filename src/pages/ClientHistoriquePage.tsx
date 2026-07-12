import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ShoppingCart, Wallet, Banknote, User, Plus } from 'lucide-react'
import { LoadingScreen, Card, Badge } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { clientService, type ClientHistoriqueEntry } from '@/services/clientService'
import { formatCurrency, formatDate } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { getBusinessId } from '@/lib/business'
import { generateReference } from '@/lib/utils'
import { format } from 'date-fns'
import { useToast } from '@/store/toastStore'
import type { Client, PaymentMethod } from '@/types'

const typeConfig = {
  vente: {
    label: 'Vente à crédit',
    icon: ShoppingCart,
    color: 'text-red-500',
    bg: 'bg-red-50',
    badge: 'danger' as const,
  },
  reglement: {
    label: 'Règlement',
    icon: Wallet,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
    badge: 'success' as const,
  },
  pret: {
    label: 'Prêt espèces',
    icon: Banknote,
    color: 'text-purple-500',
    bg: 'bg-purple-50',
    badge: 'info' as const,
  },
}

export default function ClientHistoriquePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const [client, setClient] = useState<Client | null>(null)
  const [historique, setHistorique] = useState<ClientHistoriqueEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Règlement
  const [showReglement, setShowReglement] = useState(false)
  const [reglementMontant, setReglementMontant] = useState('')
  const [reglementMethod, setReglementMethod] = useState<PaymentMethod>('especes')
  const [reglementNotes, setReglementNotes] = useState('')
  const [reglementSubmitting, setReglementSubmitting] = useState(false)

  // Prêt
  const [showPret, setShowPret] = useState(false)
  const [pretMontant, setPretMontant] = useState('')
  const [pretNotes, setPretNotes] = useState('')
  const [pretSubmitting, setPretSubmitting] = useState(false)

  const load = async () => {
    if (!id) return
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

  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleReglement = async () => {
    if (!client || !reglementMontant || parseFloat(reglementMontant) <= 0) return
    setReglementSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await clientService.addReglement(
        client.id,
        parseFloat(reglementMontant),
        reglementMethod,
        reglementNotes,
        null,
        user?.id ?? ''
      )
      toast.success('Règlement enregistré', `${formatCurrency(parseFloat(reglementMontant))} XOF reçu`)
      setShowReglement(false)
      setReglementMontant('')
      setReglementNotes('')
      await load()
    } catch {
      toast.error('Erreur', 'Impossible d\'enregistrer le règlement')
    } finally {
      setReglementSubmitting(false)
    }
  }

  const handlePret = async () => {
    if (!client || !pretMontant || parseFloat(pretMontant) <= 0) return
    setPretSubmitting(true)
    try {
      const businessId = getBusinessId()
      const montant = parseFloat(pretMontant)
      const reference = generateReference('PRE')
      const today = format(new Date(), 'yyyy-MM-dd')

      // 1. Augmenter le solde du client
      const { error: clientError } = await supabase
        .from('clients')
        .update({ solde: client.solde + montant })
        .eq('id', client.id)
      if (clientError) throw clientError

      // 2. Journal — sortie caisse
      const { error: journalError } = await supabase
        .from('journal_entries')
        .insert({
          entry_date: today,
          reference,
          label: `Prêt espèces — ${client.name}${pretNotes ? ` (${pretNotes})` : ''}`,
          debit: 0,
          credit: montant,
          source_type: 'manuel',
          business_id: businessId,
        })
      if (journalError) throw journalError

      // 3. Enregistrer dans reglements_clients avec montant négatif
      const { error: rError } = await supabase
        .from('reglements_clients')
        .insert({
          client_id: client.id,
          montant: -montant,
          payment_method: 'especes',
          notes: `Prêt espèces — ${reference}${pretNotes ? ` — ${pretNotes}` : ''}`,
          reglement_date: today,
          business_id: businessId,
        })
      if (rError) throw rError

       toast.success('Prêt enregistré', `${formatCurrency(montant)} XOF prêté à ${client.name}`)
          setPretMontant('')
          setPretNotes('')
          setShowPret(false)
          await load()
          } catch {
      toast.error('Erreur', 'Impossible d\'enregistrer le prêt')
    } finally {
      setPretSubmitting(false)
    }
  }

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

        <div className="flex items-center justify-between">
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

          {/* Boutons actions */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowPret(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-50 text-purple-600 text-xs font-semibold hover:bg-purple-100 transition-colors"
            >
              <Banknote className="h-3.5 w-3.5" /> Prêt
            </button>
            <button
              onClick={() => setShowReglement(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-semibold hover:bg-emerald-100 transition-colors"
            >
              <Wallet className="h-3.5 w-3.5" /> Règlement
            </button>
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
            <div className="flex gap-2 justify-center mt-4">
              <button
                onClick={() => setShowPret(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-50 text-purple-600 text-xs font-semibold"
              >
                <Plus className="h-3.5 w-3.5" /> Prêt espèces
              </button>
            </div>
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
                        <Badge variant={config.badge}>{config.label}</Badge>
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

      {/* Modal règlement */}
      {showReglement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <Wallet className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Règlement client</h2>
                <p className="text-xs text-muted-foreground">
                  {client.name} — Solde dû : <span className="text-red-500 font-semibold">{formatCurrency(client.solde)}</span>
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Montant reçu (XOF) *</label>
                <input
                  type="number"
                  value={reglementMontant}
                  onChange={(e) => setReglementMontant(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="0"
                  autoFocus
                />
              </div>
              <Select
                label="Mode de paiement"
                value={reglementMethod}
                onChange={(e) => setReglementMethod(e.target.value as PaymentMethod)}
                options={[
                  { value: 'especes', label: 'Espèces' },
                  { value: 'mobile_money', label: 'Mobile Money' },
                  { value: 'carte', label: 'Carte bancaire' },
                ]}
              />
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={reglementNotes}
                  onChange={(e) => setReglementNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => {
                setShowReglement(false)
                setReglementMontant('')
                setReglementNotes('')
              }}>
                Annuler
              </Button>
              <Button
                className="flex-1"
                onClick={handleReglement}
                isLoading={reglementSubmitting}
                disabled={!reglementMontant}
              >
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal prêt */}
      {showPret && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Banknote className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Prêt espèces</h2>
                <p className="text-xs text-muted-foreground">{client.name}</p>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-md px-3 py-2">
              <p className="text-xs text-purple-700">
                💡 Le montant prêté sera déduit de votre caisse et ajouté au solde dû du client.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Montant prêté (XOF) *</label>
                <input
                  type="number"
                  value={pretMontant}
                  onChange={(e) => setPretMontant(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="0"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={pretNotes}
                  onChange={(e) => setPretNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Motif du prêt..."
                />
              </div>

              {pretMontant && parseFloat(pretMontant) > 0 && (
                <div className="bg-slate-50 rounded-md px-3 py-2 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Solde actuel</span>
                    <span className="font-medium text-red-500">{formatCurrency(client.solde)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Après prêt</span>
                    <span className="font-medium text-red-500">{formatCurrency(client.solde + parseFloat(pretMontant))}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => {
                setShowPret(false)
                setPretMontant('')
                setPretNotes('')
              }}>
                Annuler
              </Button>
              <Button
                className="flex-1 bg-purple-500 hover:bg-purple-600"
                onClick={handlePret}
                isLoading={pretSubmitting}
                disabled={!pretMontant || parseFloat(pretMontant) <= 0}
              >
                <Banknote className="h-4 w-4" /> Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
