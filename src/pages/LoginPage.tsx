import { useState } from 'react'
import { Eye, EyeOff, Phone, Mail, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

const phoneToEmail = (phone: string): string => {
  const digits = phone.replace(/\D/g, '')
  return `${digits}@stockam.app`
}

const isEmail = (value: string): boolean => value.includes('@')

export default function LoginPage() {
  const { signIn } = useAuth()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Mot de passe oublié
  const [showForgot, setShowForgot] = useState(false)
  const [forgotIdentifier, setForgotIdentifier] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSuccess, setForgotSuccess] = useState(false)
  const [forgotError, setForgotError] = useState('')

  const isEmailMode = isEmail(identifier)
  const isForgotEmailMode = isEmail(forgotIdentifier)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!identifier.trim()) {
      setError('Veuillez saisir votre numéro ou email')
      return
    }
    if (password.length < 6) {
      setError('Mot de passe trop court')
      return
    }

    setIsLoading(true)
    try {
      const email = isEmailMode ? identifier.trim() : phoneToEmail(identifier)
      await signIn(email, password)
    } catch {
      setError(
        isEmailMode
          ? 'Email ou mot de passe incorrect'
          : 'Numéro ou mot de passe incorrect'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError('')

    if (!forgotIdentifier.trim()) {
      setForgotError('Veuillez saisir votre numéro ou email')
      return
    }

    // Les comptes téléphone n'ont pas d'email réel — pas de reset possible par email
    if (!isForgotEmailMode) {
      setForgotError('La réinitialisation par numéro de téléphone n\'est pas disponible. Contactez l\'équipe STOCKAM sur WhatsApp : +223 92347783')
      return
    }

    setForgotLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        forgotIdentifier.trim(),
        { redirectTo: `${window.location.origin}/reset-password` }
      )
      if (error) throw error
      setForgotSuccess(true)
    } catch {
      setForgotError('Impossible d\'envoyer le lien. Vérifiez votre email.')
    } finally {
      setForgotLoading(false)
    }
  }

  // Page mot de passe oublié
  if (showForgot) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-8">
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

        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
          <button
            onClick={() => { setShowForgot(false); setForgotIdentifier(''); setForgotSuccess(false); setForgotError('') }}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Retour à la connexion
          </button>

          {forgotSuccess ? (
            <div className="text-center space-y-3 py-4">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <Mail className="h-7 w-7 text-emerald-500" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Email envoyé !</h2>
              <p className="text-sm text-slate-500">
                Un lien de réinitialisation a été envoyé à <strong>{forgotIdentifier}</strong>. Vérifiez votre boîte mail.
              </p>
              <button
                onClick={() => { setShowForgot(false); setForgotIdentifier(''); setForgotSuccess(false) }}
                className="text-sm text-orange-500 font-medium hover:underline"
              >
                Retour à la connexion
              </button>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Mot de passe oublié</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Saisissez votre numéro ou email pour récupérer votre accès
                </p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium">
                    Numéro de téléphone
                    <span className="text-slate-400 font-normal ml-1">(ou email)</span>
                  </label>
                  <div className="relative">
                    {isForgotEmailMode ? (
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    ) : (
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    )}
                    <input
                      type="text"
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      placeholder="79740816 ou email@example.com"
                      className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      autoFocus
                    />
                  </div>
                </div>

                {forgotError && (
                  <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 space-y-2">
                    <p className="text-sm text-red-500">{forgotError}</p>
                    {!isForgotEmailMode && (
                      <a
                        href="https://wa.me/22392347783?text=Bonjour, j'ai oublié mon mot de passe STOCKAM."
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-sm text-green-600 font-medium hover:underline"
                      >
                        💬 Contacter l'équipe sur WhatsApp
                      </a>
                    )}
                  </div>
                )}

                <Button type="submit" className="w-full" isLoading={forgotLoading}>
                  Envoyer le lien de réinitialisation
                </Button>
              </form>

              {/* Info pour les comptes téléphone */}
              <div className="bg-orange-50 border border-orange-200 rounded-md px-3 py-2">
                <p className="text-xs text-orange-700">
                  💡 Si vous avez un compte téléphone, contactez-nous sur WhatsApp pour réinitialiser votre mot de passe.
                </p>
                <a
                  href="https://wa.me/22392347783?text=Bonjour, j'ai oublié mon mot de passe STOCKAM."
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-green-600 font-medium hover:underline mt-1 block"
                >
                  💬 +223 92347783 (Equipe Stockam)
                </a>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          © {new Date().getFullYear()} STOCKAM · Tous droits réservés
        </p>
      </div>
    )
  }

  // Page connexion principale
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

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Connexion</h2>
          <p className="text-sm text-slate-500 mt-0.5">Accédez à votre espace de gestion</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Identifiant */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">
              Numéro de téléphone
              <span className="text-slate-400 font-normal ml-1">(ou email)</span>
            </label>
            <div className="relative">
              {isEmailMode ? (
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              ) : (
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              )}
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="79740816 ou email@example.com"
                className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                autoComplete="off"
                autoFocus
              />
            </div>
            {identifier && (
              <p className="text-xs text-slate-400">
                {isEmailMode ? '📧 Connexion par email' : '📱 Connexion par téléphone'}
              </p>
            )}
          </div>

          {/* Mot de passe */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium">Mot de passe</label>
              <button
                type="button"
                onClick={() => { setShowForgot(true); setForgotIdentifier(identifier) }}
                className="text-xs text-orange-500 hover:underline"
              >
                Mot de passe oublié ?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 pr-9 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                autoComplete="current-password"
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

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Se connecter
          </Button>
        </form>

        <p className="text-center text-sm text-slate-500">
          Pas encore de compte ?{' '}
          <Link to="/register" className="text-orange-500 font-medium hover:underline">
            Créer un compte gratuit
          </Link>
        </p>
      </div>

      <p className="text-center text-slate-600 text-xs mt-6">
        © {new Date().getFullYear()} STOCKAM · Tous droits réservés
      </p>
    </div>
  )
}
