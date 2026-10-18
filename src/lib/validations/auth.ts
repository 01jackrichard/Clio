import { z } from 'zod';
import { DEPARTMENTS, ACADEMIC_YEARS } from '@/lib/constants';
import { config } from '@/lib/config';

export function isEmailDomainAllowed(email: string): boolean {
  if (config.auth.registrationMode === 'open') return true;
  if (config.auth.allowedDomains.length === 0) return true;

  const emailDomain = email.split('@')[1]?.toLowerCase();
  if (!emailDomain) return false;

  return config.auth.allowedDomains.some(allowed => 
    emailDomain === allowed || emailDomain.endsWith(`.${allowed}`)
  );
}

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Invalid email address')
    .refine(isEmailDomainAllowed, {
      message: config.auth.allowedDomains.length > 0 
        ? `Registration is restricted to college email domains: @${config.auth.allowedDomains.join(', @')}` 
        : 'This email domain is not permitted by college registration policy',
    }),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password is too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one digit'),
  display_name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(60, 'Name cannot exceed 60 characters'),
  department: z.enum(DEPARTMENTS, {
    message: 'Please select your department',
  }),
  academic_year: z.enum(ACADEMIC_YEARS, {
    message: 'Please select your academic year',
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const profileUpdateSchema = z.object({
  display_name: z.string().trim().min(2).max(60),
  department: z.enum(DEPARTMENTS).optional(),
  academic_year: z.enum(ACADEMIC_YEARS).optional(),
  graduation_year: z.number().int().min(2020).max(2035).optional().nullable(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
