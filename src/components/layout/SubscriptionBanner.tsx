import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Clock } from 'lucide-react'
import { useSubscription } from '@/hooks/useSubscription'
import { subscriptionService } from '@/services/subscriptionService'

export function SubscriptionBanner() {
  const navigate = useNavigate()
  const { subscription } = useSubscription()

  if (!subscription) return null

  const isExpired = subscriptionService.isExpired(subscription)
  const isTrialing = subscription.status === 'trial'
  const daysLeft = isTrialing ? subscriptionService.getDaysLeftInTrial(subscription) : 0

  // N'afficher que si expiré OU essai avec 3 jours ou moins
  if (!isExpired && !(isTrialing && daysLeft <= 3)) return null

  return (
    <div
      onClick={() => navigate('/subscription')}
      className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors ${
        isExpired ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'
      }`}
    >
      <div className="flex items-center gap-2 text-white">
        {isExpired ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <Clock className="h-4 w-4 shrink-0" />}
        <p className="text-xs sm:text-sm font-medium">
          {isExpired
            ? 'Votre abonnement a expiré. Mode lecture seule activé.'
            : `Votre essai gratuit se termine dans ${daysLeft} jour(s).`
          }
        </p>
      </div>
      <span className="text-xs sm:text-sm font-bold text-white underline shrink-0 ml-2">
        {isExpired ? 'Réactiver' : 'Voir les plans'}
      </span>
    </div>
  )
}
