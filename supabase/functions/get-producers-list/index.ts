import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          email: string
          created_at: string
          role: string
        }
      }
      products: {
        Row: {
          id: string
          producer_id: string
        }
      }
      sales: {
        Row: {
          id: string
          product_id: string
          amount_total_cents: number
          status: string
        }
      }
    }
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Get producers list request started');

    // Create Supabase client
    const supabase = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get current user and verify admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Authentication failed');
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      throw new Error('Access denied: Admin role required');
    }

    // Get all producers
    const { data: producers, error: producersError } = await supabase
      .from('profiles')
      .select('id, full_name, email, created_at')
      .eq('role', 'producer')
      .order('created_at', { ascending: false });

    if (producersError) {
      throw new Error(`Failed to fetch producers: ${producersError.message}`);
    }

    console.log(`Found ${producers?.length || 0} producers`);

    // Calculate metrics for each producer
    const enrichedProducers = await Promise.all(
      (producers || []).map(async (producer) => {
        // Get producer's products
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('id')
          .eq('producer_id', producer.id);

        if (productsError) {
          console.error(`Error fetching products for producer ${producer.id}:`, productsError);
          return {
            ...producer,
            total_revenue: 0,
            total_sales_count: 0
          };
        }

        const productIds = products?.map(p => p.id) || [];

        if (productIds.length === 0) {
          return {
            ...producer,
            total_revenue: 0,
            total_sales_count: 0
          };
        }

        // Get paid sales for producer's products
        const { data: sales, error: salesError } = await supabase
          .from('sales')
          .select('amount_total_cents')
          .in('product_id', productIds)
          .eq('status', 'paid');

        if (salesError) {
          console.error(`Error fetching sales for producer ${producer.id}:`, salesError);
          return {
            ...producer,
            total_revenue: 0,
            total_sales_count: 0
          };
        }

        const totalRevenue = sales?.reduce((sum, sale) => sum + sale.amount_total_cents, 0) || 0;
        const totalSalesCount = sales?.length || 0;

        return {
          ...producer,
          total_revenue: totalRevenue,
          total_sales_count: totalSalesCount
        };
      })
    );

    console.log('Producers list with metrics calculated successfully');

    return new Response(
      JSON.stringify({ producers: enrichedProducers }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );

  } catch (error) {
    console.error('Error in get-producers-list function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});