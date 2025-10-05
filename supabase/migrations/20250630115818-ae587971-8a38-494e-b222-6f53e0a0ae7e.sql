
-- ETAPA 1: Criar a tabela `payment_gateways`.
-- Esta tabela será o centro de controle para todos os provedores de pagamento.
CREATE TABLE IF NOT EXISTS public.payment_gateways (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway_name TEXT NOT NULL, -- Nome amigável, ex: "Mercado Pago"
    gateway_identifier TEXT NOT NULL UNIQUE, -- Identificador único para o código, ex: "mercadopago"
    is_active BOOLEAN NOT NULL DEFAULT false, -- Flag para ativar ou desativar o gateway
    credentials JSONB, -- Campo para armazenar as chaves de API de forma segura
    priority INTEGER NOT NULL DEFAULT 0, -- Prioridade de uso (0 = menor prioridade)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.payment_gateways IS 'Armazena as configurações e credenciais dos gateways de pagamento.';
COMMENT ON COLUMN public.payment_gateways.credentials IS 'As chaves e tokens de API. Idealmente, devem ser criptografados.';

-- ETAPA 2: Inserir os gateways suportados com configurações iniciais.
-- Eles serão inseridos como inativos por padrão. O administrador irá ativá-los e preencher as credenciais no painel.
-- Usamos ON CONFLICT para garantir que o script não falhe se for executado mais de uma vez.

INSERT INTO public.payment_gateways (gateway_name, gateway_identifier, is_active, credentials)
VALUES
    ('Iugu', 'iugu', false, '{"api_key": "", "account_id": ""}'),
    ('Asaas', 'asaas', false, '{"api_key": ""}'),
    ('Stripe', 'stripe', false, '{"publishable_key": "", "secret_key": ""}'),
    ('Mercado Pago', 'mercadopago', false, '{"public_key": "", "access_token": ""}')
ON CONFLICT (gateway_identifier) DO NOTHING;
