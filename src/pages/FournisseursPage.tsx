import { useState, useMemo } from 'react'
import { Plus, Phone, MapPin, Wallet, XCircle, Pencil, ShoppingBag, Minus, Trash2, Lock, Crown, FileDown } from 'lucide-react'
import {
  LoadingScreen, Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Badge, EmptyState, Card
} from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { useFournisseurs } from '@/hooks/useFournisseurs'
import { useProducts } from '@/hooks/useProducts'
import { useCategories } from '@/hooks/useProducts'
import { useSubscription } from '@/hooks/useSubscription'
import { useRole } from '@/hooks/useRole'
import { useCommerceType } from '@/hooks/useCommerceType'
import { useProductUnits } from '@/hooks/useProductUnits'
import { useNavigate } from 'react-router-dom'
import { formatCurrency } from '@/lib/utils'
import { pdfService } from '@/services/pdfService'
import type { Fournisseur, PaymentMethod, AchatCartItem, AchatStatut, ProductUnit } from '@/types'

function AchatUnitSelector({
  productId,
  baseUnit,
  onSelect,
}: {
  productId: string
  baseUnit?: string
  onSelect: (unit: ProductUnit | null, conversionRate: number) => void
}) {
  const { units } = useProductUnits(productId)
  const [selectedUnitId, setSelectedUnitId] = useState('')

  const handleChange = (unitId: string) => {
    setSelectedUnitId(unitId)
    if (!unitId) {
      onSelect(null, 1)
    } else {
      const unit = units.find((u) => u.id === unitId)
      if (unit) onSelect(unit, unit.conversion_rate)
    }
  }

  if (units.length === 0) return (
    <div className="text-xs text-muted-foreground mt-1">
      Unité : {baseUnit || 'Pièce'}
    </div>
  )

  return (
    <div className="mt-1">
      <select
        value={selectedUnitId}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full h-7 rounded border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <option value="">{baseUnit || 'Pièce'} (unité de base)</option>
        {units.map((unit) => (
          <option key={unit.id} value={unit.id}>
            {unit.unit_name} = {unit.conversion_rate} {baseUnit || 'pcs'}
          </option>
        ))}
      </select>
    </div>
  )
}

export default function FournisseursPage() {
  const {
    fournisseurs, isLoading,
    createFournisseur, updateFournisseur, deleteFournisseur,
    createProduct, addAchat, addReglement
  } = useFournisseurs()
  const { products, reload: reloadProducts } = useProducts()
  const { categories, createCategory } = useCategories()
  const { canAccessClientsAndFournisseurs, isLoading: subLoading, business } = useSubscription()
  const { canViewFournisseurs, canManageFournisseurs, canManageAchats } = useRole()
  const { isGrosDetail } = useCommerceType()
  const navigate = useNavigate()

  const [showForm, setShowForm] = useState(false)
  const [editingFourn, setEditingFourn] = useState<Fournisseur | null>(null)
  const [formData, setFormData] = useState({ name: '', phone: '', address: '', notes: '' })
  const [formSubmitting, setFormSubmitting] = useState(false)

  const [achatFourn, setAchatFourn] = useState<Fournisseur | null>(null)
  const [achatCart, setAchatCart] = useState<AchatCartItem[]>([])
  const [achatStatut, setAchatStatut] = useState<AchatStatut>('comptant')
  const [achatMontantPaye, setAchatMontantPaye] = useState('')
  const [achatPaymentMethod, setAchatPaymentMethod] = useState<PaymentMethod>('especes')
  const [achatNotes, setAchatNotes] = useState('')
  const [achatSubmitting, setAchatSubmitting] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [achatQty, setAchatQty] = useState(1)
  const [achatUnitPrice, setAchatUnitPrice] = useState('')
  const [selectedAchatUnit, setSelectedAchatUnit] = useState<ProductUnit | null>(null)
  const [selectedConversionRate, setSelectedConversionRate] = useState(1)

  // Dernier achat pour génération PDF
  const [dernierAchat, setDernierAchat] = useState<any>(null)
  const [showAchatSuccess, setShowAchatSuccess] = useState(false)

  const [showNewProduct, setShowNewProduct] = useState(false)
  const [newProductData, setNewProductData] = useState({
    name: '', reference: '', category_id: '', purchase_price: '', selling_price: ''
  })
  const [newProductSubmitting, setNewProductSubmitting] = useState(false)

  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategorySubmitting, setNewCategorySubmitting] = useState(false)

  const [reglementFourn, setReglementFourn] = useState<Fournisseur | null>(null)
  const [reglementMontant, setReglementMontant] = useState('')
  const [reglementMethod, setReglementMethod] = useState<PaymentMethod>('especes')
  const [reglementNotes, setReglementNotes] = useState('')
  const [reglementSubmitting, setReglementSubmitting] = useState(false)

  const achatTotal = achatCart.reduce((sum, i) => sum + i.total_price, 0)
  const montantDu = achatStatut === 'credit'
    ? achatTotal
    : achatStatut === 'partiel'
    ? achatTotal - (parseFloat(achatMontantPaye) || 0)
    : 0

  const activeProducts = useMemo(() => products.filter((p) => p.is_active), [products])
  const selectedProduct = products.find((p) => p.id === selectedProductId)
  const quantiteEnBase = achatQty * selectedConversionRate

  const openCreate = () => {
    setEditingFourn(null)
    setFormData({ name: '', phone: '', address: '', notes: '' })
    setShowForm(true)
  }

  const openEdit = (fourn: Fournisseur) => {
    setEditingFourn(fourn)
    setFormData({ name: fourn.name, phone: fourn.phone ?? '', address: fourn.address ?? '', notes: fourn.notes ?? '' })
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

  const openAchat = (fourn: Fournisseur) => {
    setAchatFourn(fourn)
    setAchatCart([])
    setAchatStatut('comptant')
    setAchatMontantPaye('')
    setAchatPaymentMethod('especes')
    setAchatNotes('')
    setSelectedProductId('')
    setAchatQty(1)
    setAchatUnitPrice('')
    setSelectedAchatUnit(null)
    setSelectedConversionRate(1)
    setDernierAchat(null)
    setShowAchatSuccess(false)
  }

  const addToAchatCart = () => {
    const product = products.find((p) => p.id === selectedProductId)
    if (!product || !achatUnitPrice || achatQty < 1) return
    const unitPrice = parseFloat(achatUnitPrice)
    const qtyInBase = achatQty * selectedConversionRate

    setAchatCart((prev) => {
      const key = `${product.id}-${selectedAchatUnit?.id ?? 'base'}`
      const existing = prev.find((i) => `${i.product.id}-${(i as any).unit_id ?? 'base'}` === key)
      if (existing) {
        return prev.map((i) => {
          if (`${i.product.id}-${(i as any).unit_id ?? 'base'}` !== key) return i
          const newQty = i.quantity + achatQty
          return { ...i, quantity: newQty, total_price: newQty * i.unit_price }
        })
      }
      return [...prev, {
        product,
        quantity: achatQty,
        unit_price: unitPrice,
        total_price: achatQty * unitPrice,
        unit_id: selectedAchatUnit?.id ?? null,
        unit_name: selectedAchatUnit?.unit_name ?? (product.base_unit || 'Pièce'),
        conversion_rate: selectedConversionRate,
        quantity_in_base: qtyInBase,
      } as any]
    })
    setSelectedProductId('')
    setAchatQty(1)
    setAchatUnitPrice('')
    setSelectedAchatUnit(null)
    setSelectedConversionRate(1)
  }

  const removeFromAchatCart = (productId: string) => {
    setAchatCart((prev) => prev.filter((i) => i.product.id !== productId))
  }

  const updateAchatQty = (productId: string, newQty: number) => {
    if (newQty <= 0) { removeFromAchatCart(productId); return }
    setAchatCart((prev) => prev.map((i) => {
      if (i.product.id !== productId) return i
      const convRate = (i as any).conversion_rate ?? 1
      return { ...i, quantity: newQty, total_price: newQty * i.unit_price, quantity_in_base: newQty * convRate }
    }))
  }

  const handleAchat = async () => {
    if (!achatFourn || achatCart.length === 0) return
    if (achatStatut === 'partiel' && (!achatMontantPaye || parseFloat(achatMontantPaye) <= 0)) return
    setAchatSubmitting(true)
    try {
      const achat = await addAchat({
        fournisseur_id: achatFourn.id,
        items: achatCart,
        statut: achatStatut,
        montant_paye: achatStatut === 'comptant' ? achatTotal : parseFloat(achatMontantPaye) || 0,
        payment_method: achatPaymentMethod,
        notes: achatNotes,
      })

      // Préparer les données pour le PDF
      setDernierAchat({
        ...achat,
        fournisseur: achatFourn,
        achat_items: achatCart.map((item) => ({
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          unit_name: (item as any).unit_name ?? null,
          conversion_rate: (item as any).conversion_rate ?? 1,
          quantity_in_base: (item as any).quantity_in_base ?? item.quantity,
          product: {
            name: item.product.name,
            reference: item.product.reference,
            base_unit: item.product.base_unit ?? null,
          },
        })),
      })

      setShowAchatSuccess(true)
      reloadProducts()
    } catch {
    } finally {
      setAchatSubmitting(false)
    }
  }

  const handleExportAchat = () => {
    if (!dernierAchat) return
    pdfService.exportAchatReceipt(dernierAchat, business?.name ?? 'Mon Commerce')
  }

  const handleCreateProduct = async () => {
    if (!newProductData.name || !newProductData.reference) return
    setNewProductSubmitting(true)
    try {
      const product = await createProduct({
        name: newProductData.name,
        reference: newProductData.reference,
        category_id: newProductData.category_id || undefined,
        purchase_price: parseFloat(newProductData.purchase_price) || 0,
        selling_price: parseFloat(newProductData.selling_price) || 0,
      })
      await reloadProducts()
      setSelectedProductId(product.id)
      setAchatUnitPrice(newProductData.purchase_price)
      setShowNewProduct(false)
      setNewProductData({ name: '', reference: '', category_id: '', purchase_price: '', selling_price: '' })
    } catch {
    } finally {
      setNewProductSubmitting(false)
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return
    setNewCategorySubmitting(true)
    try {
      const category = await createCategory(newCategoryName.trim())
      setNewProductData({ ...newProductData, category_id: category.id })
      setShowNewCategory(false)
      setNewCategoryName('')
    } catch {
    } finally {
      setNewCategorySubmitting(false)
    }
  }

  const handleReglement = async () => {
    if (!reglementFourn || !reglementMontant) return
    setReglementSubmitting(true)
    try {
      await addReglement(reglementFourn.id, parseFloat(reglementMontant), reglementMethod, reglementNotes)
      setReglementFourn(null)
      setReglementMontant('')
      setReglementNotes('')
    } catch {
    } finally {
      setReglementSubmitting(false)
    }
  }

  const totalDettes = fournisseurs.reduce((sum, f) => sum + f.solde, 0)

  if (isLoading || subLoading) return <LoadingScreen text="Chargement des fournisseurs..." />

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
              La gestion des fournisseurs et achats est disponible à partir du plan Business.
            </p>
          </div>
          <Card className="p-5 w-full max-w-sm text-left space-y-3">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-orange-500" />
              <p className="font-semibold text-sm">Plan Business — 7 500 XOF/mois</p>
            </div>
            <ul className="space-y-1.5">
              {['Tout le plan Starter', 'Gestion des fournisseurs', "Factures d'achat", 'Gestion des dettes', 'Gestion des clients', '3 utilisateurs', 'Produits illimités'].map((f) => (
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

  if (!canViewFournisseurs) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
          <Lock className="h-10 w-10 text-red-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Accès non autorisé</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Vous n'avez pas les permissions pour accéder aux fournisseurs.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Fournisseurs</h1>
          <p className="text-sm text-muted-foreground">{fournisseurs.length} fournisseur(s)</p>
        </div>
        {canManageFournisseurs && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nouveau
          </Button>
        )}
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fournisseurs</p>
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
                <TableHead className="text-right">Dette</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fournisseurs.map((fourn) => (
                <TableRow key={fourn.id}>
                  <TableCell>
                    <button
                          onClick={() => navigate(`/fournisseurs/${fourn.id}/historique`)}
                          className="font-medium text-sm text-orange-500 hover:underline text-left"
                        >
                          {fourn.name}
                        </button>
                          {fourn.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />{fourn.phone}
                      </p>
                    )}
                    {fourn.address && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />{fourn.address}
                      </p>
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
                      {canManageAchats && (
                        <button onClick={() => openAchat(fourn)} className="p-1.5 hover:bg-orange-50 rounded text-orange-500" title="Nouvel achat">
                          <ShoppingBag className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {canManageFournisseurs && fourn.solde > 0 && (
                        <button onClick={() => setReglementFourn(fourn)} className="p-1.5 hover:bg-green-50 rounded text-green-600" title="Payer">
                          <Wallet className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {canManageFournisseurs && (
                        <>
                          <button onClick={() => openEdit(fourn)} className="p-1.5 hover:bg-blue-50 rounded text-blue-500">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDelete(fourn.id)} className="p-1.5 hover:bg-red-50 rounded text-red-400">
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Modal création/édition fournisseur */}
      {showForm && canManageFournisseurs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-semibold text-lg">{editingFourn ? 'Modifier' : 'Nouveau fournisseur'}</h2>
            <div className="space-y-3">
              {['name', 'phone', 'address', 'notes'].map((field) => (
                <div key={field}>
                  <label className="block text-sm font-medium mb-1 capitalize">
                    {field === 'name' ? 'Nom *' : field === 'phone' ? 'Téléphone' : field === 'address' ? 'Adresse' : 'Notes'}
                  </label>
                  <input
                    type="text"
                    value={formData[field as keyof typeof formData]}
                    onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Annuler</Button>
              <Button className="flex-1" onClick={handleSubmitForm} isLoading={formSubmitting}>
                {editingFourn ? 'Enregistrer' : 'Ajouter'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal achat */}
      {achatFourn && canManageAchats && !showAchatSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-2">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-4">
            <h2 className="font-semibold text-lg">Facture d'achat — {achatFourn.name}</h2>

            <Card className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Ajouter un produit</p>
                <button onClick={() => setShowNewProduct(true)} className="text-xs text-primary flex items-center gap-1 hover:underline">
                  <Plus className="h-3 w-3" /> Nouveau produit
                </button>
              </div>

              <select
                value={selectedProductId}
                onChange={(e) => {
                  const p = products.find((x) => x.id === e.target.value)
                  setSelectedProductId(e.target.value)
                  setSelectedAchatUnit(null)
                  setSelectedConversionRate(1)
                  if (p) setAchatUnitPrice(p.purchase_price.toString())
                }}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Sélectionner un produit...</option>
                {activeProducts.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} (stock: {p.stock_current} {p.base_unit || 'pcs'})</option>
                ))}
              </select>

              {selectedProductId && isGrosDetail && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Unité d'achat</label>
                  <AchatUnitSelector
                    productId={selectedProductId}
                    baseUnit={selectedProduct?.base_unit}
                    onSelect={(unit, rate) => {
                      setSelectedAchatUnit(unit)
                      setSelectedConversionRate(rate)
                    }}
                  />
                </div>
              )}

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">Prix achat (XOF)</label>
                  <input
                    type="number"
                    value={achatUnitPrice}
                    onChange={(e) => setAchatUnitPrice(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    placeholder="0"
                  />
                </div>
                <div className="w-24">
                  <label className="text-xs text-muted-foreground">
                    Qté {selectedAchatUnit ? `(${selectedAchatUnit.unit_name})` : ''}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={achatQty}
                    onChange={(e) => setAchatQty(parseInt(e.target.value) || 1)}
                    onFocus={(e) => e.target.select()}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-center"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={addToAchatCart} disabled={!selectedProductId || !achatUnitPrice}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {selectedProductId && isGrosDetail && selectedConversionRate > 1 && achatQty > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-md px-3 py-2">
                  <p className="text-xs text-orange-700 font-medium">
                    {achatQty} {selectedAchatUnit?.unit_name ?? selectedProduct?.base_unit ?? 'unité'}(s)
                    = <strong>{quantiteEnBase} {selectedProduct?.base_unit || 'pcs'}</strong> seront ajoutés au stock
                  </p>
                </div>
              )}
            </Card>

            {achatCart.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      {isGrosDetail && <TableHead>Unité</TableHead>}
                      <TableHead className="text-center">Qté</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {achatCart.map((item) => (
                      <TableRow key={item.product.id}>
                        <TableCell>
                          <p className="text-sm font-medium">{item.product.name}</p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(item.unit_price)}/u</p>
                        </TableCell>
                        {isGrosDetail && (
                          <TableCell>
                            <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                              {(item as any).unit_name || item.product.base_unit || 'Pièce'}
                            </span>
                            {(item as any).conversion_rate > 1 && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                = {(item as any).quantity_in_base} {item.product.base_unit || 'pcs'}
                              </p>
                            )}
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => updateAchatQty(item.product.id, item.quantity - 1)} className="h-6 w-6 rounded border flex items-center justify-center hover:bg-muted">
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-8 text-center text-sm">{item.quantity}</span>
                            <button onClick={() => updateAchatQty(item.product.id, item.quantity + 1)} className="h-6 w-6 rounded border flex items-center justify-center hover:bg-muted">
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-sm">{formatCurrency(item.total_price)}</TableCell>
                        <TableCell>
                          <button onClick={() => removeFromAchatCart(item.product.id)} className="p-1 hover:bg-red-50 rounded">
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="px-4 py-2 bg-muted/30 flex justify-between items-center">
                  <span className="text-sm font-medium">Total facture</span>
                  <span className="font-bold text-lg">{formatCurrency(achatTotal)}</span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Select
                label="Mode de règlement"
                value={achatStatut}
                onChange={(e) => setAchatStatut(e.target.value as AchatStatut)}
                options={[
                  { value: 'comptant', label: '✅ Comptant (payé intégralement)' },
                  { value: 'credit', label: '🔴 À crédit (non payé)' },
                  { value: 'partiel', label: '🟡 Paiement partiel' },
                ]}
              />
              {achatStatut === 'partiel' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Montant payé (XOF)</label>
                  <input type="number" value={achatMontantPaye} onChange={(e) => setAchatMontantPaye(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" placeholder="0" />
                  {parseFloat(achatMontantPaye) > 0 && (
                    <p className="text-xs text-red-500 mt-1">Reste dû : {formatCurrency(achatTotal - parseFloat(achatMontantPaye))}</p>
                  )}
                </div>
              )}
              {achatStatut !== 'credit' && (
                <Select
                  label="Mode de paiement"
                  value={achatPaymentMethod}
                  onChange={(e) => setAchatPaymentMethod(e.target.value as PaymentMethod)}
                  options={[
                    { value: 'especes', label: 'Espèces' },
                    { value: 'mobile_money', label: 'Mobile Money' },
                    { value: 'carte', label: 'Carte bancaire' },
                  ]}
                />
              )}
              {montantDu > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  <p className="text-xs text-red-600 font-medium">{formatCurrency(montantDu)} sera ajouté à la dette envers {achatFourn.name}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea value={achatNotes} onChange={(e) => setAchatNotes(e.target.value)} rows={2} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setAchatFourn(null)}>Annuler</Button>
              <Button className="flex-1" onClick={handleAchat} isLoading={achatSubmitting} disabled={achatCart.length === 0}>
                Valider la facture
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal succès achat avec option PDF */}
      {showAchatSuccess && dernierAchat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <ShoppingBag className="h-8 w-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Achat enregistré !</h2>
            <p className="text-sm text-slate-500">
              La facture <strong className="font-mono">{dernierAchat.reference}</strong> a été enregistrée avec succès. Le stock a été mis à jour automatiquement.
            </p>

            <div className="bg-slate-50 rounded-lg px-4 py-3 text-left space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fournisseur</span>
                <span className="font-medium">{dernierAchat.fournisseur?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-bold text-orange-500">{formatCurrency(dernierAchat.montant_total)} XOF</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Statut</span>
                <span className={`font-medium ${dernierAchat.statut === 'comptant' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {dernierAchat.statut === 'comptant' ? 'Payé comptant' : dernierAchat.statut === 'credit' ? 'À crédit' : 'Partiel'}
                </span>
              </div>
            </div>

            <button
              onClick={handleExportAchat}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold text-sm transition-colors"
            >
              <FileDown className="h-5 w-5" />
              Télécharger la facture PDF
            </button>

            <Button variant="outline" className="w-full" onClick={() => {
              setShowAchatSuccess(false)
              setAchatFourn(null)
              setDernierAchat(null)
            }}>
              Fermer
            </Button>
          </div>
        </div>
      )}

      {/* Modal création rapide produit */}
      {showNewProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-semibold text-lg">Nouveau produit</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Nom *</label>
                <input type="text" value={newProductData.name} onChange={(e) => setNewProductData({ ...newProductData, name: e.target.value })} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Référence *</label>
                <input type="text" value={newProductData.reference} onChange={(e) => setNewProductData({ ...newProductData, reference: e.target.value })} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium">Catégorie</label>
                  <button onClick={() => setShowNewCategory(true)} className="text-xs text-primary flex items-center gap-1 hover:underline">
                    <Plus className="h-3 w-3" /> Nouvelle catégorie
                  </button>
                </div>
                <select value={newProductData.category_id} onChange={(e) => setNewProductData({ ...newProductData, category_id: e.target.value })} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Sans catégorie</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Prix achat</label>
                  <input type="number" value={newProductData.purchase_price} onChange={(e) => setNewProductData({ ...newProductData, purchase_price: e.target.value })} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Prix vente</label>
                  <input type="number" value={newProductData.selling_price} onChange={(e) => setNewProductData({ ...newProductData, selling_price: e.target.value })} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" placeholder="0" />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowNewProduct(false)}>Annuler</Button>
              <Button className="flex-1" onClick={handleCreateProduct} isLoading={newProductSubmitting}>Créer</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal création rapide catégorie */}
      {showNewCategory && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="font-semibold text-lg">Nouvelle catégorie</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Nom de la catégorie *</label>
              <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" placeholder="Ex: Plomberie, Électricité..." autoFocus />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setShowNewCategory(false); setNewCategoryName('') }}>Annuler</Button>
              <Button className="flex-1" onClick={handleCreateCategory} isLoading={newCategorySubmitting} disabled={!newCategoryName.trim()}>Créer</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal règlement */}
      {reglementFourn && canManageFournisseurs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-semibold text-lg">Paiement fournisseur</h2>
            <p className="text-sm text-muted-foreground">
              {reglementFourn.name} — Dette : <span className="text-red-500 font-semibold">{formatCurrency(reglementFourn.solde)}</span>
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Montant payé (XOF) *</label>
                <input type="number" value={reglementMontant} onChange={(e) => setReglementMontant(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" placeholder="0" />
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
                <textarea value={reglementNotes} onChange={(e) => setReglementNotes(e.target.value)} rows={2} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setReglementFourn(null)}>Annuler</Button>
              <Button className="flex-1" onClick={handleReglement} isLoading={reglementSubmitting} disabled={!reglementMontant}>Payer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
