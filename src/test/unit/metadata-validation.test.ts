import { describe, it, expect } from 'vitest';
import {
  documentRegistrationSchema,
  studentSubmissionSchema,
  moderationActionSchema,
} from '@/lib/validations/document';
import { isEmailDomainAllowed } from '@/lib/validations/auth';

describe('Document Registration Validation Schema (Admin)', () => {
  const validFileId = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';

  const validPayload = {
    title: 'Operating Systems - Process Scheduling Notes',
    description: 'Detailed unit notes covering Round Robin, Priority, and Multi-level feedback queues.',
    department: 'Computer Science & Engineering',
    academic_year: '2nd Year',
    semester: 'Semester 4',
    subject: 'Operating Systems',
    unit: 'Unit 2',
    material_type: 'unit_notes',
    tags: ['operating-systems', 'scheduling', 'round-robin'],
    drive_url_or_id: `https://drive.google.com/file/d/${validFileId}/view?usp=sharing`,
    original_filename: 'os_unit2_scheduling.pdf',
    publish_immediately: true,
  };

  it('should accept valid and complete academic metadata with Drive URL', () => {
    const result = documentRegistrationSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('should accept raw valid Drive file ID directly', () => {
    const rawIdPayload = { ...validPayload, drive_url_or_id: validFileId };
    const result = documentRegistrationSchema.safeParse(rawIdPayload);
    expect(result.success).toBe(true);
  });

  it('should reject invalid or non-Google URLs', () => {
    const invalidUrlPayload = {
      ...validPayload,
      drive_url_or_id: 'https://malicious-site.com/file.pdf',
    };
    const result = documentRegistrationSchema.safeParse(invalidUrlPayload);
    expect(result.success).toBe(false);
  });

  it('should reject a title shorter than 3 characters or longer than 120 characters', () => {
    const shortTitle = { ...validPayload, title: 'ab' };
    const longTitle = { ...validPayload, title: 'a'.repeat(125) };

    expect(documentRegistrationSchema.safeParse(shortTitle).success).toBe(false);
    expect(documentRegistrationSchema.safeParse(longTitle).success).toBe(false);
  });

  it('should reject invalid departments or semesters not in academic taxonomy', () => {
    const invalidDept = { ...validPayload, department: 'Non-existent Department' };
    const invalidSem = { ...validPayload, semester: 'Semester 12' };

    expect(documentRegistrationSchema.safeParse(invalidDept).success).toBe(false);
    expect(documentRegistrationSchema.safeParse(invalidSem).success).toBe(false);
  });
});

describe('Student Submission Validation Schema', () => {
  const validFileId = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';

  const validSubmission = {
    title: 'Database Management Systems Lecture Notes',
    description: 'Complete SQL normalization and B-tree indexing review notes.',
    department: 'Computer Science & Engineering',
    academic_year: '3rd Year',
    semester: 'Semester 5',
    subject: 'DBMS',
    unit: 'Unit 3',
    material_type: 'unit_notes',
    tags: ['dbms', 'sql', 'normalization'],
    drive_url: `https://drive.google.com/file/d/${validFileId}/view`,
    declaration_accepted: true,
  };

  it('should accept a complete student submission with valid Drive URL and declaration', () => {
    const result = studentSubmissionSchema.safeParse(validSubmission);
    expect(result.success).toBe(true);
  });

  it('should reject submission if declaration_accepted is false', () => {
    const unaccepted = { ...validSubmission, declaration_accepted: false };
    expect(studentSubmissionSchema.safeParse(unaccepted).success).toBe(false);
  });

  it('should reject submission with non-Google link', () => {
    const nonGoogle = { ...validSubmission, drive_url: 'https://dropbox.com/s/12345/file.pdf' };
    expect(studentSubmissionSchema.safeParse(nonGoogle).success).toBe(false);
  });
});

describe('Moderation Action Validation Schema', () => {
  it('should require canonical_drive_file_id when approving a document and succeed without rejection reason', () => {
    const approveNoCanonical = { action: 'approve', review_notes: 'Verified and approved' };
    expect(moderationActionSchema.safeParse(approveNoCanonical).success).toBe(false);

    const approveWithCanonical = {
      action: 'approve',
      canonical_drive_file_id: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      review_notes: 'Verified and approved',
    };
    expect(moderationActionSchema.safeParse(approveWithCanonical).success).toBe(true);
  });

  it('should allow setting canonical_drive_file_id when approving', () => {
    const approveWithCanonicalId = {
      action: 'approve',
      canonical_drive_file_id: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      review_notes: 'Transferred to central Drive and approved',
    };
    expect(moderationActionSchema.safeParse(approveWithCanonicalId).success).toBe(true);
  });

  it('should reject if action is "reject" but rejection_reason is missing', () => {
    const rejectNoReason = { action: 'reject' };
    const result = moderationActionSchema.safeParse(rejectNoReason);
    expect(result.success).toBe(false);
  });

  it('should reject if rejection_reason is shorter than 5 characters', () => {
    const rejectShortReason = { action: 'reject', rejection_reason: 'bad' };
    const result = moderationActionSchema.safeParse(rejectShortReason);
    expect(result.success).toBe(false);
  });

  it('should succeed when rejection has a valid detailed reason', () => {
    const validReject = {
      action: 'reject',
      rejection_reason: 'Document has inverted upside-down pages on pages 4-8.',
    };
    expect(moderationActionSchema.safeParse(validReject).success).toBe(true);
  });
});

describe('College Email Domain Verification', () => {
  it('should allow valid college emails when domain matching is checked', () => {
    expect(isEmailDomainAllowed('student@yourcollege.edu')).toBe(true);
    expect(isEmailDomainAllowed('student@gmail.com')).toBe(true);
  });
});
