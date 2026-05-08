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

import { Request, Response, RequestHandler } from 'express';
import { EmpresaModel } from '../../models/Empresa';
import { empresaControllerLogger } from './empresa.controller.logger';
import { ok, fail } from '../../utils/http';

/**
 * Controlador REST para entidades Empresa.
 * Define los endpoints relacionados con el recurso.
 */
export class EmpresaController {
  /**
   * GET /empresas
   * 
   * Devuelve todas las empresas registradas con sus usuarios relacionados.
   */
  static obtenerEmpresas: RequestHandler = async (req: Request, res: Response) => {
    try {
      const empresas = await EmpresaModel.obtenerEmpresas();
      ok(res, empresas);
    } catch (error) {
      empresaControllerLogger.error('Error al obtener empresas', { error });
      fail(res, 500, 'Error al obtener empresas', { error: error as any });
    }
  };

  /**
   * GET /empresas/lite
   *
   * Devuelve empresas en versión ligera (id, nombre).
   */
  static obtenerEmpresasLite: RequestHandler = async (_req: Request, res: Response) => {
    try {
      const empresas = await EmpresaModel.obtenerEmpresasLite();
      ok(res, empresas);
    } catch (error) {
      empresaControllerLogger.error('Error al obtener empresas lite', { error });
      fail(res, 500, 'Error al obtener empresas', { error: error as any });
    }
  };

  /**
   * POST /empresas
   * 
   * Crea una nueva empresa a partir del campo `nombre` recibido en el cuerpo de la solicitud.
   */
  static crearEmpresa: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    const { nombre } = req.body;

    if (!nombre || typeof nombre !== 'string') {
      fail(res, 400, 'El campo nombre es obligatorio y debe ser texto');
      return;
    }

    try {
      const nueva = await EmpresaModel.crearEmpresa(nombre);
      res.status(201);
      ok(res, nueva);
    } catch (error) {
      empresaControllerLogger.error('Error al crear empresa', { error });
      fail(res, 500, 'Error al crear empresa', { error: error as any });
    }
  };

  /**
   * PUT /empresas/:id
   * 
   * Actualiza el nombre de una empresa existente mediante su `id`.
   */
  static editarEmpresa: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    const { nombre } = req.body;

    if (!nombre || typeof nombre !== 'string' || isNaN(id)) {
      fail(res, 400, 'Datos inválidos. ID debe ser numérico y nombre no vacío.');
      return;
    }

    try {
      const actualizada = await EmpresaModel.editarEmpresa(id, nombre);
      ok(res, actualizada);
    } catch (error) {
      empresaControllerLogger.error('Error al editar empresa', { error });
      fail(res, 500, 'Error al editar empresa', { error: error as any });
    }
  };

  /**
   * DELETE /empresas/:id
   * 
   * Elimina una empresa existente por su ID.
   */
  static eliminarEmpresa: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);

    if (isNaN(id)) {
      fail(res, 400, 'ID inválido. Debe ser un número válido.');
      return;
    }

    try {
      const eliminada = await EmpresaModel.eliminarEmpresa(id);
      ok(res, { message: 'Empresa eliminada exitosamente', eliminada });
    } catch (error) {
      empresaControllerLogger.error('Error al eliminar empresa', { error });
      fail(res, 500, 'Error al eliminar empresa', { error: error as any });
    }
  };
}
