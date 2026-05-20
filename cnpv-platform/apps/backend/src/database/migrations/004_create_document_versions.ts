import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDocumentVersions1000000004 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS document_versions (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        version_number  INTEGER NOT NULL,
        minio_bucket    VARCHAR(100) NOT NULL DEFAULT 'cnpv-documents',
        minio_key       TEXT NOT NULL UNIQUE,
        file_size_bytes BIGINT,
        sha256_hash     CHAR(64),
        page_count      INTEGER,
        uploaded_by     UUID NOT NULL REFERENCES users(id),
        upload_notes    TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(document_id, version_number)
      );

      CREATE INDEX IF NOT EXISTS idx_doc_versions_document_id ON document_versions(document_id);

      -- Add FK from documents.current_version_id
      ALTER TABLE documents
        ADD CONSTRAINT fk_documents_current_version
        FOREIGN KEY (current_version_id)
        REFERENCES document_versions(id)
        ON DELETE SET NULL
        DEFERRABLE INITIALLY DEFERRED;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE documents DROP CONSTRAINT IF EXISTS fk_documents_current_version;');
    await queryRunner.query('DROP TABLE IF EXISTS document_versions;');
  }
}
