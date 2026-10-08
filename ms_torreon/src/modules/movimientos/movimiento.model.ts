import {
  EstadoIncidenteTorreon,
  EstadoMovimientoTorreon,
  Prisma,
  PrismaClient,
  TipoFotoMovimientoTorreon,
} from "../../../generated";
import { prismaTorreon } from "../../db/prisma";
import { DomainError } from "../../utils/domainError";
import { guardarFotoTorreon } from "../../utils/imagenesTorreon";
import { IncidenteModel } from "../incidentes/incidente.model";
import { crearIncidenteMovimientoSchema } from "../incidentes/incidente.schemas";
import { ColaNaturalModel, auditNatural, lockNaturalLocality, type NaturalActor } from "../cola/cola.model";
import {
  createMovimientoSchema,
  createLoteSchema,
  validarCondicionesNaturales,
  editMovimientoSchema,
  finalizarMovimientoSchema,
  fotoInputSchema,
  iniciarMovimientoSchema,
  registrarFotosMovimientoSchema,
  reanudarMovimientoSchema,
} from "./movimiento.schemas";
import { z } from "zod";
import { createHash } from "crypto";

type Tx = Prisma.TransactionClient;
type FotoInput = z.infer<typeof fotoInputSchema>;

const MAX_FOTOS_MOVIMIENTO: Record<TipoFotoMovimientoTorreon, number> = {
  [TipoFotoMovimientoTorreon.ANTES_MOVIMIENTO]: 4,
  [TipoFotoMovimientoTorreon.PROCESO_MOVIMIENTO]: 4,
  [TipoFotoMovimientoTorreon.FIN_MOVIMIENTO]: 4,
};

const includeMovimientoDetalle = {
  unidad: { include: { movimientos: { orderBy: { id: "asc" as const } }, incidentes: true } },
  rondas: {
    include: {
      ronda: true,
      bloqueadoPorIncidente: true,
    },
    orderBy: { createdAt: "desc" as const },
  },
  incidentes: {
    include: {
      fotos: { orderBy: { orden: "asc" as const } },
    },
    orderBy: { createdAt: "desc" as const },
  },
  fotos: {
    orderBy: [
      { tipo: "asc" as const },
      { orden: "asc" as const },
    ],
  },
};

const buildMovimientoListInclude = (includeFotos: boolean) => ({
  unidad: { include: { movimientos: { orderBy: { id: "asc" as const } }, incidentes: true } },
  rondas: {
    include: {
      ronda: true,
      bloqueadoPorIncidente: true,
    },
    orderBy: { createdAt: "desc" as const },
  },
  incidentes: {
    include: {
      _count: { select: { fotos: true } },
      ...(includeFotos ? { fotos: { orderBy: { orden: "asc" as const } } } : {}),
    },
    orderBy: { createdAt: "desc" as const },
  },
  _count: { select: { fotos: true } },
  ...(includeFotos
    ? {
        fotos: {
          orderBy: [
            { tipo: "asc" as const },
            { orden: "asc" as const },
          ],
        },
      }
    : {}),
}) satisfies Prisma.MovimientoTorreonFerroInclude;

type MovimientoListQuery = {
  localidadId?: number;
  empresaId?: number;
  estado?: string;
  vista?: string;
  page?: number;
  pageSize?: number;
  includeFotos?: boolean;
};

const compact = <T extends Record<string, unknown>>(data: T): T => {
  Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);
  return data;
};

const isMovimientoCerrado = (estado: EstadoMovimientoTorreon) => (
  estado === EstadoMovimientoTorreon.CONCLUIDO || estado === EstadoMovimientoTorreon.CANCELADO
);

const requestFingerprint = (input: Record<string, unknown>) => createHash('sha256').update(JSON.stringify([
  'empresaId', 'localidadId', 'creadoPorId', 'clienteId', 'locomotiveNumber', 'viaOrigenId', 'viaDestinoId',
  'seccionOrigenId', 'seccionDestinoId', 'tipoMovimiento', 'locomotoraRemolque', 'polo',
  'posicionCabina', 'posicionChimenea', 'direccionEmpuje', 'instrucciones',
].map(key => [key, input[key] ?? null]))).digest('hex');

async function validateRetry(tx: Tx, movement: Prisma.MovimientoTorreonFerroGetPayload<{}>, input: z.infer<typeof createMovimientoSchema>) {
  const receipt = await tx.bitacoraNaturalTorreon.findFirst({ where: { movimientoId: movement.id, accion: 'SOLICITAR' }, orderBy: { id: 'asc' } });
  const original = (receipt?.datos as { requestFingerprint?: string } | null)?.requestFingerprint ?? requestFingerprint(movement);
  if (original !== requestFingerprint(input)) throw new DomainError(409, 'Este identificador de envío ya fue utilizado con otros datos; actualiza la captura');
}

async function getMovimientoOrThrow(tx: Tx | PrismaClient, movimientoId: number) {
  const movimiento = await tx.movimientoTorreonFerro.findUnique({ where: { id: movimientoId } });
  if (!movimiento) throw new DomainError(404, "Movimiento no encontrado");
  return movimiento;
}

async function getMovimientoDetalle(movimientoId: number) {
  const movimiento = await prismaTorreon.movimientoTorreonFerro.findUnique({
    where: { id: movimientoId },
    include: includeMovimientoDetalle,
  });
  if (!movimiento) throw new DomainError(404, "Movimiento no encontrado");
  return movimiento;
}

async function createMovimientoFotos(
  tx: Tx,
  movimientoId: number,
  tipo: TipoFotoMovimientoTorreon,
  fotos: FotoInput[],
  actorFallbackId: number
) {
  if (!fotos.length) return [];
  const maxFotos = MAX_FOTOS_MOVIMIENTO[tipo];
  const existentes = await tx.movimientoTorreonFoto.count({
    where: { movimientoId, tipo },
  });
  if (existentes + fotos.length > maxFotos) {
    throw new DomainError(400, `${tipo} permite maximo ${maxFotos} capturas`, {
      movimientoId,
      tipo,
      existentes,
      recibidas: fotos.length,
      maximo: maxFotos,
    });
  }

  const last = await tx.movimientoTorreonFoto.findFirst({
    where: { movimientoId, tipo },
    orderBy: { orden: "desc" },
    select: { orden: true },
  });
  const start = (last?.orden ?? 0) + 1;

  return Promise.all(
    fotos.map(async (foto, index) => {
      const orden = start + index;
      const archivo = await guardarFotoTorreon(foto, {
        entidad: "movimiento_ferro",
        referenciaId: movimientoId,
        tipo,
        orden,
      });

      return tx.movimientoTorreonFoto.create({
        data: {
          movimientoId,
          tipo,
          orden,
          url: archivo.url,
          storageKey: archivo.storageKey,
          tomadaPorId: actorFallbackId,
          comentario: foto.comentario,
          tomadaAt: foto.tomadaAt ?? new Date(),
        },
      });
    })
  );
}

export class MovimientoModel {
  static async listar(query: MovimientoListQuery) {
    const vista = String(query.vista || "").toUpperCase();
    const closedStatuses = [EstadoMovimientoTorreon.CONCLUIDO, EstadoMovimientoTorreon.CANCELADO];
    const isHistoryVista = ["HISTORIAL", "CONCLUIDOS", "CERRADOS", "PASADOS"].includes(vista);
    const isActiveVista = ["ACTIVOS", "ABIERTOS", "PENDIENTES"].includes(vista);
    const pageSize = Math.min(100, Math.max(1, Math.trunc(query.pageSize ?? 50)));
    const page = Math.max(1, Math.trunc(query.page ?? 1));
    const estadoByVista = query.estado
      ? query.estado as EstadoMovimientoTorreon
      : isHistoryVista
        ? { in: closedStatuses }
        : isActiveVista
          ? { notIn: closedStatuses }
          : undefined;

    return prismaTorreon.movimientoTorreonFerro.findMany({
      where: compact({
        localidadId: query.localidadId,
        empresaId: query.empresaId,
        estado: estadoByVista,
      }) as Prisma.MovimientoTorreonFerroWhereInput,
      include: buildMovimientoListInclude(query.includeFotos === true),
      orderBy: isHistoryVista
        ? [{ fechaFin: "desc" }, { fechaSolicitud: "desc" }, { id: "desc" }]
        : [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  static async obtener(id: number) {
    return getMovimientoDetalle(id);
  }

  static async crearTx(tx: Tx, input: z.infer<typeof createMovimientoSchema>, loteCapturaId?: string, actor?: NaturalActor) {
    const error = validarCondicionesNaturales(input);
    if (error) throw new DomainError(400, error);
    const { prioridad: _priority, operadorId: _operator, ...data } = input;
    const movement = await tx.movimientoTorreonFerro.create({ data: { ...data, prioridad: 'BAJA', estado: 'SOLICITADO', loteCapturaId } });
    const unit = await ColaNaturalModel.asegurarUnidad(tx, movement);
    await auditNatural(tx, unit, actor ?? { id: input.creadoPorId }, 'SOLICITAR', { loteCapturaId: loteCapturaId ?? null, requestFingerprint: requestFingerprint(input) }, movement.id);
    return movement.id;
  }
  static async crear(input: z.infer<typeof createMovimientoSchema>, actor?: NaturalActor) {
    const id = await prismaTorreon.$transaction(async tx => {
      await lockNaturalLocality(tx, input.localidadId);
      if (input.clientRequestId) {
        const existing = await tx.movimientoTorreonFerro.findUnique({ where: { clientRequestId: input.clientRequestId } });
        if (existing) { await validateRetry(tx, existing, input); return existing.id; }
      }
      return this.crearTx(tx, input, undefined, actor);
    });
    return getMovimientoDetalle(id);
  }
  static async crearLote(input: z.infer<typeof createLoteSchema>, actor?: NaturalActor) {
    const ids = await prismaTorreon.$transaction(async tx => {
      await lockNaturalLocality(tx, input.movimientos[0].localidadId);
      const existing = await tx.movimientoTorreonFerro.findMany({ where: { loteCapturaId: input.clientRequestId }, orderBy: { id: 'asc' } });
      if (existing.length) {
        if (existing.length !== input.movimientos.length) throw new DomainError(409, 'Este envío ya contiene un número distinto de solicitudes');
        for (let i = 0; i < existing.length; i++) await validateRetry(tx, existing[i], input.movimientos[i]);
        return existing.map(m => m.id);
      }
      const result: number[] = [];
      for (let i = 0; i < input.movimientos.length; i++) result.push(await this.crearTx(tx, { ...input.movimientos[i], clientRequestId: `${input.clientRequestId}:${i + 1}` }, input.clientRequestId, actor));
      return result;
    });
    return Promise.all(ids.map(getMovimientoDetalle));
  }

  static async obtenerEdicion(id: number) {
    const m = await getMovimientoDetalle(id);
    const estadosPermitidos = ['SOLICITADO', 'ASIGNADO'];
    const editable = estadosPermitidos.includes(m.estado);
    return {
      empresaId: m.empresaId, localidadId: m.localidadId,
      editable, restricciones: { motivo: editable ? null : 'El movimiento ya inició o terminó', estadosPermitidos, mismaLocalidadParaVias: true },
      movimiento: {
        ...m, source: 'torreon', finalizado: isMovimientoCerrado(m.estado),
        empresa: { id: m.empresaId, nombre: m.empresaNombreSnapshot ?? '' },
        localidad: { id: m.localidadId, nombre: m.localidadNombreSnapshot ?? 'Torreón' },
        viaOrigen: m.viaOrigenId ? { id: m.viaOrigenId, nombre: m.viaOrigenNombreSnapshot ?? '' } : null,
        viaDestino: m.viaDestinoId ? { id: m.viaDestinoId, nombre: m.viaDestinoNombreSnapshot ?? '' } : null,
      },
      editableKeys: ['instrucciones', 'locomotiveNumber', 'viaOrigenId', 'viaDestinoId', 'seccionOrigenId', 'seccionDestinoId', 'tipoMovimiento', 'locomotoraRemolque', 'polo', 'posicionCabina', 'posicionChimenea', 'direccionEmpuje'],
    };
  }

  static async editar(id: number, input: z.infer<typeof editMovimientoSchema>, actor?: NaturalActor) {
    await prismaTorreon.$transaction(async (tx) => {
      const initial = await getMovimientoOrThrow(tx, id);
      await lockNaturalLocality(tx, initial.localidadId);
      const movimiento = await getMovimientoOrThrow(tx, id);
      if (!new Set<EstadoMovimientoTorreon>(['SOLICITADO', 'ASIGNADO']).has(movimiento.estado)) {
        throw new DomainError(409, `Movimiento no puede editarse en estado ${movimiento.estado}`);
      }
      const changed = await tx.movimientoTorreonFerro.updateMany({
        where: { id, estado: movimiento.estado, updatedAt: movimiento.updatedAt }, data: input,
      });
      if (changed.count !== 1) throw new DomainError(409, 'El movimiento cambió mientras lo editabas. Actualiza e intenta de nuevo.');
      const merged = { ...movimiento, ...input };
      if (!merged.viaOrigenId || !merged.viaDestinoId) throw new DomainError(400, 'Cada solicitud requiere vía de origen y destino');
      const error = validarCondicionesNaturales(merged);
      if (error) throw new DomainError(400, error);
      const unit = await ColaNaturalModel.asegurarUnidad(tx, movimiento);
      await auditNatural(tx, unit, actor ?? { id: movimiento.creadoPorId }, 'EDITAR_SOLICITUD', { cambios: input }, id);
    });
    return getMovimientoDetalle(id);
  }

  static async iniciar(id: number, input: z.infer<typeof iniciarMovimientoSchema>, actor?: NaturalActor) {
    return this.ejecutarUnidad(id, input, false, actor ?? { id: input.iniciadoPorId });
  }
  static async ejecutarUnidad(id: number, input: { operadorId?: number; fotos: FotoInput[]; fotosPorMovimiento?: { movimientoId: number; fotos: FotoInput[] }[] }, reanudar: boolean, actor: NaturalActor) {
    await prismaTorreon.$transaction(async tx => {
      const initial = await getMovimientoOrThrow(tx, id);
      await lockNaturalLocality(tx, initial.localidadId);
      const unit = await ColaNaturalModel.asegurarUnidad(tx, await getMovimientoOrThrow(tx, id));
      const operator = actor.id;
      if (input.operadorId && input.operadorId !== operator) throw new DomainError(403, 'La ejecución corresponde al maquinista autenticado');
      if (!await ColaNaturalModel.exigirTurno(tx, unit, operator, reanudar)) return;
      const now = new Date();
      if (!reanudar && unit.modalidad === 'CONJUNTO' && unit.movimientos.some(m => !isMovimientoCerrado(m.estado) && !input.fotosPorMovimiento?.some(f => f.movimientoId === m.id))) throw new DomainError(400, 'El conjunto requiere evidencia de inicio identificada por solicitud');
      for (const movement of unit.movimientos.filter(m => !isMovimientoCerrado(m.estado))) {
        const fotos = input.fotosPorMovimiento?.find(f => f.movimientoId === movement.id)?.fotos ?? input.fotos;
        if (!reanudar && !fotos.length) throw new DomainError(400, `El movimiento #${movement.id} requiere evidencia de inicio`);
        await createMovimientoFotos(tx, movement.id, reanudar ? TipoFotoMovimientoTorreon.PROCESO_MOVIMIENTO : TipoFotoMovimientoTorreon.ANTES_MOVIMIENTO, fotos, actor.id);
        await tx.movimientoTorreonFerro.update({ where: { id: movement.id }, data: { estado: 'EN_PROCESO', operadorId: operator, fechaInicio: movement.fechaInicio ?? now, fechaPausa: null } });
        await auditNatural(tx, unit, actor, reanudar ? 'REANUDAR' : 'INICIAR', { operadorId: operator }, movement.id);
      }
      await tx.unidadAtencionTorreon.update({ where: { id: unit.id }, data: { estado: 'EN_PROCESO', operadorId: operator, fechaInicio: unit.fechaInicio ?? now } });
    });
    return getMovimientoDetalle(id);
  }

  static async cancelar(id: number, razon: string, actor?: NaturalActor) {
    await prismaTorreon.$transaction(async tx => {
      const initial = await getMovimientoOrThrow(tx, id);
      await lockNaturalLocality(tx, initial.localidadId);
      const movimiento = await getMovimientoOrThrow(tx, id);
      if (movimiento.estado === EstadoMovimientoTorreon.CANCELADO) return;
      if (!new Set<EstadoMovimientoTorreon>(['SOLICITADO', 'ASIGNADO']).has(movimiento.estado)) {
        throw new DomainError(409, 'Solo se pueden cancelar movimientos pendientes de iniciar');
      }
      const fechaFin = new Date();
      const result = await tx.movimientoTorreonFerro.updateMany({
        where: { id, estado: movimiento.estado, updatedAt: movimiento.updatedAt },
        data: { estado: EstadoMovimientoTorreon.CANCELADO, finalizado: true, fechaFin,
          instrucciones: `${movimiento.instrucciones ?? ''}\nCANCELADO: ${razon}`.trim() },
      });
      if (result.count !== 1) throw new DomainError(409, 'El movimiento cambió. Actualiza e intenta de nuevo.');
      const unit = await ColaNaturalModel.asegurarUnidad(tx, movimiento);
      const remaining = await tx.movimientoTorreonFerro.count({ where: { unidadId: unit.id, estado: { notIn: ['CONCLUIDO', 'CANCELADO'] } } });
      if (!remaining) await tx.unidadAtencionTorreon.update({ where: { id: unit.id }, data: { estado: 'CANCELADA', fechaFin } });
      await auditNatural(tx, unit, actor ?? { id: movimiento.creadoPorId }, 'CANCELAR_SOLICITUD', { razon }, id);
    }, { isolationLevel: 'Serializable' });
    return getMovimientoDetalle(id);
  }

  static async registrarFotos(id: number, input: z.infer<typeof registrarFotosMovimientoSchema>, actor?: NaturalActor) {
    await prismaTorreon.$transaction(async (tx) => {
      const initial = await getMovimientoOrThrow(tx, id);
      await lockNaturalLocality(tx, initial.localidadId);
      const movement = await getMovimientoOrThrow(tx, id);
      if (actor && movement.operadorId !== actor.id) throw new DomainError(403, 'Solo el maquinista asignado registra evidencia');
      if (!['EN_PROCESO', 'DETENIDO'].includes(movement.estado)) throw new DomainError(409, 'La evidencia adicional corresponde a una maniobra iniciada');
      await createMovimientoFotos(
        tx,
        id,
        input.tipo as TipoFotoMovimientoTorreon,
        input.fotos,
        actor?.id ?? input.tomadaPorId
      );
      const unit = await ColaNaturalModel.asegurarUnidad(tx, movement);
      await auditNatural(tx, unit, actor ?? { id: input.tomadaPorId }, 'REGISTRAR_EVIDENCIA', { tipo: input.tipo, cantidad: input.fotos.length }, id);
    });

    return getMovimientoDetalle(id);
  }

  static async finalizar(id: number, input: z.infer<typeof finalizarMovimientoSchema>, actor?: NaturalActor) {
    const performer = actor ?? { id: input.finalizadoPorId };
    await prismaTorreon.$transaction(async tx => {
      const initial = await getMovimientoOrThrow(tx, id);
      await lockNaturalLocality(tx, initial.localidadId);
      const movement = await getMovimientoOrThrow(tx, id);
      if (movement.estado === 'CONCLUIDO') return;
      const unit = await ColaNaturalModel.asegurarUnidad(tx, movement);
      if (unit.estado !== 'EN_PROCESO' || unit.operadorId !== performer.id) throw new DomainError(409, 'Solo el maquinista asignado puede finalizar una maniobra en proceso');
      if (await ColaNaturalModel.bloqueante(tx, unit)) throw new DomainError(409, 'No puedes finalizar con impedimentos abiertos');
      const fechaFin = new Date();
      for (const member of unit.movimientos.filter(m => !isMovimientoCerrado(m.estado))) {
        if (unit.modalidad === 'CONJUNTO' && !input.fotosPorMovimiento?.some(f => f.movimientoId === member.id)) throw new DomainError(400, 'El conjunto requiere evidencia de finalización identificada por solicitud');
        const fotos = input.fotosPorMovimiento?.find(f => f.movimientoId === member.id)?.fotos ?? input.fotos;
        if (!fotos.length) throw new DomainError(400, `El movimiento #${member.id} requiere evidencia de finalización`);
        await createMovimientoFotos(tx, member.id, TipoFotoMovimientoTorreon.FIN_MOVIMIENTO, fotos, performer.id);
        await tx.movimientoTorreonFerro.update({ where: { id: member.id }, data: { estado: 'CONCLUIDO', finalizado: true, fechaFin } });
        await auditNatural(tx, unit, performer, 'FINALIZAR', { resultado: 'CONCLUIDO' }, member.id);
      }
      await tx.unidadAtencionTorreon.update({ where: { id: unit.id }, data: { estado: 'CONCLUIDA', fechaFin } });
    });
    return getMovimientoDetalle(id);
  }
  static async detenerConIncidente(id: number, input: z.infer<typeof crearIncidenteMovimientoSchema>, actor?: NaturalActor) {
    const result = await prismaTorreon.$transaction(async tx => {
      const initial = await getMovimientoOrThrow(tx, id);
      await lockNaturalLocality(tx, initial.localidadId);
      const movement = await getMovimientoOrThrow(tx, id);
      const unit = await ColaNaturalModel.asegurarUnidad(tx, movement);
      if (unit.estado !== 'EN_PROCESO' && unit.estado !== 'DETENIDA') throw new DomainError(409, 'Solo una maniobra iniciada puede reportar un incidente');
      if (unit.operadorId !== input.creadoPorId) throw new DomainError(403, 'El incidente corresponde al maquinista asignado');
      const incident = await IncidenteModel.crearParaMovimiento(tx, movement, input);
      await tx.incidenteTorreonFerro.update({ where: { id: incident.id }, data: { unidadId: unit.id } });
      await tx.movimientoTorreonFerro.updateMany({ where: { unidadId: unit.id, estado: { notIn: ['CONCLUIDO', 'CANCELADO'] } }, data: { estado: 'DETENIDO', fechaPausa: new Date() } });
      await tx.unidadAtencionTorreon.update({ where: { id: unit.id }, data: { estado: 'DETENIDA', fechaHabilitacion: null } });
      await auditNatural(tx, unit, actor ?? { id: input.creadoPorId }, 'REPORTAR_INCIDENTE', { movimientoIds: unit.movimientos.map(m => m.id), motivo: input.motivo }, id, incident.id);
      return incident.id;
    });
    return { movimiento: await getMovimientoDetalle(id), incidenteId: result };
  }
  static async reanudar(id: number, input: z.infer<typeof reanudarMovimientoSchema>, actor?: NaturalActor) {
    if (!input.operadorId && !actor?.id) throw new DomainError(400, 'La reanudación requiere maquinista');
    return this.ejecutarUnidad(id, input, true, actor ?? { id: input.operadorId! });
  }
}
