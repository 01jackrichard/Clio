import { describe, it, expect } from 'vitest';
import {
  hashAccessPassword,
  verifyAccessPassword,
  generateUnlockToken,
  verifyUnlockToken,
  checkUnlockRateLimit,
  recordFailedUnlockAttempt,
  resetUnlockAttempts,
} from '@/lib/security/password-service';
import {
  directUploadSchema,
  createCollectionSchema,
  unlockResourceSchema,
} from '@/lib/validations/document';

describe('Document Privacy, Password Hashing & HMAC Grants', () => {
  it('hashes passwords using PBKDF2 with salt', () => {
    const rawPassword = 'SecureAcademicKey2026';
    const hash1 = hashAccessPassword(rawPassword);
    const hash2 = hashAccessPassword(rawPassword);

    expect(hash1).toMatch(/^pbkdf2\$100000\$[0-9a-f]{64}\$[0-9a-f]{128}$/);
    expect(hash2).toMatch(/^pbkdf2\$100000\$[0-9a-f]{64}\$[0-9a-f]{128}$/);
    // Two hashes of the same password must have different salts
    expect(hash1).not.toBe(hash2);
  });

  it('rejects passwords shorter than 6 characters', () => {
    expect(() => hashAccessPassword('12345')).toThrow(/at least 6 characters/i);
  });

  it('verifies valid password against PBKDF2 hash using constant-time comparison', () => {
    const rawPassword = 'ValidPassword123';
    const hash = hashAccessPassword(rawPassword);

    expect(verifyAccessPassword(rawPassword, hash)).toBe(true);
    expect(verifyAccessPassword('WrongPassword', hash)).toBe(false);
    expect(verifyAccessPassword('', hash)).toBe(false);
    expect(verifyAccessPassword(rawPassword, null)).toBe(false);
    expect(verifyAccessPassword(rawPassword, 'malformed_hash')).toBe(false);
  });

  it('generates signed HMAC unlock tokens and verifies them against resourceId', () => {
    const resourceId = 'doc-test-uuid-456';
    const token = generateUnlockToken(resourceId);

    expect(token).toBeDefined();
    expect(verifyUnlockToken(token, resourceId)).toBe(true);

    // Fails if checked against a different resource
    expect(verifyUnlockToken(token, 'different-resource-id')).toBe(false);

    // Fails if token is tampered
    const tampered = token.replace(/a/g, 'b');
    expect(verifyUnlockToken(tampered, resourceId)).toBe(false);

    // Fails on null or empty token
    expect(verifyUnlockToken(null, resourceId)).toBe(false);
    expect(verifyUnlockToken('', resourceId)).toBe(false);
  });

  it('enforces brute-force rate limiting on unlock attempts', () => {
    const testId = `test_rate_limit_${Date.now()}`;

    // Initial state: allowed
    const initialCheck = checkUnlockRateLimit(testId);
    expect(initialCheck.allowed).toBe(true);
    expect(initialCheck.remainingAttempts).toBe(5);

    // Record 5 failed attempts
    for (let i = 0; i < 5; i++) {
      recordFailedUnlockAttempt(testId);
    }

    // 6th attempt should be blocked
    const blockedCheck = checkUnlockRateLimit(testId);
    expect(blockedCheck.allowed).toBe(false);
    expect(blockedCheck.remainingAttempts).toBe(0);

    // Reset attempts upon success
    resetUnlockAttempts(testId);
    const afterReset = checkUnlockRateLimit(testId);
    expect(afterReset.allowed).toBe(true);
    expect(afterReset.remainingAttempts).toBe(5);
  });

  it('validates direct upload schema requiring password for private documents', () => {
    const validPublic = directUploadSchema.safeParse({
      title: 'Valid Public Folio',
      department: 'Computer Science & Engineering',
      academic_year: '3rd Year',
      semester: 'Semester 5',
      subject: 'Operating Systems',
      material_type: 'unit_notes',
      visibility: 'public',
      declaration_accepted: true,
    });
    expect(validPublic.success).toBe(true);

    // Private without password should fail
    const invalidPrivate = directUploadSchema.safeParse({
      title: 'Private Folio',
      department: 'Computer Science & Engineering',
      academic_year: '3rd Year',
      semester: 'Semester 5',
      subject: 'Operating Systems',
      material_type: 'unit_notes',
      visibility: 'private',
      declaration_accepted: true,
    });
    expect(invalidPrivate.success).toBe(false);

    // Private with valid password should pass
    const validPrivate = directUploadSchema.safeParse({
      title: 'Private Folio',
      department: 'Computer Science & Engineering',
      academic_year: '3rd Year',
      semester: 'Semester 5',
      subject: 'Operating Systems',
      material_type: 'unit_notes',
      visibility: 'private',
      password: 'studygroupsecret',
      declaration_accepted: true,
    });
    expect(validPrivate.success).toBe(true);
  });

  it('validates collection creation schema', () => {
    const validCol = createCollectionSchema.safeParse({
      title: 'CS3351 Complete Pack',
      department: 'Computer Science & Engineering',
      regulation: '2021',
      visibility: 'public',
    });
    expect(validCol.success).toBe(true);

    const privateColWithoutPass = createCollectionSchema.safeParse({
      title: 'Private Pack',
      visibility: 'private',
    });
    expect(privateColWithoutPass.success).toBe(false);

    const privateColWithPass = createCollectionSchema.safeParse({
      title: 'Private Pack',
      visibility: 'private',
      password: 'classpassword123',
    });
    expect(privateColWithPass.success).toBe(true);
  });

  it('validates unlock resource input schema', () => {
    expect(unlockResourceSchema.safeParse({ password: 'key' }).success).toBe(true);
    expect(unlockResourceSchema.safeParse({ password: '' }).success).toBe(false);
  });
});
