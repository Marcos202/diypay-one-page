-- Renomeia a tabela principal
ALTER TABLE public.clubs RENAME TO spaces;

-- Renomeia a tabela de conexão
ALTER TABLE public.club_products RENAME TO space_products;

-- Renomeia a coluna de referência
ALTER TABLE public.space_products RENAME COLUMN club_id TO space_id;

-- Renomeia as constraints e policies para consistência
ALTER POLICY "Producers can manage their own clubs" ON public.spaces RENAME TO "Producers can manage their own spaces";
ALTER POLICY "Public can view clubs" ON public.spaces RENAME TO "Public can view spaces";
ALTER POLICY "Club owners can manage their club products" ON public.space_products RENAME TO "Space owners can manage their space products";
ALTER POLICY "Public can view club products" ON public.space_products RENAME TO "Public can view space products";

-- Renomeia os índices
ALTER INDEX idx_clubs_producer_id RENAME TO idx_spaces_producer_id;
ALTER INDEX idx_clubs_slug RENAME TO idx_spaces_slug;
ALTER INDEX idx_club_products_club_id RENAME TO idx_space_products_space_id;
ALTER INDEX idx_club_products_product_id RENAME TO idx_space_products_product_id;

-- Renomeia o trigger
ALTER TRIGGER update_clubs_updated_at ON public.spaces RENAME TO update_spaces_updated_at;