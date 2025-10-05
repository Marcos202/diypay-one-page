-- Ação 1: Criar a Tabela de Progresso (lesson_progress)
CREATE TABLE public.lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    lesson_id UUID NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Garante que não haja entradas duplicadas para o mesmo aluno na mesma aula
    CONSTRAINT unique_user_lesson UNIQUE (user_id, lesson_id)
);

-- Adiciona comentários para clareza
COMMENT ON TABLE public.lesson_progress IS 'Registra o status de conclusão de cada aula para cada aluno.';
COMMENT ON COLUMN public.lesson_progress.user_id IS 'Link para o usuário/aluno';
COMMENT ON COLUMN public.lesson_progress.lesson_id IS 'Link para a aula específica (lessons.id)';

-- Ação 2: Habilitar Row-Level Security (RLS) e Criar Políticas para lesson_progress
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários vejam e gerenciem seu próprio progresso
CREATE POLICY "Users can manage their own lesson progress"
ON public.lesson_progress FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Política para permitir que donos de lessons vejam o progresso
CREATE POLICY "Lesson owners can view progress"
ON public.lesson_progress FOR SELECT
USING (
    lesson_id IN (
        SELECT l.id 
        FROM lessons l 
        JOIN modules m ON l.module_id = m.id 
        JOIN products p ON m.product_id = p.id 
        WHERE p.producer_id = auth.uid()
    )
);

-- Ação 3: Criar um Gatilho (Trigger) para Atualizar updated_at
-- A função handle_updated_at já existe, então só criamos o gatilho
CREATE TRIGGER on_lesson_progress_updated
BEFORE UPDATE ON public.lesson_progress
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Ação 4: Adicionar Colunas de Personalização à Tabela spaces
ALTER TABLE public.spaces
ADD COLUMN banner_image_url TEXT,
ADD COLUMN background_color TEXT;

-- Adiciona comentários para clareza
COMMENT ON COLUMN public.spaces.banner_image_url IS 'URL da imagem de banner para o hub da área de membros.';
COMMENT ON COLUMN public.spaces.background_color IS 'Cor de fundo (ex: #FFFFFF) para o hub da área de membros.';