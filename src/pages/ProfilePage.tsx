import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Building2, Trash2, Crown, Calendar, ChevronRight, Pencil } from 'lucide-react'
import { Card } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { useSubscription } from '@/hooks/useSubscription'
import { profileService } from '@/services/profileService'
import { subscriptionService } from '@/services/subscriptionService'
import { useToast } from '@/store/toastStore'

export default function ProfilePage() {
  const { user, profile, setProfile } = useAuthStore()
  const { subscription, business, reload } = useSubscription()
  const toast = useToast()
  const navigate = useNavigate()

  const [editingProfile, setEditingProfile] = useState(false)
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [profileSubmitting, setProfileSubmitting] = useState(false)
  const [cleanConfirm, setCleanConfirm] = useState(false)
  const [cleanSubmitting, setCleanSubmitting] = useState(false)

  const handleUpdateProfile = async () => {
    if (!user || !fullName.trim()) return
    setProfileSubmitting(true)
    try {
      const updated = await profileService.updateProfile(user.id, { full_name: fullName })
      setProfile(updated)
      toast.success('Profil mis à jour')
      setEditingProfile(false)
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
      reload()
    } catch {
      toast.error('Erreur', 'Impossible de nettoyer les données')
    } finally {
      setCleanSubmitting(false)
      setCleanConfirm(false)
    }
  }

  const isTrialing = subscription?.status === 'trial'
  const daysLeft = isTrialing ? subscriptionService.getDaysLeftInTrial(subscription!) : 0

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Mon profil</h1>
        <p className="text-sm text-muted-foreground">Informations personnelles et abonnement</p>
      </div>

      {/* Abonnement — résumé avec lien */}
      <Card
        className="p-4 space-y-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => navigate('/subscription')}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-orange-500" />
            <h2 className="font-semibold text-sm">Mon abonnement</h2>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>

        {isTrialing && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
            <p className="text-sm text-orange-700 font-medium">
              ⏳ Essai gratuit — {daysLeft} jour(s) restant(s)
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

        <p className="text-xs text-primary font-medium">Voir tous les plans →</p>
      </Card>

      {/* Infos personnelles — lecture seule */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-blue-500" />
            <h2 className="font-semibold text-sm">Informations personnelles</h2>
          </div>
          {!editingProfile && (
            <button
              onClick={() => setEditingProfile(true)}
              className="p-1.5 hover:bg-blue-50 rounded text-blue-500"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {!editingProfile ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between py-1.5 border-b">
              <span className="text-xs text-muted-foreground">Nom complet</span>
              <span className="text-sm font-medium">{profile?.full_name}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-xs text-muted-foreground">Email</span>
              <span className="text-sm">{user?.email}</span>
            </div>
          </div>
        ) : (
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
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setEditingProfile(false); setFullName(profile?.full_name ?? '') }}
              >
                Annuler
              </Button>
              <Button onClick={handleUpdateProfile} isLoading={profileSubmitting} size="sm">
                Enregistrer
              </Button>
            </div>
          </div>
        )}
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
          <Button
            size="sm"
            className="bg-red-500 hover:bg-red-600 text-white"
            onClick={handleCleanData}
            isLoading={cleanSubmitting}
          >
            {cleanConfirm ? 'Confirmer la suppression' : 'Nettoyer les données'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
