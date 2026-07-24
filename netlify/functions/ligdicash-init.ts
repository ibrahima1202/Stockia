export default async (request: Request) => {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }
  try {
    const { amount, planName, subscriptionId, userId } = await request.json()

    const invoicePayload = {
      commande: {
        invoice: {
          items: [
            {
              name: `Abonnement STOCKAM — ${planName}`,
              description: `Abonnement mensuel plan ${planName}`,
              quantity: 1,
              unit_price: amount,
              total_price: amount,
            },
          ],
          total_amount: amount,
          devise: 'XOF',
          description: `Abonnement STOCKAM ${planName}`,
          customer: '',
          customer_firstname: '',
          customer_lastname: '',
          customer_email: '',
          external_id: subscriptionId,
          otp: '',
        },
        store: {
          name: 'STOCKAM',
          website_url: 'https://stockam.app',
        },
        actions: {
          cancel_url: `${process.env.URL}/subscription`,
          return_url: `${process.env.URL}/payment-success`,
          callback_url: `${process.env.URL}/api/ligdicash-webhook`,
        },
        custom_data: {
          subscriptionId,
          userId,
          transaction_id: subscriptionId,
        },
      },
    }

    console.log('Payload envoyé à LigdiCash:', JSON.stringify(invoicePayload))
    console.log('Apikey présente:', !!process.env.LIGDICASH_API_KEY)
    console.log('Auth token présent:', !!process.env.LIGDICASH_AUTH_TOKEN)

    const response = await fetch(
      'https://app.ligdicash.com/pay/v01/redirect/checkout-invoice/create',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Apikey: process.env.LIGDICASH_API_KEY ?? '',
          Authorization: `Bearer ${process.env.LIGDICASH_AUTH_TOKEN ?? ''}`,
        },
        body: JSON.stringify(invoicePayload),
      }
    )

    const data = await response.json()
    console.log('Réponse LigdiCash:', JSON.stringify(data))

    if (data.response_code === '00') {
      return new Response(
        JSON.stringify({ redirect_url: data.response_text, token: data.token }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    } else {
      return new Response(
        JSON.stringify({ error: 'Erreur LigdiCash', details: data }),
        { status: 400 }
      )
    }
  } catch (error) {
    console.log('Erreur:', error)
    return new Response(
      JSON.stringify({ error: 'Erreur serveur', details: String(error) }),
      { status: 500 }
    )
  }
}
