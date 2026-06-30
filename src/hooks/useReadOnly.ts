import { useSubscription } from './useSubscription'
import { subscriptionService } from '@/services/subscriptionService'

export function useReadOnly() {
  const { subscription } = useSubscription()
  const isReadOnly = subscription ? subscriptionService.isExpired(subscription) : false
  return { isReadOnly }
}
