import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Building2, User, Phone, MapPin, Check, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useSubscription } from '@/hooks/useSubscription'

const STEPS = ['Compte', 'Commerce']

export default function RegisterPage() {
  const navigate = useNavigate()
  const { plans, createBusiness } = useSubscription()

  const [step, setStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Étape 1 — Compte
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Étape 2 — Commerce
  const [businessName, setBusinessName] = useState('')
  const [businessPhone, setBusinessPhone] = useState('')
  const [businessCity, setBusinessCity] = useState('')

  const handleStep1 = () => {
    if (!fullName || !email || !password) {
      setError('Tous les champs obligatoires doivent être remplis')
      return
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }
    setError('')
    setStep(1)
  }

  const handleStep2 = async () => {
    if (!businessName) {
      setError('Le nom du commerce est obligatoire')
      return
    }
    setError('')
    setIsLoading(true)
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role: 'admin' }
        }
      })
      if (authError) throw authError
      if (!data.user) throw new Error('Erreur lors de la création du compte')

      const businessPlan = plans.find((p) => p.slug === 'business')
      if (!businessPlan) throw new Error('Plan introuvable')

      await createBusiness(
        { name: businessName, phone: businessPhone, city: businessCity },
        businessPlan.id
      )

      navigate('/')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'inscription'
      if (
        msg.toLowerCase().includes('already registered') ||
        msg.toLowerCase().includes('already exists') ||
        msg.toLowerCase().includes('user already') ||
        msg.toLowerCase().includes('email')
      ) {
        setError('Un compte existe déjà avec cet email. Connectez-vous ou réinitialisez votre mot de passe.')
        setStep(0)
      } else {
        setError(msg)
      }
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
          <p className="text-slate-400 text-xs">Gestion de stock intelligente</p>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Progress steps */}
        <div className="bg-slate-50 px-6 py-4 border-b">
          <div className="flex items-center justify-center gap-4">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  i < step ? 'bg-emerald-500 text-white' :
                  i === step ? 'bg-orange-500 text-white' :
                  'bg-slate-200 text-slate-400'
                }`}>
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-sm font-medium ${
                  i === step ? 'text-orange-500' : 'text-slate-400'
                }`}>{s}</span>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 w-12 ml-2 ${i < step ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-4">

          {/* Étape 1 — Compte */}
          {step === 0 && (
            <>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Créer votre compte</h2>
                <p className="text-sm text-slate-500 mt-0.5">14 jours d'essai gratuit, sans carte bancaire</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom complet *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="Ibrahima Sidibé"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="vous@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Mot de passe *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 pr-9 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="Min. 6 caractères"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Confirmer le mot de passe *</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 pr-9 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="Répétez le mot de passe"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 space-y-1">
                  <p className="text-sm text-red-500">{error}</p>
                  {error.includes('compte existe') && (
                    <div className="flex gap-3">
                      <Link to="/login" className="text-sm text-orange-500 font-semibold hover:underline">
                        Se connecter →
                      </Link>
                      <span className="text-slate-300">|</span>
                      <Link to="/login" className="text-sm text-slate-500 hover:underline">
                        Mot de passe oublié ?
                      </Link>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleStep1}
                className="w-full h-10 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-sm font-semibold transition-colors"
              >
                Continuer →
              </button>
              <p className="text-center text-sm text-slate-500">
                Déjà un compte ?{' '}
                <Link to="/login" className="text-orange-500 font-medium hover:underline">
                  Se connecter
                </Link>
              </p>
            </>
          )}

          {/* Étape 2 — Commerce */}
          {step === 1 && (
            <>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Votre commerce</h2>
                <p className="text-sm text-slate-500 mt-0.5">Informations sur votre boutique</p>
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
                      placeholder="Bamako, Sikasso, Tombouctou..."
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  <p className="text-sm text-red-500">{error}</p>
                  {error.includes('compte existe') && (
                    <Link to="/login" className="text-sm text-orange-500 font-semibold hover:underline">
                      Se connecter →
                    </Link>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => { setStep(0); setError('') }}
                  className="flex-1 h-10 border border-slate-200 text-slate-600 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  ← Retour
                </button>
                <button
                  onClick={handleStep2}
                  disabled={isLoading}
                  className="flex-1 h-10 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-md text-sm font-semibold transition-colors"
                >
                  {isLoading ? 'Création...' : 'Commencer l\'essai gratuit 🚀'}
                </button>
              </div>
              <p className="text-xs text-center text-slate-400">
                Aucune carte bancaire requise • 14 jours gratuits
              </p>
            </>
          )}

        </div>
      </div>

      <p className="text-center text-slate-600 text-xs mt-6">
        © {new Date().getFullYear()} STOCKAM · Tous droits réservés
      </p>
    </div>
  )
}
