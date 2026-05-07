import { prismaTorno } from "../db/prisma";
import { EstadoRondaServicio } from "../../generated";

export async function sincronizarStatusRonda(rondaServicioId: number | null | undefined) {
  if (!rondaServicioId) return;

  const ronda = await prismaTorno.rondaServicio.findUnique({
    where: { id: rondaServicioId },
    select: { id: true, status: true },
  });
  if (!ronda || ronda.status === "CANCELADO" || ronda.status === "CONCLUIDO") return;

  const incidentesActivos = await prismaTorno.incidenteTorno.count({
    where: {
      rondaServicioId,
      OR: [{ resuelto: false }, { status: "EN_PROCESO" }],
    },
  });

  let nuevoStatus: EstadoRondaServicio | null = null;
  if (incidentesActivos > 0 && ronda.status !== EstadoRondaServicio.EN_PROCESO) {
    nuevoStatus = EstadoRondaServicio.EN_PROCESO;
  } else if (incidentesActivos === 0 && (ronda.status === EstadoRondaServicio.DETENIDO || ronda.status === EstadoRondaServicio.EN_PROCESO)) {
    nuevoStatus = EstadoRondaServicio.SOLICITADO;
  }

  if (nuevoStatus) {
    await prismaTorno.rondaServicio.update({
      where: { id: rondaServicioId },
      data: { status: nuevoStatus },
    });
  }
}
