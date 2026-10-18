import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '@/app/auth/login/page';
import RegisterPage from '@/app/auth/register/page';
import ForgotPasswordPage from '@/app/auth/forgot-password/page';
import ResetPasswordPage from '@/app/auth/reset-password/page';
import UnauthorizedPage from '@/app/unauthorized/page';

// Mock Next.js navigation
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
      url: 'https://valid-test-project.supabase.co',
      publishableKey: 'valid-publishable-key',
      secretKey: 'valid-secret-key',
    },
  },
}));
// Mock Supabase client
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockResetPasswordForEmail = vi.fn();
const mockUpdateUser = vi.fn();
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      resetPasswordForEmail: mockResetPasswordForEmail,
      updateUser: mockUpdateUser,
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchParams = new URLSearchParams();
  mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'test-user' } } } });
  mockOnAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
});

describe('Phase 2 — Authentication & Onboarding Routes', () => {
  describe('LoginPage', () => {
    it('renders editorial branding, tagline, and essential form fields', () => {
      render(<LoginPage />);

      expect(screen.getByRole('heading', { name: /sign in to archive/i })).toBeInTheDocument();
      expect(screen.getByText(/knowledge, preserved/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/institutional email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /authenticate & open library/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /forgot password\?/i })).toHaveAttribute('href', '/auth/forgot-password');
      expect(screen.getByRole('link', { name: /register student account/i })).toHaveAttribute('href', '/auth/register');
    });

    it('toggles password visibility when show/hide button is clicked', () => {
      render(<LoginPage />);

      const passwordInput = screen.getByPlaceholderText('••••••••');
      expect(passwordInput).toHaveAttribute('type', 'password');

      const toggleButton = screen.getByLabelText(/show password/i);
      fireEvent.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');

      fireEvent.click(screen.getByLabelText(/hide password/i));
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('displays error message when login credentials fail', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: null },
        error: new Error('Invalid login credentials'),
      });

      render(<LoginPage />);

      fireEvent.change(screen.getByLabelText(/institutional email/i), {
        target: { value: 'student@example.edu' },
      });
      fireEvent.change(screen.getByPlaceholderText('••••••••'), {
        target: { value: 'wrongpassword' },
      });

      fireEvent.click(screen.getByRole('button', { name: /authenticate & open library/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/invalid email or password/i);
      });
    });

    it('redirects user to destination upon successful login', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: { id: 'scholar-1' } },
        error: null,
      });

      render(<LoginPage />);

      fireEvent.change(screen.getByLabelText(/institutional email/i), {
        target: { value: 'scholar@example.edu' },
      });
      fireEvent.change(screen.getByPlaceholderText('••••••••'), {
        target: { value: 'validPassword123' },
      });

      fireEvent.click(screen.getByRole('button', { name: /authenticate & open library/i }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });
  });

  describe('RegisterPage', () => {
    it('renders registration fields and live password requirement indicators', () => {
      render(<RegisterPage />);

      expect(screen.getByRole('heading', { name: /join the academic archive/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/full display name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/institutional email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/academic department/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/academic standing/i)).toBeInTheDocument();

      // Check live password requirement labels
      expect(screen.getByText('8 or more characters')).toBeInTheDocument();
      expect(screen.getByText('One uppercase letter')).toBeInTheDocument();
      expect(screen.getByText('One lowercase letter')).toBeInTheDocument();
      expect(screen.getByText('One number')).toBeInTheDocument();
    });

    it('blocks submission and displays error when passwords do not match', async () => {
      render(<RegisterPage />);

      fireEvent.change(screen.getByLabelText(/full display name/i), {
        target: { value: 'Hypatia Alexandria' },
      });
      fireEvent.change(screen.getByLabelText(/institutional email/i), {
        target: { value: 'hypatia@college.edu' },
      });
      fireEvent.change(screen.getByLabelText(/^password/i), {
        target: { value: 'Password123' },
      });
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'Mismatch999' },
      });

      fireEvent.click(screen.getByRole('button', { name: /create scholar account/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/passwords do not match/i);
      });
      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it('displays truthful email verification message on successful registration', async () => {
      mockSignUp.mockResolvedValueOnce({
        data: { user: { id: 'new-user', email: 'scholar@college.edu' } },
        error: null,
      });

      render(<RegisterPage />);

      fireEvent.change(screen.getByLabelText(/full display name/i), {
        target: { value: 'Hypatia Alexandria' },
      });
      fireEvent.change(screen.getByLabelText(/institutional email/i), {
        target: { value: 'scholar@college.edu' },
      });
      fireEvent.change(screen.getByLabelText(/^password/i), {
        target: { value: 'AcademicPass123' },
      });
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'AcademicPass123' },
      });

      fireEvent.click(screen.getByRole('button', { name: /create scholar account/i }));

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
        expect(screen.getByText(/verification email dispatched/i)).toBeInTheDocument();
        expect(screen.getByText(/you must confirm your institutional email before your account becomes active/i)).toBeInTheDocument();
      });
    });
  });

  describe('ForgotPasswordPage', () => {
    it('dispatches reset link and shows confirmation without leaking existence', async () => {
      mockResetPasswordForEmail.mockResolvedValueOnce({
        data: {},
        error: null,
      });

      render(<ForgotPasswordPage />);

      expect(screen.getByRole('heading', { name: /password recovery/i })).toBeInTheDocument();
      const emailInput = screen.getByLabelText(/registered institutional email/i);
      fireEvent.change(emailInput, { target: { value: 'student@college.edu' } });

      fireEvent.click(screen.getByRole('button', { name: /send password reset link/i }));

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
        expect(screen.getByText(/instructions dispatched/i)).toBeInTheDocument();
        expect(screen.getByText(/if an active account exists/i)).toBeInTheDocument();
      });
    });
  });

  describe('ResetPasswordPage', () => {
    it('renders password fields and validates password length', async () => {
      render(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/^new password/i), {
        target: { value: 'short' },
      });
      fireEvent.change(screen.getByLabelText(/confirm new password/i), {
        target: { value: 'short' },
      });

      fireEvent.click(screen.getByRole('button', { name: /update account password/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/at least 8 characters/i);
      });
    });

    it('handles expired or invalid recovery session', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session: null } });

      render(<ResetPasswordPage />);

      await waitFor(
        () => {
          expect(screen.getByText(/recovery session expired/i)).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });
  });

  describe('UnauthorizedPage', () => {
    it('renders 403 classification and navigation back to catalog and dashboard', () => {
      render(<UnauthorizedPage />);

      expect(screen.getByText('Classification 403')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /restricted archive folio/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /explore library catalog/i })).toHaveAttribute(
        'href',
        '/documents'
      );
      expect(screen.getByRole('link', { name: /student dashboard/i })).toHaveAttribute(
        'href',
        '/dashboard'
      );
    });
  });
});
