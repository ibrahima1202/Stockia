import type { Handler } from '@netlify/functions'

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const { amount, planName, subscriptionId, userId } = JSON.parse(event.body || '{}')

    const params = {
      item_name: `STOCKAM — ${planName}`,
      item_price: amount,
      currency: 'XOF',
      ref_command: subscriptionId,
      command_name: `Abonnement STOCKAM ${planName}`,
      env: 'prod',
      ipn_url: `${process.env.URL}/api/paytech-webhook`,
      success_url: `${process.env.URL}/payment-success`,
      cancel_url: `${process.env.URL}/subscription`,
      custom_field: JSON.stringify({ userId, subscriptionId }),
    }

    const response = await fetch('https://paytech.sn/api/payment/request-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'API-KEY': process.env.PAYTECH_API_KEY!,
        'API-SECRET': process.env.PAYTECH_API_SECRET!,
      },
      body: JSON.stringify(params),
    })

    const data = await response.json()

    if (data.success === 1) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          redirect_url: data.redirect_url,
          token: data.token,
        }),
      }
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Erreur Paytech', details: data }),
      }
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erreur serveur' }),
    }
  }
}
