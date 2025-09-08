// src/models/Servicios/LavadoTModel.ts
import { PrismaClient, LavadoT, ServicioEstado } from '@prisma/client';
import { movimientoError } from '../Movimientos/movimiento.logger';

const prisma: PrismaClient = (global as any).__PRISMA__ ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') (global as any).__PRISMA__ = prisma;

export class LavadoTModel {
  /** Crear registro de LavadoT. Status opcional (usa default de Prisma si no se pasa). */
  static async crear(input: {
    movimientoId: number;
    status?: ServicioEstado;
    inicio?: Date | null;
    fin?: Date | null;
  }): Promise<LavadoT> {
    const { movimientoId, status, inicio = null, fin = null } = input;
    try {
      const mov = await prisma.movimiento.findUnique({ where: { id: movimientoId }, select: { id: true } });
      if (!mov) throw new Error(`Movimiento ${movimientoId} no existe`);
      if (inicio && fin && fin < inicio) throw new Error('fin no puede ser anterior a inicio');

      return await prisma.lavadoT.create({
        data: { movimientoId, status: status as any, inicio, fin },
      });
    } catch (error: any) {
      movimientoError.error('Error creando LavadoT', {
        movimientoId, input, errName: error?.name, errMsg: error?.message, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al crear registro de lavado');
    }
  }

  /** Crear LavadoT sin fechas (para gatillar desde cierre de ronda). */
  static async crearEnBlanco(movimientoId: number, status?: ServicioEstado): Promise<LavadoT> {
    try {
      const mov = await prisma.movimiento.findUnique({ where: { id: movimientoId }, select: { id: true } });
      if (!mov) throw new Error(`Movimiento ${movimientoId} no existe`);
      return await prisma.lavadoT.create({
        data: { movimientoId, status: status as any, inicio: null, fin: null },
      });
    } catch (error: any) {
      movimientoError.error('Error creando LavadoT en blanco', {
        movimientoId, status, errName: error?.name, errMsg: error?.message, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al crear registro de lavado en blanco');
    }
  }

  /** Editar campos de LavadoT. */
  static async editar(
    id: number,
    input: { status?: ServicioEstado; inicio?: Date | null; fin?: Date | null }
  ): Promise<LavadoT> {
    try {
      const actual = await prisma.lavadoT.findUnique({ where: { id } });
      if (!actual) throw new Error(`LavadoT ${id} no existe`);

      const inicio = input.inicio === undefined ? actual.inicio : input.inicio;
      const fin = input.fin === undefined ? actual.fin : input.fin;
      if (inicio && fin && fin < inicio) throw new Error('fin no puede ser anterior a inicio');

      return await prisma.lavadoT.update({
        where: { id },
        data: {
          status: input.status ?? actual.status,
          inicio,
          fin,
        },
      });
    } catch (error: any) {
      movimientoError.error('Error editando LavadoT', {
        id, input, errName: error?.name, errMsg: error?.message, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al editar registro de lavado');
    }
  }

  /** Obtener detalles de LavadoT por id. */
  static async obtener(id: number): Promise<LavadoT> {
    try {
      const row = await prisma.lavadoT.findUnique({ where: { id } });
      if (!row) throw new Error(`LavadoT ${id} no existe`);
      return row;
    } catch (error: any) {
      movimientoError.error('Error obteniendo LavadoT', {
        id, errName: error?.name, errMsg: error?.message, prismaCode: error?.code, prismaMeta: error?.meta,
      });
      throw new Error('Error al obtener registro de lavado');
    }
  }
}
