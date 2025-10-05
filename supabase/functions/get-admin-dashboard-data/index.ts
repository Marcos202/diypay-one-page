import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 1. Cliente de Autenticação: verificar se o requisitante é um admin.
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Cabeçalho de autorização ausente' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await authClient.auth.getUser()
    if (userError) throw userError

    const { data: profile, error: profileError } = await authClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profileError) throw profileError

    if (profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Requer função de administrador.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Cliente de Dados (Admin): buscar os dados com privilégios de serviço.
    // Este cliente é criado SEM a sessão do usuário para garantir que ele ignore o RLS.
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Parse do corpo da requisição para o filtro de data
    const { date_filter = 'last_30_days' } = await req.json().catch(() => ({}))
    
    let startDate = new Date()
    const endDate = new Date()
    
    switch (date_filter) {
      case 'this_month':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1)
        break
      case 'this_year':
        startDate = new Date(endDate.getFullYear(), 0, 1)
        break
      case 'last_7_days':
        startDate.setDate(endDate.getDate() - 7)
        break
      case 'last_30_days':
      default:
        startDate.setDate(endDate.getDate() - 30)
        break
    }

    // Get KPIs usando o serviceClient
    const { data: salesData, error: salesError } = await serviceClient
      .from('sales')
      .select('amount_total_cents, platform_fee_cents, created_at')
      .eq('status', 'paid')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    if (salesError) throw salesError

    // Cálculo dos KPIs
    const valorTotalMovimentado = salesData.reduce((sum, sale) => sum + (sale.amount_total_cents || 0), 0)
    const valorTotalLucro = salesData.reduce((sum, sale) => sum + (sale.platform_fee_cents || 0), 0)

    // Geração dos dados do gráfico
    const dailyData = new Map<string, number>()
    salesData.forEach(sale => {
      const date = new Date(sale.created_at)
      const dateKey = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`
      const currentValue = dailyData.get(dateKey) || 0
      dailyData.set(dateKey, currentValue + (sale.amount_total_cents || 0))
    })

    const chartData = Array.from(dailyData, ([name, total]) => ({
      name,
      total: total / 100
    })).sort((a, b) => {
      const [dayA, monthA] = a.name.split('/').map(Number)
      const [dayB, monthB] = b.name.split('/').map(Number)
      if (monthA !== monthB) return monthA - monthB
      return dayA - dayB
    })

    const response = {
      kpis: {
        valorTotalMovimentado: valorTotalMovimentado / 100,
        valorTotalLucro: valorTotalLucro / 100
      },
      chartData
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erro em get-admin-dashboard-data:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})