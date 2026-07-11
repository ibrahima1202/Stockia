import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const body = JSON.parse(event.body || '{}')

    // Vérifier que le paiement est confirmé
    if (body.type_event !== 'sale_complete') {
      return { statusCode: 200, body: 'OK' }
    }

    const customField = JSON.parse(body.custom_field || '{}')
    const { subscriptionId } = customField

    if (!subscriptionId) {
      return { statusCode: 400, body: 'Missing subscriptionId' }
    }

    // Activer l'abonnement dans Supabase
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
      })
      .eq('id', subscriptionId)

    if (error) throw error

    // Enregistrer le paiement
    await supabase.from('payments').insert({
      subscription_id: subscriptionId,
      amount: body.item_price,
      payment_method: 'mobile_money',
      reference: body.ref_command,
      status: 'completed',
      paid_at: new Date().toISOString(),
    })

    return { statusCode: 200, body: 'OK' }
  } catch (error) {
    console.error('Webhook error:', error)
    return { statusCode: 500, body: 'Server error' }
  }
}
