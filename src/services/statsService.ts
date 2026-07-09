import { supabase } from '@/lib/supabase'

export interface ProductStat {
  product_id: string
  product_name: string
  reference: string
  quantity_sold: number
  quantity_sold_display: string
  revenue: number
  cost: number
  profit: number
}

export interface PeriodStats {
  revenue: number
  cost: number
  profit: number
  expenses: number
  resultatNet: number
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

type ProductData = {
  id: string
  name: string
  reference: string
  purchase_price: number
}

type SaleItemData = {
  quantity: number
  unit_price: number
  total_price: number
  discount_amount: number | null
  quantity_in_base: number | null
  conversion_rate: number | null
  unit_name: string | null
  product: ProductData | ProductData[] | null
}

type SaleData = {
  id: string
  total_amount: number
  montant_paye: number | null
  statut: string | null
  sale_items: SaleItemData[]
}

export const statsService = {
  async getPeriodStats(start: string, end: string): Promise<PeriodStats> {
    const { data: salesRaw, error: salesError } = await supabase
      .from('sales')
      .select(`
        id, total_amount, montant_paye, statut,
        sale_items(
          quantity, unit_price, total_price, discount_amount,
          quantity_in_base, conversion_rate, unit_name,
          product:products(id, name, reference, purchase_price)
        )
      `)
      .gte('created_at', `${start}T00:00:00`)
      .lte('created_at', `${end}T23:59:59`)
    if (salesError) throw salesError

    const sales = (salesRaw ?? []) as unknown as SaleData[]

    // CA = total de TOUTES les ventes (crédit inclus)
    // car la marchandise est sortie du stock dans tous les cas
    let revenue = 0
    let cost = 0
    const productMap = new Map<string, ProductStat>()

    for (const sale of sales) {
      // Revenue = montant total de la vente (pas seulement encaissé)
      revenue += sale.total_amount

      for (const item of sale.sale_items || []) {
        const product = Array.isArray(item.product)
          ? item.product[0]
          : item.product
        if (!product) continue

        const qtyInBase = item.quantity_in_base ?? item.quantity
        const convRate = item.conversion_rate ?? 1
        const unitNm = item.unit_name
        const itemCost = product.purchase_price * qtyInBase
        cost += itemCost

        const existing = productMap.get(product.id)
        if (existing) {
          existing.quantity_sold += qtyInBase
          existing.revenue += item.total_price
          existing.cost += itemCost
          existing.profit = existing.revenue - existing.cost

          if (unitNm && convRate > 1) {
            const unitQty = Math.round(existing.quantity_sold / convRate)
            existing.quantity_sold_display = `${unitQty} ${unitNm} (${existing.quantity_sold} pcs)`
          } else {
            existing.quantity_sold_display = `${existing.quantity_sold} pcs`
          }
        } else {
          const quantityDisplay = unitNm && convRate > 1
            ? `${item.quantity} ${unitNm} (${qtyInBase} pcs)`
            : `${qtyInBase} pcs`

          productMap.set(product.id, {
            product_id: product.id,
            product_name: product.name,
            reference: product.reference,
            quantity_sold: qtyInBase,
            quantity_sold_display: quantityDisplay,
            revenue: item.total_price,
            cost: itemCost,
            profit: item.total_price - itemCost,
          })
        }
      }
    }

    const { data: expensesData, error: expError } = await supabase
      .from('expenses')
      .select('amount')
      .gte('expense_date', start)
      .lte('expense_date', end)
    if (expError) throw expError

    const expenses = (expensesData || []).reduce((s, e) => s + e.amount, 0)
    const profit = revenue - cost
    const resultatNet = profit - expenses

    const productStats = Array.from(productMap.values())
      .sort((a, b) => b.profit - a.profit)

    return {
      revenue,
      cost,
      profit,
      expenses,
      resultatNet,
      salesCount: sales.length,
      productStats,
    }
  },

  async getFondsRoulement(): Promise<FondsRoulement> {
    // Valeur du stock
    const { data: products, error: pError } = await supabase
      .from('products')
      .select('stock_current, purchase_price')
      .eq('is_active', true)
    if (pError) throw pError

    const stockValue = (products || []).reduce(
      (s, p) => s + p.stock_current * p.purchase_price, 0
    )

    // Caisse = total des débits du journal (ventes encaissées + règlements clients reçus)
    const { data: journalData, error: jError } = await supabase
      .from('journal_entries')
      .select('debit, credit')
    if (jError) throw jError

    const cashBalance = (journalData || []).reduce((s, entry) => {
      return s + entry.debit - entry.credit
    }, 0)

    // Créances clients (ce qu'ils doivent encore)
    const { data: clients, error: cError } = await supabase
      .from('clients')
      .select('solde')
    if (cError) throw cError

    const clientsReceivables = (clients || []).reduce((s, c) => s + c.solde, 0)

    // Dettes fournisseurs
    const { data: fournisseurs, error: fError } = await supabase
      .from('fournisseurs')
      .select('solde')
    if (fError) throw fError

    const fournisseursDebts = (fournisseurs || []).reduce((s, f) => s + f.solde, 0)

    const total = stockValue + cashBalance + clientsReceivables - fournisseursDebts

    return {
      stockValue,
      cashBalance,
      clientsReceivables,
      fournisseursDebts,
      total,
    }
  },
}
