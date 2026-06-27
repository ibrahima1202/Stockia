import { useState } from 'react'
import { Plus, Phone, MapPin, Wallet, XCircle, Pencil } from 'lucide-react'
import {
  LoadingScreen, Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Badge, EmptyState, Card
} from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { useClients } from '@/hooks/useClients'
import { formatCurrency } from '@/lib/utils'
import type { Client, PaymentMethod } from '@/types'

export default function ClientsPage() {
  const { clients, isLoading, createClient, updateClient, deleteClient, addReglement } = useClients()

  // Modal création/édition
  const [showForm, setShowForm] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [formData, setFormData] = useState({ name: '', phone: '', address: '', notes: '' })
  const [formSubmitting, setFormSubmitting] = useState(false)

  // Modal règlement
  const [reglementClient, setReglementClient] = useState<Client | null>(null)
  const [reglementMontant, setReglementMontant] = useState('')
  const [reglementMethod, setReglementMethod] = useState<PaymentMethod>('especes')
  const [reglementNotes, setReglementNotes] = useState('')
  const [reglementSubmitting, setReglementSubmitting] = useState(false)

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

  const totalCredit = clients.reduce((sum, c) => sum + c.solde, 0)

  if (isLoading) return <LoadingScreen text="Chargement des clients..." />

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="text-sm text-muted-foreground">{clients.length} client(s)</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nouveau client
        </Button>
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
                <TableHead></TableHead>
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
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      {client.solde > 0 && (
                        <button
                          onClick={() => setReglementClient(client)}
                          className="p-1.5 hover:bg-green-50 rounded text-green-600 text-xs font-medium"
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Modal création/édition */}
      {showForm && (
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
      {reglementClient && (
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
    </div>
  )
}
