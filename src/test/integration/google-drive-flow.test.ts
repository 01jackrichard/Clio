import { describe, it, expect } from 'vitest';
import {
  extractDriveFileId,
  getDriveEmbedUrl,
  getDriveDownloadUrl,
  getDriveViewUrl,
  validateDriveInput,
} from '@/lib/drive/urls';
import {
  studentSubmissionSchema,
  documentRegistrationSchema,
  moderationActionSchema,
} from '@/lib/validations/document';

describe('Google Drive Embedded Repository Flow & Pipeline', () => {
  const sampleFileId = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
  const sampleShareUrl = `https://drive.google.com/file/d/${sampleFileId}/view?usp=sharing`;
  const samplePreviewUrl = `https://drive.google.com/file/d/${sampleFileId}/preview`;
  const sampleOpenUrl = `https://drive.google.com/open?id=${sampleFileId}`;

  it('correctly parses and extracts Google Drive file ID from all standard link formats', () => {
    expect(extractDriveFileId(sampleShareUrl)).toBe(sampleFileId);
    expect(extractDriveFileId(samplePreviewUrl)).toBe(sampleFileId);
    expect(extractDriveFileId(sampleOpenUrl)).toBe(sampleFileId);
    expect(extractDriveFileId(sampleFileId)).toBe(sampleFileId);
  });

  it('constructs canonical Google Drive embed URLs strictly from validated IDs', () => {
    const embedUrl = getDriveEmbedUrl(sampleShareUrl);
    expect(embedUrl).toBe(`https://drive.google.com/file/d/${sampleFileId}/preview`);
  });

  it('constructs canonical Google Drive download and view URLs', () => {
    const downloadUrl = getDriveDownloadUrl(sampleShareUrl);
    const viewUrl = getDriveViewUrl(sampleShareUrl);

    expect(downloadUrl).toBe(`https://drive.google.com/uc?export=download&id=${sampleFileId}`);
    expect(viewUrl).toBe(`https://drive.google.com/file/d/${sampleFileId}/view`);
  });

  it('rejects malicious protocols, external domains, and malformed strings', () => {
    expect(extractDriveFileId('javascript:alert(1)')).toBeNull();
    expect(extractDriveFileId('https://attacker.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view')).toBeNull();
    expect(extractDriveFileId('not-a-valid-id-123')).toBeNull();
  });

  it('validates a complete student study material contribution payload', () => {
    const validStudentPayload = {
      title: 'Operating Systems - Virtual Memory & Page Replacement',
      description: 'Comprehensive lecture notes covering LRU, FIFO, and working set algorithms.',
      department: 'Computer Science & Engineering',
      academic_year: '3rd Year',
      semester: 'Semester 5',
      subject: 'Operating Systems (CS501)',
      unit: 'Unit 4',
      material_type: 'lecture_notes',
      tags: ['os', 'virtual-memory', 'paging'],
      drive_url: sampleShareUrl,
      declaration_accepted: true,
    };

    const result = studentSubmissionSchema.safeParse(validStudentPayload);
    expect(result.success).toBe(true);
  });

  it('rejects student submissions with invalid drive links or unaccepted declaration', () => {
    const invalidPayload = {
      title: 'Operating Systems',
      department: 'Computer Science & Engineering',
      academic_year: '3rd Year',
      semester: 'Semester 5',
      subject: 'Operating Systems (CS501)',
      material_type: 'lecture_notes',
      tags: [],
      drive_url: 'https://dropbox.com/s/randomfile.pdf',
      declaration_accepted: false,
    };

    const result = studentSubmissionSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it('validates admin direct document registration payload', () => {
    const adminPayload = {
      title: 'CS302 - Data Structures Master Syllabus Reference Notes',
      department: 'Computer Science & Engineering',
      academic_year: '2nd Year',
      semester: 'Semester 3',
      subject: 'Data Structures & Algorithms',
      material_type: 'lecture_notes',
      tags: ['trees', 'graphs'],
      drive_url_or_id: sampleFileId,
      publish_immediately: true,
    };


    const result = documentRegistrationSchema.safeParse(adminPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.publish_immediately).toBe(true);
    }
  });

  it('returns structured diagnostic results from validateDriveInput', () => {
    const validResult = validateDriveInput(sampleShareUrl);
    expect(validResult.isValid).toBe(true);
    expect(validResult.fileId).toBe(sampleFileId);
    expect(validResult.embedUrl).toContain('/preview');

    const invalidResult = validateDriveInput('https://invalid-site.com/doc');
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.error).toBeDefined();
  });

  describe('Separation of Submitted vs Canonical Drive Files', () => {
    it('requires an explicit canonical Google Drive file ID when approving a document', () => {
      // Missing canonical file ID should fail
      const missingCanonical = moderationActionSchema.safeParse({
        action: 'approve',
      });
      expect(missingCanonical.success).toBe(false);

      // Invalid canonical file ID should fail
      const invalidCanonical = moderationActionSchema.safeParse({
        action: 'approve',
        canonical_drive_file_id: 'bad-file-id',
      });
      expect(invalidCanonical.success).toBe(false);

      // Valid canonical file ID or URL succeeds
      const validCanonicalWithId = moderationActionSchema.safeParse({
        action: 'approve',
        canonical_drive_file_id: sampleFileId,
        review_notes: 'Transferred to central repository folder',
      });
      expect(validCanonicalWithId.success).toBe(true);

      const validCanonicalWithUrl = moderationActionSchema.safeParse({
        action: 'approve',
        canonical_drive_file_id: sampleShareUrl,
      });
      expect(validCanonicalWithUrl.success).toBe(true);
    });

    it('requires a clear rejection reason when rejecting a document', () => {
      const missingReason = moderationActionSchema.safeParse({
        action: 'reject',
      });
      expect(missingReason.success).toBe(false);

      const validRejection = moderationActionSchema.safeParse({
        action: 'reject',
        rejection_reason: 'Scanned pages are blurry and illegible.',
      });
      expect(validRejection.success).toBe(true);
    });
  });
});
