-- Migration: 20261018024507_fix_handle_new_user_enum_resolution.sql
-- Description: Corrective migration applied to live Supabase project. Sets search_path = '' and fully qualifies all referenced database objects.

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
    'student'::public.user_role,
    'active'::public.user_status
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
