/**
 * Clio Academic Taxonomy & Constants
 */

export const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Electronics & Communication Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electrical & Electronics Engineering',
  'Information Technology',
  'Applied Sciences & Humanities',
  'Management & Commerce Studies',
] as const;

export type Department = (typeof DEPARTMENTS)[number];

export const ACADEMIC_YEARS = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
  'Postgraduate / Research',
] as const;

export type AcademicYear = (typeof ACADEMIC_YEARS)[number];

export const SEMESTERS = [
  'Semester 1',
  'Semester 2',
  'Semester 3',
  'Semester 4',
  'Semester 5',
  'Semester 6',
  'Semester 7',
  'Semester 8',
] as const;

export type Semester = (typeof SEMESTERS)[number];

export const MATERIAL_TYPES = [
  { value: 'lecture_notes', label: 'Lecture Notes', badgeColor: 'blue' },
  { value: 'unit_notes', label: 'Unit Notes', badgeColor: 'indigo' },
  { value: 'pyq', label: 'Previous Year Questions (PYQ)', badgeColor: 'amber' },
  { value: 'lab_manual', label: 'Laboratory Manual', badgeColor: 'emerald' },
  { value: 'assignment_solution', label: 'Assignment & Solutions', badgeColor: 'purple' },
  { value: 'revision_notes', label: 'Revision / Cheat Sheet', badgeColor: 'rose' },
  { value: 'reference_material', label: 'Reference Material', badgeColor: 'slate' },
] as const;

export type MaterialTypeValue = (typeof MATERIAL_TYPES)[number]['value'];

export const UNITS = [
  'Unit 1',
  'Unit 2',
  'Unit 3',
  'Unit 4',
  'Unit 5',
  'Unit 6',
  'Complete Syllabus / All Units',
] as const;

export type Unit = (typeof UNITS)[number];

export const REPORT_REASONS = [
  { value: 'incorrect_classification', label: 'Incorrect Subject / Classification' },
  { value: 'duplicate', label: 'Duplicate of an existing document' },
  { value: 'corrupt_pdf', label: 'Corrupt, blank, or unreadable PDF' },
  { value: 'spam_inappropriate', label: 'Spam or inappropriate academic content' },
  { value: 'copyright_concern', label: 'Copyright violation or private examination paper' },
  { value: 'other', label: 'Other concern' },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]['value'];

export const DOCUMENT_STATUSES = ['pending', 'approved', 'rejected', 'removed'] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const USER_ROLES = ['student', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ['active', 'suspended'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];
