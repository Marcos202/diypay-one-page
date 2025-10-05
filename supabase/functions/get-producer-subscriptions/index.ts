
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('[DEBUG] *** INÍCIO DA FUNÇÃO get-producer-subscriptions ***')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('[DEBUG] Retornando resposta CORS para OPTIONS')
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('[ERROR] Header de autorização não encontrado')
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Set the auth context
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      console.log('[ERROR] Erro de autenticação:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('[DEBUG] Usuário autenticado:', user.id)

    // Get producer profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'producer') {
      console.log('[ERROR] Usuário não é um produtor válido')
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get productId from request body if provided
    const body = await req.json().catch(() => ({}))
    const productId = body.productId

    console.log('[DEBUG] Buscando assinaturas do produtor:', profile.id, productId ? `para produto: ${productId}` : 'para todos os produtos')

    // Build query with optional product filter
    let query = supabaseClient
      .from('sales')
      .select(`
        id,
        created_at,
        buyer_email,
        amount_total_cents,
        producer_share_cents,
        status,
        iugu_subscription_id,
        products!inner(
          id,
          name,
          producer_id
        ),
        profiles!buyer_profile_id(
          full_name
        )
      `)
      .eq('products.producer_id', profile.id)
      .not('iugu_subscription_id', 'is', null)
      .order('created_at', { ascending: false })

    // Add product filter if provided
    if (productId) {
      query = query.eq('product_id', productId)
    }

    const { data: subscriptions, error: subscriptionsError } = await query

    if (subscriptionsError) {
      console.log('[ERROR] Erro ao buscar assinaturas:', subscriptionsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('[DEBUG] Assinaturas encontradas:', subscriptions?.length || 0)

    // Get Iugu API credentials
    const iuguApiKey = Deno.env.get('APP_ENV') === 'production' 
      ? Deno.env.get('IUGU_API_KEY_LIVE') 
      : Deno.env.get('IUGU_API_KEY_TEST')

    // Enrich subscriptions with next due date from Iugu API
    const enrichedSubscriptions = await Promise.all(
      (subscriptions || []).map(async (subscription: any) => {
        let nextDueDate = null;
        
        if (subscription.iugu_subscription_id && iuguApiKey) {
          try {
            console.log('[DEBUG] Buscando dados da assinatura na Iugu:', subscription.iugu_subscription_id)
            
            const iuguResponse = await fetch(
              `https://api.iugu.com/v1/subscriptions/${subscription.iugu_subscription_id}`,
              {
                headers: {
                  'Authorization': `Basic ${btoa(iuguApiKey + ':')}`,
                  'Content-Type': 'application/json'
                }
              }
            )

            if (iuguResponse.ok) {
              const iuguData = await iuguResponse.json()
              if (iuguData.expires_at) {
                nextDueDate = iuguData.expires_at
                console.log('[DEBUG] Data de próxima cobrança encontrada:', nextDueDate)
              }
            } else {
              console.log('[WARNING] Erro ao buscar dados da assinatura na Iugu:', iuguResponse.status)
            }
          } catch (error) {
            console.log('[WARNING] Erro ao conectar com a API da Iugu:', error.message)
          }
        }

        return {
          ...subscription,
          next_due_date: nextDueDate
        }
      })
    )

    // Calculate statistics
    const activeSubscriptions = enrichedSubscriptions?.filter(sub => sub.status === 'paid' || sub.status === 'active') || []
    const totalActiveCount = activeSubscriptions.length
    const monthlyRecurring = activeSubscriptions.reduce((sum, sub) => sum + (sub.producer_share_cents || 0), 0)

    const stats = {
      totalActive: totalActiveCount,
      monthlyRecurring: monthlyRecurring,
      totalSubscriptions: enrichedSubscriptions?.length || 0
    }

    console.log('[DEBUG] Estatísticas calculadas:', stats)

    const response = {
      subscriptions: enrichedSubscriptions || [],
      stats
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.log('[ERROR] Erro interno:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
