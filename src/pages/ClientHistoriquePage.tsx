import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ShoppingCart, Wallet, Banknote, User, Plus, Pencil, Trash2 } from 'lucide-react'
import { LoadingScreen, Card, Badge } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { clientService, type ClientHistoriqueEntry } from '@/services/clientService'
import { formatCurrency, formatDate } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
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
  const [pretClient, setPretClient] = useState<Client | null>(null)
  const [pretMontant, setPretMontant] = useState('')
  const [pretNotes, setPretNotes] = useState('')
  const [pretSubmitting, setPretSubmitting] = useState(false)

  // Modification d'une opération existante (règlement ou prêt)
  const [editEntry, setEditEntry] = useState<ClientHistoriqueEntry | null>(null)
  const [editMontant, setEditMontant] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)

  // Suppression
  const [deleteEntry, setDeleteEntry] = useState<ClientHistoriqueEntry | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  const loadHistorique = async () => {
    if (!id) return
    const h = await clientService.getHistorique(id)
    setHistorique(h)
  }

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
      const montant = parseFloat(reglementMontant)
      await clientService.addReglement(
        client.id,
        montant,
        reglementMethod,
        reglementNotes,
        null,
        user?.id ?? ''
      )
      setShowReglement(false)
      setReglementMontant('')
      setReglementNotes('')
      toast.success('Règlement enregistré', `${formatCurrency(montant)} XOF reçu`)
      load()
    } catch {
      toast.error('Erreur', 'Impossible d\'enregistrer le règlement')
    } finally {
      setReglementSubmitting(false)
    }
  }

  const handlePret = async () => {
    if (!pretClient || !pretMontant || parseFloat(pretMontant) <= 0) return
    setPretSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const montant = parseFloat(pretMontant)
      await clientService.addPret(
        pretClient.id,
        pretClient.name,
        montant,
        pretNotes,
        user?.id ?? ''
      )
      setPretClient(null)
      setPretMontant('')
      setPretNotes('')
      toast.success('Prêt enregistré', `${formatCurrency(montant)} XOF prêté à ${pretClient.name}`)
      load()
    } catch {
      toast.error('Erreur', 'Impossible d\'enregistrer le prêt')
    } finally {
      setPretSubmitting(false)
    }
  }

  const openEdit = (entry: ClientHistoriqueEntry) => {
    setEditEntry(entry)
    setEditMontant(String(entry.montant))
    setEditNotes(entry.notes ?? '')
  }

  const handleUpdate = async () => {
    if (!editEntry || !client || !editMontant || parseFloat(editMontant) <= 0) return
    if (editEntry.type === 'vente') return
    setEditSubmitting(true)
    try {
      await clientService.updateOperation(
        editEntry.id,
        editEntry.type,
        client.id,
        client.name,
        parseFloat(editMontant),
        editNotes
      )
      setEditEntry(null)
      setEditMontant('')
      setEditNotes('')
      toast.success('Opération mise à jour')
      load()
    } catch {
      toast.error('Erreur', 'Impossible de mettre à jour l\'opération')
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteEntry || !client) return
    if (deleteEntry.type === 'vente') return
    setDeleteSubmitting(true)
    try {
      await clientService.deleteOperation(deleteEntry.id, deleteEntry.type, client.id)
      setDeleteEntry(null)
      toast.success('Opération supprimée')
      load()
    } catch {
      toast.error('Erreur', 'Impossible de supprimer l\'opération')
    } finally {
      setDeleteSubmitting(false)
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

          <div className="flex gap-2">
            <button
              onClick={() => setPretClient(client)}
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
                onClick={() => setPretClient(client)}
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
              const editable = entry.type !== 'vente'
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
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
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

                      {editable ? (
                        <div className="flex gap-3 mt-2">
                          <button
                            onClick={() => openEdit(entry)}
                            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors"
                          >
                            <Pencil className="h-3 w-3" /> Modifier
                          </button>
                          <button
                            onClick={() => setDeleteEntry(entry)}
                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" /> Supprimer
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => navigate('/ventes')}
                          className="text-xs text-orange-500 hover:underline mt-2"
                        >
                          Gérer depuis la page Ventes
                        </button>
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
      {pretClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Banknote className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Prêt espèces</h2>
                <p className="text-xs text-muted-foreground">{pretClient.name}</p>
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
                    <span className="font-medium text-red-500">{formatCurrency(pretClient.solde)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Après prêt</span>
                    <span className="font-medium text-red-500">{formatCurrency(pretClient.solde + parseFloat(pretMontant))}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => {
                setPretClient(null)
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
                <Banknote className="h-4 w-4" /> Enregistrer le prêt
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal modification */}
      {editEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                <Pencil className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">
                  Modifier {editEntry.type === 'reglement' ? 'le règlement' : 'le prêt'}
                </h2>
                <p className="text-xs text-muted-foreground">{client.name}</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              <p className="text-xs text-amber-700">
                ⚠️ Modifier le montant recalcule automatiquement le solde du client et l'écriture correspondante dans le Journal.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Montant (XOF) *</label>
                <input
                  type="number"
                  value={editMontant}
                  onChange={(e) => setEditMontant(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => {
                setEditEntry(null)
                setEditMontant('')
                setEditNotes('')
              }}>
                Annuler
              </Button>
              <Button
                className="flex-1"
                onClick={handleUpdate}
                isLoading={editSubmitting}
                disabled={!editMontant || parseFloat(editMontant) <= 0}
              >
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal suppression */}
      {deleteEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Supprimer cette opération ?</h2>
                <p className="text-xs text-muted-foreground">{deleteEntry.label}</p>
              </div>
            </div>

            <p className="text-sm text-slate-600">
              Cette action est irréversible. Le solde du client et le Journal seront automatiquement mis à jour.
            </p>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteEntry(null)}>
                Annuler
              </Button>
              <Button
                className="flex-1 bg-red-500 hover:bg-red-600"
                onClick={handleDelete}
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
