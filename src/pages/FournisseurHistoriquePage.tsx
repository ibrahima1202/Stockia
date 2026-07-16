import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ShoppingBag, Wallet, FileDown, User } from 'lucide-react'
import { LoadingScreen, Card, Badge } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { fournisseurService, type FournisseurAchatEntry } from '@/services/fournisseurService'
import { formatCurrency, formatDate } from '@/lib/utils'
import { pdfService } from '@/services/pdfService'
import { supabase } from '@/lib/supabase'
import { useSubscription } from '@/hooks/useSubscription'
import { useToast } from '@/store/toastStore'
import type { Fournisseur, PaymentMethod } from '@/types'

export default function FournisseurHistoriquePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { business } = useSubscription()

  const [fournisseur, setFournisseur] = useState<Fournisseur | null>(null)
  const [historique, setHistorique] = useState<FournisseurAchatEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Règlement
  const [reglementAchat, setReglementAchat] = useState<FournisseurAchatEntry | null>(null)
  const [reglementMontant, setReglementMontant] = useState('')
  const [reglementMethod, setReglementMethod] = useState<PaymentMethod>('especes')
  const [reglementNotes, setReglementNotes] = useState('')
  const [reglementSubmitting, setReglementSubmitting] = useState(false)

  const load = async () => {
    if (!id) return
    setIsLoading(true)
    try {
      const [f, h] = await Promise.all([
        fournisseurService.getById(id),
        fournisseurService.getHistorique(id),
      ])
      setFournisseur(f)
      setHistorique(h)
    } catch {
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleExportAchat = (achat: FournisseurAchatEntry) => {
    pdfService.exportAchatReceipt(
      {
        ...achat,
        fournisseur: fournisseur ? { name: fournisseur.name, phone: fournisseur.phone } : null,
      },
      business?.name ?? 'Mon Commerce'
    )
  }

  const handleReglement = async () => {
    if (!reglementAchat || !reglementMontant || parseFloat(reglementMontant) <= 0) return
    setReglementSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const montant = parseFloat(reglementMontant)

      await fournisseurService.addReglement(
        id!,
        montant,
        reglementMethod,
        reglementNotes || `Règlement achat ${reglementAchat.reference}`,
        user?.id ?? ''
      )

      // Mettre à jour le statut de l'achat si entièrement payé
      const montantRestant = reglementAchat.montant_total - reglementAchat.montant_paye - montant
      const nouveauStatut = montantRestant <= 0 ? 'comptant' : 'partiel'
      const nouveauMontantPaye = reglementAchat.montant_paye + montant

      await supabase
        .from('achats_fournisseurs')
        .update({
          statut: nouveauStatut,
          montant_paye: nouveauMontantPaye,
        })
        .eq('id', reglementAchat.id)

      toast.success('Règlement enregistré', `${formatCurrency(montant)} XOF payé`)
      setReglementAchat(null)
      setReglementMontant('')
      setReglementNotes('')
      setFournisseur((prev) => prev ? { ...prev, solde: Math.max(0, prev.solde - montant) } : prev)
      await load()
    } catch {
      toast.error('Erreur', 'Impossible d\'enregistrer le règlement')
    } finally {
      setReglementSubmitting(false)
    }
  }

  const getStatutBadge = (statut: string) => {
    if (statut === 'comptant') return <Badge variant="success">Payé</Badge>
    if (statut === 'credit') return <Badge variant="danger">À crédit</Badge>
    return <Badge variant="warning">Partiel</Badge>
  }

  if (isLoading) return <LoadingScreen text="Chargement de l'historique..." />

  if (!fournisseur) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Fournisseur introuvable</p>
        <button onClick={() => navigate('/fournisseurs')} className="text-orange-500 text-sm mt-2 hover:underline">
          Retour aux fournisseurs
        </button>
      </div>
    )
  }

  const totalAchats = historique.reduce((s, a) => s + a.montant_total, 0)
  const totalPaye = historique.reduce((s, a) => s + a.montant_paye, 0)
  const totalDu = totalAchats - totalPaye

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/fournisseurs')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Retour aux fournisseurs
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
            <User className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <h1 className="page-title">{fournisseur.name}</h1>
            {fournisseur.phone && (
              <p className="text-sm text-muted-foreground">{fournisseur.phone}</p>
            )}
          </div>
        </div>
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Total achats</p>
          <p className="text-sm font-bold mt-0.5">{formatCurrency(totalAchats)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Total payé</p>
          <p className="text-sm font-bold text-emerald-500 mt-0.5">{formatCurrency(totalPaye)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Reste dû</p>
          <p className="text-sm font-bold text-red-500 mt-0.5">{formatCurrency(fournisseur.solde)}</p>
        </Card>
      </div>

      {/* Historique */}
      <div>
        <h2 className="font-semibold text-sm text-slate-700 mb-3">
          Historique des achats ({historique.length})
        </h2>

        {historique.length === 0 ? (
          <Card className="p-8 text-center">
            <ShoppingBag className="h-10 w-10 mx-auto text-muted-foreground opacity-30 mb-2" />
            <p className="text-muted-foreground text-sm">Aucun achat enregistré</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {historique.map((achat) => {
              const montantRestant = achat.montant_total - achat.montant_paye
              return (
                <div key={achat.id} className="bg-white rounded-lg border shadow-sm p-4 space-y-3">
                  {/* Header achat */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-mono text-xs text-muted-foreground">{achat.reference}</p>
                        {getStatutBadge(achat.statut)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDate(achat.date)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Bouton règlement si dette */}
                      {achat.statut !== 'comptant' && (
                        <button
                          onClick={() => {
                            setReglementAchat(achat)
                            setReglementMontant(montantRestant.toString())
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-semibold hover:bg-emerald-100 transition-colors"
                        >
                          <Wallet className="h-3 w-3" /> Payer
                        </button>
                      )}
                      {/* Bouton PDF */}
                      <button
                        onClick={() => handleExportAchat(achat)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-50 text-orange-500 text-xs font-semibold hover:bg-orange-100 transition-colors"
                        title="Exporter la facture PDF"
                      >
                        <FileDown className="h-3 w-3" /> PDF
                      </button>
                    </div>
                  </div>

                  {/* Articles */}
                  {(achat.achat_items || []).length > 0 && (
                    <div className="border rounded-md divide-y">
                      {(achat.achat_items || []).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between px-3 py-2 text-xs">
                          <div>
                            <p className="font-medium text-slate-800">{item.product?.name ?? '—'}</p>
                            {item.unit_name && (item.conversion_rate ?? 1) > 1 && (
                              <p className="text-muted-foreground">
                                {item.quantity} {item.unit_name} = {item.quantity_in_base} {item.product?.base_unit || 'pcs'}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(item.total_price)}</p>
                            <p className="text-muted-foreground">{formatCurrency(item.unit_price)}/u</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Total */}
                  <div className="flex items-center justify-between pt-1 border-t">
                    <div className="text-xs text-muted-foreground">
                      {achat.statut === 'partiel' && (
                        <p className="text-red-500 font-medium">Reste dû : {formatCurrency(montantRestant)}</p>
                      )}
                      {achat.statut === 'credit' && (
                        <p className="text-red-500 font-medium">Non payé</p>
                      )}
                    </div>
                    <p className="font-bold text-orange-500">{formatCurrency(achat.montant_total)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal règlement */}
      {reglementAchat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <Wallet className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Payer le fournisseur</h2>
                <p className="text-xs text-muted-foreground font-mono">{reglementAchat.reference}</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-md px-3 py-2 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total facture</span>
                <span className="font-medium">{formatCurrency(reglementAchat.montant_total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Déjà payé</span>
                <span className="font-medium text-emerald-600">{formatCurrency(reglementAchat.montant_paye)}</span>
              </div>
              <div className="flex justify-between border-t pt-1">
                <span className="font-semibold text-red-500">Reste dû</span>
                <span className="font-bold text-red-500">{formatCurrency(reglementAchat.montant_total - reglementAchat.montant_paye)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Montant payé (XOF) *</label>
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
                setReglementAchat(null)
                setReglementMontant('')
                setReglementNotes('')
              }}>
                Annuler
              </Button>
              <Button
                className="flex-1"
                onClick={handleReglement}
                isLoading={reglementSubmitting}
                disabled={!reglementMontant || parseFloat(reglementMontant) <= 0}
              >
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
