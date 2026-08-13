/**
 * __tests__/services/base64.test.js
 *
 * Unit tests for the local base64 decoder used to checksum uploaded PDFs.
 *
 * These exist because the previous implementation called the global `atob`,
 * which Node provides but React Native 0.73 does not — so the bug was
 * invisible to Jest and would only surface on a device. The decoder is now
 * implemented in-app and verified against Node's Buffer as a reference.
 */

// Native modules that cannot run under Node
jest.mock('react-native', () => ({
  NativeModules: {
    PdfExtractorModule: { extractPages: jest.fn() },
  },
}));
jest.mock('react-native-fs', () => ({
  readFile: jest.fn(),
  stat: jest.fn(),
}));
jest.mock('../../src/database/db', () => ({
  insertKnowledgeChunk: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../src/services/auditService', () => ({
  addAuditLog: jest.fn().mockResolvedValue(undefined),
}));

import { createHash } from 'crypto';
import { base64ToBytes, computeChecksum } from '../../src/services/pdfService';

/** Reference decoder — Node's Buffer, independent of the implementation. */
const reference = (b64) => new Uint8Array(Buffer.from(b64, 'base64'));

describe('base64ToBytes', () => {
  it('decodes ASCII text', () => {
    expect(base64ToBytes('SGVsbG8=')).toEqual(
      new Uint8Array([72, 101, 108, 108, 111]),
    );
  });

  it('decodes an empty string to an empty array', () => {
    expect(base64ToBytes('')).toEqual(new Uint8Array([]));
  });

  it.each([
    ['no padding', 'YWJj'],
    ['one padding char', 'YWJjZA=='],
    ['two padding chars', 'YWJjZGU='],
  ])('handles %s', (_label, input) => {
    expect(base64ToBytes(input)).toEqual(reference(input));
  });

  it('decodes UTF-8 Arabic content identically to Buffer', () => {
    const input = Buffer.from('تحضير الأدوية — ICU', 'utf8').toString('base64');
    expect(base64ToBytes(input)).toEqual(reference(input));
  });

  it('decodes binary bytes covering the full 0-255 range', () => {
    const raw = Buffer.from(Array.from({ length: 256 }, (_, i) => i));
    const input = raw.toString('base64');
    expect(base64ToBytes(input)).toEqual(reference(input));
  });

  it('ignores embedded whitespace and newlines', () => {
    expect(base64ToBytes('SGVs\nbG8 =')).toEqual(
      new Uint8Array([72, 101, 108, 108, 111]),
    );
  });

  it('rejects characters outside the base64 alphabet', () => {
    expect(() => base64ToBytes('SGVsbG8!')).toThrow(/invalid base64 character/);
  });

  it('rejects a length that cannot encode whole bytes', () => {
    // 5 significant chars → 5 % 4 === 1, which no valid base64 string produces
    expect(() => base64ToBytes('YWJjZ')).toThrow(/malformed base64/);
  });

  it('tolerates surplus padding characters', () => {
    expect(base64ToBytes('YWJjZA===')).toEqual(reference('YWJjZA=='));
  });

  it('rejects non-string input', () => {
    expect(() => base64ToBytes(null)).toThrow(/must be a string/);
  });

  it('does not depend on a global atob', () => {
    const originalAtob = global.atob;
    // Simulate the React Native runtime, where atob is absent
    delete global.atob;
    try {
      expect(base64ToBytes('SGVsbG8=')).toEqual(
        new Uint8Array([72, 101, 108, 108, 111]),
      );
    } finally {
      global.atob = originalAtob;
    }
  });
});

describe('computeChecksum', () => {
  it('matches a SHA-256 digest computed by Node', () => {
    const input = Buffer.from('CBAHI policy document').toString('base64');
    const expected = createHash('sha256')
      .update(Buffer.from(input, 'base64'))
      .digest('hex');

    expect(computeChecksum(input)).toBe(expected);
  });

  it('is stable across repeated calls', () => {
    const input = Buffer.from('IPSG 3 — Medication Safety').toString('base64');
    expect(computeChecksum(input)).toBe(computeChecksum(input));
  });

  it('changes when a single byte changes', () => {
    const a = Buffer.from('dose: 5 mg').toString('base64');
    const b = Buffer.from('dose: 6 mg').toString('base64');
    expect(computeChecksum(a)).not.toBe(computeChecksum(b));
  });
});
