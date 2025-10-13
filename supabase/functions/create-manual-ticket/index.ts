import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      throw new Error('Token de autorização não fornecido');
    }

    const { data: { user }, error: authError } = await serviceClient.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Usuário não autorizado');
    }

    const { product_id, batch_id, name, email, cpf } = await req.json();

    if (!product_id || !batch_id || !name || !email) {
      throw new Error('Campos obrigatórios: product_id, batch_id, name, email');
    }

    // Verificar se o produto pertence ao produtor
    const { data: product } = await serviceClient
      .from('products')
      .select('id, producer_id, price_cents')
      .eq('id', product_id)
      .eq('producer_id', user.id)
      .single();

    if (!product) {
      throw new Error('Produto não encontrado ou não pertence ao produtor');
    }

    // Buscar informações do lote
    const { data: batch } = await serviceClient
      .from('ticket_batches')
      .select('*')
      .eq('id', batch_id)
      .single();

    if (!batch) {
      throw new Error('Lote não encontrado');
    }

    if (batch.sold_quantity >= batch.total_quantity) {
      throw new Error('Lote esgotado');
    }

    // Criar venda manual
    const attendeeId = crypto.randomUUID();
    const qrCodeData = `${product_id}|${attendeeId}`;

    const { data: sale, error: saleError } = await serviceClient
      .from('sales')
      .insert({
        product_id,
        batch_id,
        buyer_email: email,
        payment_method_used: 'manual',
        amount_total_cents: batch.price_cents,
        producer_share_cents: batch.price_cents,
        platform_fee_cents: 0,
        status: 'paid',
        paid_at: new Date().toISOString(),
        event_attendees: [{
          id: attendeeId,
          name,
          email,
          cpf: cpf || null,
          checked_in: false,
          qr_code: qrCodeData,
        }]
      })
      .select()
      .single();

    if (saleError) throw saleError;

    // Incrementar sold_quantity do lote
    const { error: updateError } = await serviceClient
      .from('ticket_batches')
      .update({ sold_quantity: batch.sold_quantity + 1 })
      .eq('id', batch_id);

    if (updateError) throw updateError;

    // Verificar se deve avançar para o próximo lote
    if (batch.auto_advance_to_next && (batch.sold_quantity + 1) >= batch.total_quantity) {
      await serviceClient
        .from('ticket_batches')
        .update({ is_active: false })
        .eq('id', batch_id);

      const { data: nextBatch } = await serviceClient
        .from('ticket_batches')
        .select('*')
        .eq('product_id', product_id)
        .gt('display_order', batch.display_order)
        .order('display_order', { ascending: true })
        .limit(1)
        .single();

      if (nextBatch) {
        await serviceClient
          .from('ticket_batches')
          .update({ is_active: true })
          .eq('id', nextBatch.id);
      }
    }

    return new Response(
      JSON.stringify({ 
        sale_id: sale.id,
        ticket_id: attendeeId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error creating manual ticket:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
