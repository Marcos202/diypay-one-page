// supabase/functions/send-test-webhook/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts';

const generateMockPayload = (eventType: string) => {
  const now = new Date();
  const baseData = {
    order_id: crypto.randomUUID(),
    order_status: 'paid',
    payment_method: 'credit_card',
    installments: 1,
    created_at: now.toISOString(),
    approved_date: now.toISOString(),
    webhook_event_type: eventType,
    Product: {
      product_id: crypto.randomUUID(),
      product_name: 'Produto de Exemplo (Teste)',
    },
    Customer: {
      full_name: 'João da Silva (Teste)',
      email: 'cliente+teste@exemplo.com',
      mobile: '+5511999998888',
    },
    Commissions: {
      charge_amount: 9990,
      product_base_price: 9990,
      diypay_fee: 990, 
      settlement_amount: 9000,
      currency: 'BRL',
      my_commission: 9000,
    },
    Subscription: null,
  };

  switch (eventType) {
    case 'compra.aprovada':
      break;
    case 'assinatura.cancelada':
      baseData.order_status = 'canceled';
      baseData.Subscription = {
        id: crypto.randomUUID(),
        status: 'canceled',
        plan: {
          name: 'Plano Mensal de Exemplo',
          frequency: 'monthly',
        },
        canceled_at: now.toISOString(),
      };
      break;
    default:
      baseData.Customer.full_name = `Evento de Teste: ${eventType}`;
  }

  return {
    event_id: `evt_${crypto.randomUUID()}`,
    event_type: eventType,
    created_at: now.toISOString(),
    data: baseData,
  };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const serviceClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const token = req.headers.get('Authorization')!.replace('Bearer ', '');
    const { data: { user }, error: authError } = await serviceClient.auth.getUser(token);
    if (authError || !user) throw new Error('Usuário não autenticado');

    const { url, secret, eventType } = await req.json();
    if (!url || !secret || !eventType) {
      throw new Error('URL, secret e eventType são obrigatórios.');
    }

    const payload = generateMockPayload(eventType);
    const payloadString = JSON.stringify(payload);

    const signature = createHmac('sha256', secret).update(payloadString).digest('hex');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-DiyPay-Signature': signature,
      },
      body: payloadString,
    });

    if (!response.ok) {
      const responseBody = await response.text();
      console.error('Webhook endpoint error response:', responseBody);
      throw new Error(`O endpoint respondeu com o status: ${response.status} ${response.statusText}`);
    }

    return new Response(JSON.stringify({ success: true, status: response.status }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
