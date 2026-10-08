import { Prisma } from '../../../generated';
import { prismaTorreon } from '../../db/prisma';
import { DomainError } from '../../utils/domainError';
import { compareNaturalUnits } from './cola.policy';

type Tx = Prisma.TransactionClient;
export type NaturalActor = { id: number; rol?: string };
export const unidadInclude = {
  movimientos: { include: { incidentes: { include: { fotos: true } }, fotos: true }, orderBy: { id: 'asc' as const } },
  incidentes: { include: { fotos: true }, orderBy: { fechaInicio: 'asc' as const } },
};
export type NaturalUnit = Prisma.UnidadAtencionTorreonGetPayload<{ include: typeof unidadInclude }>;
const closed = new Set(['CONCLUIDA', 'CANCELADA']);

export async function lockNaturalLocality(tx: Tx, localidadId: number) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(73008, ${localidadId}::integer)::text`;
}
export async function auditNatural(tx: Tx, unidad: { id: number; localidadId: number }, actor: NaturalActor, accion: string, datos?: Prisma.InputJsonValue, movimientoId?: number, incidenteId?: number) {
  await tx.bitacoraNaturalTorreon.create({ data: { localidadId: unidad.localidadId, unidadId: unidad.id, usuarioId: actor.id, rol: actor.rol, accion, datos, movimientoId, incidenteId } });
}
export class ColaNaturalModel {
  static async obtenerTx(tx: Tx, id: number) {
    const unit = await tx.unidadAtencionTorreon.findUnique({ where: { id }, include: unidadInclude });
    if (!unit) throw new DomainError(404, 'Unidad de atención no encontrada');
    return unit;
  }
  static async asegurarUnidad(tx: Tx, movimiento: { id: number; unidadId: number | null; localidadId: number; fechaSolicitud: Date; estado: string; operadorId: number | null; fechaInicio: Date | null; fechaFin: Date | null }) {
    if (movimiento.unidadId) return this.obtenerTx(tx, movimiento.unidadId);
    const unit = await tx.unidadAtencionTorreon.create({ data: {
      localidadId: movimiento.localidadId, fechaRecepcion: movimiento.fechaSolicitud,
      operadorId: movimiento.operadorId, fechaInicio: movimiento.fechaInicio, fechaFin: movimiento.fechaFin,
      estado: movimiento.estado === 'DETENIDO' ? 'DETENIDA' : movimiento.estado === 'EN_PROCESO' ? 'EN_PROCESO' : movimiento.estado === 'CONCLUIDO' ? 'CONCLUIDA' : movimiento.estado === 'CANCELADO' ? 'CANCELADA' : 'PENDIENTE',
      movimientos: { connect: { id: movimiento.id } },
    } });
    await tx.incidenteTorreonFerro.updateMany({ where: { movimientoId: movimiento.id, unidadId: null }, data: { unidadId: unit.id } });
    return this.obtenerTx(tx, unit.id);
  }
  static async bloqueante(tx: Tx, unit: NaturalUnit) {
    const members = unit.movimientos.filter(m => !['CONCLUIDO', 'CANCELADO'].includes(m.estado));
    const resources: Prisma.IncidenteTorreonFerroWhereInput[] = members.flatMap(m => [
      ...[m.viaOrigenId, m.viaDestinoId].filter((id): id is number => !!id).map(id => ({ viaBloqueadaId: id })),
      ...[m.seccionOrigenId, m.seccionDestinoId].filter((id): id is number => !!id).map(id => ({ seccionBloqueadaId: id })),
    ]);
    return tx.incidenteTorreonFerro.findFirst({ where: {
      localidadId: unit.localidadId, estado: 'ABIERTO', OR: [{ unidadId: unit.id }, { movimientoId: { in: members.map(m => m.id) } }, ...resources],
    }, orderBy: [{ fechaInicio: 'asc' }, { id: 'asc' }] });
  }
  static async recalcularTx(tx: Tx, localidadId: number, actor: NaturalActor) {
    const stopped = await tx.unidadAtencionTorreon.findMany({ where: { localidadId, estado: 'DETENIDA' }, include: unidadInclude, orderBy: { id: 'asc' } });
    for (const unit of stopped) {
      if (await this.bloqueante(tx, unit)) continue;
      const fechaHabilitacion = new Date();
      await tx.unidadAtencionTorreon.update({ where: { id: unit.id }, data: { estado: 'LISTA_REANUDAR', fechaHabilitacion } });
      await auditNatural(tx, unit, actor, 'HABILITAR_REANUDACION', { fechaHabilitacion: fechaHabilitacion.toISOString(), operadorId: unit.operadorId });
    }
  }
  static async listarTx(tx: Tx, localidadId: number, empresaId?: number, historial = false) {
    const rows = await tx.unidadAtencionTorreon.findMany({ where: {
      localidadId, estado: historial ? { in: [...closed] } : { notIn: [...closed] },
      movimientos: { some: empresaId ? { empresaId } : {} },
    }, include: unidadInclude });
    const result = [];
    for (const row of rows) {
      const blocking = closed.has(row.estado) ? null : await this.bloqueante(tx, row);
      const movimientos = empresaId ? row.movimientos.filter(m => m.empresaId === empresaId) : row.movimientos;
      const incidentes = empresaId ? row.incidentes.filter(i => movimientos.some(m => m.id === i.movimientoId)) : row.incidentes;
      result.push({ ...row, movimientos, incidentes, totalIntegrantes: row.movimientos.length, disponible: ['PENDIENTE', 'LISTA_REANUDAR'].includes(row.estado) && !blocking, incidenteBloqueanteId: blocking?.id ?? null });
    }
    return result.sort(compareNaturalUnits).map((row, i) => ({ ...row, posicion: i + 1 }));
  }
  static listar(localidadId: number, empresaId?: number, historial = false) {
    return prismaTorreon.$transaction(tx => this.listarTx(tx, localidadId, empresaId, historial));
  }
  static historial(id: number) {
    return prismaTorreon.$transaction(async tx => {
      const unit = await this.obtenerTx(tx, id);
      const formation = await tx.bitacoraNaturalTorreon.findFirst({ where: { unidadId: id, accion: 'FORMAR_CONJUNTO' } });
      const origins = (formation?.datos as { unidadesOrigen?: number[] } | null)?.unidadesOrigen ?? [];
      return tx.bitacoraNaturalTorreon.findMany({ where: { OR: [{ unidadId: { in: [id, ...origins] } }, { movimientoId: { in: unit.movimientos.map(m => m.id) } }] }, orderBy: [{ fecha: 'asc' }, { id: 'asc' }] });
    });
  }
  static async siguienteTx(tx: Tx, localidadId: number, operadorId: number) {
    const rows = await this.listarTx(tx, localidadId);
    return rows.find(u => u.estado === 'EN_PROCESO' && u.operadorId === operadorId)
      ?? rows.find(u => u.disponible && (u.operadorId === operadorId || u.operadorId === null));
  }
  static async exigirTurno(tx: Tx, unit: NaturalUnit, operadorId: number, reanudar: boolean) {
    if (unit.operadorId && unit.operadorId !== operadorId) throw new DomainError(409, 'Unidad asignada a otro maquinista');
    if (unit.estado === 'EN_PROCESO' && unit.operadorId === operadorId) return false;
    if (unit.estado !== (reanudar ? 'LISTA_REANUDAR' : 'PENDIENTE')) throw new DomainError(409, reanudar ? 'La unidad todavía no está habilitada para reanudar' : 'La unidad no está pendiente de inicio');
    const blocking = await this.bloqueante(tx, unit);
    if (blocking) throw new DomainError(409, 'La unidad sigue bloqueada por un incidente abierto', { incidenteId: blocking.id });
    const next = await this.siguienteTx(tx, unit.localidadId, operadorId);
    if (!next || next.id !== unit.id) throw new DomainError(409, 'Actualiza la cola: debes atender primero la siguiente unidad asignada', { unidadId: next?.id });
    return true;
  }
  static async priorizar(ids: number[], enConjunto: boolean, actor: NaturalActor) {
    return prismaTorreon.$transaction(async tx => {
      const first = await this.obtenerTx(tx, ids[0]);
      await lockNaturalLocality(tx, first.localidadId);
      const units = await Promise.all(ids.map(id => this.obtenerTx(tx, id)));
      if (units.some(u => u.localidadId !== first.localidadId || u.estado !== 'PENDIENTE')) throw new DomainError(409, 'Solo puedes priorizar solicitudes pendientes de la misma localidad');
      let selected = units;
      if (enConjunto) {
        if (units.length < 2 || units.some(u => u.modalidad !== 'INDIVIDUAL')) throw new DomainError(400, 'Selecciona al menos dos solicitudes individuales para formar un conjunto');
        const operators = [...new Set(units.map(u => u.operadorId).filter(id => id !== null))];
        if (operators.length > 1) throw new DomainError(409, 'Las solicitudes tienen distintos maquinistas; unifica su asignación antes de agrupar');
        const group = await tx.unidadAtencionTorreon.create({ data: {
          localidadId: first.localidadId, modalidad: 'CONJUNTO', operadorId: operators[0] ?? null,
          fechaRecepcion: new Date(Math.min(...units.map(u => u.fechaRecepcion.getTime()))),
        } });
        await tx.movimientoTorreonFerro.updateMany({ where: { unidadId: { in: ids } }, data: { unidadId: group.id, operadorId: group.operadorId } });
        // Superseded individual containers have no members; movement IDs are unchanged.
        await tx.unidadAtencionTorreon.updateMany({ where: { id: { in: ids } }, data: { estado: 'CANCELADA' } });
        selected = [await this.obtenerTx(tx, group.id)];
        await auditNatural(tx, group, actor, 'FORMAR_CONJUNTO', { unidadesOrigen: ids, movimientoIds: selected[0].movimientos.map(m => m.id) });
      }
      const min = await tx.unidadAtencionTorreon.aggregate({ where: { localidadId: first.localidadId }, _min: { ordenManual: true } });
      const start = Math.min(0, min._min.ordenManual ?? 0) - selected.length;
      for (let i = 0; i < selected.length; i++) {
        await tx.unidadAtencionTorreon.update({ where: { id: selected[i].id }, data: { ordenManual: start + i } });
        await auditNatural(tx, selected[i], actor, 'PRIORIZAR', { ordenManual: start + i, modalidad: selected[i].modalidad });
      }
      return this.listarTx(tx, first.localidadId);
    });
  }
  static async asignar(id: number, operadorId: number, actor: NaturalActor) {
    return prismaTorreon.$transaction(async tx => {
      const initial = await this.obtenerTx(tx, id);
      await lockNaturalLocality(tx, initial.localidadId);
      const unit = await this.obtenerTx(tx, id);
      if (closed.has(unit.estado) || unit.estado === 'EN_PROCESO') throw new DomainError(409, 'No puedes reasignar una unidad en ejecución o concluida');
      await tx.unidadAtencionTorreon.update({ where: { id }, data: { operadorId } });
      await tx.movimientoTorreonFerro.updateMany({ where: { unidadId: id, estado: { notIn: ['CONCLUIDO', 'CANCELADO'] } }, data: { operadorId } });
      await auditNatural(tx, unit, actor, 'ASIGNAR', { operadorAnteriorId: unit.operadorId, operadorId });
      return this.obtenerTx(tx, id);
    });
  }
}
