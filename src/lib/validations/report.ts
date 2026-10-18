import { z } from 'zod';
import { REPORT_REASONS } from '@/lib/constants';

const reportReasonValues = REPORT_REASONS.map(r => r.value) as [string, ...string[]];

export const submitReportSchema = z.object({
  document_id: z.string().uuid('Invalid document identifier'),
  reason: z.enum(reportReasonValues as [string, ...string[]], {
    message: 'Please select a valid report reason',
  }),
  details: z
    .string()
    .trim()
    .max(500, 'Details cannot exceed 500 characters')
    .optional(),
});

export type SubmitReportInput = z.infer<typeof submitReportSchema>;

export const resolveReportSchema = z.object({
  action: z.enum(['resolve', 'dismiss']),
  review_notes: z
    .string()
    .trim()
    .max(500, 'Review notes cannot exceed 500 characters')
    .optional(),
});

export type ResolveReportInput = z.infer<typeof resolveReportSchema>;
