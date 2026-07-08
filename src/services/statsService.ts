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

export const statsService = {
  async getPeriodStats(start: string, end: string): Promise<PeriodStats> {
    // 1. Récupérer les ventes avec leurs articles
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select(`
        id, total_amount, montant_paye, statut,
        sale_items(
          quantity, unit_price, total_price, discount_amount,
          quantity_in_base, conversion_rate,
          product:products(id, name, reference, purchase_price)
        )
      `)
      .gte('created_at', `${start}T00:00:00`)
      .lte('created_at', `${end}T23:59:59`)
    if (salesError) throw salesError

    // 2. Calculer le CA et le coût
    let revenue = 0
    let cost = 0
    const productMap = new Map<string, ProductStat>()

    for (const sale of sales || []) {
      // CA = montant effectivement encaissé
      if (sale.statut === 'paye') {
        revenue += sale.total_amount
      } else if (sale.statut === 'partiel') {
        revenue += sale.montant_paye ?? 0
      }
      // Pour le crédit, on ne compte pas dans le CA encaissé

      for (const item of sale.sale_items || []) {
        const product = item.product
        if (!product) continue

        // Quantité réelle vendue en unité de base
        const qtyInBase = item.quantity_in_base ?? item.quantity

        // Coût = prix d'achat × quantité en unité de base
        const itemCost = product.purchase_price * qtyInBase
        cost += itemCost

        // Agrégation par produit
        const existing = productMap.get(product.id)
        if (existing) {
          existing.quantity_sold += qtyInBase
          existing.revenue += item.total_price
          existing.cost += itemCost
          existing.profit = existing.revenue - existing.cost
        } else {
          productMap.set(product.id, {
            product_id: product.id,
            product_name: product.name,
            reference: product.reference,
            quantity_sold: qtyInBase,
            revenue: item.total_price,
            cost: itemCost,
            profit: item.total_price - itemCost,
          })
        }
      }
    }

    // 3. Dépenses de la période
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
      salesCount: (sales || []).length,
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

    // Solde caisse = total encaissé
    const { data: sales, error: sError } = await supabase
      .from('sales')
      .select('total_amount, montant_paye, statut')
    if (sError) throw sError

    const cashBalance = (sales || []).reduce((s, sale) => {
      if (sale.statut === 'paye') return s + sale.total_amount
      if (sale.statut === 'partiel') return s + (sale.montant_paye ?? 0)
      return s
    }, 0)

    // Créances clients
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
