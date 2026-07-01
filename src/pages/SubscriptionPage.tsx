import { useNavigate } from 'react-router-dom'
import { Check, Crown, Calendar, ArrowLeft, X, Users, Package, BarChart3, FileText, Headphones } from 'lucide-react'
import { Card } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { useSubscription } from '@/hooks/useSubscription'
import { subscriptionService } from '@/services/subscriptionService'
import { formatCurrency } from '@/lib/utils'

const PLAN_DETAILS = {
  starter: {
    description: 'Idéal pour démarrer et gérer un petit commerce',
    color: 'blue',
    icon: Package,
    details: [
      { label: 'Produits', value: '50 max', included: true },
      { label: 'Utilisateurs', value: '1 seul', included: true },
      { label: 'Ventes & Stock', value: '', included: true },
      { label: 'Journal comptable', value: '', included: true },
      { label: 'Clients & Fournisseurs', value: '', included: false },
      { label: 'Statistiques & Bénéfices', value: '', included: false },
      { label: 'Export PDF', value: '', included: false },
      { label: 'Support prioritaire', value: '', included: false },
    ]
  },
  business: {
    description: 'Pour les commerces en croissance avec une équipe',
    color: 'orange',
    icon: Users,
    details: [
      { label: 'Produits', value: 'Illimités', included: true },
      { label: 'Utilisateurs', value: '3 max', included: true },
      { label: 'Ventes & Stock', value: '', included: true },
      { label: 'Journal comptable', value: '', included: true },
      { label: 'Clients & Fournisseurs', value: '', included: true },
      { label: 'Statistiques & Bénéfices', value: '', included: false },
      { label: 'Export PDF', value: '', included: false },
      { label: 'Support prioritaire', value: '', included: false },
    ]
  },
  pro: {
    description: 'Pour piloter votre commerce comme un professionnel',
    color: 'purple',
    icon: BarChart3,
    details: [
      { label: 'Produits', value: 'Illimités', included: true },
      { label: 'Utilisateurs', value: 'Illimités', included: true },
      { label: 'Ventes & Stock', value: '', included: true },
      { label: 'Journal comptable', value: '', included: true },
      { label: 'Clients & Fournisseurs', value: '', included: true },
      { label: 'Statistiques & Bénéfices', value: '', included: true },
      { label: 'Export PDF', value: '', included: true },
      { label: 'Support prioritaire', value: '', included: true },
    ]
  },
}

const colorMap = {
  blue: {
    badge: 'bg-blue-100 text-blue-600',
    button: 'bg-blue-600 hover:bg-blue-700',
    icon: 'bg-blue-100 text-blue-600',
  },
  orange: {
    badge: 'bg-orange-100 text-orange-600',
    button: 'bg-orange-500 hover:bg-orange-600',
    icon: 'bg-orange-100 text-orange-600',
  },
  purple: {
    badge: 'bg-purple-100 text-purple-600',
    button: 'bg-purple-600 hover:bg-purple-700',
    icon: 'bg-purple-100 text-purple-600',
  },
}

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
          const isPro = plan.slug === 'pro'
          const detail = PLAN_DETAILS[plan.slug as keyof typeof PLAN_DETAILS]
          const colors = colorMap[detail?.color as keyof typeof colorMap] ?? colorMap.orange
          const PlanIcon = detail?.icon ?? Package

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border-2 p-5 flex flex-col ${
                isCurrent
                  ? 'border-orange-500 bg-orange-50'
                  : isPopular
                  ? 'border-orange-300 bg-white shadow-lg'
                  : isPro
                  ? 'border-purple-300 bg-white shadow-lg'
                  : 'border-slate-200 bg-white'
              }`}
            >
              {isPopular && !isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Le plus populaire
                </span>
              )}
              {isPro && !isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Tout inclus
                </span>
              )}
              {isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Votre plan actuel
                </span>
              )}

              <div className="mb-4 mt-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-lg ${colors.icon}`}>
                    <PlanIcon className="h-4 w-4" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                </div>
                {detail && (
                  <p className="text-xs text-slate-500 mb-3">{detail.description}</p>
                )}
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-slate-900">{formatCurrency(plan.price)}</span>
                  <span className="text-sm text-slate-400">/mois</span>
                </div>
                <p className="text-xs text-emerald-600 font-medium mt-1">14 jours gratuits</p>
              </div>

              {/* Détail des fonctionnalités */}
              {detail ? (
                <ul className="space-y-2 flex-1 mb-5">
                  {detail.details.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      {item.included ? (
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-slate-300 shrink-0" />
                      )}
                      <span className={item.included ? 'text-slate-700' : 'text-slate-400'}>
                        {item.label}
                        {item.value && (
                          <span className={`ml-1 text-xs font-medium ${item.included ? 'text-slate-500' : 'text-slate-300'}`}>
                            ({item.value})
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="space-y-2.5 flex-1 mb-5">
                  {(plan.features as string[]).map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>
              )}

              {isCurrent ? (
                <Button variant="outline" className="w-full" disabled>
                  Plan actuel
                </Button>
              ) : (
                <button
                  className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors ${colors.button}`}
                  onClick={() => navigate(`/payment?plan=${plan.id}`)}
                >
                  Choisir ce plan →
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Paiement info */}
      <Card className="p-4 bg-slate-50 space-y-2">
        <p className="text-sm font-semibold text-slate-700">💳 Comment payer ?</p>
        <p className="text-xs text-slate-600">
          Envoyez le montant correspondant à votre plan via <strong>Wave</strong> ou <strong>Orange Money</strong> au numéro <strong>79740816</strong> (Ibrahima Sidibé), puis soumettez la référence de transaction. Votre abonnement sera activé dans les 24h.
        </p>
      </Card>

      {/* Support */}
      <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground">
        <Headphones className="h-3.5 w-3.5" />
        <p>Besoin d'aide ? Contactez-nous sur WhatsApp : <strong>+223 79 74 08 16</strong></p>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Vous pouvez changer de plan à tout moment.
      </p>
    </div>
  )
                      }
