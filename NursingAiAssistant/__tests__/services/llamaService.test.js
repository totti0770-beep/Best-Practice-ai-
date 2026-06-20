/**
 * __tests__/services/llamaService.test.js
 * Unit tests for the offline LLM inference wrapper.
 */

jest.mock('llama.rn', () => ({
  initLlama: jest.fn(),
}));

import { initLlama } from 'llama.rn';
import { initializeLlama, getLlamaCompletion, releaseLlama } from '../../src/services/llamaService';

describe('llamaService', () => {
  let mockContext;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockContext = {
      completion: jest.fn().mockResolvedValue({ text: 'Test response' }),
      release: jest.fn().mockResolvedValue(undefined),
    };
    initLlama.mockResolvedValue(mockContext);

    // Reset the singleton by releasing any prior context
    return releaseLlama();
  });

  describe('initializeLlama', () => {
    it('calls initLlama with model path and params', async () => {
      await initializeLlama();

      expect(initLlama).toHaveBeenCalledTimes(1);
      const args = initLlama.mock.calls[0][0];
      expect(args.model).toBe('asset://models/nursing_model.gguf');
      expect(args.n_ctx).toBe(2048);
      expect(args.n_gpu_layers).toBe(0);
    });

    it('reuses existing context on subsequent calls', async () => {
      await initializeLlama();
      await initializeLlama();

      expect(initLlama).toHaveBeenCalledTimes(1);
    });

    it('throws and resets context when model loading fails', async () => {
      initLlama.mockRejectedValue(new Error('Model file not found'));

      await expect(initializeLlama()).rejects.toThrow(/could not be loaded/i);

      // Context should be null, allowing retry
      initLlama.mockResolvedValue(mockContext);
      await initializeLlama();
      expect(initLlama).toHaveBeenCalledTimes(2);
    });
  });

  describe('getLlamaCompletion', () => {
    it('lazy-initializes the model on first call', async () => {
      const result = await getLlamaCompletion('Test prompt');

      expect(initLlama).toHaveBeenCalledTimes(1);
      expect(result).toBe('Test response');
    });

    it('passes prompt and completion params to the context', async () => {
      await getLlamaCompletion('Clinical question here');

      expect(mockContext.completion).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'Clinical question here',
          temperature: 0.1,
          n_predict: 512,
          top_p: 0.9,
          top_k: 40,
        })
      );
    });

    it('trims whitespace from response text', async () => {
      mockContext.completion.mockResolvedValue({ text: '  trimmed answer  ' });
      const result = await getLlamaCompletion('prompt');
      expect(result).toBe('trimmed answer');
    });

    it('throws on empty LLM response', async () => {
      mockContext.completion.mockResolvedValue({ text: '' });
      await expect(getLlamaCompletion('prompt')).rejects.toThrow(/Empty response/i);
    });

    it('throws on null response text', async () => {
      mockContext.completion.mockResolvedValue({ text: null });
      await expect(getLlamaCompletion('prompt')).rejects.toThrow(/Empty response/i);
    });

    it('throws on inference failure', async () => {
      mockContext.completion.mockRejectedValue(new Error('CUDA OOM'));
      await expect(getLlamaCompletion('prompt')).rejects.toThrow(/inference failed/i);
    });
  });

  describe('releaseLlama', () => {
    it('releases the context and allows re-initialization', async () => {
      await initializeLlama();
      await releaseLlama();

      expect(mockContext.release).toHaveBeenCalledTimes(1);

      // Should re-initialize on next call
      await initializeLlama();
      expect(initLlama).toHaveBeenCalledTimes(2);
    });

    it('is a no-op when no context exists', async () => {
      await releaseLlama();
      // Should not throw
    });

    it('resets context even if release throws', async () => {
      await initializeLlama();
      mockContext.release.mockRejectedValue(new Error('release error'));

      await releaseLlama();

      // Context should be null — next init should create new one
      await initializeLlama();
      expect(initLlama).toHaveBeenCalledTimes(2);
    });
  });
});
