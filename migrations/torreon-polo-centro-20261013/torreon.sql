-- Requires torreon-polos-20261012. The migration runner applies this atomically.
-- Widen only Torreón natural origin/destination positions; preserve existing data.
ALTER TABLE movimiento_torreon_ferro
  DROP CONSTRAINT IF EXISTS movimiento_torreon_polo_origen_check,
  DROP CONSTRAINT IF EXISTS movimiento_torreon_polo_destino_check,
  ADD CONSTRAINT movimiento_torreon_polo_origen_check
    CHECK (polo_origen IS NULL OR polo_origen IN ('NORTE', 'CENTRO', 'SUR')),
  ADD CONSTRAINT movimiento_torreon_polo_destino_check
    CHECK (polo_destino IS NULL OR polo_destino IN ('NORTE', 'CENTRO', 'SUR'));
