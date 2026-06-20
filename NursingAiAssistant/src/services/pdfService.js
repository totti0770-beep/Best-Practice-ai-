/**
 * src/services/pdfService.js
 *
 * PDF ingestion pipeline for NursingAiAssistant.
 *
 * Responsibilities:
 * 1. Read the chosen PDF file as base64 via react-native-fs.
 * 2. Compute a SHA-256 checksum (integrity verification).
 * 3. Extract page text via the native PdfExtractorModule (Apache PDFBox).
 * 4. Split text into overlapping chunks suitable for RAG retrieval.
 * 5. Clean and normalise each chunk (Arabic + Latin character sets).
 * 6. Persist each chunk to the encrypted KnowledgeBase SQLite table.
 * 7. Write an audit log entry for the upload.
 *
 * -------------------------------------------------------------------------
 * PDF TEXT EXTRACTION:
 * -------------------------------------------------------------------------
 * Real page-by-page text extraction is performed on-device by the native
 * Android module PdfExtractorModule, which wraps Apache PDFBox (Tom Roush's
 * Android port). No network access is required, preserving the air-gapped
 * design. The module resolves with an array of { pageNumber, text } objects.
 * -------------------------------------------------------------------------
 */

import { NativeModules } from 'react-native';
import RNFS from 'react-native-fs';
import CryptoJS from 'crypto-js';
import { insertKnowledgeChunk } from '../database/db';
import { addAuditLog } from './auditService';

const { PdfExtractorModule } = NativeModules;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_CHUNK_SIZE = 800;   // Characters per chunk (UTF-16 code units)
const DEFAULT_OVERLAP = 100;      // Overlap between consecutive chunks
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB hard limit

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
  // 0. Validate file size before reading into memory ---------------------
  const stat = await RNFS.stat(fileUri);
  if (stat.size > MAX_FILE_SIZE) {
    throw new Error(
      `File exceeds the ${MAX_FILE_SIZE / (1024 * 1024)}MB size limit.`
    );
  }

  // 1. Read file as base64 ------------------------------------------------
  const base64Data = await RNFS.readFile(fileUri, 'base64');
  if (!base64Data || base64Data.length === 0) {
    throw new Error('File is empty or could not be read.');
  }

  // 2. Compute SHA-256 checksum -------------------------------------------
  const checksum = computeChecksum(base64Data);
  await addAuditLog('PDF_READ', `File: ${fileName} | Checksum: ${checksum}`);

  // 3. Extract page text on-device via Apache PDFBox ----------------------
  const pages = await extractPages(fileUri);
  if (!pages || pages.length === 0) {
    throw new Error('No extractable text found in the PDF.');
  }

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
 * Extracts page-by-page text from a PDF using the native PdfExtractorModule
 * (Apache PDFBox on Android). Returns an array of { pageNumber, text } objects.
 *
 * @param {string} fileUri  Local file URI / path to the PDF
 * @returns {Promise<Array<{pageNumber: number, text: string}>>}
 * @throws {Error} If the native module is unavailable or extraction fails.
 */
async function extractPages(fileUri) {
  if (!PdfExtractorModule || typeof PdfExtractorModule.extractPages !== 'function') {
    throw new Error(
      'PDF extraction is unavailable. The native PdfExtractorModule is not ' +
      'registered — rebuild the Android app after installing the module.'
    );
  }

  const pages = await PdfExtractorModule.extractPages(fileUri);
  // Native returns Array<{ pageNumber, text }>; normalise into plain objects.
  return (pages || []).map(p => ({
    pageNumber: p.pageNumber,
    text: p.text || '',
  }));
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
