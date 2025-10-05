
-- Remove the foreign key constraint from profiles.id to allow guest buyers
-- This allows creating profiles for buyers who don't have auth.users accounts
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Verify that profiles.id remains as PRIMARY KEY and NOT NULL
-- (These should already be in place, but confirming the structure)
-- The profiles.id column will continue to be populated with:
-- - auth.uid() for authenticated users
-- - crypto.randomUUID() for guest buyers
