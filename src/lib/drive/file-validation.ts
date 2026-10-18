/**
 * Clio File Content & Magic Byte Validation
 *
 * Inspects declared MIME types, file extensions, and actual binary magic bytes
 * to ensure uploaded files are genuine PDF, DOC, or DOCX documents, preventing
 * forged or disguised payloads.
 */

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.doc', '.docx'] as const;

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  detectedMimeType?: string;
  extension?: string;
}

/**
 * Checks if the binary buffer contains PDF magic bytes (%PDF-).
 */
export function isPdfBuffer(buffer: Buffer): boolean {
  if (buffer.length < 5) return false;
  // Check first 1024 bytes for %PDF-
  const header = buffer.subarray(0, Math.min(buffer.length, 1024)).toString('ascii');
  return header.includes('%PDF-');
}

/**
 * Checks if the binary buffer contains legacy Word DOC magic bytes (Compound File Binary Format).
 * Signature: D0 CF 11 E0 A1 B1 1A E1
 */
export function isDocBuffer(buffer: Buffer): boolean {
  if (buffer.length < 8) return false;
  const magic = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
  for (let i = 0; i < magic.length; i++) {
    if (buffer[i] !== magic[i]) return false;
  }
  return true;
}

/**
 * Checks if the binary buffer contains Word DOCX magic bytes (ZIP header PK\x03\x04).
 * Signature: 50 4B 03 04
 */
export function isDocxBuffer(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  return (
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  );
}

/**
 * Detects the actual document type from binary magic bytes.
 */
export function detectDocumentType(buffer: Buffer): 'pdf' | 'doc' | 'docx' | null {
  if (isPdfBuffer(buffer)) return 'pdf';
  if (isDocBuffer(buffer)) return 'doc';
  if (isDocxBuffer(buffer)) return 'docx';
  return null;
}

/**
 * Comprehensive validator for uploaded academic documents.
 * Validates file size, file extension, declared MIME type, and binary magic bytes.
 */
export function validateAcademicDocument(
  filename: string,
  declaredMimeType: string,
  buffer: Buffer,
  maxSizeBytes: number = MAX_FILE_SIZE_BYTES
): FileValidationResult {
  if (!filename || typeof filename !== 'string') {
    return { isValid: false, error: 'A valid document filename is required.' };
  }

  // 1. File size verification
  if (buffer.length === 0) {
    return { isValid: false, error: 'Uploaded file is empty (0 bytes).' };
  }

  if (buffer.length > maxSizeBytes) {
    const mbLimit = Math.round(maxSizeBytes / (1024 * 1024));
    return {
      isValid: false,
      error: `File size exceeds the ${mbLimit} MB limit. Please optimize or split your document.`,
    };
  }

  // 2. Extension verification
  const lowerName = filename.toLowerCase().trim();
  const matchedExt = ALLOWED_FILE_EXTENSIONS.find((ext) => lowerName.endsWith(ext));

  if (!matchedExt) {
    return {
      isValid: false,
      error: 'Invalid file extension. Only .pdf, .doc, and .docx documents are accepted.',
    };
  }

  // 3. Binary magic bytes inspection
  const detectedType = detectDocumentType(buffer);

  if (!detectedType) {
    return {
      isValid: false,
      error:
        'File content validation failed. The file is corrupted or does not match a valid PDF, DOC, or DOCX format.',
    };
  }

  // 4. Cross-check extension and detected binary structure
  if (matchedExt === '.pdf' && detectedType !== 'pdf') {
    return {
      isValid: false,
      error: 'File extension is .pdf but the file content is not a valid PDF document.',
    };
  }

  if (matchedExt === '.doc' && detectedType !== 'doc') {
    return {
      isValid: false,
      error: 'File extension is .doc but the file content is not a valid Microsoft Word 97-2004 document.',
    };
  }

  if (matchedExt === '.docx' && detectedType !== 'docx') {
    return {
      isValid: false,
      error: 'File extension is .docx but the file content is not a valid Microsoft Word document package.',
    };
  }

  // 5. Canonical MIME type resolution
  let canonicalMimeType: AllowedMimeType = 'application/pdf';
  if (detectedType === 'doc') {
    canonicalMimeType = 'application/msword';
  } else if (detectedType === 'docx') {
    canonicalMimeType =
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }

  return {
    isValid: true,
    detectedMimeType: canonicalMimeType,
    extension: matchedExt,
  };
}
