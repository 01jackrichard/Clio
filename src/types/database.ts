import {
  Department,
  AcademicYear,
  Semester,
  MaterialTypeValue,
  Unit,
  DocumentStatus,
  UserRole,
  UserStatus,
  ReportReason,
  Regulation,
  Visibility,
} from '@/lib/constants';

export interface Profile {
  id: string; // references auth.users.id
  email: string;
  display_name: string;
  avatar_url?: string | null;
  department?: Department | null;
  academic_year?: AcademicYear | null;
  graduation_year?: number | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface CollectionRecord {
  id: string;
  title: string;
  slug?: string;
  description?: string | null;
  department?: Department | null;
  regulation?: Regulation | string | null;
  academic_year?: AcademicYear | null;
  semester?: Semester | null;
  visibility: Visibility;
  password_hash?: string | null;
  user_id: string;
  owner_id?: string;
  created_at: string;
  updated_at: string;
  // Joined/calculated fields
  owner_name?: string | null;
  documents?: DocumentRecord[];
  document_count?: number;
  is_owner?: boolean;
}

export interface DocumentRecord {
  id: string;
  title: string;
  description?: string | null;
  department: Department;
  academic_year: AcademicYear;
  semester: Semester;
  subject: string;
  subject_code?: string | null;
  regulation?: Regulation | string | null;
  is_verified_subject?: boolean;
  unit?: Unit | null;
  material_type: MaterialTypeValue;
  tags: string[];
  original_filename: string;
  file_key?: string | null;
  drive_file_id?: string | null; // Canonical Google Drive file ID
  submitted_drive_url?: string | null; // Student/contributor submitted review link
  storage_provider?: 'google_drive' | 'r2';
  file_size?: number | null; // in bytes (optional for Drive files)
  mime_type: string;
  uploader_id: string;
  uploader_name?: string | null;
  status: DocumentStatus;
  visibility?: Visibility; // 'public' | 'private'
  password_hash?: string | null; // Salted password hash if visibility === 'private'
  collection_id?: string | null; // Associated collection
  reviewer_id?: string | null;
  review_notes?: string | null;
  download_count: number;
  created_at: string;
  updated_at: string;
  approved_at?: string | null;
}

export interface ReportRecord {
  id: string;
  document_id: string;
  reporter_id: string;
  reason: ReportReason;
  details?: string | null;
  status: 'pending' | 'resolved' | 'dismissed';
  reviewer_id?: string | null;
  review_notes?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  document_title?: string;
  reporter_email?: string;
}

export interface FavoriteRecord {
  id: string;
  user_id: string;
  document_id: string;
  created_at: string;
  // Joined document
  document?: DocumentRecord;
}

export interface DownloadLogRecord {
  id: string;
  document_id: string;
  user_id?: string | null;
  ip_hash?: string | null;
  user_agent?: string | null;
  created_at: string;
}

export interface AuditLogRecord {
  id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface PlatformStats {
  totalApproved: number;
  totalPending: number;
  totalRejected: number;
  totalUsers: number;
  totalIndexedSizeBytes: number;
  totalDownloads: number;
  pendingReports: number;
}
