
-- Adicionar coluna para armazenar o ID da assinatura da Iugu
ALTER TABLE public.sales ADD COLUMN iugu_subscription_id text;

-- Adicionar comentário para documentar o campo
COMMENT ON COLUMN public.sales.iugu_subscription_id IS 'ID da assinatura criada na Iugu para produtos do tipo subscription';
