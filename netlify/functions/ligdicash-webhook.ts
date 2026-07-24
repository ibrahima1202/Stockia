import { createClient } from '@supabase/supabase-js'

async function parseBody(request: Request): Promise<Record<string, any>> {
  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    return await request.json()
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await request.text()
    const params = new URLSearchParams(text)
    const obj: Record<string, any> = {}
    params.forEach((value, key) => {
      obj[key] = value
    })
    return obj
  }

  // fallback: tenter JSON quand même
  try {
    return await request.json()
  } catch {
    return {}
  }
}

export default async (request: Request) => {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const body = await parseBody(request)
    const token = body.token

    if (!token) {
      return new Response('Missing token', { status: 400 })
    }

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Règle d'or LigdiCash : toujours revérifier le statut réel de la
    // transaction auprès de leur API avant de livrer le service, plutôt
    // que de se fier uniquement au contenu du callback reçu.
    const confirmResponse = await fetch(
      `https://app.ligdicash.com/pay/v01/redirect/checkout-invoice/confirm/?invoiceToken=${token}`,
      {
        method: 'GET',
        headers: {
          Apikey: process.env.LIGDICASH_API_KEY ?? '',
          Authorization: `Bearer ${process.env.LIGDICASH_AUTH_TOKEN ?? ''}`,
        },
      }
    )
    const confirmData = await confirmResponse.json()

    if (confirmData.response_code !== '00' || confirmData.status !== 'completed') {
      console.log('Transaction non confirmée:', JSON.stringify(confirmData))
      return new Response('OK', { status: 200 })
    }

    // Extraction du subscriptionId depuis custom_data (tableau
    // keyof_customdata / valueof_customdata retourné par LigdiCash)
    const customDataArray: Array<{ keyof_customdata: string; valueof_customdata: string }> =
      confirmData.custom_data || []
    const subscriptionId = customDataArray.find(
      (c) => c.keyof_customdata === 'subscriptionId'
    )?.valueof_customdata

    if (!subscriptionId) {
      console.log('subscriptionId introuvable dans custom_data')
      return new Response('Missing subscriptionId', { status: 400 })
    }

    // Idempotence : éviter le double traitement (LigdiCash envoie 2 POST)
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('reference', confirmData.transaction_id)
      .maybeSingle()

    if (existingPayment) {
      return new Response('OK', { status: 200 })
    }

    await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', subscriptionId)

    await supabase.from('payments').insert({
      subscription_id: subscriptionId,
      amount: confirmData.amount,
      payment_method: 'mobile_money',
      reference: confirmData.transaction_id,
      status: 'completed',
      paid_at: new Date().toISOString(),
    })

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.log('Erreur webhook LigdiCash:', error)
    return new Response('Server error', { status: 500 })
  }
}

export const config = { path: '/api/ligdicash-webhook' }
