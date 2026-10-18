/**
 * Anna University Subject Intelligence & Autocomplete Service
 */

import {
  ANNA_UNIVERSITY_SUBJECTS,
  AnnaUniversitySubject,
} from '@/lib/data/anna-university-subjects';
import { Department, Semester, Regulation } from '@/lib/constants';

export interface SubjectSearchParams {
  query: string;
  department?: Department | string | null;
  regulation?: Regulation | string | null;
  semester?: Semester | string | null;
  limit?: number;
}

export function searchAnnaUniversitySubjects({
  query,
  department,
  regulation,
  semester,
  limit = 8,
}: SubjectSearchParams): AnnaUniversitySubject[] {
  const cleanQuery = query.trim().toLowerCase();

  // If query is empty, return top subjects optionally filtered
  let pool = ANNA_UNIVERSITY_SUBJECTS;

  if (regulation && regulation !== 'Other / Autonomous') {
    pool = pool.filter((s) => s.regulation === regulation);
  }

  if (department) {
    pool = pool.filter(
      (s) =>
        s.department === department ||
        s.department === 'Applied Sciences & Humanities'
    );
  }

  if (semester) {
    pool = pool.filter((s) => s.semester === semester);
  }

  if (!cleanQuery) {
    return pool.slice(0, limit);
  }

  // Scored matching
  interface ScoredSubject {
    subject: AnnaUniversitySubject;
    score: number;
  }

  const scored: ScoredSubject[] = [];

  for (const s of pool) {
    const codeLower = s.code.toLowerCase();
    const titleLower = s.title.toLowerCase();

    let score = 0;

    if (codeLower === cleanQuery) {
      score = 100;
    } else if (codeLower.startsWith(cleanQuery)) {
      score = 80;
    } else if (codeLower.includes(cleanQuery)) {
      score = 60;
    } else if (titleLower.startsWith(cleanQuery)) {
      score = 50;
    } else if (titleLower.includes(cleanQuery)) {
      score = 30;
    }

    if (score > 0) {
      scored.push({ subject: s, score });
    }
  }

  // Sort descending by score, then alphabetically by code
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.subject.code.localeCompare(b.subject.code);
  });

  return scored.slice(0, limit).map((s) => s.subject);
}

export function findSubjectByCode(
  code: string,
  regulation?: Regulation | string
): AnnaUniversitySubject | null {
  const clean = code.trim().toUpperCase();
  const match = ANNA_UNIVERSITY_SUBJECTS.find(
    (s) =>
      s.code.toUpperCase() === clean &&
      (!regulation || s.regulation === regulation)
  );
  return match || null;
}
