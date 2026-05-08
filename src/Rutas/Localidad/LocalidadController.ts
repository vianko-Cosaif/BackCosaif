/**
 * LocalidadController.ts
 * 
 * Controlador HTTP para la gestión de entidades Localidad.
 * 
 * Este módulo define los endpoints REST disponibles para interactuar con los recursos Localidad.
 * Utiliza las funciones definidas en el servicio de Localidad (localidad.service.ts) para el acceso a datos.
 * 
 * Funciones implementadas:
 * - Listar localidades.
 * - Crear una nueva localidad.
 * - Obtener una localidad por ID.
 * - Buscar una localidad por nombre.
 * 
 * Cada operación realiza validaciones básicas de entrada, y los errores
 * se registran mediante un logger especializado para facilitar su trazabilidad.
 */

import { Request, Response, RequestHandler } from 'express';
import { LocalidadModel } from '../../models/Locolidad';
import { localidadControllerLogger } from './Localidad.logger';
import { ok, fail } from '../../utils/http';

export class LocalidadController {
  /**
   * GET /localidades
   * 
   * Devuelve todas las localidades registradas junto con sus relaciones (vías, usuarios, movimientos).
   */
  static obtenerLocalidades: RequestHandler = async (req: Request, res: Response) => {
    try {
      const localidades = await LocalidadModel.obtenerLocalidades();
      ok(res, localidades);
    } catch (error) {
        localidadControllerLogger.error('Error al obtener localidades', { error });
      fail(res, 500, 'Error al obtener localidades', { error: error as any });
    }
  };

  /**
   * GET /localidades/lite
   *
   * Devuelve localidades ligeras (id, nombre, estado).
   */
  static obtenerLocalidadesLite: RequestHandler = async (_req: Request, res: Response) => {
    try {
      const localidades = await LocalidadModel.obtenerLocalidadesLite();
      ok(res, localidades);
    } catch (error) {
      localidadControllerLogger.error('Error al obtener localidades lite', { error });
      fail(res, 500, 'Error al obtener localidades', { error: error as any });
    }
  };

  /**
   * POST /localidades
   * 
   * Crea una nueva localidad a partir de los campos `nombre` y `estado` recibidos en el cuerpo de la solicitud.
   */
  static crearLocalidad: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    const { nombre, estado } = req.body;

    if (!nombre || typeof nombre !== 'string' || !estado || typeof estado !== 'string') {
      fail(res, 400, 'Los campos nombre y estado son obligatorios y deben ser de tipo texto');
      return;
    }

    try {
      const nuevaLocalidad = await LocalidadModel.crearLocalidad(nombre, estado);
      res.status(201);
      ok(res, nuevaLocalidad);
    } catch (error) {
        localidadControllerLogger.error('Error al crear localidad', { error });
      fail(res, 500, 'Error al crear localidad', { error: error as any });
    }
  };

  /**
   * GET /localidades/:id
   * 
   * Obtiene una localidad en particular a partir de su ID.
   */
  static obtenerLocalidadPorId: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);

    if (isNaN(id)) {
      fail(res, 400, 'ID inválido. Debe ser un número válido.');
      return;
    }

    try {
      const localidad = await LocalidadModel.buscarLocalidadPorId(id);
      if (!localidad) {
        fail(res, 404, 'Localidad no encontrada');
      } else {
        ok(res, localidad);
      }
    } catch (error) {
        localidadControllerLogger.error(`Error al obtener localidad con ID ${id}`, { error });
      fail(res, 500, 'Error al obtener localidad', { error: error as any });
    }
  };

  /**
   * GET /localidades/buscar?nombre=...
   * 
   * Busca una localidad por su nombre utilizando un parámetro de consulta.
   */
  static buscarLocalidadPorNombre: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    const { nombre } = req.query;

    if (!nombre || typeof nombre !== 'string') {
      fail(res, 400, 'El parámetro de consulta "nombre" es obligatorio y debe ser de tipo texto');
      return;
    }

    try {
      const localidad = await LocalidadModel.buscarLocalidadPorNombre(nombre);
      if (!localidad) {
        fail(res, 404, 'Localidad no encontrada');
      } else {
        ok(res, localidad);
      }
    } catch (error) {
        localidadControllerLogger.error(`Error al buscar localidad con nombre ${nombre}`, { error });
      fail(res, 500, 'Error al buscar localidad', { error: error as any });
    }
  };
}
