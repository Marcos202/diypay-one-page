-- ETAPA 1: Modificar a Tabela `profiles` para suporte ao KYC/KYB

-- Adicionar uma coluna para o status de verificação do perfil
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'pending_submission'; -- (pending_submission, pending_approval, approved, rejected)

-- Adicionar coluna para o tipo de pessoa (física ou jurídica)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS person_type TEXT; -- ('PF' para Pessoa Física, 'PJ' para Pessoa Jurídica)

-- Campos para Pessoa Física (PF)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date DATE;

-- Campos para Pessoa Jurídica (PJ)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cnpj TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_name TEXT; -- Razão Social
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trading_name TEXT; -- Nome Fantasia
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS opening_date DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_phone TEXT;

-- Campos para o responsável da PJ
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS responsible_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS responsible_cpf TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS responsible_birth_date DATE;

-- Campos para armazenar as URLs dos arquivos de documentos
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS document_front_url TEXT; -- ID frente (PF) ou Doc do Responsável (PJ)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS document_back_url TEXT; -- ID verso (PF)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS selfie_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS social_contract_url TEXT; -- Contrato Social (PJ)

-- ETAPA 2: Configurar o Supabase Storage
-- Criar bucket privado para documentos de verificação
INSERT INTO storage.buckets (id, name, public) 
VALUES ('verification-documents', 'verification-documents', false);

-- Política para usuários autenticados fazerem upload de seus próprios documentos
CREATE POLICY "Users can upload their own verification documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'verification-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para usuários visualizarem seus próprios documentos
CREATE POLICY "Users can view their own verification documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'verification-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para usuários atualizarem seus próprios documentos
CREATE POLICY "Users can update their own verification documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'verification-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para usuários deletarem seus próprios documentos
CREATE POLICY "Users can delete their own verification documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'verification-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para admins visualizarem todos os documentos
CREATE POLICY "Admins can view all verification documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'verification-documents' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Política para admins baixarem todos os documentos
CREATE POLICY "Admins can download all verification documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'verification-documents' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);