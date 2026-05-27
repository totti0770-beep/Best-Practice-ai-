/**
 * __tests__/services/pdfService.test.js
 * Unit tests for the PDF processing pipeline.
 */

// Mock native modules that cannot run in a Node.js test environment
jest.mock('react-native-fs', () => ({
  readFile: jest.fn(),
  stat: jest.fn(),
}));
jest.mock('crypto-js', () => ({
  enc: { Base64: { parse: jest.fn(v => v) }, Hex: {} },
  SHA256: jest.fn(() => ({ toString: () => 'abc123' })),
}));
jest.mock('../../src/database/db', () => ({
  insertKnowledgeChunk: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../src/services/auditService', () => ({
  addAuditLog: jest.fn().mockResolvedValue(undefined),
}));

import { createChunks, cleanText } from '../../src/services/pdfService';

// ── createChunks ─────────────────────────────────────────────────────────────

describe('createChunks', () => {
  it('returns a single chunk when text is shorter than size', () => {
    expect(createChunks('hello', 800, 100)).toEqual(['hello']);
  });

  it('produces overlapping chunks', () => {
    const text = 'A'.repeat(900);
    const chunks = createChunks(text, 800, 100);
    expect(chunks.length).toBe(2);
    // Second chunk starts at offset 700 (800 - 100 overlap)
    expect(chunks[1]).toBe(text.slice(700));
  });

  it('handles text exactly equal to chunk size', () => {
    const text = 'X'.repeat(800);
    expect(createChunks(text, 800, 100)).toHaveLength(1);
  });

  it('returns empty array for empty string', () => {
    expect(createChunks('', 800, 100)).toEqual([]);
  });

  it('does not produce empty trailing chunks', () => {
    const text = 'B'.repeat(1600);
    const chunks = createChunks(text, 800, 100);
    chunks.forEach(c => expect(c.length).toBeGreaterThan(0));
  });
});

// ── cleanText ────────────────────────────────────────────────────────────────

describe('cleanText', () => {
  it('normalises multiple spaces to single space', () => {
    expect(cleanText('hello   world')).toBe('hello world');
  });

  it('preserves Arabic characters', () => {
    const arabic = 'دواء الأدرينالين';
    expect(cleanText(arabic)).toBe(arabic);
  });

  it('preserves Latin letters and digits', () => {
    expect(cleanText('Ceftriaxone 1g IV')).toBe('Ceftriaxone 1g IV');
  });

  it('strips control characters and binary artefacts', () => {
    const dirty = 'valid\x00text\x01here';
    expect(cleanText(dirty)).toBe('valid text here');
  });

  it('preserves clinical punctuation', () => {
    expect(cleanText('Rate: 100 mg/hr (max 200%)')).toBe('Rate: 100 mg/hr (max 200%)');
  });

  it('trims leading and trailing whitespace', () => {
    expect(cleanText('  hello  ')).toBe('hello');
  });

  it('handles empty string', () => {
    expect(cleanText('')).toBe('');
  });
});
