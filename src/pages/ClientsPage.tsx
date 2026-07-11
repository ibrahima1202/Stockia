import { useState } from 'react'
import { Plus, Phone, MapPin, Wallet, XCircle, Pencil, Lock, Crown, Banknote } from 'lucide-react'
import {
  LoadingScreen, Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Badge, EmptyState, Card
} from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { useClients } from '@/hooks/useClients'
import { useSubscription } from '@/hooks/useSubscription'
import { useRole } from '@/hooks/useRole'
import { formatCurrency } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { getBusinessId } from '@/lib/business'
import { generateReference } from '@/lib/utils'
import { format } from 'date-fns'
import type { Client, PaymentMethod } from '@/types'

export default function ClientsPage() {
  const { clients, isLoading, createClient, updateClient, deleteClient, addReglement, reload } = useClients()
  const { canAccessClientsAndFournisseurs, isLoading: subLoading } = useSubscription()
  const { canViewClients, canManageClients } = useRole()
  const navigate = useNavigate()

  const [showForm, setShowForm] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [formData, setFormData] = useState({ name: '', phone: '', address: '', notes: '' })
  const [formSubmitting, setFormSubmitting] = useState(false)

  // Règlement
  const [reglementClient, setReglementClient] = useState<Client | null>(null)
  const [reglementMontant, setReglementMontant] = useState('')
  const [reglementMethod, setReglementMethod] = useState<PaymentMethod>('especes')
  const [reglementNotes, setReglementNotes] = useState('')
  const [reglementSubmitting, setReglementSubmitting] = useState(false)

  // Prêt espèces
  const [pretClient, setPretClient] = useState<Client | null>(null)
  const [pretMontant, setPretMontant] = useState('')
  const [pretNotes, setPretNotes] = useState('')
  const [pretSubmitting, setPretSubmitting] = useState(false)

  const openCreate = () => {
    setEditingClient(null)
    setFormData({ name: '', phone: '', address: '', notes: '' })
    setShowForm(true)
  }

  const openEdit = (client: Client) => {
    setEditingClient(client)
    setFormData({
      name: client.name,
      phone: client.phone ?? '',
      address: client.address ?? '',
      notes: client.notes ?? '',
    })
    setShowForm(true)
  }

  const handleSubmitForm = async () => {
    if (!formData.name.trim()) return
    setFormSubmitting(true)
    try {
      if (editingClient) {
        await updateClient(editingClient.id, formData)
      } else {
        await createClient(formData)
      }
      setShowForm(false)
    } catch {
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer ce client ?')) return
    await deleteClient(id)
  }

  const handleReglement = async () => {
    if (!reglementClient || !reglementMontant) return
    setReglementSubmitting(true)
    try {
      await addReglement(
        reglementClient.id,
        parseFloat(reglementMontant),
        reglementMethod,
        reglementNotes
      )
      setReglementClient(null)
      setReglementMontant('')
      setReglementNotes('')
    } catch {
    } finally {
      setReglementSubmitting(false)
    }
  }

  const handlePret = async () => {
    if (!pretClient || !pretMontant || parseFloat(pretMontant) <= 0) return
    setPretSubmitting(true)
    try {
      const businessId = getBusinessId()
      const montant = parseFloat(pretMontant)
      const reference = generateReference('PRE')
      const today = format(new Date(), 'yyyy-MM-dd')

      // 1. Augmenter le solde du client
      const { error: clientError } = await supabase
        .from('clients')
        .update({ solde: pretClient.solde + montant })
        .eq('id', pretClient.id)
      if (clientError) throw clientError

      // 2. Entrée dans le journal — sortie de caisse
      const { error: journalError } = await supabase
        .from('journal_entries')
        .insert({
          entry_date: today,
          reference,
          label: `Prêt espèces — ${pretClient.name}${pretNotes ? ` (${pretNotes})` : ''}`,
          debit: 0,
          credit: montant,
          source_type: 'manuel',
          business_id: businessId,
        })
      if (journalError) throw journalError

      // 3. Enregistrer dans reglements_clients comme prêt
      const { error: rError } = await supabase
        .from('reglements_clients')
        .insert({
          client_id: pretClient.id,
          montant: -montant, // négatif = prêt
          payment_method: 'especes',
          notes: `Prêt espèces — ${reference}${pretNotes ? ` — ${pretNotes}` : ''}`,
          reglement_date: today,
          business_id: businessId,
        })
      if (rError) throw rError

      setPretClient(null)
      setPretMontant('')
      setPretNotes('')
      reload()
    } catch {
    } finally {
      setPretSubmitting(false)
    }
  }

  const totalCredit = clients.reduce((sum, c) => sum + c.solde, 0)

  if (isLoading || subLoading) return <LoadingScreen text="Chargement des clients..." />

  if (!canAccessClientsAndFournisseurs) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col items-center justify-center py-16 space-y-5 text-center">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center">
            <Lock className="h-10 w-10 text-orange-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Fonctionnalité Business</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
              La gestion des clients et crédits est disponible à partir du plan Business.
            </p>
          </div>
          <Card className="p-5 w-full max-w-sm text-left space-y-3">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-orange-500" />
              <p className="font-semibold text-sm">Plan Business — 7 500 XOF/mois</p>
            </div>
            <ul className="space-y-1.5">
              {[
                'Tout le plan Starter',
                'Gestion des clients',
                'Ventes à crédit',
                'Règlements clients',
                'Gestion des fournisseurs',
                '3 utilisateurs',
                'Produits illimités',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="text-emerald-500">✓</span> {f}
                </li>
              ))}
            </ul>
            <Button className="w-full" onClick={() => navigate('/subscription')}>
              Passer au plan Business
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  if (!canViewClients) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
          <Lock className="h-10 w-10 text-red-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Accès non autorisé</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Vous n'avez pas les permissions pour accéder aux clients.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="text-sm text-muted-foreground">{clients.length} client(s)</p>
        </div>
        {canManageClients && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nouveau client
          </Button>
        )}
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total clients</p>
          <p className="text-2xl font-bold mt-1">{clients.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total crédits dus</p>
          <p className="text-2xl font-bold text-red-500 mt-1">{formatCurrency(totalCredit)}</p>
        </Card>
      </div>

      {/* Liste */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        {clients.length === 0 ? (
          <EmptyState icon={Wallet} title="Aucun client" description="Ajoutez vos clients ici" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Solde dû</TableHead>
                {canManageClients && <TableHead></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <p className="font-medium text-sm">{client.name}</p>
                    {client.address && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />{client.address}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    {client.phone ? (
                      <p className="text-sm flex items-center gap-1">
                        <Phone className="h-3 w-3" />{client.phone}
                      </p>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {client.solde > 0 ? (
                      <Badge variant="danger">{formatCurrency(client.solde)}</Badge>
                    ) : (
                      <Badge variant="success">À jour</Badge>
                    )}
                  </TableCell>
                  {canManageClients && (
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        {/* Bouton prêt espèces */}
                        <button
                          onClick={() => setPretClient(client)}
                          className="p-1.5 hover:bg-purple-50 rounded text-purple-500"
                          title="Prêt espèces"
                        >
                          <Banknote className="h-3.5 w-3.5" />
                        </button>
                        {/* Bouton règlement */}
                        {client.solde > 0 && (
                          <button
                            onClick={() => setReglementClient(client)}
                            className="p-1.5 hover:bg-green-50 rounded text-green-600"
                            title="Enregistrer un règlement"
                          >
                            <Wallet className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(client)}
                          className="p-1.5 hover:bg-blue-50 rounded text-blue-500"
                          title="Modifier"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(client.id)}
                          className="p-1.5 hover:bg-red-50 rounded text-red-400"
                          title="Supprimer"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Modal création/édition */}
      {showForm && canManageClients && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-semibold text-lg">
              {editingClient ? 'Modifier le client' : 'Nouveau client'}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Nom *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Nom du client"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="+223 XX XX XX XX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Adresse</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Quartier, ville..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
              <Button className="flex-1" onClick={handleSubmitForm} isLoading={formSubmitting}>
                {editingClient ? 'Enregistrer' : 'Ajouter'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal règlement */}
      {reglementClient && canManageClients && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-semibold text-lg">Règlement client</h2>
            <p className="text-sm text-muted-foreground">
              {reglementClient.name} — Solde dû : <span className="text-red-500 font-semibold">{formatCurrency(reglementClient.solde)}</span>
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Montant reçu (XOF) *</label>
                <input
                  type="number"
                  value={reglementMontant}
                  onChange={(e) => setReglementMontant(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="0"
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
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setReglementClient(null)}>
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

      {/* Modal prêt espèces */}
      {pretClient && canManageClients && (
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
                    <span>Solde actuel du client</span>
                    <span className="font-medium text-red-500">{formatCurrency(pretClient.solde)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Nouveau solde après prêt</span>
                    <span className="font-medium text-red-500">{formatCurrency(pretClient.solde + parseFloat(pretMontant))}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 border-t pt-1">
                    <span>Impact sur la caisse</span>
                    <span className="font-medium text-red-500">-{formatCurrency(parseFloat(pretMontant))}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
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
    </div>
  )
}
