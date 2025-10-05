import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const token = req.headers.get('Authorization')!.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) throw new Error('Unauthorized');

    const { page = 1, limit = 10, spaceIdToExclude } = await req.json()
    const offset = (page - 1) * limit

    // Base query for products count
    let countQuery = supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('producer_id', user.id)

    // Base query for products
    let productsQuery = supabase
      .from('products')
      .select('*, space_products(product_type, space_id)')
      .eq('producer_id', user.id)

    // If spaceIdToExclude is provided, filter out products already in that space
    if (spaceIdToExclude) {
      // Get products already in the specified space
      const { data: existingSpaceProducts } = await supabase
        .from('space_products')
        .select('product_id')
        .eq('space_id', spaceIdToExclude)

      const existingProductIds = existingSpaceProducts?.map(sp => sp.product_id) || []
      
      if (existingProductIds.length > 0) {
        countQuery = countQuery.not('id', 'in', `(${existingProductIds.join(',')})`)
        productsQuery = productsQuery.not('id', 'in', `(${existingProductIds.join(',')})`)
      }
    }

    const { count: totalProducts, error: countError } = await countQuery
    if (countError) throw countError;

    const { data: products, error: productsError } = await productsQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (productsError) throw productsError;

    // ETAPA 2: FORMATAÇÃO DA RESPOSTA COM A REGRA DE NEGÓCIO
    // Adicionamos um novo campo booleano 'is_principal_in_a_space'.
    const formattedProducts = products.map(product => ({
      ...product,
      is_principal_in_a_space: product.space_products.some(sp => sp.product_type === 'principal')
    }));

    const hasMore = (totalProducts || 0) > offset + limit

    return new Response(
      JSON.stringify({
        products: formattedProducts || [],
        totalProducts: totalProducts || 0,
        hasMore,
        currentPage: page,
        totalPages: Math.ceil((totalProducts || 0) / limit)
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})