-- ETAPA 1: Habilitar a Row Level Security na tabela, caso ainda não esteja.
-- Isso bloqueia todo o acesso por padrão até que as políticas sejam criadas.
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- ETAPA 2: Remover políticas antigas ou públicas que possam existir por acidente.
DROP POLICY IF EXISTS "Allow public read access" ON public.platform_settings;
DROP POLICY IF EXISTS "Allow authenticated users to read platform settings" ON public.platform_settings;

-- ETAPA 3: Criar a política de LEITURA (SELECT) para administradores.
-- Esta política permitirá que a função `get-platform-fees` funcione corretamente.
CREATE POLICY "Allow admins to read platform settings"
ON public.platform_settings
FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- ETAPA 4: Criar a política de ESCRITA (UPDATE) para administradores.
-- Esta política garante que a função `update-platform-fees` continue funcionando.
CREATE POLICY "Allow admins to update platform settings"
ON public.platform_settings
FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);