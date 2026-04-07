// src/Rutas/Actualizacion/ActualizacionController.ts
import { Request, Response } from 'express';
import { EstadoActualizacion } from '@prisma/client';
import { ActualizacionModel } from '../../models/Actualizacion';
import { ok, fail } from '../../utils/http';

const parseFecha = (valor: unknown): Date | undefined => {
  if (typeof valor === 'string' || valor instanceof Date) {
    const f = new Date(valor);
    if (!isNaN(f.getTime())) return f;
  }
  return undefined;
};

export class ActualizacionController {
  private static toDto(row: { id: number; nombre: string; fechalanzamiento: Date; estado: EstadoActualizacion }) {
    return {
      id: row.id,
      nombre: row.nombre,
      fechalanzamiento: row.fechalanzamiento,
      estado: row.estado,
    };
  }

  /** GET /actualizaciones */
  static obtenerActualizaciones = async (_req: Request, res: Response): Promise<void> => {
    try {
      const lista = await ActualizacionModel.obtenerActualizaciones();
      ok(res, lista.map((row) => this.toDto(row)));
    } catch (err) {
      console.error('Error al obtener actualizaciones:', err);
      fail(res, 500, 'No se pudieron obtener las actualizaciones');
    }
  };

  /** GET /actualizaciones/ultima */
  static obtenerUltimaActualizacion = async (_req: Request, res: Response): Promise<void> => {
    try {
      const ultima = await ActualizacionModel.obtenerUltimaActualizacion();
      if (!ultima) {
        fail(res, 404, 'No hay actualizaciones registradas');
        return;
      }
      ok(res, this.toDto(ultima));
    } catch (err) {
      console.error('Error al obtener la última actualización:', err);
      fail(res, 500, 'No se pudo obtener la última actualización');
    }
  };

  /** POST /actualizaciones */
  static crearActualizacion = async (req: Request, res: Response): Promise<void> => {
    const { nombre, fechalanzamiento, estado } = req.body;

    if (!nombre || !fechalanzamiento) {
      fail(res, 400, 'Se requieren nombre y fechalanzamiento');
      return;
    }
    const fecha = parseFecha(fechalanzamiento);
    if (!fecha) {
      fail(res, 400, 'fechalanzamiento debe ser fecha ISO válida');
      return;
    }

    try {
      const creada = await ActualizacionModel.crearActualizacion(
        nombre,
        fecha,
        estado as EstadoActualizacion | undefined,
      );
      res.status(201);
      ok(res, this.toDto(creada));
    } catch (err) {
      console.error('Error al crear actualización:', err);
      fail(res, 500, 'Error al crear la actualización');
    }
  };

  /** PUT /actualizaciones/:id */
  static actualizarActualizacion = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      fail(res, 400, 'ID de actualización inválido');
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
        fail(res, 400, 'fechalanzamiento debe ser fecha ISO válida');
        return;
      }
      cambios.fechalanzamiento = fecha;
    }

    if (estado !== undefined) cambios.estado = estado as EstadoActualizacion;

    try {
      const actualizado = await ActualizacionModel.actualizarActualizacion(id, cambios);
      ok(res, this.toDto(actualizado));
    } catch (err) {
      console.error(`Error al actualizar con ID ${id}:`, err);
      fail(res, 500, 'Error al actualizar la actualización');
    }
  };
}
