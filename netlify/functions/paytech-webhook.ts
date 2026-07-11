import { createClient } from '@supabase/supabase-js'

export default async (request: Request) => {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const body = await request.json()

    if (body.type_event !== 'sale_complete') {
      return new Response('OK', { status: 200 })
    }

    const customField = JSON.parse(body.custom_field || '{}')
    const { subscriptionId } = customField

    if (!subscriptionId) {
      return new Response('Missing subscriptionId', { status: 400 })
    }

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

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
      amount: body.item_price,
      payment_method: 'mobile_money',
      reference: body.ref_command,
      status: 'completed',
      paid_at: new Date().toISOString(),
    })

    return new Response('OK', { status: 200 })
  } catch (error) {
    return new Response('Server error', { status: 500 })
  }
}

export const config = { path: '/api/paytech-webhook' }
