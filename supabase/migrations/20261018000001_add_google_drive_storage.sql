-- Clio: Migration 20261018000001 - Google Drive Embedded Storage Methodology
-- Adds first-class Google Drive support, canonical drive_file_id, and submitted_drive_url.
-- Preserves legacy R2 document classifications while relaxing constraints for Drive-backed records.

-- 1. Add Google Drive storage columns without immediately backfilling existing rows with default
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS storage_provider TEXT,
  ADD COLUMN IF NOT EXISTS drive_file_id TEXT,
  ADD COLUMN IF NOT EXISTS submitted_drive_url TEXT;

-- 2. Accurately categorize legacy data:
-- Rows with an existing file_key are legacy R2 records and must not be marked as Google Drive
UPDATE public.documents
  SET storage_provider = 'r2'
  WHERE file_key IS NOT NULL AND storage_provider IS NULL;

-- Future rows default to 'google_drive'
ALTER TABLE public.documents
  ALTER COLUMN storage_provider SET DEFAULT 'google_drive';

-- Any newly created rows without file_key default to 'google_drive'
UPDATE public.documents
  SET storage_provider = 'google_drive'
  WHERE storage_provider IS NULL;

ALTER TABLE public.documents
  ALTER COLUMN storage_provider SET NOT NULL;

-- 3. Enforce valid storage provider values
ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_storage_provider_check;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_storage_provider_check
  CHECK (storage_provider IN ('google_drive', 'r2'));

-- 4. Relax R2-specific NOT NULL constraints
ALTER TABLE public.documents
  ALTER COLUMN file_key DROP NOT NULL,
  ALTER COLUMN file_size DROP NOT NULL,
  ALTER COLUMN file_size SET DEFAULT 0;

-- 5. Relax file_size constraint to allow 0 or NULL for manually registered Drive files
ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_file_size_check;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_file_size_check
  CHECK (file_size IS NULL OR file_size >= 0);

-- 6. Unique partial index to prevent registering duplicate canonical Drive files
CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_drive_file_id
  ON public.documents (drive_file_id)
  WHERE drive_file_id IS NOT NULL;

-- 7. Index for storage provider queries
CREATE INDEX IF NOT EXISTS idx_documents_storage_provider
  ON public.documents (storage_provider);
