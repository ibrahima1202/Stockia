import { useState } from 'react'
import { Plus, Minus, Warehouse, ArrowUp, ArrowDown, Lock } from 'lucide-react'
import {
  LoadingScreen, Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Badge, EmptyState, Card
} from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { useStocks } from '@/hooks/useStocks'
import { useProducts } from '@/hooks/useProducts'
import { useRole } from '@/hooks/useRole'
import { useCommerceType } from '@/hooks/useCommerceType'
import { useProductUnits } from '@/hooks/useProductUnits'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { useToast } from '@/store/toastStore'
import type { ProductUnit } from '@/types'

// Sélecteur d'unité pour les mouvements de stock
function StockUnitSelector({
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
    <p className="text-xs text-muted-foreground mt-1">Unité : {baseUnit || 'Pièce'}</p>
  )

  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-slate-600">Unité</label>
      <select
        value={selectedUnitId}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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

export default function StocksPage() {
  const { movements, isLoading, addMovement } = useStocks()
  const { products } = useProducts()
  const { canManageStock } = useRole()
  const { isGrosDetail } = useCommerceType()
  const toast = useToast()

  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    product_id: '',
    type: 'entree' as 'entree' | 'sortie',
    quantity: 1,
    reason: '',
  })
  const [selectedUnit, setSelectedUnit] = useState<ProductUnit | null>(null)
  const [conversionRate, setConversionRate] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  const activeProducts = products.filter((p) => p.is_active)
  const selectedProduct = products.find((p) => p.id === formData.product_id)

  // Quantité en unité de base
  const quantityInBase = formData.quantity * conversionRate

  const handleProductChange = (productId: string) => {
    setFormData({ ...formData, product_id: productId })
    setSelectedUnit(null)
    setConversionRate(1)
  }

  const handleSubmit = async () => {
    if (!formData.product_id || formData.quantity < 1) return
    setSubmitting(true)
    try {
      const unitLabel = selectedUnit
        ? `${formData.quantity} ${selectedUnit.unit_name} (${quantityInBase} ${selectedProduct?.base_unit || 'pcs'})`
        : null

      await addMovement(
        formData.product_id,
        formData.type,
        quantityInBase, // toujours en unité de base
        formData.reason + (unitLabel ? ` — ${unitLabel}` : ''),
      )
      setShowForm(false)
      setFormData({ product_id: '', type: 'entree', quantity: 1, reason: '' })
      setSelectedUnit(null)
      setConversionRate(1)
      toast.success('Mouvement enregistré')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur'
      toast.error('Erreur', msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading) return <LoadingScreen text="Chargement des stocks..." />

  if (!canManageStock) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
          <Lock className="h-10 w-10 text-red-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Accès non autorisé</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Vous n'avez pas les permissions pour gérer le stock.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Mouvements de stock</h1>
          <p className="text-sm text-muted-foreground">{movements.length} mouvement(s)</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" /> Nouveau mouvement
        </Button>
      </div>

      {/* Résumé stock actuel */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Produits actifs</p>
          <p className="text-2xl font-bold mt-1">{activeProducts.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Stock faible</p>
          <p className="text-2xl font-bold text-orange-500 mt-1">
            {activeProducts.filter((p) => p.stock_current <= p.stock_minimum && p.stock_current > 0).length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rupture</p>
          <p className="text-2xl font-bold text-red-500 mt-1">
            {activeProducts.filter((p) => p.stock_current === 0).length}
          </p>
        </Card>
      </div>

      {/* Table mouvements */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        {movements.length === 0 ? (
          <EmptyState icon={Warehouse} title="Aucun mouvement" description="Les entrées et sorties de stock apparaîtront ici" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-center">Quantité</TableHead>
                <TableHead>Motif</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((mv) => (
                <TableRow key={mv.id}>
                  <TableCell>
                    <p className="font-medium text-sm">{mv.product?.name ?? '—'}</p>
                    <p className="text-xs font-mono text-muted-foreground">{mv.product?.reference}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={mv.type === 'entree' ? 'success' : 'danger'}>
                      <span className="flex items-center gap-1">
                        {mv.type === 'entree' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                        {mv.type === 'entree' ? 'Entrée' : 'Sortie'}
                      </span>
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-bold">
                    <span className={mv.type === 'entree' ? 'text-emerald-600' : 'text-red-500'}>
                      {mv.type === 'entree' ? '+' : '-'}{mv.quantity}
                    </span>
                    {mv.product?.base_unit && (
                      <span className="text-xs text-muted-foreground ml-1">{mv.product.base_unit}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{mv.reason ?? '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDateTime(mv.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Modal nouveau mouvement */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-semibold text-lg">Nouveau mouvement de stock</h2>
            <div className="space-y-3">

              {/* Produit */}
              <div>
                <label className="block text-sm font-medium mb-1">Produit *</label>
                <select
                  value={formData.product_id}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Sélectionner un produit...</option>
                  {activeProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (stock: {p.stock_current} {p.base_unit || 'pcs'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sélecteur unité — uniquement pour gros & détail */}
              {formData.product_id && isGrosDetail && selectedProduct && (
                <StockUnitSelector
                  productId={formData.product_id}
                  baseUnit={selectedProduct.base_unit}
                  onSelect={(unit, rate) => {
                    setSelectedUnit(unit)
                    setConversionRate(rate)
                  }}
                />
              )}

              {/* Type mouvement */}
              <div>
                <label className="block text-sm font-medium mb-1">Type *</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFormData({ ...formData, type: 'entree' })}
                    className={`flex-1 py-2 rounded-md text-sm font-medium border-2 transition-colors flex items-center justify-center gap-1.5 ${
                      formData.type === 'entree' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <ArrowUp className="h-4 w-4" /> Entrée
                  </button>
                  <button
                    onClick={() => setFormData({ ...formData, type: 'sortie' })}
                    className={`flex-1 py-2 rounded-md text-sm font-medium border-2 transition-colors flex items-center justify-center gap-1.5 ${
                      formData.type === 'sortie' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <ArrowDown className="h-4 w-4" /> Sortie
                  </button>
                </div>
              </div>

              {/* Quantité */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Quantité {selectedUnit ? `(${selectedUnit.unit_name})` : selectedProduct?.base_unit ? `(${selectedProduct.base_unit})` : ''} *
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFormData({ ...formData, quantity: Math.max(1, formData.quantity - 1) })}
                    className="h-9 w-9 rounded-md border border-input flex items-center justify-center hover:bg-muted"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    onFocus={(e) => e.target.select()}
                    className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <button
                    onClick={() => setFormData({ ...formData, quantity: formData.quantity + 1 })}
                    className="h-9 w-9 rounded-md border border-input flex items-center justify-center hover:bg-muted"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {/* Conversion automatique */}
                {selectedUnit && conversionRate > 1 && (
                  <div className="mt-2 bg-orange-50 border border-orange-200 rounded-md px-3 py-2">
                    <p className="text-xs text-orange-700 font-medium">
                      {formData.quantity} {selectedUnit.unit_name}(s)
                      = <strong>{quantityInBase} {selectedProduct?.base_unit || 'pcs'}</strong>
                      {formData.type === 'entree' ? ' seront ajoutés' : ' seront déduits'} du stock
                    </p>
                  </div>
                )}
              </div>

              {/* Motif */}
              <div>
                <label className="block text-sm font-medium mb-1">Motif</label>
                <input
                  type="text"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Ex: Réception commande, Perte, Correction inventaire..."
                />
              </div>

              {/* Résumé */}
              {formData.product_id && selectedProduct && (
                <div className="bg-slate-50 rounded-md px-3 py-2 text-xs space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Stock actuel</span>
                    <span className="font-medium">{selectedProduct.stock_current} {selectedProduct.base_unit || 'pcs'}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Après mouvement</span>
                    <span className={formData.type === 'entree' ? 'text-emerald-600' : 'text-red-500'}>
                      {formData.type === 'entree'
                        ? selectedProduct.stock_current + quantityInBase
                        : Math.max(0, selectedProduct.stock_current - quantityInBase)
                      } {selectedProduct.base_unit || 'pcs'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => {
                setShowForm(false)
                setSelectedUnit(null)
                setConversionRate(1)
              }}>
                Annuler
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmit}
                isLoading={submitting}
                disabled={!formData.product_id}
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
