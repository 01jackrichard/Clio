import { config } from '@/lib/config';

export interface InstitutionInfo {
  code: string;
  name: string;
  shortName: string;
  domain?: string;
  description: string;
  isPrimary?: boolean;
  documentCount?: number;
}

export function getPrimaryInstitution(): InstitutionInfo {
  return {
    code: 'primary',
    name: config.app?.collegeName || 'Academic Institution',
    shortName: config.app?.collegeShortName || 'College',
    domain: config.app?.collegeDomain || 'yourcollege.edu',
    description: 'Primary institutional repository and campus folios',
    isPrimary: true,
  };
}

export const ANNA_UNIVERSITY_INSTITUTION: InstitutionInfo = {
  code: 'anna-university',
  name: 'Anna University (Affiliated Colleges)',
  shortName: 'Anna Univ',
  domain: 'annauniv.edu',
  description: 'Official Tamil Nadu State Technical University CBCS Curriculum',
  isPrimary: false,
};

/**
 * Returns the verified institutions available in Clio.
 * Integrates the primary configured college with the Anna University CBCS curriculum authority.
 */
export function getAvailableInstitutions(): InstitutionInfo[] {
  const primary = getPrimaryInstitution();
  return [primary, ANNA_UNIVERSITY_INSTITUTION];
}

/**
 * Resolves an institution identifier or query value to a verified institution name.
 * If null, empty, or 'all', returns null (indicating all institutions).
 */
export function resolveInstitutionFilter(val?: string | null): string | null {
  if (!val || val === 'all' || val === 'ALL') {
    return null;
  }
  const clean = val.trim().toLowerCase();
  const primary = getPrimaryInstitution();

  if (
    clean === 'primary' ||
    clean === primary.name.toLowerCase() ||
    clean === primary.shortName.toLowerCase()
  ) {
    return primary.name;
  }

  if (
    clean === 'anna-university' ||
    clean === 'anna_univ' ||
    clean.includes('anna univ')
  ) {
    return ANNA_UNIVERSITY_INSTITUTION.name;
  }

  return val.trim();
}
