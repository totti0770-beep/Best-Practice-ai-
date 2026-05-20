import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { CreateHospitals1000000001 } from './migrations/001_create_hospitals';
import { CreateUsers1000000002 } from './migrations/002_create_users';
import { CreateDocuments1000000003 } from './migrations/003_create_documents';
import { CreateDocumentVersions1000000004 } from './migrations/004_create_document_versions';
import { CreateDocumentChunksPgvector1000000005 } from './migrations/005_create_document_chunks_pgvector';
import { CreateChat1000000006 } from './migrations/006_create_chat';
import { CreateAuditLogs1000000007 } from './migrations/007_create_audit_logs';
import { CreateNotificationsAndFormulas1000000008 } from './migrations/008_create_notifications_and_formulas';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  migrations: [
    CreateHospitals1000000001,
    CreateUsers1000000002,
    CreateDocuments1000000003,
    CreateDocumentVersions1000000004,
    CreateDocumentChunksPgvector1000000005,
    CreateChat1000000006,
    CreateAuditLogs1000000007,
    CreateNotificationsAndFormulas1000000008,
  ],
});

async function runMigrations() {
  try {
    await dataSource.initialize();
    console.log('Running migrations...');
    await dataSource.runMigrations();
    console.log('Migrations completed successfully.');
    await dataSource.destroy();
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

runMigrations();
