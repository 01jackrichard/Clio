-- Clio Migration: 20261019000001_add_institution_discovery_schema.sql
-- Description: Adds institution column to documents and collections, creates institutions reference table,
--              and establishes verified indices for multi-institution academic discovery.
-- Idempotent and safe to run in Supabase SQL Editor.

-- 1. INSTITUTIONS TABLE
CREATE TABLE IF NOT EXISTS public.institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  domain TEXT,
  description TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed core institutions if not existing
INSERT INTO public.institutions (code, name, short_name, domain, description)
VALUES 
  ('PRIMARY', 'Your College or University Name', 'College', 'yourcollege.edu', 'Primary campus repository and academic folios'),
  ('ANNA_UNIV', 'Anna University (Affiliated Colleges)', 'Anna Univ', 'annauniv.edu', 'Official Tamil Nadu State Technical University CBCS Curriculum')
ON CONFLICT (code) DO NOTHING;

-- 2. ALTER DOCUMENTS TABLE
ALTER TABLE public.documents 
  ADD COLUMN IF NOT EXISTS institution TEXT;

CREATE INDEX IF NOT EXISTS idx_documents_institution ON public.documents(institution);

-- 3. ALTER COLLECTIONS TABLE
ALTER TABLE public.collections 
  ADD COLUMN IF NOT EXISTS institution TEXT;

CREATE INDEX IF NOT EXISTS idx_collections_institution ON public.collections(institution);

-- 4. BACKFILL EXISTING RECORDS
UPDATE public.documents 
  SET institution = 'Your College or University Name' 
  WHERE institution IS NULL;

UPDATE public.collections 
  SET institution = 'Your College or University Name' 
  WHERE institution IS NULL;
