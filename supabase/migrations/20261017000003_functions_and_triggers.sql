-- Clio: Migration 20261017000003 - Functions and Triggers

-- 1. Automatic updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach updated_at triggers
DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_documents_updated_at ON public.documents;
CREATE TRIGGER trigger_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_reports_updated_at ON public.reports;
CREATE TRIGGER trigger_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 2. New User Registration Trigger
-- Automatically creates a profile when a new user signs up via Supabase Auth
-- Critical Security Invariant: Role is strictly forced to 'student' regardless of raw metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_display_name TEXT;
  v_department TEXT;
  v_academic_year TEXT;
BEGIN
  v_display_name := coalesce(
    NEW.raw_user_meta_data->>'display_name',
    split_part(NEW.email, '@', 1)
  );
  v_department := NEW.raw_user_meta_data->>'department';
  v_academic_year := NEW.raw_user_meta_data->>'academic_year';

  INSERT INTO public.profiles (
    id,
    email,
    display_name,
    department,
    academic_year,
    role,
    status
  ) VALUES (
    NEW.id,
    NEW.email,
    v_display_name,
    v_department,
    v_academic_year,
    'student'::user_role, -- Invariant: Always 'student' on signup
    'active'::user_status
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Helper to verify admin role securely in RLS policies without recursive queries
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin' AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4. Atomic document download counter increment
CREATE OR REPLACE FUNCTION public.increment_document_download(doc_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.documents
  SET download_count = download_count + 1
  WHERE id = doc_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
