-- Clio Migration: 20261018040001_add_collections_visibility_and_subjects.sql
-- Description: Adds collections table, public/private visibility with password hash,
--              backfills existing documents, and configures Anna University subject code & regulation tracking.
-- Idempotent and safe to run in Supabase SQL Editor.

-- 1. COLLECTIONS TABLE
CREATE TABLE IF NOT EXISTS public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  department TEXT,
  regulation TEXT DEFAULT '2021',
  academic_year TEXT,
  semester TEXT,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  password_hash TEXT,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ensure columns exist if table was partially created
ALTER TABLE public.collections 
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Sync user_id and owner_id for full compatibility
UPDATE public.collections SET user_id = owner_id WHERE user_id IS NULL AND owner_id IS NOT NULL;
UPDATE public.collections SET owner_id = user_id WHERE owner_id IS NULL AND user_id IS NOT NULL;

-- 2. ALTER DOCUMENTS TABLE
ALTER TABLE public.documents 
  ADD COLUMN IF NOT EXISTS subject_code TEXT,
  ADD COLUMN IF NOT EXISTS regulation TEXT DEFAULT '2021',
  ADD COLUMN IF NOT EXISTS is_verified_subject BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES public.collections(id) ON DELETE SET NULL;

-- 3. BACKFILL EXISTING DOCUMENTS (ENSURE BACKWARD COMPATIBILITY)
UPDATE public.documents 
  SET visibility = 'public' 
  WHERE visibility IS NULL;

UPDATE public.documents 
  SET regulation = '2021' 
  WHERE regulation IS NULL;

UPDATE public.documents 
  SET is_verified_subject = true 
  WHERE is_verified_subject IS NULL;

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_documents_visibility ON public.documents(visibility);
CREATE INDEX IF NOT EXISTS idx_documents_subject_code ON public.documents(subject_code);
CREATE INDEX IF NOT EXISTS idx_documents_collection_id ON public.documents(collection_id);
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON public.collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collections_slug ON public.collections(slug);
CREATE INDEX IF NOT EXISTS idx_collections_visibility ON public.collections(visibility);

-- 5. UPDATE DOCUMENTS RLS FOR PRIVACY ENFORCEMENT
-- Ensure private documents cannot be read by unauthorized users via direct Supabase client queries
DROP POLICY IF EXISTS "Approved documents are viewable by authenticated users" ON public.documents;
CREATE POLICY "Approved documents are viewable by authenticated users"
  ON public.documents FOR SELECT
  TO authenticated
  USING (
    (status = 'approved' AND (visibility = 'public' OR visibility IS NULL))
    OR uploader_id = auth.uid()
    OR public.is_admin(auth.uid())
  );

-- 6. ROW LEVEL SECURITY FOR COLLECTIONS
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public collections are viewable by authenticated users" ON public.collections;
CREATE POLICY "Public collections are viewable by authenticated users"
  ON public.collections FOR SELECT
  TO authenticated
  USING (
    visibility = 'public' OR
    user_id = auth.uid() OR
    owner_id = auth.uid() OR
    public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Authenticated users can create collections" ON public.collections;
CREATE POLICY "Authenticated users can create collections"
  ON public.collections FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can update their own collections" ON public.collections;
CREATE POLICY "Owners can update their own collections"
  ON public.collections FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR owner_id = auth.uid())
  WITH CHECK (user_id = auth.uid() OR owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners and admins can delete collections" ON public.collections;
CREATE POLICY "Owners and admins can delete collections"
  ON public.collections FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR owner_id = auth.uid() OR public.is_admin(auth.uid()));
