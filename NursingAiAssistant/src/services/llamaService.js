/**
 * src/services/llamaService.js
 *
 * Offline LLM inference service for NursingAiAssistant.
 *
 * Uses the llama.rn library to run a quantised GGUF model entirely on-device
 * with no network calls, ensuring full data privacy for clinical information.
 *
 * -------------------------------------------------------------------------
 * SETUP REQUIRED BEFORE USE:
 * -------------------------------------------------------------------------
 * 1. Obtain a suitable nursing/medical GGUF model (e.g. a quantised
 *    Llama-3 or Mistral model fine-tuned on medical text).
 *    Recommended size: Q4_K_M quantisation, ≤ 4 GB for mid-range devices.
 *
 * 2. Place the model file at:
 *      android/app/src/main/assets/models/nursing_model.gguf
 *
 * 3. Ensure the assets folder is referenced in android/app/build.gradle:
 *      android { sourceSets { main { assets.srcDirs = ['src/main/assets'] } } }
 *
 * 4. Re-build the Android app: npx react-native run-android
 * -------------------------------------------------------------------------
 */

import { initLlama } from 'llama.rn';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Path to the GGUF model inside the Android assets bundle.
 * react-native-fs resolves 'asset://' to the assets folder at runtime.
 */
const MODEL_ASSET_PATH = 'asset://models/nursing_model.gguf';

/**
 * LLM inference parameters tuned for deterministic, factual responses.
 * Low temperature (0.1) minimises hallucination and keeps answers concise.
 */
const LLAMA_PARAMS = {
  n_ctx: 2048,       // Context window (tokens)
  n_gpu_layers: 0,   // CPU-only inference; increase if GPU acceleration is available
  use_mlock: false,  // Do not lock model in RAM on constrained devices
};

const COMPLETION_PARAMS = {
  temperature: 0.1,  // Near-deterministic — critical for medical accuracy
  top_p: 0.9,
  top_k: 40,
  n_predict: 512,    // Maximum tokens in the generated reply
  stop: ['</s>', 'Human:', 'User:'],
};

// ---------------------------------------------------------------------------
// Singleton context
// ---------------------------------------------------------------------------

/** Holds the initialised llama.rn context after the first call to initializeLlama() */
let llamaContext = null;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialises the llama.rn inference engine with the nursing GGUF model.
 *
 * This is an expensive operation (model loading can take 5-30 seconds
 * depending on device performance). Call it once during app startup or
 * lazily on the first chat request.
 *
 * @returns {Promise<void>}
 * @throws {Error} If the model file is missing or the device lacks memory.
 */
export async function initializeLlama() {
  if (llamaContext) {
    // Already initialised — reuse the existing context.
    return;
  }

  try {
    console.log('[LlamaService] Initialising llama.rn context…');

    llamaContext = await initLlama({
      model: MODEL_ASSET_PATH,
      ...LLAMA_PARAMS,
    });

    console.log('[LlamaService] llama.rn context ready.');
  } catch (err) {
    llamaContext = null;
    console.error('[LlamaService] Failed to initialise llama.rn:', err);
    throw new Error(
      'LLM model could not be loaded. ' +
      'Ensure nursing_model.gguf is placed in android/app/src/main/assets/models/. ' +
      `Original error: ${err.message}`
    );
  }
}

/**
 * Generates a completion from the local GGUF model for the given prompt.
 *
 * Initialises the model on first call if it has not been initialised yet.
 *
 * @param {string} prompt  The fully constructed system + user prompt string.
 * @returns {Promise<string>} The generated text response.
 * @throws {Error} If the model is unavailable or inference fails.
 */
export async function getLlamaCompletion(prompt) {
  // Lazy initialisation — ensures the model is loaded before the first query.
  if (!llamaContext) {
    await initializeLlama();
  }

  try {
    const result = await llamaContext.completion({
      prompt,
      ...COMPLETION_PARAMS,
    });

    // llama.rn returns an object with a `text` property containing the reply.
    const text = (result?.text ?? '').trim();

    if (!text) {
      throw new Error('Empty response received from the LLM.');
    }

    return text;
  } catch (err) {
    console.error('[LlamaService] Completion error:', err);
    throw new Error(`LLM inference failed: ${err.message}`);
  }
}

/**
 * Releases the llama.rn context and frees device memory.
 * Call this when the user navigates away from the chat interface for an
 * extended period or when the app is backgrounded on low-memory devices.
 *
 * @returns {Promise<void>}
 */
export async function releaseLlama() {
  if (llamaContext) {
    try {
      await llamaContext.release();
      console.log('[LlamaService] Context released.');
    } catch (err) {
      console.warn('[LlamaService] Error releasing context:', err);
    } finally {
      llamaContext = null;
    }
  }
}
