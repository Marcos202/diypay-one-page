-- Adiciona colunas para Drip Content e Anexos
ALTER TABLE public.lessons
ADD COLUMN release_type TEXT NOT NULL DEFAULT 'immediate', -- 'immediate', 'days', 'date'
ADD COLUMN release_days INTEGER,
ADD COLUMN release_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN is_free_sample BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN attachments JSONB; -- Para armazenar um array de objetos de anexo

-- Adiciona verificação de consistência
ALTER TABLE public.lessons
ADD CONSTRAINT release_type_check CHECK (release_type IN ('immediate', 'days', 'date'));