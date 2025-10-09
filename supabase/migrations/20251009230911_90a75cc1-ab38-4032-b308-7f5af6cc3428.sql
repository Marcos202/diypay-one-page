-- Criar tabela order_bumps para armazenar configurações gerais
CREATE TABLE IF NOT EXISTS public.order_bumps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  custom_color VARCHAR(7) DEFAULT '#10b981',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_order_bump_per_product UNIQUE(product_id)
);

-- Criar índice para melhor performance
CREATE INDEX idx_order_bumps_product_id ON public.order_bumps(product_id);
CREATE INDEX idx_order_bumps_is_active ON public.order_bumps(is_active);

-- Criar tabela order_bump_items para armazenar produtos individuais do order bump
CREATE TABLE IF NOT EXISTS public.order_bump_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_bump_id UUID NOT NULL REFERENCES public.order_bumps(id) ON DELETE CASCADE,
  bump_product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  title VARCHAR(50) NOT NULL,
  description TEXT,
  image_url TEXT,
  discount_percent NUMERIC(5,2) DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_bump_product UNIQUE(order_bump_id, bump_product_id)
);

-- Criar índices para melhor performance
CREATE INDEX idx_order_bump_items_order_bump_id ON public.order_bump_items(order_bump_id);
CREATE INDEX idx_order_bump_items_bump_product_id ON public.order_bump_items(bump_product_id);

-- Adicionar coluna order_bump_items na tabela sales
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS order_bump_items JSONB;

-- Criar trigger para atualizar updated_at automaticamente em order_bumps
CREATE OR REPLACE FUNCTION public.update_order_bumps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_order_bumps_updated_at
  BEFORE UPDATE ON public.order_bumps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_order_bumps_updated_at();

-- Criar trigger para atualizar updated_at automaticamente em order_bump_items
CREATE OR REPLACE FUNCTION public.update_order_bump_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_order_bump_items_updated_at
  BEFORE UPDATE ON public.order_bump_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_order_bump_items_updated_at();

-- Habilitar RLS nas tabelas
ALTER TABLE public.order_bumps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_bump_items ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para order_bumps
CREATE POLICY "Producers can manage their order bumps"
  ON public.order_bumps
  FOR ALL
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

CREATE POLICY "Public can view active order bumps"
  ON public.order_bumps
  FOR SELECT
  USING (is_active = true);

-- Políticas RLS para order_bump_items
CREATE POLICY "Producers can manage their order bump items"
  ON public.order_bump_items
  FOR ALL
  USING (
    order_bump_id IN (
      SELECT ob.id 
      FROM public.order_bumps ob
      JOIN public.products p ON ob.product_id = p.id
      WHERE p.producer_id = auth.uid()
    )
  )
  WITH CHECK (
    order_bump_id IN (
      SELECT ob.id 
      FROM public.order_bumps ob
      JOIN public.products p ON ob.product_id = p.id
      WHERE p.producer_id = auth.uid()
    )
  );

CREATE POLICY "Public can view active order bump items"
  ON public.order_bump_items
  FOR SELECT
  USING (
    order_bump_id IN (
      SELECT id FROM public.order_bumps WHERE is_active = true
    )
  );