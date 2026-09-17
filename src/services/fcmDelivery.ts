import { createHash } from 'crypto';
import { prisma } from '../lib/prisma';

// Reserva persistente antes del envío: un reinicio no debe volver a avisar.
// Si el resultado queda incierto, se prefiere no repetir el aviso.
export async function claimFcmDelivery(eventId: string, token: string): Promise<boolean> {
  const recipient = createHash('sha256').update(token).digest('hex');
  const inserted = await prisma.$executeRaw`
    INSERT INTO fcm_deliveries (event_id, recipient_hash)
    VALUES (${eventId}, ${recipient}) ON CONFLICT DO NOTHING`;
  return inserted === 1;
}
