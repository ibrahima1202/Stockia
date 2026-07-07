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

// Composant pour gérer les unités d'un produit
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

        {/* Unité de base */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-orange-700 mb-1">Unité de base (stock)</p>
          <p className="text-sm font-bold">{product.base_unit || 'Pièce'}</p>
          <p className="text-xs text-orange-600 mt-1">
            Stock actuel : <strong>{product.stock_current} {product.base_unit || 'Pièce'}(s)</strong>
          </p>
        </div>

        {/* Liste des unités */}
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
                  <button
                    onClick={() => deleteUnit(unit.id)}
                    className="p-1 hover:bg-red-50 rounded text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Ajouter une unité */}
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

export default function ProductsPage() {
  const { products, categories, isLoading, createProduct, updateProduct, deleteProduct, createCategory } = useProducts()
  const { canManageProducts, canExportPDFRole } = useRole()
  const { canExportPDF, business } = useSubscription()
  const { isGrosDetail } = useCommerceType()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const
