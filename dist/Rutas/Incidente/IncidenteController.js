"use strict";
/**
 * IncidenteController.ts
 *
 * Controlador HTTP para la gestion de entidades Incidente.
 *
 * Este modulo define los endpoints REST disponibles para interactuar con los recursos Incidente.
 * Utiliza IncidenteModel como capa de acceso a datos y maneja la logica de negocio especifica
 * para incidentes, incluyendo la gestion de imagenes y reorganizacion de rondas.
 *
 * Funciones implementadas:
 * - Listar incidentes con filtros
 * - Crear un nuevo incidente con imagenes
 * - Editar un incidente existente
 * - Eliminar un incidente
 * - Cerrar incidente (manual y automatico)
 * - Verificar periodo de verificacion
 * - Servir imagenes de incidentes
 *
 * Cada operacion realiza validaciones de entrada, manejo de archivos multimedia
 * y los errores se registran mediante un logger dedicado.
 *
 * Dependencias:
 * - express: manejo de solicitudes/respuestas HTTP
 * - multer: manejo de uploads de archivos
 * - IncidenteModel: capa de datos para operaciones CRUD
 * - incidenteControllerLogger: logger especializado en errores del controlador
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidenteController = exports.uploadImagenes = void 0;
const multer_1 = __importDefault(require("multer"));
const promises_1 = __importDefault(require("fs/promises"));
const client_1 = require("@prisma/client");
const IncidenteModel_1 = require("../../models/Incidente/IncidenteModel");
const incidente_controller_logger_1 = require("./incidente.controller.logger");
const NotificadorFCM_1 = require("../../services/NotificadorFCM");
const prisma = new client_1.PrismaClient();
// Configuracion de Multer para manejo de imagenes
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB por archivo
        files: 4 // Maximo 4 archivos
    },
    fileFilter: (req, file, cb) => {
        // Validar tipos de archivo permitidos
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Tipo de archivo no permitido. Solo se permiten: JPEG, JPG, PNG, WEBP'));
        }
    }
});
/**
 * Middleware para manejo de uploads de imagenes
 */
exports.uploadImagenes = upload.array('imagenes', 4);
/**
 * Controlador REST para entidades Incidente.
 * Define los endpoints relacionados con el recurso.
 */
class IncidenteController {
    /**
     * Reabre el movimiento asociado a un incidente cerrado con motivo RESUELTO.
     *
     * @private
     * @param incidente - Incidente recién cerrado
     */
    static async reabrirMovimientoTrasCierre(incidente) {
        try {
            await prisma.movimiento.update({
                where: { id: incidente.movimientoId },
                data: {
                    estado: 'EN_PROCESO',
                    fechaPausa: null,
                    incidenteGlobal: false
                }
            });
            console.info('Movimiento reabierto tras cierre RESUELTO', {
                incidenteId: incidente.id,
                movimientoId: incidente.movimientoId
            });
        }
        catch (err) {
            console.error('Error al reabrir movimiento tras cierre', {
                incidenteId: incidente.id,
                movimientoId: incidente.movimientoId,
                error: err
            });
            // No interrumpimos el flujo principal
        }
    }
    static async obtenerIncidentePorId(req, res) {
        try {
            const id = Number(req.params.id);
            if (Number.isNaN(id)) {
                res.status(400).json({ success: false, error: 'ID de incidente inv�lido' });
                return;
            }
            // Obtenemos solo rutas relativas del modelo
            const incidenteRaw = await IncidenteModel_1.IncidenteModel.obtenerIncidentePorId(id);
            // Construimos el host din�micamente
            const host = `${req.protocol}://${req.get('host')}`;
            // Mapeamos cada ruta relativa a su URL p�blica
            const imagenesConUrl = incidenteRaw.imagenes.map((rutaRel) => `${host}/incidentes/imagen/${encodeURIComponent(rutaRel)}`);
            res.json({
                success: true,
                data: {
                    ...incidenteRaw,
                    imagenes: imagenesConUrl
                }
            });
        }
        catch (error) {
            const status = error.message.includes('No existe incidente') ? 404 : 500;
            res.status(status).json({
                success: false,
                error: error.message.startsWith('No existe incidente')
                    ? error.message
                    : 'Error al obtener incidente',
                details: error.message
            });
        }
    }
}
exports.IncidenteController = IncidenteController;
_a = IncidenteController;
/**
 * GET /incidentes
 *
 * Devuelve todos los incidentes con sus relaciones.
 * Permite filtrado por estado mediante query parameter.
 */
IncidenteController.obtenerIncidentes = async (req, res) => {
    try {
        const { estado } = req.query;
        let incidentes;
        if (estado && (estado === 'ABIERTO' || estado === 'CERRADO')) {
            incidentes = await IncidenteModel_1.IncidenteModel.obtenerIncidentesPorEstado(estado);
        }
        else {
            incidentes = await IncidenteModel_1.IncidenteModel.obtenerIncidentes();
        }
        res.json({
            success: true,
            data: incidentes,
            total: incidentes.length
        });
    }
    catch (error) {
        incidente_controller_logger_1.incidenteControllerLogger.error('Error al obtener incidentes', { error, query: req.query });
        res.status(500).json({
            success: false,
            error: 'Error al obtener incidentes',
            details: error
        });
    }
};
/**
 * GET /incidentes/movimiento/:movimientoId
 *
 * Devuelve todos los incidentes de un movimiento especifico.
 */
IncidenteController.obtenerIncidentesPorMovimiento = async (req, res) => {
    try {
        const movimientoId = parseInt(req.params.movimientoId);
        if (isNaN(movimientoId)) {
            res.status(400).json({
                success: false,
                error: 'ID de movimiento invalido'
            });
            return;
        }
        const incidentes = await IncidenteModel_1.IncidenteModel.obtenerIncidentesPorMovimiento(movimientoId);
        res.json({
            success: true,
            data: incidentes,
            movimientoId,
            total: incidentes.length
        });
    }
    catch (error) {
        incidente_controller_logger_1.incidenteControllerLogger.error('Error al obtener incidentes por movimiento', {
            movimientoId: req.params.movimientoId,
            error
        });
        res.status(500).json({
            success: false,
            error: 'Error al obtener incidentes por movimiento',
            details: error
        });
    }
};
/**
 * POST /incidentes
 *
 * Crea un nuevo incidente (con imágenes opcionales), reorganiza rondas
 * y envía la notificación FCM.
 */
IncidenteController.crearIncidente = async (req, res) => {
    try {
        const { descripcion, movimientoId, usuarioId } = req.body;
        // Validaciones básicas
        if (!descripcion || !movimientoId || !usuarioId) {
            res.status(400).json({
                success: false,
                error: 'descripcion, movimientoId y usuarioId son obligatorios'
            });
            return;
        }
        if (typeof descripcion !== 'string' || !descripcion.trim()) {
            res.status(400).json({
                success: false,
                error: 'La descripcion debe ser un texto válido'
            });
            return;
        }
        const movimientoIdNum = Number(movimientoId);
        const usuarioIdNum = Number(usuarioId);
        if (Number.isNaN(movimientoIdNum) || Number.isNaN(usuarioIdNum)) {
            res.status(400).json({
                success: false,
                error: 'Los IDs deben ser números válidos'
            });
            return;
        }
        // Procesar imágenes (máx. 4)
        const archivos = Array.isArray(req.files)
            ? req.files
            : Object.values(req.files).flat();
        const imagenes = archivos.map(f => f.buffer);
        // Crear incidente en BD
        const nuevoIncidente = await IncidenteModel_1.IncidenteModel.crearIncidente({
            descripcion: descripcion.trim(),
            movimientoId: movimientoIdNum,
            usuarioId: usuarioIdNum,
            imagenes: imagenes.length ? imagenes : undefined
        });
        incidente_controller_logger_1.incidenteControllerLogger.info('Incidente creado', {
            incidenteId: nuevoIncidente.id,
            movimientoId: movimientoIdNum,
            usuarioId: usuarioIdNum,
            imagenesSubidas: imagenes.length
        });
        // Notificar vía FCM
        await NotificadorFCM_1.NotificadorFCM.notificarNuevoIncidente(nuevoIncidente);
        // Respuesta
        res.status(201).json({
            success: true,
            message: 'Incidente creado exitosamente',
            data: nuevoIncidente
        });
    }
    catch (error) {
        incidente_controller_logger_1.incidenteControllerLogger.error('Error al crear incidente', {
            body: req.body,
            error
        });
        res.status(500).json({
            success: false,
            error: 'Error al crear incidente',
            details: error
        });
    }
};
/**
* PUT /incidentes/:id
*
* Actualiza un incidente existente.
* Permite cambiar estado, descripcion y agregar nuevas imagenes.
*/
IncidenteController.editarIncidente = async (req, res) => {
    // 1) Validar ID
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
        res.status(400).json({ success: false, error: 'ID de incidente inválido' });
        return;
    }
    // 2) Validar inputs
    const { descripcion, estado } = req.body;
    if (estado && !['ABIERTO', 'CERRADO'].includes(estado)) {
        res.status(400).json({ success: false, error: 'Estado inválido. Debe ser ABIERTO o CERRADO' });
        return;
    }
    // 3) Procesar nuevas imágenes
    const nuevasImagenes = [];
    if (req.files) {
        const archivos = Array.isArray(req.files)
            ? req.files
            : Object.values(req.files).flat();
        for (const file of archivos) {
            nuevasImagenes.push(file.buffer);
        }
    }
    try {
        // 4) Construir payload para el modelo
        const payload = {};
        if (descripcion !== undefined) {
            payload.descripcion = String(descripcion).trim();
        }
        if (estado !== undefined) {
            payload.estado = estado;
        }
        if (nuevasImagenes.length > 0) {
            payload.imagenes = nuevasImagenes;
        }
        // 5) Llamar al modelo
        const incidenteActualizado = await IncidenteModel_1.IncidenteModel.editarIncidente(id, payload);
        incidente_controller_logger_1.incidenteControllerLogger.info('Incidente actualizado exitosamente', {
            incidenteId: id,
            cambios: Object.keys(payload),
            nuevasImagenes: nuevasImagenes.length
        });
        // 6) Responder
        res.json({
            success: true,
            message: 'Incidente actualizado exitosamente',
            data: incidenteActualizado
        });
    }
    catch (error) {
        incidente_controller_logger_1.incidenteControllerLogger.error('Error al editar incidente', { id, error });
        res.status(500).json({
            success: false,
            error: 'Error al editar incidente',
            details: error
        });
    }
};
/**
 * DELETE /incidentes/:id
 *
 * Elimina un incidente y sus im�genes.
 */
IncidenteController.eliminarIncidente = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            res.status(400).json({ success: false, error: 'ID de incidente inv�lido' });
            return;
        }
        // 1. Borrar de BD
        const incidenteEliminado = await IncidenteModel_1.IncidenteModel.eliminarIncidente(id);
        incidente_controller_logger_1.incidenteControllerLogger.info('Incidente eliminado exitosamente', {
            incidenteId: id,
            movimientoId: incidenteEliminado.movimientoId ?? 'N/A' // ? usa la FK simple
        });
        // 3. Respuesta
        res.json({
            success: true,
            message: 'Incidente eliminado exitosamente',
            data: incidenteEliminado
        });
    }
    catch (error) {
        incidente_controller_logger_1.incidenteControllerLogger.error('Error al eliminar incidente', {
            id: req.params.id,
            error
        });
        res.status(500).json({
            success: false,
            error: 'Error al eliminar incidente',
            details: error
        });
    }
};
/**
* GET /incidentes/:id/verificacion
*
* Verifica el estado del periodo de verificaci�n de un incidente.
*/
IncidenteController.verificarPeriodoVerificacion = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            res.status(400).json({ success: false, error: 'ID de incidente inv�lido' });
            return;
        }
        const verificacion = await IncidenteModel_1.IncidenteModel.verificarPeriodoVerificacion(id);
        res.json({
            success: true,
            data: verificacion
        }); // ? cierre correcto
    }
    catch (error) {
        incidente_controller_logger_1.incidenteControllerLogger.error('Error al verificar periodo de verificaci�n', {
            id: req.params.id,
            error
        });
        res.status(500).json({
            success: false,
            error: 'Error al verificar periodo de verificaci�n',
            details: error
        });
    }
};
/**
 * POST /incidentes/:id/cerrar
 *
 * Cierra un incidente según el motivo ('RESUELTO' | 'NO_RESUELTO' | 'TIMEOUT'),
 * reabre el movimiento si fue resuelto y/o reorganiza rondas.
 */
IncidenteController.cerrarIncidenteGenerico = async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
        res.status(400).json({ success: false, error: 'ID de incidente inválido' });
        return;
    }
    // extraemos motivo o usamos TIMEOUT por defecto
    const raw = req.body?.motivo;
    const motivo = ['RESUELTO', 'NO_RESUELTO', 'TIMEOUT'].includes(raw)
        ? raw
        : 'TIMEOUT';
    try {
        const incidente = await IncidenteModel_1.IncidenteModel.cerrarIncidenteGenerico(id, motivo);
        res.json({ success: true, data: incidente });
        return;
    }
    catch (error) {
        incidente_controller_logger_1.incidenteControllerLogger.error('Error al cerrar incidente genérico', {
            id,
            motivo,
            error,
        });
        const status = error.message.includes('ya está cerrado') || error.message.includes('No existe')
            ? 400
            : 500;
        res.status(status).json({
            success: false,
            error: error.message,
        });
        return;
    }
};
/**
 * GET /incidentes/estadisticas
 *
 * Devuelve estadisticas generales de incidentes.
 */
IncidenteController.obtenerEstadisticas = async (req, res) => {
    try {
        const [incidentesAbiertos, incidentesCerrados, todosList] = await Promise.all([
            IncidenteModel_1.IncidenteModel.obtenerIncidentesPorEstado('ABIERTO'),
            IncidenteModel_1.IncidenteModel.obtenerIncidentesPorEstado('CERRADO'),
            IncidenteModel_1.IncidenteModel.obtenerIncidentes()
        ]);
        // Calcular estadisticas adicionales
        const ahora = new Date();
        const hace24h = new Date(ahora.getTime() - 24 * 60 * 60 * 1000);
        const hace7d = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
        const incidentesRecientes = todosList.filter((i) => i.fechaInicio >= hace24h);
        const incidentesSemana = todosList.filter((i) => i.fechaInicio >= hace7d);
        const estadisticas = {
            totales: {
                total: todosList.length,
                abiertos: incidentesAbiertos.length,
                cerrados: incidentesCerrados.length
            },
            recientes: {
                ultimas24h: incidentesRecientes.length,
                ultimaSemana: incidentesSemana.length
            },
            porcentajes: {
                abiertos: todosList.length > 0 ? ((incidentesAbiertos.length / todosList.length) * 100).toFixed(2) : 0,
                cerrados: todosList.length > 0 ? ((incidentesCerrados.length / todosList.length) * 100).toFixed(2) : 0
            }
        };
        res.json({
            success: true,
            data: estadisticas
        });
    }
    catch (error) {
        incidente_controller_logger_1.incidenteControllerLogger.error('Error al obtener estadisticas', { error });
        res.status(500).json({
            success: false,
            error: 'Error al obtener estadisticas',
            details: error
        });
    }
};
/**
 * GET /incidentes/paginado?page=1&pageSize=20
 *
 * Devuelve todos los incidentes paginados (m�s nuevos primero).
 */
IncidenteController.obtenerIncidentesPaginados = async (req, res) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const pageSize = Math.max(1, Number(req.query.pageSize) || 20);
        const result = await IncidenteModel_1.IncidenteModel.obtenerIncidentesPaginados(page, pageSize);
        res.json({
            success: true,
            data: result.data,
            meta: result.meta
        });
    }
    catch (error) {
        incidente_controller_logger_1.incidenteControllerLogger.error('Error al obtener incidentes paginados', {
            error,
            query: req.query
        });
        res.status(500).json({
            success: false,
            error: 'Error al obtener incidentes paginados'
        });
    }
};
/**
 * GET /incidentes/localidad/:localidadId?page=1&pageSize=20
 *
 * Devuelve incidentes de una localidad dada, paginados.
 */
IncidenteController.obtenerIncidentesPorLocalidad = async (req, res) => {
    try {
        const localidadId = Number(req.params.localidadId);
        if (Number.isNaN(localidadId)) {
            res.status(400).json({ success: false, error: 'localidadId inv�lido' });
            return;
        }
        const page = Math.max(1, Number(req.query.page) || 1);
        const pageSize = Math.max(1, Number(req.query.pageSize) || 20);
        const result = await IncidenteModel_1.IncidenteModel.obtenerIncidentesPorLocalidad(localidadId, page, pageSize);
        res.json({
            success: true,
            data: result.data,
            meta: result.meta
        });
    }
    catch (error) {
        incidente_controller_logger_1.incidenteControllerLogger.error('Error al obtener incidentes por localidad', {
            localidadId: req.params.localidadId,
            error
        });
        res.status(500).json({
            success: false,
            error: 'Error al obtener incidentes por localidad'
        });
    }
};
/**
 * GET /incidentes/empresa/:empresaId/localidad/:localidadId?page=1&pageSize=20
 *
 * Devuelve incidentes de una empresa y localidad dada, paginados.
 */
IncidenteController.obtenerIncidentesPorEmpresaYLocalidad = async (req, res) => {
    try {
        const empresaId = Number(req.params.empresaId);
        const localidadId = Number(req.params.localidadId);
        if (Number.isNaN(empresaId) || Number.isNaN(localidadId)) {
            res.status(400).json({ success: false, error: 'IDs inv�lidos' });
            return;
        }
        const page = Math.max(1, Number(req.query.page) || 1);
        const pageSize = Math.max(1, Number(req.query.pageSize) || 20);
        const result = await IncidenteModel_1.IncidenteModel.obtenerIncidentesPorEmpresaYLocalidad(empresaId, localidadId, page, pageSize);
        res.json({
            success: true,
            data: result.data,
            meta: result.meta
        });
    }
    catch (error) {
        incidente_controller_logger_1.incidenteControllerLogger.error('Error al obtener incidentes por empresa y localidad', {
            empresaId: req.params.empresaId,
            localidadId: req.params.localidadId,
            error
        });
        res.status(500).json({
            success: false,
            error: 'Error al obtener incidentes por empresa y localidad'
        });
    }
};
/**
 * GET /incidentes/empresa/:empresaId?page=1&pageSize=20
 *
 * Devuelve incidentes de una empresa dada, paginados.
 */
IncidenteController.obtenerIncidentesPorEmpresa = async (req, res) => {
    try {
        const empresaId = Number(req.params.empresaId);
        if (Number.isNaN(empresaId)) {
            res.status(400).json({ success: false, error: 'empresaId inv�lido' });
            return;
        }
        const page = Math.max(1, Number(req.query.page) || 1);
        const pageSize = Math.max(1, Number(req.query.pageSize) || 20);
        const result = await IncidenteModel_1.IncidenteModel.obtenerIncidentesPorEmpresa(empresaId, page, pageSize);
        res.json({
            success: true,
            data: result.data,
            meta: result.meta
        });
    }
    catch (error) {
        incidente_controller_logger_1.incidenteControllerLogger.error('Error al obtener incidentes por empresa', {
            empresaId: req.params.empresaId,
            error
        });
        res.status(500).json({
            success: false,
            error: 'Error al obtener incidentes por empresa'
        });
    }
};
/** Sirve im�genes almacenadas localmente */
IncidenteController.servirImagen = async (req, res) => {
    try {
        const file = IncidenteModel_1.IncidenteModel.obtenerRutaCompletaImagen(req.params.rutaImagen);
        await promises_1.default.access(file);
        res.sendFile(file);
    }
    catch {
        res.status(404).json({ success: false, error: 'Imagen no encontrada' });
    }
};
