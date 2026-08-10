import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogs1000000007 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        hospital_id     UUID REFERENCES hospitals(id),
        user_id         UUID REFERENCES users(id),
        user_email      VARCHAR(255),
        user_role       VARCHAR(50),
        event_type      VARCHAR(100) NOT NULL,
        entity_type     VARCHAR(50),
        entity_id       UUID,
        ip_address      INET,
        user_agent      TEXT,
        request_method  VARCHAR(10),
        request_path    TEXT,
        old_values      JSONB,
        new_values      JSONB,
        metadata        JSONB,
        success         BOOLEAN NOT NULL DEFAULT TRUE,
        error_message   TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_audit_logs_hospital_id ON audit_logs(hospital_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS audit_logs;');
  }
}
