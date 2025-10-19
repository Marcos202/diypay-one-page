-- CORREÇÃO 6: Remover campo max_quantity_per_purchase da tabela ticket_batches

-- Verificar se o campo existe antes de tentar remover
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'ticket_batches' 
      AND column_name = 'max_quantity_per_purchase'
  ) THEN
    -- Remover a coluna
    ALTER TABLE public.ticket_batches 
    DROP COLUMN max_quantity_per_purchase;
    
    RAISE NOTICE 'Coluna max_quantity_per_purchase removida com sucesso';
  ELSE
    RAISE NOTICE 'Coluna max_quantity_per_purchase não existe, nenhuma ação necessária';
  END IF;
END $$;