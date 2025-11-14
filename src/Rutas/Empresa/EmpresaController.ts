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
import { EmpresaModel } from '../../models/Empresa/empresaModel';
import { empresaControllerLogger } from './empresa.controller.logger';

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
      res.json(empresas);
    } catch (error) {
      empresaControllerLogger.error('Error al obtener empresas', { error });
      res.status(500).json({ error: 'Error al obtener empresas', details: error });
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
      res.status(400).json({ error: 'El campo nombre es obligatorio y debe ser texto' });
      return;
    }

    try {
      const nueva = await EmpresaModel.crearEmpresa(nombre);
      res.status(201).json(nueva);
    } catch (error) {
      empresaControllerLogger.error('Error al crear empresa', { error });
      res.status(500).json({ error: 'Error al crear empresa', details: error });
    }
  };

  /**
   * PUT /empresas/:id
   * 
   * Actualiza el nombre de una empresa existente mediante su `id`.
   */
  static editarEmpresa: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    const { nombre } = req.body;

    if (!nombre || typeof nombre !== 'string' || isNaN(id)) {
      res.status(400).json({ error: 'Datos inválidos. ID debe ser numérico y nombre no vacío.' });
      return;
    }

    try {
      const actualizada = await EmpresaModel.editarEmpresa(id, nombre);
      res.json(actualizada);
    } catch (error) {
      empresaControllerLogger.error('Error al editar empresa', { error });
      res.status(500).json({ error: 'Error al editar empresa', details: error });
    }
  };

  /**
   * DELETE /empresas/:id
   * 
   * Elimina una empresa existente por su ID.
   */
  static eliminarEmpresa: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido. Debe ser un número válido.' });
      return;
    }

    try {
      const eliminada = await EmpresaModel.eliminarEmpresa(id);
      res.json({ message: 'Empresa eliminada exitosamente', eliminada });
    } catch (error) {
      empresaControllerLogger.error('Error al eliminar empresa', { error });
      res.status(500).json({ error: 'Error al eliminar empresa', details: error });
    }
  };
}
