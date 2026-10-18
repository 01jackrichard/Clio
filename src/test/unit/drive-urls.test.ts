import { describe, it, expect } from 'vitest';
import {
  extractDriveFileId,
  isValidDriveFileId,
  getDriveEmbedUrl,
  getDriveViewUrl,
  validateDriveInput,
} from '@/lib/drive/urls';

describe('Google Drive URL and File ID Parser', () => {
  const validFileId = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';

  it('extracts file ID from standard /file/d/.../view link', () => {
    const url = `https://drive.google.com/file/d/${validFileId}/view?usp=sharing`;
    expect(extractDriveFileId(url)).toBe(validFileId);
  });

  it('extracts file ID from /file/d/.../preview link', () => {
    const url = `https://drive.google.com/file/d/${validFileId}/preview`;
    expect(extractDriveFileId(url)).toBe(validFileId);
  });

  it('extracts file ID from /file/d/.../edit link', () => {
    const url = `https://drive.google.com/file/d/${validFileId}/edit?usp=drivesdk`;
    expect(extractDriveFileId(url)).toBe(validFileId);
  });

  it('extracts file ID from /open?id=... query parameter format', () => {
    const url = `https://drive.google.com/open?id=${validFileId}`;
    expect(extractDriveFileId(url)).toBe(validFileId);
  });

  it('extracts file ID from /uc?id=... query parameter format', () => {
    const url = `https://drive.google.com/uc?id=${validFileId}&export=download`;
    expect(extractDriveFileId(url)).toBe(validFileId);
  });

  it('extracts file ID from docs.google.com domain', () => {
    const url = `https://docs.google.com/file/d/${validFileId}/view`;
    expect(extractDriveFileId(url)).toBe(validFileId);
  });

  it('accepts raw valid Drive file ID directly', () => {
    expect(extractDriveFileId(validFileId)).toBe(validFileId);
  });

  it('generates strictly formatted canonical embed URL', () => {
    const url = `https://drive.google.com/file/d/${validFileId}/view`;
    expect(getDriveEmbedUrl(url)).toBe(`https://drive.google.com/file/d/${validFileId}/preview`);
    expect(getDriveEmbedUrl(validFileId)).toBe(`https://drive.google.com/file/d/${validFileId}/preview`);
  });

  it('generates canonical view URL', () => {
    expect(getDriveViewUrl(validFileId)).toBe(`https://drive.google.com/file/d/${validFileId}/view`);
  });

  it('rejects malicious javascript: and data: URLs', () => {
    expect(extractDriveFileId('javascript:alert(1)')).toBeNull();
    expect(extractDriveFileId('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(extractDriveFileId('vbscript:msgbox(1)')).toBeNull();
  });

  it('rejects arbitrary third-party domains attempting to imitate Google Drive', () => {
    expect(extractDriveFileId(`https://evil-drive.google.com/file/d/${validFileId}/view`)).toBeNull();
    expect(extractDriveFileId(`https://drive.google.com.attacker.com/file/d/${validFileId}/view`)).toBeNull();
    expect(extractDriveFileId(`https://notgoogle.com/open?id=${validFileId}`)).toBeNull();
  });

  it('rejects malformed, empty, or truncated file IDs', () => {
    expect(extractDriveFileId('')).toBeNull();
    expect(extractDriveFileId('   ')).toBeNull();
    expect(extractDriveFileId('short-id')).toBeNull(); // Less than 25 chars
    expect(extractDriveFileId('https://drive.google.com/file/d//view')).toBeNull();
    expect(isValidDriveFileId('too_short')).toBe(false);
  });

  it('provides structured validation diagnostics through validateDriveInput', () => {
    const validResult = validateDriveInput(`https://drive.google.com/file/d/${validFileId}/view`);
    expect(validResult.isValid).toBe(true);
    expect(validResult.fileId).toBe(validFileId);
    expect(validResult.embedUrl).toBe(`https://drive.google.com/file/d/${validFileId}/preview`);
    expect(validResult.viewUrl).toBe(`https://drive.google.com/file/d/${validFileId}/view`);

    const invalidResult = validateDriveInput('https://some-random-site.com/file.pdf');
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.error).toBeDefined();
    expect(invalidResult.fileId).toBeUndefined();
  });
});
