// src/Rutas/Actualizacion/ActualizacionController.ts
import { Request, Response } from 'express';
import { EstadoActualizacion } from '@prisma/client';
import * as modelo from '../../models/Actualizacion/actualizacionModel';

const parseFecha = (valor: unknown): Date | undefined => {
  if (typeof valor === 'string' || valor instanceof Date) {
    const f = new Date(valor);
    if (!isNaN(f.getTime())) return f;
  }
  return undefined;
};

export class ActualizacionController {
  /** GET /actualizaciones */
  static obtenerActualizaciones = async (_req: Request, res: Response): Promise<void> => {
    try {
      const lista = await modelo.obtenerActualizaciones();
      res.json(lista);
    } catch (err) {
      console.error('Error al obtener actualizaciones:', err);
      res.status(500).json({ error: 'No se pudieron obtener las actualizaciones' });
    }
  };

  /** GET /actualizaciones/ultima */
  static obtenerUltimaActualizacion = async (_req: Request, res: Response): Promise<void> => {
    try {
      const ultima = await modelo.obtenerUltimaActualizacion();
      if (!ultima) {
        res.status(404).json({ error: 'No hay actualizaciones registradas' });
        return;
      }
      res.json(ultima);
    } catch (err) {
      console.error('Error al obtener la última actualización:', err);
      res.status(500).json({ error: 'No se pudo obtener la última actualización' });
    }
  };

  /** POST /actualizaciones */
  static crearActualizacion = async (req: Request, res: Response): Promise<void> => {
    const { nombre, fechalanzamiento, estado } = req.body;

    if (!nombre || !fechalanzamiento) {
      res.status(400).json({ error: 'Se requieren nombre y fechalanzamiento' });
      return;
    }
    const fecha = parseFecha(fechalanzamiento);
    if (!fecha) {
      res.status(400).json({ error: 'fechalanzamiento debe ser fecha ISO válida' });
      return;
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
  static actualizarActualizacion = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID de actualización inválido' });
      return;
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
        res.status(400).json({ error: 'fechalanzamiento debe ser fecha ISO válida' });
        return;
      }
      cambios.fechalanzamiento = fecha;
    }

    if (estado !== undefined) cambios.estado = estado as EstadoActualizacion;

    try {
      const actualizado = await modelo.actualizarActualizacion(id, cambios);
      res.json(actualizado);
    } catch (err) {
      console.error(`Error al actualizar con ID ${id}:`, err);
      res.status(500).json({ error: 'Error al actualizar la actualización' });
    }
  };
}
