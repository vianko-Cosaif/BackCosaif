-- AlterTable
ALTER TABLE "movimiento_torreon_ferro" ADD COLUMN     "locomotora_remolque" INTEGER,
ADD COLUMN     "lote_captura_id" TEXT,
ADD COLUMN     "polo" TEXT,
ADD COLUMN     "unidad_id" INTEGER;

-- AlterTable
ALTER TABLE "incidente_torreon_ferro" ADD COLUMN     "confirmado_por_rol" TEXT,
ADD COLUMN     "unidad_id" INTEGER;

-- CreateTable
CREATE TABLE "unidad_atencion_torreon" (
    "id" SERIAL NOT NULL,
    "localidad_id" INTEGER NOT NULL,
    "modalidad" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "operador_id" INTEGER,
    "orden_manual" INTEGER,
    "fecha_recepcion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_habilitacion" TIMESTAMP(3),
    "fecha_inicio" TIMESTAMP(3),
    "fecha_fin" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unidad_atencion_torreon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bitacora_natural_torreon" (
    "id" SERIAL NOT NULL,
    "localidad_id" INTEGER NOT NULL,
    "unidad_id" INTEGER,
    "movimiento_id" INTEGER,
    "incidente_id" INTEGER,
    "usuario_id" INTEGER NOT NULL,
    "rol" TEXT,
    "accion" TEXT NOT NULL,
    "datos" JSONB,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bitacora_natural_torreon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "unidad_atencion_torreon_localidad_id_estado_idx" ON "unidad_atencion_torreon"("localidad_id", "estado");

-- CreateIndex
CREATE INDEX "unidad_atencion_torreon_operador_id_estado_idx" ON "unidad_atencion_torreon"("operador_id", "estado");

-- CreateIndex
CREATE INDEX "bitacora_natural_torreon_unidad_id_fecha_idx" ON "bitacora_natural_torreon"("unidad_id", "fecha");

-- CreateIndex
CREATE INDEX "bitacora_natural_torreon_movimiento_id_fecha_idx" ON "bitacora_natural_torreon"("movimiento_id", "fecha");

-- CreateIndex
CREATE INDEX "movimiento_torreon_ferro_unidad_id_idx" ON "movimiento_torreon_ferro"("unidad_id");

-- CreateIndex
CREATE INDEX "movimiento_torreon_ferro_lote_captura_id_idx" ON "movimiento_torreon_ferro"("lote_captura_id");

-- AddForeignKey
ALTER TABLE "movimiento_torreon_ferro" ADD CONSTRAINT "movimiento_torreon_ferro_unidad_id_fkey" FOREIGN KEY ("unidad_id") REFERENCES "unidad_atencion_torreon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidente_torreon_ferro" ADD CONSTRAINT "incidente_torreon_ferro_unidad_id_fkey" FOREIGN KEY ("unidad_id") REFERENCES "unidad_atencion_torreon"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Preserve original requests, incidents, photos and historical rounds.
-- Each existing request becomes an independent unit; never infer a group.
DO $$
DECLARE movement RECORD; new_unit_id INTEGER;
BEGIN
  FOR movement IN SELECT * FROM movimiento_torreon_ferro WHERE unidad_id IS NULL ORDER BY id LOOP
    INSERT INTO unidad_atencion_torreon (localidad_id, modalidad, estado, operador_id, fecha_recepcion, fecha_inicio, fecha_fin, updated_at)
    VALUES (movement.localidad_id, 'INDIVIDUAL', CASE movement.estado::text WHEN 'EN_PROCESO' THEN 'EN_PROCESO' WHEN 'DETENIDO' THEN 'DETENIDA' WHEN 'CONCLUIDO' THEN 'CONCLUIDA' WHEN 'CANCELADO' THEN 'CANCELADA' ELSE 'PENDIENTE' END,
            movement.operador_id, movement.fecha_solicitud, movement.fecha_inicio, movement.fecha_fin, NOW())
    RETURNING id INTO new_unit_id;
    UPDATE movimiento_torreon_ferro SET unidad_id = new_unit_id WHERE id = movement.id;
    INSERT INTO bitacora_natural_torreon (localidad_id, unidad_id, movimiento_id, usuario_id, rol, accion, datos)
    VALUES (movement.localidad_id, new_unit_id, movement.id, 0, 'SISTEMA', 'MIGRAR_MODELO', jsonb_build_object('estadoOriginal', movement.estado, 'operadorId', movement.operador_id));
  END LOOP;
END;
$$;
UPDATE incidente_torreon_ferro i SET unidad_id = m.unidad_id FROM movimiento_torreon_ferro m WHERE i.movimiento_id = m.id;
-- A pause with every own/resource impediment solved becomes ready, without starting it.
UPDATE unidad_atencion_torreon u SET estado = 'LISTA_REANUDAR', fecha_habilitacion = NOW()
WHERE u.estado = 'DETENIDA' AND NOT EXISTS (
  SELECT 1 FROM incidente_torreon_ferro i
  WHERE i.localidad_id = u.localidad_id AND i.estado::text = 'ABIERTO' AND (
    i.unidad_id = u.id OR EXISTS (
      SELECT 1 FROM movimiento_torreon_ferro m WHERE m.unidad_id = u.id AND (
        i.movimiento_id = m.id OR i.via_bloqueada_id IN (m.via_origen_id, m.via_destino_id)
        OR i.seccion_bloqueada_id IN (m.seccion_origen_id, m.seccion_destino_id)
      )
    )
  )
);
INSERT INTO bitacora_natural_torreon (localidad_id, unidad_id, usuario_id, rol, accion, datos)
SELECT localidad_id, id, 0, 'SISTEMA', 'HABILITAR_REANUDACION', jsonb_build_object('fechaHabilitacion', fecha_habilitacion, 'origen', 'MIGRACION')
FROM unidad_atencion_torreon WHERE estado = 'LISTA_REANUDAR';
ALTER TABLE unidad_atencion_torreon ADD CONSTRAINT natural_unit_mode CHECK (modalidad IN ('INDIVIDUAL', 'CONJUNTO'));
ALTER TABLE unidad_atencion_torreon ADD CONSTRAINT natural_unit_state CHECK (estado IN ('PENDIENTE', 'EN_PROCESO', 'DETENIDA', 'LISTA_REANUDAR', 'CONCLUIDA', 'CANCELADA'));
CREATE TRIGGER security_outbox AFTER INSERT OR UPDATE ON unidad_atencion_torreon FOR EACH ROW EXECUTE FUNCTION capture_operational_event();
