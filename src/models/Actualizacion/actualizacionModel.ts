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

/* -------------------------------------------------------------------------- */
/*                               Helper interno                               */
/* -------------------------------------------------------------------------- */

/**
 * Traduce errores de Prisma a mensajes legibles.
 * Extiende si necesitas mapear más códigos (consulta P2000…P20xx en la doc).
 */
function parsePrismaError(err: unknown): Error {
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

/* -------------------------------------------------------------------------- */
/*                                API pública                                 */
/* -------------------------------------------------------------------------- */

/**
 * Devuelve todas las actualizaciones, ordenadas descendentemente
 * por el campo `fechalanzamiento`.
 */
export async function obtenerActualizaciones(): Promise<Actualizacion[]> {
  try {
    return await prisma.actualizacion.findMany({
      orderBy: { fechalanzamiento: 'desc' },
    });
  } catch (err) {
    throw parsePrismaError(err);
  }
}



 /**
 * Crea una nueva fila en `Actualizacion`.
 *
 * @param nombre            Nombre o versión (ej. "v1.0.3").
 * @param fechalanzamiento  Fecha de lanzamiento (Date válido).
 * @param estado            Estado de la versión (ACTIVA o DESACTUALIZADA).
 *
 * @returns La fila creada.
 * @throws  Error si falla la operación o hay violación de unicidad.
 */
export async function crearActualizacion(
  nombre: string,
  fechalanzamiento: Date,
  estado: EstadoActualizacion = EstadoActualizacion.ACTIVA,
): Promise<Actualizacion> {
  try {
    return await prisma.actualizacion.create({
      data: { nombre, fechalanzamiento, estado },
    });
  } catch (err) {
    throw parsePrismaError(err);
  }
}

/**
 * Devuelve la actualización con fecha de lanzamiento más reciente,
 * o `null` si no hay registros.
 */
export async function obtenerUltimaActualizacion(): Promise<Actualizacion | null> {
  try {
    return await prisma.actualizacion.findFirst({
      orderBy: { fechalanzamiento: 'desc' },
    });
  } catch (err) {
    throw parsePrismaError(err);
  }
}

/**
 * Actualiza una fila en `Actualizacion`.
 *
 * @param id      ID de la fila a modificar.
 * @param cambios Objeto parcial con las claves a cambiar. Solo se admiten:
 *                - nombre
 *                - fechalanzamiento
 *                - estado  (enum EstadoActualizacion)
 *
 * @throws Error si:
 *   • No se envía ningún campo válido.
 *   • El registro no existe.
 *   • La BD arroja un error inesperado.
 */
export async function actualizarActualizacion(
  id: number,
  cambios: {
    nombre?: string;
    fechalanzamiento?: Date;
    estado?: EstadoActualizacion;
  },
): Promise<Actualizacion> {
  // Filtra las claves realmente modificables
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
    throw parsePrismaError(err);
  }
}
