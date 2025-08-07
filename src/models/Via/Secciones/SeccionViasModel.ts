import { ViaModel } from '../viaModel';
import { SeccionViaModel } from './SeccionViaModel';
import { Request, Response } from 'express';

/**
 * Servicio que coordina la asignación y creación de secciones de vía.
 */
export class ViaSeccionService {
  /**
   * Asigna un movimiento a una sección de vía y marca la vía como ocupada.
   */
  static async asignarMovimientoSeccion(
    viaId: number,
    numeroSeccion: number,
    movimientoId: number
  ) {
    // 1. Obtener sección objetivo
    const secciones = await SeccionViaModel.obtenerSeccionesPorVia(viaId);
    const seccion = secciones.find(s => s.numero === numeroSeccion);
    if (!seccion) {
      throw new Error(`Sección ${numeroSeccion} no encontrada en vía ${viaId}`);
    }

    // 2. Marcar sección como ocupada
    await SeccionViaModel.editarSeccion(seccion.id, {
      ocupada: true,
      movimientoId,
    });

    // 3. Marcar vía como ocupada
    await ViaModel.editarVia(viaId, {
      ocupada: true,
      movimientoId,
    });
  }

  /**
   * Crea una nueva sección para una vía.
   */
  static async crearSeccionVia(
    viaId: number,
    numeroSeccion: number,
    nombre?: string
  ) {
    return await SeccionViaModel.crearSeccion(viaId, numeroSeccion, nombre);
  }

  /**
   * Handler Express para crear sección de vía vía API.
   */
  static async handleCrearSeccionVia(req: Request, res: Response) {
    try {
      const viaId = Number(req.params.viaId);
      const numeroSeccion = Number(req.body.numeroSeccion);
      const nombre = req.body.nombre as string | undefined;
      const seccion = await ViaSeccionService.crearSeccionVia(
        viaId,
        numeroSeccion,
        nombre
      );
      return res.status(201).json(seccion);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Handler Express para asignar movimiento a sección vía API.
   */
  static async handleAsignarMovimientoSeccion(req: Request, res: Response) {
    try {
      const viaId = Number(req.params.viaId);
      const numeroSeccion = Number(req.body.numeroSeccion);
      const movimientoId = Number(req.body.movimientoId);

      await ViaSeccionService.asignarMovimientoSeccion(
        viaId,
        numeroSeccion,
        movimientoId
      );

      return res.status(200).json({ message: 'Sección y vía actualizadas correctamente.' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
