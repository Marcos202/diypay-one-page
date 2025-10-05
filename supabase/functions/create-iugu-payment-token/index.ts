
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaymentTokenPayload {
  card_number: string;
  verification_value: string;
  first_name: string;
  last_name: string;
  month: string;
  year: string;
}

Deno.serve(async (req) => {
  console.log('[DEBUG] Iniciando create-iugu-payment-token');
  console.log('[DEBUG] Método da requisição:', req.method);
  console.log('[DEBUG] Headers da requisição:', Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('[DEBUG] Retornando resposta CORS para OPTIONS');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[DEBUG] Iniciando processamento principal da função');

    // Get environment and API keys
    const appEnv = Deno.env.get('APP_ENV') || 'test';
    const isProduction = appEnv === 'production';
    
    console.log('[DEBUG] APP_ENV:', appEnv);
    console.log('[DEBUG] isProduction:', isProduction);
    
    const iuguApiKey = isProduction 
      ? Deno.env.get('IUGU_API_KEY_LIVE')
      : Deno.env.get('IUGU_API_KEY_TEST');
    
    const iuguAccountId = isProduction
      ? Deno.env.get('IUGU_ACCOUNT_ID_LIVE')
      : Deno.env.get('IUGU_ACCOUNT_ID_TEST');

    console.log('[DEBUG] Iugu API Key existe:', !!iuguApiKey);
    console.log('[DEBUG] Iugu Account ID existe:', !!iuguAccountId);

    if (!iuguApiKey || !iuguAccountId) {
      const errorMsg = 'Configuração da API da Iugu não encontrada para ambiente: ' + appEnv;
      console.error('[ERRO]', errorMsg);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: true, 
          message: 'Configuração da API da Iugu não encontrada',
          functionName: 'create-iugu-payment-token'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    console.log('[DEBUG] Tentando fazer parse do body da requisição');
    let payload: PaymentTokenPayload;
    
    try {
      const requestText = await req.text();
      console.log('[DEBUG] Body bruto da requisição:', requestText);
      payload = JSON.parse(requestText);
      console.log('[DEBUG] Payload parseado:', payload);
    } catch (parseError) {
      const errorMsg = 'Erro ao fazer parse do JSON da requisição';
      console.error('[ERRO]', errorMsg, parseError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: true, 
          message: errorMsg,
          functionName: 'create-iugu-payment-token',
          details: parseError.toString()
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate required fields
    const requiredFields = ['card_number', 'verification_value', 'first_name', 'last_name', 'month', 'year'];
    console.log('[DEBUG] Validando campos obrigatórios:', requiredFields);
    
    for (const field of requiredFields) {
      if (!payload[field as keyof PaymentTokenPayload]) {
        const errorMsg = `Campo obrigatório não informado: ${field}`;
        console.error('[ERRO]', errorMsg);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: true, 
            message: errorMsg,
            functionName: 'create-iugu-payment-token'
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    console.log('[DEBUG] Todos os campos obrigatórios estão presentes');
    console.log('[DEBUG] Dados do cartão para tokenização (últimos 4 dígitos):', payload.card_number?.slice(-4));

    // Build payload for Iugu payment token API
    const iuguPayload = {
      account_id: iuguAccountId,
      method: 'credit_card',
      test: !isProduction, // Set test mode based on environment
      data: {
        number: payload.card_number,
        verification_value: payload.verification_value,
        first_name: payload.first_name,
        last_name: payload.last_name,
        month: payload.month,
        year: payload.year
      }
    };

    console.log('[DEBUG] Payload para enviar à Iugu:', {
      ...iuguPayload,
      data: {
        ...iuguPayload.data,
        number: iuguPayload.data.number.slice(0, 4) + '****' + iuguPayload.data.number.slice(-4),
        verification_value: '***'
      }
    });

    // Create Basic Auth header
    const authHeader = `Basic ${btoa(iuguApiKey + ':')}`;
    console.log('[DEBUG] Header de autenticação criado (primeiros 20 chars):', authHeader.substring(0, 20) + '...');

    // Call Iugu payment token API
    console.log('[DEBUG] Fazendo requisição para tokenização na Iugu');
    let iuguResponse;
    let iuguData;

    try {
      iuguResponse = await fetch('https://api.iugu.com/v1/payment_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify(iuguPayload),
      });

      console.log('[DEBUG] Status da resposta da Iugu:', iuguResponse.status);
      console.log('[DEBUG] Headers da resposta da Iugu:', Object.fromEntries(iuguResponse.headers.entries()));

      const responseText = await iuguResponse.text();
      console.log('[DEBUG] Texto bruto da resposta da Iugu:', responseText);

      try {
        iuguData = JSON.parse(responseText);
        console.log('[DEBUG] Dados parseados da resposta da Iugu:', iuguData);
      } catch (iuguParseError) {
        console.error('[ERRO] Erro ao fazer parse da resposta da Iugu:', iuguParseError);
        throw new Error('Resposta inválida da API da Iugu: ' + responseText);
      }
    } catch (fetchError) {
      console.error('[ERRO] Erro na requisição para a Iugu:', fetchError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: true, 
          message: 'Erro na comunicação com a Iugu',
          functionName: 'create-iugu-payment-token',
          details: fetchError.toString()
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!iuguResponse.ok) {
      console.error('[ERRO] Tokenização falhou - resposta da Iugu:', iuguData);
      
      // Handle Iugu errors
      let errorMessage = 'Erro na tokenização do cartão';
      
      if (iuguData.errors) {
        // Extract specific error messages from Iugu
        const errorDetails = Object.entries(iuguData.errors)
          .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('; ');
        errorMessage = `Dados do cartão inválidos: ${errorDetails}`;
      }

      const errorResponse = {
        success: false,
        error: true, 
        message: errorMessage,
        iugu_errors: iuguData.errors || iuguData,
        functionName: 'create-iugu-payment-token'
      };

      console.log('[DEBUG] Retornando erro da tokenização:', errorResponse);
      return new Response(
        JSON.stringify(errorResponse),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Success: Token created
    console.log('[DEBUG] Token criado com sucesso:', iuguData.id);

    const successResponse = {
      success: true,
      ...iuguData
    };

    console.log('[DEBUG] Retornando resposta de sucesso da tokenização:', successResponse);
    // Return the complete Iugu response (contains the token and any extra info)
    return new Response(
      JSON.stringify(successResponse),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[ERRO] Erro geral na create-iugu-payment-token:', error.message);
    console.error('[ERRO] Stack trace:', error.stack);
    console.error('[ERRO] Erro completo:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: true, 
        message: 'Erro interno do servidor durante tokenização', 
        details: error.message,
        functionName: 'create-iugu-payment-token'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
