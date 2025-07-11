// controllers/Actualizacion/actualizacion.controller.ts
//
// Endpoints:
//   • GET  /actualizaciones           → lista todas
//   • GET  /actualizaciones/ultima    → obtiene la más reciente
//   • POST /actualizaciones           → crea una nueva
//   • PUT  /actualizaciones/:id       → actualiza una existente
//
// NOTA: Protege las rutas con JWT en tu router principal.

import { Request, Response, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import * as modelo from '../../models/Actualizacion/actualizacionModel';

// Enum exacto generado por Prisma
type EstadoActualizacion = Prisma.EstadoActualizacion;

/* -------------------------------------------------------------------------- */
/*                               Helper de fecha                              */
/* -------------------------------------------------------------------------- */

const parseFecha = (valor: unknown): Date | undefined => {
  if (typeof valor === 'string' || valor instanceof Date) {
    const fecha = new Date(valor);
    if (!isNaN(fecha.getTime())) return fecha;
  }
  return undefined;
};

/* -------------------------------------------------------------------------- */
/*                                Controlador                                 */
/* -------------------------------------------------------------------------- */

export class ActualizacionController {
  /** GET /actualizaciones */
  static obtenerActualizaciones: RequestHandler = async (_req, res) => {
    try {
      const lista = await modelo.obtenerActualizaciones();
      res.json(lista);
    } catch (err) {
      console.error('Error al obtener actualizaciones:', err);
      res.status(500).json({ error: 'No se pudieron obtener las actualizaciones' });
    }
  };

  /** GET /actualizaciones/ultima */
  static obtenerUltimaActualizacion: RequestHandler = async (_req, res) => {
    try {
      const ultima = await modelo.obtenerUltimaActualizacion();
      if (!ultima) {
        return res.status(404).json({ error: 'No hay actualizaciones registradas' });
      }
      res.json(ultima);
    } catch (err) {
      console.error('Error al obtener la última actualización:', err);
      res.status(500).json({ error: 'No se pudo obtener la última actualización' });
    }
  };

  /** POST /actualizaciones */
  static crearActualizacion: RequestHandler = async (req: Request, res: Response) => {
    const { nombre, fechalanzamiento, estado } = req.body;

    // Validaciones mínimas
    if (!nombre || !fechalanzamiento) {
      return res.status(400).json({
        error: 'Se requieren los campos nombre y fechalanzamiento',
      });
    }
    const fecha = parseFecha(fechalanzamiento);
    if (!fecha) {
      return res.status(400).json({
        error: 'fechalanzamiento debe ser una fecha válida (ISO 8601)',
      });
    }

    try {
      const creada = await modelo.crearActualizacion(
        nombre,
        fecha,
        estado as EstadoActualizacion | undefined,
      );
      res.status(201).json(creada);
    } catch (err) {
      console.error('Error al crear actualización:', err);
      res.status(500).json({ error: 'Error al crear la actualización' });
    }
  };

  /** PUT /actualizaciones/:id */
  static actualizarActualizacion: RequestHandler = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID de actualización inválido' });
    }

    const { nombre, fechalanzamiento, estado } = req.body;
    const cambios: {
      nombre?: string;
      fechalanzamiento?: Date;
      estado?: EstadoActualizacion;
    } = {};

    if (nombre !== undefined) cambios.nombre = nombre;

    if (fechalanzamiento !== undefined) {
      const fecha = parseFecha(fechalanzamiento);
      if (!fecha) {
        return res
          .status(400)
          .json({ error: 'fechalanzamiento debe ser una fecha válida (ISO 8601)' });
      }
      cambios.fechalanzamiento = fecha;
    }

    if (estado !== undefined) cambios.estado = estado as EstadoActualizacion;

    try {
      const actualizado = await modelo.actualizarActualizacion(id, cambios);
      res.json(actualizado);
    } catch (err) {
      console.error(`Error al actualizar actualización con ID ${id}:`, err);
      res.status(500).json({ error: 'Error al actualizar la actualización' });
    }
  };
}
