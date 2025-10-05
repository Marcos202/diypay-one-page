-- Fix critical security issue: Enable RLS on storage.objects
-- The storage.objects table needs RLS enabled for our policies to work

-- Enable RLS on storage.objects (this is safe as Supabase manages this table)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;