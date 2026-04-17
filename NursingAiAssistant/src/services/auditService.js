/**
 * src/services/auditService.js
 *
 * Audit logging service for NursingAiAssistant.
 *
 * Provides a simple append-only audit trail stored in the local encrypted
 * SQLite database. Every significant action (PDF uploads, AI queries,
 * authentication events, errors) should be logged here for compliance
 * and traceability purposes.
 *
 * All timestamps are stored in ISO 8601 format (UTC).
 */

import { getDB } from '../database/db';

// ---------------------------------------------------------------------------
// Session ID
// ---------------------------------------------------------------------------

/**
 * A session identifier generated once per app launch.
 * Useful for grouping audit entries from a single session.
 */
const SESSION_ID = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Inserts a new audit log entry into the AuditLogs table.
 *
 * @param {string} action   Short action label (e.g. 'PDF_UPLOAD', 'AI_QUERY')
 * @param {string} details  Human-readable details about the action
 * @returns {Promise<void>}
 */
export async function addAuditLog(action, details) {
  try {
    const db = await getDB();
    const timestamp = new Date().toISOString();

    await db.executeSql(
      `INSERT INTO AuditLogs (timestamp, action, details, session_id)
       VALUES (?, ?, ?, ?);`,
      [timestamp, String(action), String(details ?? ''), SESSION_ID]
    );
  } catch (err) {
    // Audit failures must never crash the app — log to console only.
    console.error('[AuditService] Failed to write audit log:', err);
  }
}

/**
 * Retrieves the most recent 100 audit log entries, newest first.
 *
 * @returns {Promise<Array<{id, timestamp, action, details, session_id}>>}
 */
export async function getLogs() {
  try {
    const db = await getDB();
    const [result] = await db.executeSql(
      `SELECT id, timestamp, action, details, session_id
         FROM AuditLogs
        ORDER BY id DESC
        LIMIT 100;`
    );

    const rows = [];
    for (let i = 0; i < result.rows.length; i++) {
      rows.push(result.rows.item(i));
    }
    return rows;
  } catch (err) {
    console.error('[AuditService] Failed to read audit logs:', err);
    return [];
  }
}
