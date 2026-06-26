import { saleService } from './saleService'
import { productService } from './productService'
import { journalService } from './journalService'
import type { DashboardStats } from '@/types'

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const [todayStats, lowStockCount, cashBalance] = await Promise.all([
      saleService.getTodayStats(),
      productService.getLowStockCount(),
      journalService.getCurrentBalance(),
    ])

    return {
      revenue_today: todayStats.revenue,
      sales_count_today: todayStats.count,
      low_stock_count: lowStockCount,
      cash_balance: cashBalance,
    }
  },
}
