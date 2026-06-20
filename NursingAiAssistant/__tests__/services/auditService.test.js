/**
 * __tests__/services/auditService.test.js
 * Unit tests for the audit logging service.
 */

// Mock the DB module so tests don't need a real SQLite instance
jest.mock('../../src/database/db', () => ({
  getDB: jest.fn(),
}));

import { getDB } from '../../src/database/db';
import { addAuditLog, getLogs } from '../../src/services/auditService';

describe('addAuditLog', () => {
  let mockExecuteSql;
  let mockDB;

  beforeEach(() => {
    mockExecuteSql = jest.fn().mockResolvedValue([]);
    mockDB = { executeSql: mockExecuteSql };
    getDB.mockResolvedValue(mockDB);
  });

  afterEach(() => jest.clearAllMocks());

  it('inserts a row with the correct action', async () => {
    await addAuditLog('AI_QUERY_SUCCESS', 'test details');
    expect(mockExecuteSql).toHaveBeenCalledTimes(1);
    const [sql, params] = mockExecuteSql.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO AuditLogs/i);
    expect(params[1]).toBe('AI_QUERY_SUCCESS');
    expect(params[2]).toBe('test details');
  });

  it('does not throw when the DB call fails (non-fatal)', async () => {
    mockExecuteSql.mockRejectedValue(new Error('DB error'));
    await expect(addAuditLog('TEST', 'detail')).resolves.toBeUndefined();
  });

  it('coerces null details to empty string', async () => {
    await addAuditLog('TEST', null);
    const [, params] = mockExecuteSql.mock.calls[0];
    expect(params[2]).toBe('');
  });
});

describe('getLogs', () => {
  let mockDB;

  beforeEach(() => {
    const fakeRow = { id: 1, timestamp: '2026-01-01T00:00:00Z', action: 'TEST', details: 'd', session_id: 's' };
    const mockRows = { length: 1, item: () => fakeRow };
    mockDB = { executeSql: jest.fn().mockResolvedValue([{ rows: mockRows }]) };
    getDB.mockResolvedValue(mockDB);
  });

  afterEach(() => jest.clearAllMocks());

  it('returns an array of log entries', async () => {
    const logs = await getLogs();
    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBe(1);
    expect(logs[0].action).toBe('TEST');
  });

  it('returns empty array on DB error', async () => {
    mockDB.executeSql.mockRejectedValue(new Error('fail'));
    const logs = await getLogs();
    expect(logs).toEqual([]);
  });
});
