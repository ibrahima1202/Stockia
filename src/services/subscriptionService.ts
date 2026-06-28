import { supabase } from '@/lib/supabase'
import type { Plan, Subscription, Business, CreateBusinessPayload } from '@/types'

export const subscriptionService = {
  // ============================================================
  // PLANS
  // ============================================================
  async getPlans(): Promise<Plan[]> {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('price')
    if (error) throw error
    return data
  },

  // ============================================================
  // SUBSCRIPTION
  // ============================================================
  async getMySubscription(): Promise<Subscription | null> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*, plan:plans(*)')
      .eq('owner_id', (await supabase.auth.getUser()).data.user?.id ?? '')
      .single()
    if (error) return null
    return data
  },

  async createSubscription(planId: string): Promise<Subscription> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non authentifié')

    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        owner_id: user.id,
        plan_id: planId,
        status: 'trial',
      })
      .select('*, plan:plans(*)')
      .single()
    if (error) throw error
    return data
  },

  async updateSubscriptionPlan(subscriptionId: string, planId: string): Promise<Subscription> {
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        plan_id: planId,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', subscriptionId)
      .select('*, plan:plans(*)')
      .single()
    if (error) throw error
    return data
  },

  isTrialExpired(subscription: Subscription): boolean {
    if (subscription.status !== 'trial') return false
    return new Date(subscription.trial_ends_at) < new Date()
  },

  getDaysLeftInTrial(subscription: Subscription): number {
    const now = new Date()
    const end = new Date(subscription.trial_ends_at)
    const diff = end.getTime() - now.getTime()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  },

  isExpired(subscription: Subscription): boolean {
    if (subscription.status === 'expired' || subscription.status === 'cancelled') return true
    if (subscription.status === 'trial') return this.isTrialExpired(subscription)
    return new Date(subscription.current_period_end) < new Date()
  },

  canAddProduct(subscription: Subscription, currentCount: number): boolean {
    const max = subscription.plan?.max_products
    if (max === null || max === undefined) return true
    return currentCount < max
  },

  canAddUser(subscription: Subscription, currentCount: number): boolean {
    const max = subscription.plan?.max_users
    if (max === null || max === undefined) return true
    return currentCount < max
  },

  // ============================================================
  // BUSINESS
  // ============================================================
  async getMyBusiness(): Promise<Business | null> {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', (await supabase.auth.getUser()).data.user?.id ?? '')
      .single()
    if (error) return null
    return data
  },

  async createBusiness(payload: CreateBusinessPayload): Promise<Business> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non authentifié')

    const { data, error } = await supabase
      .from('businesses')
      .insert({ ...payload, owner_id: user.id })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateBusiness(id: string, updates: Partial<CreateBusinessPayload>): Promise<Business> {
    const { data, error } = await supabase
      .from('businesses')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },
}
