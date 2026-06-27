// ============================================================
// QUINCAILLERIE PRO — Types TypeScript
// ============================================================
export type UserRole = 'admin' | 'caissier'
export interface Profile {
  id: string
  full_name: string
  role: UserRole
  created_at: string
  updated_at: string
}
export interface Category {
  id: string
  name: string
  created_at: string
}
export interface Product {
  id: string
  name: string
  reference: string
  category_id: string | null
  purchase_price: number
  selling_price: number
  stock_current: number
  stock_minimum: number
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined
  category?: Category
}
export type StockMovementType = 'entree' | 'sortie'
export interface StockMovement {
  id: string
  product_id: string
  type: StockMovementType
  quantity: number
  reason?: string
  reference?: string
  created_by?: string
  created_at: string
  // Joined
  product?: Product
  profile?: Profile
}
export type PaymentMethod = 'especes' | 'mobile_money' | 'carte'
export type SaleStatut = 'paye' | 'credit' | 'partiel'
export interface Sale {
  id: string
  reference: string
  total_amount: number
  payment_method: PaymentMethod
  notes?: string
  client_id?: string | null
  montant_paye?: number
  statut?: SaleStatut
  created_by?: string
  created_at: string
  // Joined
  sale_items?: SaleItem[]
  profile?: Profile
  client?: Client
}
export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
  // Joined
  product?: Product
}
export type ExpenseCategory = 'transport' | 'loyer' | 'divers'
export interface Expense {
  id: string
  category: ExpenseCategory
  description: string
  amount: number
  expense_date: string
  created_by?: string
  created_at: string
  // Joined
  profile?: Profile
}
export type JournalSourceType = 'vente' | 'depense' | 'manuel' | 'reglement_client' | 'reglement_fournisseur' | 'achat_fournisseur'
export interface JournalEntry {
  id: string
  entry_date: string
  reference: string
  label: string
  debit: number
  credit: number
  balance: number
  source_type?: JournalSourceType
  source_id?: string
  created_at: string
}

// ============================================================
// CLIENT
// ============================================================
export interface Client {
  id: string
  name: string
  phone?: string
  address?: string
  notes?: string
  solde: number
  created_by?: string
  created_at: string
  updated_at: string
}

export interface ReglementClient {
  id: string
  client_id: string
  sale_id?: string | null
  montant: number
  payment_method: PaymentMethod
  notes?: string
  reglement_date: string
  created_by?: string
  created_at: string
  // Joined
  client?: Client
}

// ============================================================
// FOURNISSEUR
// ============================================================
export interface Fournisseur {
  id: string
  name: string
  phone?: string
  address?: string
  notes?: string
  solde: number
  created_by?: string
  created_at: string
  updated_at: string
}

export interface AchatFournisseur {
  id: string
  fournisseur_id: string
  reference: string
  montant_total: number
  montant_paye: number
  notes?: string
  achat_date: string
  created_by?: string
  created_at: string
  // Joined
  fournisseur?: Fournisseur
}

export interface ReglementFournisseur {
  id: string
  fournisseur_id: string
  montant: number
  payment_method: PaymentMethod
  notes?: string
  reglement_date: string
  created_by?: string
  created_at: string
  // Joined
  fournisseur?: Fournisseur
}

// ============================================================
// DASHBOARD STATS
// ============================================================
export interface DashboardStats {
  revenue_today: number
  sales_count_today: number
  low_stock_count: number
  cash_balance: number
}

// ============================================================
// FORM TYPES
// ============================================================
export interface SaleCartItem {
  product: Product
  quantity: number
  unit_price: number
  total_price: number
}
export interface CreateSalePayload {
  items: SaleCartItem[]
  payment_method: PaymentMethod
  notes?: string
  client_id?: string | null
  montant_paye?: number
  statut?: SaleStatut
}
