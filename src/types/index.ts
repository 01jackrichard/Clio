export * from './database';
export * from '@/lib/constants';

export interface DocumentFilterParams {
  q?: string;
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
