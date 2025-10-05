
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CustomerPayload {
  email: string;
  name?: string;
  cpf_cnpj?: string;
  phone?: string;
}

Deno.serve(async (req) => {
  console.log('[DEBUG] *** INÍCIO DA FUNÇÃO get-or-create-iugu-customer ***');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('[DEBUG] Retornando resposta CORS para OPTIONS');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment and API keys
    const appEnv = Deno.env.get('APP_ENV') || 'test';
    const isProduction = appEnv === 'production';
    
    const iuguApiKey = isProduction 
      ? Deno.env.get('IUGU_API_KEY_LIVE')
      : Deno.env.get('IUGU_API_KEY_TEST');

    if (!iuguApiKey) {
      const errorMsg = 'Configuração da API da Iugu não encontrada';
      console.error('[ERRO] *** CRITICAL ERROR ***:', errorMsg);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: true,
          message: errorMsg,
          functionName: 'get-or-create-iugu-customer'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      const errorMsg = 'Variáveis de ambiente do Supabase não encontradas';
      console.error('[ERRO] *** CRITICAL ERROR ***:', errorMsg);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: true, 
          message: errorMsg,
          functionName: 'get-or-create-iugu-customer'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    let payload: CustomerPayload;
    
    try {
      const requestText = await req.text();
      console.log('[DEBUG] Body bruto recebido:', requestText);
      payload = JSON.parse(requestText);
      console.log('[DEBUG] Payload parseado:', JSON.stringify(payload, null, 2));
    } catch (parseError) {
      const errorMsg = 'Erro ao fazer parse do JSON da requisição';
      console.error('[ERRO] *** PARSE ERROR ***:', errorMsg, parseError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: true, 
          message: errorMsg,
          functionName: 'get-or-create-iugu-customer'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate required fields
    if (!payload.email) {
      const errorMsg = 'Email é obrigatório';
      console.error('[ERRO] *** VALIDATION ERROR ***:', errorMsg);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: true,
          message: errorMsg,
          functionName: 'get-or-create-iugu-customer'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Limpar o CPF/CNPJ removendo caracteres não numéricos
    const cleanCpfCnpj = payload.cpf_cnpj ? payload.cpf_cnpj.replace(/\D/g, '') : null;
    console.log('[DEBUG] CPF/CNPJ original:', payload.cpf_cnpj, 'CPF/CNPJ limpo:', cleanCpfCnpj);

    console.log('[DEBUG] *** PROCESSANDO CLIENTE PARA EMAIL ***:', payload.email);

    // Check if buyer profile already exists
    let buyerProfile;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', payload.email)
        .eq('role', 'buyer')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[ERRO] Erro ao buscar perfil do comprador:', error);
      } else {
        buyerProfile = data;
        console.log('[DEBUG] Perfil do comprador encontrado:', buyerProfile ? 'SIM' : 'NÃO');
        if (buyerProfile) {
          console.log('[DEBUG] ID do perfil encontrado:', buyerProfile.id);
        }
      }
    } catch (dbError) {
      console.error('[ERRO] Erro na busca do perfil do comprador:', dbError);
    }

    // If buyer profile exists and has iugu_customer_id, return it
    if (buyerProfile?.iugu_customer_id) {
      console.log('[DEBUG] *** CLIENTE IUGU JÁ EXISTE ***:', buyerProfile.iugu_customer_id);
      return new Response(
        JSON.stringify({
          success: true,
          iugu_customer_id: buyerProfile.iugu_customer_id,
          buyer_profile_id: buyerProfile.id,
          exists_in_iugu: true
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create or get Iugu customer
    const authHeader = `Basic ${btoa(iuguApiKey + ':')}`;
    console.log('[DEBUG] *** CRIANDO/BUSCANDO CLIENTE NA IUGU ***');

    try {
      let iuguCustomerId;

      // Melhorar a busca: primeiro tenta pelo CPF/CNPJ se disponível, depois pelo email
      if (cleanCpfCnpj && cleanCpfCnpj.length >= 11) {
        console.log('[DEBUG] Buscando cliente existente na Iugu pelo CPF/CNPJ:', cleanCpfCnpj);
        const searchByCpfResponse = await fetch(`https://api.iugu.com/v1/customers?query=${encodeURIComponent(cleanCpfCnpj)}`, {
          method: 'GET',
          headers: {
            'Authorization': authHeader,
          },
        });

        if (searchByCpfResponse.ok) {
          const searchByCpfData = await searchByCpfResponse.json();
          console.log('[DEBUG] Resultado da busca por CPF/CNPJ:', searchByCpfData);

          if (searchByCpfData.items && searchByCpfData.items.length > 0) {
            // Customer found by CPF/CNPJ
            iuguCustomerId = searchByCpfData.items[0].id;
            console.log('[DEBUG] *** CLIENTE EXISTENTE ENCONTRADO NA IUGU PELO CPF/CNPJ ***:', iuguCustomerId);
          }
        }
      }

      // Se não encontrou pelo CPF/CNPJ, tenta buscar pelo email
      if (!iuguCustomerId) {
        console.log('[DEBUG] Buscando cliente existente na Iugu pelo email:', payload.email);
        const searchByEmailResponse = await fetch(`https://api.iugu.com/v1/customers?query=${encodeURIComponent(payload.email)}`, {
          method: 'GET',
          headers: {
            'Authorization': authHeader,
          },
        });

        if (searchByEmailResponse.ok) {
          const searchByEmailData = await searchByEmailResponse.json();
          console.log('[DEBUG] Resultado da busca por email:', searchByEmailData);

          if (searchByEmailData.items && searchByEmailData.items.length > 0) {
            // Customer found by email
            iuguCustomerId = searchByEmailData.items[0].id;
            console.log('[DEBUG] *** CLIENTE EXISTENTE ENCONTRADO NA IUGU PELO EMAIL ***:', iuguCustomerId);
          }
        }
      }

      // If no customer found, create new one
      if (!iuguCustomerId) {
        console.log('[DEBUG] *** CRIANDO NOVO CLIENTE NA IUGU ***');
        const customerPayload: any = {
          email: payload.email,
          name: payload.name,
          cpf_cnpj: cleanCpfCnpj // Usar o CPF/CNPJ limpo
        };

        console.log('[DEBUG] Payload para criar cliente:', JSON.stringify(customerPayload, null, 2));

        const createResponse = await fetch('https://api.iugu.com/v1/customers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
          body: JSON.stringify(customerPayload),
        });

        if (createResponse.ok) {
          const createData = await createResponse.json();
          iuguCustomerId = createData.id;
          console.log('[DEBUG] *** NOVO CLIENTE CRIADO NA IUGU ***:', iuguCustomerId);
        } else {
          const errorText = await createResponse.text();
          console.error(`[ERRO] Falha ao criar cliente na Iugu. Status: ${createResponse.status}. Payload enviado:`, JSON.stringify(customerPayload, null, 2), 'Resposta da Iugu:', errorText);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: true,
              message: 'Falha ao criar cliente na Iugu',
              details: errorText,
              functionName: 'get-or-create-iugu-customer'
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }

      let finalBuyerProfileId = null;

      // Save or update buyer profile
      if (buyerProfile) {
        // Update existing profile
        console.log('[DEBUG] *** ATUALIZANDO PERFIL EXISTENTE ***');
        const updateData: any = {
          iugu_customer_id: iuguCustomerId,
          updated_at: new Date().toISOString()
        };

        if (payload.name && !buyerProfile.full_name) {
          updateData.full_name = payload.name;
        }

        if (cleanCpfCnpj && !buyerProfile.cpf_cnpj) {
          updateData.cpf_cnpj = cleanCpfCnpj;
        }

        if (payload.phone && !buyerProfile.phone) {
          updateData.phone = payload.phone;
        }

        const { error: updateError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', buyerProfile.id);

        if (updateError) {
          console.error('[ERRO] Falha ao atualizar perfil do comprador:', updateError);
        } else {
          console.log('[DEBUG] *** PERFIL DO COMPRADOR ATUALIZADO ***');
          finalBuyerProfileId = buyerProfile.id;
        }
      } else {
        // Create new profile with generated UUID
        console.log('[DEBUG] *** CRIANDO NOVO PERFIL DE COMPRADOR ***');
        
        // Generate a new UUID for the profile since this is a guest buyer
        const profileId = crypto.randomUUID();
        console.log('[DEBUG] UUID gerado para novo perfil:', profileId);
        
        const newProfileData = {
          id: profileId,
          email: payload.email,
          full_name: payload.name || null,
          cpf_cnpj: cleanCpfCnpj || null,
          phone: payload.phone || null,
          role: 'buyer',
          iugu_customer_id: iuguCustomerId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('[DEBUG] Dados do novo perfil a serem inseridos:', JSON.stringify(newProfileData, null, 2));
        
        const { error: insertError, data: insertData } = await supabase
          .from('profiles')
          .insert(newProfileData)
          .select()
          .single();

        if (insertError) {
          console.error('[ERRO] Falha ao criar perfil do comprador:', insertError);
          console.error('[ERRO] Código do erro:', insertError.code);
          console.error('[ERRO] Detalhes do erro:', insertError.details);
          console.error('[ERRO] Mensagem do erro:', insertError.message);
          // Continue without failing, as the Iugu customer was created successfully
          console.log('[AVISO] Continuando sem perfil local, mas com cliente Iugu criado');
        } else {
          console.log('[DEBUG] *** NOVO PERFIL DE COMPRADOR CRIADO ***');
          console.log('[DEBUG] Dados inseridos:', insertData);
          finalBuyerProfileId = insertData.id;
        }
      }

      console.log('[DEBUG] *** RETORNANDO RESPOSTA FINAL ***');
      console.log('[DEBUG] iugu_customer_id:', iuguCustomerId);
      console.log('[DEBUG] buyer_profile_id:', finalBuyerProfileId);

      return new Response(
        JSON.stringify({
          success: true,
          iugu_customer_id: iuguCustomerId,
          buyer_profile_id: finalBuyerProfileId,
          exists_in_iugu: false
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (error) {
      console.error('[ERRO] *** ERRO NA CRIAÇÃO/BUSCA DO CLIENTE IUGU ***:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: true,
          message: 'Erro na criação/busca do cliente',
          details: error.message,
          functionName: 'get-or-create-iugu-customer'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('[ERRO] *** ERRO GERAL NA get-or-create-iugu-customer ***:', error);
    return new Response(
      JSON.stringify({
        success: false, 
        error: true,
        message: 'Erro interno do servidor', 
        details: error.message,
        functionName: 'get-or-create-iugu-customer'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
