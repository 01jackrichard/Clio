import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NextRequest } from 'next/server';
import { GoogleAuthButton } from '@/components/auth/google-auth-button';
import LoginPage from '@/app/auth/login/page';
import RegisterPage from '@/app/auth/register/page';
import { GET } from '@/app/auth/callback/route';

// Mocks
const mockPush = vi.fn();
const mockRefresh = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock('@/lib/config', () => ({
  config: {
    app: {
      name: 'Clio',
      tagline: 'Knowledge, preserved.',
      description: 'Academic library',
      collegeName: 'Academic Institution',
      collegeShortName: 'College',
      collegeDomain: 'yourcollege.edu',
      url: 'http://localhost:3000',
    },
    auth: {
      registrationMode: 'open',
      allowedDomains: [],
    },
    supabase: {
      url: 'https://test-project.supabase.co',
      publishableKey: 'test-publishable-key',
      secretKey: 'test-secret-key',
    },
  },
}));

// Mock browser client
const mockSignInWithOAuth = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
}));

// Mock server client
const mockExchangeCodeForSession = vi.fn();
const mockProfilesSelect = vi.fn();
const mockProfilesUpsert = vi.fn();
const mockProfilesUpdate = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
    },
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: mockProfilesSelect,
            }),
          }),
          upsert: mockProfilesUpsert,
          update: (data: unknown) => {
            mockProfilesUpdate(data);
            return {
              eq: vi.fn().mockResolvedValue({ error: null }),
            };
          },
        };
      }
      return {};
    },
  }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: mockProfilesSelect,
            }),
          }),
          upsert: mockProfilesUpsert,
          update: (data: unknown) => {
            mockProfilesUpdate(data);
            return {
              eq: vi.fn().mockResolvedValue({ error: null }),
            };
          },
        };
      }
      return {};
    },
  }),
}));

describe('CLIO — Google Sign-In & Onboarding Architecture Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    mockProfilesUpsert.mockResolvedValue({ error: null });
    mockProfilesUpdate.mockResolvedValue({ error: null });
  });

  describe('1. UI Component: GoogleAuthButton', () => {
    it('renders "Continue with Google" button with official styling', () => {
      render(<GoogleAuthButton mode="login" />);

      const button = screen.getByRole('button', { name: /continue with google/i });
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();
    });

    it('initiates OAuth flow with Supabase provider and account selector parameters', async () => {
      mockSignInWithOAuth.mockResolvedValueOnce({ data: { url: 'https://accounts.google.com/o/oauth2' }, error: null });

      render(<GoogleAuthButton mode="login" redirectTo="/favorites" />);

      const button = screen.getByRole('button', { name: /continue with google/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledWith({
          provider: 'google',
          options: expect.objectContaining({
            redirectTo: expect.stringContaining('/auth/callback?next=%2Ffavorites'),
            queryParams: {
              prompt: 'select_account',
              access_type: 'offline',
            },
          }),
        });
      });
    });

    it('displays error and activates onError callback when OAuth initiation fails', async () => {
      const onErrorMock = vi.fn();
      mockSignInWithOAuth.mockResolvedValueOnce({
        data: null,
        error: new Error('Popup blocked or provider unavailable'),
      });

      render(<GoogleAuthButton mode="login" onError={onErrorMock} />);

      const button = screen.getByRole('button', { name: /continue with google/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(onErrorMock).toHaveBeenCalledWith('Popup blocked or provider unavailable');
      });
    });

    it('disables the button and shows loading state while connecting', async () => {
      mockSignInWithOAuth.mockReturnValue(new Promise(() => {})); // pending promise

      render(<GoogleAuthButton mode="login" />);

      const button = screen.getByRole('button', { name: /continue with google/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(button).toBeDisabled();
        expect(screen.getByText(/connecting to google/i)).toBeInTheDocument();
      });
    });
  });

  describe('2. Pages Integration: Login and Register with Google', () => {
    it('renders Google authentication button on LoginPage alongside institutional form', () => {
      render(<LoginPage />);

      expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
      expect(screen.getByText(/or with institutional email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/institutional email/i)).toBeInTheDocument();
    });

    it('renders Google authentication button on RegisterPage alongside registration form', () => {
      render(<RegisterPage />);

      expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
      expect(screen.getByText(/or register with institutional email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/full display name/i)).toBeInTheDocument();
    });

    it('displays error from URL parameter when redirected from failed callback', () => {
      mockSearchParams = new URLSearchParams('error=Google%20authentication%20was%20cancelled.');
      render(<LoginPage />);

      expect(screen.getByRole('alert')).toHaveTextContent(/google authentication was cancelled/i);
    });
  });

  describe('3. Callback Route Handler: app/auth/callback/route.ts', () => {
    it('redirects to /auth/login with error when provider returns access_denied', async () => {
      const req = new NextRequest('http://localhost:3000/auth/callback?error=access_denied');
      const res = await GET(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location') || '';
      expect(location).toContain('/auth/login');
      expect(location).toContain('error=Google+authentication+was+cancelled.');
    });

    it('redirects to /auth/login with error when authorization code is missing', async () => {
      const req = new NextRequest('http://localhost:3000/auth/callback');
      const res = await GET(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location') || '';
      expect(location).toContain('/auth/login');
      expect(location).toContain('No+authorization+code+was+received');
    });

    it('redirects to /auth/login when code exchange fails', async () => {
      mockExchangeCodeForSession.mockResolvedValueOnce({
        data: null,
        error: new Error('Invalid code grant'),
      });

      const req = new NextRequest('http://localhost:3000/auth/callback?code=bad-code');
      const res = await GET(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location') || '';
      expect(location).toContain('/auth/login');
      expect(location).toContain('Failed+to+exchange+authorization+code');
    });

    it('successfully authenticates first-time Google user, provisions safe profile, and redirects to /documents', async () => {
      mockExchangeCodeForSession.mockResolvedValueOnce({
        data: {
          user: {
            id: 'google-user-1',
            email: 'hypatia@gmail.com',
            user_metadata: {
              full_name: 'Hypatia of Alexandria',
              avatar_url: 'https://lh3.googleusercontent.com/photo.jpg',
            },
          },
        },
        error: null,
      });

      // Profile does not exist yet
      mockProfilesSelect.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const req = new NextRequest('http://localhost:3000/auth/callback?code=valid-code');
      const res = await GET(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location') || '';
      expect(location).toBe('http://localhost:3000/documents');

      // Verify safe profile provisioning: role strictly 'student', status 'active'
      expect(mockProfilesUpsert).toHaveBeenCalledWith(
        {
          id: 'google-user-1',
          email: 'hypatia@gmail.com',
          display_name: 'Hypatia of Alexandria',
          role: 'student',
          status: 'active',
        },
        { onConflict: 'id' }
      );
    });

    it('enriches display name when profile currently has raw email username', async () => {
      mockExchangeCodeForSession.mockResolvedValueOnce({
        data: {
          user: {
            id: 'google-user-2',
            email: 'ptolemy@gmail.com',
            user_metadata: {
              name: 'Claudius Ptolemy',
            },
          },
        },
        error: null,
      });

      // Existing profile created by handle_new_user trigger with raw email username
      mockProfilesSelect.mockResolvedValueOnce({
        data: {
          id: 'google-user-2',
          role: 'student',
          status: 'active',
          display_name: 'ptolemy',
          email: 'ptolemy@gmail.com',
        },
        error: null,
      });

      const req = new NextRequest('http://localhost:3000/auth/callback?code=valid-code-2');
      const res = await GET(req);

      expect(res.status).toBe(307);
      expect(mockProfilesUpdate).toHaveBeenCalledWith({ display_name: 'Claudius Ptolemy' });
    });

    it('strictly preserves administrator role and custom display name for returning admin user', async () => {
      mockExchangeCodeForSession.mockResolvedValueOnce({
        data: {
          user: {
            id: 'admin-google-user',
            email: 'admin@college.edu',
            user_metadata: {
              full_name: 'Archivist Admin',
            },
          },
        },
        error: null,
      });

      // Profile is already admin
      mockProfilesSelect.mockResolvedValueOnce({
        data: {
          id: 'admin-google-user',
          role: 'admin',
          status: 'active',
          display_name: 'Archivist Admin',
          email: 'admin@college.edu',
        },
        error: null,
      });

      const req = new NextRequest('http://localhost:3000/auth/callback?code=admin-code');
      const res = await GET(req);

      expect(res.status).toBe(307);
      // No updates since display_name matches and role is preserved
      expect(mockProfilesUpdate).not.toHaveBeenCalled();
      expect(mockProfilesUpsert).not.toHaveBeenCalled();
    });

    it('respects safe relative redirect destination and defends against open redirects', async () => {
      mockExchangeCodeForSession.mockResolvedValue({
        data: {
          user: {
            id: 'user-3',
            email: 'user3@college.edu',
            user_metadata: { full_name: 'Scholar Three' },
          },
        },
        error: null,
      });
      mockProfilesSelect.mockResolvedValue({
        data: { id: 'user-3', display_name: 'Scholar Three', role: 'student', status: 'active' },
        error: null,
      });

      // 1. Safe relative destination
      const safeReq = new NextRequest('http://localhost:3000/auth/callback?code=code-1&next=%2Fmy-submissions');
      const safeRes = await GET(safeReq);
      expect(safeRes.headers.get('location')).toBe('http://localhost:3000/my-submissions');

      // 2. Open redirect attempt to external URL
      const evilReq = new NextRequest('http://localhost:3000/auth/callback?code=code-2&next=https%3A%2F%2Fevil.com');
      const evilRes = await GET(evilReq);
      // Falls back to safe /documents
      expect(evilRes.headers.get('location')).toBe('http://localhost:3000/documents');

      // 3. Protocol-relative open redirect attempt
      const protoReq = new NextRequest('http://localhost:3000/auth/callback?code=code-3&next=%2F%2Fevil.com');
      const protoRes = await GET(protoReq);
      expect(protoRes.headers.get('location')).toBe('http://localhost:3000/documents');
    });
  });
});
