/**
 * src/services/pdfService.js
 *
 * PDF ingestion pipeline for NursingAiAssistant.
 *
 * Responsibilities:
 * 1. Read the chosen PDF file as base64 via react-native-fs.
 * 2. Compute a SHA-256 checksum (integrity verification).
 * 3. Extract page text — see NOTE below about the extraction placeholder.
 * 4. Split text into overlapping chunks suitable for RAG retrieval.
 * 5. Clean and normalise each chunk (Arabic + Latin character sets).
 * 6. Persist each chunk to the encrypted KnowledgeBase SQLite table.
 * 7. Write an audit log entry for the upload.
 *
 * -------------------------------------------------------------------------
 * NOTE — PDF TEXT EXTRACTION PLACEHOLDER:
 * -------------------------------------------------------------------------
 * Full native PDF parsing requires a native bridge library such as
 * react-native-pdf-lib, pdf.js (via a WebView bridge), or a custom
 * Android module using Apache PDFBox / iTextPDF.
 *
 * None of these are installed in the current scaffold. The function
 * `extractPagesFromBase64` below SIMULATES page extraction by splitting
 * the raw base64 string into equal segments and labelling them as pages.
 * This allows the rest of the pipeline (chunking, storage, audit) to be
 * tested end-to-end.
 *
 * To replace with real extraction, implement `extractPagesFromBase64`
 * using your chosen PDF library and return an array of { pageNumber, text }
 * objects — the rest of the pipeline will work unchanged.
 * -------------------------------------------------------------------------
 */

import RNFS from 'react-native-fs';
import CryptoJS from 'crypto-js';
import { insertKnowledgeChunk } from '../database/db';
import { addAuditLog } from './auditService';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_CHUNK_SIZE = 800;   // Characters per chunk (UTF-16 code units)
const DEFAULT_OVERLAP = 100;      // Overlap between consecutive chunks

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Processes a PDF file picked by the user:
 * reads, checksums, extracts, chunks, cleans, and stores it.
 *
 * @param {string} fileUri      Local file URI returned by DocumentPicker
 * @param {string} fileName     Display name of the file (stored as source_name)
 * @param {number} categoryId   FK to Categories table
 * @returns {Promise<{checksum: string, chunksInserted: number}>}
 */
export async function processSecurePDF(fileUri, fileName, categoryId) {
  // 1. Read file as base64 ------------------------------------------------
  const base64Data = await RNFS.readFile(fileUri, 'base64');
  if (!base64Data || base64Data.length === 0) {
    throw new Error('File is empty or could not be read.');
  }

  // 2. Compute SHA-256 checksum -------------------------------------------
  const checksum = computeChecksum(base64Data);
  await addAuditLog('PDF_READ', `File: ${fileName} | Checksum: ${checksum}`);

  // 3. Extract pages (PLACEHOLDER — see module-level comment) -------------
  const pages = extractPagesFromBase64(base64Data, fileName);

  // 4–6. Chunk, clean, and store each page --------------------------------
  let chunksInserted = 0;

  for (const { pageNumber, text } of pages) {
    const cleaned = cleanText(text);
    if (!cleaned.trim()) continue;

    const chunks = createChunks(cleaned, DEFAULT_CHUNK_SIZE, DEFAULT_OVERLAP);

    for (const chunk of chunks) {
      if (!chunk.trim()) continue;

      await insertKnowledgeChunk({
        categoryId,
        content: chunk,
        sourceName: fileName,
        pageNumber,
        checksum,
      });
      chunksInserted++;
    }
  }

  await addAuditLog(
    'PDF_PROCESSED',
    `File: ${fileName} | Category: ${categoryId} | Chunks: ${chunksInserted}`
  );

  return { checksum, chunksInserted };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Computes a SHA-256 hex digest of a base64-encoded string.
 *
 * @param {string} base64Data
 * @returns {string} Hex-encoded hash
 */
function computeChecksum(base64Data) {
  const wordArray = CryptoJS.enc.Base64.parse(base64Data);
  return CryptoJS.SHA256(wordArray).toString(CryptoJS.enc.Hex);
}

/**
 * PLACEHOLDER — Simulates page-by-page text extraction from a PDF.
 *
 * WHY PLACEHOLDER: A native PDF parsing bridge is not yet installed.
 * This function splits the raw base64 payload into equal segments and
 * treats each segment as a "page". This lets the chunking and storage
 * pipeline run end-to-end during development and testing.
 *
 * REPLACE THIS FUNCTION with a real PDF-to-text library before shipping.
 * The return signature (Array<{ pageNumber: number, text: string }>) must
 * be preserved so that the rest of the pipeline works unchanged.
 *
 * @param {string} base64Data  Base64-encoded PDF bytes
 * @param {string} fileName    Used only for the placeholder text label
 * @returns {Array<{pageNumber: number, text: string}>}
 */
function extractPagesFromBase64(base64Data, fileName) {
  // Simulate up to 10 pages from the base64 payload.
  const SIMULATED_PAGE_COUNT = 10;
  const segmentLength = Math.ceil(base64Data.length / SIMULATED_PAGE_COUNT);
  const pages = [];

  for (let i = 0; i < SIMULATED_PAGE_COUNT; i++) {
    const segment = base64Data.slice(i * segmentLength, (i + 1) * segmentLength);
    // Produce placeholder text that includes the filename and page number so
    // that the stored chunks are at least traceable in the UI.
    pages.push({
      pageNumber: i + 1,
      text:
        `[PLACEHOLDER — real PDF extraction not yet implemented] ` +
        `Source: ${fileName} | Page ${i + 1} | ` +
        `Data preview: ${segment.slice(0, 120)}`,
    });
  }

  return pages;
}

/**
 * Splits a string of text into overlapping chunks.
 *
 * Overlap ensures that sentences crossing a chunk boundary are not lost,
 * which improves retrieval accuracy for RAG queries.
 *
 * @param {string} text   Cleaned page text
 * @param {number} size   Maximum chunk length in characters
 * @param {number} overlap  Characters shared between consecutive chunks
 * @returns {string[]}
 */
export function createChunks(text, size = DEFAULT_CHUNK_SIZE, overlap = DEFAULT_OVERLAP) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    chunks.push(text.slice(start, end));
    if (end === text.length) break;
    start += size - overlap;
  }

  return chunks;
}

/**
 * Cleans and normalises a raw text string for storage.
 *
 * Retains:
 *   - Arabic script characters (Unicode block U+0600–U+06FF)
 *   - Basic Latin letters (a-z, A-Z)
 *   - ASCII digits (0-9)
 *   - Common punctuation useful for sentence structure: . , : ; ( ) / - %
 *   - Whitespace (spaces, newlines, tabs) — normalised to single spaces
 *
 * Strips:
 *   - Control characters
 *   - Null bytes and other binary artefacts from base64 decoding
 *   - Excessive repeated whitespace
 *
 * @param {string} text
 * @returns {string}
 */
export function cleanText(text) {
  return text
    // Keep Arabic, Latin letters, digits, and useful punctuation
    .replace(/[^\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFFa-zA-Z0-9 \t\n.,;:()\-/%+]+/g, ' ')
    // Collapse multiple whitespace characters into a single space
    .replace(/\s+/g, ' ')
    .trim();
}
