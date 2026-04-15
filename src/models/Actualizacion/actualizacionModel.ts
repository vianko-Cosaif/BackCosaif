// actualizacion.service.ts
//
// Servicio de acceso a datos para la entidad Actualizacion.
//
// Métodos expuestos:
//   • obtenerActualizaciones()   → Lista todas (más recientes primero).
//   • obtenerUltimaActualizacion() → Devuelve la más reciente.
//   • actualizarActualizacion()  → Modifica una actualización por ID.
//
// Notas de robustez:
//   • Todos los accesos a BD están envueltos en try/catch; se detectan los
//     errores de Prisma más comunes y se devuelven mensajes claros.
//   • Se valida que la clave de ordenamiento/actualización coincida EXACTAMENTE
//     con el campo definido en el schema (`fechalanzamiento`).
//   • No se permite actualizar campos vacíos ni realizar operaciones
//     innecesarias (early-return si `cambios` no trae nada).
//   • Se usa un único `PrismaClient` compartido; el caller es responsable de
//     cerrarlo al apagar la app (p. ej. en un middleware global).

import {
  PrismaClient,
  Prisma,
  Actualizacion,
  EstadoActualizacion,
} from '@prisma/client';

const prisma = new PrismaClient();

export class ActualizacionModel {
  /**
   * Traduce errores de Prisma a mensajes legibles.
   * Extiende si necesitas mapear más códigos (consulta P2000…P20xx en la doc).
   */
  private static parsePrismaError(err: unknown): Error {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      switch (err.code) {
        case 'P2025': // "Record not found"
          return new Error('La actualización indicada no existe');
        case 'P2002': // Unique constraint failed
          return new Error('Violación de unicidad en la base de datos');
        default:
          return new Error(`Error de base de datos (código ${err.code})`);
      }
    }
    return new Error('Error inesperado en la base de datos');
  }

  /**
   * Devuelve todas las actualizaciones, ordenadas descendentemente
   * por el campo `fechalanzamiento`.
   */
  static async obtenerActualizaciones(): Promise<Actualizacion[]> {
    try {
      return await prisma.actualizacion.findMany({
        orderBy: { fechalanzamiento: 'desc' },
      });
    } catch (err) {
      throw this.parsePrismaError(err);
    }
  }

  /**
   * Crea una nueva fila en `Actualizacion`.
   */
  static async crearActualizacion(
    nombre: string,
    fechalanzamiento: Date,
    estado: EstadoActualizacion = EstadoActualizacion.ACTIVA,
  ): Promise<Actualizacion> {
    try {
      return await prisma.actualizacion.create({
        data: { nombre, fechalanzamiento, estado },
      });
    } catch (err) {
      throw this.parsePrismaError(err);
    }
  }

  /**
   * Devuelve la actualización con fecha de lanzamiento más reciente,
   * o `null` si no hay registros.
   */
  static async obtenerUltimaActualizacion(): Promise<Actualizacion | null> {
    try {
      return await prisma.actualizacion.findFirst({
        orderBy: { fechalanzamiento: 'desc' },
      });
    } catch (err) {
      throw this.parsePrismaError(err);
    }
  }

  /**
   * Actualiza una fila en `Actualizacion`.
   */
  static async actualizarActualizacion(
    id: number,
    cambios: {
      nombre?: string;
      fechalanzamiento?: Date;
      estado?: EstadoActualizacion;
    },
  ): Promise<Actualizacion> {
    const data: Prisma.ActualizacionUpdateInput = {};
    if (cambios.nombre !== undefined) data.nombre = cambios.nombre;
    if (cambios.fechalanzamiento !== undefined) data.fechalanzamiento = cambios.fechalanzamiento;
    if (cambios.estado !== undefined) data.estado = cambios.estado;

    if (Object.keys(data).length === 0) {
      throw new Error('No se proporcionaron campos válidos para actualizar');
    }

    try {
      return await prisma.actualizacion.update({
        where: { id },
        data,
      });
    } catch (err) {
      throw this.parsePrismaError(err);
    }
  }
}
