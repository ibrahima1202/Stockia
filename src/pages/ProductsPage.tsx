import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, Search, Package, FileDown, Lock } from 'lucide-react'
import {
  LoadingScreen, Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Badge, Modal, EmptyState, Card
} from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useProducts } from '@/hooks/useProducts'
import { useAuthStore } from '@/store/authStore'
import { useSubscription } from '@/hooks/useSubscription'
import { formatCurrency } from '@/lib/utils'
import { pdfService } from '@/services/pdfService'
import type { Product } from '@/types'

const productSchema = z.object({
  name: z.string().min(2, 'Nom requis'),
  reference: z.string().min(1, 'Référence requise'),
  category_id: z.string().nullable().optional(),
  purchase_price: z.coerce.number().min(0, 'Prix invalide'),
  selling_price: z.coerce.number().min(0, 'Prix invalide'),
  stock_current: z.coerce.number().int().min(0, 'Stock invalide'),
  stock_minimum: z.coerce.number().int().min(0, 'Stock invalide'),
  is_active: z.boolean().default(true),
})
type ProductForm = z.infer<typeof productSchema>

export default function ProductsPage() {
  const { products, categories, isLoading, createProduct, updateProduct, deleteProduct } = useProducts()
  const { profile } = useAuthStore()
  const { canExportPDF, business } = useSubscription()
  const isAdmin = profile?.role === 'admin'

  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
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
    reset({
      name: '', reference: '', category_id: null,
      purchase_price: 0, selling_price: 0,
      stock_current: 0, stock_minimum: 5, is_active: true,
    })
    setModalOpen(true)
  }

  const openEdit = (product: Product) => {
    setEditProduct(product)
    reset({
      name: product.name,
      reference: product.reference,
      category_id: product.category_id ?? undefined,
      purchase_price: product.purchase_price,
      selling_price: product.selling_price,
      stock_current: product.stock_current,
      stock_minimum: product.stock_minimum,
      is_active: product.is_active,
    })
    setModalOpen(true)
  }

  const onSubmit = async (data: ProductForm) => {
    setSubmitting(true)
    try {
      const payload = { ...data, category_id: data.category_id || null }
      if (editProduct) {
        await updateProduct(editProduct.id, payload)
      } else {
        await createProduct(payload)
      }
      setModalOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  const handleExportStock = () => {
    pdfService.exportStock(filtered, business?.name ?? 'Mon Commerce')
  }

  if (isLoading) return <LoadingScreen text="Chargement des produits..." />

  return (
    <div className="space-y-5">
      <div className="page-header flex-wrap gap-3">
        <div>
          <h1 className="page-title">Produits</h1>
          <p className="text-sm text-muted-foreground">{products.length} produit(s)</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canExportPDF ? (
            <Button
              variant="outline"
              onClick={handleExportStock}
              disabled={filtered.length === 0}
              title="Rapport PDF"
            >
              <FileDown className="h-4 w-4" />
              <span className="hidden sm:inline">Rapport PDF</span>
            </Button>
          ) : (
            <button
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 text-slate-400 text-sm cursor-not-allowed"
              title="Fonctionnalité Pro"
            >
              <Lock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">PDF (Pro)</span>
            </button>
          )}
          {isAdmin && (
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
            action={isAdmin ? <Button onClick={openCreate}><Plus className="h-4 w-4" /> Créer un produit</Button> : undefined}
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
                <TableHead>Statut</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
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
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.category?.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(p.purchase_price)}</TableCell>
                    <TableCell className="text-right text-sm font-semibold">{formatCurrency(p.selling_price)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={p.stock_current === 0 ? 'danger' : isLow ? 'warning' : 'success'}>
                        {p.stock_current}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.is_active ? 'success' : 'outline'}>
                        {p.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
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

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editProduct ? 'Modifier le produit' : 'Nouveau produit'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="Nom du produit" error={errors.name?.message} required {...register('name')} />
            </div>
            <Input label="Référence" error={errors.reference?.message} required {...register('reference')} />
            <Select
              label="Catégorie"
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Sélectionner..."
              {...register('category_id')}
            />
            <Input label="Prix d'achat (XOF)" type="number" step="1" error={errors.purchase_price?.message} required {...register('purchase_price')} />
            <Input label="Prix de vente (XOF)" type="number" step="1" error={errors.selling_price?.message} required {...register('selling_price')} />
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
        </form>
      </Modal>

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
