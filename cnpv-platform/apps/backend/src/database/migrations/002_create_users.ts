import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsers1000000002 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        hospital_id         UUID REFERENCES hospitals(id) ON DELETE SET NULL,
        employee_id         VARCHAR(100) UNIQUE,
        full_name_ar        VARCHAR(255) NOT NULL,
        full_name_en        VARCHAR(255),
        email               VARCHAR(255) UNIQUE NOT NULL,
        password_hash       TEXT NOT NULL,
        role                VARCHAR(50) NOT NULL DEFAULT 'nurse',
        department          VARCHAR(150),
        is_active           BOOLEAN NOT NULL DEFAULT TRUE,
        is_mfa_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
        mfa_secret          TEXT,
        last_login_at       TIMESTAMPTZ,
        failed_login_count  INTEGER NOT NULL DEFAULT 0,
        locked_until        TIMESTAMPTZ,
        created_by          UUID REFERENCES users(id),
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_users_hospital_id ON users(hospital_id);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash  TEXT NOT NULL UNIQUE,
        expires_at  TIMESTAMPTZ NOT NULL,
        revoked_at  TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS refresh_tokens;');
    await queryRunner.query('DROP TABLE IF EXISTS users;');
  }
}
