import { useState } from 'react'
import { Building2, Phone, MapPin, ShoppingBag, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSubscription } from '@/hooks/useSubscription'
import { useAuthStore } from '@/store/authStore'

export default function SetupPage() {
  const { createBusiness, plans } = useSubscription()
  const { profile } = useAuthStore()

  const [businessName, setBusinessName] = useState('')
  const [businessPhone, setBusinessPhone] = useState('')
  const [businessCity, setBusinessCity] = useState('')
  const [commerceType, setCommerceType] = useState<'detail' | 'gros_detail'>('detail')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!businessName.trim()) {
      setError('Le nom du commerce est obligatoire')
      return
    }
    setIsLoading(true)
    setError('')
    try {
      const businessPlan = plans.find((p) => p.slug === 'business')
      if (!businessPlan) throw new Error('Plan introuvable')

      await createBusiness(
        {
          name: businessName,
          phone: businessPhone,
          city: businessCity,
          commerce_type: commerceType,
        },
        businessPlan.id
      )
      window.location.href = '/'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-8">

      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <svg viewBox="0 0 44 44" width="44" height="44" xmlns="http://www.w3.org/2000/svg">
          <rect width="44" height="44" rx="8" fill="#0f172a"/>
          <rect x="7" y="22" width="30" height="18" rx="2" fill="#f97316"/>
          <polygon points="4,22 22,10 40,22" fill="#fb923c"/>
          <rect x="17" y="28" width="10" height="12" rx="1" fill="#0f172a"/>
          <rect x="9" y="24" width="6" height="5" rx="1" fill="#fed7aa"/>
          <rect x="29" y="24" width="6" height="5" rx="1" fill="#fed7aa"/>
          <circle cx="37" cy="13" r="4" fill="#22c55e"/>
        </svg>
        <div>
          <p className="text-white font-bold text-xl leading-tight">
            STOCK<span className="text-orange-500">AM</span>
          </p>
          <p className="text-slate-400 text-xs">Gestion de Commerce Simplifiée</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Bienvenue {profile?.full_name} ! 👋
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Configurez votre commerce pour commencer
          </p>
        </div>

        {/* Type de commerce */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Type de vente *
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setCommerceType('detail')}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors text-left ${
                commerceType === 'detail'
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <Package className={`h-6 w-6 ${commerceType === 'detail' ? 'text-orange-500' : 'text-slate-400'}`} />
              <div>
                <p className={`text-sm font-semibold ${commerceType === 'detail' ? 'text-orange-600' : 'text-slate-700'}`}>
                  Vente au détail
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Vente à l'unité uniquement
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setCommerceType('gros_detail')}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors text-left ${
                commerceType === 'gros_detail'
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <ShoppingBag className={`h-6 w-6 ${commerceType === 'gros_detail' ? 'text-orange-500' : 'text-slate-400'}`} />
              <div>
                <p className={`text-sm font-semibold ${commerceType === 'gros_detail' ? 'text-orange-600' : 'text-slate-700'}`}>
                  Gros & Détail
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Carton, pack, pièce...
                </p>
              </div>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Nom du commerce *</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Ex: Quincaillerie Sidibé"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Téléphone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="tel"
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="+223 XX XX XX XX"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ville</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={businessCity}
                onChange={(e) => setBusinessCity(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Kadiolo, Sikasso, Bamako..."
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-md">{error}</p>
        )}

        <Button
          className="w-full"
          onClick={handleSubmit}
          isLoading={isLoading}
          disabled={!businessName.trim()}
        >
          Commencer l'essai gratuit 🚀
        </Button>

        <p className="text-xs text-center text-slate-400">
          14 jours gratuits • Aucune carte bancaire requise
        </p>
      </div>
    </div>
  )
}
