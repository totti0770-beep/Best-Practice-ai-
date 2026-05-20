import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHospitals1000000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hospitals (
        id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name_ar       VARCHAR(255) NOT NULL,
        name_en       VARCHAR(255),
        license_no    VARCHAR(100) UNIQUE,
        city          VARCHAR(100),
        is_active     BOOLEAN NOT NULL DEFAULT TRUE,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS hospitals;');
  }
}
