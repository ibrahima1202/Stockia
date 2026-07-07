import { useState, useMemo, useEffect } from 'react'
import { Plus, Minus, Trash2, ShoppingCart, Receipt, Pencil, XCircle, User, Lock, Search, FileDown, Tag, UserPlus } from 'lucide-react'
import {
  LoadingScreen, Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Badge, EmptyState, Card
} from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { useSales } from '@/hooks/useSales'
import { useProducts } from '@/hooks/useProducts'
import { useClients } from '@/hooks/useClients'
import { useReadOnly } from '@/hooks/useReadOnly'
import { useSubscription } from '@/hooks/useSubscription'
import { useRole } from '@/hooks/useRole'
import { useCommerceType } from '@/hooks/useCommerceType'
import { useProductUnits } from '@/hooks/useProductUnits'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { Sale, SaleCartItem, PaymentMethod, SaleStatut, Product, DiscountType, ProductUnit } from '@/types'
import { useToast } from '@/store/toastStore'
import { pdfService } from '@/services/pdfService'

function UnitSelector({
  product,
  onSelect,
}: {
  product: Product
  onSelect: (unit: ProductUnit | null) => void
}) {
  const { units } = useProductUnits(product.id)
  const [selectedUnitId, setSelectedUnitId] = useState<string>('')

  useEffect(() => {
    setSelectedUnitId('')
    onSelect(null)
  }, [product.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (unitId: string) => {
    setSelectedUnitId(unitId)
    if (!unitId) {
      onSelect(null)
    } else {
      const unit = units.find((u) => u.id === unitId)
      if (unit) onSelect(unit)
    }
  }

  if (units.length === 0) return null

  return (
    <div className="mt-1">
      <select
        value={selectedUnitId}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full h-7 rounded border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <option value="">{product.base_unit || 'Pièce'} — {formatCurrency(product.selling_price)}</option>
        {units.map((unit) => (
          <option key={unit.id} value={unit.id}>
            {unit.unit_name} ({unit.conversion_rate} {product.base_unit || 'pcs'}) — {formatCurrency(unit.selling_price)}
          </option>
        ))}
      </select>
    </div>
  )
}

export default function SalesPage() {
  const { sales, isLoading, createSale, deleteSale, updateSale } = useSales()
  const { products } = useProducts()
  const { clients, createClient } = useClients()
  const toast = useToast()
  const { isReadOnly } = useReadOnly()
  const { canExportPDF, business } = useSubscription()
  const { canManageSales, canCreateSale, canCancelSale, canApplyDiscount, canExportPDFRole } = useRole()
  const { isGrosDetail } = useCommerceType()

  const [cart, setCart] = useState<SaleCartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('especes')
  const [statut, setStatut] = useState<SaleStatut>('paye')
  const [montantPaye, setMontantPaye] = useState('')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'list' | 'new'>('list')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedUnit, setSelectedUnit] = useState<ProductUnit | null>(null)
  const [qty, setQty] = useState(1)
  const [productSearch, setProductSearch] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)

  const [discountType, setDiscountType] = useState<DiscountType>('amount')
  const [discountValue, setDiscountValue] = useState('')
  const [showDiscount, setShowDiscount] = useState(false)

  const [editingDiscountId, setEditingDiscountId] = useState<string | null>(null)
  const [productDiscountValue, setProductDiscountValue] = useState('')

  const [showNewClient, setShowNewClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientPhone, setNewClientPhone] = useState('')
  const [newClientSubmitting, setNewClientSubmitting] = useState(false)

  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethod>('especes')
  const [editNotes, setEditNotes] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)

  const activeProducts = useMemo(
    () => products.filter((p) => p.is_active && p.stock_current > 0),
    [products]
  )

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return activeProducts
    const search = productSearch.toLowerCase()
    return activeProducts.filter(
      (p) => p.name.toLowerCase().includes(search) || p.reference.toLowerCase().includes(search)
    )
  }, [activeProducts, productSearch])

  const selectedProduct = products.find((p) => p.id === selectedProductId)
  const subtotal = cart.reduce((sum, item) => sum + item.total_price, 0)

  const discountAmount = useMemo(() => {
    if (!discountValue || !showDiscount) return 0
    const val = parseFloat(discountValue)
    if (isNaN(val) || val <= 0) return 0
    if (discountType === 'percent') return Math.round(subtotal * val / 100)
    return Math.min(val, subtotal)
  }, [discountValue, discountType, subtotal, showDiscount])

  const cartTotal = Math.max(0, subtotal - discountAmount)
  const montantDu = statut === 'credit' ? cartTotal : statut === 'partiel' ? cartTotal - (parseFloat(montantPaye) || 0) : 0

  const canExport = canExportPDF && canExportPDFRole
  const isDisabled = isReadOnly || !canManageSales

  const selectProduct = (product: Product) => {
    setSelectedProductId(product.id)
    setProductSearch(product.name)
    setShowProductDropdown(false)
    setSelectedUnit(null)
  }

  const addToCart = () => {
    const product = products.find((p) => p.id === selectedProductId)
    if (!product) return
    if (qty < 1) return

    const conversionRate = selectedUnit?.conversion_rate ?? 1
    const quantityInBase = qty * conversionRate

    if (quantityInBase > product.stock_current) {
      toast.error('Stock insuffisant', `Maximum disponible: ${Math.floor(product.stock_current / conversionRate)} ${selectedUnit?.unit_name ?? product.base_unit ?? 'unité'}(s)`)
      return
    }

    const unitPrice = selectedUnit ? selectedUnit.selling_price : product.selling_price

    setCart((prev) => {
      const key = `${product.id}-${selectedUnit?.id ?? 'base'}`
      const existing = prev.find((i) => `${i.product.id}-${i.unit_id ?? 'base'}` === key)
      if (existing) {
        const newQty = existing.quantity + qty
        const newQtyInBase = newQty * conversionRate
        return prev.map((i) =>
          `${i.product.id}-${i.unit_id ?? 'base'}` === key
            ? { ...i, quantity: newQty, quantity_in_base: newQtyInBase, total_price: newQty * unitPrice - i.discount_amount }
            : i
        )
      }
      return [...prev, {
        product,
        quantity: qty,
        unit_price: unitPrice,
        unit_id: selectedUnit?.id ?? null,
        unit_name: selectedUnit?.unit_name ?? (product.base_unit || 'Pièce'),
        conversion_rate: conversionRate,
        quantity_in_base: quantityInBase,
        discount_amount: 0,
        total_price: qty * unitPrice,
      }]
    })
    setSelectedProductId('')
    setProductSearch('')
    setQty(1)
    setSelectedUnit(null)
  }

  const updateQty = (productId: string, unitId: string | null | undefined, newQty: number) => {
    const key = `${productId}-${unitId ?? 'base'}`
    if (newQty <= 0) {
      setCart((prev) => prev.filter((i) => `${i.product.id}-${i.unit_id ?? 'base'}` !== key))
      return
    }
    setCart((prev) => prev.map((i) => {
      if (`${i.product.id}-${i.unit_id ?? 'base'}` !== key) return i
      const newQtyInBase = newQty * (i.conversion_rate ?? 1)
      return { ...i, quantity: newQty, quantity_in_base: newQtyInBase, total_price: newQty * i.unit_price - i.discount_amount }
    }))
  }

  const removeFromCart = (productId: string, unitId: string | null | undefined) => {
    const key = `${productId}-${unitId ?? 'base'}`
    setCart((prev) => prev.filter((i) => `${i.product.id}-${i.unit_id ?? 'base'}` !== key))
  }

  const applyProductDiscount = (productId: string, unitId: string | null | undefined) => {
    const val = parseFloat(productDiscountValue)
    if (isNaN(val) || val < 0) return
    const key = `${productId}-${unitId ?? 'base'}`
    setCart((prev) => prev.map((i) => {
      if (`${i.product.id}-${i.unit_id ?? 'base'}` !== key) return i
      const maxDiscount = i.quantity * i.unit_price
      const disc = Math.min(val, maxDiscount)
      return { ...i, discount_amount: disc, total_price: i.quantity * i.unit_price - disc }
    }))
    setEditingDiscountId(null)
    setProductDiscountValue('')
  }

  const handleCreateClient = async () => {
    if (!newClientName.trim()) return
    setNewClientSubmitting(true)
    try {
      const client = await createClient({ name: newClientName, phone: newClientPhone })
      setSelectedClientId(client.id)
      setShowNewClient(false)
      setNewClientName('')
      setNewClientPhone('')
      toast.success('Client créé !', newClientName)
    } catch {
      toast.error('Erreur', 'Impossible de créer le client')
    } finally {
      setNewClientSubmitting(false)
    }
  }

  const handleSubmitSale = async () => {
    if (isDisabled) return
    if (cart.length === 0) return
    if ((statut === 'credit' || statut === 'partiel') && !selectedClientId) {
      toast.error('Client requis', 'Sélectionnez un client pour une vente à crédit')
      return
    }
    if (statut === 'partiel' && (!montantPaye || parseFloat(montantPaye) <= 0)) {
      toast.error('Montant requis', 'Saisissez le montant payé')
      return
    }
    setSubmitting(true)
    try {
      await createSale({
        items: cart,
        payment_method: paymentMethod,
        notes,
        client_id: selectedClientId || null,
        statut,
        montant_paye: statut === 'paye' ? cartTotal : statut === 'partiel' ? parseFloat(montantPaye) : 0,
        discount: discountAmount > 0 ? { type: discountType, value: parseFloat(discountValue), amount: discountAmount } : undefined,
      })
      setCart([])
      setNotes('')
      setPaymentMethod('especes')
      setStatut('paye')
      setMontantPaye('')
      setSelectedClientId('')
      setDiscountValue('')
      setShowDiscount(false)
      setActiveTab('list')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelSale = async (id: string) => {
    if (!canCancelSale) return
    if (!window.confirm('Confirmer l\'annulation de cette vente ? Le stock sera restitué.')) return
    setCancellingId(id)
    try {
      await deleteSale(id)
      toast.success('Vente annulée', 'Le stock a été restitué automatiquement')
    } catch {
      toast.error('Erreur', 'Impossible d\'annuler cette vente')
    } finally {
      setCancellingId(null)
    }
  }

  const openEditModal = (sale: Sale) => {
    setEditingSale(sale)
    setEditPaymentMethod(sale.payment_method as PaymentMethod)
    setEditNotes(sale.notes ?? '')
  }

  const handleUpdateSale = async () => {
    if (!editingSale) return
    setEditSubmitting(true)
    try {
      await updateSale(editingSale.id, { payment_method: editPaymentMethod, notes: editNotes })
      toast.success('Vente modifiée')
      setEditingSale(null)
    } catch {
      toast.error('Erreur', 'Impossible de modifier cette vente')
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleExportReceipt = (sale: Sale) => {
    pdfService.exportSaleReceipt(sale, business?.name ?? 'Mon Commerce')
  }

  const getStatutBadge = (sale: Sale) => {
    if (sale.statut === 'credit') return <Badge variant="danger">À crédit</Badge>
    if (sale.statut === 'partiel') return <Badge variant="warning">Partiel</Badge>
    return <Badge variant="success">Payé</Badge>
  }

  if (isLoading) return <LoadingScreen text="Chargement des ventes..." />

  if (!canManageSales) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
          <Lock className="h-10 w-10 text-red-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Accès non autorisé</h1>
          <p className="text-sm text-muted-foreground mt-2">Vous n'avez pas les permissions pour accéder aux ventes.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {isReadOnly && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2">
          <Lock className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-600">Votre abonnement a expiré. Vous pouvez consulter vos données mais pas créer de nouvelles ventes.</p>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Ventes</h1>
          <p className="text-sm text-muted-foreground">{sales.length} vente(s)</p>
        </div>
        {canCreateSale && (
          <Button onClick={() => setActiveTab('new')} disabled={isReadOnly}>
            {isReadOnly ? <Lock className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            Nouvelle vente
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {[
          { key: 'list', label: 'Historique des ventes' },
          { key: 'new', label: `Nouvelle vente${cart.length > 0 ? ` (${cart.length})` : ''}` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as 'list' | 'new')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Historique */}
      {activeTab === 'list' && (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          {sales.length === 0 ? (
            <EmptyState icon={Receipt} title="Aucune vente" description="Les ventes apparaîtront ici" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      <p className="font-mono text-xs">{sale.reference}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(sale.created_at)}</p>
                    </TableCell>
                    <TableCell>
                      {sale.client ? (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs font-medium">{sale.client.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatutBadge(sale)}</TableCell>
                    <TableCell className="text-right">
                      <p className="font-bold text-emerald-600 text-sm">{formatCurrency(sale.total_amount)}</p>
                      {(sale.discount_amount ?? 0) > 0 && (
                        <p className="text-xs text-orange-500">Remise: -{formatCurrency(sale.discount_amount!)}</p>
                      )}
                      {sale.statut === 'partiel' && (
                        <p className="text-xs text-red-500">Reste: {formatCurrency(sale.total_amount - (sale.montant_paye ?? 0))}</p>
                      )}
                      {sale.statut === 'credit' && <p className="text-xs text-red-500">Non payé</p>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        {canExport && (
                          <button onClick={() => handleExportReceipt(sale)} className="p-1.5 hover:bg-orange-50 rounded text-orange-500" title="Reçu PDF">
                            <FileDown className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button onClick={() => openEditModal(sale)} disabled={isReadOnly} className="p-1.5 hover:bg-blue-50 rounded text-blue-500 disabled:opacity-30">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {canCancelSale && (
                          <button onClick={() => handleCancelSale(sale.id)} disabled={cancellingId === sale.id || isReadOnly} className="p-1.5 hover:bg-red-50 rounded text-red-400 disabled:opacity-30">
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {/* Modal modification */}
      {editingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-semibold text-lg">Modifier la vente</h2>
            <p className="text-sm text-muted-foreground font-mono">{editingSale.reference}</p>
            <div className="py-2 border rounded-md px-3 bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Articles</p>
              {editingSale.sale_items?.map((item) => (
                <p key={item.id} className="text-sm">
                  {item.product?.name}
                  {item.unit_name && item.unit_name !== 'Pièce' && ` (${item.unit_name})`}
                  {' '}× {item.quantity} — {formatCurrency(item.total_price)}
                </p>
              ))}
              <p className="text-sm font-bold text-emerald-600 mt-1 pt-1 border-t">Total : {formatCurrency(editingSale.total_amount)}</p>
            </div>
            <Select
              label="Mode de paiement"
              value={editPaymentMethod}
              onChange={(e) => setEditPaymentMethod(e.target.value as PaymentMethod)}
              options={[
                { value: 'especes', label: 'Espèces' },
                { value: 'mobile_money', label: 'Mobile Money' },
                { value: 'carte', label: 'Carte bancaire' },
              ]}
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Notes</label>
              <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditingSale(null)}>Annuler</Button>
              <Button className="flex-1" onClick={handleUpdateSale} isLoading={editSubmitting}>Enregistrer</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nouveau client */}
      {showNewClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="font-semibold text-lg">Nouveau client</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Nom *</label>
                <input type="text" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" placeholder="Nom du client" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Téléphone</label>
                <input type="tel" value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" placeholder="+223 XX XX XX XX" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setShowNewClient(false); setNewClientName(''); setNewClientPhone('') }}>Annuler</Button>
              <Button className="flex-1" onClick={handleCreateClient} isLoading={newClientSubmitting} disabled={!newClientName.trim()}>Créer</Button>
            </div>
          </div>
        </div>
      )}

      {/* Nouvelle vente */}
      {activeTab === 'new' && canCreateSale && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-4">
              <h3 className="font-medium text-sm mb-3">Ajouter un produit</h3>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => { setProductSearch(e.target.value); setSelectedProductId(''); setShowProductDropdown(true) }}
                      onFocus={() => setShowProductDropdown(true)}
                      disabled={isReadOnly}
                      placeholder="Rechercher un produit..."
                      className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                    />
                  </div>
                  {showProductDropdown && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-64 overflow-y-auto">
                      {filteredProducts.length === 0 ? (
                        <p className="px-3 py-2.5 text-sm text-muted-foreground">Aucun produit trouvé</p>
                      ) : (
                        filteredProducts.map((p) => (
                          <button key={p.id} type="button" onClick={() => selectProduct(p)} className="w-full text-left px-3 py-2.5 text-sm hover:bg-orange-50 transition-colors border-b last:border-b-0">
                            <p className="font-medium text-slate-900">{p.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(p.selling_price)} · Stock: {p.stock_current} {p.base_unit || 'pcs'} · Réf: {p.reference}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  {showProductDropdown && <div className="fixed inset-0 z-10" onClick={() => setShowProductDropdown(false)} />}
                </div>
                <input
                  type="number"
                  min="1"
                  value={qty === 0 ? '' : qty}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === '') {
                      setQty(0)
                    } else {
                      setQty(parseInt(val) || 1)
                    }
                  }}
                  onFocus={(e) => e.target.select()}
                  disabled={isReadOnly}
                  className="w-20 h-9 rounded-md border border-input bg-background px-3 text-sm text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                />
                <Button onClick={addToCart} disabled={!selectedProductId || isReadOnly || qty < 1}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {selectedProduct && isGrosDetail && (
                <UnitSelector
                  product={selectedProduct}
                  onSelect={(unit) => setSelectedUnit(unit)}
                />
              )}

              {selectedProduct && (
                <p className="text-xs text-emerald-600 mt-2">
                  ✓ {selectedProduct.name} — {formatCurrency(selectedUnit ? selectedUnit.selling_price : selectedProduct.selling_price)}
                  {selectedUnit ? ` (${selectedUnit.unit_name})` : ` (${selectedProduct.base_unit || 'Pièce'})`}
                  · Stock: {selectedProduct.stock_current} {selectedProduct.base_unit || 'pcs'}
                </p>
              )}
            </Card>

            {/* Panier */}
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
              {cart.length === 0 ? (
                <EmptyState icon={ShoppingCart} title="Panier vide" description="Ajoutez des produits pour créer une vente" />
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        {isGrosDetail && <TableHead>Unité</TableHead>}
                        <TableHead className="text-right">Prix unit.</TableHead>
                        <TableHead className="text-center">Qté</TableHead>
                        {canApplyDiscount && <TableHead className="text-right">Remise</TableHead>}
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cart.map((item) => {
                        const key = `${item.product.id}-${item.unit_id ?? 'base'}`
                        return (
                          <TableRow key={key}>
                            <TableCell>
                              <p className="font-medium text-sm">{item.product.name}</p>
                              <p className="text-xs font-mono text-muted-foreground">{item.product.reference}</p>
                            </TableCell>
                            {isGrosDetail && (
                              <TableCell>
                                <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                                  {item.unit_name}
                                </span>
                                {item.conversion_rate && item.conversion_rate > 1 && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    = {item.quantity * item.conversion_rate} {item.product.base_unit || 'pcs'}
                                  </p>
                                )}
                              </TableCell>
                            )}
                            <TableCell className="text-right text-sm">{formatCurrency(item.unit_price)}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => updateQty(item.product.id, item.unit_id, item.quantity - 1)} disabled={isReadOnly} className="h-6 w-6 rounded border flex items-center justify-center hover:bg-muted disabled:opacity-30">
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                                <button onClick={() => updateQty(item.product.id, item.unit_id, item.quantity + 1)} disabled={isReadOnly} className="h-6 w-6 rounded border flex items-center justify-center hover:bg-muted disabled:opacity-30">
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            </TableCell>
                            {canApplyDiscount && (
                              <TableCell className="text-right">
                                {editingDiscountId === key ? (
                                  <div className="flex items-center gap-1 justify-end">
                                    <input type="number" value={productDiscountValue} onChange={(e) => setProductDiscountValue(e.target.value)} className="w-20 h-7 rounded border border-input px-2 text-xs text-right" placeholder="0 XOF" autoFocus />
                                    <button onClick={() => applyProductDiscount(item.product.id, item.unit_id)} className="text-xs text-emerald-600 font-medium hover:underline">OK</button>
                                    <button onClick={() => setEditingDiscountId(null)} className="text-xs text-muted-foreground hover:underline">✕</button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => { setEditingDiscountId(key); setProductDiscountValue(item.discount_amount > 0 ? item.discount_amount.toString() : '') }}
                                    className={`text-xs ${item.discount_amount > 0 ? 'text-orange-500 font-medium' : 'text-muted-foreground hover:text-orange-500'}`}
                                  >
                                    {item.discount_amount > 0 ? `-${formatCurrency(item.discount_amount)}` : '+ Remise'}
                                  </button>
                                )}
                              </TableCell>
                            )}
                            <TableCell className="text-right font-semibold">{formatCurrency(item.total_price)}</TableCell>
                            <TableCell>
                              <button onClick={() => removeFromCart(item.product.id, item.unit_id)} disabled={isReadOnly} className="p-1 hover:bg-red-50 rounded disabled:opacity-30">
                                <Trash2 className="h-3.5 w-3.5 text-red-400" />
                              </button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>

                  <div className="px-4 py-3 border-t bg-slate-50 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Sous-total</span>
                      <span className="font-medium">{formatCurrency(subtotal)}</span>
                    </div>
                    {canApplyDiscount && (
                      showDiscount ? (
                        <div className="flex items-center gap-2">
                          <Tag className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                          <span className="text-sm text-orange-600 font-medium">Remise facture :</span>
                          <input type="number" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} className="w-24 h-7 rounded border border-input px-2 text-xs text-right" placeholder="0" />
                          <select value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)} className="h-7 rounded border border-input px-1 text-xs">
                            <option value="amount">XOF</option>
                            <option value="percent">%</option>
                          </select>
                          <button onClick={() => { setShowDiscount(false); setDiscountValue('') }} className="text-xs text-muted-foreground hover:text-red-500">✕</button>
                          {discountAmount > 0 && <span className="text-xs text-orange-500 font-medium ml-auto">-{formatCurrency(discountAmount)}</span>}
                        </div>
                      ) : (
                        <button onClick={() => setShowDiscount(true)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-orange-500 transition-colors">
                          <Tag className="h-3 w-3" /> Ajouter une remise sur la facture
                        </button>
                      )
                    )}
                    <div className="flex justify-between text-base font-bold border-t pt-2">
                      <span>Total</span>
                      <span className="text-emerald-600">{formatCurrency(cartTotal)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Récapitulatif */}
          <div className="space-y-4">
            <Card className="p-4 space-y-4">
              <h3 className="font-semibold">Récapitulatif</h3>
              <div className="flex items-center justify-between py-2 border-t border-b">
                <span className="text-sm font-medium">Total à payer</span>
                <span className="text-xl font-bold text-emerald-600">{formatCurrency(cartTotal)}</span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Client <span className="text-muted-foreground font-normal">(optionnel)</span></label>
                <div className="flex gap-2">
                  <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} disabled={isReadOnly} className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50">
                    <option value="">Aucun client</option>
                    {clients.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                  <button onClick={() => setShowNewClient(true)} disabled={isReadOnly} className="h-9 w-9 flex items-center justify-center rounded-md border border-input hover:bg-orange-50 hover:border-orange-300 hover:text-orange-500 transition-colors disabled:opacity-30" title="Nouveau client">
                    <UserPlus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <Select
                label="Statut du paiement"
                value={statut}
                onChange={(e) => { setStatut(e.target.value as SaleStatut); if (e.target.value === 'paye') setSelectedClientId('') }}
                options={[
                  { value: 'paye', label: '✅ Payé intégralement' },
                  { value: 'credit', label: '🔴 À crédit (non payé)' },
                  { value: 'partiel', label: '🟡 Paiement partiel' },
                ]}
              />

              {statut === 'partiel' && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium">Montant payé (XOF)</label>
                  <input type="number" value={montantPaye} onChange={(e) => setMontantPaye(e.target.value)} max={cartTotal} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" placeholder="0" />
                  {parseFloat(montantPaye) > 0 && <p className="text-xs text-red-500">Reste dû : {formatCurrency(cartTotal - parseFloat(montantPaye))}</p>}
                </div>
              )}

              {(statut === 'credit' || statut === 'partiel') && selectedClientId && montantDu > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  <p className="text-xs text-red-600 font-medium">{formatCurrency(montantDu)} sera ajouté au crédit de {clients.find((c) => c.id === selectedClientId)?.name}</p>
                </div>
              )}

              {statut !== 'credit' && (
                <Select
                  label="Mode de paiement"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  options={[
                    { value: 'especes', label: 'Espèces' },
                    { value: 'mobile_money', label: 'Mobile Money' },
                    { value: 'carte', label: 'Carte bancaire' },
                  ]}
                />
              )}

              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Notes (optionnel)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </div>

              <Button className="w-full" onClick={handleSubmitSale} disabled={cart.length === 0 || isReadOnly} isLoading={submitting}>
                <Receipt className="h-4 w-4" /> Valider la vente
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setCart([])} disabled={cart.length === 0}>
                Vider le panier
              </Button>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
