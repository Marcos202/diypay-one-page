-- 1. Criar uma função helper para verificar se o usuário é admin.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT role
    FROM public.profiles
    WHERE id = auth.uid()
  ) = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Create the pages table
CREATE TABLE public.pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    content text,
    category text,
    tags text[],
    featured_image_url text,
    status text DEFAULT 'draft'::text NOT NULL,
    CONSTRAINT pages_pkey PRIMARY KEY (id),
    CONSTRAINT pages_slug_key UNIQUE (slug)
);


-- 3. Enable Row-Level Security on the new table
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;


-- 4. Create the CORRECTED RLS policies using the helper function
-- Admins can do anything
CREATE POLICY "Allow admins full access" ON public.pages FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Allow public read access for published pages
CREATE POLICY "Allow public read access for published pages" ON public.pages FOR SELECT
TO anon, authenticated
USING (status = 'published'::text);