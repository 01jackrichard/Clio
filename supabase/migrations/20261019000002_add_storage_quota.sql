-- ============================================================================
-- CLIO PRIVATE STORAGE QUOTA SCHEMA & PERFORMANCE INDEXES
-- Migration: 20261019000002_add_storage_quota.sql
-- Enforces a 50 GB per-user limit on successfully stored private files.
-- Local migration preparation only; do NOT apply to production database directly.
-- ============================================================================

-- 1. Performance index for instant private storage quota aggregation
CREATE INDEX IF NOT EXISTS idx_documents_uploader_private_size
ON public.documents (uploader_id, file_size)
WHERE visibility = 'private' AND status != 'rejected';

-- 2. Helper function to compute authoritative private storage consumed by user
CREATE OR REPLACE FUNCTION public.get_user_private_storage_bytes(p_user_id UUID)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(SUM(file_size), 0)::BIGINT
  FROM public.documents
  WHERE uploader_id = p_user_id
    AND visibility = 'private'
    AND status != 'rejected';
$$;

-- 3. Document the authoritative storage limits
COMMENT ON FUNCTION public.get_user_private_storage_bytes(UUID) IS 
'Computes total bytes stored by a user in private documents against the 50,000,000,000 bytes (50 GB) quota.';
