import { useNavigate } from 'react-router-dom'
import { Check, Crown, Calendar, ArrowLeft } from 'lucide-react'
import { Card } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { useSubscription } from '@/hooks/useSubscription'
import { subscriptionService } from '@/services/subscriptionService'
import { formatCurrency } from '@/lib/utils'

export default function SubscriptionPage() {
  const navigate = useNavigate()
  const { subscription, plans } = useSubscription()

  const daysLeft = subscription ? subscriptionService.getDaysLeftInTrial(subscription) : 0
  const isTrialing = subscription?.status === 'trial'

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate('/profile')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Retour au profil
      </button>

      <div>
        <h1 className="page-title">Mon abonnement</h1>
        <p className="text-sm text-muted-foreground">Choisissez le plan adapté à votre commerce</p>
      </div>

      {isTrialing && (
        <Card className="p-4 bg-orange-50 border-orange-200">
          <p className="text-sm text-orange-700 font-medium">
            ⏳ Essai gratuit — {daysLeft} jour(s) restant(s)
          </p>
          <p className="text-xs text-orange-600 mt-0.5">
            Choisissez un plan avant la fin de votre essai pour continuer à utiliser STOCKAM sans interruption.
          </p>
        </Card>
      )}

      {subscription && (
        <Card className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <Crown className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-semibold">{subscription.plan?.name ?? 'Aucun plan'}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {isTrialing
                  ? `Essai jusqu'au ${new Date(subscription.trial_ends_at).toLocaleDateString('fr-FR')}`
                  : `Renouvellement le ${new Date(subscription.current_period_end).toLocaleDateString('fr-FR')}`
                }
              </p>
            </div>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            isTrialing ? 'bg-orange-100 text-orange-600' :
            subscription.status === 'active' ? 'bg-emerald-100 text-emerald-600' :
            'bg-red-100 text-red-600'
          }`}>
            {isTrialing ? 'Essai' : subscription.status === 'active' ? 'Actif' : 'Expiré'}
          </span>
        </Card>
      )}

      {/* Cartes des plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isCurrent = subscription?.plan_id === plan.id
          const isPopular = plan.slug === 'business'

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border-2 p-5 flex flex-col ${
                isCurrent
                  ? 'border-orange-500 bg-orange-50'
                  : isPopular
                  ? 'border-orange-300 bg-white shadow-lg'
                  : 'border-slate-200 bg-white'
              }`}
            >
              {isPopular && !isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Le plus populaire
                </span>
              )}
              {isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Votre plan actuel
                </span>
              )}

              <div className="mb-4 mt-2">
                <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-bold text-slate-900">{formatCurrency(plan.price)}</span>
                  <span className="text-sm text-slate-400">/mois</span>
                </div>
              </div>

              <ul className="space-y-2.5 flex-1 mb-5">
                {(plan.features as string[]).map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <Button variant="outline" className="w-full" disabled>
                  Plan actuel
                </Button>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => navigate(`/payment?plan=${plan.id}`)}
                >
                  Choisir ce plan
                </Button>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-xs text-center text-muted-foreground pt-2">
        Tous les plans incluent 14 jours d'essai gratuit. Vous pouvez changer de plan à tout moment.
      </p>
    </div>
  )
}
