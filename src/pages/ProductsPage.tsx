import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, Search, Package, FileDown, Lock, X, Layers } from 'lucide-react'
import {
  LoadingScreen, Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Badge, Modal, EmptyState, Card
} from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useProducts } from '@/hooks/useProducts'
import { useRole } from '@/hooks/useRole'
import { useSubscription } from '@/hooks/useSubscription'
import { useCommerceType } from '@/hooks/useCommerceType'
import { useProductUnits } from '@/hooks/useProductUnits'
import { useToast } from '@/store/toastStore'
import { formatCurrency } from '@/lib/utils'
import { pdfService } from '@/services/pdfService'
import type { Product } from '@/types'

const productSchema = z.object({
  name: z.string().min(2, 'Nom requis'),
  category_id: z.string().optional().nullable().transform(v => v === '' ? null : v),
  purchase_price: z.coerce.number().min(0, 'Prix invalide'),
  selling_price: z.coerce.number().min(0, 'Prix invalide'),
  stock_current: z.coerce.number().int().min(0, 'Stock invalide'),
  stock_minimum: z.coerce.number().int().min(0, 'Stock invalide'),
  base_unit: z.string().optional().default('Pièce'),
  is_active: z.boolean().default(true),
})
type ProductForm = z.infer<typeof productSchema>

function ProductUnitsManager({ product, onClose }: { product: Product; onClose: () => void }) {
  const { units, isLoading, createUnit, deleteUnit } = useProductUnits(product.id)
  const toast = useToast()
  const [newUnit, setNewUnit] = useState({ unit_name: '', conversion_rate: '', selling_price: '', is_base_unit: false })
  const [adding, setAdding] = useState(false)

  const handleAdd = async () => {
    if (!newUnit.unit_name || !newUnit.conversion_rate || !newUnit.selling_price) {
      toast.error('Erreur', 'Tous les champs sont obligatoires')
      return
    }
    setAdding(true)
    try {
      await createUnit({
        unit_name: newUnit.unit_name,
        conversion_rate: parseFloat(newUnit.conversion_rate),
        selling_price: parseFloat(newUnit.selling_price),
        is_base_unit: newUnit.is_base_unit,
      })
      setNewUnit({ unit_name: '', conversion_rate: '', selling_price: '', is_base_unit: false })
    } catch {
      toast.error('Erreur', 'Impossible d\'ajouter l\'unité')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-lg">Unités de vente</h2>
            <p className="text-sm text-muted-foreground">{product.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-orange-700 mb-1">Unité de base (stock)</p>
          <p className="text-sm font-bold">{product.base_unit || 'Pièce'}</p>
          <p className="text-xs text-orange-600 mt-1">
            Stock actuel : <strong>{product.stock_current} {product.base_unit || 'Pièce'}(s)</strong>
          </p>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Chargement...</p>
        ) : units.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Layers className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Aucune unité définie</p>
            <p className="text-xs mt-1">Ajoutez des unités de vente ci-dessous</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Unités de vente :</p>
            {units.map((unit) => (
              <div key={unit.id} className="flex items-center justify-between border rounded-lg px-3 py-2.5">
                <div>
                  <p className="text-sm font-semibold">{unit.unit_name}</p>
                  <p className="text-xs text-muted-foreground">
                    1 {unit.unit_name} = {unit.conversion_rate} {product.base_unit || 'Pièce'}(s)
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-bold text-emerald-600">{formatCurrency(unit.selling_price)}</p>
                  <button onClick={() => deleteUnit(unit.id)} className="p-1 hover:bg-red-50 rounded text-red-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t pt-4 space-y-3">
          <p className="text-sm font-medium text-slate-700">Ajouter une unité :</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1">Nom de l'unité *</label>
              <input
                type="text"
                value={newUnit.unit_name}
                onChange={(e) => setNewUnit({ ...newUnit, unit_name: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Ex: Pack, Carton, Sac"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Qté en {product.base_unit || 'Pièce'}(s) *
              </label>
              <input
                type="number"
                value={newUnit.conversion_rate}
                onChange={(e) => setNewUnit({ ...newUnit, conversion_rate: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Ex: 24"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1">Prix de vente (XOF) *</label>
              <input
                type="number"
                value={newUnit.selling_price}
                onChange={(e) => setNewUnit({ ...newUnit, selling_price: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Ex: 4500"
              />
            </div>
          </div>
          <Button
            className="w-full"
            onClick={handleAdd}
            isLoading={adding}
            disabled={!newUnit.unit_name || !newUnit.conversion_rate || !newUnit.selling_price}
          >
            <Plus className="h-4 w-4" /> Ajouter l'unité
          </Button>
        </div>
      </div>
    </div>
  )
}

function StockDisplay({ product }: { product: Product }) {
  const { units } = useProductUnits(product.id)

  if (units.length === 0 || product.stock_current === 0) {
    return (
      <Badge variant={product.stock_current === 0 ? 'danger' : product.stock_current <= product.stock_minimum ? 'warning' : 'success'}>
        {product.stock_current} {product.base_unit || 'Pcs'}
      </Badge>
    )
  }

  const sortedUnits = [...units].sort((a, b) => b.conversion_rate - a.conversion_rate)
  let remaining = product.stock_current
  const parts: string[] = []

  for (const unit of sortedUnits) {
    if (remaining >= unit.conversion_rate) {
      const qty = Math.floor(remaining / unit.conversion_rate)
      parts.push(`${qty} ${unit.unit_name}`)
      remaining = remaining % unit.conversion_rate
    }
  }

  if (remaining > 0) parts.push(`${remaining} ${product.base_unit || 'Pcs'}`)

  const isLow = product.stock_current <= product.stock_minimum

  return (
    <div className="space-y-0.5">
      <Badge variant={product.stock_current === 0 ? 'danger' : isLow ? 'warning' : 'success'}>
        {parts.join(' + ')}
      </Badge>
      <p className="text-xs text-muted-foreground">= {product.stock_current} {product.base_unit || 'pcs'}</p>
    </div>
  )
}

export default function ProductsPage() {
  const { products, categories, isLoading, createProduct, updateProduct, deleteProduct, createCategory } = useProducts()
  const { canManageProducts, canExportPDFRole } = useRole()
  const { canExportPDF, business } = useSubscription()
  const { isGrosDetail } = useCommerceType()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [unitsProduct, setUnitsProduct] = useState<Product | null>(null)
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [categorySubmitting, setCategorySubmitting] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ProductForm>({ resolver: zodResolver(productSchema) })

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.reference.toLowerCase().includes(search.toLowerCase())
      const matchCat = !filterCategory || p.category_id === filterCategory
      return matchSearch && matchCat
    })
  }, [products, search, filterCategory])

  const openCreate = () => {
    setEditProduct(null)
    setSelectedCategoryId('')
    setShowNewCategory(false)
    setNewCategoryName('')
    reset({
      name: '', category_id: null,
      purchase_price: 0, selling_price: 0,
      stock_current: 0, stock_minimum: 5,
      base_unit: 'Pièce', is_active: true,
    })
    setModalOpen(true)
  }

  const openEdit = (product: Product) => {
    setEditProduct(product)
    setSelectedCategoryId(product.category_id ?? '')
    setShowNewCategory(false)
    setNewCategoryName('')
    reset({
      name: product.name,
      category_id: product.category_id ?? null,
      purchase_price: product.purchase_price,
      selling_price: product.selling_price,
      stock_current: product.stock_current,
      stock_minimum: product.stock_minimum,
      base_unit: product.base_unit || 'Pièce',
      is_active: product.is_active,
    })
    setModalOpen(true)
  }

  const onSubmit = async (data: ProductForm) => {
    setSubmitting(true)
    try {
      const payload = {
        ...data,
        reference: editProduct?.reference ?? '',
        category_id: selectedCategoryId || null,
      }
      if (editProduct) {
        await updateProduct(editProduct.id, payload)
      } else {
        await createProduct(payload)
      }
      setModalOpen(false)
    } catch {
      toast.error('Erreur', 'Impossible de créer le produit.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return
    setCategorySubmitting(true)
    try {
      const category = await createCategory(newCategoryName.trim())
      setSelectedCategoryId(category.id)
      setValue('category_id', category.id)
      setShowNewCategory(false)
      setNewCategoryName('')
    } catch {
    } finally {
      setCategorySubmitting(false)
    }
  }

  const handleExportStock = () => {
    pdfService.exportStock(filtered, business?.name ?? 'Mon Commerce')
  }

  const canExport = canExportPDF && canExportPDFRole

  if (isLoading) return <LoadingScreen text="Chargement des produits..." />

  return (
    <div className="space-y-5">
      <div className="page-header flex-wrap gap-3">
        <div>
          <h1 className="page-title">Produits</h1>
          <p className="text-sm text-muted-foreground">{products.length} produit(s)</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canExport ? (
            <Button variant="outline" onClick={handleExportStock} disabled={filtered.length === 0} title="Rapport PDF">
              <FileDown className="h-4 w-4" />
              <span className="hidden sm:inline">Rapport PDF</span>
            </Button>
          ) : (
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 text-slate-400 text-sm cursor-not-allowed" title="Fonctionnalité Pro">
              <Lock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">PDF (Pro)</span>
            </button>
          )}
          {canManageProducts && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nouveau produit</span>
              <span className="sm:hidden">Nouveau</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher par nom ou référence..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-full sm:w-48"
          >
            <option value="">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Aucun produit trouvé"
            description={search ? 'Essayez un autre terme de recherche' : 'Commencez par créer un produit'}
            action={canManageProducts ? <Button onClick={openCreate}><Plus className="h-4 w-4" /> Créer un produit</Button> : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead className="text-right">Prix achat</TableHead>
                <TableHead className="text-right">Prix vente</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                {isGrosDetail && <TableHead className="text-center">Unités</TableHead>}
                <TableHead>Statut</TableHead>
                {canManageProducts && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const isLow = p.stock_current <= p.stock_minimum
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{p.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{p.reference}</p>
                        {isGrosDetail && p.base_unit && (
                          <p className="text-xs text-orange-500 font-medium">Base: {p.base_unit}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.category?.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(p.purchase_price)}</TableCell>
                    <TableCell className="text-right text-sm font-semibold">{formatCurrency(p.selling_price)}</TableCell>
                    <TableCell className="text-right">
                      {isGrosDetail ? (
                        <StockDisplay product={p} />
                      ) : (
                        <Badge variant={p.stock_current === 0 ? 'danger' : isLow ? 'warning' : 'success'}>
                          {p.stock_current} {p.base_unit || ''}
                        </Badge>
                      )}
                    </TableCell>
                    {isGrosDetail && (
                      <TableCell className="text-center">
                        <button
                          onClick={() => setUnitsProduct(p)}
                          className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 hover:underline mx-auto"
                        >
                          <Layers className="h-3.5 w-3.5" />
                          Unités
                        </button>
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant={p.is_active ? 'success' : 'outline'}>
                        {p.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    {canManageProducts && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-muted transition-colors">
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                          <button onClick={() => setDeleteConfirm(p)} className="p-1.5 rounded hover:bg-red-50 transition-colors">
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Modal unités */}
      {unitsProduct && (
        <ProductUnitsManager
          product={unitsProduct}
          onClose={() => setUnitsProduct(null)}
        />
      )}

      {/* Create/Edit Modal */}
      {canManageProducts && (
        <Modal
          open={modalOpen}
          onClose={() => { setModalOpen(false); setShowNewCategory(false); setNewCategoryName('') }}
          title={editProduct ? 'Modifier le produit' : 'Nouveau produit'}
          size="lg"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Input label="Nom du produit" error={errors.name?.message} required {...register('name')} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-foreground">Catégorie</label>
                  <button
                    type="button"
                    onClick={() => setShowNewCategory(!showNewCategory)}
                    className="text-xs text-orange-500 hover:underline flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Nouvelle catégorie
                  </button>
                </div>
                {showNewCategory && (
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Nom de la catégorie..."
                      className="flex-1 h-8 rounded-md border border-orange-300 bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-400"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      disabled={categorySubmitting || !newCategoryName.trim()}
                      className="h-8 px-3 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-xs font-medium disabled:opacity-50 transition-colors"
                    >
                      {categorySubmitting ? '...' : 'Créer'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowNewCategory(false); setNewCategoryName('') }}
                      className="h-8 w-8 flex items-center justify-center hover:bg-muted rounded-md"
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                )}
                <select
                  value={selectedCategoryId}
                  onChange={(e) => {
                    setSelectedCategoryId(e.target.value)
                    setValue('category_id', e.target.value || null)
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Sans catégorie</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              {isGrosDetail && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Unité de base <span className="text-xs text-muted-foreground">(ex: Pièce, Kg, Litre, Sachet)</span>
                  </label>
                  <input
                    type="text"
                    {...register('base_unit')}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Pièce"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Le stock sera géré en cette unité. Les autres unités (Pack, Carton...) seront définies après.
                  </p>
                </div>
              )}
              <Input label="Prix d'achat (XOF)" type="number" step="1" error={errors.purchase_price?.message} required {...register('purchase_price')} />
              <Input
                label={isGrosDetail ? `Prix vente unité de base (XOF)` : 'Prix de vente (XOF)'}
                type="number" step="1"
                error={errors.selling_price?.message}
                required
                {...register('selling_price')}
              />
              <Input label="Stock actuel" type="number" error={errors.stock_current?.message} required {...register('stock_current')} />
              <Input label="Stock minimum" type="number" error={errors.stock_minimum?.message} required {...register('stock_minimum')} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_active" {...register('is_active')} className="rounded border-input" />
              <label htmlFor="is_active" className="text-sm">Produit actif</label>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" isLoading={submitting} className="flex-1">
                {editProduct ? 'Mettre à jour' : 'Créer le produit'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Annuler
              </Button>
            </div>
            {isGrosDetail && !editProduct && (
              <p className="text-xs text-center text-muted-foreground">
                💡 Après création, cliquez sur "Unités" pour ajouter Pack, Carton, etc.
              </p>
            )}
          </form>
        </Modal>
      )}

      {/* Delete confirmation */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Désactiver le produit"
        size="sm"
      >
        <p className="text-sm text-muted-foreground mb-4">
          Voulez-vous désactiver <strong>{deleteConfirm?.name}</strong> ?
          Le produit ne sera plus visible dans les ventes.
        </p>
        <div className="flex gap-2">
          <Button
            variant="destructive"
            className="flex-1"
            onClick={async () => {
              if (deleteConfirm) {
                await deleteProduct(deleteConfirm.id)
                setDeleteConfirm(null)
              }
            }}
          >
            Désactiver
          </Button>
          <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Annuler</Button>
        </div>
      </Modal>
    </div>
  )
}
