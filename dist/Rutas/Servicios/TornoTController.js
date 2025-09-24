"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TornoTController = void 0;
const client_1 = require("@prisma/client");
const TornoTmodel_1 = require("../../models/Servicios/TornoTmodel");
const tornoT_controller_logger_1 = require("./tornoT.controller.logger");
// Helpers
function parseFecha(v) {
    if (v === undefined)
        return undefined;
    if (v === null || v === '')
        return null;
    const d = new Date(String(v));
    return isNaN(+d) ? undefined : d;
}
function parseNum(v) {
    if (v === undefined || v === null || v === '')
        return undefined;
    const n = Number(v);
    return Number.isInteger(n) ? n : undefined;
}
function isServicioEstado(v) {
    return Object.values(client_1.ServicioEstado).includes(v);
}
class TornoTController {
}
exports.TornoTController = TornoTController;
_a = TornoTController;
/** POST /torno  body: { movimientoId: number; status?: ServicioEstado; inicio?: ISO|null; fin?: ISO|null } */
TornoTController.crear = async (req, res) => {
    try {
        const { movimientoId, status } = req.body ?? {};
        const inicio = parseFecha(req.body?.inicio);
        const fin = parseFecha(req.body?.fin);
        if (!Number.isInteger(movimientoId)) {
            return res.status(400).json({ error: 'movimientoId es obligatorio y numérico' });
        }
        if (status !== undefined && !isServicioEstado(status)) {
            return res.status(400).json({ error: `status inválido. Valores: ${Object.values(client_1.ServicioEstado).join(', ')}` });
        }
        if (req.body?.inicio !== undefined && inicio === undefined) {
            return res.status(400).json({ error: 'inicio no es una fecha válida (ISO o null)' });
        }
        if (req.body?.fin !== undefined && fin === undefined) {
            return res.status(400).json({ error: 'fin no es una fecha válida (ISO o null)' });
        }
        const creado = await TornoTmodel_1.TornoTModel.crear({ movimientoId, status, inicio: inicio ?? null, fin: fin ?? null });
        return res.status(201).json(creado);
    }
    catch (error) {
        tornoT_controller_logger_1.tornoTControllerLogger.error('Error al crear TornoT', { error });
        return res.status(500).json({ error: 'Error al crear registro de torno' });
    }
};
/** PUT /torno/:id  body: { status?: ServicioEstado; inicio?: ISO|null; fin?: ISO|null } */
TornoTController.editar = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id))
            return res.status(400).json({ error: 'ID inválido' });
        const { status } = req.body ?? {};
        const inicio = req.body?.hasOwnProperty('inicio') ? parseFecha(req.body.inicio) : undefined;
        const fin = req.body?.hasOwnProperty('fin') ? parseFecha(req.body.fin) : undefined;
        if (status !== undefined && !isServicioEstado(status)) {
            return res.status(400).json({ error: `status inválido. Valores: ${Object.values(client_1.ServicioEstado).join(', ')}` });
        }
        if (inicio === undefined && req.body?.hasOwnProperty('inicio')) {
            return res.status(400).json({ error: 'inicio no es una fecha válida (use ISO o null)' });
        }
        if (fin === undefined && req.body?.hasOwnProperty('fin')) {
            return res.status(400).json({ error: 'fin no es una fecha válida (use ISO o null)' });
        }
        const actualizado = await TornoTmodel_1.TornoTModel.editar(id, { status, inicio, fin });
        return res.json(actualizado);
    }
    catch (error) {
        tornoT_controller_logger_1.tornoTControllerLogger.error('Error al editar TornoT', { error });
        return res.status(500).json({ error: 'Error al editar registro de torno' });
    }
};
/** POST /torno/:id/iniciar  body: { usuarioId?: number; inicio?: ISO|null } */
TornoTController.iniciar = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id))
            return res.status(400).json({ error: 'ID inválido' });
        const usuarioId = parseNum(req.body?.usuarioId);
        const inicio = parseFecha(req.body?.inicio);
        if (req.body?.usuarioId !== undefined && usuarioId === undefined) {
            return res.status(400).json({ error: 'usuarioId inválido' });
        }
        if (req.body?.inicio !== undefined && inicio === undefined) {
            return res.status(400).json({ error: 'inicio no es una fecha válida (ISO o null)' });
        }
        const row = await TornoTmodel_1.TornoTModel.iniciar(id, usuarioId, inicio ?? undefined);
        return res.json(row);
    }
    catch (error) {
        tornoT_controller_logger_1.tornoTControllerLogger.error('Error al iniciar TornoT', { error });
        return res.status(500).json({ error: 'Error al iniciar el torno' });
    }
};
/** POST /torno/:id/finalizar  body: { fin?: ISO|null } */
TornoTController.finalizar = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id))
            return res.status(400).json({ error: 'ID inválido' });
        const fin = parseFecha(req.body?.fin);
        if (req.body?.fin !== undefined && fin === undefined) {
            return res.status(400).json({ error: 'fin no es una fecha válida (ISO o null)' });
        }
        const row = await TornoTmodel_1.TornoTModel.finalizar(id, fin ?? undefined);
        return res.json(row);
    }
    catch (error) {
        tornoT_controller_logger_1.tornoTControllerLogger.error('Error al finalizar TornoT', { error });
        return res.status(500).json({ error: 'Error al finalizar el torno' });
    }
};
/** POST /torno/:id/asignar-operador  body: { usuarioId: number } */
TornoTController.asignarOperador = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const usuarioId = Number(req.body?.usuarioId);
        if (!Number.isInteger(id))
            return res.status(400).json({ error: 'ID inválido' });
        if (!Number.isInteger(usuarioId))
            return res.status(400).json({ error: 'usuarioId inválido' });
        await TornoTmodel_1.TornoTModel.asignarOperador(id, usuarioId);
        return res.json({ ok: true });
    }
    catch (error) {
        tornoT_controller_logger_1.tornoTControllerLogger.error('Error al asignar operador a TornoT', { error });
        return res.status(500).json({ error: 'Error al asignar operador' });
    }
};
/** GET /torno/en-servicio  → devuelve SOLO UNO (primero por prioridad/antigüedad) */
TornoTController.enServicioUno = async (req, res) => {
    try {
        const empresaId = parseNum(req.query.empresaId);
        const localidadId = parseNum(req.query.localidadId);
        const movimientoId = parseNum(req.query.movimientoId);
        if ([req.query.empresaId, req.query.localidadId, req.query.movimientoId]
            .some(v => v !== undefined && parseNum(v) === undefined)) {
            return res.status(400).json({ error: 'Parámetros numéricos inválidos' });
        }
        const row = await TornoTmodel_1.TornoTModel.enServicioUno({ empresaId, localidadId, movimientoId });
        return res.json(row); // puede ser null
    }
    catch (error) {
        tornoT_controller_logger_1.tornoTControllerLogger.error('Error listando TornoT en servicio (uno)', { error });
        return res.status(500).json({ error: 'Error al obtener torno en servicio' });
    }
};
/** GET /torno/pendientes  → DETENIDO (no EN_SERVICIO/FINALIZADO) */
TornoTController.listarNoEnProceso = async (req, res) => {
    try {
        const empresaId = parseNum(req.query.empresaId);
        const localidadId = parseNum(req.query.localidadId);
        const movimientoId = parseNum(req.query.movimientoId);
        if ([req.query.empresaId, req.query.localidadId, req.query.movimientoId]
            .some(v => v !== undefined && parseNum(v) === undefined)) {
            return res.status(400).json({ error: 'Parámetros numéricos inválidos' });
        }
        const rows = await TornoTmodel_1.TornoTModel.listarNoEnProceso({ empresaId, localidadId, movimientoId });
        return res.json(rows);
    }
    catch (error) {
        tornoT_controller_logger_1.tornoTControllerLogger.error('Error listando TornoT no en proceso', { error });
        return res.status(500).json({ error: 'Error al listar tornos pendientes' });
    }
};
/** GET /torno/paginado?status=EN_SERVICIO|FINALIZADO|DETENIDO|PENDIENTES&page=&pageSize=&empresaId=&localidadId=&movimientoId= */
TornoTController.listarPaginado = async (req, res) => {
    try {
        const page = parseNum(req.query.page) ?? 1;
        const pageSize = parseNum(req.query.pageSize) ?? 20;
        const empresaId = parseNum(req.query.empresaId);
        const localidadId = parseNum(req.query.localidadId);
        const movimientoId = parseNum(req.query.movimientoId);
        const statusRaw = req.query.status;
        if (page < 1 || pageSize < 1)
            return res.status(400).json({ error: 'Paginación inválida' });
        if ([req.query.empresaId, req.query.localidadId, req.query.movimientoId]
            .some(v => v !== undefined && parseNum(v) === undefined)) {
            return res.status(400).json({ error: 'Parámetros numéricos inválidos' });
        }
        let status = undefined;
        if (statusRaw) {
            if (statusRaw === 'PENDIENTES')
                status = 'PENDIENTES';
            else if (isServicioEstado(statusRaw))
                status = statusRaw;
            else
                return res.status(400).json({ error: `status inválido. Use ${Object.values(client_1.ServicioEstado).join(', ')} o PENDIENTES` });
        }
        const data = await TornoTmodel_1.TornoTModel.listarPaginado({ page, pageSize, empresaId, localidadId, movimientoId, status });
        return res.json(data);
    }
    catch (error) {
        tornoT_controller_logger_1.tornoTControllerLogger.error('Error en paginado TornoT', { error });
        return res.status(500).json({ error: 'Error al listar tornos' });
    }
};
/** GET /torno/siguiente  → siguiente para iniciar (SOLO UNO) */
TornoTController.siguienteParaIniciar = async (req, res) => {
    try {
        const empresaId = parseNum(req.query.empresaId);
        const localidadId = parseNum(req.query.localidadId);
        if ([req.query.empresaId, req.query.localidadId]
            .some(v => v !== undefined && parseNum(v) === undefined)) {
            return res.status(400).json({ error: 'Parámetros numéricos inválidos' });
        }
        const row = await TornoTmodel_1.TornoTModel.siguienteParaIniciar({ empresaId, localidadId });
        return res.json(row); // puede ser null
    }
    catch (error) {
        tornoT_controller_logger_1.tornoTControllerLogger.error('Error obteniendo siguiente TornoT para iniciar', { error });
        return res.status(500).json({ error: 'Error al obtener siguiente' });
    }
};
/** GET /torno/:id */
TornoTController.obtener = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id))
            return res.status(400).json({ error: 'ID inválido' });
        const row = await TornoTmodel_1.TornoTModel.obtener(id);
        return res.json(row);
    }
    catch (error) {
        tornoT_controller_logger_1.tornoTControllerLogger.error('Error al obtener TornoT', { error });
        return res.status(500).json({ error: 'Error al obtener registro de torno' });
    }
};
