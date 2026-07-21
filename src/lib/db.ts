import Dexie, { type EntityTable } from 'dexie'

// Cache local des produits (lecture hors ligne, Étape 1)
export interface CachedProduct {
  id: string
  business_id: string
  name: string
  reference: string
  selling_price: number
  purchase_price: number
  stock_current: number
  stock_minimum: number
  base_unit: string | null
  category_id: string | null
  is_active: boolean
  updated_at: string
  cached_at: number // timestamp local de mise en cache
}

// File d'attente générique pour les écritures effectuées hors ligne (Étape 2+)
export type SyncOperation = 'insert' | 'update' | 'delete'

export interface SyncQueueItem {
  id?: number // auto-incrémenté par Dexie
  table_name: string
  operation: SyncOperation
  payload: Record<string, unknown>
  client_uuid: string // UUID généré côté client pour idempotence
  business_id: string
  created_at: number
  retries: number
  last_error: string | null
}

class StockamDatabase extends Dexie {
  products!: EntityTable<CachedProduct, 'id'>
  syncQueue!: EntityTable<SyncQueueItem, 'id'>

  constructor() {
    super('stockam-offline')
    this.version(1).stores({
      products: 'id, business_id, reference, name',
      syncQueue: '++id, table_name, business_id, created_at',
    })
  }
}

export const db = new StockamDatabase()
