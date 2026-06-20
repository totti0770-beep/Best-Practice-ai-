/**
 * __tests__/services/aiEngine.test.js
 * Unit tests for the RAG engine — focusing on the anti-hallucination guard
 * and language detection, which are the safety-critical paths.
 */

jest.mock('../../src/database/db', () => ({
  searchKnowledgeBase: jest.fn(),
}));
jest.mock('../../src/services/llamaService', () => ({
  getLlamaCompletion: jest.fn(),
}));
jest.mock('../../src/services/auditService', () => ({
  addAuditLog: jest.fn().mockResolvedValue(undefined),
}));

import { searchKnowledgeBase } from '../../src/database/db';
import { getLlamaCompletion } from '../../src/services/llamaService';
import { generateSecureResponse } from '../../src/services/aiEngine';

const MOCK_CHUNK = {
  content: 'Ceftriaxone IV preparation: dissolve 1g in 10ml sterile water.',
  source_name: 'Pharmacy_Guide_2024.pdf',
  page_number: 42,
};

describe('generateSecureResponse — anti-hallucination guard', () => {
  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => jest.clearAllMocks());

  it('returns rejected=true when no knowledge chunks found', async () => {
    searchKnowledgeBase.mockResolvedValue([]);
    const result = await generateSecureResponse('ceftriaxone dose', 1);
    expect(result.rejected).toBe(true);
    expect(getLlamaCompletion).not.toHaveBeenCalled();
  });

  it('returns Arabic rejection message for Arabic query with no context', async () => {
    searchKnowledgeBase.mockResolvedValue([]);
    const result = await generateSecureResponse('جرعة السيفترياكسون', 1);
    expect(result.rejected).toBe(true);
    expect(result.answer).toMatch(/لم يتم العثور/);
  });

  it('returns English rejection message for English query with no context', async () => {
    searchKnowledgeBase.mockResolvedValue([]);
    const result = await generateSecureResponse('ceftriaxone dose', 1);
    expect(result.rejected).toBe(true);
    expect(result.answer).toMatch(/No relevant information/i);
  });

  it('calls LLM when context is found', async () => {
    searchKnowledgeBase.mockResolvedValue([MOCK_CHUNK]);
    getLlamaCompletion.mockResolvedValue('Dissolve in 10ml sterile water...');
    const result = await generateSecureResponse('ceftriaxone', 1);
    expect(getLlamaCompletion).toHaveBeenCalledTimes(1);
    expect(result.rejected).toBe(false);
    expect(result.source).toBe(MOCK_CHUNK.source_name);
    expect(result.page).toBe(MOCK_CHUNK.page_number);
  });

  it('returns rejected=false with graceful message on LLM failure', async () => {
    searchKnowledgeBase.mockResolvedValue([MOCK_CHUNK]);
    getLlamaCompletion.mockRejectedValue(new Error('model not loaded'));
    const result = await generateSecureResponse('ceftriaxone', 1);
    expect(result.rejected).toBe(false);
    expect(result.answer).toMatch(/Unable to generate|تعذّر/);
  });

  it('returns rejected=true on DB search failure', async () => {
    searchKnowledgeBase.mockRejectedValue(new Error('db error'));
    const result = await generateSecureResponse('ceftriaxone', 1);
    expect(result.rejected).toBe(true);
  });
});

describe('language detection', () => {
  afterEach(() => jest.clearAllMocks());

  it('detects Arabic and passes Arabic prompt to LLM', async () => {
    searchKnowledgeBase.mockResolvedValue([MOCK_CHUNK]);
    getLlamaCompletion.mockResolvedValue('الإجابة');
    await generateSecureResponse('ما هي جرعة السيفترياكسون؟', 1);
    const [prompt] = getLlamaCompletion.mock.calls[0];
    expect(prompt).toMatch(/أنت مساعد تمريض/);
  });

  it('detects English and passes English prompt to LLM', async () => {
    searchKnowledgeBase.mockResolvedValue([MOCK_CHUNK]);
    getLlamaCompletion.mockResolvedValue('Answer here');
    await generateSecureResponse('ceftriaxone dose', 1);
    const [prompt] = getLlamaCompletion.mock.calls[0];
    expect(prompt).toMatch(/You are a specialised clinical/);
  });
});
