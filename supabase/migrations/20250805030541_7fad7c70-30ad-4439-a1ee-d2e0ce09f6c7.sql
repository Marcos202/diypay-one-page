-- 1. Criar a nova tabela 'cohorts'
CREATE TABLE public.cohorts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ativar RLS
ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;

-- Policies para cohorts
CREATE POLICY "Produtores podem gerenciar suas próprias turmas" 
ON public.cohorts FOR ALL 
USING (space_id IN (SELECT id FROM public.spaces WHERE producer_id = auth.uid()));

-- 2. Adicionar a coluna 'cohort_id' à tabela 'enrollments'
ALTER TABLE public.enrollments
ADD COLUMN cohort_id UUID REFERENCES public.cohorts(id) ON DELETE SET NULL;