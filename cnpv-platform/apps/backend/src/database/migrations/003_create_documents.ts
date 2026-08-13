import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDocuments1000000003 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        hospital_id       UUID NOT NULL REFERENCES hospitals(id),
        title_ar          VARCHAR(500) NOT NULL,
        title_en          VARCHAR(500),
        category          VARCHAR(50) NOT NULL,
        status            VARCHAR(30) NOT NULL DEFAULT 'draft',
        version_number    INTEGER NOT NULL DEFAULT 1,
        current_version_id UUID,
        expiry_date       DATE,
        effective_date    DATE,
        document_number   VARCHAR(100),
        tags              TEXT[] DEFAULT '{}',
        uploaded_by       UUID NOT NULL REFERENCES users(id),
        reviewed_by       UUID REFERENCES users(id),
        approved_by       UUID REFERENCES users(id),
        rejected_reason   TEXT,
        indexed_at        TIMESTAMPTZ,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_documents_hospital_id ON documents(hospital_id);
      CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
      CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
      CREATE INDEX IF NOT EXISTS idx_documents_expiry_date ON documents(expiry_date);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS documents;');
  }
}
