/**
 * __tests__/services/db.test.js
 * Unit tests for the encrypted database layer.
 */

const mockExecuteSql = jest.fn();
const mockTransaction = jest.fn();
const mockOpenDB = jest.fn();

jest.mock('react-native-sqlite-storage', () => ({
  enablePromise: jest.fn(),
  openDatabase: mockOpenDB,
}));

jest.mock('react-native', () => ({
  NativeModules: {
    KeystoreModule: {
      getDatabaseKey: jest.fn().mockResolvedValue('a'.repeat(64)),
    },
  },
  Platform: { OS: 'android' },
}));

const mockDB = {
  executeSql: mockExecuteSql,
  transaction: mockTransaction,
};

describe('database/db', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockOpenDB.mockResolvedValue(mockDB);
    mockTransaction.mockImplementation(cb => {
      const tx = { executeSql: jest.fn() };
      cb(tx);
      return Promise.resolve();
    });
    mockExecuteSql.mockResolvedValue([{
      rows: { length: 0, item: () => null },
    }]);

    jest.resetModules();
  });

  describe('getDB', () => {
    it('opens database with the configured name and location', async () => {
      const { getDB } = require('../../src/database/db');

      const db = await getDB();

      expect(mockOpenDB).toHaveBeenCalledTimes(1);
      expect(mockOpenDB).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'nursing_ai.db',
          location: 'default',
        })
      );
      expect(db).toBe(mockDB);
    });

    it('returns singleton on subsequent calls', async () => {
      const { getDB } = require('../../src/database/db');

      const db1 = await getDB();
      const db2 = await getDB();

      expect(db1).toBe(db2);
      expect(mockOpenDB).toHaveBeenCalledTimes(1);
    });
  });

  describe('initDB', () => {
    it('creates tables via transaction', async () => {
      mockExecuteSql.mockResolvedValue([
        { rows: { item: () => ({ cnt: 3 }), length: 1 } },
      ]);

      const { initDB } = require('../../src/database/db');
      await initDB();

      expect(mockTransaction).toHaveBeenCalled();
      const txCallback = mockTransaction.mock.calls[0][0];
      const fakeTx = { executeSql: jest.fn() };
      txCallback(fakeTx);

      const sqlStatements = fakeTx.executeSql.mock.calls.map(([sql]) => sql);
      expect(sqlStatements.some(s => s.includes('Categories'))).toBe(true);
      expect(sqlStatements.some(s => s.includes('KnowledgeBase'))).toBe(true);
      expect(sqlStatements.some(s => s.includes('AuditLogs'))).toBe(true);
    });

    it('seeds categories when table is empty', async () => {
      mockExecuteSql.mockResolvedValue([
        { rows: { item: () => ({ cnt: 0 }), length: 1 } },
      ]);

      const { initDB } = require('../../src/database/db');
      await initDB();

      expect(mockTransaction).toHaveBeenCalledTimes(2);
    });

    it('skips seeding when categories already exist', async () => {
      mockExecuteSql.mockResolvedValue([
        { rows: { item: () => ({ cnt: 3 }), length: 1 } },
      ]);

      const { initDB } = require('../../src/database/db');
      await initDB();

      expect(mockTransaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCategories', () => {
    it('returns all categories from the database', async () => {
      const cats = [
        { id: 1, name_ar: 'الصيدلة', name_en: 'Pharmacy' },
        { id: 2, name_ar: 'السياسات والإجراءات', name_en: 'Policies & Procedures' },
        { id: 3, name_ar: 'الجودة والسلامة', name_en: 'Quality & Safety' },
      ];
      mockExecuteSql.mockResolvedValue([{
        rows: { length: 3, item: (i) => cats[i] },
      }]);

      const { getCategories } = require('../../src/database/db');
      const categories = await getCategories();

      expect(categories).toHaveLength(3);
      expect(categories[0].name_en).toBe('Pharmacy');
      expect(categories[2].name_ar).toBe('الجودة والسلامة');
    });
  });

  describe('searchKnowledgeBase', () => {
    it('uses parameterized LIKE query', async () => {
      mockExecuteSql.mockResolvedValue([{
        rows: { length: 0, item: () => null },
      }]);

      const { searchKnowledgeBase } = require('../../src/database/db');
      await searchKnowledgeBase('ceftriaxone', 1, 3);

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('LIKE'),
        expect.arrayContaining([1, '%ceftriaxone%'])
      );
    });

    it('escapes LIKE wildcards in user input', async () => {
      mockExecuteSql.mockResolvedValue([{
        rows: { length: 0, item: () => null },
      }]);

      const { searchKnowledgeBase } = require('../../src/database/db');
      await searchKnowledgeBase('100%_dose', 1, 3);

      const params = mockExecuteSql.mock.calls[0][1];
      expect(params[1]).toBe('%100\\%\\_dose%');
    });

    it('clamps limit to safe range', async () => {
      mockExecuteSql.mockResolvedValue([{
        rows: { length: 0, item: () => null },
      }]);

      const { searchKnowledgeBase } = require('../../src/database/db');
      await searchKnowledgeBase('test', 1, 999);

      const params = mockExecuteSql.mock.calls[0][1];
      expect(params[2]).toBe(10);
    });

    it('returns matching rows with content, source, and page', async () => {
      const mockRow = {
        content: 'Ceftriaxone 1g IV',
        source_name: 'Pharmacy.pdf',
        page_number: 42,
      };
      mockExecuteSql.mockResolvedValue([{
        rows: { length: 1, item: () => mockRow },
      }]);

      const { searchKnowledgeBase } = require('../../src/database/db');
      const results = await searchKnowledgeBase('Ceftriaxone', 1);

      expect(results).toHaveLength(1);
      expect(results[0].content).toBe('Ceftriaxone 1g IV');
      expect(results[0].source_name).toBe('Pharmacy.pdf');
      expect(results[0].page_number).toBe(42);
    });
  });

  describe('insertKnowledgeChunk', () => {
    it('inserts a chunk with all required fields', async () => {
      mockExecuteSql.mockResolvedValue([{ insertId: 1 }]);

      const { insertKnowledgeChunk } = require('../../src/database/db');
      await insertKnowledgeChunk({
        categoryId: 1,
        content: 'Drug information here',
        sourceName: 'Guide.pdf',
        pageNumber: 5,
        checksum: 'abc123',
      });

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO KnowledgeBase'),
        expect.arrayContaining([1, 'Drug information here', 'Guide.pdf', 5, 'abc123'])
      );
    });

    it('generates ISO timestamp for created_at', async () => {
      mockExecuteSql.mockResolvedValue([{ insertId: 1 }]);

      const { insertKnowledgeChunk } = require('../../src/database/db');
      await insertKnowledgeChunk({
        categoryId: 1,
        content: 'test',
        sourceName: 'test.pdf',
        pageNumber: 1,
        checksum: 'x',
      });

      const params = mockExecuteSql.mock.calls[0][1];
      const timestamp = params[params.length - 1];
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});
