SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';
CREATE TABLE IF NOT EXISTS report_exports (
  id UUID PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES "Usuario"(id) ON DELETE CASCADE,
  authorization_hash CHAR(64) NOT NULL,
  format VARCHAR(8) NOT NULL CHECK (format IN ('csv', 'xlsx', 'pdf')),
  filters JSONB NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 day',
  run_token UUID,
  artifact_token UUID,
  attempts INTEGER NOT NULL DEFAULT 0,
  row_count INTEGER,
  bytes BIGINT,
  error TEXT
);
CREATE INDEX IF NOT EXISTS report_exports_created_at_idx ON report_exports(created_at);
CREATE INDEX IF NOT EXISTS report_exports_expires_at_idx ON report_exports(expires_at);
CREATE INDEX IF NOT EXISTS report_exports_owner_id_idx ON report_exports(owner_id);

-- Verified with EXPLAIN ANALYZE on a synthetic 60,000-movement fixture.
CREATE INDEX IF NOT EXISTS "Movimiento_createdAt_id_idx" ON "Movimiento" ("createdAt" DESC, id DESC);
CREATE INDEX IF NOT EXISTS "Movimiento_empresaId_createdAt_id_idx" ON "Movimiento" ("empresaId", "createdAt" DESC, id DESC);
CREATE INDEX IF NOT EXISTS "Movimiento_localidadId_createdAt_id_idx" ON "Movimiento" ("localidadId", "createdAt" DESC, id DESC);
