
ALTER TABLE public.products
ADD COLUMN show_order_summary BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN donation_title TEXT,
ADD COLUMN donation_description TEXT,
ADD COLUMN checkout_image_url TEXT,
ADD COLUMN checkout_background_color TEXT;

COMMENT ON COLUMN public.products.show_order_summary IS 'Controla se o resumo do pedido é exibido no checkout.';
COMMENT ON COLUMN public.products.donation_title IS 'Título personalizado para a seção de doação.';
COMMENT ON COLUMN public.products.donation_description IS 'Descrição personalizada para a seção de doação.';
COMMENT ON COLUMN public.products.checkout_image_url IS 'URL da imagem a ser exibida no topo do checkout.';
COMMENT ON COLUMN public.products.checkout_background_color IS 'Cor de fundo da página de checkout (formato HEX, ex: #F3F4F6).';
