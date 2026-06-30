import { supabase } from '@/lib/supabase'

export interface ProductStat {
  product_id: string
  product_name: string
  reference: string
  quantity_sold: number
  revenue: number
  cost: number
  profit: number
}
export interface PeriodStats {
  revenue: number
  cost: number
  profit: number
  salesCount: number
  productStats: ProductStat[]
}
export interface FondsRoulement {
  stockValue: number
  cashBalance: number
  clientsReceivables: number
  fournisseursDebts: number
  total: number
}

interface ProductJoin {
  id: string
  name: string
  reference: string
  purchase_price: number
}

export const statsService = {
  async getPeriodStats(startDate: string, endDate: string): Promise<PeriodStats> {
    const { data: sales, error } = await supabase
      .from('sales')
      .select('id, sale_items(quantity, unit_price, total_price, product:products(id, name, reference, purchase_price))')
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`)
    if (error) throw error

    const productMap = new Map<string, ProductStat>()
    let totalRevenue = 0
    let totalCost = 0

    for (const sale of sales || []) {
      for (const item of sale.sale_items || []) {
        const rawProduct = item.product as unknown
        const product: ProductJoin | null = Array.isArray(rawProduct)
          ? (rawProduct[0] as ProductJoin) ?? null
          : (rawProduct as ProductJoin) ?? null
        if (!product) continue

        const itemRevenue = item.total_price
        const itemCost = product.purchase_price * item.quantity
        totalRevenue += itemRevenue
        totalCost += itemCost

        const existing = productMap.get(product.id)
        if (existing) {
          existing.quantity_sold += item.quantity
          existing.revenue += itemRevenue
          existing.cost += itemCost
          existing.profit += (itemRevenue - itemCost)
        } else {
          productMap.set(product.id, {
            product_id: product.id,
            product_name: product.name,
            reference: product.reference,
            quantity_sold: item.quantity,
            revenue: itemRevenue,
            cost: itemCost,
            profit: itemRevenue - itemCost,
          })
        }
      }
    }

    const productStats = Array.from(productMap.values()).sort((a, b) => b.profit - a.profit)

    return {
      revenue: totalRevenue,
      cost: totalCost,
      profit: totalRevenue - totalCost,
      salesCount: sales?.length ?? 0,
      productStats,
    }
  },

  async getFondsRoulement(): Promise<FondsRoulement> {
    const { data: products, error: pError } = await supabase
      .from('products')
      .select('stock_current, purchase_price')
      .eq('is_active', true)
    if (pError) throw pError
    const stockValue = (products || []).reduce(
      (sum, p) => sum + p.stock_current * p.purchase_price, 0
    )

    const { data: journal, error: jError } = await supabase
      .from('journal_entries')
      .select('balance')
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    const cashBalance = jError ? 0 : (journal?.balance ?? 0)

    const { data: clients, error: cError } = await supabase
      .from('clients')
      .select('solde')
    if (cError) throw cError
    const clientsReceivables = (clients || []).reduce((sum, c) => sum + c.solde, 0)

    const { data: fournisseurs, error: fError } = await supabase
      .from('fournisseurs')
      .select('solde')
    if (fError) throw fError
    const fournisseursDebts = (fournisseurs || []).reduce((sum, f) => sum + f.solde, 0)

    const total = stockValue + cashBalance + clientsReceivables - fournisseursDebts

    return { stockValue, cashBalance, clientsReceivables, fournisseursDebts, total }
  },
}
