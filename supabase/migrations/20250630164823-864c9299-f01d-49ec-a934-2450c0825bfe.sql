
-- Renomear colunas específicas da Iugu para torná-las genéricas
ALTER TABLE public.sales RENAME COLUMN iugu_invoice_id TO gateway_transaction_id;
ALTER TABLE public.sales RENAME COLUMN iugu_status TO gateway_status;
ALTER TABLE public.sales RENAME COLUMN iugu_invoice_secure_url TO gateway_payment_url;
ALTER TABLE public.sales RENAME COLUMN iugu_pix_qr_code_text TO gateway_pix_qrcode_text;
ALTER TABLE public.sales RENAME COLUMN iugu_pix_qr_code_base64 TO gateway_pix_qrcode_base64;
ALTER TABLE public.sales RENAME COLUMN iugu_bank_slip_barcode TO gateway_bank_slip_barcode;

-- Adicionar coluna para identificar qual gateway processou a venda
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS gateway_identifier TEXT;

-- Comentários para documentar as mudanças
COMMENT ON COLUMN public.sales.gateway_transaction_id IS 'ID da transação no gateway de pagamento (Iugu, Asaas, etc.)';
COMMENT ON COLUMN public.sales.gateway_status IS 'Status da transação no gateway de pagamento';
COMMENT ON COLUMN public.sales.gateway_payment_url IS 'URL segura para visualizar a cobrança no gateway';
COMMENT ON COLUMN public.sales.gateway_pix_qrcode_text IS 'Texto do QR Code PIX para pagamento';
COMMENT ON COLUMN public.sales.gateway_pix_qrcode_base64 IS 'Imagem do QR Code PIX em base64';
COMMENT ON COLUMN public.sales.gateway_bank_slip_barcode IS 'Código de barras do boleto bancário';
COMMENT ON COLUMN public.sales.gateway_identifier IS 'Identificador do gateway usado (iugu, asaas, stripe, etc.)';
