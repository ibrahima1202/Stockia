import { useState } from 'react'
import { Plus, Phone, MapPin, Wallet, XCircle, Pencil, ShoppingBag } from 'lucide-react'
import {
  LoadingScreen, Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Badge, EmptyState, Card
} from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { useFournisseurs } from '@/hooks/useFournisseurs'
import { formatCurrency } from '@/lib/utils'
import type { Fournisseur, PaymentMethod } from '@/types'

export default function FournisseursPage() {
  const {
    fournisseurs, isLoading,
    createFournisseur, updateFournisseur, deleteFournisseur,
    addAchat, addReglement
  } = useFournisseurs()

  // Modal création/édition
  const [showForm, setShowForm] = useState(false)
  const [editingFourn, setEditingFourn] = useState<Fournisseur | null>(null)
  const [formData, setFormData] = useState({ name: '', phone: '', address: '', notes: '' })
  const [formSubmitting, setFormSubmitting] = useState(false)

  // Modal achat
  const [achatFourn, setAchatFourn] = useState<Fournisseur | null>(null)
  const [achatMontant, setAchatMontant] = useState('')
  const [achatNotes, setAchatNotes] = useState('')
  const [achatSubmitting, setAchatSubmitting] = useState(false)

  // Modal règlement
  const [reglementFourn, setReglementFourn] = useState<Fournisseur | null>(null)
  const [reglementMontant, setReglementMontant] = useState('')
  const [reglementMethod, setReglementMethod] = useState<PaymentMethod>('especes')
  const [reglementNotes, setReglementNotes] = useState('')
  const [reglementSubmitting, setReglementSubmitting] = useState(false)

  const openCreate = () => {
    setEditingFourn(null)
    setFormData({ name: '', phone: '', address: '', notes: '' })
    setShowForm(true)
  }

  const openEdit = (fourn: Fournisseur) => {
    setEditingFourn(fourn)
    setFormData({
      name: fourn.name,
      phone: fourn.phone ?? '',
      address: fourn.address ?? '',
      notes: fourn.notes ?? '',
    })
    setShowForm(true)
  }

  const handleSubmitForm = async () => {
    if (!formData.name.trim()) return
    setFormSubmitting(true)
    try {
      if (editingFourn) {
        await updateFournisseur(editingFourn.id, formData)
      } else {
        await createFournisseur(formData)
      }
      setShowForm(false)
    } catch {
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer ce fournisseur ?')) return
    await deleteFournisseur(id)
  }

  const handleAchat = async () => {
    if (!achatFourn || !achatMontant) return
    setAchatSubmitting(true)
    try {
      await addAchat(achatFourn.id, parseFloat(achatMontant), achatNotes)
      setAchatFourn(null)
      setAchatMontant('')
      setAchatNotes('')
    } catch {
    } finally {
      setAchatSubmitting(false)
    }
  }

  const handleReglement = async () => {
    if (!reglementFourn || !reglementMontant) return
    setReglementSubmitting(true)
    try {
      await addReglement(
        reglementFourn.id,
        parseFloat(reglementMontant),
        reglementMethod,
        reglementNotes
      )
      setReglementFourn(null)
      setReglementMontant('')
      setReglementNotes('')
    } catch {
    } finally {
      setReglementSubmitting(false)
    }
  }

  const totalDettes = fournisseurs.reduce((sum, f) => sum + f.solde, 0)

  if (isLoading) return <LoadingScreen text="Chargement des fournisseurs..." />

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Fournisseurs</h1>
          <p className="text-sm text-muted-foreground">{fournisseurs.length} fournisseur(s)</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nouveau fournisseur
        </Button>
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total fournisseurs</p>
          <p className="text-2xl font-bold mt-1">{fournisseurs.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total dettes</p>
          <p className="text-2xl font-bold text-red-500 mt-1">{formatCurrency(totalDettes)}</p>
        </Card>
      </div>

      {/* Liste */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        {fournisseurs.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="Aucun fournisseur" description="Ajoutez vos fournisseurs ici" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Dette</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fournisseurs.map((fourn) => (
                <TableRow key={fourn.id}>
                  <TableCell>
                    <p className="font-medium text-sm">{fourn.name}</p>
                    {fourn.address && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />{fourn.address}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    {fourn.phone ? (
                      <p className="text-sm flex items-center gap-1">
                        <Phone className="h-3 w-3" />{fourn.phone}
                      </p>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {fourn.solde > 0 ? (
                      <Badge variant="danger">{formatCurrency(fourn.solde)}</Badge>
                    ) : (
                      <Badge variant="success">À jour</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => setAchatFourn(fourn)}
                        className="p-1.5 hover:bg-orange-50 rounded text-orange-500"
                        title="Nouvel achat"
                      >
                        <ShoppingBag className="h-3.5 w-3.5" />
                      </button>
                      {fourn.solde > 0 && (
                        <button
                          onClick={() => setReglementFourn(fourn)}
                          className="p-1.5 hover:bg-green-50 rounded text-green-600"
                          title="Enregistrer un paiement"
                        >
                          <Wallet className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(fourn)}
                        className="p-1.5 hover:bg-blue-50 rounded text-blue-500"
                        title="Modifier"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(fourn.id)}
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
              {editingFourn ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Nom *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Nom du fournisseur"
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
                {editingFourn ? 'Enregistrer' : 'Ajouter'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal achat */}
      {achatFourn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-semibold text-lg">Nouvel achat</h2>
            <p className="text-sm text-muted-foreground">{achatFourn.name}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Montant total (XOF) *</label>
                <input
                  type="number"
                  value={achatMontant}
                  onChange={(e) => setAchatMontant(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={achatNotes}
                  onChange={(e) => setAchatNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Liste des produits achetés..."
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setAchatFourn(null)}>
                Annuler
              </Button>
              <Button
                className="flex-1"
                onClick={handleAchat}
                isLoading={achatSubmitting}
                disabled={!achatMontant}
              >
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal règlement */}
      {reglementFourn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-semibold text-lg">Paiement fournisseur</h2>
            <p className="text-sm text-muted-foreground">
              {reglementFourn.name} — Dette : <span className="text-red-500 font-semibold">{formatCurrency(reglementFourn.solde)}</span>
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Montant payé (XOF) *</label>
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
              <Button variant="outline" className="flex-1" onClick={() => setReglementFourn(null)}>
                Annuler
              </Button>
              <Button
                className="flex-1"
                onClick={handleReglement}
                isLoading={reglementSubmitting}
                disabled={!reglementMontant}
              >
                Payer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
