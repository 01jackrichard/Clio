import { DocumentRecord, CollectionRecord } from './database';

export * from './database';
export * from '@/lib/constants';

export interface DocumentFilterParams {
  q?: string;
  institution?: string;
  mode?: 'all' | 'files' | 'collections' | 'semester';
  department?: string;
  academic_year?: string;
  semester?: string;
  subject?: string;
  subject_code?: string;
  regulation?: string;
  visibility?: string;
  unit?: string;
  material_type?: string;
  sort?: 'newest' | 'downloads' | 'title';
  layout?: 'grid' | 'list';
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unconfigured?: boolean;
  error?: string;
}

export interface SemesterSubjectGroup {
  code?: string;
  name: string;
  department: string;
  semester: string;
  regulation?: string;
  institution?: string;
  documents: DocumentRecord[];
  collections: CollectionRecord[];
  totalResources: number;
}

export interface SemesterGroup {
  semester: string;
  semesterNumber: number;
  subjects: SemesterSubjectGroup[];
  totalResources: number;
}

export interface AcademicYearGroup {
  year: string;
  title: string;
  semesters: SemesterGroup[];
  totalResources: number;
}

export interface DiscoveryOverview {
  totalAll: number;
  totalFiles: number;
  totalCollections: number;
  activeInstitution: string;
}

