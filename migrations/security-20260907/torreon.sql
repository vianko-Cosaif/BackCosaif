CREATE TABLE IF NOT EXISTS operational_outbox (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  action TEXT NOT NULL,
  payload JSONB NOT NULL,
  previous JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS operational_outbox_pending_idx ON operational_outbox(id) WHERE processed_at IS NULL;
CREATE OR REPLACE FUNCTION capture_operational_event() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND to_jsonb(NEW) - 'updatedAt' - 'updated_at' IS NOT DISTINCT FROM to_jsonb(OLD) - 'updatedAt' - 'updated_at' THEN RETURN NEW; END IF;
  INSERT INTO operational_outbox(table_name, action, payload, previous)
    VALUES (TG_TABLE_NAME, TG_OP, to_jsonb(NEW), CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS security_outbox ON "movimiento_torreon_ferro";
CREATE TRIGGER security_outbox AFTER INSERT OR UPDATE ON "movimiento_torreon_ferro" FOR EACH ROW EXECUTE FUNCTION capture_operational_event();
DROP TRIGGER IF EXISTS security_outbox ON "arrastre_torreon";
CREATE TRIGGER security_outbox AFTER INSERT OR UPDATE ON "arrastre_torreon" FOR EACH ROW EXECUTE FUNCTION capture_operational_event();
DROP TRIGGER IF EXISTS security_outbox ON "arrastre_torreon_vagon";
CREATE TRIGGER security_outbox AFTER INSERT OR UPDATE ON "arrastre_torreon_vagon" FOR EACH ROW EXECUTE FUNCTION capture_operational_event();
DROP TRIGGER IF EXISTS security_outbox ON "incidente_torreon_ferro";
CREATE TRIGGER security_outbox AFTER INSERT OR UPDATE ON "incidente_torreon_ferro" FOR EACH ROW EXECUTE FUNCTION capture_operational_event();
DROP TRIGGER IF EXISTS security_outbox ON "incidente_arrastre_torreon";
CREATE TRIGGER security_outbox AFTER INSERT OR UPDATE ON "incidente_arrastre_torreon" FOR EACH ROW EXECUTE FUNCTION capture_operational_event();
DROP TRIGGER IF EXISTS security_outbox ON "ronda_torreon_movimiento";
CREATE TRIGGER security_outbox AFTER INSERT OR UPDATE ON "ronda_torreon_movimiento" FOR EACH ROW EXECUTE FUNCTION capture_operational_event();
