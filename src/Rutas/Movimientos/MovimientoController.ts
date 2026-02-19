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
import { MovimientoModel } from '../../models/Movimientos/movimientosModel';
import { movimientoControllerLogger as log } from './movimiento.controller.logger';

/** ------------------------------------------------------------------------
 * Helpers META
 * Guardamos intención en `instrucciones` con tags para que OTRO servicio
 * (o el maquinista) actúe **al CONCLUIR**.
 * Formato: [META DESTINO:123|SECCION:2|LIBERAR]
 * ------------------------------------------------------------------------ */

/**
 * Construye la etiqueta META a inyectar en `instrucciones`.
 * - DESTINO:n   → viaDestinoId
 * - SECCION:n   → número de sección deseada (solo intención, no se persiste como columna)
 * - LIBERAR     → liberar vía origen al concluir
 */
function buildMetaTag(opts: {
  viaDestinoId?: number;
  numeroSeccion?: number;
  liberarOrigen?: boolean;
}) {
  const parts: string[] = [];
  if (opts.viaDestinoId) parts.push(`DESTINO:${Number(opts.viaDestinoId)}`);
  if (opts.numeroSeccion != null) parts.push(`SECCION:${Number(opts.numeroSeccion)}`);
  if (opts.liberarOrigen) parts.push('LIBERAR');
  return parts.length ? `[META ${parts.join('|')}] ` : '';
}

/**
 * Extrae la intención operativa desde `instrucciones` si existe.
 * Retorna { destinoId?, seccion?, liberar:boolean }.
 */
function parseMetaFromInstrucciones(instr?: string) {
  const meta = { destinoId: undefined as number | undefined, seccion: undefined as number | undefined, liberar: false };
  if (!instr) return meta;
  const m = instr.match(/\[META ([^\]]+)\]/i);
  if (!m) return meta;
  const tokens = m[1].split('|').map(s => s.trim().toUpperCase());
  for (const t of tokens) {
    if (t === 'LIBERAR') meta.liberar = true;
    if (t.startsWith('DESTINO:')) {
      const v = Number(t.split(':')[1]); if (!Number.isNaN(v)) meta.destinoId = v;
    }
    if (t.startsWith('SECCION:')) {
      const s = Number(t.split(':')[1]); if (!Number.isNaN(s)) meta.seccion = s;
    }
  }
  return meta;
}

export class MovimientoController {
  /**
   * GET /movimientos
   *
   * @summary Lista todos los movimientos.
   * @auth Requiere JWT.
   * @returns 200 [Movimiento] | 500
   */
  static obtenerMovimientos: RequestHandler = async (_req, res) => {
    try {
      const movimientos = await MovimientoModel.obtenerMovimientos();
      res.status(200).json(movimientos);
    } catch (error) {
      log.error('Error al obtener movimientos', { error });
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
   * @summary Cambia estado de **servicio**: SOLICITADO | EN_PROCESO | DETENIDO | CANCELADO.
   * @description Los servicios solo serán ofrecidos al maquinista cuando estén **EN_PROCESO**.
   * @auth Requiere JWT.
   * @param {number} req.params.id
   * @body {{estado:'SOLICITADO'|'EN_PROCESO'|'DETENIDO'|'CANCELADO', operadorId?:number, razon?:string}}
   * @returns 200 {message, movimiento} | 400 | 500
   */
  static actualizarEstadoServicio: RequestHandler = async (req, res) => {
    const id = Number(req.params.id);
    const { estado, operadorId, razon } = req.body as {
      estado: 'SOLICITADO' | 'EN_PROCESO' | 'DETENIDO' | 'CANCELADO';
      operadorId?: number;
      razon?: string;
    };

    const validos = ['SOLICITADO', 'EN_PROCESO', 'DETENIDO', 'CANCELADO'];
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'ID inválido' });
    if (!validos.includes(estado)) {
      return res.status(400).json({ message: `Estado inválido. Debe ser uno de: ${validos.join(' | ')}` });
    }
    if (operadorId !== undefined && typeof operadorId !== 'number') {
      return res.status(400).json({ message: 'operadorId debe ser numérico si se envía' });
    }

    try {
      const mov = await MovimientoModel.actualizarEstadoServicio(id, estado, { operadorId, razon });
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

  try {
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
      const todos = await MovimientoModel.obtenerMovimientos();
      const mov = todos.find((m: { id: number }) => m.id === id);
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

      const movimiento = await MovimientoModel.nuevoMovimiento(data);

      res.status(201).json({
        message: 'Movimiento creado (sin ocupar/liberar vías/secciones). Acciones diferidas al concluir.',
        meta: {
          destinoSolicitado: raw.viaDestinoId ?? null,
          seccionSolicitada: raw.numeroSeccion ?? null,
          liberarOrigen: liberarOrigenFlag,
        },
        movimiento,
      });
    } catch (error: any) {
      log.error('Error al crear movimiento', { error, body: req.body });
      res.status(500).json({ message: 'Error al crear movimiento', details: error?.message });
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
      return res.json(info);
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

      const actualizado = await MovimientoModel.guardarEdicion(id, req.body, actorId);
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
  static obtenerMovimientosPendientes: RequestHandler = async (_req, res) => {
    try {
      const pendientes = await MovimientoModel.obtenerMovimientosPendientes();
      res.status(200).json(pendientes);
    } catch (error) {
      log.error('Error al obtener movimientos pendientes', { error });
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

    try {
      const pendientes = await MovimientoModel.obtenerMovimientosPendientesPorEmpresa(empresaId);
      res.status(200).json(pendientes);
    } catch (error) {
      log.error('Error al obtener movimientos pendientes por empresa', { error, empresaId });
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
  static obtenerTodosLosMovimientos: RequestHandler = async (_req, res) => {
    try {
      const movimientos = await MovimientoModel.obtenerTodosLosMovimientos();
      res.status(200).json(movimientos);
    } catch (error) {
      log.error('Error al obtener todos los movimientos', { error });
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

    try {
      const movimientos = await MovimientoModel.obtenerMovimientosPorEmpresa(empresaId);
      res.status(200).json(movimientos);
    } catch (error) {
      log.error('Error al obtener movimientos por empresa', { error, empresaId });
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

    try {
      const movimientos = await MovimientoModel.obtenerMovimientosPendientesPorLocalidad(localidadId);
      if (!res.headersSent) res.status(200).json(movimientos);
    } catch (error) {
      log.error('Error al obtener movimientos pendientes por localidad', { error, localidadId });
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error al obtener movimientos pendientes por localidad' });
      }
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

    try {
      const movimientos = await MovimientoModel.obtenerTodosMovimientosPorLocalidad(localidadId);
      res.status(200).json(movimientos);
    } catch (error) {
      log.error('Error al obtener todos los movimientos por localidad', { error, localidadId });
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
    try {
      const movimientos = await MovimientoModel.obtenerMovimientosPorLocalidadEmpresa(localidadId, empresaId);
      res.status(200).json(movimientos);
    } catch (error) {
      log.error('Error al obtener movimientos por localidad y empresa', { error, localidadId, empresaId });
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
    try {
      const movimientos = await MovimientoModel.obtenerMovimientosPorEmpresaYLocalidad(empresaId, localidadId);
      res.status(200).json(movimientos);
    } catch (error) {
      log.error('Error al obtener movimientos por empresa y localidad', { error, empresaId, localidadId });
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
    try {
      const pendientes = await MovimientoModel.obtenerMovimientosNoConcluidosPorEmpresaYLocalidad(empresaId, localidadId);
      res.status(200).json(pendientes);
    } catch (error) {
      log.error('Error al obtener movimientos no concluidos por empresa y localidad', { error, empresaId, localidadId });
      res.status(500).json({ message: 'Error al obtener movimientos no concluidos por empresa y localidad' });
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
    return res.status(200).json(info);
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
