-- Criação da estrutura completa para Área de Membros (versão corrigida)

-- 1. Tabela clubs (As Áreas de Membros)
CREATE TABLE public.clubs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    producer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Tabela club_products (A Vitrine de Produtos do Club)
CREATE TABLE public.club_products (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    product_type TEXT NOT NULL CHECK (product_type IN ('principal', 'bonus', 'locked')),
    container_title TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(club_id, product_id)
);

-- 3. Tabela modules (Módulos dos Cursos)
CREATE TABLE public.modules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Tabela lessons (Aulas dos Módulos)
CREATE TABLE public.lessons (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('video', 'pdf', 'text', 'audio')),
    content_url TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Tabela enrollments (Matrículas dos Alunos)
CREATE TABLE public.enrollments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, product_id)
);

-- 6. Tabela lesson_progress (Progresso dos Alunos)
CREATE TABLE public.lesson_progress (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, lesson_id)
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies para clubs
CREATE POLICY "Producers can manage their own clubs" 
ON public.clubs 
FOR ALL 
USING (producer_id = auth.uid())
WITH CHECK (producer_id = auth.uid());

CREATE POLICY "Public can view clubs" 
ON public.clubs 
FOR SELECT 
USING (true);

-- RLS Policies para club_products
CREATE POLICY "Club owners can manage their club products" 
ON public.club_products 
FOR ALL 
USING (club_id IN (SELECT id FROM public.clubs WHERE producer_id = auth.uid()))
WITH CHECK (club_id IN (SELECT id FROM public.clubs WHERE producer_id = auth.uid()));

CREATE POLICY "Public can view club products" 
ON public.club_products 
FOR SELECT 
USING (true);

-- RLS Policies para enrollments (criar primeiro pois é referenciado em outras policies)
CREATE POLICY "Users can view their own enrollments" 
ON public.enrollments 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Product owners can view enrollments for their products" 
ON public.enrollments 
FOR SELECT 
USING (product_id IN (SELECT id FROM public.products WHERE producer_id = auth.uid()));

CREATE POLICY "System can insert enrollments" 
ON public.enrollments 
FOR INSERT 
WITH CHECK (true);

-- RLS Policies para modules
CREATE POLICY "Product owners can manage their modules" 
ON public.modules 
FOR ALL 
USING (product_id IN (SELECT id FROM public.products WHERE producer_id = auth.uid()))
WITH CHECK (product_id IN (SELECT id FROM public.products WHERE producer_id = auth.uid()));

CREATE POLICY "Enrolled users can view modules" 
ON public.modules 
FOR SELECT 
USING (product_id IN (SELECT product_id FROM public.enrollments WHERE user_id = auth.uid()));

-- RLS Policies para lessons
CREATE POLICY "Module owners can manage their lessons" 
ON public.lessons 
FOR ALL 
USING (module_id IN (
    SELECT m.id FROM public.modules m 
    JOIN public.products p ON m.product_id = p.id 
    WHERE p.producer_id = auth.uid()
))
WITH CHECK (module_id IN (
    SELECT m.id FROM public.modules m 
    JOIN public.products p ON m.product_id = p.id 
    WHERE p.producer_id = auth.uid()
));

CREATE POLICY "Enrolled users can view lessons" 
ON public.lessons 
FOR SELECT 
USING (module_id IN (
    SELECT m.id FROM public.modules m 
    JOIN public.enrollments e ON m.product_id = e.product_id 
    WHERE e.user_id = auth.uid()
));

-- RLS Policies para lesson_progress
CREATE POLICY "Users can manage their own lesson progress" 
ON public.lesson_progress 
FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Lesson owners can view progress" 
ON public.lesson_progress 
FOR SELECT 
USING (lesson_id IN (
    SELECT l.id FROM public.lessons l 
    JOIN public.modules m ON l.module_id = m.id 
    JOIN public.products p ON m.product_id = p.id 
    WHERE p.producer_id = auth.uid()
));

-- Índices para melhor performance
CREATE INDEX idx_clubs_producer_id ON public.clubs(producer_id);
CREATE INDEX idx_clubs_slug ON public.clubs(slug);
CREATE INDEX idx_club_products_club_id ON public.club_products(club_id);
CREATE INDEX idx_club_products_product_id ON public.club_products(product_id);
CREATE INDEX idx_modules_product_id ON public.modules(product_id);
CREATE INDEX idx_lessons_module_id ON public.lessons(module_id);
CREATE INDEX idx_enrollments_user_id ON public.enrollments(user_id);
CREATE INDEX idx_enrollments_product_id ON public.enrollments(product_id);
CREATE INDEX idx_lesson_progress_user_id ON public.lesson_progress(user_id);
CREATE INDEX idx_lesson_progress_lesson_id ON public.lesson_progress(lesson_id);

-- Triggers para updated_at automático
CREATE TRIGGER update_clubs_updated_at
BEFORE UPDATE ON public.clubs
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_modules_updated_at
BEFORE UPDATE ON public.modules
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_lessons_updated_at
BEFORE UPDATE ON public.lessons
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_lesson_progress_updated_at
BEFORE UPDATE ON public.lesson_progress
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();