/**
 * @file MovimientoController.ts
 * @author Isaac
 * @version 1.4.1 2025-08-18
 *
 * @overview
 * Controlador HTTP para **Movimientos**. Es consumido por `movimientos.routes.ts`.
 *
 * Principios y límites de responsabilidad:
 * - Este controller **no ocupa/libera** vías ni secciones. Solo guarda la **intención operativa**
 *   en `instrucciones` mediante una etiqueta `[META ...]`. La ejecución física ocurre en OTRO servicio.
 * - Aplica validaciones mínimas, devuelve códigos HTTP consistentes y registra errores.
 * - La prioridad **ALTA** puede disparar recomposición de rondas por parte del modelo.
 *
 * Seguridad:
 * - Las rutas deben ir protegidas con JWT en el router (`router.use(passport.authenticate(...))`).
 *
 * Convenciones de error:
 * - 400 Parámetros inválidos, 404 Recurso no encontrado (cuando aplique), 500 Error inesperado.
 *
 * Ejemplos útiles (cURL):
 * - Crear:    `curl -X POST /movimientos -H "Content-Type: application/json" -d '{...}'`
 * - Prioridad:`curl -X PATCH /movimientos/123/prioridad -H "Content-Type: application/json" -d '{"prioridad":"ALTA"}'`
 * - Finalizar:`curl -X PATCH /movimientos/123/finalizar`
 */

import { RequestHandler } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { MovimientoModel } from '../../models/Movimientos';
import { buildMetaTag, parseMetaFromInstrucciones } from '../../models/Movimientos/movimiento.meta';
import { movimientoControllerLogger as log } from './movimiento.controller.logger';
import { readMovimientoPagination } from './movimiento.pagination';
import {
  buscarTornoAgendadoActivable,
  crearTornoAgendado,
  eliminarTornoAgendadoPorMovimiento,
  ensureSolicitudYRondaForMovimiento,
  getRuedaSolicitudPorMovimiento,
  limpiarTornoAgendadosVencidosMs,
  listarTornoAgendados,
  normalizeMedidasRuedaInput,
  upsertRuedaSolicitudPorMovimiento,
} from '../../services/tornoMs/tornoMsClient';

const medidaSchema = z.preprocess(
  (v) => (typeof v === 'number' ? String(v) : v),
  z.string().min(1)
);

const wheelCountSchema = z.union([z.literal(4), z.literal(6), z.literal(8), z.literal(12)]);
const CANCELAR_TORNEADO_ROLES = new Set(['ADMINISTRADOR', 'COORDINADOR', 'SUPERVISOR']);
const CLIENTE_ROLES = new Set(['CLIENTE']);
const TORNERO_ROLES = new Set(['TORNERO']);

function getRequestRole(req: Parameters<RequestHandler>[0]) {
  return String((req as any).user?.rol ?? '').toUpperCase();
}

function esCliente(req: Parameters<RequestHandler>[0]) {
  return CLIENTE_ROLES.has(getRequestRole(req));
}

function esTornero(req: Parameters<RequestHandler>[0]) {
  return TORNERO_ROLES.has(getRequestRole(req));
}

function bloquearClienteEstadoMovimiento(req: Parameters<RequestHandler>[0], res: Parameters<RequestHandler>[1]) {
  if (!esCliente(req)) return false;
  res.status(403).json({
    message: 'CLIENTE no puede modificar estados del movimiento',
  });
  return true;
}

function bloquearCancelacionNoPermitida(
  req: Parameters<RequestHandler>[0],
  res: Parameters<RequestHandler>[1],
  movimiento?: { torno?: boolean | null }
) {
  const rol = String((req as any).user?.rol ?? '').toUpperCase();
  if (CLIENTE_ROLES.has(rol)) {
    res.status(403).json({ message: 'CLIENTE no puede modificar estados del movimiento' });
    return true;
  }
  if (TORNERO_ROLES.has(rol)) {
    res.status(403).json({ message: 'No puedes cancelar el movimiento. Habla con tu supervisor.' });
    return true;
  }
  if (movimiento?.torno === true && !CANCELAR_TORNEADO_ROLES.has(rol)) {
    res.status(403).json({
      message: 'Solo ADMINISTRADOR, COORDINADOR o SUPERVISOR pueden cancelar torneados',
    });
    return true;
  }
  return false;
}

function bodyIntentaCambiarEstadoMovimiento(body: unknown) {
  if (!body || typeof body !== 'object') return false;
  return ['estado', 'status', 'finalizado', 'fechaInicio', 'fechaFin', 'fechaPausa'].some((key) =>
    Object.prototype.hasOwnProperty.call(body, key)
  );
}

const medidasTornoSchema = z.object({
  wheelCount: wheelCountSchema.optional(),
  l1: medidaSchema.optional(),
  l2: medidaSchema.optional(),
  l3: medidaSchema.optional(),
  l4: medidaSchema.optional(),
  l5: medidaSchema.optional(),
  l6: medidaSchema.optional(),
  r1: medidaSchema.optional(),
  r2: medidaSchema.optional(),
  r3: medidaSchema.optional(),
  r4: medidaSchema.optional(),
  r5: medidaSchema.optional(),
  r6: medidaSchema.optional(),
});

const TORNO_AGENDADO_PREFIX = '[TORNO_AGENDADO:';
const TORNO_AGENDADO_WINDOW_MS = 10 * 60 * 1000;

type TornoAgendadoMeta = {
  version: 1;
  fechaProgramada: string;
  fechaLimiteActivacion: string;
  medidasTorno: ReturnType<typeof normalizeMedidasRuedaInput>;
  creadoEn: string;
};

const encodeTornoAgendadoMeta = (meta: TornoAgendadoMeta) =>
  `${TORNO_AGENDADO_PREFIX}${Buffer.from(JSON.stringify(meta), 'utf8').toString('base64')}]`;

const decodeTornoAgendadoMeta = (instrucciones?: string | null): TornoAgendadoMeta | null => {
  const match = String(instrucciones ?? '').match(/\[TORNO_AGENDADO:([^\]]+)\]/);
  if (!match?.[1]) return null;
  try {
    return JSON.parse(Buffer.from(match[1], 'base64').toString('utf8'));
  } catch {
    return null;
  }
};

const addMinutes = (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60 * 1000);

const isWithinActivationWindow = (movimiento: { fechaSolicitud?: Date | string | null; instrucciones?: string | null }) => {
  const meta = decodeTornoAgendadoMeta(movimiento.instrucciones);
  const start = new Date(meta?.fechaProgramada ?? movimiento.fechaSolicitud ?? '');
  if (Number.isNaN(start.getTime())) return false;
  const limit = new Date(meta?.fechaLimiteActivacion ?? addMinutes(start, 10).toISOString());
  const now = new Date();
  return now >= start && now <= limit;
};

const canActivateScheduledTorno = (movimiento: { fechaSolicitud?: Date | string | null; instrucciones?: string | null }) => {
  const meta = decodeTornoAgendadoMeta(movimiento.instrucciones);
  const start = new Date(meta?.fechaProgramada ?? movimiento.fechaSolicitud ?? '');
  if (Number.isNaN(start.getTime())) return false;
  const limit = new Date(meta?.fechaLimiteActivacion ?? addMinutes(start, 10).toISOString());
  return new Date() <= limit;
};

const getScheduledPayload = (movimiento: any, helper?: any) => {
  const meta = decodeTornoAgendadoMeta(movimiento?.instrucciones);
  const fechaProgramada =
    helper?.fechaProgramada ??
    meta?.fechaProgramada ??
    movimiento?.fechaSolicitud?.toISOString?.() ??
    movimiento?.fechaSolicitud ??
    null;
  return {
    id: movimiento?.id,
    locomotiveNumber: movimiento?.locomotiveNumber,
    empresaId: movimiento?.empresaId,
    localidadId: movimiento?.localidadId,
    viaOrigenId: movimiento?.viaOrigenId,
    viaDestinoId: movimiento?.viaDestinoId,
    tipoMovimiento: movimiento?.tipoMovimiento,
    prioridad: movimiento?.prioridad,
    direccionEmpuje: movimiento?.direccionEmpuje,
    posicionCabina: movimiento?.posicionCabina,
    posicionChimenea: movimiento?.posicionChimenea,
    polo: movimiento?.polo,
    fechaProgramada,
    fechaLimiteActivacion:
      helper?.fechaLimiteActivacion ??
      meta?.fechaLimiteActivacion ??
      (fechaProgramada ? addMinutes(new Date(fechaProgramada), 10).toISOString() : null),
    medidasTorno: helper?.medidasTorno ?? helper?.ruedaSolicitud ?? meta?.medidasTorno ?? null,
    instrucciones: movimiento?.instrucciones ?? null,
  };
};

const extractMedidasFromRuedaSolicitud = (ruedaSolicitud: any): ReturnType<typeof normalizeMedidasRuedaInput> | null => {
  if (!ruedaSolicitud) return null;
  const draft = {
    l1: ruedaSolicitud.l1,
    l2: ruedaSolicitud.l2,
    l3: ruedaSolicitud.l3,
    l4: ruedaSolicitud.l4,
    l5: ruedaSolicitud.l5,
    l6: ruedaSolicitud.l6,
    r1: ruedaSolicitud.r1,
    r2: ruedaSolicitud.r2,
    r3: ruedaSolicitud.r3,
    r4: ruedaSolicitud.r4,
    r5: ruedaSolicitud.r5,
    r6: ruedaSolicitud.r6,
  };
  try {
    return normalizeMedidasRuedaInput(draft);
  } catch {
    return null;
  }
};

const cleanupExpiredTornoSchedules = async () => {
  try {
    const expiredMs = await limpiarTornoAgendadosVencidosMs();
    const items = Array.isArray(expiredMs?.items) ? expiredMs.items : [];
    let deleted = 0;

    for (const item of items) {
      const idMovimiento = Number(item?.idMovimiento);
      if (!Number.isInteger(idMovimiento) || idMovimiento <= 0) continue;
      try {
        await MovimientoModel.eliminarMovimiento(idMovimiento);
        deleted += 1;
      } catch (error: any) {
        log.error('No se pudo eliminar movimiento agendado vencido desde índice msTorno', {
          movId: idMovimiento,
          err: error?.message,
        });
      }
    }

    return { found: items.length, deleted, source: 'msTorno' };
  } catch (error: any) {
    log.error('No se pudo limpiar índice TornoAgendado en msTorno; usando limpieza legacy', {
      err: error?.message,
    });
  }

  const fechaMaxima = new Date(Date.now() - TORNO_AGENDADO_WINDOW_MS);
  const vencidos = await prisma.movimiento.findMany({
    where: {
      torno: true,
      estado: 'AGENDADO' as any,
      finalizado: false,
      fechaSolicitud: { lt: fechaMaxima },
    },
    select: { id: true },
  });

  let deleted = 0;
  for (const mov of vencidos) {
    try {
      await MovimientoModel.eliminarMovimiento(mov.id);
      try {
        await eliminarTornoAgendadoPorMovimiento(mov.id);
      } catch (msError: any) {
        log.error('No se pudo limpiar índice TornoAgendado legacy', { movId: mov.id, err: msError?.message });
      }
      deleted += 1;
    } catch (error: any) {
      log.error('No se pudo eliminar solicitud agendada vencida', { movId: mov.id, err: error?.message });
    }
  }
  return { found: vencidos.length, deleted };
};

async function enrichWithTornoMeasures<T extends { movimiento?: { id?: number; torno?: boolean | null } | null }>(
  payload: T
): Promise<T & { tornoMedidas?: unknown | null }> {
  const movimientoId = Number(payload.movimiento?.id);
  const isTorno = payload.movimiento?.torno === true;

  if (!isTorno || !Number.isInteger(movimientoId) || movimientoId <= 0) {
    return payload;
  }

  try {
    const tornoMedidas = await getRuedaSolicitudPorMovimiento(movimientoId);
    return {
      ...payload,
      tornoMedidas,
    };
  } catch (error: any) {
    log.error('No se pudieron consultar medidas de torno en lectura de movimiento', {
      movimientoId,
      err: error?.message,
    });
    return {
      ...payload,
      tornoMedidas: null,
    };
  }
}

/** ------------------------------------------------------------------------
 * Helpers META
 * Guardamos intención en `instrucciones` con tags para que OTRO servicio
 * (o el maquinista) actúe **al CONCLUIR**.
 * Formato: [META DESTINO:123|SECCION:2|LIBERAR]
 * ------------------------------------------------------------------------ */

export class MovimientoController {
  private static requirePagination(req: any, res: any) {
    const { pagination, error } = readMovimientoPagination(req.query as Record<string, unknown>);
    if (error) {
      res.status(400).json({ message: error });
      return null;
    }
    if (!pagination) {
      res.status(400).json({ message: 'page y pageSize son requeridos en este endpoint' });
      return null;
    }
    return pagination;
  }

  /**
   * GET /movimientos
   *
   * @summary Lista todos los movimientos.
   * @auth Requiere JWT.
   * @returns 200 [Movimiento] | 500
   */
  static obtenerMovimientos: RequestHandler = async (req, res) => {
    const pagination = this.requirePagination(req, res);
    if (!pagination) return;

    try {
      const movimientos = await MovimientoModel.obtenerMovimientosPaginados(pagination);
      res.status(200).json(movimientos);
    } catch (error) {
      log.error('Error al obtener movimientos', { error, query: req.query });
      res.status(500).json({ message: 'Error al obtener movimientos' });
    }
  };

  /**
   * GET /movimientos/servicios/pendientes?localidadId=&empresaId=
   *
   * @summary Devuelve **servicios** (lavado/torno) pendientes de acción.
   * @description Filtra opcionalmente por localidad/empresa.
   * @auth Requiere JWT.
   * @query {number} [localidadId]
   * @query {number} [empresaId]
   * @returns 200 [Servicio] | 400 | 500
   */
  static obtenerServiciosPendientes: RequestHandler = async (req, res) => {
    const { localidadId, empresaId } = req.query;
    if (
      (localidadId !== undefined && Number.isNaN(Number(localidadId))) ||
      (empresaId !== undefined && Number.isNaN(Number(empresaId)))
    ) {
      return res.status(400).json({ message: 'Parámetros inválidos (localidadId/empresaId deben ser numéricos)' });
    }
    try {
      const lista = await MovimientoModel.obtenerServiciosPendientes({
        localidadId: localidadId !== undefined ? Number(localidadId) : undefined,
        empresaId: empresaId !== undefined ? Number(empresaId) : undefined,
      });
      res.status(200).json(lista);
    } catch (error) {
      log.error('Error al obtener servicios pendientes', { error, localidadId, empresaId });
      res.status(500).json({ message: 'Error al obtener servicios pendientes' });
    }
  };

  /**
   * PATCH /movimientos/servicios/:id/estado
   *
   * @summary Cambia estado de **servicio**: SOLICITADO | EN_PROCESO | DETENIDO | CONCLUIDO | CANCELADO.
   * @description Los servicios solo serán ofrecidos al maquinista cuando estén **EN_PROCESO**.
   * @auth Requiere JWT.
   * @param {number} req.params.id
   * @body {{estado:'SOLICITADO'|'EN_PROCESO'|'DETENIDO'|'CONCLUIDO'|'CANCELADO', operadorId?:number, razon?:string, fechaInicio?:string, fechaFin?:string}}
   * @returns 200 {message, movimiento} | 400 | 500
   */
  static actualizarEstadoServicio: RequestHandler = async (req, res) => {
    const id = Number(req.params.id);
    const { estado, operadorId, razon, fechaInicio, fechaFin } = req.body as {
      estado: 'SOLICITADO' | 'EN_PROCESO' | 'DETENIDO' | 'CONCLUIDO' | 'CANCELADO';
      operadorId?: number;
      razon?: string;
      fechaInicio?: string;
      fechaFin?: string;
    };

    const validos = ['SOLICITADO', 'EN_PROCESO', 'DETENIDO', 'CONCLUIDO', 'CANCELADO'];
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'ID inválido' });
    if (!validos.includes(estado)) {
      return res.status(400).json({ message: `Estado inválido. Debe ser uno de: ${validos.join(' | ')}` });
    }
    if (operadorId !== undefined && typeof operadorId !== 'number') {
      return res.status(400).json({ message: 'operadorId debe ser numérico si se envía' });
    }
    if (bloquearClienteEstadoMovimiento(req, res)) return;

    try {
      if (estado === 'CANCELADO') {
        const movimiento = await prisma.movimiento.findUnique({
          where: { id },
          select: { id: true, torno: true },
        });
        if (!movimiento) return res.status(404).json({ message: 'Movimiento no encontrado' });
        if (bloquearCancelacionNoPermitida(req, res, movimiento)) return;
      }

      const parseOptionalDate = (value?: string) => {
        if (!value) return undefined;
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? undefined : date;
      };
      const mov = await MovimientoModel.actualizarEstadoServicio(id, estado, {
        operadorId,
        razon,
        fechaInicio: parseOptionalDate(fechaInicio),
        fechaFin: parseOptionalDate(fechaFin),
      });
      res.status(200).json({ message: 'Estado de servicio actualizado', movimiento: mov });
    } catch (error: any) {
      log.error('Error al actualizar estado de servicio', { error, id, estado });
      res.status(500).json({ message: error?.message || 'Error al actualizar estado de servicio' });
    }
  };

  /**
 * PATCH /movimientos/:id/cancelar
 *
 * @summary Cancela el movimiento y lo saca de la ronda.
 * @auth Requiere JWT.
 * @param {number} req.params.id
 * @body {{ razon?: string }}
 * @returns 200 { message, movimiento } | 400 | 404 | 500
 */
static cancelarMovimiento: RequestHandler = async (req, res) => {
  const id = Number(req.params.id);
  const razon = String(req.body?.razon ?? 'Sin motivo');
  const usuarioId = Number((req as any).user?.id || 0);

  if (!Number.isInteger(id)) return res.status(400).json({ message: 'ID inválido' });
  if (bloquearClienteEstadoMovimiento(req, res)) return;

  try {
    const movimiento = await prisma.movimiento.findUnique({
      where: { id },
      select: { id: true, torno: true },
    });
    if (!movimiento) return res.status(404).json({ message: 'Movimiento no encontrado' });
    if (bloquearCancelacionNoPermitida(req, res, movimiento)) return;

    const mov = await MovimientoModel.cancelarMovimiento(id, razon, usuarioId || undefined);
    return res.status(200).json({ message: 'Movimiento cancelado y removido de la ronda', movimiento: mov });
  } catch (error: any) {
    log.error('Error al cancelar movimiento', { error, id, razon, usuarioId });
    const msg = error?.message || 'Error al cancelar movimiento';
    const code = /no se encontró|no encontrado|inválid/i.test(msg) ? 404 : 500;
    return res.status(code).json({ message: msg });
  }
};


  /**
   * GET /movimientos/:id
   *
   * @summary Obtiene detalle de un movimiento + `meta` derivado de `instrucciones`.
   * @auth Requiere JWT.
   * @param {number} req.params.id
   * @returns 200 {...mov, meta} | 400 | 404 | 500
   */
  static obtenerMovimientoPorId: RequestHandler = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'ID inválido' });

    try {
      const mov = await MovimientoModel.obtenerMovimientoPorId(id);
      if (!mov) return res.status(404).json({ message: 'Movimiento no encontrado' });

      const meta = parseMetaFromInstrucciones((mov as any).instrucciones ?? undefined);
      res.status(200).json({ ...mov, meta });
    } catch (error) {
      log.error('Error al obtener movimiento por id', { error, id });
      res.status(500).json({ message: 'Error al obtener movimiento' });
    }
  };

  /**
   * POST /movimientos
   *
   * @summary Crea un movimiento **sin** ejecutar ocupación/liberación de vías/secciones.
   * @description Inyecta `[META ...]` al inicio de `instrucciones` para que otro servicio actúe al **finalizar**.
   * @auth Requiere JWT.
   * @body {
   *   empresaId:number, creadoPorId:number, localidadId:number,
   *   viaOrigenId?:number, viaDestinoId?:number,  // ← al menos uno
   *   locomotiveNumber:string|number,
   *   numeroSeccion?:number, prioridad?:'ALTA'|'BAJA',
   *   ...otros campos del modelo
   * }
   * @defaults prioridad='BAJA', estado='SOLICITADO',
   *   posicionCabina/posicionChimenea/direccionEmpuje='Sin_Solicitar'
   * @returns 201 { message, meta:{destinoSolicitado,seccionSolicitada,liberarOrigen}, movimiento } | 400 | 500
   */
  static nuevoMovimiento: RequestHandler = async (req, res) => {
    try {
      const raw = { ...req.body };
      await cleanupExpiredTornoSchedules();
      const wantsTornoSchedule = raw.agendado === true || raw.agendado === 'true';
      const ignoreScheduledMatch = raw.ignorarAgendado === true || raw.ignorarAgendado === 'true';
      const activarAgendadoId = raw.activarAgendadoId != null ? Number(raw.activarAgendadoId) : null;
      const fechaProgramadaRaw = raw.fechaProgramada ?? raw.fechaProgramacion ?? raw.fechaSolicitud;

      // Defaults
      raw.prioridad ??= 'BAJA';
      raw.estado ??= 'SOLICITADO';
      raw.posicionCabina ??= 'Sin_Solicitar';
      raw.posicionChimenea ??= 'Sin_Solicitar';
      raw.direccionEmpuje ??= 'Sin_Solicitar';

      // Validaciones mínimas
      if (!raw.empresaId || !raw.creadoPorId || !raw.localidadId || !raw.locomotiveNumber) {
        return res.status(400).json({ message: 'Faltan campos obligatorios.' });
      }
      const tieneOrigen = raw.viaOrigenId !== undefined && raw.viaOrigenId !== null;
      const tieneDestino = raw.viaDestinoId !== undefined && raw.viaDestinoId !== null;
      if (!tieneOrigen && !tieneDestino) {
        return res.status(400).json({ message: 'Debe enviar viaOrigenId o viaDestinoId (al menos uno).' });
      }
      if (tieneOrigen && Number.isNaN(Number(raw.viaOrigenId))) {
        return res.status(400).json({ message: 'viaOrigenId debe ser numérico' });
      }
      if (tieneDestino && Number.isNaN(Number(raw.viaDestinoId))) {
        return res.status(400).json({ message: 'viaDestinoId debe ser numérico' });
      }
      if (raw.prioridad && !['ALTA', 'BAJA'].includes(raw.prioridad)) {
        return res.status(400).json({ message: 'prioridad inválida (ALTA|BAJA)' });
      }
      if (raw.numeroSeccion != null && Number.isNaN(Number(raw.numeroSeccion))) {
        return res.status(400).json({ message: 'numeroSeccion debe ser numérico' });
      }

      // Deducción de intención sin tocar DB de Vías:
      const liberarOrigenFlag =
        raw.liberarOrigen === true || /(^|\W)liberar(\W|$)/i.test(String(raw.instrucciones ?? ''));

      const meta = buildMetaTag({
        viaDestinoId: raw.viaDestinoId,            // se guarda como META (además de en DB si viene)
        numeroSeccion: raw.numeroSeccion,          // solo META
        liberarOrigen: liberarOrigenFlag,
      });

      // Inyectamos META al inicio de instrucciones
      const data = {
        ...raw,
        instrucciones: `${meta}${raw.instrucciones ?? ''}`.trim(),
      };
      // ¡OJO! NO borrar viaDestinoId (sí existe en el esquema y queremos persistirlo)
      delete (data as any).numeroSeccion;
      delete (data as any).agendado;
      delete (data as any).fechaProgramada;
      delete (data as any).fechaProgramacion;
      delete (data as any).activarAgendadoId;
      delete (data as any).ignorarAgendado;
      const medidasTornoRaw = (raw as any).medidasTorno ?? (raw as any).tornoMedidas ?? null;
      delete (data as any).medidasTorno;
      delete (data as any).tornoMedidas;

      // Regla de negocio: solo registrar medidas en msTorno cuando es "VIA -> SERVICIO TORNO"
      const esViaParaServicioTorno = raw?.torno === true && tieneOrigen && !tieneDestino;
      let medidasTorno: ReturnType<typeof normalizeMedidasRuedaInput> | null = null;
      if (esViaParaServicioTorno) {
        const parsed = medidasTornoSchema.safeParse(medidasTornoRaw);
        if (!parsed.success) {
          return res.status(400).json({
            message: 'Faltan/invalidas medidasTorno para servicio TORNO (via -> torno)',
            details: parsed.error.flatten(),
          });
        }
        try {
          medidasTorno = normalizeMedidasRuedaInput(parsed.data);
        } catch (error: any) {
          return res.status(400).json({
            message: 'medidasTorno no cumple con las posiciones activas requeridas para el servicio TORNO',
            details: error?.message,
          });
        }
      }

      if (wantsTornoSchedule) {
        if (!esViaParaServicioTorno) {
          return res.status(400).json({ message: 'Solo se pueden agendar movimientos tipo TORNO de via -> torno.' });
        }
        const fechaProgramada = new Date(fechaProgramadaRaw);
        if (Number.isNaN(fechaProgramada.getTime())) {
          return res.status(400).json({ message: 'fechaProgramada es requerida y debe ser una fecha valida.' });
        }
        if (fechaProgramada <= new Date()) {
          return res.status(400).json({ message: 'fechaProgramada debe ser mayor a la fecha actual.' });
        }

        const fechaLimiteActivacion = addMinutes(fechaProgramada, 10);
        const tornoMeta = encodeTornoAgendadoMeta({
          version: 1,
          fechaProgramada: fechaProgramada.toISOString(),
          fechaLimiteActivacion: fechaLimiteActivacion.toISOString(),
          medidasTorno: medidasTorno!,
          creadoEn: new Date().toISOString(),
        });

        (data as any).estado = 'AGENDADO';
        (data as any).fechaSolicitud = fechaProgramada;
        (data as any).instrucciones = `${tornoMeta}${(data as any).instrucciones ? ` ${(data as any).instrucciones}` : ''}`.trim();

        const movimiento = await MovimientoModel.nuevoMovimiento(data);
        if (!movimiento) {
          return res.status(500).json({ message: 'Movimiento agendado creado pero no se pudo recuperar' });
        }

        let tornoMs: any = null;
        try {
          tornoMs = await upsertRuedaSolicitudPorMovimiento(movimiento.id, medidasTorno!);
          const tornoAgendado = await crearTornoAgendado({
            locomotive: Number(movimiento.locomotiveNumber),
            tipo: 'TORNO',
            localidad: Number(movimiento.localidadId) || null,
            idMovimiento: movimiento.id,
            fechaProgramada,
            fechaLimiteActivacion,
          });
          tornoMs = { ruedaSolicitud: tornoMs, tornoAgendado };
        } catch (error: any) {
          try {
            await MovimientoModel.eliminarMovimiento(movimiento.id);
          } catch (rollbackError: any) {
            log.error('Rollback movimiento agendado falló tras error msTorno', {
              movId: movimiento.id,
              err: rollbackError?.message,
            });
          }

          log.error('Error registrando solicitud agendada en msTorno', {
            movId: movimiento.id,
            err: error?.message,
          });
          return res.status(502).json({
            message: 'No se pudo registrar la solicitud agendada de torno (msTorno)',
            details: error?.message,
          });
        }

        return res.status(201).json({
          message: 'Movimiento de torno agendado.',
          agendado: true,
          fechaProgramada: fechaProgramada.toISOString(),
          fechaLimiteActivacion: fechaLimiteActivacion.toISOString(),
          movimiento,
          tornoMs,
        });
      }

      if (esViaParaServicioTorno && activarAgendadoId) {
        const agendado = await prisma.movimiento.findUnique({
          where: { id: activarAgendadoId },
          include: { empresa: true, localidad: true, viaOrigen: true, viaDestino: true, ronda: true },
        });
        if (!agendado || String(agendado.estado) !== 'AGENDADO' || agendado.torno !== true || agendado.finalizado) {
          return res.status(404).json({ message: 'Solicitud agendada de torno no encontrada o no disponible.' });
        }
        if (Number(agendado.locomotiveNumber) !== Number(raw.locomotiveNumber)) {
          return res.status(400).json({ message: 'La locomotora no coincide con la solicitud agendada.' });
        }
        if (!canActivateScheduledTorno(agendado)) {
          await MovimientoModel.eliminarMovimiento(agendado.id);
          await eliminarTornoAgendadoPorMovimiento(agendado.id).catch((error: any) =>
            log.error('No se pudo eliminar índice TornoAgendado vencido', { movId: agendado.id, err: error?.message })
          );
          return res.status(410).json({ message: 'La ventana de activacion de la solicitud agendada vencio.' });
        }

        const scheduledMeta = decodeTornoAgendadoMeta(agendado.instrucciones);
        const scheduledMeasures =
          scheduledMeta?.medidasTorno ??
          extractMedidasFromRuedaSolicitud(await getRuedaSolicitudPorMovimiento(agendado.id)) ??
          medidasTorno!;
        const movimiento = await MovimientoModel.activarMovimientoTornoAgendado(agendado.id);
        let tornoMs: any = null;
        try {
          tornoMs = await ensureSolicitudYRondaForMovimiento(agendado.id, scheduledMeasures, {
            localidadId: agendado.localidadId,
          });
        } catch (error: any) {
          log.error('Error registrando medidas/ronda en msTorno al activar agendado', {
            movId: agendado.id,
            err: error?.message,
          });
          return res.status(502).json({
            message: 'Solicitud activada, pero no se pudo registrar el servicio de torno (msTorno)',
            details: error?.message,
            movimiento,
          });
        }
        await eliminarTornoAgendadoPorMovimiento(agendado.id).catch((error: any) =>
          log.error('No se pudo eliminar índice TornoAgendado tras activar', { movId: agendado.id, err: error?.message })
        );
        return res.status(200).json({
          message: 'Solicitud agendada activada.',
          activatedScheduled: true,
          movimiento,
          tornoMs,
        });
      }

      if (esViaParaServicioTorno && !ignoreScheduledMatch) {
        await cleanupExpiredTornoSchedules();
        try {
          const helperResult = await buscarTornoAgendadoActivable({
            locomotive: Number(raw.locomotiveNumber),
            tipo: 'TORNO',
            localidad: Number((data as any).localidadId) || null,
          });
          const helper = helperResult?.scheduled ?? null;
          const idMovimiento = Number(helper?.idMovimiento);
          if (helperResult?.activable && Number.isInteger(idMovimiento) && idMovimiento > 0) {
            const compatible = await prisma.movimiento.findUnique({
              where: { id: idMovimiento },
              include: { empresa: true, localidad: true, viaOrigen: true, viaDestino: true, ronda: true },
            });
            if (compatible && String(compatible.estado) === 'AGENDADO' && compatible.torno === true && !compatible.finalizado) {
              return res.status(409).json({
                message: 'Existe una solicitud agendada de torno activable para esta locomotora.',
                requiresScheduledConfirmation: true,
                scheduledMovement: getScheduledPayload(compatible, helper),
              });
            }
          }
        } catch (error: any) {
          log.error('No se pudo consultar índice TornoAgendado; usando búsqueda legacy', { err: error?.message });
          const candidatos = await prisma.movimiento.findMany({
            where: {
              torno: true,
              estado: 'AGENDADO' as any,
              finalizado: false,
              locomotiveNumber: Number(raw.locomotiveNumber),
            },
            orderBy: { fechaSolicitud: 'asc' },
            take: 5,
          });
          const compatible = candidatos.find(canActivateScheduledTorno);
          const vencidos = candidatos.filter((mov) => !canActivateScheduledTorno(mov));
          for (const vencido of vencidos) {
            try {
              await MovimientoModel.eliminarMovimiento(vencido.id);
              await eliminarTornoAgendadoPorMovimiento(vencido.id).catch(() => undefined);
            } catch (deleteError: any) {
              log.error('No se pudo eliminar solicitud agendada vencida', { movId: vencido.id, err: deleteError?.message });
            }
          }
          if (compatible) {
            return res.status(409).json({
              message: 'Existe una solicitud agendada de torno activable para esta locomotora.',
              requiresScheduledConfirmation: true,
              scheduledMovement: getScheduledPayload(compatible),
            });
          }
        }
      }

      const movimiento = await MovimientoModel.nuevoMovimiento(data);
      if (!movimiento) {
        return res.status(500).json({ message: 'Movimiento creado pero no se pudo recuperar' });
      }

      let tornoMs: any = null;

      if (esViaParaServicioTorno) {
        try {
          tornoMs = await ensureSolicitudYRondaForMovimiento(movimiento.id, medidasTorno!, {
            localidadId: movimiento.localidadId,
          });
        } catch (error: any) {
          // Si falla msTorno, cancelamos la creación del movimiento para que quede consistente.
          try {
            await MovimientoModel.eliminarMovimiento(movimiento.id);
          } catch (rollbackError: any) {
            log.error('Rollback movimiento falló tras error msTorno', {
              movId: movimiento.id,
              err: rollbackError?.message,
            });
          }

          log.error('Error registrando medidas/ronda en msTorno', {
            movId: movimiento.id,
            err: error?.message,
          });
          return res.status(502).json({
            message: 'No se pudo registrar el servicio de torno (msTorno)',
            details: error?.message,
          });
        }
      }

      res.status(201).json({
        message: 'Movimiento creado (sin ocupar/liberar vías/secciones). Acciones diferidas al concluir.',
        meta: {
          destinoSolicitado: raw.viaDestinoId ?? null,
          seccionSolicitada: raw.numeroSeccion ?? null,
          liberarOrigen: liberarOrigenFlag,
        },
        movimiento,
        ...(tornoMs ? { tornoMs } : {}),
      });
    } catch (error: any) {
      log.error('Error al crear movimiento', { error, body: req.body });
      res.status(500).json({ message: 'Error al crear movimiento', details: error?.message });
    }
  };

  static limpiarTornoAgendadosVencidos: RequestHandler = async (_req, res) => {
    try {
      const result = await cleanupExpiredTornoSchedules();
      return res.status(200).json({ message: 'Solicitudes agendadas vencidas procesadas.', ...result });
    } catch (error: any) {
      log.error('Error al limpiar solicitudes agendadas vencidas', { error });
      return res.status(500).json({ message: 'Error al limpiar solicitudes agendadas vencidas', details: error?.message });
    }
  };

  static buscarTornoAgendadoActivable: RequestHandler = async (req, res) => {
    try {
      await cleanupExpiredTornoSchedules();
      const locomotiveNumber = Number(req.query.locomotiveNumber);
      if (!Number.isFinite(locomotiveNumber) || locomotiveNumber <= 0) {
        return res.status(400).json({ message: 'locomotiveNumber es requerido y debe ser numerico.' });
      }

      const localidadRaw = Number(req.query.localidadId ?? req.query.localidad);
      try {
        const helperResult = await buscarTornoAgendadoActivable({
          locomotive: locomotiveNumber,
          tipo: 'TORNO',
          localidad: Number.isFinite(localidadRaw) && localidadRaw > 0 ? localidadRaw : null,
        });
        const helper = helperResult?.scheduled ?? null;
        const idMovimiento = Number(helper?.idMovimiento);
        if (helperResult?.activable && Number.isInteger(idMovimiento) && idMovimiento > 0) {
          const compatible = await prisma.movimiento.findUnique({
            where: { id: idMovimiento },
            include: { empresa: true, localidad: true, viaOrigen: true, viaDestino: true, ronda: true },
          });
          if (compatible && String(compatible.estado) === 'AGENDADO' && compatible.torno === true && !compatible.finalizado) {
            return res.status(200).json({
              activable: true,
              scheduledMovement: getScheduledPayload(compatible, helper),
            });
          }
          await eliminarTornoAgendadoPorMovimiento(idMovimiento).catch((error: any) =>
            log.error('No se pudo limpiar índice TornoAgendado huérfano', { movId: idMovimiento, err: error?.message })
          );
        }
      } catch (error: any) {
        log.error('No se pudo consultar índice TornoAgendado; usando búsqueda legacy', { err: error?.message });
      }

      const candidatos = await prisma.movimiento.findMany({
        where: {
          torno: true,
          estado: 'AGENDADO' as any,
          finalizado: false,
          locomotiveNumber,
        },
        orderBy: { fechaSolicitud: 'asc' },
        take: 5,
      });
      const compatible = candidatos.find(canActivateScheduledTorno);
      return res.status(200).json({
        activable: Boolean(compatible),
        scheduledMovement: compatible ? getScheduledPayload(compatible) : null,
      });
    } catch (error: any) {
      log.error('Error al buscar solicitud agendada activable de torno', { error, query: req.query });
      return res.status(500).json({ message: 'Error al buscar solicitud agendada activable', details: error?.message });
    }
  };

  static listarTornoAgendadosPendientes: RequestHandler = async (_req, res) => {
    try {
      await cleanupExpiredTornoSchedules();
      try {
        const helperResult = await listarTornoAgendados({ tipo: 'TORNO', activo: true });
        const helpers = Array.isArray(helperResult?.items) ? helperResult.items : [];
        const ids = helpers
          .map((item: any) => Number(item?.idMovimiento))
          .filter((id: number) => Number.isInteger(id) && id > 0);
        if (ids.length) {
          const movimientos = await prisma.movimiento.findMany({
            where: {
              id: { in: ids },
              torno: true,
              estado: 'AGENDADO' as any,
              finalizado: false,
            },
            include: { empresa: true, localidad: true, viaOrigen: true, viaDestino: true, ronda: true },
          });
          const byId = new Map(movimientos.map((mov) => [mov.id, mov]));
          const items = helpers
            .map((helper: any) => {
              const movimiento = byId.get(Number(helper?.idMovimiento));
              return movimiento ? getScheduledPayload(movimiento, helper) : null;
            })
            .filter(Boolean);
          return res.status(200).json({ items });
        }
      } catch (error: any) {
        log.error('No se pudo listar índice TornoAgendado; usando búsqueda legacy', { err: error?.message });
      }

      const candidatos = await prisma.movimiento.findMany({
        where: {
          torno: true,
          estado: 'AGENDADO' as any,
          finalizado: false,
        },
        orderBy: { fechaSolicitud: 'asc' },
        take: 100,
      });

      const items = candidatos
        .filter(canActivateScheduledTorno)
        .map(getScheduledPayload);

      return res.status(200).json({ items });
    } catch (error: any) {
      log.error('Error al listar solicitudes agendadas de torno', { error });
      return res.status(500).json({ message: 'Error al listar solicitudes agendadas de torno', details: error?.message });
    }
  };

  static activarTornoAgendadoDirecto: RequestHandler = async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'ID invalido' });

      const agendado = await prisma.movimiento.findUnique({
        where: { id },
        include: { empresa: true, localidad: true, viaOrigen: true, viaDestino: true, ronda: true },
      });
      if (!agendado || String(agendado.estado) !== 'AGENDADO' || agendado.torno !== true || agendado.finalizado) {
        return res.status(404).json({ message: 'Solicitud agendada de torno no encontrada o no disponible.' });
      }
      if (!canActivateScheduledTorno(agendado)) {
        await MovimientoModel.eliminarMovimiento(agendado.id);
        await eliminarTornoAgendadoPorMovimiento(agendado.id).catch((error: any) =>
          log.error('No se pudo eliminar índice TornoAgendado vencido', { movId: agendado.id, err: error?.message })
        );
        return res.status(410).json({ message: 'La ventana de activacion de la solicitud agendada vencio.' });
      }

      const scheduledMeta = decodeTornoAgendadoMeta(agendado.instrucciones);
      const scheduledMeasures =
        scheduledMeta?.medidasTorno ?? extractMedidasFromRuedaSolicitud(await getRuedaSolicitudPorMovimiento(agendado.id));
      if (!scheduledMeasures) {
        return res.status(409).json({ message: 'La solicitud agendada no contiene medidas de torno precargadas.' });
      }

      const movimiento = await MovimientoModel.activarMovimientoTornoAgendado(agendado.id);
      let tornoMs: any = null;
      try {
        tornoMs = await ensureSolicitudYRondaForMovimiento(agendado.id, scheduledMeasures, {
          localidadId: agendado.localidadId,
        });
      } catch (error: any) {
        log.error('Error registrando medidas/ronda en msTorno al activar agendado directo', {
          movId: agendado.id,
          err: error?.message,
        });
        return res.status(502).json({
          message: 'Solicitud activada, pero no se pudo registrar el servicio de torno (msTorno)',
          details: error?.message,
          movimiento,
        });
      }
      await eliminarTornoAgendadoPorMovimiento(agendado.id).catch((error: any) =>
        log.error('No se pudo eliminar índice TornoAgendado tras activación directa', {
          movId: agendado.id,
          err: error?.message,
        })
      );

      return res.status(200).json({
        message: 'Solicitud agendada activada.',
        activatedScheduled: true,
        movimiento,
        tornoMs,
      });
    } catch (error: any) {
      log.error('Error al activar solicitud agendada de torno', { error, params: req.params });
      return res.status(500).json({ message: 'Error al activar solicitud agendada de torno', details: error?.message });
    }
  };


/**
 * GET /movimientos/servicios/pendientes?localidadId=&empresaId=
 *
 * @summary Lista SOLO servicios (lavado/torno) en **SOLICITADO** o **DETENIDO**, FIFO por creación.
 * @auth Requiere JWT.
 * @query {number} [localidadId]
 * @query {number} [empresaId]
 * @returns 200 [Movimiento] | 400 | 500
 */
static listarServiciosPendientesFIFO: RequestHandler = async (req, res) => {
  const { localidadId, empresaId } = req.query;
  if (
    (localidadId !== undefined && Number.isNaN(Number(localidadId))) ||
    (empresaId !== undefined && Number.isNaN(Number(empresaId)))
  ) {
    return res.status(400).json({ message: 'Parámetros inválidos (localidadId/empresaId deben ser numéricos)' });
  }
  try {
    const lista = await MovimientoModel.listarServiciosPendientesFIFO({
      localidadId: localidadId !== undefined ? Number(localidadId) : undefined,
      empresaId: empresaId !== undefined ? Number(empresaId) : undefined,
    });
    return res.status(200).json(lista);
  } catch (error) {
    log.error('Error al listar servicios pendientes (FIFO)', { error, localidadId, empresaId });
    return res.status(500).json({ message: 'Error al listar servicios pendientes' });
  }
};


 static async obtenerInfoEdicion(req: import('express').Request, res: import('express').Response) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ error: 'id inválido' });
      const info = await MovimientoModel.obtenerInfoEdicion(id);
      const enriched = await enrichWithTornoMeasures(info);
      return res.json(enriched);
    } catch (e: any) {
      return res.status(500).json({ error: e?.message ?? 'Error interno' });
    }
  }

  static async guardarEdicion(req: import('express').Request, res: import('express').Response) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ error: 'id inválido' });

      // passport jwt debe inyectar req.user
      const actorId = Number((req as any).user?.id);
      if (!actorId) return res.status(401).json({ error: 'No autenticado' });

      const rawBody = { ...(req.body ?? {}) } as Record<string, unknown>;
      if (esCliente(req) && bodyIntentaCambiarEstadoMovimiento(rawBody)) {
        return res.status(403).json({ error: 'CLIENTE no puede modificar estados del movimiento' });
      }
      if (esTornero(req) && String(rawBody.estado ?? rawBody.status ?? '').toUpperCase() === 'CANCELADO') {
        return res.status(403).json({ error: 'No puedes cancelar el movimiento. Habla con tu supervisor.' });
      }

      const medidasTornoRaw = rawBody.medidasTorno ?? rawBody.tornoMedidas ?? null;
      delete rawBody.medidasTorno;
      delete rawBody.tornoMedidas;

      let medidasTornoNormalizadas: ReturnType<typeof normalizeMedidasRuedaInput> | null = null;
      if (medidasTornoRaw != null) {
        const parsed = medidasTornoSchema.safeParse(medidasTornoRaw);
        if (!parsed.success) {
          return res.status(400).json({
            error: 'medidasTorno inválidas para edición',
            details: parsed.error.flatten(),
          });
        }
        medidasTornoNormalizadas = normalizeMedidasRuedaInput(parsed.data);
      }

      const actualizado = await MovimientoModel.guardarEdicion(id, rawBody as any, actorId);

      if (medidasTornoNormalizadas && actualizado?.torno) {
        try {
          const tornoMedidas = await upsertRuedaSolicitudPorMovimiento(id, medidasTornoNormalizadas);
          return res.json({ ...actualizado, tornoMedidas });
        } catch (error: any) {
          return res.status(502).json({
            error: 'Movimiento editado pero no se pudieron actualizar medidas de torno',
            details: error?.message,
            movimiento: actualizado,
          });
        }
      }

      return res.json(actualizado);
    } catch (e: any) {
      const msg = e?.message ?? 'Error interno';
      const code = /no encontrado|inválid|editable/.test(msg) ? 400 : 500;
      return res.status(code).json({ error: msg });
    }
  }

/**
 * PATCH /movimientos/servicios/:id/solicitar
 *
 * @summary Cambia un servicio (lavado/torno) de **ESPERA → SOLICITADO** y lo encola al frente de **R1** (posición 1), sin importar prioridad.
 * @auth Requiere JWT.
 * @param {number} req.params.id
 * @returns 200 { message, movimiento } | 400 | 500
 */
static solicitarServicioYEncolarFrenteR1: RequestHandler = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'ID inválido' });

  try {
    const movimiento = await MovimientoModel.solicitarServicioYEncolarFrenteR1(id);
    res.status(200).json({
      message: 'Servicio solicitado y encolado al frente de R1',
      movimiento,
    });
  } catch (error: any) {
    log.error('Error al solicitar y encolar servicio al frente de R1', { error, id });
    res.status(400).json({ message: error?.message || 'Error al solicitar y encolar servicio' });
  }
};

  /**
   * PATCH /movimientos/:id/prioridad
   *
   * @summary Cambia la prioridad del movimiento.
   * @description Si pasa a **ALTA** y el estado era `SOLICITADO`, el modelo puede reordenar rondas.
   * @auth Requiere JWT.
   * @param {number} req.params.id
   * @body {{prioridad:'ALTA'|'BAJA'}}
   * @returns 200 { message, movimiento, prioridadAnterior, prioridadNueva } | 400 | 404 | 500
   */
  static cambiarPrioridad: RequestHandler = async (req, res) => {
    const id = Number(req.params.id);
    const { prioridad } = req.body as { prioridad: 'ALTA' | 'BAJA' };

    if (!Number.isInteger(id)) return res.status(400).json({ message: 'ID de movimiento inválido' });
    if (!['ALTA', 'BAJA'].includes(prioridad)) {
      return res.status(400).json({ message: 'Valor de prioridad inválido. Debe ser "ALTA" o "BAJA"' });
    }

    try {
      const movimientos = await MovimientoModel.obtenerMovimientos();
      const original = movimientos.find((m: { id: number }) => m.id === id);
      if (!original) return res.status(404).json({ message: 'Movimiento no encontrado' });

      if (original.prioridad === prioridad) {
        return res.status(200).json({ message: `El movimiento ya tiene prioridad ${prioridad}`, movimiento: original });
      }

      if (prioridad === 'ALTA') {
        log.info('Cambiando movimiento a ALTA prioridad', {
          id,
          estadoOriginal: (original as any).estado,
          localidadId: (original as any).localidadId,
        });
      }

      const movimiento = await MovimientoModel.cambiarPrioridad(id, prioridad);
      const message =
        prioridad === 'ALTA' && (original as any).estado === 'SOLICITADO'
          ? 'Prioridad actualizada a ALTA. Se reorganizaron las rondas.'
          : `Prioridad actualizada a ${prioridad}`;

      res.status(200).json({ message, movimiento, prioridadAnterior: (original as any).prioridad, prioridadNueva: prioridad });
    } catch (error) {
      log.error('Error al cambiar prioridad del movimiento', { error, id, prioridad });
      res.status(500).json({ message: 'Error al cambiar prioridad del movimiento' });
    }
  };

  /**
   * DELETE /movimientos/:id
   *
   * @summary Elimina un movimiento por ID.
   * @auth Requiere JWT.
   * @param {number} req.params.id
   * @returns 204 | 400 | 500
   */
  static eliminarMovimiento: RequestHandler = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'ID inválido' });

    try {
      await MovimientoModel.eliminarMovimiento(id);
      res.sendStatus(204);
    } catch (error) {
      log.error('Error al eliminar movimiento', { error, id });
      res.status(500).json({ message: 'Error al eliminar movimiento' });
    }
  };

  /**
   * GET /movimientos/pendientes
   *
   * @summary Lista movimientos no concluidos.
   * @auth Requiere JWT.
   * @returns 200 [Movimiento] | 500
   */
  static obtenerMovimientosPendientes: RequestHandler = async (req, res) => {
    const pagination = this.requirePagination(req, res);
    if (!pagination) return;

    try {
      const pendientes = await MovimientoModel.obtenerMovimientosPendientesPaginados(pagination);
      res.status(200).json(pendientes);
    } catch (error) {
      log.error('Error al obtener movimientos pendientes', { error, query: req.query });
      res.status(500).json({ message: 'Error al obtener movimientos pendientes' });
    }
  };

  /**
   * GET /movimientos/empresa/:empresaId/pendientes
   *
   * @summary Lista movimientos pendientes por empresa.
   * @auth Requiere JWT.
   * @param {number} req.params.empresaId
   * @returns 200 [Movimiento] | 400 | 500
   */
  static obtenerMovimientosPendientesPorEmpresa: RequestHandler = async (req, res) => {
    const empresaId = Number(req.params.empresaId);
    if (!Number.isInteger(empresaId)) return res.status(400).json({ message: 'ID de empresa inválido' });

    const pagination = this.requirePagination(req, res);
    if (!pagination) return;

    try {
      const pendientes = await MovimientoModel.obtenerMovimientosPendientesPorEmpresaPaginados(empresaId, pagination);
      res.status(200).json(pendientes);
    } catch (error) {
      log.error('Error al obtener movimientos pendientes por empresa', { error, empresaId, query: req.query });
      res.status(500).json({ message: 'Error al obtener movimientos pendientes por empresa' });
    }
  };

  /**
   * GET /movimientos/all
   *
   * @summary Lista todos los movimientos (sin filtros).
   * @auth Requiere JWT.
   * @returns 200 [Movimiento] | 500
   */
  static obtenerTodosLosMovimientos: RequestHandler = async (req, res) => {
    const pagination = this.requirePagination(req, res);
    if (!pagination) return;

    try {
      const movimientos = await MovimientoModel.obtenerTodosLosMovimientosPaginados(pagination);
      res.status(200).json(movimientos);
    } catch (error) {
      log.error('Error al obtener todos los movimientos', { error, query: req.query });
      res.status(500).json({ message: 'Error al obtener todos los movimientos' });
    }
  };

  /**
   * GET /movimientos/empresa/:empresaId
   *
   * @summary Lista movimientos por empresa.
   * @auth Requiere JWT.
   * @param {number} req.params.empresaId
   * @returns 200 [Movimiento] | 400 | 500
   */
  static obtenerMovimientosPorEmpresa: RequestHandler = async (req, res) => {
    const empresaId = Number(req.params.empresaId);
    if (!Number.isInteger(empresaId)) return res.status(400).json({ message: 'ID de empresa inválido' });

    const pagination = this.requirePagination(req, res);
    if (!pagination) return;

    try {
      const movimientos = await MovimientoModel.obtenerMovimientosPorEmpresaPaginados(empresaId, pagination);
      res.status(200).json(movimientos);
    } catch (error) {
      log.error('Error al obtener movimientos por empresa', { error, empresaId, query: req.query });
      res.status(500).json({ message: 'Error al obtener movimientos por empresa' });
    }
  };

  /**
   * GET /movimientos/localidad/:localidadId/pendientes
   *
   * @summary Lista movimientos pendientes por localidad.
   * @auth Requiere JWT.
   * @param {number} req.params.localidadId
   * @returns 200 [Movimiento] | 400 | 500
   */
  static obtenerMovimientosPendientesPorLocalidad: RequestHandler = async (req, res) => {
    const localidadId = Number(req.params.localidadId);
    if (!Number.isInteger(localidadId)) return res.status(400).json({ message: 'ID de localidad inválido' });

    const pagination = this.requirePagination(req, res);
    if (!pagination) return;

    try {
      const movimientos = await MovimientoModel.obtenerMovimientosPendientesPorLocalidadPaginados(localidadId, pagination);
      res.status(200).json(movimientos);
    } catch (error) {
      log.error('Error al obtener movimientos pendientes por localidad', { error, localidadId, query: req.query });
      res.status(500).json({ message: 'Error al obtener movimientos pendientes por localidad' });
    }
  };

  /**
   * GET /movimientos/localidad/:localidadId/all
   *
   * @summary Lista **todos** los movimientos por localidad.
   * @auth Requiere JWT.
   * @param {number} req.params.localidadId
   * @returns 200 [Movimiento] | 400 | 500
   */
  static obtenerTodosMovimientosPorLocalidad: RequestHandler = async (req, res) => {
    const localidadId = Number(req.params.localidadId);
    if (!Number.isInteger(localidadId)) return res.status(400).json({ message: 'ID de localidad inválido' });

    const pagination = this.requirePagination(req, res);
    if (!pagination) return;

    try {
      const movimientos = await MovimientoModel.obtenerTodosMovimientosPorLocalidadPaginados(localidadId, pagination);
      res.status(200).json(movimientos);
    } catch (error) {
      log.error('Error al obtener todos los movimientos por localidad', { error, localidadId, query: req.query });
      res.status(500).json({ message: 'Error al obtener todos los movimientos por localidad' });
    }
  };

  /**
   * GET /movimientos/localidad/:localidadId/empresa/:empresaId
   *
   * @summary Lista movimientos por localidad y empresa.
   * @auth Requiere JWT.
   * @param {number} req.params.localidadId
   * @param {number} req.params.empresaId
   * @returns 200 [Movimiento] | 400 | 500
   */
  static obtenerMovimientosPorLocalidadEmpresa: RequestHandler = async (req, res) => {
    const localidadId = Number(req.params.localidadId);
    const empresaId = Number(req.params.empresaId);
    if (!Number.isInteger(localidadId) || !Number.isInteger(empresaId)) {
      return res.status(400).json({ message: 'ID de localidad o empresa inválido' });
    }

    const pagination = this.requirePagination(req, res);
    if (!pagination) return;

    try {
      const movimientos = await MovimientoModel.obtenerMovimientosPorLocalidadEmpresaPaginados(localidadId, empresaId, pagination);
      res.status(200).json(movimientos);
    } catch (error) {
      log.error('Error al obtener movimientos por localidad y empresa', { error, localidadId, empresaId, query: req.query });
      res.status(500).json({ message: 'Error al obtener movimientos por localidad y empresa' });
    }
  };

  /**
   * GET /movimientos/empresa/:empresaId/localidad/:localidadId
   *
   * @summary Lista movimientos por empresa y localidad (orden invertido en la ruta).
   * @auth Requiere JWT.
   * @param {number} req.params.empresaId
   * @param {number} req.params.localidadId
   * @returns 200 [Movimiento] | 400 | 500
   */
  static obtenerMovimientosPorEmpresaYLocalidad: RequestHandler = async (req, res) => {
    const empresaId = Number(req.params.empresaId);
    const localidadId = Number(req.params.localidadId);
    if (!Number.isInteger(empresaId) || !Number.isInteger(localidadId)) {
      return res.status(400).json({ message: 'ID de empresa o localidad inválido' });
    }

    const pagination = this.requirePagination(req, res);
    if (!pagination) return;

    try {
      const movimientos = await MovimientoModel.obtenerMovimientosPorEmpresaYLocalidadPaginados(empresaId, localidadId, pagination);
      res.status(200).json(movimientos);
    } catch (error) {
      log.error('Error al obtener movimientos por empresa y localidad', { error, empresaId, localidadId, query: req.query });
      res.status(500).json({ message: 'Error al obtener movimientos por empresa y localidad' });
    }
  };

  /**
   * GET /movimientos/empresa/:empresaId/localidad/:localidadId/pendientes
   *
   * @summary Lista movimientos **no concluidos** por empresa y localidad.
   * @auth Requiere JWT.
   * @param {number} req.params.empresaId
   * @param {number} req.params.localidadId
   * @returns 200 [Movimiento] | 400 | 500
   */
  static obtenerMovimientosNoConcluidosPorEmpresaYLocalidad: RequestHandler = async (req, res) => {
    const empresaId = Number(req.params.empresaId);
    const localidadId = Number(req.params.localidadId);
    if (!Number.isInteger(empresaId) || !Number.isInteger(localidadId)) {
      return res.status(400).json({ message: 'ID de empresa o localidad inválido' });
    }

    const pagination = this.requirePagination(req, res);
    if (!pagination) return;

    try {
      const pendientes = await MovimientoModel.obtenerMovimientosNoConcluidosPorEmpresaYLocalidadPaginados(empresaId, localidadId, pagination);
      res.status(200).json(pendientes);
    } catch (error) {
      log.error('Error al obtener movimientos no concluidos por empresa y localidad', { error, empresaId, localidadId, query: req.query });
      res.status(500).json({ message: 'Error al obtener movimientos no concluidos por empresa y localidad' });
    }
  };

  /**
   * GET /movimientos/buscar?q=&locomotiveNumber=&empresaId=&localidadId=&estado=&prioridad=&finalizado=&page=&pageSize=
   */
  static buscarMovimientos: RequestHandler = async (req, res) => {
    const pagination = this.requirePagination(req, res);
    if (!pagination) return;

    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const locomotivePrefix = typeof req.query.locomotivePrefix === 'string' ? req.query.locomotivePrefix.trim() : undefined;
    const empresaId = req.query.empresaId !== undefined ? Number(req.query.empresaId) : undefined;
    const localidadId = req.query.localidadId !== undefined ? Number(req.query.localidadId) : undefined;
    const locomotiveNumber = req.query.locomotiveNumber !== undefined ? Number(req.query.locomotiveNumber) : undefined;
    const prioridad = typeof req.query.prioridad === 'string' ? req.query.prioridad.toUpperCase() : undefined;
    const finalizadoRaw = typeof req.query.finalizado === 'string' ? req.query.finalizado : undefined;
    const ambitoRaw = typeof req.query.ambito === 'string' ? req.query.ambito.toLowerCase() : undefined;
    const fechaCampoRaw = typeof req.query.fechaCampo === 'string' ? req.query.fechaCampo.toLowerCase() : 'solicitud';
    const fechaDesdeRaw = typeof req.query.fechaDesde === 'string' ? req.query.fechaDesde : undefined;
    const fechaHastaRaw = typeof req.query.fechaHasta === 'string' ? req.query.fechaHasta : undefined;

    if (empresaId !== undefined && Number.isNaN(empresaId)) {
      return res.status(400).json({ message: 'empresaId debe ser numérico' });
    }
    if (localidadId !== undefined && Number.isNaN(localidadId)) {
      return res.status(400).json({ message: 'localidadId debe ser numérico' });
    }
    if (locomotiveNumber !== undefined && Number.isNaN(locomotiveNumber)) {
      return res.status(400).json({ message: 'locomotiveNumber debe ser numérico' });
    }
    if (locomotivePrefix && !/^\d+$/.test(locomotivePrefix)) {
      return res.status(400).json({ message: 'locomotivePrefix debe ser numérico' });
    }
    if (prioridad && !['ALTA', 'BAJA'].includes(prioridad)) {
      return res.status(400).json({ message: 'prioridad inválida (ALTA|BAJA)' });
    }

    let ambito: 'actuales' | 'pasados' | undefined;
    if (ambitoRaw) {
      if (!['actuales', 'pasados'].includes(ambitoRaw)) {
        return res.status(400).json({ message: 'ambito inválido (actuales|pasados)' });
      }
      ambito = ambitoRaw as any;
    }

    const camposFechaValidos = ['solicitud', 'inicio', 'fin', 'creacion'];
    if (fechaCampoRaw && !camposFechaValidos.includes(fechaCampoRaw)) {
      return res.status(400).json({ message: `fechaCampo inválido (válidos: ${camposFechaValidos.join(', ')})` });
    }

    const parseFecha = (v?: string) => {
      if (!v) return undefined;
      // Acepta ISO o formato MX: DD/MM/YYYY o DD/MM/YYYY HH:mm
      if (v.includes('/')) {
        const [datePart, timePart] = v.trim().split(' ');
        const [dd, mm, yyyy] = datePart.split('/').map((n) => Number(n));
        if (!dd || !mm || !yyyy) return undefined;
        let hh = 0;
        let min = 0;
        let ss = 0;
        if (timePart) {
          const [hhs, mins, secs] = timePart.split(':');
          hh = Number(hhs);
          min = Number(mins);
          if (secs !== undefined) ss = Number(secs);
          if (Number.isNaN(hh) || Number.isNaN(min) || Number.isNaN(ss)) return undefined;
        }
        const d = new Date(yyyy, mm - 1, dd, hh, min, ss, 0);
        return Number.isNaN(d.getTime()) ? undefined : d;
      }
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? undefined : d;
    };
    const fechaDesde = parseFecha(fechaDesdeRaw);
    const fechaHasta = parseFecha(fechaHastaRaw);
    if ((fechaDesdeRaw && !fechaDesde) || (fechaHastaRaw && !fechaHasta)) {
      return res.status(400).json({ message: 'fechaDesde/fechaHasta deben ser ISO válidos' });
    }
    if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
      return res.status(400).json({ message: 'fechaDesde no puede ser mayor que fechaHasta' });
    }

    let finalizado: boolean | undefined = undefined;
    if (finalizadoRaw !== undefined) {
      if (finalizadoRaw !== 'true' && finalizadoRaw !== 'false') {
        return res.status(400).json({ message: 'finalizado debe ser true|false' });
      }
      finalizado = finalizadoRaw === 'true';
    }

    const rawEstado = req.query.estado;
    const estados = Array.isArray(rawEstado)
      ? rawEstado.flatMap((v) => String(v).split(','))
      : rawEstado !== undefined
        ? String(rawEstado).split(',')
        : [];
    const estadosLimpios = estados.map((e) => e.trim().toUpperCase()).filter(Boolean);
    const estadosValidos = ['SOLICITADO', 'EN_PROCESO', 'DETENIDO', 'ESPERA', 'CANCELADO', 'CONCLUIDO', 'AGENDADO'];
    const estadosFiltrados = estadosLimpios.filter((e) => estadosValidos.includes(e));
    if (estadosLimpios.length && !estadosFiltrados.length) {
      return res.status(400).json({ message: `estado inválido (válidos: ${estadosValidos.join(', ')})` });
    }

    let estadosFinal = estadosFiltrados;
    let ambitoFinal = ambito;

    if (!estadosFinal.length && (ambitoFinal || finalizado !== undefined)) {
      const scope = ambitoFinal ?? (finalizado ? 'pasados' : 'actuales');
      if (scope === 'pasados') {
        estadosFinal = ['CONCLUIDO', 'DETENIDO', 'CANCELADO'];
        ambitoFinal = 'pasados';
      } else {
        estadosFinal = ['SOLICITADO', 'EN_PROCESO', 'DETENIDO'];
        ambitoFinal = 'actuales';
      }
      // Si se usa finalizado como scope, no filtramos por el flag para permitir DETENIDO en ambos listados.
      if (finalizado !== undefined) finalizado = undefined;
    }

    if (!q && !locomotivePrefix && empresaId === undefined && localidadId === undefined && locomotiveNumber === undefined && !prioridad && finalizado === undefined && !estadosFinal.length && !ambitoFinal) {
      return res.status(400).json({ message: 'Debe enviar q o al menos un filtro' });
    }

    try {
      const resultado = await MovimientoModel.buscarMovimientos({
        q,
        locomotivePrefix,
        locomotiveNumber,
        empresaId,
        localidadId,
        estados: estadosFinal,
        prioridad: prioridad as any,
        finalizado,
        ambito: ambitoFinal,
        fechaCampo: fechaCampoRaw as any,
        fechaDesde,
        fechaHasta,
        pagination,
      });
      res.status(200).json(resultado);
    } catch (error) {
      log.error('Error al buscar movimientos', { error, query: req.query });
      res.status(500).json({ message: 'Error al buscar movimientos' });
    }
  };

  /**
   * GET /movimientos/ronda/:rondaId/info
   *
   * @summary Devuelve detalle vinculado a una **ronda** y (si es posible) `meta` del movimiento original.
   * @auth Requiere JWT.
   * @param {number} req.params.rondaId
   * @returns 200 info | { ...info, meta } | 400 | 500
   */
static obtenerInfoPorRonda: RequestHandler = async (req, res) => {
  const rondaId = Number(req.params.rondaId);
  if (!Number.isInteger(rondaId)) return res.status(400).json({ message: 'ID de ronda inválido' });

  try {
    const info = await MovimientoModel.obtenerInfoPorRonda(rondaId);
    const enriched = await enrichWithTornoMeasures(info);
    return res.status(200).json(enriched);
  } catch (error) {
    log.error('Error al obtener info de ronda', { error, rondaId });
    return res.status(500).json({ message: 'Error al obtener info de ronda' });
  }
};

  /**
   * PATCH /movimientos/:id/iniciar
   *
   * @summary Marca un movimiento como iniciado por `operadorId`.
   * @auth Requiere JWT.
   * @param {number} req.params.id
   * @body {{operadorId:number}}
   * @returns 200 { message, movimiento } | 400 | 500
   */
  static iniciarMovimiento: RequestHandler = async (req, res) => {
    const id = Number(req.params.id);
    const { operadorId } = req.body;

    if (!Number.isInteger(id) || typeof operadorId !== 'number') {
      return res.status(400).json({ message: 'Datos inválidos: id o operadorId faltante o incorrecto' });
    }
    if (bloquearClienteEstadoMovimiento(req, res)) return;

    try {
      const movimiento = await MovimientoModel.iniciarMovimiento(id, operadorId);
      res.status(200).json({ message: 'Movimiento iniciado', movimiento });
    } catch (error) {
      log.error('Error al iniciar movimiento', { id, operadorId, error });
      res.status(500).json({ message: 'Error al iniciar movimiento' });
    }
  };

  /**
   * PATCH /movimientos/:id/pausar
   *
   * @summary Pausa el movimiento.
   * @auth Requiere JWT.
   * @param {number} req.params.id
   * @returns 200 { message, movimiento } | 400 | 500
   */
  static pausarMovimiento: RequestHandler = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'ID inválido' });
    if (bloquearClienteEstadoMovimiento(req, res)) return;

    try {
      const movimiento = await MovimientoModel.pausarMovimiento(id);
      res.status(200).json({ message: 'Movimiento pausado', movimiento });
    } catch (error) {
      log.error('Error al pausar movimiento', { id, error });
      res.status(500).json({ message: 'Error al pausar movimiento' });
    }
  };

  /**
   * PATCH /movimientos/:id/reanudar
   *
   * @summary Reanuda un movimiento pausado.
   * @auth Requiere JWT.
   * @param {number} req.params.id
   * @returns 200 { message, movimiento } | 400 | 500
   */
  static reanudarMovimiento: RequestHandler = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'ID inválido' });
    if (bloquearClienteEstadoMovimiento(req, res)) return;

    try {
      const movimiento = await MovimientoModel.reanudarMovimiento(id);
      res.status(200).json({ message: 'Movimiento reanudado', movimiento });
    } catch (error) {
      log.error('Error al reanudar movimiento', { id, error });
      res.status(500).json({ message: 'Error al reanudar movimiento' });
    }
  };

  /**
   * PATCH /movimientos/:id/finalizar
   *
   * @summary Finaliza el movimiento y devuelve **acciones sugeridas** según META.
   * @description No ocupa/libera vías aquí; solo sugiere `{ liberarOrigen?, ocuparDestino? }`
   * para que otro servicio las ejecute.
   * @auth Requiere JWT.
   * @param {number} req.params.id
   * @returns 200 {
   *   message,
   *   accionesSugeridas: { liberarOrigen?:{viaId}, ocuparDestino?:{viaId, numeroSeccion} },
   *   movimiento
   * } | 400 | 404 | 500
   */
  static finalizarMovimiento: RequestHandler = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'ID inválido' });
    if (bloquearClienteEstadoMovimiento(req, res)) return;

    try {
      // Obtenemos el movimiento actual para leer origen+meta antes de finalizar
      const todos = await MovimientoModel.obtenerMovimientos();
      const original = todos.find((m: any) => m.id === id);
      if (!original) return res.status(404).json({ message: 'Movimiento no encontrado' });

      const meta = parseMetaFromInstrucciones((original as any).instrucciones ?? undefined);

      const movimiento = await MovimientoModel.finalizarMovimiento(id);

      // Acciones SUGERIDAS para que otro servicio (no este controller) ejecute
      const accionesSugeridas: any = {};
      if (meta.liberar && (original as any).viaOrigenId) {
        accionesSugeridas.liberarOrigen = { viaId: (original as any).viaOrigenId };
      }
      if (meta.destinoId) {
        accionesSugeridas.ocuparDestino = {
          viaId: meta.destinoId,
          numeroSeccion: meta.seccion ?? 'PRIMERA_LIBRE',
        };
      }

      res.status(200).json({
        message: 'Movimiento finalizado. Acciones operativas sugeridas adjuntas.',
        accionesSugeridas,
        movimiento,
      });
    } catch (error) {
      log.error('Error al finalizar movimiento', { id, error });
      res.status(500).json({ message: 'Error al finalizar movimiento' });
    }
  };
}
