"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidenteController = void 0;
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const IncidenteModel_1 = require("../../models/Incidente/IncidenteModel");
const IncidenteModel_2 = require("../../models/Incidente/IncidenteModel");
/**
 * Controlador HTTP para la gestión de incidentes.
 * Utiliza únicamente los métodos expuestos por IncidenteModel.
 */
class IncidenteController {
}
exports.IncidenteController = IncidenteController;
_a = IncidenteController;
/**
 * GET /incidentes
 * Lista todos los incidentes sin paginar.
 */
IncidenteController.obtenerIncidentes = async (_req, res) => {
    try {
        const incidentes = await IncidenteModel_1.IncidenteModel.obtenerIncidentes();
        res.json({ success: true, data: incidentes });
    }
    catch (error) {
        console.error('Error al listar incidentes', error);
        res.status(500).json({ success: false, error: 'Error al obtener incidentes' });
    }
};
/**
 * GET /incidentes/paginado?page=&pageSize=&estado=
 * Lista incidentes paginados con filtro opcional por estado.
 */
IncidenteController.obtenerIncidentesPaginados = async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const estado = ['ABIERTO', 'CERRADO'].includes(String(req.query.estado))
        ? req.query.estado
        : undefined;
    try {
        let result;
        if (estado) {
            result = await IncidenteModel_1.IncidenteModel.obtenerIncidentesPorEstado(estado, page, pageSize);
        }
        else {
            result = await IncidenteModel_1.IncidenteModel.obtenerIncidentesPaginados(page, pageSize);
        }
        res.json({ success: true, data: result.data, meta: result.meta });
    }
    catch (error) {
        console.error('Error en paginar incidentes', error, req.query);
        res.status(500).json({ success: false, error: 'Error al obtener incidentes paginados' });
    }
};
/**
 * GET /incidentes/localidad/:localidadId?page=&pageSize=
 * Lista incidentes de una localidad dada.
 */
IncidenteController.obtenerPorLocalidad = async (req, res) => {
    const localidadId = Number(req.params.localidadId);
    if (isNaN(localidadId)) {
        res.status(400).json({ success: false, error: 'localidadId inválido' });
        return;
    }
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    try {
        const result = await IncidenteModel_1.IncidenteModel.obtenerIncidentesPorLocalidad(localidadId, page, pageSize);
        res.json({ success: true, data: result.data, meta: result.meta });
    }
    catch (error) {
        console.error('Error al obtener incidentes por localidad', { localidadId, error });
        res.status(500).json({ success: false, error: 'Error al obtener incidentes por localidad' });
    }
};
/**
 * GET /incidentes/empresa/:empresaId?page=&pageSize=
 * Lista incidentes de una empresa dada.
 */
IncidenteController.obtenerPorEmpresa = async (req, res) => {
    const empresaId = Number(req.params.empresaId);
    if (isNaN(empresaId)) {
        res.status(400).json({ success: false, error: 'empresaId inválido' });
        return;
    }
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    try {
        const result = await IncidenteModel_1.IncidenteModel.obtenerIncidentesPorEmpresa(empresaId, page, pageSize);
        res.json({ success: true, data: result.data, meta: result.meta });
    }
    catch (error) {
        console.error('Error al obtener incidentes por empresa', { empresaId, error });
        res.status(500).json({ success: false, error: 'Error al obtener incidentes por empresa' });
    }
};
/**
 * GET /incidentes/:id/imagenes
 * Devuelve URLs de las imágenes de un incidente.
 */
IncidenteController.obtenerImagenes = async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
        res.status(400).json({ success: false, error: 'ID de incidente inválido' });
        return;
    }
    try {
        const rutas = await IncidenteModel_1.IncidenteModel.obtenerImagenesIncidente(id);
        const host = `${req.protocol}://${req.get('host')}`;
        const urls = rutas.map(r => `${host}/incidentes/imagen/${encodeURIComponent(r)}`);
        res.json({ success: true, data: urls });
    }
    catch (error) {
        console.error('Error al obtener imágenes', { id, error });
        res.status(500).json({ success: false, error: 'Error al obtener imágenes de incidente' });
    }
};
/**
 * GET /incidentes/imagen/:rutaImagen
 * Sirve un archivo de imagen almacenado.
 */
IncidenteController.servirImagen = async (req, res) => {
    try {
        const rutaRel = req.params.rutaImagen;
        const fullPath = path_1.default.join(IncidenteModel_2.IMAGEN_CONFIG.basePath, rutaRel);
        await promises_1.default.access(fullPath);
        res.sendFile(fullPath);
    }
    catch {
        res.status(404).json({ success: false, error: 'Imagen no encontrada' });
    }
};
