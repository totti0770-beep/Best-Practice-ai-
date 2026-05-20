-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Confirm
DO $$
BEGIN
  RAISE NOTICE 'Extensions loaded: vector, uuid-ossp, pgcrypto';
END
$$;
