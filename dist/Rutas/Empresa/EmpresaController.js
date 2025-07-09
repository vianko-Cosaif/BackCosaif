"use strict";
/**
 * EmpresaController.ts
 *
 * Controlador HTTP para la gestión de entidades Empresa.
 *
 * Este módulo define los endpoints REST disponibles para interactuar con los recursos Empresa.
 * Utiliza EmpresaModel como capa de acceso a datos (basada en Prisma).
 *
 * Funciones implementadas:
 * - Listar empresas.
 * - Crear una nueva empresa.
 * - Editar una empresa existente.
 * - Eliminar una empresa por ID.
 *
 * Cada operación realiza validaciones básicas de entrada, y los errores
 * se registran mediante un logger dedicado para facilitar su trazabilidad.
 *
 * Dependencias:
 * - express: manejo de solicitudes/respuestas HTTP.
 * - EmpresaModel: capa de datos para operaciones CRUD.
 * - empresaControllerLogger: logger especializado en errores del controlador.
 */
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmpresaController = void 0;
const empresaModel_1 = require("../../models/Empresa/empresaModel");
const empresa_controller_logger_1 = require("./empresa.controller.logger");
/**
 * Controlador REST para entidades Empresa.
 * Define los endpoints relacionados con el recurso.
 */
class EmpresaController {
}
exports.EmpresaController = EmpresaController;
_a = EmpresaController;
/**
 * GET /empresas
 *
 * Devuelve todas las empresas registradas con sus usuarios relacionados.
 */
EmpresaController.obtenerEmpresas = async (req, res) => {
    try {
        const empresas = await empresaModel_1.EmpresaModel.obtenerEmpresas();
        res.json(empresas);
    }
    catch (error) {
        empresa_controller_logger_1.empresaControllerLogger.error('Error al obtener empresas', { error });
        res.status(500).json({ error: 'Error al obtener empresas', details: error });
    }
};
/**
 * POST /empresas
 *
 * Crea una nueva empresa a partir del campo `nombre` recibido en el cuerpo de la solicitud.
 */
EmpresaController.crearEmpresa = async (req, res) => {
    const { nombre } = req.body;
    if (!nombre || typeof nombre !== 'string') {
        res.status(400).json({ error: 'El campo nombre es obligatorio y debe ser texto' });
        return;
    }
    try {
        const nueva = await empresaModel_1.EmpresaModel.crearEmpresa(nombre);
        res.status(201).json(nueva);
    }
    catch (error) {
        empresa_controller_logger_1.empresaControllerLogger.error('Error al crear empresa', { error });
        res.status(500).json({ error: 'Error al crear empresa', details: error });
    }
};
/**
 * PUT /empresas/:id
 *
 * Actualiza el nombre de una empresa existente mediante su `id`.
 */
EmpresaController.editarEmpresa = async (req, res) => {
    const id = parseInt(req.params.id);
    const { nombre } = req.body;
    if (!nombre || typeof nombre !== 'string' || isNaN(id)) {
        res.status(400).json({ error: 'Datos inválidos. ID debe ser numérico y nombre no vacío.' });
        return;
    }
    try {
        const actualizada = await empresaModel_1.EmpresaModel.editarEmpresa(id, nombre);
        res.json(actualizada);
    }
    catch (error) {
        empresa_controller_logger_1.empresaControllerLogger.error('Error al editar empresa', { error });
        res.status(500).json({ error: 'Error al editar empresa', details: error });
    }
};
/**
 * DELETE /empresas/:id
 *
 * Elimina una empresa existente por su ID.
 */
EmpresaController.eliminarEmpresa = async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        res.status(400).json({ error: 'ID inválido. Debe ser un número válido.' });
        return;
    }
    try {
        const eliminada = await empresaModel_1.EmpresaModel.eliminarEmpresa(id);
        res.json({ message: 'Empresa eliminada exitosamente', eliminada });
    }
    catch (error) {
        empresa_controller_logger_1.empresaControllerLogger.error('Error al eliminar empresa', { error });
        res.status(500).json({ error: 'Error al eliminar empresa', details: error });
    }
};
