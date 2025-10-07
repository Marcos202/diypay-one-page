-- ========================================
-- FASE 1.2: Ativar RLS em transaction_events
-- ========================================

-- Habilitar RLS na tabela transaction_events (se ainda não estiver)
ALTER TABLE public.transaction_events ENABLE ROW LEVEL SECURITY;

-- Remover policies antigas se existirem
DROP POLICY IF EXISTS "producers_can_view_their_events" ON public.transaction_events;
DROP POLICY IF EXISTS "service_role_full_access" ON public.transaction_events;

-- Policy: Produtores podem ver apenas eventos de suas próprias vendas
CREATE POLICY "producers_can_view_their_events"
ON public.transaction_events
FOR SELECT
TO authenticated
USING (
  sale_id IN (
    SELECT s.id FROM public.sales s
    JOIN public.products p ON s.product_id = p.id
    WHERE p.producer_id = auth.uid()
  )
);

-- Policy: Service role tem acesso total
CREATE POLICY "service_role_full_access"
ON public.transaction_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ========================================
-- FASE 1.1: Migração do Sistema de Roles
-- ========================================

-- Step 1: Criar enum para roles (incluindo todos os valores existentes)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'producer', 'user', 'buyer');
  END IF;
END $$;

-- Step 2: Criar tabela user_roles (se não existir)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 3: Migrar dados existentes de profiles para user_roles
-- APENAS para user_ids que existem em auth.users (evitar FK violation)
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, p.role::app_role 
FROM public.profiles p
WHERE p.role IS NOT NULL
  AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id)
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 4: Criar função has_role() com SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ========================================
-- Step 5: Atualizar RLS Policies
-- ========================================

-- 5.0: Remover policies da tabela PAGES que dependem de is_admin()
DROP POLICY IF EXISTS "Allow admins full access" ON public.pages;
DROP POLICY IF EXISTS "Allow public read access for published pages" ON public.pages;

-- 5.1: Atualizar policies em PROFILES
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 5.2: Atualizar policies em PRODUCER_FINANCIALS
DROP POLICY IF EXISTS "Producer can view only own financial data" ON public.producer_financials;
CREATE POLICY "Producer can view only own financial data"
ON public.producer_financials
FOR SELECT
TO authenticated
USING (
  (auth.uid() = producer_id) AND 
  public.has_role(auth.uid(), 'producer')
);

DROP POLICY IF EXISTS "Producer can insert only own financial data" ON public.producer_financials;
CREATE POLICY "Producer can insert only own financial data"
ON public.producer_financials
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() = producer_id) AND 
  public.has_role(auth.uid(), 'producer')
);

DROP POLICY IF EXISTS "Producer can update only own financial data" ON public.producer_financials;
CREATE POLICY "Producer can update only own financial data"
ON public.producer_financials
FOR UPDATE
TO authenticated
USING (
  (auth.uid() = producer_id) AND 
  public.has_role(auth.uid(), 'producer')
);

-- 5.3: Atualizar policies em PAYMENT_GATEWAYS
DROP POLICY IF EXISTS "Admins can view gateway info" ON public.payment_gateways;
CREATE POLICY "Admins can view gateway info"
ON public.payment_gateways
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update gateways" ON public.payment_gateways;
CREATE POLICY "Admins can update gateways"
ON public.payment_gateways
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 5.4: Atualizar policies em FINANCIAL_TRANSACTIONS
DROP POLICY IF EXISTS "Producer can view only own transactions" ON public.financial_transactions;
CREATE POLICY "Producer can view only own transactions"
ON public.financial_transactions
FOR SELECT
TO authenticated
USING (
  (producer_id = auth.uid()) AND 
  public.has_role(auth.uid(), 'producer')
);

-- 5.5: Atualizar policies em PLATFORM_SETTINGS
DROP POLICY IF EXISTS "Allow admins to read platform settings" ON public.platform_settings;
CREATE POLICY "Allow admins to read platform settings"
ON public.platform_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Allow admins to update platform settings" ON public.platform_settings;
CREATE POLICY "Allow admins to update platform settings"
ON public.platform_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 5.6: Remover função antiga get_current_user_role() se existir
DROP FUNCTION IF EXISTS public.get_current_user_role();

-- 5.7: Remover função antiga is_admin() e recriar usando has_role()
DROP FUNCTION IF EXISTS public.is_admin();
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- 5.8: Recriar policies da tabela PAGES usando a nova função
CREATE POLICY "Allow admins full access"
ON public.pages
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Allow public read access for published pages"
ON public.pages
FOR SELECT
TO authenticated
USING (status = 'published');