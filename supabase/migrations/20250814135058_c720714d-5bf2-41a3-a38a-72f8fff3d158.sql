-- Ação 4: Adicionar Colunas de Personalização à Tabela spaces
-- Verifica se as colunas já existem antes de tentar adicioná-las
DO $$
BEGIN
    -- Adiciona banner_image_url se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'spaces' 
        AND column_name = 'banner_image_url'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.spaces ADD COLUMN banner_image_url TEXT;
        COMMENT ON COLUMN public.spaces.banner_image_url IS 'URL da imagem de banner para o hub da área de membros.';
    END IF;

    -- Adiciona background_color se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'spaces' 
        AND column_name = 'background_color'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.spaces ADD COLUMN background_color TEXT;
        COMMENT ON COLUMN public.spaces.background_color IS 'Cor de fundo (ex: #FFFFFF) para o hub da área de membros.';
    END IF;
END
$$;