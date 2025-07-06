/**
 * logoutController.ts
 * 
 * Controlador responsable de gestionar el cierre de sesión del usuario.
 * 
 * Funcionalidad principal:
 * - Revocar el token JWT actual del usuario (identificado por su `jti`).
 * - El token se guarda en la base de datos como parte de la estrategia de "token blacklist" para invalidar sesiones futuras.
 * 
 * Dependencias:
 * - Express: Para manejar la solicitud y respuesta HTTP.
 * - Prisma Client: ORM para interactuar con la base de datos.
 * 
 * Requisitos:
 * - El middleware previo debe haber verificado el JWT y haber adjuntado el payload en `req.user`.
 * - Se espera que el payload contenga el ID del usuario y el `jti` (JWT ID).
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

// Extiende la interfaz Request para incluir 'user'
declare global {
  namespace Express {
    interface Request {
      user?: { id: number; jti?: string };
    }
  }
}

const prisma = new PrismaClient();

/**
 * Método `logout`
 * 
 * Revoca el token actual de sesión.
 * El `jti` se utiliza como identificador del token y se almacena en la base de datos,
 * permitiendo verificar su revocación en solicitudes futuras.
 * 
 * @param req - Objeto de solicitud HTTP, se espera que contenga `req.user` con el payload JWT.
 * @param res - Objeto de respuesta HTTP.
 * @returns JSON indicando éxito o error.
 */
export const logout = async (req: Request, res: Response) => {
  try {
    const jwtPayload = req.user as { id: number; jti?: string };

    // Verificación básica del token y su identificador único (jti)
    if (!jwtPayload || !jwtPayload.jti) {
      return res.status(400).json({ error: 'Token inválido o no contiene jti' });
    }

    // Se registra el token como revocado en la tabla correspondiente
    await prisma.token.create({
      data: {
        token: jwtPayload.jti,
        usuarioId: jwtPayload.id,
      },
    });

    return res.json({ message: 'Token revocado correctamente' });
  } catch (err) {
    // Manejo de errores genéricos de servidor
    return res.status(500).json({ error: 'Error al revocar token', details: err });
  }
};
