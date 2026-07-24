import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Zap, Copy, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSubscription } from '@/hooks/useSubscription'
import { useAuthStore } from '@/store/authStore'

export default function TestLigdicashPage() {
  const navigate = useNavigate()
  const { subscription } = useSubscription()
  const { profile } = useAuthStore()

  const [amount, setAmount] = useState(10)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    if (!subscription?.id || !profile?.id) {
      setError('Aucun abonnement ou profil trouvé sur ce compte. Connecte-toi avec un compte ayant un abonnement actif.')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const response = await fetch('/.netlify/functions/ligdicash-init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          planName: 'Test LigdiCash',
          subscriptionId: subscription.id,
          userId: profile.id,
        }),
      })
      const data = await response.json()
      if (data.redirect_url) {
        setResult(data)
      } else {
        setError('Réponse inattendue : ' + JSON.stringify(data))
      }
    } catch (err) {
      setError('Erreur de connexion : ' + String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!result?.redirect_url) return
    navigator.clipboard.writeText(result.redirect_url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l'accueil
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-6 space-y-5">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Page de test LigdiCash</h1>
            <p className="text-xs text-amber-600 mt-1 font-medium">
              ⚠️ Page temporaire — à supprimer après validation par LigdiCash
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 space-y-1 text-sm">
            <p className="text-slate-500">Compte utilisé</p>
            <p className="font-mono text-slate-700 break-all">userId: {profile?.id ?? 'non connecté'}</p>
            <p className="font-mono text-slate-700 break-all">subscriptionId: {subscription?.id ?? 'aucun abonnement'}</p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Montant (XOF)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <Button className="w-full" onClick={handleGenerate} isLoading={loading}>
            <Zap className="h-4 w-4" />
            Générer le lien de paiement
          </Button>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 break-all">
              {error}
            </div>
          )}

          {result?.redirect_url && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-emerald-800">Lien généré avec succès</p>
              <p className="text-xs text-slate-600 break-all font-mono bg-white rounded-lg p-2 border">
                {result.redirect_url}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    copied ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'
                  }`}
                >
                  {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copié !' : 'Copier le lien'}
                </button>
                <a
                  href={result.redirect_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center py-2 px-3 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                >
                  Ouvrir le lien
                </a>
              </div>
              <p className="text-xs text-slate-500">
                Transmets ce lien à l'équipe LigdiCash pour qu'ils effectuent leur paiement de test.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
