// supabase/functions/_shared/cors.ts

// Este é um conjunto de cabeçalhos CORS padrão e seguro para Edge Functions do Supabase.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
