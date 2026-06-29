import { useState } from 'react'
import { User, Building2, Trash2, Crown, Calendar } from 'lucide-react'
import { Card } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { useSubscription } from '@/hooks/useSubscription'
import { profileService } from '@/services/profileService'
import { subscriptionService } from '@/services/subscriptionService'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/store/toastStore'

export default function ProfilePage() {
  const { user, profile, setProfile } = useAuthStore()
  const { subscription, business, plans, reload } = useSubscription()
  const toast = useToast()

  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [profileSubmitting, setProfileSubmitting] = useState(false)
  const [cleanConfirm, setCleanConfirm] = useState(false)
  const [cleanSubmitting, setCleanSubmitting] = useState(false)
  const [planSubmitting, setPlanSubmitting] = useState(false)

  const handleUpdateProfile = async () => {
    if (!user || !fullName.trim()) return
    setProfileSubmitting(true)
    try {
      const updated = await profileService.updateProfile(user.id, { full_name: fullName })
      setProfile(updated)
      toast.success('Profil mis à jour')
    } catch {
      toast.error('Erreur', 'Impossible de mettre à jour le profil')
    } finally {
      setProfileSubmitting(false)
    }
  }

  const handleCleanData = async () => {
    if (!cleanConfirm) {
      setCleanConfirm(true)
      return
    }
    setCleanSubmitting(true)
    try {
      await profileService.cleanDemoData()
      toast.success('Données nettoyées', 'Les données de test ont été supprimées')
      setCleanConfirm(false)
    } catch {
      toast.error('Erreur', 'Impossible de nettoyer les données')
    } finally {
      setCleanSubmitting(false)
    }
  }

  const handleChangePlan = async (planId: string) => {
    if (!subscription) return
    setPlanSubmitting(true)
    try {
      await subscriptionService.updateSubscriptionPlan(subscription.id, planId)
      await reload()
      toast.success('Plan mis à jour')
    } catch {
      toast.error('Erreur', 'Impossible de changer de plan')
    } finally {
      setPlanSubmitting(false)
    }
  }

  const daysLeft = subscription ? subscriptionService.getDaysLeftInTrial(subscription) : 0
  const isTrialing = subscription?.status === 'trial'

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Mon profil</h1>
        <p className="text-sm text-muted-foreground">Informations personnelles et abonnement</p>
      </div>

      {/* Abonnement */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-orange-500" />
          <h2 className="font-semibold text-sm">Mon abonnement</h2>
        </div>

        {isTrialing && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
            <p className="text-sm text-orange-700 font-medium">
              ⏳ Essai gratuit — {daysLeft} jour(s) restant(s)
            </p>
            <p className="text-xs text-orange-600 mt-0.5">
              Choisissez un plan avant la fin de votre essai.
            </p>
          </div>
        )}

        {subscription && (
          <div className="flex items-center justify-between py-2 border rounded-lg px-3">
            <div>
              <p className="text-sm font-medium">{subscription.plan?.name ?? 'Aucun plan'}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {isTrialing
                  ? `Essai jusqu'au ${new Date(subscription.trial_ends_at).toLocaleDateString('fr-FR')}`
                  : `Renouvellement le ${new Date(subscription.current_period_end).toLocaleDateString('fr-FR')}`
                }
              </p>
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              isTrialing ? 'bg-orange-100 text-orange-600' :
              subscription.status === 'active' ? 'bg-emerald-100 text-emerald-600' :
              'bg-red-100 text-red-600'
            }`}>
              {isTrialing ? 'Essai' : subscription.status === 'active' ? 'Actif' : 'Expiré'}
            </span>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Changer de plan</p>
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`flex items-center justify-between p-3 border rounded-lg ${
                subscription?.plan_id === plan.id ? 'border-orange-500 bg-orange-50' : 'border-slate-200'
              }`}
            >
              <div>
                <p className="text-sm font-medium">{plan.name}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(plan.price)}/mois</p>
              </div>
              {subscription?.plan_id === plan.id ? (
                <span className="text-xs text-orange-500 font-medium">Plan actuel</span>
              ) : (
                <Button size="sm" variant="outline" onClick={() => handleChangePlan(plan.id)} isLoading={planSubmitting}>
                  Choisir
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Infos personnelles */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-blue-500" />
          <h2 className="font-semibold text-sm">Informations personnelles</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Nom complet</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={user?.email ?? ''}
              disabled
              className="w-full h-9 rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">L'email ne peut pas être modifié</p>
          </div>
        </div>
        <Button onClick={handleUpdateProfile} isLoading={profileSubmitting} size="sm">
          Enregistrer
        </Button>
      </Card>

      {/* Commerce */}
      {business && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-emerald-500" />
            <h2 className="font-semibold text-sm">Mon commerce</h2>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-1.5 border-b">
              <span className="text-xs text-muted-foreground">Nom</span>
              <span className="text-sm font-medium">{business.name}</span>
            </div>
            {business.phone && (
              <div className="flex items-center justify-between py-1.5 border-b">
                <span className="text-xs text-muted-foreground">Téléphone</span>
                <span className="text-sm">{business.phone}</span>
              </div>
            )}
            {business.city && (
              <div className="flex items-center justify-between py-1.5">
                <span className="text-xs text-muted-foreground">Ville</span>
                <span className="text-sm">{business.city}</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Nettoyage des données */}
      <Card className="p-4 space-y-3 border-red-200">
        <div className="flex items-center gap-2">
          <Trash2 className="h-4 w-4 text-red-500" />
          <h2 className="font-semibold text-sm text-red-600">Nettoyer les données de test</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Supprime ventes, dépenses, mouvements, clients et fournisseurs. Produits conservés. Stocks remis à zéro.
        </p>
        {cleanConfirm && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <p className="text-sm text-red-600 font-medium">⚠️ Êtes-vous sûr ? Action irréversible !</p>
          </div>
        )}
        <div className="flex gap-2">
          {cleanConfirm && (
            <Button variant="outline" size="sm" onClick={() => setCleanConfirm(false)}>
              Annuler
            </Button>
          )}
          <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white" onClick={handleCleanData} isLoading={cleanSubmitting}>
            {cleanConfirm ? 'Confirmer la suppression' : 'Nettoyer les données'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
