import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  sanitizeRedirectUrl,
  sanitizePostgrestFilter,
} from '@/lib/utils';
import { sanitizeFilename } from '@/lib/drive/file-validation';
import { resolveCanonicalOrigin } from '@/lib/services/sharing-service';
import { config } from '@/lib/config';

describe('Security Audit & Hardening Fixes', () => {
  describe('escapeHtml (Neutralizing Reflected & Stored XSS)', () => {
    it('escapes standard HTML injection tags', () => {
      const malicious = '<script>alert("XSS")</script>';
      const escaped = escapeHtml(malicious);
      expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
      expect(escaped).not.toContain('<');
      expect(escaped).not.toContain('>');
    });

    it('escapes ampersands, single quotes, and double quotes', () => {
      const input = `Me & You 'said' "Hello"`;
      const escaped = escapeHtml(input);
      expect(escaped).toBe('Me &amp; You &#039;said&#039; &quot;Hello&quot;');
    });

    it('handles null, undefined, and empty string safely', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
      expect(escapeHtml('')).toBe('');
    });
  });

  describe('sanitizeRedirectUrl (Open Redirect Prevention)', () => {
    it('allows clean relative paths within the application', () => {
      expect(sanitizeRedirectUrl('/dashboard')).toBe('/dashboard');
      expect(sanitizeRedirectUrl('/documents/doc-123')).toBe('/documents/doc-123');
      expect(sanitizeRedirectUrl('/shared-with-me')).toBe('/shared-with-me');
      expect(sanitizeRedirectUrl('/documents?department=Computer%20Science')).toBe(
        '/documents?department=Computer%20Science'
      );
    });

    it('rejects protocol-relative external redirects (//evil.com)', () => {
      expect(sanitizeRedirectUrl('//evil.com')).toBe('/dashboard');
      expect(sanitizeRedirectUrl('//google.com/phish')).toBe('/dashboard');
    });

    it('rejects backslash bypass vectors (/\\evil.com or \\\\evil.com)', () => {
      expect(sanitizeRedirectUrl('/\\evil.com')).toBe('/dashboard');
      expect(sanitizeRedirectUrl('\\evil.com')).toBe('/dashboard');
      expect(sanitizeRedirectUrl('\\\\evil.com')).toBe('/dashboard');
    });

    it('rejects absolute URLs pointing outside the application', () => {
      expect(sanitizeRedirectUrl('https://evil.com/login')).toBe('/dashboard');
      expect(sanitizeRedirectUrl('http://attacker.com')).toBe('/dashboard');
      expect(sanitizeRedirectUrl('ftp://server.com')).toBe('/dashboard');
    });

    it('rejects javascript: and data: pseudo-protocols', () => {
      expect(sanitizeRedirectUrl('javascript:alert(1)')).toBe('/dashboard');
      expect(sanitizeRedirectUrl('data:text/html,<script>alert(1)</script>')).toBe('/dashboard');
      expect(sanitizeRedirectUrl('/javascript:alert(1)')).toBe('/dashboard');
    });

    it('rejects encoded protocol and slash bypass tricks', () => {
      expect(sanitizeRedirectUrl('/%2Fevil.com')).toBe('/dashboard');
      expect(sanitizeRedirectUrl('/%5Cevil.com')).toBe('/dashboard');
    });

    it('rejects control characters, newlines, and null bytes', () => {
      expect(sanitizeRedirectUrl('/dashboard\0evil')).toBe('/dashboard');
      expect(sanitizeRedirectUrl('/dashboard\r\nevil')).toBe('/dashboard');
      expect(sanitizeRedirectUrl('/dashboard\nSet-Cookie:evil')).toBe('/dashboard');
    });

    it('supports custom fallback URLs', () => {
      expect(sanitizeRedirectUrl('https://evil.com', '/documents')).toBe('/documents');
      expect(sanitizeRedirectUrl(null, '/login')).toBe('/login');
    });
  });

  describe('sanitizePostgrestFilter (Filter Injection Neutralization)', () => {
    it('strips PostgREST query delimiter characters (commas, parens, colons, quotes)', () => {
      const malicious = 'algorithms,status.eq.rejected,title.ilike.*';
      const safe = sanitizePostgrestFilter(malicious);
      expect(safe).toBe('algorithms status.eq.rejected title.ilike.*');
      expect(safe).not.toContain(',');
      expect(safe).not.toContain('(');
      expect(safe).not.toContain(')');
    });

    it('neutralizes quote and parenthesis injection', () => {
      const input = `") or 1=1 --`;
      const safe = sanitizePostgrestFilter(input);
      expect(safe).toBe('or 1=1 --');
      expect(safe).not.toContain('"');
      expect(safe).not.toContain(')');
    });

    it('collapses multiple whitespace into a clean single string', () => {
      const input = '   data    structures   ';
      expect(sanitizePostgrestFilter(input)).toBe('data structures');
    });

    it('safely handles empty or non-string inputs', () => {
      expect(sanitizePostgrestFilter(null)).toBe('');
      expect(sanitizePostgrestFilter(undefined)).toBe('');
      expect(sanitizePostgrestFilter('')).toBe('');
    });
  });

  describe('sanitizeFilename (Path Traversal & Shell Safety)', () => {
    it('strips Unix and Windows path traversal sequences', () => {
      expect(sanitizeFilename('../../../etc/passwd.pdf')).toBe('passwd.pdf');
      expect(sanitizeFilename('..\\..\\Windows\\System32\\calc.exe.pdf')).toBe('calc.exe.pdf');
      expect(sanitizeFilename('/var/log/secret.docx')).toBe('secret.docx');
      expect(sanitizeFilename('C:\\Documents\\notes.pdf')).toBe('notes.pdf');
    });

    it('strips null bytes and non-printable control characters', () => {
      const input = 'academic_notes\x00.exe.pdf';
      const sanitized = sanitizeFilename(input);
      expect(sanitized).toBe('academic_notes.exe.pdf');
      expect(sanitized).not.toContain('\x00');
    });

    it('enforces approved extensions, defaulting unapproved to .pdf', () => {
      expect(sanitizeFilename('shell.sh')).toBe('shell.pdf');
      expect(sanitizeFilename('malware.exe')).toBe('malware.pdf');
      expect(sanitizeFilename('syllabus.doc')).toBe('syllabus.doc');
      expect(sanitizeFilename('notes.docx')).toBe('notes.docx');
      expect(sanitizeFilename('paper.pdf')).toBe('paper.pdf');
    });

    it('provides a safe default if the raw filename is empty, dot-only, or whitespace', () => {
      expect(sanitizeFilename('')).toBe('document.pdf');
      expect(sanitizeFilename('   ')).toBe('document.pdf');
      expect(sanitizeFilename('....pdf')).toBe('document.pdf');
      expect(sanitizeFilename(null)).toBe('document.pdf');
    });
  });

  describe('resolveCanonicalOrigin (Canonical Base Origin Resolution)', () => {
    it('normalizes valid origins by stripping trailing slashes', () => {
      expect(resolveCanonicalOrigin('https://clio-archive.edu/')).toBe('https://clio-archive.edu');
      expect(resolveCanonicalOrigin('http://localhost:3000///')).toBe('http://localhost:3000');
    });

    it('falls back to configured canonical app URL when origin header is missing', () => {
      const resolved = resolveCanonicalOrigin(null);
      const expectedBase = config.app?.url ? config.app.url.replace(/\/+$/, '') : 'http://localhost:3000';
      expect(resolved).toBe(expectedBase);
    });

    it('falls back to configured URL when origin header is empty or invalid scheme', () => {
      const resolved = resolveCanonicalOrigin('invalid-scheme://test');
      const expectedBase = config.app?.url ? config.app.url.replace(/\/+$/, '') : 'http://localhost:3000';
      expect(resolved).toBe(expectedBase);
    });
  });
});
