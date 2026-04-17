/**
 * src/services/aiEngine.js
 *
 * RAG (Retrieval-Augmented Generation) engine for NursingAiAssistant.
 *
 * This module is the core intelligence layer of the app. It:
 *   1. Retrieves the top 3 relevant knowledge chunks from the encrypted
 *      SQLite database for the given query and category.
 *   2. Applies an anti-hallucination guard — if no context is found,
 *      it REFUSES to answer and returns a safe rejection message.
 *   3. Detects whether the query is in Arabic or English.
 *   4. Builds a deterministic, pharmaceutical-grade system prompt.
 *   5. Calls the on-device llama.rn model for inference.
 *   6. Writes success/failure entries to the audit log.
 *   7. Returns a structured result including the answer, source attribution,
 *      and a rejection flag so the UI can render appropriately.
 */

import { searchKnowledgeBase } from '../database/db';
import { getLlamaCompletion } from './llamaService';
import { addAuditLog } from './auditService';

// ---------------------------------------------------------------------------
// Language detection
// ---------------------------------------------------------------------------

/**
 * Detects whether a string is predominantly Arabic.
 * Uses a simple heuristic: if more than 20 % of the characters fall in the
 * Arabic Unicode block the text is considered Arabic.
 *
 * @param {string} text
 * @returns {'ar'|'en'}
 */
function detectLanguage(text) {
  if (!text) return 'en';
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  return arabicChars / text.length > 0.2 ? 'ar' : 'en';
}

// ---------------------------------------------------------------------------
// Rejection messages (no context found)
// ---------------------------------------------------------------------------

const REJECTION_EN =
  'No relevant information was found in the official references for this question. ' +
  'Please consult your clinical supervisor or refer to the original source documents.';

const REJECTION_AR =
  'لم يتم العثور على معلومات ذات صلة في المراجع الرسمية للإجابة على هذا السؤال. ' +
  'يرجى الرجوع إلى مشرفك السريري أو إلى المستندات المصدر الأصلية.';

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------

/**
 * Builds the full inference prompt from system instructions and context chunks.
 *
 * The system prompt enforces pharmaceutical best-practice domains and
 * explicitly instructs the model to cite sources and refuse speculation.
 *
 * @param {string} query        The user's question
 * @param {string} contextText  Concatenated knowledge-base chunks
 * @param {'ar'|'en'} lang      Detected query language
 * @returns {string}
 */
function buildPrompt(query, contextText, lang) {
  const systemInstructions = lang === 'ar'
    ? `أنت مساعد تمريض سريري متخصص. أجب فقط باستخدام المعلومات الواردة في سياق المرجع أدناه.
يجب أن تغطي إجابتك، حيثما كان ذلك مناسباً، ما يلي:
- تحضير الدواء والجرعة
- التوافق والاستقرار
- معدل وطريقة الإعطاء عن طريق الوريد
- توثيق الرعاية التمريضية
- التحذيرات وتعليمات السلامة
إذا لم تتضمن المراجع الواردة إجابة واضحة، قل ذلك صراحةً ولا تخمّن.
استشهد دائماً بالمصدر واسم الصفحة في نهاية إجابتك.`
    : `You are a specialised clinical nursing assistant. Answer ONLY using the information provided in the reference context below.
Your answer should cover, where applicable:
- Drug preparation and dosage
- Compatibility and stability
- IV infusion rate and administration method
- Nursing care documentation
- Warnings and safety instructions
If the provided references do not contain a clear answer, state that explicitly — do NOT speculate.
Always cite the source name and page number at the end of your answer.`;

  return `${systemInstructions}

--- REFERENCE CONTEXT ---
${contextText}
--- END CONTEXT ---

Question: ${query}

Answer:`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generates a safe, source-grounded response for a clinical nursing query.
 *
 * @param {string} userQuery   The question typed by the nurse
 * @param {number} categoryId  The knowledge domain to search (1 = Pharmacy, etc.)
 * @returns {Promise<{
 *   answer:   string,   // The model's response or the rejection message
 *   source:   string,   // Source file name (empty string if rejected)
 *   page:     number,   // Source page number (0 if rejected)
 *   rejected: boolean,  // true when no context was found
 * }>}
 */
export async function generateSecureResponse(userQuery, categoryId) {
  const lang = detectLanguage(userQuery);

  // ------------------------------------------------------------------
  // Step 1: Retrieve top 3 context chunks from the knowledge base
  // ------------------------------------------------------------------
  let chunks = [];
  try {
    chunks = await searchKnowledgeBase(userQuery, categoryId, 3);
  } catch (err) {
    console.error('[AIEngine] Knowledge base search failed:', err);
    await addAuditLog('AI_QUERY_ERROR', `Search failed: ${err.message}`);
    return {
      answer: lang === 'ar' ? REJECTION_AR : REJECTION_EN,
      source: '',
      page: 0,
      rejected: true,
    };
  }

  // ------------------------------------------------------------------
  // Step 2: Anti-hallucination guard — refuse if no context found
  // ------------------------------------------------------------------
  if (!chunks || chunks.length === 0) {
    await addAuditLog(
      'AI_QUERY_REJECTED',
      `No context found | Category: ${categoryId} | Query: ${userQuery.slice(0, 80)}`
    );
    return {
      answer: lang === 'ar' ? REJECTION_AR : REJECTION_EN,
      source: '',
      page: 0,
      rejected: true,
    };
  }

  // ------------------------------------------------------------------
  // Step 3: Build prompt from context chunks
  // ------------------------------------------------------------------
  const contextText = chunks
    .map(
      (c, i) =>
        `[${i + 1}] Source: "${c.source_name}" | Page: ${c.page_number}\n${c.content}`
    )
    .join('\n\n');

  const prompt = buildPrompt(userQuery, contextText, lang);

  // Use the first (highest-relevance) chunk for source attribution in the UI.
  const primarySource = chunks[0];

  // ------------------------------------------------------------------
  // Step 4: Run local LLM inference
  // ------------------------------------------------------------------
  let answer = '';
  try {
    answer = await getLlamaCompletion(prompt);

    await addAuditLog(
      'AI_QUERY_SUCCESS',
      `Category: ${categoryId} | Source: ${primarySource.source_name} | ` +
      `Page: ${primarySource.page_number} | Query: ${userQuery.slice(0, 80)}`
    );
  } catch (err) {
    console.error('[AIEngine] LLM inference failed:', err);
    await addAuditLog('AI_QUERY_ERROR', `Inference failed: ${err.message}`);

    // Return a graceful error message instead of crashing the UI.
    return {
      answer:
        lang === 'ar'
          ? 'تعذّر توليد الاستجابة. يرجى التحقق من وجود نموذج الذكاء الاصطناعي والمحاولة مجدداً.'
          : 'Unable to generate a response. Please ensure the AI model file is present and try again.',
      source: primarySource.source_name,
      page: primarySource.page_number,
      rejected: false,
    };
  }

  return {
    answer,
    source: primarySource.source_name,
    page: primarySource.page_number,
    rejected: false,
  };
}
