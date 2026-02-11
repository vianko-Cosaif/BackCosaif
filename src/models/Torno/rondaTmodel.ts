import {
  PrismaClient,
  ServicioTipo,
  ServicioEstado,
  EstadoMovimiento,
} from "@prisma/client";

type ReordenItem = { servicioColaId: number; orden: number };

export class ModelTornoT {
  constructor(private prisma: PrismaClient) {}

  /* =========================
     Helpers
     ========================= */

  private async nextOrden(localidadId: number) {
    const max = await this.prisma.servicioCola.aggregate({
      where: {
        localidadId,
        tipo: ServicioTipo.TORNO,
        estado: { not: ServicioEstado.FINALIZADO },
      },
      _max: { orden: true },
    });
    return (max._max.orden ?? 0) + 1;
  }

  private async assertMovimientoConTorno(movimientoId: number) {
    const mov = await this.prisma.movimiento.findUnique({
      where: { id: movimientoId },
      select: {
        id: true,
        torno: true,
        estado: true,
        localidadId: true,
        empresaId: true,
      },
    });

    if (!mov) throw new Error("Movimiento no existe");
    if (!mov.torno) throw new Error("Movimiento no trae torno");
    if (mov.estado !== EstadoMovimiento.CONCLUIDO)
      throw new Error("Movimiento aún no está CONCLUIDO");

    return mov;
  }

  private async assertNoTornoActivoEnLocalidad(localidadId: number) {
    // “uno a la vez”: si hay un TornoT activo (EN_SERVICIO o DETENIDO) sin fin => no se puede iniciar otro
    const activo = await this.prisma.tornoT.findFirst({
      where: {
        localidadId,
        status: { in: [ServicioEstado.EN_SERVICIO, ServicioEstado.DETENIDO] },
        fin: null,
      },
      select: { id: true },
    });
    if (activo) throw new Error("Ya hay un torno activo en esta localidad");
  }

  /* =========================
     1) Generar/asegurar TornoT + encolar (ronda) desde movimiento concluido
     ========================= */
  async encolarDesdeMovimiento(movimientoId: number) {
    const mov = await this.assertMovimientoConTorno(movimientoId);

    return this.prisma.$transaction(async (tx) => {
      // 1) asegura TornoT (idempotente)
      let torno = await tx.tornoT.findFirst({
        where: { movimientoId, status: { not: ServicioEstado.FINALIZADO } },
      });

      if (!torno) {
        torno = await tx.tornoT.create({
          data: {
            movimientoId,
            localidadId: mov.localidadId,
            status: ServicioEstado.EN_SERVICIO, // aquí significa “activo”, no necesariamente “en atención”
          },
        });
      }

      // 2) asegura cola ServicioCola (movimientoId ya es @unique en ServicioCola)
      const existeCola = await tx.servicioCola.findUnique({
        where: { movimientoId },
      });

      if (!existeCola) {
        const orden = await this.nextOrden(mov.localidadId);

        await tx.servicioCola.create({
          data: {
            movimientoId,
            localidadId: mov.localidadId,
            empresaId: mov.empresaId,
            tipo: ServicioTipo.TORNO,
            estado: ServicioEstado.EN_SERVICIO, // semántica: “en cola/activo”
            orden,
          },
        });
      }

      return torno;
    });
  }

  /* =========================
     2) Ver cola (ronda) de torno por localidad
     ========================= */
  async obtenerCola(localidadId: number) {
    return this.prisma.servicioCola.findMany({
      where: {
        localidadId,
        tipo: ServicioTipo.TORNO,
        estado: { not: ServicioEstado.FINALIZADO },
      },
      orderBy: { orden: "asc" },
      include: {
        movimiento: true,
      },
    });
  }

  /* =========================
     3) Tomar siguiente (uno a la vez) => inicia TornoT del primer elemento en cola
     ========================= */
  async tomarSiguiente(localidadId: number) {
    await this.assertNoTornoActivoEnLocalidad(localidadId);

    return this.prisma.$transaction(async (tx) => {
      const siguiente = await tx.servicioCola.findFirst({
        where: {
          localidadId,
          tipo: ServicioTipo.TORNO,
          estado: ServicioEstado.EN_SERVICIO,
        },
        orderBy: { orden: "asc" },
      });

      if (!siguiente) return null;

      // inicia TornoT asociado (si no existe, lo crea para no romper)
      const torno = await tx.tornoT.findFirst({
        where: { movimientoId: siguiente.movimientoId, fin: null },
      });

      if (torno) {
        return tx.tornoT.update({
          where: { id: torno.id },
          data: { inicio: torno.inicio ?? new Date(), status: ServicioEstado.EN_SERVICIO },
        });
      }

      return tx.tornoT.create({
        data: {
          movimientoId: siguiente.movimientoId,
          localidadId,
          inicio: new Date(),
          status: ServicioEstado.EN_SERVICIO,
        },
      });
    });
  }

  /* =========================
     4) Pausar/Reanudar torno
     ========================= */
  async pausar(tornoId: number) {
    return this.prisma.tornoT.update({
      where: { id: tornoId },
      data: { status: ServicioEstado.DETENIDO },
    });
  }

  async reanudar(tornoId: number) {
    const torno = await this.prisma.tornoT.findUnique({
      where: { id: tornoId },
      select: { localidadId: true, fin: true },
    });
    if (!torno) throw new Error("Torno no existe");
    if (torno.fin) throw new Error("Torno ya está finalizado");

    await this.assertNoTornoActivoEnLocalidad(torno.localidadId);

    return this.prisma.tornoT.update({
      where: { id: tornoId },
      data: { status: ServicioEstado.EN_SERVICIO },
    });
  }

  /* =========================
     5) Finalizar torno (cierra TornoT + marca cola FINALIZADO)
     ========================= */
  async finalizarPorMovimiento(movimientoId: number) {
    return this.prisma.$transaction(async (tx) => {
      const torno = await tx.tornoT.findFirst({
        where: { movimientoId, fin: null },
      });
      if (!torno) throw new Error("No hay TornoT activo para este movimiento");

      const actualizado = await tx.tornoT.update({
        where: { id: torno.id },
        data: { status: ServicioEstado.FINALIZADO, fin: new Date() },
      });

      await tx.servicioCola.updateMany({
        where: { movimientoId, tipo: ServicioTipo.TORNO },
        data: { estado: ServicioEstado.FINALIZADO },
      });

      return actualizado;
    });
  }

  /* =========================
     6) Reordenar (editar “ronda”) de torno
     ========================= */
  async reordenar(items: ReordenItem[]) {
    return this.prisma.$transaction(
      items.map((it) =>
        this.prisma.servicioCola.update({
          where: { id: it.servicioColaId },
          data: { orden: it.orden },
        })
      )
    );
  }

  /* =========================
     7) Eliminar solicitud (saca de cola y borra TornoT si no inició)
     ========================= */
  async eliminarSolicitud(movimientoId: number) {
    return this.prisma.$transaction(async (tx) => {
      await tx.servicioCola.deleteMany({
        where: { movimientoId, tipo: ServicioTipo.TORNO },
      });

      // solo borra TornoT si no tiene inicio (si ya inició, que quede como histórico)
      await tx.tornoT.deleteMany({
        where: { movimientoId, inicio: null },
      });

      return true;
    });
  }
}
