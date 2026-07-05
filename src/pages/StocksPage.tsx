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
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { useToast } from '@/store/toastStore'

export default function StocksPage() {
  const { movements, isLoading, addMovement } = useStocks()
  const { products } = useProducts()
  const { canManageStock } = useRole()
  const toast = useToast()

  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    product_id: '',
    type: 'entree' as 'entree' | 'sortie',
    quantity: 1,
    reason: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const activeProducts = products.filter((p) => p.is_active)

  const handleSubmit = async () => {
    if (!formData.product_id || formData.quantity < 1) return
    setSubmitting(true)
    try {
      await addMovement(
        formData.product_id,
        formData.type,
        formData.quantity,
        formData.reason
      )
      setShowForm(false)
      setFormData({ product_id: '', type: 'entree', quantity: 1, reason: '' })
      toast.success('Mouvement enregistré')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur'
      toast.error('Erreur', msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading) return <LoadingScreen text="Chargement des stocks..." />

  // Blocage par rôle
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
              <div>
                <label className="block text-sm font-medium mb-1">Produit *</label>
                <select
                  value={formData.product_id}
                  onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Sélectionner un produit...</option>
                  {activeProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (stock actuel: {p.stock_current})
                    </option>
                  ))}
                </select>
              </div>
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
              <div>
                <label className="block text-sm font-medium mb-1">Quantité *</label>
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
                    className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <button
                    onClick={() => setFormData({ ...formData, quantity: formData.quantity + 1 })}
                    className="h-9 w-9 rounded-md border border-input flex items-center justify-center hover:bg-muted"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Motif</label>
                <input
                  type="text"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Ex: Réception commande, Perte, Correction..."
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
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
