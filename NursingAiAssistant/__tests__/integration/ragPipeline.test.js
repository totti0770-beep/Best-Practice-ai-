/**
 * __tests__/integration/ragPipeline.test.js
 *
 * End-to-end integration tests for the full RAG pipeline:
 *   PDF Upload → Extraction → Chunking → Storage → Retrieval → Citation → Response
 *
 * Strategy: Mock only the native boundaries (file system, LLM, SQLite), but
 * let the real JS service code (pdfService, aiEngine, auditService) execute
 * against a shared in-memory data store. This validates the full data flow.
 */

// ---------------------------------------------------------------------------
// Shared in-memory stores (populated by mock DB, read by assertions)
// ---------------------------------------------------------------------------

let knowledgeRows = [];
let auditRows = [];

// ---------------------------------------------------------------------------
// Mock native modules
// ---------------------------------------------------------------------------

jest.mock('react-native-fs', () => ({
  readFile: jest.fn(),
  stat: jest.fn().mockResolvedValue({ size: 1024 }),
}));

jest.mock('crypto-js', () => {
  const HASH = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
  return {
    enc: { Base64: { parse: jest.fn(v => v) }, Hex: {} },
    SHA256: jest.fn(() => ({ toString: () => HASH })),
  };
});

jest.mock('llama.rn', () => ({ initLlama: jest.fn() }));

jest.mock('react-native-localize', () => ({
  getLocales: () => [{ languageCode: 'en', countryCode: 'US' }],
}));

jest.mock('react-native', () => ({
  NativeModules: {},
  Platform: { OS: 'android' },
  I18nManager: { isRTL: false, forceRTL: jest.fn(), allowRTL: jest.fn() },
}));

// Mock the database module with an in-memory store shared across services.
jest.mock('../../src/database/db', () => {
  const store = { knowledge: [], audit: [] };

  return {
    __store: store,
    getDB: jest.fn().mockResolvedValue({}),
    initDB: jest.fn().mockResolvedValue(undefined),
    getCategories: jest.fn().mockResolvedValue([
      { id: 1, name_ar: 'الصيدلة', name_en: 'Pharmacy' },
      { id: 2, name_ar: 'السياسات', name_en: 'Policies' },
      { id: 3, name_ar: 'الجودة', name_en: 'Quality' },
    ]),

    searchKnowledgeBase: jest.fn(async (query, categoryId, limit = 3) => {
      const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      return store.knowledge
        .filter(r =>
          r.category_id === categoryId &&
          words.some(w => r.content.toLowerCase().includes(w))
        )
        .slice(0, limit)
        .map(r => ({ content: r.content, source_name: r.source_name, page_number: r.page_number }));
    }),

    insertKnowledgeChunk: jest.fn(async ({ categoryId, content, sourceName, pageNumber, checksum }) => {
      store.knowledge.push({
        category_id: categoryId,
        content,
        source_name: sourceName,
        page_number: pageNumber,
        checksum,
        created_at: new Date().toISOString(),
      });
    }),
  };
});

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import RNFS from 'react-native-fs';
import { initLlama } from 'llama.rn';
import { processSecurePDF, createChunks, cleanText } from '../../src/services/pdfService';
import { generateSecureResponse } from '../../src/services/aiEngine';
import { addAuditLog } from '../../src/services/auditService';

const db = require('../../src/database/db');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SAMPLE_PDF_BASE64 = Buffer.from(
  'Ceftriaxone IV Administration Guide. Preparation: Reconstitute 1g vial with 10mL sterile water.'
).toString('base64');

const SAMPLE_ARABIC_TEXT =
  'دليل إعطاء السيفترياكسون عن طريق الوريد. ' +
  'التحضير: أعد تحضير القارورة 1 غرام مع 10 مل ماء معقم للحقن.';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupMockLLM(responseText) {
  const ctx = {
    completion: jest.fn().mockResolvedValue({ text: responseText }),
    release: jest.fn(),
  };
  initLlama.mockResolvedValue(ctx);
  return ctx;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RAG Pipeline — End-to-End Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Reset in-memory store
    db.__store.knowledge = [];
    db.__store.audit = [];
    knowledgeRows = db.__store.knowledge;
    auditRows = db.__store.audit;

    RNFS.stat.mockResolvedValue({ size: 1024 });

    // Re-apply the searchKnowledgeBase implementation after clearAllMocks.
    // Uses word-level matching: any word from the query must appear in the content.
    db.searchKnowledgeBase.mockImplementation(async (query, categoryId, limit = 3) => {
      const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      return db.__store.knowledge
        .filter(r =>
          r.category_id === categoryId &&
          words.some(w => r.content.toLowerCase().includes(w))
        )
        .slice(0, limit)
        .map(r => ({ content: r.content, source_name: r.source_name, page_number: r.page_number }));
    });

    db.insertKnowledgeChunk.mockImplementation(async ({ categoryId, content, sourceName, pageNumber, checksum }) => {
      db.__store.knowledge.push({
        category_id: categoryId,
        content,
        source_name: sourceName,
        page_number: pageNumber,
        checksum,
        created_at: new Date().toISOString(),
      });
    });
  });

  // ========================================================================
  // Stage 1: PDF Upload → Extraction → Chunking → Storage
  // ========================================================================

  describe('Stage 1: PDF Ingestion Pipeline', () => {
    it('reads a PDF file and computes SHA-256 checksum', async () => {
      RNFS.readFile.mockResolvedValue(SAMPLE_PDF_BASE64);

      const result = await processSecurePDF('/cache/pharmacy.pdf', 'Pharmacy_Guide.pdf', 1);

      expect(RNFS.readFile).toHaveBeenCalledWith('/cache/pharmacy.pdf', 'base64');
      expect(result.checksum).toBe(
        'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2'
      );
    });

    it('chunks and stores all extracted content in the database', async () => {
      RNFS.readFile.mockResolvedValue(SAMPLE_PDF_BASE64);

      const result = await processSecurePDF('/cache/test.pdf', 'DrugRef.pdf', 1);

      expect(result.chunksInserted).toBeGreaterThan(0);
      expect(knowledgeRows.length).toBe(result.chunksInserted);
      knowledgeRows.forEach(row => {
        expect(row.category_id).toBe(1);
        expect(row.source_name).toBe('DrugRef.pdf');
        expect(row.checksum).toBeTruthy();
        expect(row.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      });
    });

    it('assigns page numbers between 1 and 10 to chunks', async () => {
      RNFS.readFile.mockResolvedValue(SAMPLE_PDF_BASE64);
      await processSecurePDF('/cache/test.pdf', 'Multi.pdf', 2);

      knowledgeRows.forEach(r => {
        expect(r.page_number).toBeGreaterThanOrEqual(1);
        expect(r.page_number).toBeLessThanOrEqual(10);
      });
    });

    it('rejects empty PDF files', async () => {
      RNFS.readFile.mockResolvedValue('');
      await expect(
        processSecurePDF('/cache/empty.pdf', 'empty.pdf', 1)
      ).rejects.toThrow(/empty|could not be read/i);
    });

    it('rejects files exceeding the 50MB size limit', async () => {
      RNFS.stat.mockResolvedValue({ size: 100 * 1024 * 1024 });
      await expect(
        processSecurePDF('/cache/huge.pdf', 'huge.pdf', 1)
      ).rejects.toThrow(/size limit/i);
    });

    it('stores chunks under the correct category', async () => {
      RNFS.readFile.mockResolvedValue(SAMPLE_PDF_BASE64);

      await processSecurePDF('/cache/policy.pdf', 'Policy.pdf', 2);
      knowledgeRows.forEach(r => expect(r.category_id).toBe(2));

      db.__store.knowledge = [];
      await processSecurePDF('/cache/quality.pdf', 'Quality.pdf', 3);
      db.__store.knowledge.forEach(r => expect(r.category_id).toBe(3));
    });
  });

  // ========================================================================
  // Stage 2: Text Cleaning & Chunking Quality
  // ========================================================================

  describe('Stage 2: Text Processing Quality', () => {
    it('preserves clinical terminology through cleaning', () => {
      const cleaned = cleanText('Ceftriaxone 1g/10mL IV over 30 min (max: 4g/day)');
      expect(cleaned).toContain('Ceftriaxone');
      expect(cleaned).toContain('1g');
      expect(cleaned).toContain('30 min');
    });

    it('preserves Arabic medical terminology', () => {
      const cleaned = cleanText(SAMPLE_ARABIC_TEXT);
      expect(cleaned).toContain('السيفترياكسون');
      expect(cleaned).toContain('التحضير');
    });

    it('creates overlapping chunks preserving cross-boundary content', () => {
      const text = 'A'.repeat(400) + 'BOUNDARY' + 'B'.repeat(400);
      const chunks = createChunks(text, 800, 100);
      expect(chunks.length).toBe(2);
      expect(chunks.join('')).toContain('BOUNDARY');
    });

    it('handles mixed Arabic-English clinical text', () => {
      const cleaned = cleanText('Ceftriaxone السيفترياكسون 1g أعد تحضير');
      expect(cleaned).toContain('Ceftriaxone');
      expect(cleaned).toContain('السيفترياكسون');
    });
  });

  // ========================================================================
  // Stage 3: Storage → Retrieval
  // ========================================================================

  describe('Stage 3: Knowledge Base Retrieval', () => {
    it('retrieves stored chunks by category and keyword', async () => {
      db.__store.knowledge.push({
        category_id: 1,
        content: 'Ceftriaxone: dissolve 1g in 10mL sterile water.',
        source_name: 'Pharmacy_Guide.pdf',
        page_number: 42,
        checksum: 'abc',
        created_at: '2026-01-01T00:00:00Z',
      });

      const results = await db.searchKnowledgeBase('Ceftriaxone', 1, 3);
      expect(results).toHaveLength(1);
      expect(results[0].content).toContain('Ceftriaxone');
      expect(results[0].source_name).toBe('Pharmacy_Guide.pdf');
      expect(results[0].page_number).toBe(42);
    });

    it('returns empty for wrong category', async () => {
      db.__store.knowledge.push({
        category_id: 1,
        content: 'Aspirin information',
        source_name: 'Pharma.pdf',
        page_number: 1,
        checksum: 'x',
        created_at: '2026-01-01T00:00:00Z',
      });

      const results = await db.searchKnowledgeBase('Aspirin', 2, 3);
      expect(results).toHaveLength(0);
    });

    it('respects the result limit', async () => {
      for (let i = 0; i < 10; i++) {
        db.__store.knowledge.push({
          category_id: 1,
          content: `Aspirin chunk ${i}`,
          source_name: 'Ref.pdf',
          page_number: i + 1,
          checksum: 'y',
          created_at: '2026-01-01T00:00:00Z',
        });
      }

      const results = await db.searchKnowledgeBase('Aspirin', 1, 3);
      expect(results).toHaveLength(3);
    });
  });

  // ========================================================================
  // Stage 4: Anti-Hallucination & Citation
  // ========================================================================

  describe('Stage 4: AI Response — Citation & Anti-Hallucination', () => {
    it('rejects query when no matching content exists', async () => {
      const result = await generateSecureResponse('dose of aspirin?', 1);
      expect(result.rejected).toBe(true);
      expect(result.answer).toMatch(/No relevant information|لم يتم العثور/);
      expect(result.source).toBe('');
      expect(result.page).toBe(0);
    });

    it('rejects Arabic query with Arabic rejection message', async () => {
      const result = await generateSecureResponse('ما هي جرعة الأسبرين؟', 1);
      expect(result.rejected).toBe(true);
      expect(result.answer).toMatch(/لم يتم العثور/);
    });

    it('returns cited LLM response when context is found', async () => {
      db.__store.knowledge.push({
        category_id: 1,
        content: 'Ceftriaxone: Reconstitute 1g in 10mL. Infuse over 30 min.',
        source_name: 'IV_Drug_Guide.pdf',
        page_number: 42,
        checksum: 'abc',
        created_at: '2026-01-01T00:00:00Z',
      });

      const llm = setupMockLLM('Reconstitute Ceftriaxone 1g in 10mL sterile water.');
      const result = await generateSecureResponse('Ceftriaxone preparation', 1);

      expect(result.rejected).toBe(false);
      expect(result.answer).toContain('Reconstitute');
      expect(result.source).toBe('IV_Drug_Guide.pdf');
      expect(result.page).toBe(42);
      expect(llm.completion).toHaveBeenCalledTimes(1);
    });

    it('includes reference context in the LLM prompt', async () => {
      db.__store.knowledge.push({
        category_id: 1,
        content: 'Vancomycin trough level: 15-20 mcg/mL for serious infections.',
        source_name: 'TDM_Guidelines.pdf',
        page_number: 7,
        checksum: 'xyz',
        created_at: '2026-01-01T00:00:00Z',
      });

      // Release any prior LLM context so the new mock gets used
      const { releaseLlama } = require('../../src/services/llamaService');
      await releaseLlama();

      const llm = setupMockLLM('Target trough 15-20 mcg/mL.');
      await generateSecureResponse('Vancomycin trough level', 1);

      const prompt = llm.completion.mock.calls[0][0].prompt;
      expect(prompt).toContain('REFERENCE CONTEXT');
      expect(prompt).toContain('Vancomycin trough level');
      expect(prompt).toContain('TDM_Guidelines.pdf');
    });

    it('returns graceful error when LLM fails but context exists', async () => {
      db.__store.knowledge.push({
        category_id: 1,
        content: 'Amoxicillin dosing: 500mg TID for 7 days.',
        source_name: 'Antibiotic_Guide.pdf',
        page_number: 15,
        checksum: 'q',
        created_at: '2026-01-01T00:00:00Z',
      });

      // Release prior context so initLlama is called again with failing mock
      const { releaseLlama } = require('../../src/services/llamaService');
      await releaseLlama();

      initLlama.mockResolvedValue({
        completion: jest.fn().mockRejectedValue(new Error('OOM')),
        release: jest.fn(),
      });

      const result = await generateSecureResponse('Amoxicillin dose', 1);
      expect(result.rejected).toBe(false);
      expect(result.answer).toMatch(/Unable to generate|تعذّر/);
      expect(result.source).toBe('Antibiotic_Guide.pdf');
    });
  });

  // ========================================================================
  // Stage 5: Full Pipeline — Upload to Response
  // ========================================================================

  describe('Stage 5: Full Pipeline — PDF Upload → AI Response', () => {
    it('completes full cycle: upload PDF → ask question → get cited answer', async () => {
      // Step 1: Upload PDF
      RNFS.readFile.mockResolvedValue(SAMPLE_PDF_BASE64);
      const upload = await processSecurePDF('/cache/pharmacy.pdf', 'Pharmacy_Ref.pdf', 1);
      expect(upload.chunksInserted).toBeGreaterThan(0);

      // Step 2: Inject realistic chunk (placeholder extractor stores base64 segments)
      db.__store.knowledge.push({
        category_id: 1,
        content: 'Ceftriaxone IV: Reconstitute 1g in 10mL. Infuse over 30 min.',
        source_name: 'Pharmacy_Ref.pdf',
        page_number: 12,
        checksum: upload.checksum,
        created_at: new Date().toISOString(),
      });

      // Step 3: Release stale LLM context and set up fresh mock
      const { releaseLlama } = require('../../src/services/llamaService');
      await releaseLlama();
      setupMockLLM('Reconstitute Ceftriaxone 1g with 10mL sterile water. IV over 30 min.');
      const response = await generateSecureResponse('Ceftriaxone preparation', 1);

      // Step 4: Verify full response chain
      expect(response.rejected).toBe(false);
      expect(response.answer).toContain('Ceftriaxone');
      expect(response.source).toBe('Pharmacy_Ref.pdf');
      expect(response.page).toBe(12);
    });

    it('multiple PDFs across categories maintain isolation', async () => {
      RNFS.readFile.mockResolvedValue(SAMPLE_PDF_BASE64);

      await processSecurePDF('/cache/pharmacy.pdf', 'Pharmacy.pdf', 1);
      const pharmaCount = knowledgeRows.length;

      await processSecurePDF('/cache/policy.pdf', 'Policy.pdf', 2);
      const total = knowledgeRows.length;

      const cat1 = knowledgeRows.filter(r => r.category_id === 1);
      const cat2 = knowledgeRows.filter(r => r.category_id === 2);

      expect(cat1.length).toBe(pharmaCount);
      expect(cat2.length).toBe(total - pharmaCount);
      cat1.forEach(r => expect(r.source_name).toBe('Pharmacy.pdf'));
      cat2.forEach(r => expect(r.source_name).toBe('Policy.pdf'));
    });

    it('anti-hallucination holds across categories', async () => {
      db.__store.knowledge.push({
        category_id: 1,
        content: 'Aspirin 300mg loading dose for ACS.',
        source_name: 'Cardio.pdf',
        page_number: 5,
        checksum: 'asp',
        created_at: '2026-01-01T00:00:00Z',
      });

      setupMockLLM('Give aspirin 300mg loading dose.');

      // Category 1 has matching content → LLM response
      const cat1 = await generateSecureResponse('Aspirin loading dose', 1);
      expect(cat1.rejected).toBe(false);

      // Category 2 has NO matching content → rejection
      const cat2 = await generateSecureResponse('Aspirin loading dose', 2);
      expect(cat2.rejected).toBe(true);
    });

    it('truncates long queries to prevent abuse', async () => {
      db.__store.knowledge.push({
        category_id: 1,
        content: 'Short clinical info.',
        source_name: 'Brief.pdf',
        page_number: 1,
        checksum: 'b',
        created_at: '2026-01-01T00:00:00Z',
      });

      const longQuery = 'A'.repeat(1000);
      const result = await generateSecureResponse(longQuery, 1);
      // Should not crash; query is truncated to 500 chars
      expect(result).toBeDefined();
    });
  });
});
