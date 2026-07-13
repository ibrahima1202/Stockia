import { useState, useEffect, useCallback } from 'react'
import { CheckCircle, Crown, RefreshCw, Building2, Calendar, CreditCard, MapPin, XCircle } from 'lucide-react'
import { LoadingScreen, Badge } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { adminService, type AdminBusiness } from '@/services/adminService'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/store/toastStore'

const ADMIN_EMAIL = 'sidibeibrahima408@gmail.com'

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuthStore()
  const navigate = useNavigate()
  const toast = useToast()

  const [businesses, setBusinesses] = useState<AdminBusiness[]>([])
  const [plans, setPlans] = useState<{ id: string; name: string; slug: string; price: number }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activating, setActivating] = useState<string | null>(null)
  const [changingZone, setChangingZone] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setIsLoading(true)
      const [biz, allPlans] = await Promise.all([
        adminService.getBusinesses(),
        adminService.getPlans(),
      ])
      setBusinesses(biz)
      setPlans(allPlans)
    } catch {
      toast.error('Erreur', 'Impossible de charger les données')
    } finally {
      setIsLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login')
      return
    }
    if (user.email !== ADMIN_EMAIL) {
      navigate('/')
      return
    }
    load()
  }, [user, authLoading, navigate, load])

  const handleActivate = async (
    subscriptionId: string,
    planId: string,
    paymentId?: string,
    durationMonths: number = 1
  ) => {
    setActivating(subscriptionId)
    try {
      await adminService.activateSubscription(subscriptionId, planId, paymentId, durationMonths)
      toast.success('Abonnement activé !', durationMonths > 1 ? `Activé pour ${durationMonths} mois` : undefined)
      await load()
    } catch {
      toast.error('Erreur', 'Impossible d\'activer l\'abonnement')
    } finally {
      setActivating(null)
    }
  }

  const handleDeactivate = async (subscriptionId: string, businessName: string) => {
    const confirmed = window.confirm(
      `Désactiver l'abonnement de "${businessName}" ?\n\nLe compte repassera en statut "Essai".`
    )
    if (!confirmed) return

    setActivating(subscriptionId)
    try {
      await adminService.deactivateSubscription(subscriptionId)
      toast.success('Abonnement désactivé', 'Le compte est repassé en essai')
      await load()
    } catch {
      toast.error('Erreur', 'Impossible de désactiver l\'abonnement')
    } finally {
      setActivating(null)
    }
  }

  const handleChangePlan = async (subscriptionId: string, planId: string) => {
    setActivating(subscriptionId)
    try {
      await adminService.changePlan(subscriptionId, planId)
      toast.success('Plan mis à jour !')
      await load()
    } catch {
      toast.error('Erreur', 'Impossible de changer le plan')
    } finally {
      setActivating(null)
    }
  }

  const handleChangeZone = async (businessId: string, zone: 'standard' | 'kadiolo') => {
    setChangingZone(businessId)
    try {
      await adminService.updateBusinessZone(businessId, zone)
      toast.success(zone === 'kadiolo' ? 'Commerce passé en zone Kadiolo' : 'Commerce repassé en zone Standard')
      await load()
    } catch {
      toast.error('Erreur', 'Impossible de changer la zone')
    } finally {
      setChangingZone(null)
    }
  }

  const getStatusBadge = (status: string) => {
    if (status === 'active') return <Badge variant="success">Actif</Badge>
    if (status === 'trial') return <Badge variant="warning">Essai</Badge>
    if (status === 'expired') return <Badge variant="danger">Expiré</Badge>
    if (status === 'cancelled') return <Badge variant="danger">Annulé</Badge>
    return <Badge variant="default">{status}</Badge>
  }

  if (authLoading || isLoading) return <LoadingScreen text="Chargement du dashboard admin..." />
  if (!user || user.email !== ADMIN_EMAIL) return null

  const pendingPayments = businesses.filter(
    (b) => b.pending_payments && b.pending_payments.length > 0
  )

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            STOCK<span className="text-orange-500">AM</span> — Admin
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Tableau de bord de gestion</p>
        </div>
        <button
          onClick={load}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4 text-slate-400" />
        </button>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Commerces</p>
          <p className="text-2xl font-bold mt-1">{businesses.length}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Actifs</p>
          <p className="text-2xl font-bold mt-1 text-emerald-400">
            {businesses.filter((b) => b.subscription?.status === 'active').length}
          </p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">En essai</p>
          <p className="text-2xl font-bold mt-1 text-orange-400">
            {businesses.filter((b) => b.subscription?.status === 'trial').length}
          </p>
        </div>
        <div className="bg-orange-500 rounded-xl p-4">
          <p className="text-xs text-white/80 uppercase tracking-wide">Paiements en attente</p>
          <p className="text-2xl font-bold mt-1">{pendingPayments.length}</p>
        </div>
      </div>

      {/* Paiements en attente */}
      {pendingPayments.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-orange-400 flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Paiements en attente ({pendingPayments.length})
          </h2>
          {pendingPayments.map((biz) => (
            biz.pending_payments?.map((payment) => (
              <div key={payment.id} className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{biz.name}</p>
                    <p className="text-xs text-slate-400">{biz.city}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-orange-400">{formatCurrency(payment.amount)}</p>
                    <p className="text-xs text-slate-400 capitalize">
                      {payment.payment_method.replace('_', ' ')}
                      {payment.duration_months > 1 && (
                        <span className="ml-1 text-emerald-400 font-semibold">· {payment.duration_months} mois</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="bg-slate-800 rounded-lg px-3 py-2">
                  <p className="text-xs text-slate-400">Référence transaction</p>
                  <p className="font-mono font-medium">{payment.reference}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {plans.map((plan) => (
                    <Button
                      key={plan.id}
                      size="sm"
                      className={biz.subscription?.plan_id === plan.id
                        ? 'bg-emerald-500 hover:bg-emerald-600'
                        : 'bg-slate-700 hover:bg-slate-600'
                      }
                      onClick={() => biz.subscription && handleActivate(biz.subscription.id, plan.id, payment.id, payment.duration_months)}
                      isLoading={activating === biz.subscription?.id}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Activer {plan.name}
                    </Button>
                  ))}
                </div>
              </div>
            ))
          ))}
        </div>
      )}

      {/* Liste tous les commerces */}
      <div className="space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Tous les commerces ({businesses.length})
        </h2>
        {businesses.map((biz) => (
          <div key={biz.id} className="bg-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{biz.name}</p>
                <p className="text-xs text-slate-400">{biz.city} · {new Date(biz.created_at).toLocaleDateString('fr-FR')}</p>
              </div>
              <div className="flex items-center gap-2">
                {biz.subscription && getStatusBadge(biz.subscription.status)}
                <span className="text-xs text-orange-400 font-medium">
                  {biz.subscription?.plan?.name ?? 'Sans plan'}
                </span>
              </div>
            </div>

            {biz.subscription && (
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Calendar className="h-3 w-3" />
                {biz.subscription.status === 'trial'
                  ? `Essai jusqu'au ${new Date(biz.subscription.trial_ends_at).toLocaleDateString('fr-FR')}`
                  : `Expire le ${new Date(biz.subscription.current_period_end).toLocaleDateString('fr-FR')}`
                }
              </div>
            )}

            {/* Zone du commerce */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Zone :
              </span>
              <button
                onClick={() => handleChangeZone(biz.id, 'standard')}
                disabled={changingZone === biz.id || (biz.zone ?? 'standard') === 'standard'}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  (biz.zone ?? 'standard') === 'standard'
                    ? 'bg-slate-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
              >
                Standard
              </button>
              <button
                onClick={() => handleChangeZone(biz.id, 'kadiolo')}
                disabled={changingZone === biz.id || biz.zone === 'kadiolo'}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  biz.zone === 'kadiolo'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
              >
                Kadiolo
              </button>
            </div>

            {/* Changer de plan */}
            <div className="flex flex-wrap gap-2">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => biz.subscription && handleChangePlan(biz.subscription.id, plan.id)}
                  disabled={activating === biz.subscription?.id || biz.subscription?.plan_id === plan.id}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    biz.subscription?.plan_id === plan.id
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <Crown className="h-3 w-3 inline mr-1" />
                  {plan.name} — {formatCurrency(plan.price)}
                </button>
              ))}
              {biz.subscription?.status !== 'active' ? (
                <button
                  onClick={() => biz.subscription && handleActivate(biz.subscription.id, biz.subscription.plan_id)}
                  disabled={activating === biz.subscription?.id}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                >
                  <CheckCircle className="h-3 w-3 inline mr-1" />
                  Activer
                </button>
              ) : (
                <button
                  onClick={() => biz.subscription && handleDeactivate(biz.subscription.id, biz.name)}
                  disabled={activating === biz.subscription?.id}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-red-600 hover:bg-red-500 text-white transition-colors"
                >
                  <XCircle className="h-3 w-3 inline mr-1" />
                  Désactiver
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
