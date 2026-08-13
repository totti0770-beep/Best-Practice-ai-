import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateChat1000000006 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id       UUID NOT NULL REFERENCES users(id),
        hospital_id   UUID NOT NULL REFERENCES hospitals(id),
        session_type  VARCHAR(30) NOT NULL DEFAULT 'general',
        title_ar      VARCHAR(300),
        is_archived   BOOLEAN NOT NULL DEFAULT FALSE,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);

      CREATE TABLE IF NOT EXISTS chat_messages (
        id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        session_id          UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
        role                VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant')),
        content_ar          TEXT NOT NULL,
        answer_short        TEXT,
        answer_steps        JSONB,
        answer_warnings     TEXT[],
        citations           JSONB,
        confidence_level    VARCHAR(20),
        no_source_flag      BOOLEAN NOT NULL DEFAULT FALSE,
        raw_claude_response JSONB,
        prompt_tokens       INTEGER,
        completion_tokens   INTEGER,
        latency_ms          INTEGER,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS chat_messages;');
    await queryRunner.query('DROP TABLE IF EXISTS chat_sessions;');
  }
}
