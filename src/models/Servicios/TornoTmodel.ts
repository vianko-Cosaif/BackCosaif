// src/models/Servicios/TornoTModel.ts
import { PrismaClient, TornoT } from '@prisma/client';
import { movimientoError } from '../Movimientos/movimiento.logger';

const prisma: PrismaClient = (global as any).__PRISMA__ ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') (global as any).__PRISMA__ = prisma;

export class TornoTModel {
  /** Crear registro de TornoT con o sin fechas. */
  static async crear(input: { movimientoId: number; inicio?: Date | null; fin?: Date | null }): Promise<TornoT> {
    const { movimientoId, inicio = null, fin = null } = input;
    try {
      const mov = await prisma.movimiento.findUnique({ where: { id: movimientoId }, select: { id: true } });
      if (!mov) throw new Error(`Movimiento ${movimientoId} no existe`);
      if (inicio && fin && fin < inicio) throw new Error('fin no puede ser anterior a inicio');

      return await prisma.tornoT.create({ data: { movimientoId, inicio, fin } });
    } catch (error: any) {
      movimientoError.error('Error creando TornoT', { movimientoId, errName: error?.name, errMsg: error?.message, prismaCode: error?.code, prismaMeta: error?.meta });
      throw new Error('Error al crear registro de torno');
    }
  }

  /** Crear registro de TornoT sin fechas (para gatillar desde cierre de ronda). */
  static async crearEnBlanco(movimientoId: number): Promise<TornoT> {
    try {
      const mov = await prisma.movimiento.findUnique({ where: { id: movimientoId }, select: { id: true } });
      if (!mov) throw new Error(`Movimiento ${movimientoId} no existe`);
      return await prisma.tornoT.create({ data: { movimientoId, inicio: null, fin: null } });
    } catch (error: any) {
      movimientoError.error('Error creando TornoT en blanco', { movimientoId, errName: error?.name, errMsg: error?.message, prismaCode: error?.code, prismaMeta: error?.meta });
      throw new Error('Error al crear registro de torno en blanco');
    }
  }

  /** Editar campos de TornoT. */
  static async editar(id: number, input: { inicio?: Date | null; fin?: Date | null }): Promise<TornoT> {
    try {
      const actual = await prisma.tornoT.findUnique({ where: { id } });
      if (!actual) throw new Error(`TornoT ${id} no existe`);

      const inicio = input.inicio === undefined ? actual.inicio : input.inicio;
      const fin = input.fin === undefined ? actual.fin : input.fin;
      if (inicio && fin && fin < inicio) throw new Error('fin no puede ser anterior a inicio');

      return await prisma.tornoT.update({ where: { id }, data: { inicio, fin } });
    } catch (error: any) {
      movimientoError.error('Error editando TornoT', { id, input, errName: error?.name, errMsg: error?.message, prismaCode: error?.code, prismaMeta: error?.meta });
      throw new Error('Error al editar registro de torno');
    }
  }

  /** Obtener detalles de TornoT por id. */
  static async obtener(id: number): Promise<TornoT> {
    try {
      const row = await prisma.tornoT.findUnique({ where: { id } });
      if (!row) throw new Error(`TornoT ${id} no existe`);
      return row;
    } catch (error: any) {
      movimientoError.error('Error obteniendo TornoT', { id, errName: error?.name, errMsg: error?.message, prismaCode: error?.code, prismaMeta: error?.meta });
      throw new Error('Error al obtener registro de torno');
    }
  }
}
