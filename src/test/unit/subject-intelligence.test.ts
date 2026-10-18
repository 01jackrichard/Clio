import { describe, it, expect } from 'vitest';
import {
  searchAnnaUniversitySubjects,
  findSubjectByCode,
} from '@/lib/services/subject-service';
import { ANNA_UNIVERSITY_SUBJECTS } from '@/lib/data/anna-university-subjects';

describe('Anna University Curriculum Intelligence & Autocomplete', () => {
  it('loads official syllabus dataset with verified course codes', () => {
    expect(ANNA_UNIVERSITY_SUBJECTS.length).toBeGreaterThan(40);

    // Verify key fields exist on every record
    ANNA_UNIVERSITY_SUBJECTS.forEach((s) => {
      expect(s.code).toMatch(/^[A-Z]{2,3}[0-9]{3,4}$/);
      expect(s.title.length).toBeGreaterThan(3);
      expect(s.regulation).toMatch(/^(2021|2017)$/);
      expect(s.department).toBeDefined();
      expect(s.semester).toBeDefined();
    });
  });

  it('accurately resolves course code exact match (e.g. CS3351)', () => {
    const results = searchAnnaUniversitySubjects({ query: 'CS3351' });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].code).toBe('CS3351');
    expect(results[0].title).toBe('Digital Principles and Computer Organization');
    expect(results[0].department).toBe('Computer Science & Engineering');
  });

  it('accurately resolves course code prefix match (e.g. CS3)', () => {
    const results = searchAnnaUniversitySubjects({ query: 'CS3' });
    expect(results.length).toBeGreaterThan(1);
    results.forEach((s) => {
      expect(s.code.startsWith('CS3') || s.title.toLowerCase().includes('cs3')).toBe(true);
    });
  });

  it('searches subjects by title substring (e.g. "Data Structures")', () => {
    const results = searchAnnaUniversitySubjects({ query: 'Data Structures' });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title).toContain('Data Structures');
  });

  it('filters syllabus by regulation (2021 vs 2017)', () => {
    const reg2021 = searchAnnaUniversitySubjects({ query: 'Engineering', regulation: '2021' });
    reg2021.forEach((s) => {
      expect(s.regulation).toBe('2021');
    });

    const reg2017 = searchAnnaUniversitySubjects({ query: 'Engineering', regulation: '2017' });
    reg2017.forEach((s) => {
      expect(s.regulation).toBe('2017');
    });
  });

  it('finds subject by code using findSubjectByCode', () => {
    const subject = findSubjectByCode('GE3151');
    expect(subject).toBeDefined();
    expect(subject?.title).toBe('Problem Solving and Python Programming');

    const nonexistent = findSubjectByCode('ZZ9999');
    expect(nonexistent).toBeNull();
  });
});
