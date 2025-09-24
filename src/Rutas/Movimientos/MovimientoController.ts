// movimiento.controller.ts
import { RequestHandler } from 'express';
import { MovimientoModel } from '../../models/Movimientos/movimientosModel'; // <- casing correcto
import { movimientoControllerLogger as log } from './movimiento.controller.logger';

/** ---- Helpers de META (no tocamos Vías/Secciones desde aquí) ----
 * Guardamos intención en `instrucciones` con tags para que OTRO servicio
 * (o el maquinista) actúe al CONCLUIR: [META DESTINO:123|SECCION:2|LIBERAR]
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
  // GET /movimientos
  static obtenerMovimientos: RequestHandler = async (_req, res) => {
    try {
      const movimientos = await MovimientoModel.obtenerMovimientos();
      res.status(200).json(movimientos);
    } catch (error) {
      log.error('Error al obtener movimientos', { error });
      res.status(500).json({ message: 'Error al obtener movimientos' });
    }
  };

  // POST /movimientos  (NO ocupa/libera vías aquí)
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
      if (!raw.empresaId || !raw.creadoPorId || !raw.localidadId || !raw.viaOrigenId || !raw.locomotiveNumber) {
        return res.status(400).json({ message: 'Faltan campos obligatorios.' });
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
        viaDestinoId: raw.viaDestinoId,            // lo guardamos como META, no asignamos
        numeroSeccion: raw.numeroSeccion,          // idem
        liberarOrigen: liberarOrigenFlag,          // palabra clave "liberar"
      });

      // Inyectamos META al inicio de instrucciones y **removemos** campos operativos
      const data = {
        ...raw,
        instrucciones: `${meta}${raw.instrucciones ?? ''}`.trim(),
      };
      delete (data as any).viaDestinoId;
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

  // PATCH /movimientos/:id/prioridad
  static cambiarPrioridad: RequestHandler = async (req, res) => {
    const id = Number(req.params.id);
    const { prioridad } = req.body;

    if (!Number.isInteger(id)) return res.status(400).json({ message: 'ID de movimiento inválido' });
    if (!['ALTA', 'BAJA'].includes(prioridad)) {
      return res.status(400).json({ message: 'Valor de prioridad inválido. Debe ser "ALTA" o "BAJA"' });
    }

    try {
      const movimientos = await MovimientoModel.obtenerMovimientos();
      const original = movimientos.find(m => m.id === id);
      if (!original) return res.status(404).json({ message: 'Movimiento no encontrado' });

      if (original.prioridad === prioridad) {
        return res.status(200).json({ message: `El movimiento ya tiene prioridad ${prioridad}`, movimiento: original });
      }

      if (prioridad === 'ALTA') {
        log.info('Cambiando movimiento a ALTA prioridad', {
          id,
          estadoOriginal: original.estado,
          localidadId: original.localidadId,
        });
      }

      const movimiento = await MovimientoModel.cambiarPrioridad(id, prioridad);
      const message =
        prioridad === 'ALTA' && original.estado === 'SOLICITADO'
          ? 'Prioridad actualizada a ALTA. Se reorganizaron las rondas.'
          : `Prioridad actualizada a ${prioridad}`;

      res.status(200).json({ message, movimiento, prioridadAnterior: original.prioridad, prioridadNueva: prioridad });
    } catch (error) {
      log.error('Error al cambiar prioridad del movimiento', { error, id, prioridad });
      res.status(500).json({ message: 'Error al cambiar prioridad del movimiento' });
    }
  };

  // DELETE /movimientos/:id
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

  // GET /movimientos/pendientes
  static obtenerMovimientosPendientes: RequestHandler = async (_req, res) => {
    try {
      const pendientes = await MovimientoModel.obtenerMovimientosPendientes();
      res.status(200).json(pendientes);
    } catch (error) {
      log.error('Error al obtener movimientos pendientes', { error });
      res.status(500).json({ message: 'Error al obtener movimientos pendientes' });
    }
  };

  // GET /movimientos/empresa/:empresaId/pendientes
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

  // GET /movimientos/all
  static obtenerTodosLosMovimientos: RequestHandler = async (_req, res) => {
    try {
      const movimientos = await MovimientoModel.obtenerTodosLosMovimientos();
      res.status(200).json(movimientos);
    } catch (error) {
      log.error('Error al obtener todos los movimientos', { error });
      res.status(500).json({ message: 'Error al obtener todos los movimientos' });
    }
  };

  // GET /movimientos/empresa/:empresaId
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

  // GET /movimientos/localidad/:localidadId/pendientes
  static obtenerMovimientosPendientesPorLocalidad: RequestHandler = async (req, res) => {
    const localidadId = Number(req.params.localidadId);
    if (!Number.isInteger(localidadId)) return res.status(400).json({ message: 'ID de localidad inválido' });

    try {
      const movimientos = await MovimientoModel.obtenerMovimientosPendientesPorLocalidad(localidadId);
      res.status(200).json(movimientos);
    } catch (error) {
      log.error('Error al obtener movimientos pendientes por localidad', { error, localidadId });
      res.status(500).json({ message: 'Error al obtener movimientos pendientes por localidad' });
    }
  };

  // GET /movimientos/localidad/:localidadId/all
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

  // GET /movimientos/localidad/:localidadId/empresa/:empresaId
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

  // GET /movimientos/empresa/:empresaId/localidad/:localidadId
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

  // GET /movimientos/empresa/:empresaId/localidad/:localidadId/pendientes
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

  // GET /movimientos/ronda/:rondaId/info
  static obtenerInfoPorRonda: RequestHandler = async (req, res) => {
    const rondaId = Number(req.params.rondaId);
    if (!Number.isInteger(rondaId)) return res.status(400).json({ message: 'ID de ronda inválido' });

    try {
      const info = await MovimientoModel.obtenerInfoPorRonda(rondaId);
      res.status(200).json(info);
    } catch (error) {
      log.error('Error al obtener info de ronda', { error, rondaId });
      res.status(500).json({ message: 'Error al obtener info de ronda' });
    }
  };

  // PATCH /movimientos/:id/iniciar
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

  // PATCH /movimientos/:id/pausar
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

  // PATCH /movimientos/:id/reanudar
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

  // PATCH /movimientos/:id/finalizar  (NO libera/ocupa aquí; solo sugiere acciones)
  static finalizarMovimiento: RequestHandler = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'ID inválido' });

    try {
      // Obtenemos el movimiento actual para leer origen+meta antes de finalizar
      const todos = await MovimientoModel.obtenerMovimientos();
      const original = todos.find(m => m.id === id);
      if (!original) return res.status(404).json({ message: 'Movimiento no encontrado' });

      const meta = parseMetaFromInstrucciones(original.instrucciones ?? undefined);

      const movimiento = await MovimientoModel.finalizarMovimiento(id);

      // Acciones SUGERIDAS para que otro servicio (no este controller) ejecute
      const accionesSugeridas: any = {};
      if (meta.liberar && original.viaOrigenId) {
        accionesSugeridas.liberarOrigen = { viaId: original.viaOrigenId };
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
