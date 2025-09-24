"use strict";
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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MovimientoController = void 0;
const movimientosModel_1 = require("../../models/Movimientos/movimientosModel");
const movimiento_controller_logger_1 = require("./movimiento.controller.logger");
const RondaModel_1 = require("../../models/Movimientos/Ronda/RondaModel");
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
function buildMetaTag(opts) {
    const parts = [];
    if (opts.viaDestinoId)
        parts.push(`DESTINO:${Number(opts.viaDestinoId)}`);
    if (opts.numeroSeccion != null)
        parts.push(`SECCION:${Number(opts.numeroSeccion)}`);
    if (opts.liberarOrigen)
        parts.push('LIBERAR');
    return parts.length ? `[META ${parts.join('|')}] ` : '';
}
/**
 * Extrae la intención operativa desde `instrucciones` si existe.
 * Retorna { destinoId?, seccion?, liberar:boolean }.
 */
function parseMetaFromInstrucciones(instr) {
    const meta = { destinoId: undefined, seccion: undefined, liberar: false };
    if (!instr)
        return meta;
    const m = instr.match(/\[META ([^\]]+)\]/i);
    if (!m)
        return meta;
    const tokens = m[1].split('|').map(s => s.trim().toUpperCase());
    for (const t of tokens) {
        if (t === 'LIBERAR')
            meta.liberar = true;
        if (t.startsWith('DESTINO:')) {
            const v = Number(t.split(':')[1]);
            if (!Number.isNaN(v))
                meta.destinoId = v;
        }
        if (t.startsWith('SECCION:')) {
            const s = Number(t.split(':')[1]);
            if (!Number.isNaN(s))
                meta.seccion = s;
        }
    }
    return meta;
}
class MovimientoController {
}
exports.MovimientoController = MovimientoController;
_a = MovimientoController;
/**
 * GET /movimientos
 *
 * @summary Lista todos los movimientos.
 * @auth Requiere JWT.
 * @returns 200 [Movimiento] | 500
 */
MovimientoController.obtenerMovimientos = async (_req, res) => {
    try {
        const movimientos = await movimientosModel_1.MovimientoModel.obtenerMovimientos();
        res.status(200).json(movimientos);
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al obtener movimientos', { error });
        res.status(500).json({ message: 'Error al obtener movimientos' });
    }
};
/**
 * GET /movimientos/servicios/pendientes/localidad/:localidadId
 *
 * @summary Servicios (lavado/torno) pendientes por localidad. Sin payload.
 * @returns 200 [Servicio] | 400 | 500
 */
MovimientoController.obtenerServiciosPendientesPorLocalidad = async (req, res) => {
    const localidadId = Number(req.params.localidadId);
    if (!Number.isInteger(localidadId))
        return res.status(400).json({ message: 'ID de localidad inválido' });
    try {
        const lista = await movimientosModel_1.MovimientoModel.obtenerServiciosPendientes({ localidadId });
        res.status(200).json(lista);
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al obtener servicios pendientes por localidad', { error, localidadId });
        res.status(500).json({ message: 'Error al obtener servicios pendientes por localidad' });
    }
};
/**
 * POST /movimientos/:id/iniciar-servicio
 *
 * @summary Inicia el servicio (reubica en R1 y pone EN_PROCESO si aplica). Sin payload.
 * @returns 200 { message, movimiento } | 400 | 404 | 500
 */
MovimientoController.iniciarServicio = async (req, res) => {
    const id = Number(req.params.id);
    const tipo = req.query.tipo; // opcional: ?tipo=LAVADO|TORNO
    if (!Number.isInteger(id))
        return res.status(400).json({ message: 'ID inválido' });
    try {
        await RondaModel_1.RondaModel.iniciarServicio(id, tipo); // ← ahora solo encola al frente
        const todos = await movimientosModel_1.MovimientoModel.obtenerMovimientos();
        const mov = todos.find((m) => m.id === id);
        if (!mov)
            return res.status(404).json({ message: 'Movimiento no encontrado tras encolar' });
        res.status(200).json({ message: 'Servicio encolado al frente de BAJAS (ALTAS intactas)', movimiento: mov });
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al encolar servicio al frente', { error, id, tipo });
        res.status(500).json({ message: error?.message || 'Error al encolar servicio' });
    }
};
// MovimientoController.ts
MovimientoController.obtenerServiciosNoEncolados = async (req, res) => {
    const localidadId = Number(req.query.localidadId);
    if (!Number.isInteger(localidadId)) {
        return res.status(400).json({ message: 'localidadId inválido' });
    }
    try {
        // Ajusta este método del modelo según tu esquema:
        const servicios = await movimientosModel_1.MovimientoModel.obtenerServiciosNoEncolados({ localidadId });
        movimiento_controller_logger_1.movimientoControllerLogger.info('GET /movimientos/servicios/no-encolados OK', {
            localidadId, count: Array.isArray(servicios) ? servicios.length : 0
        });
        if (!servicios?.length) {
            movimiento_controller_logger_1.movimientoControllerLogger.warn('NO-ENCOLADOS vacío', { localidadId });
        }
        return res.status(200).json(servicios ?? []);
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error NO-ENCOLADOS', { error, localidadId });
        return res.status(500).json({ message: error?.message || 'Error al obtener no-encolados' });
    }
};
// MovimientoController.ts (fragmento)
MovimientoController.encolarMovimiento = async (req, res) => {
    const id = Number(req.params.id);
    const { prioridad } = req.body;
    if (!Number.isInteger(id))
        return res.status(400).json({ message: 'ID inválido' });
    if (prioridad && !['ALTA', 'BAJA'].includes(prioridad)) {
        return res.status(400).json({ message: 'prioridad inválida (ALTA|BAJA)' });
    }
    try {
        const movimiento = await movimientosModel_1.MovimientoModel.encolarMovimiento(id, { prioridad });
        return res.status(200).json({ message: 'Movimiento encolado', movimiento });
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al encolar movimiento', { error, id, prioridad });
        return res.status(500).json({ message: error?.message || 'Error al encolar movimiento' });
    }
};
// MovimientoController.ts
MovimientoController.encolarServicioAlFrenteR1 = async (req, res) => {
    const id = Number(req.params.id);
    const tipo = req.query.tipo;
    if (!Number.isInteger(id))
        return res.status(400).json({ message: 'ID inválido' });
    try {
        // ✅ esto marca lavado/torno si faltan + asegura R1 detrás de ALTAS + reordena BAJAS
        await RondaModel_1.RondaModel.encolarServicioPrimero(id, tipo);
        // devolvemos el movimiento (para front) y el "siguiente" sugerido
        const todos = await movimientosModel_1.MovimientoModel.obtenerMovimientos();
        const mov = todos.find((m) => m.id === id);
        if (!mov)
            return res.status(404).json({ message: 'Movimiento no encontrado tras encolar' });
        const next = await RondaModel_1.RondaModel.siguienteInteligente(mov.localidadId);
        return res.status(200).json({
            message: 'Servicio encolado en R1 (después de ALTAS). Rondas reacomodadas.',
            movimiento: mov,
            siguienteInteligente: next,
        });
    }
    catch (e) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al encolar servicio al frente', { error: e, id, tipo });
        return res.status(500).json({ message: e?.message || 'Error al encolar servicio' });
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
MovimientoController.obtenerServiciosPendientes = async (req, res) => {
    const { localidadId, empresaId } = req.query;
    if ((localidadId !== undefined && Number.isNaN(Number(localidadId))) ||
        (empresaId !== undefined && Number.isNaN(Number(empresaId)))) {
        return res.status(400).json({ message: 'Parámetros inválidos (localidadId/empresaId deben ser numéricos)' });
    }
    try {
        const lista = await movimientosModel_1.MovimientoModel.obtenerServiciosPendientes({
            localidadId: localidadId !== undefined ? Number(localidadId) : undefined,
            empresaId: empresaId !== undefined ? Number(empresaId) : undefined,
        });
        res.status(200).json(lista);
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al obtener servicios pendientes', { error, localidadId, empresaId });
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
MovimientoController.actualizarEstadoServicio = async (req, res) => {
    const id = Number(req.params.id);
    const { estado, operadorId, razon } = req.body;
    const validos = ['SOLICITADO', 'EN_PROCESO', 'DETENIDO', 'CANCELADO'];
    if (!Number.isInteger(id))
        return res.status(400).json({ message: 'ID inválido' });
    if (!validos.includes(estado)) {
        return res.status(400).json({ message: `Estado inválido. Debe ser uno de: ${validos.join(' | ')}` });
    }
    if (operadorId !== undefined && typeof operadorId !== 'number') {
        return res.status(400).json({ message: 'operadorId debe ser numérico si se envía' });
    }
    try {
        const mov = await movimientosModel_1.MovimientoModel.actualizarEstadoServicio(id, estado, { operadorId, razon });
        res.status(200).json({ message: 'Estado de servicio actualizado', movimiento: mov });
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al actualizar estado de servicio', { error, id, estado });
        res.status(500).json({ message: error?.message || 'Error al actualizar estado de servicio' });
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
MovimientoController.obtenerMovimientoPorId = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id))
        return res.status(400).json({ message: 'ID inválido' });
    try {
        const todos = await movimientosModel_1.MovimientoModel.obtenerMovimientos();
        const mov = todos.find((m) => m.id === id);
        if (!mov)
            return res.status(404).json({ message: 'Movimiento no encontrado' });
        const meta = parseMetaFromInstrucciones(mov.instrucciones ?? undefined);
        res.status(200).json({ ...mov, meta });
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al obtener movimiento por id', { error, id });
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
 *   viaOrigenId:number, locomotiveNumber:string|number,
 *   viaDestinoId?:number, numeroSeccion?:number, prioridad?:'ALTA'|'BAJA',
 *   ...otros campos del modelo
 * }
 * @defaults prioridad='BAJA', estado='SOLICITADO',
 *   posicionCabina/posicionChimenea/direccionEmpuje='Sin_Solicitar'
 * @returns 201 { message, meta:{destinoSolicitado,seccionSolicitada,liberarOrigen}, movimiento } | 400 | 500
 */
MovimientoController.nuevoMovimiento = async (req, res) => {
    try {
        const raw = { ...req.body };
        // Defaults
        raw.prioridad ?? (raw.prioridad = 'BAJA');
        raw.estado ?? (raw.estado = 'SOLICITADO');
        raw.posicionCabina ?? (raw.posicionCabina = 'Sin_Solicitar');
        raw.posicionChimenea ?? (raw.posicionChimenea = 'Sin_Solicitar');
        raw.direccionEmpuje ?? (raw.direccionEmpuje = 'Sin_Solicitar');
        // Helpers locales
        const toInt = (v) => {
            if (v === '' || v === null || v === undefined)
                return undefined;
            const n = Number(v);
            return Number.isFinite(n) ? n : undefined;
        };
        const toBool = (v) => v === true || v === 'true' || v === 1 || v === '1';
        const normalizeLocomotiveNumber = (v) => {
            if (v === '' || v === null || v === undefined)
                return undefined;
            const s = String(v).trim();
            if (!/^\d{1,4}$/.test(s))
                return undefined;
            return s.padStart(4, '0'); // "1" -> "0001"
        };
        // Coerción
        const empresaId = toInt(raw.empresaId);
        const creadoPorId = toInt(raw.creadoPorId);
        const localidadId = toInt(raw.localidadId);
        const locomotiveNumber = normalizeLocomotiveNumber(raw.locomotiveNumber);
        const viaOrigenId = toInt(raw.viaOrigenId);
        const viaDestinoId = toInt(raw.viaDestinoId);
        const numeroSeccion = toInt(raw.numeroSeccion);
        const lavado = toBool(raw.lavado);
        const torno = toBool(raw.torno);
        // Validaciones
        if (!empresaId || !creadoPorId || !localidadId) {
            return res.status(400).json({ message: 'Faltan campos obligatorios: empresaId/creadoPorId/localidadId.' });
        }
        if (!locomotiveNumber) {
            return res.status(400).json({ message: 'locomotiveNumber inválido. Use 1–4 dígitos, ej. 0001.' });
        }
        if (raw.prioridad && !['ALTA', 'BAJA'].includes(raw.prioridad)) {
            return res.status(400).json({ message: 'prioridad inválida (ALTA|BAJA).' });
        }
        if (raw.estado && !['SOLICITADO', 'EN_PROCESO', 'CONCLUIDO', 'DETENIDO'].includes(raw.estado)) {
            return res.status(400).json({ message: 'estado inválido.' });
        }
        if (raw.numeroSeccion != null && numeroSeccion === undefined) {
            return res.status(400).json({ message: 'numeroSeccion debe ser numérico.' });
        }
        if (viaOrigenId !== undefined && viaDestinoId !== undefined && viaOrigenId === viaDestinoId) {
            return res.status(400).json({ message: 'viaOrigenId y viaDestinoId no pueden ser iguales.' });
        }
        const ambasVias = viaOrigenId !== undefined && viaDestinoId !== undefined;
        // Normalización
        raw.empresaId = empresaId;
        raw.creadoPorId = creadoPorId;
        raw.localidadId = localidadId;
        raw.locomotiveNumber = locomotiveNumber; // string "0001"
        raw.viaOrigenId = viaOrigenId;
        raw.viaDestinoId = viaDestinoId;
        raw.lavado = lavado;
        raw.torno = torno;
        // META
        const liberarOrigenFlag = raw.liberarOrigen === true || /(^|\W)liberar(\W|$)/i.test(String(raw.instrucciones ?? ''));
        const meta = buildMetaTag({
            viaOrigenId,
            viaDestinoId,
            numeroSeccion,
            moverEntreVias: ambasVias,
            liberarOrigen: liberarOrigenFlag,
        });
        const data = {
            ...raw,
            instrucciones: `${meta}${raw.instrucciones ?? ''}`.trim(),
        };
        delete data.numeroSeccion;
        // Crear
        const movimiento = await movimientosModel_1.MovimientoModel.nuevoMovimiento(data);
        return res.status(201).json({
            message: 'Movimiento creado. (Ocupación/liberación de vías/secciones se aplicará al concluir).',
            meta: {
                origenSolicitado: viaOrigenId ?? null,
                destinoSolicitado: viaDestinoId ?? null,
                seccionSolicitada: numeroSeccion ?? null,
                moverEntreVias: ambasVias,
                liberarOrigen: liberarOrigenFlag,
            },
            movimiento,
        });
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al crear movimiento', { error, body: req.body });
        return res.status(500).json({ message: 'Error al crear movimiento', details: error?.message });
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
MovimientoController.cambiarPrioridad = async (req, res) => {
    const id = Number(req.params.id);
    const { prioridad } = req.body;
    if (!Number.isInteger(id))
        return res.status(400).json({ message: 'ID de movimiento inválido' });
    if (!['ALTA', 'BAJA'].includes(prioridad)) {
        return res.status(400).json({ message: 'Valor de prioridad inválido. Debe ser "ALTA" o "BAJA"' });
    }
    try {
        const movimientos = await movimientosModel_1.MovimientoModel.obtenerMovimientos();
        const original = movimientos.find((m) => m.id === id);
        if (!original)
            return res.status(404).json({ message: 'Movimiento no encontrado' });
        if (original.prioridad === prioridad) {
            return res.status(200).json({ message: `El movimiento ya tiene prioridad ${prioridad}`, movimiento: original });
        }
        if (prioridad === 'ALTA') {
            movimiento_controller_logger_1.movimientoControllerLogger.info('Cambiando movimiento a ALTA prioridad', {
                id,
                estadoOriginal: original.estado,
                localidadId: original.localidadId,
            });
        }
        const movimiento = await movimientosModel_1.MovimientoModel.cambiarPrioridad(id, prioridad);
        const message = prioridad === 'ALTA' && original.estado === 'SOLICITADO'
            ? 'Prioridad actualizada a ALTA. Se reorganizaron las rondas.'
            : `Prioridad actualizada a ${prioridad}`;
        res.status(200).json({ message, movimiento, prioridadAnterior: original.prioridad, prioridadNueva: prioridad });
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al cambiar prioridad del movimiento', { error, id, prioridad });
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
MovimientoController.eliminarMovimiento = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id))
        return res.status(400).json({ message: 'ID inválido' });
    try {
        await movimientosModel_1.MovimientoModel.eliminarMovimiento(id);
        res.sendStatus(204);
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al eliminar movimiento', { error, id });
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
MovimientoController.obtenerMovimientosPendientes = async (_req, res) => {
    try {
        const pendientes = await movimientosModel_1.MovimientoModel.obtenerMovimientosPendientes();
        res.status(200).json(pendientes);
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al obtener movimientos pendientes', { error });
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
MovimientoController.obtenerMovimientosPendientesPorEmpresa = async (req, res) => {
    const empresaId = Number(req.params.empresaId);
    if (!Number.isInteger(empresaId))
        return res.status(400).json({ message: 'ID de empresa inválido' });
    try {
        const pendientes = await movimientosModel_1.MovimientoModel.obtenerMovimientosPendientesPorEmpresa(empresaId);
        res.status(200).json(pendientes);
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al obtener movimientos pendientes por empresa', { error, empresaId });
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
MovimientoController.obtenerTodosLosMovimientos = async (_req, res) => {
    try {
        const movimientos = await movimientosModel_1.MovimientoModel.obtenerTodosLosMovimientos();
        res.status(200).json(movimientos);
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al obtener todos los movimientos', { error });
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
MovimientoController.obtenerMovimientosPorEmpresa = async (req, res) => {
    const empresaId = Number(req.params.empresaId);
    if (!Number.isInteger(empresaId))
        return res.status(400).json({ message: 'ID de empresa inválido' });
    try {
        const movimientos = await movimientosModel_1.MovimientoModel.obtenerMovimientosPorEmpresa(empresaId);
        res.status(200).json(movimientos);
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al obtener movimientos por empresa', { error, empresaId });
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
MovimientoController.obtenerMovimientosPendientesPorLocalidad = async (req, res) => {
    const localidadId = Number(req.params.localidadId);
    if (!Number.isInteger(localidadId))
        return res.status(400).json({ message: 'ID de localidad inválido' });
    try {
        const movimientos = await movimientosModel_1.MovimientoModel.obtenerMovimientosPendientesPorLocalidad(localidadId);
        res.status(200).json(movimientos);
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al obtener movimientos pendientes por localidad', { error, localidadId });
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
MovimientoController.obtenerTodosMovimientosPorLocalidad = async (req, res) => {
    const localidadId = Number(req.params.localidadId);
    if (!Number.isInteger(localidadId))
        return res.status(400).json({ message: 'ID de localidad inválido' });
    try {
        const movimientos = await movimientosModel_1.MovimientoModel.obtenerTodosMovimientosPorLocalidad(localidadId);
        res.status(200).json(movimientos);
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al obtener todos los movimientos por localidad', { error, localidadId });
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
MovimientoController.obtenerMovimientosPorLocalidadEmpresa = async (req, res) => {
    const localidadId = Number(req.params.localidadId);
    const empresaId = Number(req.params.empresaId);
    if (!Number.isInteger(localidadId) || !Number.isInteger(empresaId)) {
        return res.status(400).json({ message: 'ID de localidad o empresa inválido' });
    }
    try {
        const movimientos = await movimientosModel_1.MovimientoModel.obtenerMovimientosPorLocalidadEmpresa(localidadId, empresaId);
        res.status(200).json(movimientos);
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al obtener movimientos por localidad y empresa', { error, localidadId, empresaId });
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
MovimientoController.obtenerMovimientosPorEmpresaYLocalidad = async (req, res) => {
    const empresaId = Number(req.params.empresaId);
    const localidadId = Number(req.params.localidadId);
    if (!Number.isInteger(empresaId) || !Number.isInteger(localidadId)) {
        return res.status(400).json({ message: 'ID de empresa o localidad inválido' });
    }
    try {
        const movimientos = await movimientosModel_1.MovimientoModel.obtenerMovimientosPorEmpresaYLocalidad(empresaId, localidadId);
        res.status(200).json(movimientos);
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al obtener movimientos por empresa y localidad', { error, empresaId, localidadId });
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
MovimientoController.obtenerMovimientosNoConcluidosPorEmpresaYLocalidad = async (req, res) => {
    const empresaId = Number(req.params.empresaId);
    const localidadId = Number(req.params.localidadId);
    if (!Number.isInteger(empresaId) || !Number.isInteger(localidadId)) {
        return res.status(400).json({ message: 'ID de empresa o localidad inválido' });
    }
    try {
        const pendientes = await movimientosModel_1.MovimientoModel.obtenerMovimientosNoConcluidosPorEmpresaYLocalidad(empresaId, localidadId);
        res.status(200).json(pendientes);
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al obtener movimientos no concluidos por empresa y localidad', { error, empresaId, localidadId });
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
MovimientoController.obtenerInfoPorRonda = async (req, res) => {
    const rondaId = Number(req.params.rondaId);
    if (!Number.isInteger(rondaId))
        return res.status(400).json({ message: 'ID de ronda inválido' });
    try {
        const info = await movimientosModel_1.MovimientoModel.obtenerInfoPorRonda(rondaId);
        // Intentamos enriquecer con META a partir del movimiento original
        let meta;
        try {
            const todos = await movimientosModel_1.MovimientoModel.obtenerMovimientos();
            const mov = todos.find((m) => m.id === info?.movimiento?.id);
            if (mov)
                meta = parseMetaFromInstrucciones(mov.instrucciones ?? undefined);
        }
        catch { /* noop */ }
        res.status(200).json(meta ? { ...info, meta } : info);
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al obtener info de ronda', { error, rondaId });
        res.status(500).json({ message: 'Error al obtener info de ronda' });
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
MovimientoController.iniciarMovimiento = async (req, res) => {
    const id = Number(req.params.id);
    const { operadorId } = req.body;
    if (!Number.isInteger(id) || typeof operadorId !== 'number') {
        return res.status(400).json({ message: 'Datos inválidos: id o operadorId faltante o incorrecto' });
    }
    try {
        const movimiento = await movimientosModel_1.MovimientoModel.iniciarMovimiento(id, operadorId);
        res.status(200).json({ message: 'Movimiento iniciado', movimiento });
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al iniciar movimiento', { id, operadorId, error });
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
MovimientoController.pausarMovimiento = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id))
        return res.status(400).json({ message: 'ID inválido' });
    try {
        const movimiento = await movimientosModel_1.MovimientoModel.pausarMovimiento(id);
        res.status(200).json({ message: 'Movimiento pausado', movimiento });
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al pausar movimiento', { id, error });
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
MovimientoController.reanudarMovimiento = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id))
        return res.status(400).json({ message: 'ID inválido' });
    try {
        const movimiento = await movimientosModel_1.MovimientoModel.reanudarMovimiento(id);
        res.status(200).json({ message: 'Movimiento reanudado', movimiento });
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al reanudar movimiento', { id, error });
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
MovimientoController.finalizarMovimiento = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id))
        return res.status(400).json({ message: 'ID inválido' });
    try {
        // Obtenemos el movimiento actual para leer origen+meta antes de finalizar
        const todos = await movimientosModel_1.MovimientoModel.obtenerMovimientos();
        const original = todos.find((m) => m.id === id);
        if (!original)
            return res.status(404).json({ message: 'Movimiento no encontrado' });
        const meta = parseMetaFromInstrucciones(original.instrucciones ?? undefined);
        const movimiento = await movimientosModel_1.MovimientoModel.finalizarMovimiento(id);
        // Acciones SUGERIDAS para que otro servicio (no este controller) ejecute
        const accionesSugeridas = {};
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
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al finalizar movimiento', { id, error });
        res.status(500).json({ message: 'Error al finalizar movimiento' });
    }
};
