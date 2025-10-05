-- Adiciona a coluna 'display_format' na tabela 'space_containers'
-- com um valor padrão seguro para não afetar os containers existentes.

ALTER TABLE public.space_containers
ADD COLUMN display_format TEXT NOT NULL DEFAULT 'horizontal';

COMMENT ON COLUMN public.space_containers.display_format IS 'Define o formato de exibição dos produtos neste container (ex: horizontal, vertical).';