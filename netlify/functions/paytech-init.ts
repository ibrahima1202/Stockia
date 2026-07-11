export default async (request: Request) => {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const { amount, planName, subscriptionId, userId } = await request.json()

    const params = {
      item_name: `STOCKAM — ${planName}`,
      item_price: amount,
      currency: 'XOF',
      ref_command: subscriptionId,
      command_name: `Abonnement STOCKAM ${planName}`,
      env: 'prod',
      ipn_url: `${process.env.URL}/.netlify/functions/paytech-webhook`,
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
      return new Response(JSON.stringify({ redirect_url: data.redirect_url }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    } else {
      return new Response(JSON.stringify({ error: 'Erreur Paytech' }), { status: 400 })
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), { status: 500 })
  }
}
