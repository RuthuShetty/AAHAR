-- AAHAR Database Initialization Script
-- Executed on PostgreSQL container first run

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Ensure schema permissions
GRANT ALL PRIVILEGES ON DATABASE aahar TO aahar;

-- Log confirmation
DO $$
BEGIN
  RAISE NOTICE 'AAHAR PostgreSQL + TimescaleDB initialized successfully.';
END $$;
