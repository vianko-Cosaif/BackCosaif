CREATE TABLE IF NOT EXISTS payment_operations (
  key VARCHAR(128) PRIMARY KEY,
  request_hash CHAR(64) NOT NULL,
  actor_id INTEGER NOT NULL,
  corte_id INTEGER NOT NULL REFERENCES "CorteCobro"(id) ON DELETE RESTRICT,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS payment_operations_cut_idx ON payment_operations(corte_id);
