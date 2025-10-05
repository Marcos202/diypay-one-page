-- Remover as políticas defeituosas
DROP POLICY IF EXISTS "Allow admins to read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow admins to read all sales" ON public.sales;

-- Opcional, mas recomendado para garantir o estado original:
-- Desabilita a RLS na tabela de perfis para restaurar o comportamento padrão.
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;