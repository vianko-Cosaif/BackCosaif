-- Torreón natural only. Nullable fields preserve unknown historical endpoints.
-- Deliberately no DEFAULT, UPDATE, or copy from the legacy single polo column.
ALTER TABLE movimiento_torreon_ferro
  ADD COLUMN IF NOT EXISTS polo_origen TEXT,
  ADD COLUMN IF NOT EXISTS polo_destino TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'movimiento_torreon_polo_origen_check'
    AND conrelid = 'movimiento_torreon_ferro'::regclass) THEN
    ALTER TABLE movimiento_torreon_ferro ADD CONSTRAINT movimiento_torreon_polo_origen_check
      CHECK (polo_origen IS NULL OR polo_origen IN ('NORTE', 'SUR'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'movimiento_torreon_polo_destino_check'
    AND conrelid = 'movimiento_torreon_ferro'::regclass) THEN
    ALTER TABLE movimiento_torreon_ferro ADD CONSTRAINT movimiento_torreon_polo_destino_check
      CHECK (polo_destino IS NULL OR polo_destino IN ('NORTE', 'SUR'));
  END IF;
END $$;
