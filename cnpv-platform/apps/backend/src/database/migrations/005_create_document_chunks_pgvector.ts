import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDocumentChunksPgvector1000000005 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS document_chunks (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        version_id      UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
        hospital_id     UUID NOT NULL REFERENCES hospitals(id),
        chunk_index     INTEGER NOT NULL,
        content_text    TEXT NOT NULL,
        page_number     INTEGER,
        token_count     INTEGER,
        embedding       vector(1024),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(version_id, chunk_index)
      );

      CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON document_chunks(document_id);
      CREATE INDEX IF NOT EXISTS idx_chunks_hospital_id ON document_chunks(hospital_id);

      -- HNSW index for fast approximate nearest-neighbor search
      CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw
        ON document_chunks
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS document_chunks;');
  }
}
