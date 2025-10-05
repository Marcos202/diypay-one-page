
ALTER TABLE public.products
ADD COLUMN is_email_optional BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.products.is_email_optional IS 'Se true, o email é opcional no checkout e o telefone se torna o contato principal.';
