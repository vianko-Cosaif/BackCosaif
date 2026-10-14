import { EstadoRondaTorreon, Prisma } from '../../../generated';
import { prismaTorreon } from '../../db/prisma';
import { DomainError } from '../../utils/domainError';

const ESTADOS_RONDA_ACTIVA: EstadoRondaTorreon[] = [EstadoRondaTorreon.ABIERTA, EstadoRondaTorreon.EN_PROCESO];

/** Read-only historical rounds. Natural operations use ColaNaturalModel. */
export class RondaModel {
  static async listar(query: { localidadId?: number; estado?: string }) {
    const estado = query.estado ? query.estado as EstadoRondaTorreon : undefined;
    const activeQuery = !estado || ESTADOS_RONDA_ACTIVA.includes(estado);

    return prismaTorreon.rondaTorreon.findMany({
      where: {
        ...(query.localidadId ? { localidadId: query.localidadId } : {}),
        estado: estado ?? { in: ESTADOS_RONDA_ACTIVA },
      },
      include: {
        movimientos: {
          include: {
            movimiento: true,
            bloqueadoPorIncidente: true,
          },
          orderBy: { orden: "asc" },
        },
      },
      orderBy: activeQuery
        ? [{ numeroRonda: "asc" }, { createdAt: "asc" }]
        : [{ numeroRonda: "desc" }, { createdAt: "desc" }],
      take: 100,
    });
  }

  static async obtener(id: number) {
    const ronda = await prismaTorreon.rondaTorreon.findUnique({
      where: { id },
      include: {
        movimientos: {
          include: {
            movimiento: true,
            bloqueadoPorIncidente: true,
          },
          orderBy: { orden: "asc" },
        },
      },
    });
    if (!ronda) throw new DomainError(404, "Ronda no encontrada");
    return ronda;
  }

  static async recalcularBloqueosLocalidad(_tx: Prisma.TransactionClient, _localidadId: number) {
    // Arrastre callers retain their existing signature without mutating archived natural rounds.
    return { rondasActivas: 0, movimientosEnCola: 0, bloqueados: 0, desbloqueados: 0 };
  }
}
