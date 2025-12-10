// FASE 3: Suporte Completo para Webhooks Asaas + Iugu

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHash } from 'https://deno.land/std@0.177.0/node/crypto.ts'

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

// Mapeamento de eventos do Asaas para eventos internos
function mapAsaasEventToInternal(asaasEvent: string): string | null {
  const eventMap: Record<string, string> = {
    'PAYMENT_CREATED': 'pagamento.criado',
    'PAYMENT_RECEIVED': 'compra.aprovada',
    'PAYMENT_CONFIRMED': 'compra.aprovada',
    'PAYMENT_OVERDUE': 'pagamento.vencido',
    'PAYMENT_DELETED': 'pagamento.cancelado',
    'PAYMENT_REFUNDED': 'reembolso',
    'PAYMENT_RECEIVED_IN_CASH': 'compra.aprovada',
    'PAYMENT_CHARGEBACK_REQUESTED': 'chargeback',
    'PAYMENT_CHARGEBACK_DISPUTE': 'chargeback.disputa',
    'PAYMENT_AWAITING_CHARGEBACK_REVERSAL': 'chargeback.reversal',
    'PAYMENT_DUNNING_RECEIVED': 'recuperacao.recebida',
    'PAYMENT_DUNNING_REQUESTED': 'recuperacao.solicitada',
    'PAYMENT_REFUSED': 'compra.recusada'
  };
  
  return eventMap[asaasEvent] || null;
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

Deno.serve(async (req) => {
  // INSTRUMENTAÇÃO DIAGNÓSTICA: Gerar ID único de execução
  const executionId = crypto.randomUUID();
  console.log(`[DIAGNOSTIC][${executionId}] 🚀 INICIANDO EXECUÇÃO DO WEBHOOK HANDLER`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const payload = await req.json();
    
    // INSTRUMENTAÇÃO DIAGNÓSTICA: Logar payload recebido
    console.log(`[DIAGNOSTIC][${executionId}] 📥 PAYLOAD RECEBIDO DO GATEWAY`, JSON.stringify(payload, null, 2));
    
    console.log('[WEBHOOK_HANDLER] Received payload:', JSON.stringify(payload, null, 2));
    
    let event: string | null = null;
    let payment: any = null;
    let gatewayType: 'asaas' | 'iugu' | null = null;
    
    // Detectar tipo de gateway pelo formato do payload
    if (payload.event && typeof payload.event === 'string' && payload.event.startsWith('PAYMENT_')) {
      // Webhook do Asaas
      gatewayType = 'asaas';
      event = mapAsaasEventToInternal(payload.event);
      payment = payload.payment || payload;
      console.log(`[WEBHOOK_HANDLER] Detected Asaas webhook: ${payload.event} -> ${event}`);
    } else if (payload.event && payload.data) {
      // Webhook do Iugu
      gatewayType = 'iugu';
      event = payload.event;
      payment = payload.data;
      console.log(`[WEBHOOK_HANDLER] Detected Iugu webhook: ${payload.event}`);
    } else {
      console.error('[WEBHOOK_HANDLER] Invalid webhook format');
      throw new Error("Formato de webhook inválido ou não reconhecido.");
    }
    
    if (!event) {
      console.log(`[WEBHOOK_HANDLER] Event ${payload.event} não mapeado, ignorando.`);
      return createJsonResponse({ success: true, message: 'Evento ignorado (não mapeado).' }, 200);
    }
    
    const gatewayTransactionId = payment.id;
    if (!gatewayTransactionId) {
      throw new Error("ID da transação não encontrado no payload.");
    }
    
    console.log(`[WEBHOOK_HANDLER] Processing event: ${event} for transaction: ${gatewayTransactionId}`);
    
    // Buscar a venda pelo gateway_transaction_id
    const { data: sale, error: saleError } = await supabaseAdmin
      .from('sales')
      .select('*')
      .eq('gateway_transaction_id', gatewayTransactionId)
      .single();
    
    if (saleError) {
      console.warn(`[WEBHOOK_HANDLER] Venda não encontrada para transação ${gatewayTransactionId}.`);
      return createJsonResponse({ success: true, message: 'Venda não encontrada, webhook ignorado.' }, 200);
    }
    
    // INSTRUMENTAÇÃO DIAGNÓSTICA: Logar venda encontrada
    console.log(`[DIAGNOSTIC][${executionId}] 🔍 VENDA ENCONTRADA NO BANCO`, {
      sale_id: sale.id,
      status: sale.status,
      gateway_transaction_id: sale.gateway_transaction_id,
      product_id: sale.product_id,
      payment_method_used: sale.payment_method_used,
      buyer_email: sale.buyer_email
    });
    
    console.log(`[WEBHOOK_HANDLER] Found sale: ${sale.id} with status: ${sale.status}`);
    
    // Processar evento de pagamento aprovado
    if (event === 'compra.aprovada' && sale.status !== 'paid') {
      console.log(`[WEBHOOK_HANDLER] Processing payment approval for sale: ${sale.id}`);
      
      const { data: product, error: productError } = await supabaseAdmin
        .from('products')
        .select('producer_id')
        .eq('id', sale.product_id)
        .single();
      
      if (productError) {
        throw new Error(`Failed to fetch product ${sale.product_id}: ${productError.message}`);
      }
      
      // Lógica financeira
      const paidAtDate = new Date();
      const settings = await getFinancialSettings(supabaseAdmin, product.producer_id);
      const originalPriceCents = sale.original_product_price_cents || sale.amount_total_cents;
      const platformFeeCents = calculatePlatformFee(settings, sale.payment_method_used, sale.installments_chosen || 1, originalPriceCents);
      const securityReserveCents = Math.round(originalPriceCents * ((settings.security_reserve_percent || 0) / 100));
      
      const { data: productSettings } = await supabaseAdmin
        .from('products')
        .select('producer_assumes_installments')
        .eq('id', sale.product_id)
        .single();
      
      const producerAssumesInstallments = productSettings?.producer_assumes_installments || false;
      let producerShareCents;
      
      if (producerAssumesInstallments && sale.installments_chosen > 1) {
        const { data: platformSettings } = await supabaseAdmin
          .from('platform_settings')
          .select('card_installment_interest_rate')
          .eq('id', 1)
          .single();
        const interestRate = (platformSettings?.card_installment_interest_rate || 3.5) / 100;
        const originalCustomerAmount = sale.amount_total_cents / Math.pow(1 + interestRate, sale.installments_chosen);
        producerShareCents = Math.round(originalCustomerAmount - platformFeeCents);
      } else {
        producerShareCents = originalPriceCents - platformFeeCents;
      }
      
      const releaseDate = calculateReleaseDate(settings, sale.payment_method_used, paidAtDate);
      
      const updatePayload = {
        status: 'paid',
        paid_at: paidAtDate.toISOString(),
        payout_status: 'pending',
        release_date: releaseDate,
        platform_fee_cents: platformFeeCents,
        producer_share_cents: producerShareCents,
        security_reserve_cents: securityReserveCents,
        gateway_status: payment.status
      };
      
      // INSTRUMENTAÇÃO DIAGNÓSTICA: Logar antes de atualizar para paid
      console.log(`[DIAGNOSTIC][${executionId}] 💰 ANTES DE ATUALIZAR A VENDA PARA 'paid'`, updatePayload);
      
      console.log(`[WEBHOOK_HANDLER] Updating sale with:`, updatePayload);
      
      const { error: updateError } = await supabaseAdmin
        .from('sales')
        .update(updatePayload)
        .eq('id', sale.id);
      
      if (updateError) {
        throw new Error(`Falha ao atualizar a venda ${sale.id}: ${updateError.message}`);
      }
      
      // INSTRUMENTAÇÃO DIAGNÓSTICA: Confirmar atualização para paid
      console.log(`[DIAGNOSTIC][${executionId}] ✅ DEPOIS DE ATUALIZAR A VENDA PARA 'paid'`, {
        sale_id: sale.id,
        new_status: 'paid',
        platform_fee_cents: platformFeeCents,
        producer_share_cents: producerShareCents,
        release_date: releaseDate
      });
      
      // Atualizar saldo do produtor
      if (producerShareCents > 0) {
        const { error: balanceError } = await supabaseAdmin
          .rpc('upsert_producer_balance', {
            p_producer_id: product.producer_id,
            amount_to_add: producerShareCents
          });
        
        if (balanceError) {
          console.error(`[WEBHOOK_HANDLER] Failed to update producer balance: ${balanceError.message}`);
        }
      }
      
      // Criar matrícula
      let { data: userData } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', sale.buyer_email)
        .single();
      
      if (!userData) {
        const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: sale.buyer_email,
          email_confirm: true
        });
        if (authError) {
          throw new Error(`Falha ao criar usuário: ${authError.message}`);
        }
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
      if (!spaceProductError && spaceProductData) {
        const { data: cohortData, error: cohortError } = await supabaseAdmin
          .from('cohorts')
          .select('id')
          .eq('space_id', spaceProductData.space_id)
          .eq('is_active', true)
          .single();
        
        if (!cohortError && cohortData) {
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
        console.error(`[WEBHOOK_HANDLER] Failed to enroll student: ${enrollmentError.message}`);
      } else {
        console.log(`[WEBHOOK_HANDLER] Student ${studentUserId} enrolled successfully`);
      }

      // ============================================================
      // 🎫 GERENCIAMENTO DE LOTES DE INGRESSOS
      // ============================================================
      if (sale.batch_id) {
        console.log(`[BATCH] Processing batch update for batch_id: ${sale.batch_id}`);
        
        try {
          // 1. Buscar informações do lote atual
          const { data: currentBatch, error: batchFetchError } = await supabaseAdmin
            .from('ticket_batches')
            .select('*')
            .eq('id', sale.batch_id)
            .single();

          if (batchFetchError) {
            console.error('[BATCH] Error fetching batch:', batchFetchError);
          } else if (currentBatch) {
            const newSoldQuantity = currentBatch.sold_quantity + 1;
            console.log(`[BATCH] Current sold: ${currentBatch.sold_quantity}, New sold: ${newSoldQuantity}, Total: ${currentBatch.total_quantity}`);

            // 2. Incrementar sold_quantity do lote
            const { error: updateError } = await supabaseAdmin
              .from('ticket_batches')
              .update({ 
                sold_quantity: newSoldQuantity,
                updated_at: new Date().toISOString()
              })
              .eq('id', currentBatch.id);

            if (updateError) {
              console.error('[BATCH] Error updating sold_quantity:', updateError);
            } else {
              console.log(`[BATCH] Successfully incremented sold_quantity to ${newSoldQuantity}`);
            }

            // 3. Verificar se lote esgotou E tem auto_advance ativado
            const isBatchExhausted = newSoldQuantity >= currentBatch.total_quantity;
            const hasAutoAdvance = currentBatch.auto_advance_to_next;

            console.log(`[BATCH] Exhausted: ${isBatchExhausted}, Auto-advance: ${hasAutoAdvance}`);

            if (isBatchExhausted && hasAutoAdvance) {
              console.log('[BATCH] Batch exhausted with auto-advance enabled. Activating next batch...');

              // 3a. Desativar lote atual
              const { error: deactivateError } = await supabaseAdmin
                .from('ticket_batches')
                .update({ is_active: false })
                .eq('id', currentBatch.id);

              if (deactivateError) {
                console.error('[BATCH] Error deactivating current batch:', deactivateError);
              } else {
                console.log('[BATCH] Current batch deactivated successfully');
              }

              // 3b. Buscar próximo lote inativo (próximo na ordem)
              const { data: nextBatch, error: nextBatchError } = await supabaseAdmin
                .from('ticket_batches')
                .select('*')
                .eq('product_id', currentBatch.product_id)
                .eq('is_active', false) // Buscar lotes inativos
                .gt('display_order', currentBatch.display_order) // Próximo na ordem
                .order('display_order', { ascending: true })
                .limit(1)
                .maybeSingle();

              if (nextBatchError) {
                console.error('[BATCH] Error fetching next batch:', nextBatchError);
              } else if (nextBatch) {
                console.log(`[BATCH] Found next batch: ${nextBatch.name} (id: ${nextBatch.id})`);

                // 3c. Ativar próximo lote
                const { error: activateError } = await supabaseAdmin
                  .from('ticket_batches')
                  .update({ is_active: true })
                  .eq('id', nextBatch.id);

                if (activateError) {
                  console.error('[BATCH] Error activating next batch:', activateError);
                } else {
                  console.log(`[BATCH] Next batch "${nextBatch.name}" activated successfully`);
                }
              } else {
                console.log('[BATCH] No next batch available. This was the last batch.');
              }
            }
          }
        } catch (batchError) {
          console.error('[BATCH] Unexpected error in batch management:', batchError);
          // Não interromper o fluxo principal mesmo se houver erro nos lotes
        }
      }

      // ===== INÍCIO: RASTREAMENTO SERVER-SIDE (CAPI) =====
      try {
        console.log(`[TRACKING] Iniciando rastreamento server-side para venda ${sale.id}`);
        
        // Buscar configuração de tracking do produtor
        const { data: trackingConfig, error: trackingError } = await supabaseAdmin
          .from('producer_tracking')
          .select('*')
          .eq('product_id', sale.product_id)
          .eq('is_active', true)
          .single();
        
        if (trackingError) {
          console.log(`[TRACKING] Nenhuma configuração ativa encontrada para produto ${sale.product_id}`);
        } else if (trackingConfig) {
          console.log(`[TRACKING] Configuração encontrada: Meta=${!!trackingConfig.meta_access_token}, TikTok=${!!trackingConfig.tiktok_access_token}`);
          
          // 1. META CAPI (Conversions API)
          if (trackingConfig.meta_pixel_id && trackingConfig.meta_access_token) {
            try {
              const emailHash = createHash('sha256').update(sale.buyer_email.toLowerCase().trim()).digest('hex');
              
              const metaPayload = {
                data: [{
                  event_name: 'Purchase',
                  event_time: Math.floor(Date.now() / 1000),
                  event_id: sale.id, // Para deduplicação com client-side
                  event_source_url: `https://diypay.com.br/payment-confirmation/${sale.id}`,
                  user_data: {
                    em: [emailHash]
                  },
                  custom_data: {
                    currency: 'BRL',
                    value: sale.amount_total_cents / 100,
                    content_ids: [sale.product_id],
                    content_type: 'product',
                    num_items: 1
                  },
                  action_source: 'website'
                }]
              };
              
              const metaResponse = await fetch(
                `https://graph.facebook.com/v21.0/${trackingConfig.meta_pixel_id}/events?access_token=${trackingConfig.meta_access_token}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(metaPayload)
                }
              );
              
              const metaResult = await metaResponse.json();
              console.log(`[TRACKING] Meta CAPI Response:`, JSON.stringify(metaResult));
            } catch (metaError: any) {
              console.error(`[TRACKING] Erro ao enviar para Meta CAPI:`, metaError.message);
            }
          }
          
          // 2. TIKTOK EVENTS API
          if (trackingConfig.tiktok_pixel_id && trackingConfig.tiktok_access_token) {
            try {
              const emailHash = createHash('sha256').update(sale.buyer_email.toLowerCase().trim()).digest('hex');
              
              const tiktokPayload = {
                pixel_code: trackingConfig.tiktok_pixel_id,
                event: 'CompletePayment',
                event_id: sale.id,
                timestamp: new Date().toISOString(),
                context: {
                  user: {
                    email: emailHash
                  },
                  page: {
                    url: `https://diypay.com.br/payment-confirmation/${sale.id}`
                  }
                },
                properties: {
                  content_id: sale.product_id,
                  value: sale.amount_total_cents / 100,
                  currency: 'BRL'
                }
              };
              
              const tiktokResponse = await fetch(
                'https://business-api.tiktok.com/open_api/v1.3/event/track/',
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Access-Token': trackingConfig.tiktok_access_token
                  },
                  body: JSON.stringify(tiktokPayload)
                }
              );
              
              const tiktokResult = await tiktokResponse.json();
              console.log(`[TRACKING] TikTok Events API Response:`, JSON.stringify(tiktokResult));
            } catch (tiktokError: any) {
              console.error(`[TRACKING] Erro ao enviar para TikTok Events API:`, tiktokError.message);
            }
          }
        }
      } catch (trackingError: any) {
        console.error(`[TRACKING] Erro geral no rastreamento server-side:`, trackingError.message);
        // NÃO FALHAR O WEBHOOK se tracking falhar
      }
      // ===== FIM: RASTREAMENTO SERVER-SIDE =====
    }
    
    // Atualizar status da venda para outros eventos
    let newStatus: string | null = null;
    if (event === 'compra.recusada') newStatus = 'refused';
    else if (event === 'reembolso') newStatus = 'refunded';
    else if (event === 'chargeback') newStatus = 'chargeback';
    
    if (newStatus && sale.status !== newStatus) {
      const { error: updateError } = await supabaseAdmin
        .from('sales')
        .update({ status: newStatus })
        .eq('id', sale.id);
      
      if (updateError) {
        throw new Error(`Falha ao atualizar status da venda ${sale.id}: ${updateError.message}`);
      }
    }
    
    // Registrar evento de transação
    console.log(`[WEBHOOK_HANDLER] Registering transaction event: ${event} for sale ${sale.id}`);
    
    const eventData = {
      sale_id: sale.id,
      event_type: event,
      metadata: {
        gateway_event: payload.event,
        gateway_type: gatewayType,
        gateway_status: payment.status,
        details: payment.rejectionReason || payment.description || null,
        webhook_processed_at: new Date().toISOString()
      }
    };
    
    // INSTRUMENTAÇÃO DIAGNÓSTICA: Logar antes de inserir evento compra.aprovada
    console.log(`[DIAGNOSTIC][${executionId}] 📝 ANTES DE INSERIR O EVENTO 'compra.aprovada'`, eventData);
    
    const { error: eventError } = await supabaseAdmin
      .from('transaction_events')
      .insert(eventData);
    
    if (eventError) {
      console.error(`[WEBHOOK_HANDLER] CRÍTICO! Falha ao registrar evento: ${eventError.message}`);
      throw new Error(`Falha ao registrar o evento de transação: ${eventError.message}`);
    }
    
    // INSTRUMENTAÇÃO DIAGNÓSTICA: Confirmar inserção do evento
    console.log(`[DIAGNOSTIC][${executionId}] ✅ DEPOIS DE INSERIR O EVENTO 'compra.aprovada'`, {
      event_type: event,
      sale_id: sale.id,
      success: true
    });
    
    console.log(`[WEBHOOK_HANDLER] ✅ Event ${event} registered successfully for sale ${sale.id}`);

    // ===== INÍCIO: CRIAÇÃO DE NOTIFICAÇÃO IN-APP =====
    try {
      // 1. Buscar informações do produto (producer_id e nome)
      const { data: productInfo } = await supabaseAdmin
        .from('products')
        .select('producer_id, name')
        .eq('id', sale.product_id)
        .single();

      if (productInfo) {
        // 2. Buscar preferências de notificação do produtor
        const { data: profileData } = await supabaseAdmin
          .from('profiles')
          .select('notification_preferences')
          .eq('id', productInfo.producer_id)
          .single();

        const prefs = (profileData?.notification_preferences as Record<string, boolean>) || {};
        
        // 3. Mapear evento interno -> chave de preferência
        const eventToPreference: Record<string, string> = {
          'compra.aprovada': 'purchase_approved',
          'pix.gerado': 'pix_generated',
          'boleto.gerado': 'boleto_generated',
          'compra.recusada': 'purchase_declined',
          'reembolso': 'refund',
          'chargeback': 'chargeback',
        };
        
        const prefKey = eventToPreference[event];
        
        // 4. Verificar se preferência permite (default: true para purchase_approved)
        const isAllowed = prefKey ? (prefs[prefKey] !== false) : true;
        
        if (isAllowed) {
          // 5. Títulos SEM emoji (frontend cuida da exibição visual)
          const titles: Record<string, string> = {
            'compra.aprovada': 'Venda Aprovada!',
            'pix.gerado': 'Pix Gerado!',
            'boleto.gerado': 'Boleto Gerado!',
            'compra.recusada': 'Compra Recusada',
            'reembolso': 'Reembolso Solicitado',
            'chargeback': 'Chargeback Recebido',
          };
          
          // 6. Formatar valor em R$
          const valueBRL = (sale.amount_total_cents / 100).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          });

          // 7. Inserir na tabela notifications
          const { error: notifError } = await supabaseAdmin.from('notifications').insert({
            user_id: productInfo.producer_id,
            type: prefKey || 'system',
            title: titles[event] || 'Nova Notificação',
            message: `Valor: ${valueBRL} • Produto: ${productInfo.name}`,
            is_read: false,
            metadata: {
              sale_id: sale.id,
              product_id: sale.product_id,
              amount_cents: sale.amount_total_cents,
              buyer_email: sale.buyer_email
            }
          });
          
          if (notifError) {
            console.error(`[NOTIFICATION] Erro ao criar notificação: ${notifError.message}`);
          } else {
            console.log(`[NOTIFICATION] ✅ Notificação criada para produtor ${productInfo.producer_id}`);
          }
        } else {
          console.log(`[NOTIFICATION] ⏭️ Preferência '${prefKey}' desativada pelo usuário`);
        }
      }
    } catch (notifError: any) {
      console.error('[NOTIFICATION] Erro ao criar notificação:', notifError.message);
      // Não bloquear o webhook
    }
    // ===== FIM: CRIAÇÃO DE NOTIFICAÇÃO IN-APP =====
    
    return createJsonResponse({ success: true, message: 'Webhook processado com sucesso.' }, 200);
    
  } catch (error: any) {
    // INSTRUMENTAÇÃO DIAGNÓSTICA: Logar erro crítico
    console.error(`[DIAGNOSTIC][${executionId}] ❌ ERRO CRÍTICO NO WEBHOOK HANDLER`, {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    console.error('[WEBHOOK_HANDLER] CRITICAL ERROR:', error.message);
    return createJsonResponse({ success: false, message: error.message }, 400);
  }
});
