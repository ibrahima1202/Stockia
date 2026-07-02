import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, Copy, Phone, Smartphone, CreditCard, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoadingScreen } from '@/components/ui/index'
import { useSubscription } from '@/hooks/useSubscription'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/store/toastStore'

const WAVE_NUMBER = '79740816'
const ORANGE_NUMBER = '79740816'
const RECIPIENT_NAME = 'Ibrahima Sidibé'

const FEDAPAY_PUBLIC_KEY = import.meta.env.VITE_FEDAPAY_PUBLIC_KEY as string
const FEDAPAY_ENV = (import.meta.env.VITE_FEDAPAY_ENV as string) || 'sandbox'

declare global {
  interface Window {
    FedaPay: any
  }
}

export default function PaymentPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { plans, subscription, isLoading: subLoading } = useSubscription()
  const toast = useToast()

  const planId = searchParams.get('plan')
  const durationParam = searchParams.get('duration') === 'annual' ? 'annual' : 'monthly'
  const isAnnual = durationParam === 'annual'
  const durationMonths = isAnnual ? 12 : 1

  const plan = plans.find((p) => p.id === planId)
  const amount = plan ? (isAnnual ? plan.price * 10 : plan.price) : 0

  const [selectedMethod, setSelectedMethod] = useState<'wave' | 'orange' | 'fedapay'>('fedapay')
  const [reference, setReference] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const [fedapayReady, setFedapayReady] = useState(false)
  const [fedapayStatus, setFedapayStatus] = useState<'idle' | 'verifying' | 'success' | 'timeout'>('idle')
  const pollRef = useRef<number | null>(null)

  // Charger le script Checkout.js de FedaPay une seule fois
  useEffect(() => {
    if (window.FedaPay) {
      setFedapayReady(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://cdn.fedapay.com/checkout.js?v=1.1.7'
    script.async = true
    script.onload = () => setFedapayReady(true)
    document.body.appendChild(script)
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current)
    }
  }, [])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copié !', text)
  }

  // Après le paiement FedaPay, on vérifie côté base que le webhook a bien activé l'abonnement
  const pollSubscriptionActivation = (targetPlanId: string) => {
    setFedapayStatus('verifying')
    let attempts = 0
    pollRef.current = window.setInterval(async () => {
      attempts += 1
      const { data } = await supabase
        .from('subscriptions')
        .select('status, plan_id')
        .eq('id', subscription?.id)
        .single()

      if (data && data.status === 'active' && data.plan_id === targetPlanId) {
        if (pollRef.current) window.clearInterval(pollRef.current)
        setFedapayStatus('success')
      } else if (attempts >= 15) {
        if (pollRef.current) window.clearInterval(pollRef.current)
        setFedapayStatus('timeout')
      }
    }, 2000)
  }

  const handleFedaPayPayment = () => {
    if (!window.FedaPay || !plan || !subscription) return

    const widget = window.FedaPay.init({
      public_key: FEDAPAY_PUBLIC_KEY,
      environment: FEDAPAY_ENV,
      locale: 'fr',
      transaction: {
        amount: Math.round(amount),
        description: `Abonnement STOCKAM - ${plan.name} (${isAnnual ? 'Annuel' : 'Mensuel'})`,
        custom_metadata: {
          subscription_id: subscription.id,
          plan_id: plan.id,
          duration_months: durationMonths,
        },
      },
      currency: { iso: 'XOF' },
      customer: {
        firstname: RECIPIENT_NAME.split(' ')[0],
        lastname: RECIPIENT_NAME.split(' ').slice(1).join(' ') || 'Client',
      },
      onComplete: ({ transaction }: { transaction?: { status: string } }) => {
        const status = transaction?.status
        if (status && status !== 'declined' && status !== 'canceled') {
          pollSubscriptionActivation(plan.id)
        } else if (status === 'declined' || status === 'canceled') {
          toast.error('Paiement échoué', 'La transaction a été refusée ou annulée.')
        }
      },
    })
    widget.open()
  }

  const handleSubmit = async () => {
    if (!reference.trim()) {
      toast.error('Erreur', 'Veuillez entrer la référence de votre transaction')
      return
    }
    if (!plan || !subscription) return
    setSubmitting(true)
    try {
      await supabase.from('payments').insert({
        subscription_id: subscription.id,
        amount: amount,
        payment_method: selectedMethod === 'wave' ? 'wave' : 'orange_money',
        status: 'pending',
        reference: reference.trim(),
        duration_months: durationMonths,
      })
      setSubmitted(true)
    } catch {
      toast.error('Erreur', 'Impossible d\'envoyer la demande')
    } finally {
      setSubmitting(false)
    }
  }

  if (subLoading) {
    return <LoadingScreen text="Chargement..." />
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center text-white">
          <p>Plan introuvable.</p>
          <button onClick={() => navigate('/profile')} className="text-orange-500 mt-2">
            Retour au profil
          </button>
        </div>
      </div>
    )
  }

  if (fedapayStatus === 'verifying' || fedapayStatus === 'success' || fedapayStatus === 'timeout') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center space-y-4">
          {fedapayStatus === 'verifying' && (
            <>
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Vérification du paiement...</h2>
              <p className="text-slate-500 text-sm">
                Merci de patienter quelques secondes pendant que nous activons votre abonnement.
              </p>
            </>
          )}
          {fedapayStatus === 'success' && (
            <>
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Abonnement activé !</h2>
              <p className="text-slate-500 text-sm">
                Votre plan <strong>{plan.name}</strong> ({isAnnual ? 'annuel' : 'mensuel'}) est maintenant actif. Merci pour votre paiement.
              </p>
              <Button className="w-full" onClick={() => navigate('/')}>
                Retour à l'accueil
              </Button>
            </>
          )}
          {fedapayStatus === 'timeout' && (
            <>
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                <Loader2 className="h-8 w-8 text-amber-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Paiement reçu, activation en cours</h2>
              <p className="text-slate-500 text-sm">
                Votre paiement a été confirmé par FedaPay. L'activation peut prendre encore quelques instants.
                Revenez sur cette page dans un moment, ou contactez-nous si le problème persiste.
              </p>
              <Button className="w-full" onClick={() => navigate('/')}>
                Retour à l'accueil
              </Button>
            </>
          )}
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Demande envoyée !</h2>
          <p className="text-slate-500 text-sm">
            Votre paiement est en cours de vérification. Votre abonnement sera activé dans les <strong>24 heures</strong> après confirmation.
          </p>
          <div className="bg-slate-50 rounded-lg px-4 py-3 text-left">
            <p className="text-xs text-slate-500">Référence soumise</p>
            <p className="font-mono font-medium text-slate-900">{reference}</p>
          </div>
          <p className="text-xs text-slate-400">
            Pour toute question, contactez-nous sur Wave au <strong>{WAVE_NUMBER}</strong>
          </p>
          <Button className="w-full" onClick={() => navigate('/')}>
            Retour à l'accueil
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-8">

      {/* Logo */}
      <div className="flex items-center gap-3 mb-6">
        <svg viewBox="0 0 44 44" width="36" height="36" xmlns="http://www.w3.org/2000/svg">
          <rect width="44" height="44" rx="8" fill="#0f172a"/>
          <rect x="7" y="22" width="30" height="18" rx="2" fill="#f97316"/>
          <polygon points="4,22 22,10 40,22" fill="#fb923c"/>
          <rect x="17" y="28" width="10" height="12" rx="1" fill="#0f172a"/>
          <rect x="9" y="24" width="6" height="5" rx="1" fill="#fed7aa"/>
          <rect x="29" y="24" width="6" height="5" rx="1" fill="#fed7aa"/>
          <circle cx="37" cy="13" r="4" fill="#22c55e"/>
        </svg>
        <p className="text-white font-bold text-lg">STOCK<span className="text-orange-500">AM</span></p>
      </div>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="bg-slate-900 px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-xs uppercase tracking-wide">Abonnement</p>
            {isAnnual && (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                2 mois offerts
              </span>
            )}
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-white font-bold text-lg">{plan.name} <span className="text-slate-400 text-sm font-normal">({isAnnual ? 'Annuel' : 'Mensuel'})</span></p>
            <p className="text-orange-500 font-bold text-xl">{formatCurrency(amount)}<span className="text-slate-400 text-sm font-normal">{isAnnual ? '/an' : '/mois'}</span></p>
          </div>
        </div>

        <div className="p-6 space-y-5">

          {/* Choisir méthode */}
          <div>
            <p className="text-sm font-semibold mb-3">Choisissez votre méthode de paiement</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setSelectedMethod('fedapay')}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  selectedMethod === 'fedapay'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <CreditCard className={`h-5 w-5 ${selectedMethod === 'fedapay' ? 'text-emerald-500' : 'text-slate-400'}`} />
                <span className={`text-xs font-bold text-center ${selectedMethod === 'fedapay' ? 'text-emerald-600' : 'text-slate-600'}`}>
                  Paiement en ligne
                </span>
              </button>
              <button
                onClick={() => setSelectedMethod('wave')}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  selectedMethod === 'wave'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Smartphone className={`h-5 w-5 ${selectedMethod === 'wave' ? 'text-blue-500' : 'text-slate-400'}`} />
                <span className={`text-xs font-bold ${selectedMethod === 'wave' ? 'text-blue-600' : 'text-slate-600'}`}>
                  Wave
                </span>
              </button>
              <button
                onClick={() => setSelectedMethod('orange')}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  selectedMethod === 'orange'
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Phone className={`h-5 w-5 ${selectedMethod === 'orange' ? 'text-orange-500' : 'text-slate-400'}`} />
                <span className={`text-xs font-bold ${selectedMethod === 'orange' ? 'text-orange-600' : 'text-slate-600'}`}>
                  Orange Money
                </span>
              </button>
            </div>
          </div>

          {/* Paiement en ligne FedaPay */}
          {selectedMethod === 'fedapay' && (
            <div className="bg-emerald-50 rounded-xl p-4 space-y-4 text-center">
              <p className="text-sm text-slate-600">
                Payez instantanément par Orange Money, Moov Money, Wave ou carte bancaire.
                Votre abonnement est activé automatiquement dès confirmation.
              </p>
              <Button
                className="w-full"
                onClick={handleFedaPayPayment}
                disabled={!fedapayReady}
              >
                {fedapayReady ? `Payer ${formatCurrency(amount)}` : 'Chargement...'}
              </Button>
            </div>
          )}

          {/* Instructions paiement manuel */}
          {(selectedMethod === 'wave' || selectedMethod === 'orange') && (
            <>
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-700">
                  📱 Instructions {selectedMethod === 'wave' ? 'Wave' : 'Orange Money'}
                </p>
                <ol className="space-y-2 text-sm text-slate-600">
                  <li className="flex gap-2">
                    <span className="font-bold text-orange-500 shrink-0">1.</span>
                    Ouvrez votre application {selectedMethod === 'wave' ? 'Wave' : 'Orange Money'}
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-orange-500 shrink-0">2.</span>
                    Envoyez <strong>{formatCurrency(amount)}</strong> au numéro :
                  </li>
                </ol>

                <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Numéro {selectedMethod === 'wave' ? 'Wave' : 'Orange Money'}</p>
                    <p className="font-bold text-lg text-slate-900">
                      {selectedMethod === 'wave' ? WAVE_NUMBER : ORANGE_NUMBER}
                    </p>
                    <p className="text-xs text-slate-500">{RECIPIENT_NAME}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(selectedMethod === 'wave' ? WAVE_NUMBER : ORANGE_NUMBER)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Copy className="h-4 w-4 text-slate-400" />
                  </button>
                </div>

                <ol className="space-y-2 text-sm text-slate-600" start={3}>
                  <li className="flex gap-2">
                    <span className="font-bold text-orange-500 shrink-0">3.</span>
                    Dans le message, écrivez : <strong>STOCKAM {plan.name} {isAnnual ? 'Annuel' : ''}</strong>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-orange-500 shrink-0">4.</span>
                    Notez la <strong>référence de transaction</strong> reçue par SMS
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-orange-500 shrink-0">5.</span>
                    Entrez cette référence ci-dessous
                  </li>
                </ol>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Référence de transaction *
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
                  placeholder="Ex: WV240628XXXXXXXX"
                />
                <p className="text-xs text-slate-400 mt-1">
                  La référence se trouve dans le SMS de confirmation reçu après le paiement
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate('/profile')}
                >
                  Annuler
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  isLoading={submitting}
                  disabled={!reference.trim()}
                >
                  Confirmer le paiement
                </Button>
              </div>

              <p className="text-xs text-center text-slate-400">
                Votre abonnement sera activé dans les 24h après vérification du paiement
              </p>
            </>
          )}

          {selectedMethod === 'fedapay' && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/profile')}
            >
              Annuler
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
