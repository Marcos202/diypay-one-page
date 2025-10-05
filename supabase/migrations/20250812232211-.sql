-- Tabela para armazenar os containers customizáveis de uma Área de Membros
CREATE TABLE public.space_containers (
    id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Adiciona um índice para otimizar a busca de containers por space_id
CREATE INDEX IF NOT EXISTS idx_space_containers_space_id ON public.space_containers(space_id);

-- Agora, precisamos modificar a tabela 'space_products' para que cada produto pertença a um container.
-- Passo 1: Adicionar a nova coluna 'container_id'
ALTER TABLE public.space_products
ADD COLUMN container_id UUID;

-- Passo 2: Adicionar a chave estrangeira
ALTER TABLE public.space_products
ADD CONSTRAINT fk_space_products_container_id
FOREIGN KEY (container_id) REFERENCES public.space_containers(id) ON DELETE SET NULL;