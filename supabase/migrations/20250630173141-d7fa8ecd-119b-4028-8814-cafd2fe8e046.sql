
DO $$
BEGIN
    -- Renomeia a coluna iugu_invoice_id para gateway_transaction_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='iugu_invoice_id') THEN
        ALTER TABLE public.sales RENAME COLUMN iugu_invoice_id TO gateway_transaction_id;
    END IF;

    -- Renomeia a coluna iugu_status para gateway_status
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='iugu_status') THEN
        ALTER TABLE public.sales RENAME COLUMN iugu_status TO gateway_status;
    END IF;

    -- Renomeia a coluna iugu_invoice_secure_url para gateway_payment_url
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='iugu_invoice_secure_url') THEN
        ALTER TABLE public.sales RENAME COLUMN iugu_invoice_secure_url TO gateway_payment_url;
    END IF;

    -- Renomeia a coluna iugu_pix_qr_code_text para gateway_pix_qrcode_text
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='iugu_pix_qr_code_text') THEN
        ALTER TABLE public.sales RENAME COLUMN iugu_pix_qr_code_text TO gateway_pix_qrcode_text;
    END IF;

    -- Renomeia a coluna iugu_pix_qr_code_base64 para gateway_pix_qrcode_base64
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='iugu_pix_qr_code_base64') THEN
        ALTER TABLE public.sales RENAME COLUMN iugu_pix_qr_code_base64 TO gateway_pix_qrcode_base64;
    END IF;

    -- Renomeia a coluna iugu_bank_slip_barcode para gateway_bank_slip_barcode
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='iugu_bank_slip_barcode') THEN
        ALTER TABLE public.sales RENAME COLUMN iugu_bank_slip_barcode TO gateway_bank_slip_barcode;
    END IF;

    -- Adiciona a coluna para identificar o gateway, caso não exista
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='gateway_identifier') THEN
        ALTER TABLE public.sales ADD COLUMN gateway_identifier TEXT;
    END IF;
END $$;

-- Adicionar comentários para documentar as mudanças
COMMENT ON COLUMN public.sales.gateway_transaction_id IS 'ID da transação no gateway de pagamento (Iugu, Asaas, etc.)';
COMMENT ON COLUMN public.sales.gateway_status IS 'Status da transação no gateway de pagamento';
COMMENT ON COLUMN public.sales.gateway_payment_url IS 'URL segura para visualizar a cobrança no gateway';
COMMENT ON COLUMN public.sales.gateway_pix_qrcode_text IS 'Texto do QR Code PIX para pagamento';
COMMENT ON COLUMN public.sales.gateway_pix_qrcode_base64 IS 'Imagem do QR Code PIX em base64';
COMMENT ON COLUMN public.sales.gateway_bank_slip_barcode IS 'Código de barras do boleto bancário';
COMMENT ON COLUMN public.sales.gateway_identifier IS 'Identificador do gateway usado (iugu, asaas, stripe, etc.)';
