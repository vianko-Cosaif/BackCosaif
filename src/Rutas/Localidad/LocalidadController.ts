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
import { 
  obtenerLocalidades, 
  crearLocalidad, 
  buscarLocalidadPorId, 
  buscarLocalidadPorNombre 
} from '../../models/Locolidad/localidadModel';
import { localidadControllerLogger } from './Localidad.logger';

export class LocalidadController {
  /**
   * GET /localidades
   * 
   * Devuelve todas las localidades registradas junto con sus relaciones (vías, usuarios, movimientos).
   */
  static obtenerLocalidades: RequestHandler = async (req: Request, res: Response) => {
    try {
      const localidades = await obtenerLocalidades();
      res.json(localidades);
    } catch (error) {
        localidadControllerLogger.error('Error al obtener localidades', { error });
      res.status(500).json({ error: 'Error al obtener localidades', details: error });
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
      res.status(400).json({ error: 'Los campos nombre y estado son obligatorios y deben ser de tipo texto' });
      return;
    }

    try {
      const nuevaLocalidad = await crearLocalidad(nombre, estado);
      res.status(201).json(nuevaLocalidad);
    } catch (error) {
        localidadControllerLogger.error('Error al crear localidad', { error });
      res.status(500).json({ error: 'Error al crear localidad', details: error });
    }
  };

  /**
   * GET /localidades/:id
   * 
   * Obtiene una localidad en particular a partir de su ID.
   */
  static obtenerLocalidadPorId: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido. Debe ser un número válido.' });
      return;
    }

    try {
      const localidad = await buscarLocalidadPorId(id);
      if (!localidad) {
        res.status(404).json({ error: 'Localidad no encontrada' });
      } else {
        res.json(localidad);
      }
    } catch (error) {
        localidadControllerLogger.error(`Error al obtener localidad con ID ${id}`, { error });
      res.status(500).json({ error: 'Error al obtener localidad', details: error });
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
      res.status(400).json({ error: 'El parámetro de consulta "nombre" es obligatorio y debe ser de tipo texto' });
      return;
    }

    try {
      const localidad = await buscarLocalidadPorNombre(nombre);
      if (!localidad) {
        res.status(404).json({ error: 'Localidad no encontrada' });
      } else {
        res.json(localidad);
      }
    } catch (error) {
        localidadControllerLogger.error(`Error al buscar localidad con nombre ${nombre}`, { error });
      res.status(500).json({ error: 'Error al buscar localidad', details: error });
    }
  };
}
