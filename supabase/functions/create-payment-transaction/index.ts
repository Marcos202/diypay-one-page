import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Função para gerar ID único de ticket no formato KZQ-ZVFRT-613
const generateTicketId = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part3 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part1}-${part2}-${part3}`;
}

Deno.serve(async (req) => {
  // INSTRUMENTAÇÃO DIAGNÓSTICA: Gerar ID único de execução
  const executionId = crypto.randomUUID();
  console.log(`[DIAGNOSTIC][${executionId}] 🚀 INICIANDO EXECUÇÃO`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const {
      product_id,
      buyer_email,
      iugu_customer_id,
      buyer_profile_id,
      payment_method_selected,
      card_token,
      credit_card_token,
      credit_card_data,
      installments,
      buyer_name,
      buyer_cpf_cnpj,
      buyer_phone,
      donation_amount_cents,
      quantity,
      attendees,
      amount_total_cents,
      original_product_price_cents,
      producer_assumes_installments,
      order_bump_items,
    } = await req.json();

    // INSTRUMENTAÇÃO DIAGNÓSTICA: Logar dados recebidos
    console.log(`[DIAGNOSTIC][${executionId}] 📥 DADOS RECEBIDOS DO CHECKOUT`, {
      product_id,
      buyer_email,
      payment_method_selected,
      installments,
      amount_total_cents,
      donation_amount_cents,
      quantity,
      has_credit_card_data: !!credit_card_data,
      has_credit_card_token: !!credit_card_token,
      has_card_token: !!card_token
    });

    // --- Validação dos Dados de Entrada ---
    if (!product_id) {
      throw new Error('Product ID é obrigatório.');
    }

    // --- Buscar o Gateway Ativo ---
    console.log('[GATEWAY_CHECK] Buscando gateway de pagamento ativo...');
    const { data: activeGateway, error: gatewayError } = await supabase
      .from('payment_gateways')
      .select('gateway_identifier, credentials, gateway_name')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(1)
      .single();

    if (gatewayError || !activeGateway) {
      console.error('[GATEWAY_ERROR] Nenhum gateway ativo encontrado:', gatewayError);
      throw new Error('Nenhum gateway de pagamento ativo configurado na plataforma.');
    }

    console.log(`[GATEWAY_SELECTED] Gateway ativo: ${activeGateway.gateway_name} (${activeGateway.gateway_identifier})`);

    // --- Buscar Detalhes do Produto ---
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('name, price_cents, producer_id, max_installments_allowed')
      .eq('id', product_id)
      .single();

    if (productError) throw productError;

    // --- Determinar o Valor Total da Transação ---
    let finalAmountCents = amount_total_cents;
    if (!finalAmountCents) {
      // Fallback to calculate from product price if not provided
      if (donation_amount_cents && donation_amount_cents > 0) {
        finalAmountCents = donation_amount_cents;
      } else {
        finalAmountCents = product.price_cents * (quantity || 1);
      }
    }

    let gatewayResponse: any = null;

    // --- Roteamento baseado no Gateway Ativo ---
    if (activeGateway.gateway_identifier === 'iugu') {
      console.log('[IUGU_GATEWAY] Processando transação via Iugu...');
      
      // Validar credenciais do Iugu
      const { api_key, account_id } = activeGateway.credentials || {};
      if (!api_key) {
        throw new Error('Credenciais para o gateway Iugu não estão configuradas. Verifique a API Key.');
      }

      console.log('[IUGU_GATEWAY] Credenciais validadas, criando fatura...');

      // LÓGICA UNIFICADA: Criar uma Fatura para TODOS os métodos de pagamento
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3); // Vencimento em 3 dias

      const invoicePayload: any = {
        email: buyer_email,
        due_date: dueDate.toISOString().split('T')[0],
        customer_id: iugu_customer_id,
        notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-webhook-handler`,
        items: [{
          description: product.name,
          quantity: quantity || 1,
          price_cents: Math.round(finalAmountCents / (quantity || 1))
        }],
        payer: {
          cpf_cnpj: buyer_cpf_cnpj,
          name: buyer_name,
        },
      };

      // Adiciona o método de pagamento e parcelas se for cartão de crédito
      if (payment_method_selected === 'credit_card') {
        if (!card_token) {
          throw new Error('Token do cartão de crédito é obrigatório para este método de pagamento.');
        }
        invoicePayload.customer_payment_method_id = null; // Garante que não usará um método salvo
        invoicePayload.token = card_token; // Paga a fatura com o token do cartão
        invoicePayload.months = installments > 1 ? installments : null; // Define as parcelas
      } else {
        // Para PIX e Boleto, define o método aceito na fatura
        invoicePayload.payable_with = payment_method_selected === 'bank_slip' ? 'bank_slip' : 'pix';
      }

      // --- Chamar a API da Iugu para Criar a Fatura ---
      const authHeader = `Basic ${btoa(api_key + ':')}`;
      const invoiceResponse = await fetch('https://api.iugu.com/v1/invoices', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoicePayload),
      });

      if (!invoiceResponse.ok) {
        const errorData = await invoiceResponse.text();
        console.error('[IUGU_INVOICE_ERROR]', errorData);
        throw new Error('Falha ao criar fatura na Iugu.');
      }

      const invoiceResult = await invoiceResponse.json();
      console.log(`[IUGU_INVOICE_SUCCESS] Fatura criada com sucesso. ID: ${invoiceResult.id}`);

      // Padronizar resposta da Iugu
      gatewayResponse = {
        id: invoiceResult.id,
        status: invoiceResult.status,
        secure_url: invoiceResult.secure_url,
        pix_qr_code_text: invoiceResult.pix?.qrcode_text || invoiceResult.pix?.emv || null,
        pix_qr_code_base64: invoiceResult.pix?.qrcode_base64 || invoiceResult.pix?.qrcode || null,
        bank_slip_barcode: invoiceResult.bank_slip?.barcode || invoiceResult.bank_slip?.digitable_line || invoiceResult.digitable_line || null,
        gateway_name: 'Iugu'
      };

    } else if (activeGateway.gateway_identifier === 'asaas') {
      console.log('[ASAAS_GATEWAY] Processando transação via Asaas...');
      
      // Validar credenciais do Asaas
      const { api_key } = activeGateway.credentials || {};
      if (!api_key) {
        throw new Error('Credenciais para o gateway Asaas não estão configuradas. Verifique a API Key.');
      }

      console.log('[ASAAS_GATEWAY] Credenciais validadas, criando cobrança...');

      // Mapear método de pagamento para o formato do Asaas
      let billingType = 'CREDIT_CARD';
      if (payment_method_selected === 'pix') {
        billingType = 'PIX';
      } else if (payment_method_selected === 'bank_slip') {
        billingType = 'BOLETO';
      }

      // Preparar dados do cliente
      const customerData = {
        name: buyer_name,
        email: buyer_email,
        cpfCnpj: buyer_cpf_cnpj,
      };

      // Criar ou buscar cliente no Asaas
      let asaasCustomerId = null;
      
      // Tentar criar cliente
      const customerResponse = await fetch('https://sandbox.asaas.com/api/v3/customers', {
        method: 'POST',
        headers: {
          'access_token': api_key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerData),
      });

      if (customerResponse.ok) {
        const customerResult = await customerResponse.json();
        asaasCustomerId = customerResult.id;
        console.log(`[ASAAS_CUSTOMER_SUCCESS] Cliente criado: ${asaasCustomerId}`);
      } else {
        // Se falhar ao criar, pode ser que já exista - tentar buscar
        const searchResponse = await fetch(`https://sandbox.asaas.com/api/v3/customers?email=${buyer_email}`, {
          headers: {
            'access_token': api_key,
          },
        });
        
        if (searchResponse.ok) {
          const searchResult = await searchResponse.json();
          if (searchResult.data && searchResult.data.length > 0) {
            asaasCustomerId = searchResult.data[0].id;
            console.log(`[ASAAS_CUSTOMER_FOUND] Cliente encontrado: ${asaasCustomerId}`);
          }
        }
      }

      if (!asaasCustomerId) {
        throw new Error('Não foi possível criar ou encontrar cliente no Asaas.');
      }

      // Calcular data de vencimento
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3);

      // Preparar payload da cobrança
      const paymentPayload: any = {
        customer: asaasCustomerId,
        billingType: billingType,
        value: finalAmountCents / 100, // Asaas espera valor em reais
        dueDate: dueDate.toISOString().split('T')[0],
        description: product.name,
        externalReference: product_id,
      };

      // Adicionar dados do cartão se for cartão de crédito
      if (payment_method_selected === 'credit_card') {
        if (credit_card_data) {
          // Usar dados brutos do cartão para Asaas
          if (!credit_card_data.number || !credit_card_data.holderName || !credit_card_data.ccv) {
            throw new Error('Dados completos do cartão de crédito são obrigatórios.');
          }

          // Monta os objetos que a API do Asaas espera
          paymentPayload.creditCard = {
            holderName: credit_card_data.holderName,
            number: credit_card_data.number,
            expiryMonth: credit_card_data.expiryMonth,
            expiryYear: credit_card_data.expiryYear,
            ccv: credit_card_data.ccv
          };

          paymentPayload.creditCardHolderInfo = {
            name: buyer_name,
            email: buyer_email,
            cpfCnpj: buyer_cpf_cnpj,
            postalCode: "01001-000", // CEP genérico. Idealmente, coletar do usuário.
            addressNumber: "123", // Número genérico. Idealmente, coletar do usuário.
            phone: buyer_phone || "11999999999", // Telefone genérico se não fornecido
          };
        } else if (credit_card_token) {
          // Fallback para token (compatibilidade com Iugu)
          paymentPayload.creditCard = {
            creditCardToken: credit_card_token,
          };
        } else {
          throw new Error('Dados do cartão de crédito ou token são obrigatórios.');
        }
        
        if (installments > 1) {
          paymentPayload.installmentCount = installments;
        }
      }

      console.log('[ASAAS_PAYLOAD]', JSON.stringify(paymentPayload, null, 2));

      // Criar cobrança no Asaas
      const paymentResponse = await fetch('https://sandbox.asaas.com/api/v3/payments', {
        method: 'POST',
        headers: {
          'access_token': api_key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentPayload),
      });

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.text();
        console.error('[ASAAS_PAYMENT_ERROR]', errorData);
        throw new Error('Falha ao criar cobrança no Asaas.');
      }

      const paymentResult = await paymentResponse.json();
      console.log(`[ASAAS_PAYMENT_SUCCESS] Cobrança criada com sucesso. ID: ${paymentResult.id}`);

      let pixData = { qrCodeBase64: null, qrCodeText: null };

      // ETAPA ADICIONAL E CRUCIAL PARA PIX - Segunda chamada de API
      if (billingType === 'PIX') {
        console.log(`[ASAAS_PIX] Cobrança PIX criada. Buscando dados do QR Code para ${paymentResult.id}...`);
        const pixQrCodeResponse = await fetch(`https://sandbox.asaas.com/api/v3/payments/${paymentResult.id}/pixQrCode`, {
          headers: { 'access_token': api_key }
        });

        if (pixQrCodeResponse.ok) {
          const pixQrCodeData = await pixQrCodeResponse.json();
          pixData.qrCodeBase64 = pixQrCodeData.encodedImage;
          pixData.qrCodeText = pixQrCodeData.payload;
          console.log('[ASAAS_PIX] Dados do QR Code obtidos com sucesso.');
          console.log('[ASAAS_PIX_DEBUG] QR Code Data:', JSON.stringify(pixQrCodeData, null, 2));
        } else {
          console.error('[ASAAS_PIX_ERROR] Falha ao buscar dados do QR Code.');
        }
      }

      // Padronizar resposta do Asaas
      gatewayResponse = {
        id: paymentResult.id,
        status: paymentResult.status,
        secure_url: paymentResult.invoiceUrl,
        // Usar dados da segunda chamada para PIX ou fallback para dados da primeira chamada
        pix_qr_code_text: pixData.qrCodeText || paymentResult.pixQrCode?.payload || null,
        pix_qr_code_base64: pixData.qrCodeBase64 || paymentResult.pixQrCode?.encodedImage || null,
        // Mapeamento dos campos de Boleto do Asaas
        bank_slip_barcode: paymentResult.identificationField || paymentResult.nossoNumero || null,
        gateway_name: 'Asaas'
      };

    } else if (activeGateway.gateway_identifier === 'stripe') {
      console.log('[STRIPE_GATEWAY] Gateway Stripe selecionado. Lógica a ser implementada.');
      throw new Error('O gateway Stripe ainda não está implementado.');
      
    } else if (activeGateway.gateway_identifier === 'mercadopago') {
      console.log('[MERCADOPAGO_GATEWAY] Gateway Mercado Pago selecionado. Lógica a ser implementada.');
      throw new Error('O gateway Mercado Pago ainda não está implementado.');
      
    } else {
      console.error(`[GATEWAY_UNSUPPORTED] Gateway não suportado: ${activeGateway.gateway_identifier}`);
      throw new Error(`Gateway "${activeGateway.gateway_identifier}" não é suportado.`);
    }

    // ============================================
    // CUSTOMER UPSERT LOGIC (CORRIGIDO - AUTH.USERS PRIMEIRO)
    // ============================================
    let resolvedBuyerProfileId = buyer_profile_id;
    
    if (!resolvedBuyerProfileId && buyer_email) {
      console.log(`[DIAGNOSTIC][${executionId}] 👤 INICIANDO UPSERT DO CLIENTE para: ${buyer_email}`);
      
      // PASSO 1: Verificar se o usuário já existe em auth.users
      const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        console.error(`[ERROR][${executionId}] Erro ao listar usuários:`, listError);
        throw new Error('Falha ao verificar usuário existente.');
      }

      const existingUser = existingUsers.users.find(u => u.email === buyer_email);

      if (existingUser) {
        // Usuário já existe, usar o ID dele
        console.log(`[DIAGNOSTIC][${executionId}] 👤 Usuário existente encontrado: ${existingUser.id}`);
        resolvedBuyerProfileId = existingUser.id;

        // FASE 3: Fortalecer atualização de usuários existentes
        if (buyer_phone || buyer_cpf_cnpj) {
          const updateData: any = {};
          if (buyer_phone) updateData.phone = buyer_phone;
          if (buyer_cpf_cnpj) updateData.cpf_cnpj = buyer_cpf_cnpj;
          if (buyer_name) updateData.full_name = buyer_name;

          console.log(`[DIAGNOSTIC][${executionId}] 📝 Atualizando perfil existente com dados:`, updateData);

          const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', existingUser.id)
            .select('phone, cpf_cnpj, full_name')
            .single();
          
          if (updateError || !updatedProfile) {
            console.error(`[ERROR][${executionId}] Falha ao atualizar perfil:`, updateError);
            throw new Error('Falha ao atualizar dados do cliente.');
          }

          // Verificar se o phone foi realmente salvo
          if (buyer_phone && updatedProfile.phone !== buyer_phone) {
            console.error(`[CRITICAL][${executionId}] ❌ PHONE NÃO FOI SALVO! Esperado: ${buyer_phone}, Recebido: ${updatedProfile.phone}`);
            throw new Error('Falha crítica: Telefone não foi salvo no perfil.');
          }
          
          console.log(`[DIAGNOSTIC][${executionId}] ✅ Perfil atualizado e verificado:`, updatedProfile);
        }
      } else {
        // PASSO 2: Criar novo usuário em auth.users
        console.log(`[DIAGNOSTIC][${executionId}] 👤 Criando novo usuário em auth.users`);
        
        const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
          email: buyer_email,
          email_confirm: true, // Auto-confirmar email para clientes de checkout
          user_metadata: {
            full_name: buyer_name || buyer_email,
            phone: buyer_phone || null,
            cpf_cnpj: buyer_cpf_cnpj || null,
            role: 'user' // Define role como 'user' para clientes de checkout
          }
        });

        if (createUserError || !newUser.user) {
          console.error(`[ERROR][${executionId}] Erro ao criar usuário:`, createUserError);
          throw new Error('Falha ao criar usuário no sistema de autenticação.');
        }

        console.log(`[DIAGNOSTIC][${executionId}] ✅ Novo usuário criado: ${newUser.user.id}`);
        resolvedBuyerProfileId = newUser.user.id;

        // PASSO 3: Aguardar o trigger criar o perfil, então atualizar campos adicionais
        // O trigger handle_new_user() cria o perfil automaticamente
        // FASE 2: Aumentado de 500ms para 1000ms para garantir que o trigger termine
        await new Promise(resolve => setTimeout(resolve, 1000));

        // FASE 2: Verificar se o perfil foi criado antes de continuar
        const { data: createdProfile, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', newUser.user.id)
          .single();

        if (checkError || !createdProfile) {
          console.error(`[ERROR][${executionId}] Perfil não foi criado pelo trigger:`, checkError);
          throw new Error('Falha ao criar perfil do cliente.');
        }

        console.log(`[DIAGNOSTIC][${executionId}] ✅ Perfil criado pelo trigger confirmado`);

        // FASE 2: Verificar se os dados foram salvos pela trigger
        const { data: triggerProfile, error: triggerCheckError } = await supabase
          .from('profiles')
          .select('phone, cpf_cnpj, full_name')
          .eq('id', newUser.user.id)
          .single();

        if (triggerCheckError) {
          console.error(`[ERROR][${executionId}] Falha ao verificar perfil criado:`, triggerCheckError);
          throw new Error('Falha ao verificar perfil criado.');
        }

        console.log(`[DIAGNOSTIC][${executionId}] 📋 Perfil criado pela trigger:`, {
          phone: triggerProfile.phone,
          cpf_cnpj: triggerProfile.cpf_cnpj,
          full_name: triggerProfile.full_name,
          buyer_phone_original: buyer_phone
        });

        // Se a trigger não salvou os dados (por algum motivo), fazer update explícito
        if ((buyer_phone && !triggerProfile.phone) || (buyer_cpf_cnpj && !triggerProfile.cpf_cnpj)) {
          console.log(`[DIAGNOSTIC][${executionId}] ⚠️ Trigger não salvou todos os dados, executando update de backup`);
          
          const updateData: any = {};
          if (buyer_phone && !triggerProfile.phone) updateData.phone = buyer_phone;
          if (buyer_cpf_cnpj && !triggerProfile.cpf_cnpj) updateData.cpf_cnpj = buyer_cpf_cnpj;

          const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', newUser.user.id)
            .select('phone, cpf_cnpj')
            .single();
          
          if (updateError || !updatedProfile) {
            console.error(`[CRITICAL][${executionId}] ❌ Falha no update de backup:`, updateError);
            throw new Error('Falha crítica ao salvar dados do cliente.');
          }

          // Verificação final OBRIGATÓRIA
          if (buyer_phone && updatedProfile.phone !== buyer_phone) {
            console.error(`[CRITICAL][${executionId}] ❌ PHONE NÃO FOI SALVO MESMO APÓS UPDATE! Esperado: ${buyer_phone}, Recebido: ${updatedProfile.phone}`);
            throw new Error('Falha crítica: Telefone não foi salvo no perfil.');
          }
          
          console.log(`[DIAGNOSTIC][${executionId}] ✅ Update de backup concluído e verificado:`, updatedProfile);
        }
      }
    }

    // INSTRUMENTAÇÃO DIAGNÓSTICA: Logar ID do cliente resolvido
    console.log(`[DIAGNOSTIC][${executionId}] 👤 DEPOIS DA LÓGICA DE UPSERT DO CLIENTE`, {
      resolvedBuyerProfileId,
      buyer_email,
      was_created: !buyer_profile_id && !!resolvedBuyerProfileId
    });

    // --- Inserir a Venda no Nosso Banco de Dados ---
    // Adicionar ticket_id único para cada attendee
    const attendeesWithTicketIds = attendees?.map((attendee: any) => ({
      ...attendee,
      ticket_id: generateTicketId()
    })) || [];

    const saleData = {
      product_id,
      buyer_profile_id: resolvedBuyerProfileId,
      buyer_email,
      gateway_transaction_id: gatewayResponse.id,
      gateway_identifier: activeGateway.gateway_identifier,
      gateway_status: gatewayResponse.status,
      gateway_payment_url: gatewayResponse.secure_url,
      gateway_pix_qrcode_text: gatewayResponse.pix_qr_code_text,
      gateway_pix_qrcode_base64: gatewayResponse.pix_qr_code_base64,
      gateway_bank_slip_barcode: gatewayResponse.bank_slip_barcode,
      amount_total_cents: Math.round(finalAmountCents),
      payment_method_used: payment_method_selected,
      installments_chosen: installments || 1,
      status: 'pending_payment',
      platform_fee_cents: 0, // Será calculado posteriormente
      producer_share_cents: 0, // Será calculado posteriormente
      event_attendees: attendeesWithTicketIds,
      original_product_price_cents: original_product_price_cents || (donation_amount_cents ? donation_amount_cents : product.price_cents * (quantity || 1)),
      order_bump_items: order_bump_items ? JSON.stringify(order_bump_items) : null,
    };

    // INSTRUMENTAÇÃO DIAGNÓSTICA: Logar saleData antes de inserir
    console.log(`[DIAGNOSTIC][${executionId}] 💾 ANTES DE INSERIR NA TABELA 'sales'`, saleData);
    
    const { data: newSale, error: insertError } = await supabase
      .from('sales')
      .insert([saleData])
      .select()
      .single();

    if (insertError) {
      console.error('[DB_INSERT_ERROR] Falha ao salvar a venda:', insertError);
      throw new Error('Falha ao registrar a venda no banco de dados.');
    }

    // INSTRUMENTAÇÃO DIAGNÓSTICA: Logar venda criada
    console.log(`[DIAGNOSTIC][${executionId}] ✅ DEPOIS DE INSERIR NA TABELA 'sales'`, {
      sale_id: newSale.id,
      status: newSale.status,
      gateway_transaction_id: newSale.gateway_transaction_id,
      gateway_identifier: newSale.gateway_identifier,
      payment_method_used: newSale.payment_method_used,
      amount_total_cents: newSale.amount_total_cents
    });

    // FASE 2: Verificação final do phone no perfil ANTES de criar o evento
    if (buyer_phone && resolvedBuyerProfileId) {
      const { data: finalProfile, error: finalCheckError } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', resolvedBuyerProfileId)
        .single();
      
      if (finalCheckError) {
        console.error(`[ERROR][${executionId}] Erro ao verificar phone final:`, finalCheckError);
      } else {
        console.log(`[DIAGNOSTIC][${executionId}] 📱 Telefone no perfil ANTES do evento: ${finalProfile?.phone}`);
        
        if (!finalProfile?.phone) {
          console.warn(`[WARNING][${executionId}] ⚠️ ATENÇÃO: phone está NULL no perfil antes de criar o evento!`);
        }
      }
    }

    // --- Registrar Evento de Transação ---
    let eventTypeToLog: string | null = null;
    if (payment_method_selected === 'pix') {
      eventTypeToLog = 'pix.gerado';
    } else if (payment_method_selected === 'bank_slip') {
      eventTypeToLog = 'boleto.gerado';
    }

    console.log(`[EVENT_REGISTRY_DEBUG] Preparando para registrar evento: ${eventTypeToLog} para venda ${newSale.id}`);
    console.log(`[EVENT_REGISTRY_DEBUG] Contexto de execução: role=${JSON.stringify({role: 'service_role_check', env_key_present: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')})}`);

    if (eventTypeToLog) {
      try {
        const eventData = {
          sale_id: newSale.id,
          event_type: eventTypeToLog,
          metadata: {
            gateway_name: gatewayResponse.gateway_name,
            gateway_transaction_id: gatewayResponse.id,
            payment_method: payment_method_selected,
            amount_cents: finalAmountCents,
            created_at_function: new Date().toISOString()
          }
        };

        console.log(`[EVENT_REGISTRY_DEBUG] Dados do evento a inserir:`, JSON.stringify(eventData, null, 2));

        // INSTRUMENTAÇÃO DIAGNÓSTICA: Logar antes de inserir evento
        console.log(`[DIAGNOSTIC][${executionId}] 📝 ANTES DE INSERIR NA TABELA 'transaction_events'`, eventData);

        const { data: eventResult, error: eventError } = await supabase
          .from('transaction_events')
          .insert(eventData)
          .select()
          .single();

        if (eventError) {
          console.error(`[EVENT_LOG_ERROR] CRÍTICO! Falha ao registrar evento '${eventTypeToLog}' para a venda ${newSale.id}:`);
          console.error(`[EVENT_LOG_ERROR] Erro completo:`, JSON.stringify(eventError, null, 2));
          console.error(`[EVENT_LOG_ERROR] Dados tentados:`, JSON.stringify(eventData, null, 2));
          
          // CORREÇÃO CRÍTICA: Falhar a transação se o evento não for criado
          throw new Error(`Falha crítica ao registrar evento ${eventTypeToLog}: ${eventError.message}`);
        } else {
          console.log(`[EVENT_LOG_SUCCESS] ✅ Evento '${eventTypeToLog}' registrado com sucesso para a venda ${newSale.id}`);
          console.log(`[EVENT_LOG_SUCCESS] Evento criado:`, JSON.stringify(eventResult, null, 2));
          
          // INSTRUMENTAÇÃO DIAGNÓSTICA: Logar evento criado com sucesso
          console.log(`[DIAGNOSTIC][${executionId}] ✅ DEPOIS DE INSERIR NA TABELA 'transaction_events'`, {
            event_id: eventResult?.id,
            event_type: eventTypeToLog,
            sale_id: newSale.id,
            metadata: eventData.metadata
          });
          
          // Evento criado com sucesso - o trigger automático cuidará do enfileiramento
          console.log(`[ARCHITECTURAL_SUCCESS] Evento registrado. O trigger automático processará o enfileiramento de webhooks.`);
        }
      } catch (eventException: any) {
        console.error(`[EVENT_LOG_EXCEPTION] Exceção ao registrar evento:`, eventException);
        console.error(`[EVENT_LOG_EXCEPTION] Stack trace:`, eventException?.stack);
      }
    } else {
      console.log(`[EVENT_REGISTRY_DEBUG] Nenhum evento a registrar para método de pagamento: ${payment_method_selected}`);
    }

    // --- Retornar Resposta de Sucesso ---
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Transação iniciada com sucesso via ${gatewayResponse.gateway_name}.`,
        sale_id: newSale.id,
        gateway_transaction_id: gatewayResponse.id,
        status: gatewayResponse.status,
        gateway_used: gatewayResponse.gateway_name,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    // INSTRUMENTAÇÃO DIAGNÓSTICA: Logar erro fatal
    console.error(`[DIAGNOSTIC][${executionId}] ❌ ERRO FATAL`, {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    console.error('[TRANSACTION_ERROR] Erro no processo de criação da transação:', error.message);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
