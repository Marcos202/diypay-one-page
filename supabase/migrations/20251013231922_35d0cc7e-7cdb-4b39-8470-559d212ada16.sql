-- Criar tabela de lotes de ingressos
CREATE TABLE public.ticket_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  total_quantity INTEGER NOT NULL CHECK (total_quantity > 0),
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  sold_quantity INTEGER NOT NULL DEFAULT 0 CHECK (sold_quantity >= 0),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_advance_to_next BOOLEAN NOT NULL DEFAULT false,
  min_quantity_per_purchase INTEGER DEFAULT 1 CHECK (min_quantity_per_purchase > 0),
  max_quantity_per_purchase INTEGER CHECK (max_quantity_per_purchase IS NULL OR max_quantity_per_purchase > 0),
  sale_end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_sold_quantity CHECK (sold_quantity <= total_quantity)
);

-- Índices para melhor performance
CREATE INDEX idx_ticket_batches_product ON public.ticket_batches(product_id);
CREATE INDEX idx_ticket_batches_active ON public.ticket_batches(is_active);
CREATE INDEX idx_ticket_batches_order ON public.ticket_batches(product_id, display_order);

-- Habilitar RLS
ALTER TABLE public.ticket_batches ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Produtores podem gerenciar seus próprios lotes
CREATE POLICY "Producers can manage their ticket batches"
ON public.ticket_batches
FOR ALL
TO authenticated
USING (
  product_id IN (
    SELECT id FROM public.products WHERE producer_id = auth.uid()
  )
)
WITH CHECK (
  product_id IN (
    SELECT id FROM public.products WHERE producer_id = auth.uid()
  )
);

-- Políticas RLS: Público pode visualizar lotes ativos
CREATE POLICY "Public can view active ticket batches"
ON public.ticket_batches
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_ticket_batches_updated_at
BEFORE UPDATE ON public.ticket_batches
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Adicionar campo batch_id na tabela sales
ALTER TABLE public.sales 
ADD COLUMN batch_id UUID REFERENCES public.ticket_batches(id) ON DELETE SET NULL;

-- Índice para batch_id
CREATE INDEX idx_sales_batch ON public.sales(batch_id);

-- Função para validar limite de 10 lotes por produto
CREATE OR REPLACE FUNCTION public.check_batch_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.ticket_batches WHERE product_id = NEW.product_id) >= 10 THEN
    RAISE EXCEPTION 'Cada produto pode ter no máximo 10 lotes';
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger para aplicar o limite de 10 lotes
CREATE TRIGGER enforce_batch_limit
BEFORE INSERT ON public.ticket_batches
FOR EACH ROW
EXECUTE FUNCTION public.check_batch_limit();