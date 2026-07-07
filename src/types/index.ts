// ============================================================
// QUINCAILLERIE PRO — Types TypeScript
// ============================================================
export type UserRole = 'admin' | 'caissier' | 'magasinier' | 'promoteur'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  business_id?: string | null
  is_active?: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  created_at: string
}

export interface ProductUnit {
  id: string
  product_id: string
  business_id: string
  unit_name: string
  conversion_rate: number
  selling_price: number
  is_base_unit: boolean
  is_active: boolean
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
  base_unit?: string
  created_at: string
  updated_at: string
  category?: Category
  units?: ProductUnit[]
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
  product?: Product
  profile?: Profile
}

export type PaymentMethod = 'especes' | 'mobile_money' | 'carte'
export type SaleStatut = 'paye' | 'credit' | 'partiel'

export interface Sale {
  id: string
  reference: string
  total_amount: number
  discount_amount?: number
  payment_method: PaymentMethod
  notes?: string
  client_id?: string | null
  montant_paye?: number
  statut?: SaleStatut
  created_by?: string
  created_at: string
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
  unit_id?: string | null
  unit_name?: string | null
  conversion_rate?: number
  quantity_in_base?: number
  discount_amount?: number
  total_price: number
  created_at: string
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

export interface ReglementFournisseur {
  id: string
  fournisseur_id: string
  montant: number
  payment_method: PaymentMethod
  notes?: string
  reglement_date: string
  created_by?: string
  created_at: string
  fournisseur?: Fournisseur
}

export interface AchatItem {
  id: string
  achat_id: string
  product_id: string
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
  product?: Product
}

export type AchatStatut = 'comptant' | 'credit' | 'partiel'

export interface AchatFournisseur {
  id: string
  fournisseur_id: string
  reference: string
  montant_total: number
  montant_paye: number
  statut: AchatStatut
  payment_method?: PaymentMethod
  notes?: string
  achat_date: string
  created_by?: string
  created_at: string
  fournisseur?: Fournisseur
  achat_items?: AchatItem[]
}

export interface AchatCartItem {
  product: Product
  quantity: number
  unit_price: number
  total_price: number
}

export interface CreateAchatPayload {
  fournisseur_id: string
  items: AchatCartItem[]
  statut: AchatStatut
  montant_paye?: number
  payment_method?: PaymentMethod
  notes?: string
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
export type DiscountType = 'amount' | 'percent'

export interface SaleCartItem {
  product: Product
  quantity: number
  unit_price: number
  unit_id?: string | null
  unit_name?: string | null
  conversion_rate?: number
  quantity_in_base?: number
  discount_amount: number
  total_price: number
}

export interface SaleDiscount {
  type: DiscountType
  value: number
  amount: number
}

export interface CreateSalePayload {
  items: SaleCartItem[]
  payment_method: PaymentMethod
  notes?: string
  client_id?: string | null
  montant_paye?: number
  statut?: SaleStatut
  discount?: SaleDiscount
}

// ============================================================
// ABONNEMENTS & PLANS
// ============================================================
export interface Plan {
  id: string
  name: string
  slug: 'starter' | 'business' | 'pro'
  price: number
  max_products: number | null
  max_users: number | null
  features: string[]
  is_active: boolean
  created_at: string
}

export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled'

export interface Subscription {
  id: string
  owner_id: string
  plan_id: string
  status: SubscriptionStatus
  trial_ends_at: string
  current_period_start: string
  current_period_end: string
  created_at: string
  updated_at: string
  plan?: Plan
}

export interface Business {
  id: string
  owner_id: string
  name: string
  phone?: string
  address?: string
  city?: string
  country: string
  commerce_type: 'detail' | 'gros_detail'
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  subscription_id: string
  amount: number
  payment_method: 'wave' | 'orange_money' | 'especes'
  status: 'pending' | 'completed' | 'failed'
  reference?: string
  paid_at?: string
  created_at: string
}

export interface CreateBusinessPayload {
  name: string
  phone?: string
  address?: string
  city?: string
  commerce_type?: 'detail' | 'gros_detail'
}
