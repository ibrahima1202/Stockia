import { supabase } from '@/lib/supabase'

export interface AdminBusiness {
  id: string
  name: string
  phone?: string
  city?: string
  owner_id: string
  created_at: string
  owner?: {
    email: string
    full_name: string
  }
  subscription?: {
    id: string
    status: string
    plan_id: string
    trial_ends_at: string
    current_period_end: string
    plan?: {
      id: string
      name: string
      slug: string
      price: number
    }
  }
  pending_payments?: {
    id: string
    amount: number
    payment_method: string
    reference: string
    created_at: string
  }[]
}

export const adminService = {
  async getBusinesses(): Promise<AdminBusiness[]> {
    const { data, error } = await supabase
      .from('businesses')
      .select(`
        *,
        subscription:subscriptions(
          id, status, plan_id, trial_ends_at, current_period_end,
          plan:plans(id, name, slug, price)
        ),
        pending_payments:payments(id, amount, payment_method, reference, created_at)
      `)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async activateSubscription(
    subscriptionId: string,
    planId: string,
    paymentId?: string
  ): Promise<void> {
    const periodEnd = new Date()
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        plan_id: planId,
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd.toISOString(),
      })
      .eq('id', subscriptionId)

    if (paymentId) {
      await supabase
        .from('payments')
        .update({ status: 'completed', paid_at: new Date().toISOString() })
        .eq('id', paymentId)
    }
  },

  async changePlan(subscriptionId: string, planId: string): Promise<void> {
    const periodEnd = new Date()
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    await supabase
      .from('subscriptions')
      .update({
        plan_id: planId,
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd.toISOString(),
      })
      .eq('id', subscriptionId)
  },

  async getPlans() {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('price')
    if (error) throw error
    return data
  },

  async getOwnerEmail(userId: string): Promise<string> {
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single()
    if (error) return 'Inconnu'
    return data.full_name
  },
}
