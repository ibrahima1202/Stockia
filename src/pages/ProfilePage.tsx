import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Building2, Trash2, Crown, Calendar, ChevronRight, Pencil, Package, ShoppingBag } from 'lucide-react'
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

  // Profil
  const [editingProfile, setEditingProfile] = useState(false)
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [profileSubmitting, setProfileSubmitting] = useState(false)

  // Commerce
  const [editingBusiness, setEditingBusiness] = useState(false)
  const [businessName, setBusinessName] = useState(business?.name ?? '')
  const [businessPhone, setBusinessPhone] = useState(business?.phone ?? '')
  const [businessCity, setBusinessCity] = useState(business?.city ?? '')
  const [commerceType, setCommerceType] = useState<'detail' | 'gros_detail'>(business?.commerce_type ?? 'detail')
  const [businessSubmitting, setBusinessSubmitting] = useState(false)

  // Nettoyage
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

  const handleUpdateBusiness = async () => {
    if (!business || !businessName.trim()) return
    setBusinessSubmitting(true)
    try {
      await subscriptionService.updateBusiness(business.id, {
        name: businessName,
        phone: businessPhone,
        city: businessCity,
        commerce_type: commerceType,
      })
      toast.success('Commerce mis à jour')
      setEditingBusiness(false)
      reload()
    } catch {
      toast.error('Erreur', 'Impossible de mettre à jour le commerce')
    } finally {
      setBusinessSubmitting(false)
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

      {/* Abonnement */}
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

      {/* Infos personnelles */}
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
              <Button variant="outline" size="sm" onClick={() => { setEditingProfile(false); setFullName(profile?.full_name ?? '') }}>
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-500" />
              <h2 className="font-semibold text-sm">Mon commerce</h2>
            </div>
            {!editingBusiness && (
              <button
                onClick={() => {
                  setBusinessName(business.name)
                  setBusinessPhone(business.phone ?? '')
                  setBusinessCity(business.city ?? '')
                  setCommerceType(business.commerce_type ?? 'detail')
                  setEditingBusiness(true)
                }}
                className="p-1.5 hover:bg-emerald-50 rounded text-emerald-500"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {!editingBusiness ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1.5 border-b">
                <span className="text-xs text-muted-foreground">Nom</span>
                <span className="text-sm font-medium">{business.name}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b">
                <span className="text-xs text-muted-foreground">Téléphone</span>
                <span className="text-sm">{business.phone || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b">
                <span className="text-xs text-muted-foreground">Ville</span>
                <span className="text-sm">{business.city || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-xs text-muted-foreground">Type de vente</span>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  business.commerce_type === 'gros_detail'
                    ? 'bg-orange-100 text-orange-600'
                    : 'bg-blue-100 text-blue-600'
                }`}>
                  {business.commerce_type === 'gros_detail' ? '📦 Gros & Détail' : '🛍️ Détail uniquement'}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Nom du commerce *</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="+223 XX XX XX XX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ville</label>
                <input
                  type="text"
                  value={businessCity}
                  onChange={(e) => setBusinessCity(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Kadiolo, Sikasso, Bamako..."
                />
              </div>

              {/* Type de commerce */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">Type de vente</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCommerceType('detail')}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors ${
                      commerceType === 'detail'
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Package className={`h-5 w-5 ${commerceType === 'detail' ? 'text-orange-500' : 'text-slate-400'}`} />
                    <div className="text-center">
                      <p className={`text-xs font-semibold ${commerceType === 'detail' ? 'text-orange-600' : 'text-slate-700'}`}>
                        Vente au détail
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Vente à l'unité</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCommerceType('gros_detail')}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors ${
                      commerceType === 'gros_detail'
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <ShoppingBag className={`h-5 w-5 ${commerceType === 'gros_detail' ? 'text-orange-500' : 'text-slate-400'}`} />
                    <div className="text-center">
                      <p className={`text-xs font-semibold ${commerceType === 'gros_detail' ? 'text-orange-600' : 'text-slate-700'}`}>
                        Gros & Détail
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Carton, pack, pièce...</p>
                    </div>
                  </button>
                </div>
                {commerceType === 'gros_detail' && business.commerce_type === 'detail' && (
                  <div className="bg-orange-50 border border-orange-200 rounded-md px-3 py-2">
                    <p className="text-xs text-orange-700">
                      💡 En passant en mode Gros & Détail, vous pourrez définir des unités (Pack, Carton...) pour chaque produit.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingBusiness(false)}>
                  Annuler
                </Button>
                <Button onClick={handleUpdateBusiness} isLoading={businessSubmitting} size="sm">
                  Enregistrer
                </Button>
              </div>
            </div>
          )}
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
