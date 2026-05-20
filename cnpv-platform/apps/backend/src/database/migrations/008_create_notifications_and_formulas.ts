import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationsAndFormulas1000000008 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        hospital_id   UUID NOT NULL REFERENCES hospitals(id),
        user_id       UUID REFERENCES users(id),
        target_role   VARCHAR(50),
        type          VARCHAR(50) NOT NULL,
        title_ar      TEXT NOT NULL,
        body_ar       TEXT,
        entity_type   VARCHAR(50),
        entity_id     UUID,
        is_read       BOOLEAN NOT NULL DEFAULT FALSE,
        read_at       TIMESTAMPTZ,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_hospital_role ON notifications(hospital_id, target_role);
      CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(is_read) WHERE is_read = FALSE;

      CREATE TABLE IF NOT EXISTS dose_formulas (
        id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        hospital_id         UUID NOT NULL REFERENCES hospitals(id),
        drug_name_ar        VARCHAR(255) NOT NULL,
        drug_name_en        VARCHAR(255),
        formula_type        VARCHAR(50) NOT NULL,
        formula_expression  TEXT NOT NULL,
        formula_variables   JSONB NOT NULL DEFAULT '[]',
        min_dose            DECIMAL(10,4),
        max_dose            DECIMAL(10,4),
        dose_unit           VARCHAR(20) NOT NULL,
        route               VARCHAR(50),
        source_document_id  UUID REFERENCES documents(id),
        source_page         INTEGER,
        created_by          UUID NOT NULL REFERENCES users(id),
        is_active           BOOLEAN NOT NULL DEFAULT TRUE,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_dose_formulas_hospital_id ON dose_formulas(hospital_id);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS dose_formulas;');
    await queryRunner.query('DROP TABLE IF EXISTS notifications;');
  }
}
