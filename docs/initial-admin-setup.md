# Clio — Initial Administrator Setup Guide

This guide describes how to provision the first administrator account for Clio.

## Security Architecture & Invariants

To maintain institutional integrity and protect academic documents, Clio enforces strict Row Level Security (RLS) and database constraints:

1. **No Public Escalation Endpoints:** There is deliberately no public API endpoint, URL parameter, or form input that allows promoting an account to administrator.
2. **Default Student Role:** The database trigger `handle_new_user()` strictly sets `role = 'student'` and `status = 'active'` for all new registrations, ignoring any client-provided metadata.
3. **Explicit Manual Provisioning:** The initial administrator must be granted privileges directly by an authorized database administrator using the Supabase SQL Editor or direct PostgreSQL connection.

---

## Step-by-Step Provisioning Procedure

### Step 1: Register the User Account
1. Ensure your local or production Clio instance is running and connected to Supabase.
2. Navigate to the registration page:
   - Local: `http://localhost:3000/auth/register`
   - Production: `https://your-domain.com/auth/register`
3. Complete registration using your institutional or designated administrator email address (e.g. `admin@yourcollege.edu`).
4. If email confirmation is enabled in your Supabase Auth settings, confirm the account via the verification email sent to that address.

### Step 2: Elevate to Administrator via Supabase SQL Editor
1. Log in to the [Supabase Dashboard](https://supabase.com/dashboard).
2. Open your Clio project.
3. In the left navigation menu, click **SQL Editor**.
4. Create a new query and paste the following parameterized snippet:

```sql
DO $$
DECLARE
  v_admin_email TEXT := 'admin@yourcollege.edu'; -- REPLACE with the exact registered administrator email
  v_user_id UUID;
BEGIN
  -- 1. Locate user in Supabase auth schema
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = LOWER(TRIM(v_admin_email));

  -- 2. Verify account exists before attempting role elevation
  IF v_user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET role = 'admin',
        updated_at = timezone('utc'::text, now())
    WHERE id = v_user_id;

    RAISE NOTICE 'Success: User % (%) has been granted administrator role.', v_admin_email, v_user_id;
  ELSE
    RAISE EXCEPTION 'User "%" was not found in auth.users. Please register the account before running this script.', v_admin_email;
  END IF;
END $$;
```

5. Replace `'admin@yourcollege.edu'` with your registered email address.
6. Click **Run**.
7. Confirm that the output console displays:
   `Success: User <your-email> (<uuid>) has been granted administrator role.`

---

## Step 3: Verify Administrative Access

1. Return to the Clio application in your browser.
2. If already logged in, log out and sign back in to refresh your session claims.
3. Navigate to the moderation panel at:
   `http://localhost:3000/admin`
4. Verify that you can access:
   - Moderation queue (`/admin/moderation`)
   - Reports triage (`/admin/reports`)
   - User directory (`/admin/users`)

---

## Administrative Capabilities & Responsibilities

Once provisioned as an administrator, your account has authorization to:
- Review and approve pending student PDF uploads.
- Reject submissions with feedback to the uploader.
- Inspect, resolve, or dismiss content and abuse reports.
- View system-wide download telemetry and audit logs.
- Suspend accounts that violate institutional sharing policies.
