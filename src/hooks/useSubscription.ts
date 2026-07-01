import { useState, useEffect, useCallback } from 'react'
import { subscriptionService } from '@/services/subscriptionService'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/authService'
import type { Subscription, Plan, Business } from '@/types'

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [business, setBusiness] = useState<Business | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user, setProfile } = useAuthStore()

  const load = useCallback(async () => {
    try {
      setIsLoading(true)
      const [sub, biz, allPlans] = await Promise.all([
        subscriptionService.getMySubscription(),
        subscriptionService.getMyBusiness(),
        subscriptionService.getPlans(),
      ])
      setSubscription(sub)
      setBusiness(biz)
      setPlans(allPlans)
    } catch {
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const createBusiness = async (
    payload: { name: string; phone?: string; address?: string; city?: string },
    planId: string
  ) => {
    const biz = await subscriptionService.createBusiness(payload)
    const sub = await subscriptionService.createSubscription(planId)
    setBusiness(biz)
    setSubscription(sub)

    if (user) {
      try {
        const updatedProfile = await authService.getProfile(user.id)
        setProfile(updatedProfile)
      } catch {}
    }

    return { biz, sub }
  }

  const changePlan = async (planId: string) => {
    if (!subscription) throw new Error('Pas d\'abonnement')
    const updated = await subscriptionService.updateSubscriptionPlan(subscription.id, planId)
    setSubscription(updated)
    return updated
  }

  const isExpired = subscription
    ? subscriptionService.isExpired(subscription)
    : false

  const daysLeftInTrial = subscription
    ? subscriptionService.getDaysLeftInTrial(subscription)
    : 0

  const canAddProduct = (currentCount: number) =>
    subscription ? subscriptionService.canAddProduct(subscription, currentCount) : false

  const canAddUser = (currentCount: number) =>
    subscription ? subscriptionService.canAddUser(subscription, currentCount) : false

  const canAccessStats = subscription?.plan?.slug === 'pro'

  const canAccessClientsAndFournisseurs =
    subscription?.plan?.slug === 'business' ||
    subscription?.plan?.slug === 'pro'

  const canExportPDF = subscription?.plan?.slug === 'pro'

  const currentPlan = subscription?.plan ?? null

  return {
    subscription,
    business,
    plans,
    isLoading,
    reload: load,
    createBusiness,
    changePlan,
    isExpired,
    daysLeftInTrial,
    canAddProduct,
    canAddUser,
    canAccessStats,
    canAccessClientsAndFournisseurs,
    canExportPDF,
    currentPlan,
  }
}
