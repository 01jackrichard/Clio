import { z } from 'zod';
import { DEPARTMENTS, ACADEMIC_YEARS, SEMESTERS, MATERIAL_TYPES, UNITS } from '@/lib/constants';
import { extractDriveFileId } from '@/lib/drive/urls';

const materialTypeValues = MATERIAL_TYPES.map((m) => m.value) as [string, ...string[]];

/**
 * Validates Google Drive share links or raw file IDs.
 */
const driveIdentifierRefinement = (val: string) => {
  return extractDriveFileId(val) !== null;
};

/**
 * Admin direct document registration schema (for canonical Drive repository files).
 */
export const documentRegistrationSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(120, 'Title cannot exceed 120 characters'),
  description: z
    .string()
    .trim()
    .max(500, 'Description cannot exceed 500 characters')
    .optional()
    .or(z.literal('')),
  department: z.enum(DEPARTMENTS, {
    message: 'Please select a valid academic department',
  }),
  academic_year: z.enum(ACADEMIC_YEARS, {
    message: 'Please select a valid academic year',
  }),
  semester: z.enum(SEMESTERS, {
    message: 'Please select a valid semester',
  }),
  subject: z
    .string()
    .trim()
    .min(2, 'Subject must be at least 2 characters')
    .max(80, 'Subject cannot exceed 80 characters'),
  unit: z
    .enum(UNITS)
    .optional()
    .or(z.literal(''))
    .nullable(),
  material_type: z.enum(materialTypeValues as [string, ...string[]], {
    message: 'Please select a valid material type',
  }),
  tags: z
    .array(z.string().trim().min(1).max(30))
    .max(8, 'Maximum 8 tags allowed')
    .default([]),
  drive_url_or_id: z
    .string()
    .trim()
    .min(1, 'Google Drive link or file ID is required')
    .refine(driveIdentifierRefinement, {
      message:
        'Please enter a valid Google Drive share link (e.g. https://drive.google.com/file/d/.../view) or a valid 25-50 char file ID',
    }),
  original_filename: z
    .string()
    .trim()
    .max(255)
    .optional()
    .or(z.literal('')),
  publish_immediately: z.boolean().default(true),
});

export type DocumentRegistrationInput = z.infer<typeof documentRegistrationSchema>;

/**
 * Student / contributor study material submission schema (submits Drive review link).
 */
export const studentSubmissionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(120, 'Title cannot exceed 120 characters'),
  description: z
    .string()
    .trim()
    .max(500, 'Description cannot exceed 500 characters')
    .optional()
    .or(z.literal('')),
  department: z.enum(DEPARTMENTS, {
    message: 'Please select a valid academic department',
  }),
  academic_year: z.enum(ACADEMIC_YEARS, {
    message: 'Please select a valid academic year',
  }),
  semester: z.enum(SEMESTERS, {
    message: 'Please select a valid semester',
  }),
  subject: z
    .string()
    .trim()
    .min(2, 'Subject must be at least 2 characters')
    .max(80, 'Subject cannot exceed 80 characters'),
  unit: z
    .enum(UNITS)
    .optional()
    .or(z.literal(''))
    .nullable(),
  material_type: z.enum(materialTypeValues as [string, ...string[]], {
    message: 'Please select a valid material type',
  }),
  tags: z
    .array(z.string().trim().min(1).max(30))
    .max(8, 'Maximum 8 tags allowed')
    .default([]),
  drive_url: z
    .string()
    .trim()
    .min(1, 'Google Drive link is required')
    .refine(driveIdentifierRefinement, {
      message:
        'Please provide a valid Google Drive link to your PDF (e.g. https://drive.google.com/file/d/.../view). Make sure sharing is set to "Anyone with the link can view".',
    }),
  declaration_accepted: z
    .boolean()
    .refine((val) => val === true, 'You must accept the academic honesty and sharing declaration'),
});

export type StudentSubmissionInput = z.infer<typeof studentSubmissionSchema>;

/**
 * Administrator moderation actions (approve, reject, remove, update canonical Drive ID).
 */
export const moderationActionSchema = z
  .object({
    action: z.enum(['approve', 'reject', 'remove']),
    canonical_drive_file_id: z
      .string()
      .trim()
      .optional()
      .refine(
        (val) => !val || driveIdentifierRefinement(val),
        'Invalid canonical Google Drive file ID or link'
      ),
    review_notes: z
      .string()
      .trim()
      .max(500, 'Review notes cannot exceed 500 characters')
      .optional(),
    rejection_reason: z
      .string()
      .trim()
      .max(500, 'Rejection reason cannot exceed 500 characters')
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.action === 'approve') {
      if (!data.canonical_drive_file_id || !driveIdentifierRefinement(data.canonical_drive_file_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'An authorized administrator must explicitly provide a canonical Google Drive file link or ID from the central repository before approving and publishing',
          path: ['canonical_drive_file_id'],
        });
      }
    }
    if (data.action === 'reject' || data.action === 'remove') {
      if (!data.rejection_reason || data.rejection_reason.trim().length < 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'A specific rejection reason is mandatory when rejecting or removing documents (minimum 5 characters)',
          path: ['rejection_reason'],
        });
      }
    }
  });


export type ModerationActionInput = z.infer<typeof moderationActionSchema>;

/**
 * Backward compatibility schemas
 */
export const uploadIntentSchema = studentSubmissionSchema;
export type UploadIntentInput = StudentSubmissionInput;

export const confirmUploadSchema = z.object({
  document_id: z.string().uuid().optional(),
  drive_file_id: z.string().min(1),
});
export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;

/**
 * Supported MIME types for academic document submissions (PDF, DOC, DOCX)
 */
export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export type AllowedDocumentMimeType = (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number];

/**
 * Google Forms automated submission webhook payload schema
 */
export const googleFormWebhookPayloadSchema = z.object({
  request_id: z
    .string()
    .trim()
    .min(5, 'Request ID must be at least 5 characters')
    .max(100, 'Request ID cannot exceed 100 characters'),
  timestamp: z
    .number()
    .int()
    .positive('Timestamp must be a positive integer'),
  respondent_email: z
    .string()
    .trim()
    .email('Valid respondent email is required'),
  drive_file_id: z
    .string()
    .trim()
    .refine(driveIdentifierRefinement, {
      message: 'Invalid Google Drive file ID',
    }),
  original_filename: z
    .string()
    .trim()
    .min(1, 'Original filename is required')
    .max(255, 'Original filename cannot exceed 255 characters'),
  mime_type: z.enum(ALLOWED_DOCUMENT_MIME_TYPES, {
    message: 'Permitted formats are PDF, DOC, and DOCX only',
  }),
  file_size: z
    .number()
    .int()
    .positive('File size must be positive')
    .max(50 * 1024 * 1024, 'File size cannot exceed 50 MB'),
  metadata: z.object({
    title: z
      .string()
      .trim()
      .min(3, 'Title must be at least 3 characters')
      .max(120, 'Title cannot exceed 120 characters'),
    description: z
      .string()
      .trim()
      .max(1000, 'Description cannot exceed 1000 characters')
      .optional()
      .or(z.literal('')),
    department: z.enum(DEPARTMENTS, {
      message: 'Invalid academic department',
    }),
    academic_year: z.enum(ACADEMIC_YEARS, {
      message: 'Invalid academic year',
    }),
    semester: z.enum(SEMESTERS, {
      message: 'Invalid semester',
    }),
    subject: z
      .string()
      .trim()
      .min(2, 'Subject must be at least 2 characters')
      .max(100, 'Subject cannot exceed 100 characters'),
    unit: z
      .enum(UNITS)
      .optional()
      .or(z.literal(''))
      .nullable(),
    material_type: z.enum(materialTypeValues as [string, ...string[]], {
      message: 'Invalid material type',
    }),
    tags: z
      .array(z.string().trim().min(1).max(30))
      .max(8, 'Maximum 8 tags allowed')
      .optional()
      .default([]),
  }),
});

export type GoogleFormWebhookPayload = z.infer<typeof googleFormWebhookPayloadSchema>;

/**
 * Direct file upload metadata schema with Anna University subject & privacy controls
 */
export const directUploadSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, 'Title must be at least 3 characters')
      .max(120, 'Title cannot exceed 120 characters'),
    description: z
      .string()
      .trim()
      .max(1000, 'Description cannot exceed 1000 characters')
      .optional()
      .or(z.literal('')),
    department: z.enum(DEPARTMENTS, {
      message: 'Please select a valid academic department',
    }),
    academic_year: z.enum(ACADEMIC_YEARS, {
      message: 'Please select a valid academic year',
    }),
    semester: z.enum(SEMESTERS, {
      message: 'Please select a valid semester',
    }),
    subject: z
      .string()
      .trim()
      .min(2, 'Subject name must be at least 2 characters')
      .max(100, 'Subject name cannot exceed 100 characters'),
    subject_code: z
      .string()
      .trim()
      .max(20, 'Subject code cannot exceed 20 characters')
      .optional()
      .or(z.literal('')),
    regulation: z
      .string()
      .trim()
      .max(30)
      .optional()
      .default('2021'),
    is_verified_subject: z.boolean().optional().default(true),
    unit: z
      .enum(UNITS)
      .optional()
      .or(z.literal(''))
      .nullable(),
    material_type: z.enum(materialTypeValues as [string, ...string[]], {
      message: 'Please select a valid material type',
    }),
    tags: z
      .array(z.string().trim().min(1).max(30))
      .max(8, 'Maximum 8 tags allowed')
      .default([]),
    visibility: z.enum(['public', 'private']).default('public'),
    password: z
      .string()
      .min(6, 'Access password must be at least 6 characters')
      .max(100, 'Password cannot exceed 100 characters')
      .optional()
      .or(z.literal('')),
    collection_id: z.string().uuid('Invalid collection identifier').optional().or(z.literal('')),
    declaration_accepted: z
      .boolean()
      .refine((val) => val === true, 'You must accept the academic honesty and sharing declaration'),
  })
  .superRefine((data, ctx) => {
    if (data.visibility === 'private') {
      if (!data.password || data.password.trim().length < 6) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'An access password (minimum 6 characters) is required for private documents',
          path: ['password'],
        });
      }
    }
  });

export type DirectUploadInput = z.infer<typeof directUploadSchema>;

/**
 * Academic Collection / Resource Pack Creation Schema
 */
export const createCollectionSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, 'Collection title must be at least 3 characters')
      .max(120, 'Collection title cannot exceed 120 characters'),
    description: z
      .string()
      .trim()
      .max(1000, 'Description cannot exceed 1000 characters')
      .optional()
      .or(z.literal('')),
    department: z.enum(DEPARTMENTS).optional().nullable(),
    regulation: z.string().trim().max(30).optional().default('2021'),
    academic_year: z.enum(ACADEMIC_YEARS).optional().nullable(),
    semester: z.enum(SEMESTERS).optional().nullable(),
    visibility: z.enum(['public', 'private']).default('public'),
    password: z
      .string()
      .min(6, 'Access password must be at least 6 characters')
      .max(100, 'Password cannot exceed 100 characters')
      .optional()
      .or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.visibility === 'private') {
      if (!data.password || data.password.trim().length < 6) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'An access password (minimum 6 characters) is required for private collections',
          path: ['password'],
        });
      }
    }
  });

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;

/**
 * Resource Password Unlock Schema
 */
export const unlockResourceSchema = z.object({
  password: z.string().min(1, 'Password is required to unlock this resource'),
});

export type UnlockResourceInput = z.infer<typeof unlockResourceSchema>;

