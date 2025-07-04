/**
 * token.service.ts
 *
 * Servicio de acceso a datos para la entidad Token.
 *
 * Este módulo proporciona operaciones básicas sobre tokens generados para los usuarios.
 * Utiliza Prisma ORM como capa de persistencia y emplea un logger especializado para errores.
 *
 * Funcionalidades:
 * - Obtener todos los tokens con su relación al usuario.
 * - Crear y almacenar un nuevo token para un usuario específico.
 *
 * Dependencias:
 * - PrismaClient: cliente de base de datos para Prisma.
 * - tokenLogger: logger exclusivo para errores en operaciones con tokens.
 */

import { PrismaClient } from '@prisma/client';
import { tokenLogger } from './token.logger';

const prisma = new PrismaClient();

/**
 * Obtiene todos los tokens almacenados en la base de datos.
 * Incluye también los datos del usuario relacionado a cada token.
 *
 * @returns Lista de objetos token con relación al usuario.
 * @throws Error si ocurre un fallo en la consulta.
 */
export const obtenerTokens = async () => {
  try {
    return await prisma.token.findMany({
      include: { usuario: true },
    });
  } catch (error) {
    tokenLogger.error('Error al obtener tokens', { error });
    throw new Error('No se pudieron obtener los tokens');
  }
};

/**
 * Crea un nuevo token en la base de datos.
 * 
 * Este token queda asociado a un usuario específico, que debe existir previamente.
 *
 * @param token - Token generado (usualmente JWT o UUID).
 * @param usuarioId - ID del usuario al que se asigna el token.
 * @returns El token recién creado.
 * @throws Error si ocurre un fallo durante la creación del token.
 */
export const crearToken = async (token: string, usuarioId: number) => {
  try {
    return await prisma.token.create({
      data: { token, usuarioId },
    });
  } catch (error) {
    tokenLogger.error(`Error al crear token para usuario ID ${usuarioId}`, { error });
    throw new Error('Error inesperado al guardar el token');
  }
};
