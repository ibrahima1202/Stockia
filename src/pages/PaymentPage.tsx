import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Copy, Smartphone } from 'lucide-react'
import { Card } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { useSubscription } from '@/hooks/useSubscription'
import { formatCurrency } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

export default function PaymentPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const planId = searchParams.get('plan')
  const { plans, subscription } = useSubscription()

  const plan = plans.find((p) => p.id === planId)

  const [reference, setReference] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'wave' | 'orange_money'>('wave')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [copied, setCopied] = useState(false)

  const PHONE_NUMBER = '79740816'
  const OWNER_NAME = 'Ibrahima Sidibé'

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(PHONE_NUMBER)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSubmit = async () => {
    if (!reference.trim() || !plan || !subscription) return
    setSubmitting(true)
    try {
      await supabase.from('payments').insert({
        subscription_id: subscription.id,
        amount: plan.price,
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
          <Button className="w-full" onClick={() => navigate('/')}>
            Retour à l'accueil
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-4">

        <button
          onClick={() => navigate('/subscription')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Retour aux plans
        </button>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-slate-900 px-6 py-5">
            <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Paiement pour</p>
            <p className="text-white font-bold text-xl">{plan.name}</p>
            <p className="text-orange-400 text-2xl font-bold mt-1">{formatCurrency(plan.price)}<span className="text-sm text-slate-400 font-normal">/mois</span></p>
          </div>

          <div className="p-6 space-y-5">

            {/* Choix méthode */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">Choisissez votre méthode de paiement</p>
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
                <p className="text-sm font-semibold text-slate-700">Instructions de paiement</p>
              </div>
              <ol className="space-y-2 text-sm text-slate-600">
                <li className="flex gap-2">
                  <span className="font-bold text-orange-500 shrink-0">1.</span>
                  Ouvrez votre application <strong>{paymentMethod === 'wave' ? 'Wave' : 'Orange Money'}</strong>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-orange-500 shrink-0">2.</span>
                  Envoyez <strong>{formatCurrency(plan.price)}</strong> au numéro ci-dessous
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-orange-500 shrink-0">3.</span>
                  Copiez la <strong>référence de transaction</strong> reçue par SMS
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-orange-500 shrink-0">4.</span>
                  Collez-la dans le champ ci-dessous et soumettez
                </li>
              </ol>
            </Card>

            {/* Numéro à payer */}
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

            {/* Référence transaction */}
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
                La référence se trouve dans le SMS de confirmation de votre paiement
              </p>
            </div>

            <Button
              className="w-full"
              onClick={handleSubmit}
              isLoading={submitting}
              disabled={!reference.trim()}
            >
              Confirmer le paiement
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Votre abonnement sera activé dans les 24h après vérification du paiement.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
