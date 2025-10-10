-- =====================================================
-- TABELA: producer_tracking
-- Armazena configurações de pixels de rastreamento
-- =====================================================

CREATE TABLE IF NOT EXISTS public.producer_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  
  -- Meta Pixel (Facebook)
  meta_pixel_id TEXT,
  meta_access_token TEXT, -- Para CAPI (Conversions API) - futuro
  meta_test_event_code TEXT, -- Para testes
  
  -- TikTok Pixel
  tiktok_pixel_id TEXT,
  tiktok_access_token TEXT, -- Para Events API - futuro
  tiktok_test_event_code TEXT,
  
  -- Google Ads
  google_ads_conversion_id TEXT, -- AW-XXXXXXXXXX
  google_ads_conversion_label TEXT, -- Label específico para conversão
  
  -- Configurações gerais
  is_active BOOLEAN NOT NULL DEFAULT true,
  tracking_enabled_pages JSONB DEFAULT '["product_page", "checkout", "thank_you"]'::jsonb,
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  UNIQUE(product_id), -- Um produto só pode ter uma configuração de tracking
  
  -- Validações
  CONSTRAINT valid_meta_pixel CHECK (meta_pixel_id IS NULL OR length(meta_pixel_id) > 0),
  CONSTRAINT valid_tiktok_pixel CHECK (tiktok_pixel_id IS NULL OR length(tiktok_pixel_id) > 0),
  CONSTRAINT valid_google_ads CHECK (google_ads_conversion_id IS NULL OR length(google_ads_conversion_id) > 0)
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX idx_producer_tracking_producer ON public.producer_tracking(producer_id);
CREATE INDEX idx_producer_tracking_product ON public.producer_tracking(product_id);
CREATE INDEX idx_producer_tracking_active ON public.producer_tracking(is_active) WHERE is_active = true;

-- =====================================================
-- TRIGGER: Atualizar updated_at automaticamente
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_producer_tracking_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_producer_tracking_timestamp
  BEFORE UPDATE ON public.producer_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_producer_tracking_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.producer_tracking ENABLE ROW LEVEL SECURITY;

-- Produtores podem ver apenas suas próprias configurações
CREATE POLICY "Produtores podem ver suas próprias configs de tracking"
  ON public.producer_tracking
  FOR SELECT
  TO authenticated
  USING (producer_id = auth.uid());

-- Produtores podem inserir configs apenas para seus próprios produtos
CREATE POLICY "Produtores podem criar configs para seus produtos"
  ON public.producer_tracking
  FOR INSERT
  TO authenticated
  WITH CHECK (
    producer_id = auth.uid() 
    AND product_id IN (
      SELECT id FROM public.products WHERE producer_id = auth.uid()
    )
  );

-- Produtores podem atualizar apenas suas próprias configs
CREATE POLICY "Produtores podem atualizar suas próprias configs"
  ON public.producer_tracking
  FOR UPDATE
  TO authenticated
  USING (producer_id = auth.uid())
  WITH CHECK (producer_id = auth.uid());

-- Produtores podem deletar apenas suas próprias configs
CREATE POLICY "Produtores podem deletar suas próprias configs"
  ON public.producer_tracking
  FOR DELETE
  TO authenticated
  USING (producer_id = auth.uid());

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE public.producer_tracking IS 'Configurações de pixels de rastreamento por produto';
COMMENT ON COLUMN public.producer_tracking.meta_access_token IS 'Token de acesso para Meta Conversions API (CAPI) - uso futuro';
COMMENT ON COLUMN public.producer_tracking.tiktok_access_token IS 'Token de acesso para TikTok Events API - uso futuro';
COMMENT ON COLUMN public.producer_tracking.tracking_enabled_pages IS 'Páginas onde o rastreamento está ativo: product_page, checkout, thank_you';