import type { Prisma } from '../../../generated';
import { prismaTorreon } from '../../db/prisma';
import { RondaModel } from '../rondas/ronda.model';
import { ArrastreModel } from '../arrastres/arrastre.model';

import { INCIDENT_WINDOW_MS, AUTO_CLOSE_PREFIX, RETRY_PREFIX, MAX_INCIDENTS } from './incidentPolicy';

async function incidentChain(tx: Prisma.TransactionClient, movement: { id: number; clientRequestId: string | null; localidadId: number; empresaId: number }) {
  const ids = [movement.id];
  let requestId = movement.clientRequestId;
  while (requestId?.startsWith(RETRY_PREFIX) && ids.length < 20) {
    const id = Number(requestId.slice(RETRY_PREFIX.length));
    if (!Number.isSafeInteger(id) || id <= 0) break;
    const previous = await tx.incidenteTorreonFerro.findUnique({ where: { id }, include: { movimiento: true } });
    if (!previous || previous.localidadId !== movement.localidadId || previous.movimiento.empresaId !== movement.empresaId || ids.includes(previous.movimientoId)) break;
    ids.push(previous.movimientoId);
    requestId = previous.movimiento.clientRequestId;
  }
  return ids;
}

/** Claim, close and retry commit together. A restart or another worker cannot clone twice. */
export async function expireNaturalIncident(id: number, now = new Date()) {
  return prismaTorreon.$transaction(async tx => {
    const incident = await tx.incidenteTorreonFerro.findUnique({ where: { id }, include: { movimiento: true } });
    if (!incident || incident.estado !== 'ABIERTO' || incident.fechaInicio.getTime() + INCIDENT_WINDOW_MS > now.getTime()) return { changed: false };
    const claimed = await tx.incidenteTorreonFerro.updateMany({
      where: { id, estado: 'ABIERTO', fechaInicio: { lte: new Date(now.getTime() - INCIDENT_WINDOW_MS) } },
      data: { estado: 'RESUELTO', fechaResolucion: now, resueltoPorId: null, solucion: `${AUTO_CLOSE_PREFIX} Sin atención dentro de 10 minutos.` },
    });
    if (!claimed.count) return { changed: false };
    const original = incident.movimiento;
    if (original.finalizado || ['CANCELADO', 'CONCLUIDO'].includes(original.estado)) {
      await RondaModel.recalcularBloqueosLocalidad(tx, original.localidadId);
      await ArrastreModel.recalcularBloqueosLocalidad(tx, original.localidadId);
      return { changed: true, nuevoMovimientoId: null };
    }
    const chain = await incidentChain(tx, original);
    const attempts = await tx.incidenteTorreonFerro.count({ where: { movimientoId: { in: chain } } });
    let nuevoMovimientoId: number | null = null;
    if (attempts < MAX_INCIDENTS) {
      const next = await tx.movimientoTorreonFerro.create({ data: {
        clientRequestId: `${RETRY_PREFIX}${id}`,
        empresaId: original.empresaId, localidadId: original.localidadId,
        creadoPorId: original.creadoPorId, clienteId: original.clienteId,
        supervisorId: original.supervisorId, coordinadorId: original.coordinadorId,
        operadorId: null, estado: 'SOLICITADO', finalizado: false, fechaSolicitud: now,
        viaOrigenId: original.viaOrigenId, viaDestinoId: original.viaDestinoId,
        seccionOrigenId: original.seccionOrigenId, seccionDestinoId: original.seccionDestinoId,
        locomotiveNumber: original.locomotiveNumber, prioridad: original.prioridad,
        tipoMovimiento: original.tipoMovimiento, instrucciones: original.instrucciones,
        posicionCabina: original.posicionCabina, posicionChimenea: original.posicionChimenea, direccionEmpuje: original.direccionEmpuje,
        empresaNombreSnapshot: original.empresaNombreSnapshot, localidadNombreSnapshot: original.localidadNombreSnapshot,
        viaOrigenNombreSnapshot: original.viaOrigenNombreSnapshot, viaDestinoNombreSnapshot: original.viaDestinoNombreSnapshot,
        seccionOrigenNombreSnapshot: original.seccionOrigenNombreSnapshot, seccionDestinoNombreSnapshot: original.seccionDestinoNombreSnapshot,
      } });
      nuevoMovimientoId = next.id;
      await RondaModel.insertarMovimiento(tx, next);
    }
    const outcome = nuevoMovimientoId ? `Reprogramado en movimiento #${nuevoMovimientoId}.` : `Cancelado tras ${attempts} incidentes en la misma solicitud.`;
    await tx.movimientoTorreonFerro.update({ where: { id: original.id }, data: {
      estado: 'CANCELADO', finalizado: true, fechaFin: now, fechaPausa: null,
      instrucciones: [original.instrucciones, `Incidente #${id} no resuelto. ${outcome}`].filter(Boolean).join(' | '),
    } });
    await tx.incidenteTorreonFerro.update({ where: { id }, data: { solucion: `${AUTO_CLOSE_PREFIX} ${outcome}` } });
    await RondaModel.marcarMovimientoCancelado(tx, original.id, now);
    await RondaModel.recalcularBloqueosLocalidad(tx, original.localidadId);
    await ArrastreModel.recalcularBloqueosLocalidad(tx, original.localidadId);
    return { changed: true, nuevoMovimientoId };
  }, { isolationLevel: 'Serializable' });
}

export function startIncidentExpiry() {
  let running = false;
  const scan = async () => {
    if (running) return;
    running = true;
    try {
      const now = new Date();
      const incidents = await prismaTorreon.incidenteTorreonFerro.findMany({
        where: { estado: 'ABIERTO', fechaInicio: { lte: new Date(now.getTime() - INCIDENT_WINDOW_MS) } },
        orderBy: [{ fechaInicio: 'asc' }, { id: 'asc' }], take: 100, select: { id: true },
      });
      for (const incident of incidents) {
        try { await expireNaturalIncident(incident.id, now); }
        catch { console.error('Torreón: no se pudo reprogramar incidente', incident.id); }
      }
    } catch { console.error('Torreón: no se pudo consultar vencimiento de incidentes'); }
    finally { running = false; }
  };
  const timer = setInterval(() => void scan(), 15_000);
  timer.unref();
  void scan();
  return () => clearInterval(timer);
}
