
-- Habilita a segurança a nível de linha na tabela. Isso bloqueia todo o acesso por padrão.
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;

-- Remove qualquer política pública que possa existir por acidente.
DROP POLICY IF EXISTS "Allow public read access" ON public.payment_gateways;

-- Cria uma função de segurança definer para evitar recursão infinita
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Cria uma política que permite que SOMENTE administradores leiam os dados.
CREATE POLICY "Allow admins to read gateways"
ON public.payment_gateways
FOR SELECT
TO authenticated
USING (public.get_current_user_role() = 'admin');

-- Cria uma política que permite que SOMENTE administradores atualizem os dados.
CREATE POLICY "Allow admins to update gateways"
ON public.payment_gateways
FOR UPDATE
TO authenticated
USING (public.get_current_user_role() = 'admin');
