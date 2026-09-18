import { createHash } from 'crypto';
import { prisma } from '../lib/prisma';

let dedicatedTable: Promise<boolean> | undefined;

function hasDedicatedTable(): Promise<boolean> {
  if (!dedicatedTable) {
    // Compatibilidad con instalaciones anteriores, sin exigir tablas nuevas.
    dedicatedTable = prisma.$queryRaw<Array<{ available: boolean }>>`
      SELECT to_regclass('fcm_deliveries') IS NOT NULL AS available`
      .then(rows => rows[0]?.available === true)
      .catch(error => { dedicatedTable = undefined; throw error; });
  }
  return dedicatedTable;
}

// Reserva persistente antes del envío: un reinicio no debe volver a avisar.
// Si el resultado queda incierto, se prefiere no repetir el aviso.
export async function claimFcmDelivery(eventId: string, token: string): Promise<boolean> {
  const recipient = createHash('sha256').update(token).digest('hex');
  if (await hasDedicatedTable()) {
    const inserted = await prisma.$executeRaw`
      INSERT INTO fcm_deliveries (event_id, recipient_hash)
      VALUES (${eventId}, ${recipient}) ON CONFLICT DO NOTHING`;
    return inserted === 1;
  }

  // Reutiliza la tabla operativa existente. La reserva nace completada para
  // que ningún worker la ejecute; solo guarda una clave, sin token ni mensaje.
  const key = 'fcm:delivery:v1:' + createHash('sha256')
    .update(JSON.stringify([eventId, recipient])).digest('hex');
  const inserted = await prisma.$executeRaw`
    INSERT INTO durable_jobs (key, kind, payload, completed_at)
    VALUES (${key}, 'fcm.delivery', '{}'::jsonb, NOW())
    ON CONFLICT (key) DO NOTHING`;
  return inserted === 1;
}
