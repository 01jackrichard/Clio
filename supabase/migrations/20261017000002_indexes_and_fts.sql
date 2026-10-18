-- Clio: Migration 20261017000002 - Indexes and Full-Text Search
-- Optimizes search, filtering, and pagination

-- 1. Safely typed immutable helper for text[] array-to-string conversion.
-- PostgreSQL's built-in array_to_string(anyarray, text) is marked STABLE because generic
-- polymorphic types may depend on session LC_CTYPE or type I/O conversions.
-- For a concrete text[] array, joining text elements with a text delimiter is strictly
-- deterministic and immutable, making it safe for generated columns without altering pg_proc.
CREATE OR REPLACE FUNCTION public.immutable_array_to_string(arr TEXT[], delimiter TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT array_to_string(arr, delimiter);
$$;

-- 2. Add generated full-text search column to documents
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS fts tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('english'::regconfig, coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english'::regconfig, coalesce(subject, '')), 'B') ||
  setweight(to_tsvector('english'::regconfig, coalesce(description, '')), 'C') ||
  setweight(to_tsvector('english'::regconfig, coalesce(public.immutable_array_to_string(tags, ' '), '')), 'D')
) STORED;

-- Full-text search GIN index
CREATE INDEX IF NOT EXISTS idx_documents_fts ON public.documents USING GIN (fts);

-- Query filter indexes
CREATE INDEX IF NOT EXISTS idx_documents_status_created ON public.documents (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_department ON public.documents (department);
CREATE INDEX IF NOT EXISTS idx_documents_semester ON public.documents (semester);
CREATE INDEX IF NOT EXISTS idx_documents_subject ON public.documents (subject);
CREATE INDEX IF NOT EXISTS idx_documents_material_type ON public.documents (material_type);
CREATE INDEX IF NOT EXISTS idx_documents_uploader ON public.documents (uploader_id);
CREATE INDEX IF NOT EXISTS idx_documents_download_count ON public.documents (download_count DESC);

-- Composite index for the main library query
CREATE INDEX IF NOT EXISTS idx_documents_library_composite 
ON public.documents (status, department, semester, material_type, created_at DESC);

-- Favorites and Reports indexes
CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites (user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status_created ON public.reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_document ON public.reports (document_id);
CREATE INDEX IF NOT EXISTS idx_download_logs_doc_time ON public.download_logs (document_id, created_at DESC);
