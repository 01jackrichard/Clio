import { describe, it, expect } from 'vitest';
import { checkConfigStatus, config } from '@/lib/config';
import { isEmailDomainAllowed } from '@/lib/validations/auth';

describe('Supabase Environment Variable Contract & Aliases', () => {
  it('exposes publishableKey and secretKey properties', () => {
    expect(config.supabase).toHaveProperty('publishableKey');
    expect(config.supabase).toHaveProperty('secretKey');
  });

  it('maintains backwards compatibility for anonKey and serviceRoleKey getters', () => {
    expect(config.supabase.anonKey).toBe(config.supabase.publishableKey);
    expect(config.supabase.serviceRoleKey).toBe(config.supabase.secretKey);
  });

  it('correctly reports missing modern environment variable names when unconfigured', () => {
    const status = checkConfigStatus();
    // In unconfigured local dev environment without .env.local:
    if (!config.supabase.publishableKey) {
      expect(status.missingPublic).toContain('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
    }
    if (!config.supabase.secretKey) {
      expect(status.missingServer).toContain('SUPABASE_SECRET_KEY');
    }
  });
});

describe('Registration Domain Policy Enforcement', () => {
  it('allows any valid email format when registrationMode is open', () => {
    const originalMode = config.auth.registrationMode;
    try {
      config.auth.registrationMode = 'open';
      expect(isEmailDomainAllowed('student@gmail.com')).toBe(true);
      expect(isEmailDomainAllowed('user@custom-domain.org')).toBe(true);
    } finally {
      config.auth.registrationMode = originalMode;
    }
  });

  it('rejects external domains when restricted to institutional domains', () => {
    const originalMode = config.auth.registrationMode;
    const originalDomains = config.auth.allowedDomains;
    try {
      config.auth.registrationMode = 'domain_restricted';
      config.auth.allowedDomains = ['example.edu', 'student.example.edu'];

      expect(isEmailDomainAllowed('student@example.edu')).toBe(true);
      expect(isEmailDomainAllowed('student@cs.example.edu')).toBe(true);
      expect(isEmailDomainAllowed('student@student.example.edu')).toBe(true);
      expect(isEmailDomainAllowed('attacker@gmail.com')).toBe(false);
      expect(isEmailDomainAllowed('attacker@fake-example.edu')).toBe(false);
      expect(isEmailDomainAllowed('bademail')).toBe(false);
    } finally {
      config.auth.registrationMode = originalMode;
      config.auth.allowedDomains = originalDomains;
    }
  });
});
