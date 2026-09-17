CREATE TABLE IF NOT EXISTS fcm_deliveries (
  event_id TEXT NOT NULL,
  recipient_hash CHAR(64) NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, recipient_hash)
);
