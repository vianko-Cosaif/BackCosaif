CREATE TABLE IF NOT EXISTS offline_idempotency (
  key VARCHAR(128) PRIMARY KEY,
  user_id INTEGER NOT NULL,
  request_hash CHAR(64) NOT NULL,
  state VARCHAR(16) NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  response_content_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);
CREATE INDEX IF NOT EXISTS offline_idempotency_expires_idx ON offline_idempotency(expires_at);
CREATE TABLE IF NOT EXISTS durable_jobs (
  key VARCHAR(200) PRIMARY KEY,
  kind VARCHAR(80) NOT NULL,
  payload JSONB NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_until TIMESTAMPTZ,
  lock_token UUID,
  completed_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS durable_jobs_pending_idx ON durable_jobs(available_at) WHERE completed_at IS NULL;
CREATE TABLE IF NOT EXISTS incident_reprogramming (
  incident_id INTEGER PRIMARY KEY REFERENCES "Incidente"(id) ON DELETE CASCADE,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Existing Prisma-created tables did not have SQL defaults on these columns.
ALTER TABLE offline_idempotency ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE offline_idempotency ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '7 days');
