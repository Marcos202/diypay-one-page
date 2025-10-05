-- Ativa a segurança a nível de linha na tabela de perfis.
-- Isso fará com que todas as políticas de RLS já existentes para esta tabela
-- comecem a ser aplicadas imediatamente.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;