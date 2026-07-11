import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Copy, Smartphone, MessageCircle, CreditCard, Zap } from 'lucide-react'
import { Card } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { useSubscription } from '@/hooks/useSubscription'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

type PaymentMode = 'online' | 'manual'

export default function PaymentPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const planId = searchParams.get('plan')
  const period = searchParams.get('period') ?? 'monthly'
  const { plans, subscription, isLoading } = useSubscription()
  const { profile } = useAuthStore()

  const plan = plans.find((p) => p.id === planId)

  // Mode de paiement
  const [paymentMode, setPaymentMode] = useState<PaymentMode | null>(null)

  // Paiement manuel
  const [reference, setReference] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'wave' | 'orange_money'>('wave')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [copied, setCopied] = useState(false)

  // Paiement en ligne
  const [onlineSubmitting, setOnlineSubmitting] = useState(false)

  const PHONE_NUMBER = '+223 92347783'
  const OWNER_NAME = 'Equipe Stockam'
  const WHATSAPP_NUMBER = '22392347783'

  const getAmount = () => {
    if (!plan) return 0
    if (period === 'yearly') return plan.price * 10
    return plan.price
  }

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(PHONE_NUMBER)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      `Bonjour Equipe Stockam ! 👋\n\n` +
      `Je viens d'effectuer un paiement pour activer mon abonnement STOCKAM.\n\n` +
      `📋 Détails :\n` +
      `• Nom : ${profile?.full_name ?? 'Non renseigné'}\n` +
      `• Plan : ${plan?.name ?? ''} (${period === 'yearly' ? 'Annuel' : 'Mensuel'})\n` +
      `• Montant : ${formatCurrency(getAmount())} XOF\n` +
      `• Méthode : ${paymentMethod === 'wave' ? 'Wave' : 'Orange Money'}\n` +
      `• Référence : ${reference || 'À renseigner'}\n\n` +
      `Merci d'activer mon compte. 🙏`
    )
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank')
  }

  const handleManualSubmit = async () => {
    if (!reference.trim() || !plan || !subscription) return
    setSubmitting(true)
    try {
      await supabase.from('payments').insert({
        subscription_id: subscription.id,
        amount: getAmount(),
        payment_method: paymentMethod,
        reference: reference.trim(),
        status: 'pending',
      })
      setSubmitted(true)
    } catch {
    } finally {
      setSubmitting(false)
    }
  }

  const handleOnlinePayment = async () => {
    if (!plan || !subscription) return
    setOnlineSubmitting(true)
    try {
      const response = await fetch('/.netlify/functions/paytech-init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: getAmount(),
          planName: `${plan.name} (${period === 'yearly' ? 'Annuel' : 'Mensuel'})`,
          subscriptionId: subscription.id,
          userId: profile?.id,
        }),
      })
      const data = await response.json()
      if (data.redirect_url) {
        window.location.href = data.redirect_url
      } else {
        alert('Erreur lors de l\'initialisation du paiement. Essayez le paiement manuel.')
      }
    } catch {
      alert('Erreur de connexion. Essayez le paiement manuel.')
    } finally {
      setOnlineSubmitting(false)
    }
  }

  // Chargement
  if (isLoading || plans.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  // Plan introuvable
  if (!plan) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Plan introuvable</p>
          <Button onClick={() => navigate('/subscription')}>Voir les plans</Button>
        </div>
      </div>
    )
  }

  // Paiement manuel soumis
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Paiement soumis !</h2>
          <p className="text-sm text-slate-500">
            Votre référence de transaction a été enregistrée. Votre abonnement sera activé dans les <strong>24 heures</strong> après vérification.
          </p>
          <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm text-slate-600">
            Référence : <strong className="font-mono">{reference}</strong>
          </div>
          <Button className="w-full" variant="outline" onClick={() => navigate('/')}>
            Retour à l'accueil
          </Button>
          <button
            onClick={handleWhatsApp}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold text-sm transition-colors"
          >
            <MessageCircle className="h-5 w-5" />
            Notifier l'équipe sur WhatsApp
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-4">

        <button
          onClick={() => paymentMode ? setPaymentMode(null) : navigate('/subscription')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {paymentMode ? 'Retour au choix du paiement' : 'Retour aux plans'}
        </button>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-slate-900 px-6 py-5">
            <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Paiement pour</p>
            <p className="text-white font-bold text-xl">{plan.name}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-orange-400 text-2xl font-bold">{formatCurrency(getAmount())}</p>
              <p className="text-slate-400 text-sm">{period === 'yearly' ? '/an' : '/mois'}</p>
            </div>
            {period === 'yearly' && (
              <p className="text-emerald-400 text-xs mt-1">
                ✓ 2 mois offerts — économisez {formatCurrency(plan.price * 2)} XOF
              </p>
            )}
          </div>

          <div className="p-6 space-y-5">

            {/* Choix du mode de paiement */}
            {!paymentMode && (
              <>
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">Choisissez votre mode de paiement</h3>
                  <p className="text-xs text-slate-500">Sélectionnez l'option qui vous convient le mieux</p>
                </div>

                <div className="space-y-3">
                  {/* Paiement en ligne */}
                  <button
                    onClick={() => setPaymentMode('online')}
                    className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-orange-500 bg-orange-50 hover:bg-orange-100 transition-colors text-left"
                  >
                    <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center shrink-0">
                      <Zap className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900 text-sm">Payer en ligne</p>
                        <span className="text-[10px] font-bold bg-orange-500 text-white px-2 py-0.5 rounded-full">RECOMMANDÉ</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">Wave / Orange Money via Paytech</p>
                      <p className="text-xs text-emerald-600 font-semibold mt-1">⚡ Activation automatique immédiate</p>
                    </div>
                  </button>

                  {/* Paiement manuel */}
                  <button
                    onClick={() => setPaymentMode('manual')}
                    className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center shrink-0">
                      <CreditCard className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-900 text-sm">Paiement manuel</p>
                      <p className="text-xs text-slate-600 mt-0.5">Envoi direct sur Wave / Orange Money</p>
                      <p className="text-xs text-slate-400 mt-1">⏳ Activation sous 24h après vérification</p>
                    </div>
                  </button>
                </div>

                <p className="text-xs text-center text-slate-400">
                  Paiement 100% sécurisé · Annulation possible à tout moment
                </p>
              </>
            )}

            {/* Paiement en ligne */}
            {paymentMode === 'online' && (
              <div className="space-y-4">
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center space-y-2">
                  <Zap className="h-8 w-8 text-orange-500 mx-auto" />
                  <p className="font-bold text-slate-900">Paiement sécurisé via Paytech</p>
                  <p className="text-sm text-slate-600">
                    Vous allez être redirigé vers la plateforme de paiement Paytech pour payer via Wave ou Orange Money.
                  </p>
                  <p className="text-xs text-emerald-600 font-semibold">
                    ⚡ Votre abonnement sera activé automatiquement après le paiement !
                  </p>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Plan</span>
                    <span className="font-medium">{plan.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Période</span>
                    <span className="font-medium">{period === 'yearly' ? 'Annuel' : 'Mensuel'}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2 mt-2">
                    <span className="font-bold text-slate-900">Total</span>
                    <span className="font-bold text-orange-500">{formatCurrency(getAmount())} XOF</span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleOnlinePayment}
                  isLoading={onlineSubmitting}
                >
                  <Zap className="h-4 w-4" />
                  Payer {formatCurrency(getAmount())} XOF en ligne
                </Button>

                <p className="text-xs text-center text-slate-400">
                  Vous serez redirigé vers Paytech pour finaliser votre paiement
                </p>
              </div>
            )}

            {/* Paiement manuel */}
            {paymentMode === 'manual' && (
              <div className="space-y-5">
                {/* Choix méthode */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700">Choisissez votre méthode</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'wave', label: 'Wave', color: 'blue' },
                      { value: 'orange_money', label: 'Orange Money', color: 'orange' },
                    ].map((method) => (
                      <button
                        key={method.value}
                        onClick={() => setPaymentMethod(method.value as 'wave' | 'orange_money')}
                        className={`py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-colors ${
                          paymentMethod === method.value
                            ? method.color === 'blue'
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {method.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Instructions */}
                <Card className="p-4 bg-slate-50 space-y-3">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-slate-500" />
                    <p className="text-sm font-semibold text-slate-700">Instructions</p>
                  </div>
                  <ol className="space-y-2 text-sm text-slate-600">
                    <li className="flex gap-2">
                      <span className="font-bold text-orange-500 shrink-0">1.</span>
                      Ouvrez <strong>{paymentMethod === 'wave' ? 'Wave' : 'Orange Money'}</strong>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-orange-500 shrink-0">2.</span>
                      Envoyez <strong>{formatCurrency(getAmount())} XOF</strong> au numéro ci-dessous
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-orange-500 shrink-0">3.</span>
                      Copiez la <strong>référence</strong> reçue par SMS
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-orange-500 shrink-0">4.</span>
                      Collez-la dans le champ ci-dessous
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-orange-500 shrink-0">5.</span>
                      Notifiez l'équipe sur <strong>WhatsApp</strong>
                    </li>
                  </ol>
                </Card>

                {/* Numéro */}
                <div className="bg-slate-900 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-xs">Numéro {paymentMethod === 'wave' ? 'Wave' : 'Orange Money'}</p>
                    <p className="text-white font-bold text-xl font-mono">{PHONE_NUMBER}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{OWNER_NAME}</p>
                  </div>
                  <button
                    onClick={handleCopyNumber}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      copied ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copié !' : 'Copier'}
                  </button>
                </div>

                {/* Référence */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">
                    Référence de transaction *
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
                    placeholder="Ex: TXN123456789"
                  />
                  <p className="text-xs text-muted-foreground">
                    La référence se trouve dans le SMS de confirmation
                  </p>
                </div>

                <Button
                  className="w-full"
                  onClick={handleManualSubmit}
                  isLoading={submitting}
                  disabled={!reference.trim()}
                >
                  Confirmer le paiement
                </Button>

                <button
                  onClick={handleWhatsApp}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold text-sm transition-colors"
                >
                  <MessageCircle className="h-5 w-5" />
                  Notifier l'équipe sur WhatsApp
                </button>

                <p className="text-xs text-center text-muted-foreground">
                  Activation sous 24h après vérification du paiement.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
