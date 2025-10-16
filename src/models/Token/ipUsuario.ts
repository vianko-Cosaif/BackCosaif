// src/models/ipUsuario.service.ts
import { PrismaClient, DeviceType } from '@prisma/client';

const prisma = new PrismaClient();

/** Alta/actualización idempotente por PK compuesta */
export async function registrarIpUsuario(params: {
  usuarioId: number;
  ip: string;
  tipoDispositivo: DeviceType;
}) {
  const { usuarioId, ip, tipoDispositivo } = params;
  return prisma.ipUsuario.upsert({
    where: { usuarioId_ip_tipoDispositivo: { usuarioId, ip, tipoDispositivo } },
    update: {}, // no hay más campos por ahora
    create: { usuarioId, ip, tipoDispositivo },
  });
}

/** Lista IPs de un usuario */
export async function obtenerIpsDeUsuario(usuarioId: number) {
  return prisma.ipUsuario.findMany({
    where: { usuarioId },
    orderBy: { ip: 'asc' },
  });
}

/** Lista usuarios asociados a una IP */
export async function obtenerUsuariosPorIp(ip: string) {
  return prisma.ipUsuario.findMany({
    where: { ip },
    include: {
      usuario: { select: { id: true, nombre: true, rol: true, empresaId: true, localidadId: true } },
    },
  });
}

/** Elimina relación usuario-IP-dispositivo */
export async function eliminarIpUsuario(
  usuarioId: number,
  ip: string,
  tipoDispositivo: DeviceType,
) {
  return prisma.ipUsuario.delete({
    where: { usuarioId_ip_tipoDispositivo: { usuarioId, ip, tipoDispositivo } },
  });
}

/** Extrae IP del request detrás de proxy */
export function extraerIp(req: any): string | null {
  const xf = req?.headers?.['x-forwarded-for'] as string | undefined;
  const ip = xf?.split(',')[0]?.trim() || req?.ip || req?.connection?.remoteAddress || null;
  return ip;
}
