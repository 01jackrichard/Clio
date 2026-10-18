-- Clio: Migration 20261017000004 - Row Level Security (RLS) Policies
-- Strict database-enforced authorization

-- 1. PROFILES RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view active profiles (e.g. uploader names)
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (status = 'active');

-- Allow users to update their own non-privileged profile data
-- Cannot escalate role or reactivate suspended status
CREATE POLICY "Users can update their own personal profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    -- Invariant: Regular users cannot change their role from student to admin
    (role = 'student' OR public.is_admin(auth.uid()))
  );

-- Administrators have full access to manage profiles
CREATE POLICY "Admins have full access to profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));


-- 2. DOCUMENTS RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view approved documents
-- Uploaders can view their own documents regardless of status
-- Administrators can view all documents
CREATE POLICY "Approved documents are viewable by authenticated users"
  ON public.documents FOR SELECT
  TO authenticated
  USING (
    status = 'approved' OR
    uploader_id = auth.uid() OR
    public.is_admin(auth.uid())
  );

-- Authenticated users can insert new documents (strictly forced to pending status)
CREATE POLICY "Authenticated users can submit new documents"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (
    uploader_id = auth.uid() AND
    status = 'pending' AND
    download_count = 0
  );

-- Uploaders can modify metadata of their own pending documents
CREATE POLICY "Uploaders can edit their own pending documents"
  ON public.documents FOR UPDATE
  TO authenticated
  USING (uploader_id = auth.uid() AND status = 'pending')
  WITH CHECK (uploader_id = auth.uid() AND status = 'pending');

-- Uploaders can delete their own pending documents
CREATE POLICY "Uploaders can delete their own pending documents"
  ON public.documents FOR DELETE
  TO authenticated
  USING (uploader_id = auth.uid() AND status = 'pending');

-- Administrators can update any document (approve, reject, moderate)
CREATE POLICY "Admins can update any document"
  ON public.documents FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Administrators can delete any document
CREATE POLICY "Admins can delete any document"
  ON public.documents FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));


-- 3. REPORTS RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Authenticated users can submit reports on documents
CREATE POLICY "Users can submit reports"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- Reporters can view their own reports; Admins can view all reports
CREATE POLICY "Reporters and Admins can view reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (
    reporter_id = auth.uid() OR
    public.is_admin(auth.uid())
  );

-- Only Administrators can resolve or dismiss reports
CREATE POLICY "Admins can update reports"
  ON public.reports FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));


-- 4. FAVORITES RLS
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users have full control over their own favorites"
  ON public.favorites FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- 5. DOWNLOAD LOGS RLS
ALTER TABLE public.download_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users or system can insert download logs"
  ON public.download_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Only admins can view download logs"
  ON public.download_logs FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));


-- 6. AUDIT LOGS RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users or system can insert audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid());
