/**
 * __tests__/services/pdfService.test.js
 * Unit tests for the PDF processing pipeline.
 */

// Mock native modules that cannot run in a Node.js test environment
jest.mock('react-native', () => ({
  NativeModules: {
    PdfExtractorModule: { extractPages: jest.fn() },
  },
}));
jest.mock('react-native-fs', () => ({
  readFile: jest.fn(),
  stat: jest.fn(),
}));
jest.mock('@noble/hashes/sha256', () => ({
  sha256: jest.fn(() => new Uint8Array([0xab, 0xc1, 0x23])),
}));
jest.mock('@noble/hashes/utils', () => ({
  bytesToHex: jest.fn(() => 'abc123'),
}));
jest.mock('../../src/database/db', () => ({
  insertKnowledgeChunk: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../src/services/auditService', () => ({
  addAuditLog: jest.fn().mockResolvedValue(undefined),
}));

import { NativeModules } from 'react-native';
import RNFS from 'react-native-fs';
import { insertKnowledgeChunk } from '../../src/database/db';
import { createChunks, cleanText, processSecurePDF } from '../../src/services/pdfService';

const mockExtractPages = NativeModules.PdfExtractorModule.extractPages;

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

// ── processSecurePDF (native extraction) ─────────────────────────────────────

describe('processSecurePDF — native PDF extraction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    RNFS.stat.mockResolvedValue({ size: 1024 });
    RNFS.readFile.mockResolvedValue('base64data');
  });

  it('extracts pages via the native module and stores chunks', async () => {
    mockExtractPages.mockResolvedValue([
      { pageNumber: 1, text: 'Ceftriaxone 1g IV reconstitution guide.' },
      { pageNumber: 2, text: 'Infuse over 30 minutes. Monitor for reactions.' },
    ]);

    const result = await processSecurePDF('/cache/drug.pdf', 'Drug.pdf', 1);

    expect(mockExtractPages).toHaveBeenCalledWith('/cache/drug.pdf');
    expect(result.chunksInserted).toBe(2);
    expect(insertKnowledgeChunk).toHaveBeenCalledTimes(2);
    const firstChunk = insertKnowledgeChunk.mock.calls[0][0];
    expect(firstChunk.content).toContain('Ceftriaxone');
    expect(firstChunk.pageNumber).toBe(1);
    expect(firstChunk.sourceName).toBe('Drug.pdf');
  });

  it('throws when the PDF yields no extractable text', async () => {
    mockExtractPages.mockResolvedValue([]);
    await expect(
      processSecurePDF('/cache/scanned.pdf', 'Scanned.pdf', 1)
    ).rejects.toThrow(/no extractable text/i);
  });

  it('skips blank pages without inserting empty chunks', async () => {
    mockExtractPages.mockResolvedValue([
      { pageNumber: 1, text: '   ' },
      { pageNumber: 2, text: 'Real clinical content here.' },
    ]);

    const result = await processSecurePDF('/cache/mixed.pdf', 'Mixed.pdf', 2);

    expect(result.chunksInserted).toBe(1);
    expect(insertKnowledgeChunk).toHaveBeenCalledTimes(1);
  });

  it('rejects files over the size limit before extraction', async () => {
    RNFS.stat.mockResolvedValue({ size: 100 * 1024 * 1024 });
    await expect(
      processSecurePDF('/cache/huge.pdf', 'Huge.pdf', 1)
    ).rejects.toThrow(/size limit/i);
    expect(mockExtractPages).not.toHaveBeenCalled();
  });
});
