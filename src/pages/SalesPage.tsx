import { useState, useMemo } from 'react'
import { Plus, Minus, Trash2, ShoppingCart, Receipt, Pencil, XCircle } from 'lucide-react'
import {
  LoadingScreen, Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Badge, EmptyState, Card
} from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { useSales } from '@/hooks/useSales'
import { useProducts } from '@/hooks/useProducts'
import { formatCurrency, formatDateTime, formatPaymentMethod } from '@/lib/utils'
import type { Sale, SaleCartItem, PaymentMethod } from '@/types'
import { useToast } from '@/store/toastStore'

export default function SalesPage() {
  const { sales, isLoading, createSale, deleteSale, updateSale } = useSales()
  const { products } = useProducts()
  const toast = useToast()

  const [cart, setCart] = useState<SaleCartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('especes')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'list' | 'new'>('list')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [qty, setQty] = useState(1)

  // Annulation
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  // Modification
  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethod>('especes')
  const [editNotes, setEditNotes] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)

  const activeProducts = useMemo(
    () => products.filter((p) => p.is_active && p.stock_current > 0),
    [products]
  )

  const cartTotal = cart.reduce((sum, item) => sum + item.total_price, 0)

  const addToCart = () => {
    const product = products.find((p) => p.id === selectedProductId)
    if (!product) return
    if (qty < 1) return
    if (qty > product.stock_current) {
      toast.error('Stock insuffisant', `Maximum disponible: ${product.stock_current}`)
      return
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + qty, total_price: (i.quantity + qty) * i.unit_price }
            : i
        )
      }
      return [
        ...prev,
        {
          product,
          quantity: qty,
          unit_price: product.selling_price,
          total_price: qty * product.selling_price,
        },
      ]
    })
    setSelectedProductId('')
    setQty(1)
  }

  const updateQty = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId)
      return
    }
    setCart((prev) =>
      prev.map((i) =>
        i.product.id === productId
          ? { ...i, quantity: newQty, total_price: newQty * i.unit_price }
          : i
      )
    )
  }

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId))
  }

  const handleSubmitSale = async () => {
    if (cart.length === 0) return
    setSubmitting(true)
    try {
      await createSale({ items: cart, payment_method: paymentMethod, notes })
      setCart([])
      setNotes('')
      setPaymentMethod('especes')
      setActiveTab('list')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelSale = async (id: string) => {
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
      await updateSale(editingSale.id, {
        payment_method: editPaymentMethod,
        notes: editNotes,
      })
      toast.success('Vente modifiée', 'Les informations ont été mises à jour')
      setEditingSale(null)
    } catch {
      toast.error('Erreur', 'Impossible de modifier cette vente')
    } finally {
      setEditSubmitting(false)
    }
  }

  if (isLoading) return <LoadingScreen text="Chargement des ventes..." />

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Ventes</h1>
          <p className="text-sm text-muted-foreground">{sales.length} vente(s)</p>
        </div>
        <Button onClick={() => setActiveTab('new')}>
          <Plus className="h-4 w-4" /> Nouvelle vente
        </Button>
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
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'list' && (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          {sales.length === 0 ? (
            <EmptyState icon={Receipt} title="Aucune vente" description="Les ventes apparaîtront ici" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Articles</TableHead>
                  <TableHead>Paiement</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-mono text-xs">{sale.reference}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(sale.created_at)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {sale.sale_items?.length ?? 0} article(s)
                    </TableCell>
                    <TableCell>
                      <Badge variant="info">{formatPaymentMethod(sale.payment_method)}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">
                      {formatCurrency(sale.total_amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => openEditModal(sale)}
                          className="p-1.5 hover:bg-blue-50 rounded text-blue-500"
                          title="Modifier"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleCancelSale(sale.id)}
                          disabled={cancellingId === sale.id}
                          className="p-1.5 hover:bg-red-50 rounded text-red-400"
                          title="Annuler"
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
                  {item.product?.name} × {item.quantity} — {formatCurrency(item.total_price)}
                </p>
              ))}
              <p className="text-sm font-bold text-emerald-600 mt-1 pt-1 border-t">
                Total : {formatCurrency(editingSale.total_amount)}
              </p>
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
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setEditingSale(null)}
              >
                Annuler
              </Button>
              <Button
                className="flex-1"
                onClick={handleUpdateSale}
                isLoading={editSubmitting}
              >
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'new' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-4">
              <h3 className="font-medium text-sm mb-3">Ajouter un produit</h3>
              <div className="flex gap-2">
                <div className="flex-1">
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Sélectionner un produit...</option>
                    {activeProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {formatCurrency(p.selling_price)} (stock: {p.stock_current})
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(parseInt(e.target.value) || 1)}
                  className="w-20 h-9 rounded-md border border-input bg-background px-3 text-sm text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <Button onClick={addToCart} disabled={!selectedProductId}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </Card>

            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
              {cart.length === 0 ? (
                <EmptyState icon={ShoppingCart} title="Panier vide" description="Ajoutez des produits pour créer une vente" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead className="text-right">Prix unit.</TableHead>
                      <TableHead className="text-center">Quantité</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((item) => (
                      <TableRow key={item.product.id}>
                        <TableCell>
                          <p className="font-medium text-sm">{item.product.name}</p>
                          <p className="text-xs font-mono text-muted-foreground">{item.product.reference}</p>
                        </TableCell>
                        <TableCell className="text-right text-sm">{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => updateQty(item.product.id, item.quantity - 1)}
                              className="h-6 w-6 rounded border flex items-center justify-center hover:bg-muted"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                            <button
                              onClick={() => updateQty(item.product.id, item.quantity + 1)}
                              className="h-6 w-6 rounded border flex items-center justify-center hover:bg-muted"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(item.total_price)}</TableCell>
                        <TableCell>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="p-1 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <Card className="p-4 space-y-4">
              <h3 className="font-semibold">Récapitulatif</h3>
              <div className="flex items-center justify-between py-2 border-t border-b">
                <span className="text-sm font-medium">Total</span>
                <span className="text-xl font-bold text-emerald-600">{formatCurrency(cartTotal)}</span>
              </div>
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
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Notes (optionnel)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleSubmitSale}
                disabled={cart.length === 0}
                isLoading={submitting}
              >
                <Receipt className="h-4 w-4" />
                Valider la vente
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setCart([])}
                disabled={cart.length === 0}
              >
                Vider le panier
              </Button>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
        }
