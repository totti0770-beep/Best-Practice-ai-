/**
 * src/database/db.js
 *
 * Encrypted SQLite database layer for NursingAiAssistant.
 *
 * Uses react-native-sqlite-storage with SQLCipher encryption.
 * The encryption key is derived at runtime from the Android Keystore
 * (KeystoreModule native bridge) — the raw key never appears in JS source.
 *
 * Tables:
 *   Categories      — The three knowledge domains (Pharmacy, Policies, Quality)
 *   KnowledgeBase   — Chunked text extracted from uploaded PDFs
 *   AuditLogs       — Immutable audit trail of all significant actions
 */

import SQLite from 'react-native-sqlite-storage';
import { NativeModules, Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

SQLite.enablePromise(true);

const DB_NAME = 'nursing_ai.db';

/** Singleton database connection handle */
let _db = null;

// ---------------------------------------------------------------------------
// Key derivation (Android Keystore / iOS Secure Enclave)
// ---------------------------------------------------------------------------

/**
 * Retrieves the SQLCipher encryption key from the device secure hardware.
 * On Android: uses KeystoreModule (TEE-backed AES-256-GCM key wrapping).
 * Falls back to a clearly-labelled dev key in simulators / unit-test env.
 *
 * @returns {Promise<string>} hex key string
 */
async function getDatabaseKey() {
  try {
    if (Platform.OS === 'android' && NativeModules.KeystoreModule) {
      return await NativeModules.KeystoreModule.getDatabaseKey();
    }
    // iOS: implement equivalent via react-native-keychain or SecureEnclave
    // For now returns a dev key; replace before production iOS build.
    if (Platform.OS === 'ios') {
      console.warn('[DB] iOS Keystore integration not yet implemented — using dev key');
    }
  } catch (err) {
    console.error('[DB] Keystore error, falling back to dev key:', err);
  }
  // DEV / CI fallback — flagged clearly, never used in production builds
  if (__DEV__) {
    return 'dev_key_only_not_for_production_use';
  }
  throw new Error('Database key unavailable. Ensure KeystoreModule is registered.');
}

// ---------------------------------------------------------------------------
// Connection management
// ---------------------------------------------------------------------------

/**
 * Returns the open database instance, opening it if necessary.
 * Key is derived from secure hardware on first call.
 *
 * @returns {Promise<SQLiteDatabase>}
 */
export async function getDB() {
  if (_db) return _db;

  const key = await getDatabaseKey();

  _db = await SQLite.openDatabase({
    name: DB_NAME,
    key,
    location: 'default',
  });

  return _db;
}

// ---------------------------------------------------------------------------
// Schema initialisation
// ---------------------------------------------------------------------------

/**
 * Creates database tables if they do not yet exist, then seeds the three
 * default categories on first run.
 *
 * Called once during app bootstrap (App.js).
 */
export async function initDB() {
  const db = await getDB();

  await db.transaction(tx => {
    // ------------------------------------------------------------------
    // Categories table
    // ------------------------------------------------------------------
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS Categories (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        name_ar   TEXT NOT NULL,
        name_en   TEXT NOT NULL
      );
    `);

    // ------------------------------------------------------------------
    // KnowledgeBase table
    // ------------------------------------------------------------------
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS KnowledgeBase (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL,
        content     TEXT    NOT NULL,
        source_name TEXT    NOT NULL,
        page_number INTEGER NOT NULL DEFAULT 0,
        checksum    TEXT    NOT NULL,
        created_at  TEXT    NOT NULL,
        FOREIGN KEY (category_id) REFERENCES Categories(id)
      );
    `);

    // ------------------------------------------------------------------
    // AuditLogs table
    // ------------------------------------------------------------------
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS AuditLogs (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp  TEXT    NOT NULL,
        action     TEXT    NOT NULL,
        details    TEXT,
        session_id TEXT
      );
    `);
  });

  // Seed categories on first run (idempotent)
  await seedCategories(db);
}

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------

/**
 * Inserts the three default categories if the Categories table is empty.
 * This is safe to call on every startup.
 *
 * @param {SQLiteDatabase} db
 */
async function seedCategories(db) {
  const [result] = await db.executeSql(
    'SELECT COUNT(*) AS cnt FROM Categories;'
  );
  const count = result.rows.item(0).cnt;

  if (count === 0) {
    await db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO Categories (name_ar, name_en) VALUES (?, ?);',
        ['الصيدلة', 'Pharmacy']
      );
      tx.executeSql(
        'INSERT INTO Categories (name_ar, name_en) VALUES (?, ?);',
        ['السياسات والإجراءات', 'Policies & Procedures']
      );
      tx.executeSql(
        'INSERT INTO Categories (name_ar, name_en) VALUES (?, ?);',
        ['الجودة والسلامة', 'Quality & Safety']
      );
    });
    console.log('[DB] Categories seeded.');
  }
}

// ---------------------------------------------------------------------------
// Public query helpers
// ---------------------------------------------------------------------------

/**
 * Returns all categories.
 *
 * @returns {Promise<Array<{id, name_ar, name_en}>>}
 */
export async function getCategories() {
  const db = await getDB();
  const [result] = await db.executeSql('SELECT * FROM Categories ORDER BY id;');
  const rows = [];
  for (let i = 0; i < result.rows.length; i++) {
    rows.push(result.rows.item(i));
  }
  return rows;
}

/**
 * Searches KnowledgeBase for chunks relevant to the query within a category.
 * Uses a simple LIKE-based full-text search as a lightweight alternative to
 * a dedicated FTS index (suitable for small knowledge bases < 50 MB).
 *
 * @param {string}  query       User's question text
 * @param {number}  categoryId  Category to filter by
 * @param {number}  [limit=3]   Maximum number of chunks to return
 * @returns {Promise<Array<{content, source_name, page_number}>>}
 */
export async function searchKnowledgeBase(query, categoryId, limit = 3) {
  const db = await getDB();
  const sanitized = query.replace(/[%_\\]/g, '\\$&').slice(0, 200);
  const searchTerm = `%${sanitized}%`;
  const safeLimit = Math.min(Math.max(Number(limit) || 3, 1), 10);

  const [result] = await db.executeSql(
    `SELECT content, source_name, page_number
       FROM KnowledgeBase
      WHERE category_id = ?
        AND content LIKE ? ESCAPE '\\'
      LIMIT ?;`,
    [categoryId, searchTerm, safeLimit]
  );

  const rows = [];
  for (let i = 0; i < result.rows.length; i++) {
    rows.push(result.rows.item(i));
  }
  return rows;
}

/**
 * Inserts a single knowledge chunk into the database.
 *
 * @param {object} chunk
 * @param {number} chunk.categoryId
 * @param {string} chunk.content
 * @param {string} chunk.sourceName
 * @param {number} chunk.pageNumber
 * @param {string} chunk.checksum
 * @returns {Promise<void>}
 */
export async function insertKnowledgeChunk({ categoryId, content, sourceName, pageNumber, checksum }) {
  const db = await getDB();
  const createdAt = new Date().toISOString();

  await db.executeSql(
    `INSERT INTO KnowledgeBase
       (category_id, content, source_name, page_number, checksum, created_at)
     VALUES (?, ?, ?, ?, ?, ?);`,
    [categoryId, content, sourceName, pageNumber, checksum, createdAt]
  );
}
