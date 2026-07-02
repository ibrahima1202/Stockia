import { supabase } from '@/lib/supabase'

export interface AdminBusiness {
  id: string
  name: string
  phone?: string
  city?: string
  owner_id: string
  created_at: string
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
    duration_months: number
  }[]
}

export const adminService = {
  async getBusinesses(): Promise<AdminBusiness[]> {
    // 1. Récupérer les commerces
    const { data: businesses, error: bizError } = await supabase
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: false })
    if (bizError) throw bizError
    if (!businesses || businesses.length === 0) return []

    // 2. Récupérer les abonnements avec plans
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('*, plan:plans(*)')
    if (subError) throw subError

    // 3. Récupérer les paiements en attente
    const { data: payments, error: payError } = await supabase
      .from('payments')
      .select('*')
      .eq('status', 'pending')
    if (payError) throw payError

    // 4. Assembler les données
    return businesses.map((biz) => ({
      ...biz,
      subscription: subscriptions?.find((s) => s.owner_id === biz.owner_id),
      pending_payments: payments?.filter((p) => {
        const sub = subscriptions?.find((s) => s.owner_id === biz.owner_id)
        return sub && p.subscription_id === sub.id
      }) ?? [],
    }))
  },

  async activateSubscription(
    subscriptionId: string,
    planId: string,
    paymentId?: string,
    durationMonths: number = 1
  ): Promise<void> {
    const periodEnd = new Date()
    periodEnd.setMonth(periodEnd.getMonth() + durationMonths)

    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        plan_id: planId,
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd.toISOString(),
      })
      .eq('id', subscriptionId)
    if (error) throw error

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

    const { error } = await supabase
      .from('subscriptions')
      .update({
        plan_id: planId,
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd.toISOString(),
      })
      .eq('id', subscriptionId)
    if (error) throw error
  },

  async getPlans() {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('price')
    if (error) throw error
    return data
  },
}
