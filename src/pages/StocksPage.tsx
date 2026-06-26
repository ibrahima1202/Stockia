import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Minus, ArrowUpDown, AlertTriangle } from 'lucide-react'
import {
  LoadingScreen, Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Badge, Modal
} from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useStocks } from '@/hooks/useStocks'
import { useProducts } from '@/hooks/useProducts'
import { formatDateTime } from '@/lib/utils'
import type { StockMovementType } from '@/types'

const movementSchema = z.object({
  product_id: z.string().min(1, 'Produit requis'),
  type: z.enum(['entree', 'sortie']),
  quantity: z.coerce.number().int().min(1, 'Quantité invalide'),
  reason: z.string().optional(),
})
type MovementForm = z.infer<typeof movementSchema>

export default function StocksPage() {
  const { movements, isLoading: loadingMovements, reload, addMovement } = useStocks()
  const { products, isLoading: loadingProducts } = useProducts()
  const [modalOpen, setModalOpen] = useState(false)
  const [defaultType, setDefaultType] = useState<StockMovementType>('entree')
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'movements' | 'alerts'>('movements')

  const { register, handleSubmit, reset, formState: { errors } } = useForm<MovementForm>({
    resolver: zodResolver(movementSchema),
  })

  const lowStockProducts = useMemo(
    () => products.filter((p) => p.stock_current <= p.stock_minimum && p.is_active),
    [products]
  )

  const openModal = (type: StockMovementType) => {
    setDefaultType(type)
    reset({ type, product_id: '', quantity: 1, reason: '' })
    setModalOpen(true)
  }

  const onSubmit = async (data: MovementForm) => {
    setSubmitting(true)
    try {
      await addMovement(data.product_id, data.type, data.quantity, data.reason)
      setModalOpen(false)
      reload()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur'
      alert(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingMovements || loadingProducts) return <LoadingScreen text="Chargement des stocks..." />

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestion des stocks</h1>
          <p className="text-sm text-muted-foreground">{movements.length} mouvement(s)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openModal('sortie')}>
            <Minus className="h-4 w-4" /> Sortie
          </Button>
          <Button onClick={() => openModal('entree')}>
            <Plus className="h-4 w-4" /> Entrée
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab('movements')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'movements'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ArrowUpDown className="h-3.5 w-3.5 inline mr-1.5" />
          Historique des mouvements
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'alerts'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Alertes stock faible
          {lowStockProducts.length > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
              {lowStockProducts.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'movements' && (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Quantité</TableHead>
                <TableHead>Motif</TableHead>
                <TableHead>Référence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(m.created_at)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{(m.product as { name: string } | undefined)?.name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground font-mono">{(m.product as { reference: string } | undefined)?.reference ?? ''}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.type === 'entree' ? 'success' : 'warning'}>
                      {m.type === 'entree' ? '↑ Entrée' : '↓ Sortie'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {m.type === 'entree' ? '+' : '-'}{m.quantity}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.reason ?? '—'}</TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{m.reference ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          {lowStockProducts.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-emerald-600 font-medium">✓ Tous les stocks sont suffisants</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead className="text-right">Stock actuel</TableHead>
                  <TableHead className="text-right">Stock minimum</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockProducts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{p.name}</p>
                        <p className="text-xs font-mono text-muted-foreground">{p.reference}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.category?.name ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={p.stock_current === 0 ? 'danger' : 'warning'}>
                        {p.stock_current}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">{p.stock_minimum}</TableCell>
                    <TableCell>
                      <Badge variant={p.stock_current === 0 ? 'danger' : 'warning'}>
                        {p.stock_current === 0 ? 'Rupture' : 'Faible'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {/* Movement Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={defaultType === 'entree' ? 'Entrée de stock' : 'Sortie de stock'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select
            label="Produit"
            required
            error={errors.product_id?.message}
            options={products
              .filter((p) => p.is_active)
              .map((p) => ({ value: p.id, label: `${p.name} (Stock: ${p.stock_current})` }))}
            placeholder="Sélectionner un produit..."
            {...register('product_id')}
          />
          <Select
            label="Type de mouvement"
            required
            options={[
              { value: 'entree', label: '↑ Entrée de stock' },
              { value: 'sortie', label: '↓ Sortie de stock' },
            ]}
            {...register('type')}
          />
          <Input
            label="Quantité"
            type="number"
            min="1"
            required
            error={errors.quantity?.message}
            {...register('quantity')}
          />
          <Input
            label="Motif (optionnel)"
            placeholder="Ex: Réapprovisionnement fournisseur..."
            {...register('reason')}
          />
          <div className="flex gap-2 pt-2">
            <Button type="submit" isLoading={submitting} className="flex-1">
              Enregistrer
            </Button>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
