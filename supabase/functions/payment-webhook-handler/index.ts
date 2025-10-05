// Conteúdo CORRIGIDO e FINAL para supabase/functions/payment-webhook-handler/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Funções Helper (sem alterações)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
}
function createJsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: status,
  });
}
async function getFinancialSettings(supabase: any, producerId: string) {
  const [platformResult, producerResult] = await Promise.all([
    supabase.from('platform_settings').select('*').single(),
    supabase.from('producer_settings').select('*').eq('producer_id', producerId).maybeSingle()
  ]);
  const platform = platformResult.data;
  const producer = producerResult.data;
  return {
    security_reserve_percent: producer?.custom_security_reserve_percent ?? platform?.default_security_reserve_percent ?? 4.0,
    security_reserve_days: producer?.custom_security_reserve_days ?? platform?.default_security_reserve_days ?? 30,
    fixed_fee_cents: producer?.custom_fixed_fee_cents ?? platform?.default_fixed_fee_cents ?? 100,
    withdrawal_fee_cents: producer?.custom_withdrawal_fee_cents ?? platform?.default_withdrawal_fee_cents ?? 367,
    pix_fee_percent: platform?.default_pix_fee_percent ?? 3.0,
    boleto_fee_percent: platform?.default_boleto_fee_percent ?? 3.5,
    card_fee_percent: platform?.default_card_fee_percent ?? 5.0,
    pix_release_days: platform?.default_pix_release_days ?? 1,
    boleto_release_days: platform?.default_boleto_release_days ?? 1,
    card_release_days: platform?.default_card_release_days ?? 30,
  };
}
function calculatePlatformFee(settings: any, paymentMethod: string, installments: number, originalAmountCents: number) {
  let feePercent = 0;
  if (paymentMethod === 'pix') feePercent = settings.pix_fee_percent;
  else if (paymentMethod === 'bank_slip') feePercent = settings.boleto_fee_percent;
  else if (paymentMethod === 'credit_card') feePercent = settings.card_fee_percent || 5.0;
  const percentageFee = Math.round(originalAmountCents * (feePercent / 100));
  return percentageFee + settings.fixed_fee_cents;
}
function calculateReleaseDate(settings: any, paymentMethod: string, paidAtDate: Date) {
  let releaseDays = settings.card_release_days;
  if (paymentMethod === 'pix') releaseDays = settings.pix_release_days;
  else if (paymentMethod === 'bank_slip') releaseDays = settings.boleto_release_days;
  const releaseDate = new Date(paidAtDate.getTime() + (releaseDays * 24 * 60 * 60 * 1000));
  return releaseDate.toISOString().split('T')[0];
}

// Início do Servidor Deno
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const payload = await req.json();
    if (!payload.event || !payload.payment) {
      throw new Error("Formato de webhook do Asaas inválido ou não reconhecido.");
    }
    
    const { event, payment } = payload;
    const gatewayTransactionId = payment.id;
    let eventTypeToLog: string | null = null;
    let newStatus: string | null = null;

    // MAPEAMENTO COMPLETO DE EVENTOS DO GATEWAY PARA OS NOSSOS EVENTOS INTERNOS
    switch (event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        eventTypeToLog = 'compra.aprovada';
        newStatus = 'paid';
        break;
      case 'PAYMENT_REFUSED':
        eventTypeToLog = 'compra.recusada';
        newStatus = 'refused';
        break;
      case 'PAYMENT_REFUNDED':
        eventTypeToLog = 'reembolso';
        newStatus = 'refunded';
        break;
      case 'PAYMENT_CHARGEBACK_RECEIVED':
        eventTypeToLog = 'chargeback';
        newStatus = 'chargeback';
        break;
      case 'SUBSCRIPTION_CANCELLED':
        eventTypeToLog = 'assinatura.cancelada';
        break;
      case 'SUBSCRIPTION_LATE':
        eventTypeToLog = 'assinatura.atrasada';
        break;
      case 'SUBSCRIPTION_RENEWED':
        eventTypeToLog = 'assinatura.renovada';
        break;
    }

    if (!eventTypeToLog) {
      console.log(`[EVENT_IGNORED] Evento "${event}" não requer ação.`);
      return createJsonResponse({ success: true, message: 'Evento ignorado.' }, 200);
    }

    const { data: sale, error: saleError } = await supabaseAdmin.from('sales').select('*').eq('gateway_transaction_id', gatewayTransactionId).single();
    if (saleError) {
      console.warn(`[SALE_NOT_FOUND] Venda para transação ${gatewayTransactionId} não encontrada. Webhook ignorado.`);
      return createJsonResponse({ success: true, message: 'Venda não encontrada, webhook ignorado.' }, 200);
    }
    
    // Processamento principal para compra aprovada (lógica financeira e de matrícula)
    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      if (sale.status === 'paid') {
        console.log(`[IDEMPOTENCY_CHECK] Venda ${sale.id} já está 'paid'. Ignorando webhook.`);
        return createJsonResponse({ success: true, message: 'Webhook ignorado (venda já paga).' }, 200);
      }
      const { data: product, error: productError } = await supabaseAdmin.from('products').select('producer_id').eq('id', sale.product_id).single();
      if (productError) {
        throw new Error(`Failed to fetch product ${sale.product_id}: ${productError.message}`);
      }

      // --- LÓGICA FINANCEIRA (INTOCADA) ---
      const paidAtDate = new Date(`${payment.paymentDate}T12:00:00Z`);
      if (isNaN(paidAtDate.getTime())) throw new Error(`Invalid payment date: ${payment.paymentDate}`);
      const settings = await getFinancialSettings(supabaseAdmin, product.producer_id);
      const originalPriceCents = sale.original_product_price_cents || sale.amount_total_cents;
      const platformFeeCents = calculatePlatformFee(settings, sale.payment_method_used, sale.installments_chosen || 1, originalPriceCents);
      const securityReserveCents = Math.round(originalPriceCents * ((settings.security_reserve_percent || 0) / 100));
      const { data: productSettings } = await supabaseAdmin.from('products').select('producer_assumes_installments').eq('id', sale.product_id).single();
      const producerAssumesInstallments = productSettings?.producer_assumes_installments || false;
      let producerShareCents;
      if (producerAssumesInstallments && sale.installments_chosen > 1) {
        const { data: platformSettings } = await supabaseAdmin.from('platform_settings').select('card_installment_interest_rate').eq('id', 1).single();
        const interestRate = (platformSettings?.card_installment_interest_rate || 3.5) / 100;
        const originalCustomerAmount = sale.amount_total_cents / Math.pow(1 + interestRate, sale.installments_chosen);
        producerShareCents = Math.round(originalCustomerAmount - platformFeeCents);
      } else {
        producerShareCents = originalPriceCents - platformFeeCents;
      }
      const releaseDate = calculateReleaseDate(settings, sale.payment_method_used, paidAtDate);
      const updatePayload = {
        status: 'paid', paid_at: paidAtDate.toISOString(), payout_status: 'pending',
        release_date: releaseDate, platform_fee_cents: platformFeeCents,
        producer_share_cents: producerShareCents, security_reserve_cents: securityReserveCents,
        gateway_status: payment.status
      };
      // --- FIM DA LÓGICA FINANCEIRA ---

      const { error: updateError } = await supabaseAdmin.from('sales').update(updatePayload).eq('id', sale.id);
      if (updateError) throw new Error(`Falha ao atualizar a venda ${sale.id}: ${updateError.message}`);

      if (producerShareCents > 0) {
        const { error: balanceError } = await supabaseAdmin.rpc('upsert_producer_balance', { p_producer_id: product.producer_id, amount_to_add: producerShareCents });
        if (balanceError) console.error(`[BALANCE_ERROR] Failed to update producer balance: ${balanceError.message}`);
      }
      
      // --- LÓGICA DE MATRÍCULA (INTOCADA) ---
      let { data: userData } = await supabaseAdmin.from('profiles').select('id').eq('email', sale.buyer_email).single();
      if (!userData) {
        const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({ email: sale.buyer_email, email_confirm: true });
        if (authError) throw new Error(`Falha ao criar usuário: ${authError.message}`);
        userData = { id: newUser.user.id };
      }
      const studentUserId = userData.id;

      const { data: spaceProductData, error: spaceProductError } = await supabaseAdmin
        .from('space_products')
        .select('space_id')
        .eq('product_id', sale.product_id)
        .eq('product_type', 'principal')
        .single();
      
      let activeCohortId = null;
      if (spaceProductError) {
        console.warn(`[ENROLLMENT_WARNING] Não foi encontrado um 'space' principal para o produto ${sale.product_id}. O aluno será matriculado sem turma.`);
      } else if (spaceProductData) {
        const spaceId = spaceProductData.space_id;
        const { data: cohortData, error: cohortError } = await supabaseAdmin
          .from('cohorts')
          .select('id')
          .eq('space_id', spaceId)
          .eq('is_active', true)
          .single();
        
        if (cohortError || !cohortData) {
          console.warn(`[ENROLLMENT_WARNING] Nenhuma turma ativa encontrada para o space ${spaceId}. O aluno será matriculado sem turma.`);
        } else {
          activeCohortId = cohortData.id;
        }
      }

      const { error: enrollmentError } = await supabaseAdmin
        .from('enrollments')
        .insert({
          user_id: studentUserId,
          product_id: sale.product_id,
          cohort_id: activeCohortId,
        });
      
      if (enrollmentError) {
        console.error(`[ENROLLMENT_ERROR] Falha ao matricular aluno ${studentUserId} no produto ${sale.product_id}:`, enrollmentError.message);
      } else {
        console.log(`[ENROLLMENT_SUCCESS] Aluno ${studentUserId} matriculado com sucesso no produto ${sale.product_id} e na turma ${activeCohortId || 'N/A'}.`);
      }
      // --- FIM DA LÓGICA DE MATRÍCULA ---
    }
    
    // Atualiza o status da venda para outros tipos de evento
    if (newStatus && sale.status !== newStatus) {
      const { error: updateError } = await supabaseAdmin
        .from('sales')
        .update({ status: newStatus })
        .eq('id', sale.id);
      if (updateError) throw new Error(`Falha ao atualizar status da venda ${sale.id}: ${updateError.message}`);
    }

    // ======================= INÍCIO DA CORREÇÃO =======================
    // LÓGICA DE REGISTRO DE EVENTO UNIFICADA E ROBUSTA (APÓS TODAS AS OUTRAS OPERAÇÕES)

    console.log(`[EVENT_DEBUG] Preparando para registrar evento: ${eventTypeToLog} para venda ${sale.id}`);
    
    const eventData = {
      sale_id: sale.id,
      event_type: eventTypeToLog,
      metadata: { 
        gateway_event: event, 
        gateway_status: payment.status, 
        details: payment.rejectionReason || null,
        webhook_processed_at: new Date().toISOString()
      }
    };

    const { error: eventError } = await supabaseAdmin
      .from('transaction_events')
      .insert(eventData);

    // MUDANÇA CRÍTICA: Se a inserção do evento falhar, a função inteira falha.
    if (eventError) {
      console.error(`[EVENT_LOG_ERROR] CRÍTICO! Falha ao registrar evento '${eventTypeToLog}' para a venda ${sale.id}:`, eventError);
      // Lança o erro para que a execução pare e o gateway possa tentar novamente.
      throw new Error(`Falha ao registrar o evento de transação: ${eventError.message}`);
    }

    console.log(`[EVENT_LOG_SUCCESS] ✅ Evento '${eventTypeToLog}' registrado com sucesso para a venda ${sale.id}`);
    
    // REMOVIDO: A chamada manual e incorreta para 'process-webhook-deliveries'.
    // O trigger do banco de dados agora cuida disso de forma assíncrona e confiável.
    // ======================== FIM DA CORREÇÃO =========================
    
    return createJsonResponse({ success: true, message: 'Webhook processado com sucesso.' }, 200);

  } catch (error) {
    console.error('[CRITICAL_ERROR] Erro no webhook handler:', error.message);
    return createJsonResponse({ success: false, message: error.message }, 400);
  }
});
