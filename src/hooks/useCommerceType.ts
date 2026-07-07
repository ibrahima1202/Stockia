import { useSubscription } from './useSubscription'

export function useCommerceType() {
  const { business } = useSubscription()

  const isGrosDetail = business?.commerce_type === 'gros_detail'
  const isDetail = !isGrosDetail

  return {
    isGrosDetail,
    isDetail,
    commerceType: business?.commerce_type ?? 'detail',
  }
}
