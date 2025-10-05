
-- Adiciona a coluna para a frequência na tabela de produtos
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS subscription_frequency TEXT;

-- Adiciona a coluna para o ID da assinatura da Iugu na tabela de vendas
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS iugu_subscription_id TEXT;
