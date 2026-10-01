import { Prisma } from "../../../generated";
import { prismaTorreon } from "../../db/prisma";
import { DomainError } from "../../utils/domainError";
import { saveCatalogoArrastreSchema } from "./catalogoArrastre.schemas";
import { z } from "zod";

type SaveCatalog = z.infer<typeof saveCatalogoArrastreSchema>;
type Tx = Prisma.TransactionClient;

const catalogInclude = {
  secciones: { where: { activa: true }, orderBy: [{ numero: "asc" as const }, { id: "asc" as const }] },
};

async function assertCompleteCatalog(tx: Tx, input: SaveCatalog) {
  const current = await tx.viaArrastreTorreon.findMany({
    where: { localidadId: input.localidadId },
    include: { secciones: true },
  });
  const incomingTrackIds = new Set(input.vias.flatMap((track) => track.id ? [track.id] : []));
  const missingTrack = current.find((track) => !incomingTrackIds.has(track.id));
  if (missingTrack) {
    throw new DomainError(409, `La vía “${missingTrack.nombre}” debe conservarse. Desactívala en una actualización posterior si deja de operar.`);
  }

  const currentById = new Map(current.map((track) => [track.id, track]));
  for (const track of input.vias) {
    if (!track.id) continue;
    const savedTrack = currentById.get(track.id);
    if (!savedTrack) throw new DomainError(400, `La vía ${track.id} no pertenece al patio de arrastre seleccionado.`);

    const incomingSectionIds = new Set(track.secciones.flatMap((section) => section.id ? [section.id] : []));
    const missingSection = savedTrack.secciones.find((section) => !incomingSectionIds.has(section.id));
    if (missingSection) {
      throw new DomainError(409, `La sección “${missingSection.nombre}” de ${savedTrack.nombre} debe conservarse.`);
    }
    const savedSectionIds = new Set(savedTrack.secciones.map((section) => section.id));
    const foreignSection = track.secciones.find((section) => section.id && !savedSectionIds.has(section.id));
    if (foreignSection?.id) {
      throw new DomainError(400, `La sección ${foreignSection.id} no pertenece a la vía ${savedTrack.nombre}.`);
    }
  }

  return current;
}

async function stageExistingRecords(tx: Tx, input: SaveCatalog) {
  const stamp = Date.now();
  for (const track of input.vias) {
    if (!track.id) continue;
    await tx.viaArrastreTorreon.update({
      where: { id: track.id },
      data: { numero: { increment: 1_000_000 }, nombre: `__tmp_arrastre_via_${track.id}_${stamp}` },
    });
    for (const section of track.secciones) {
      if (!section.id) continue;
      await tx.seccionArrastreTorreon.update({
        where: { id: section.id },
        data: { numero: { increment: 1_000_000 }, nombre: `__tmp_arrastre_seccion_${section.id}_${stamp}` },
      });
    }
  }
}

export class CatalogoArrastreModel {
  static async listar(localidadId: number) {
    return prismaTorreon.viaArrastreTorreon.findMany({
      where: { localidadId, activa: true },
      include: catalogInclude,
      orderBy: [{ numero: "asc" }, { id: "asc" }],
    });
  }

  static async guardar(input: SaveCatalog) {
    await prismaTorreon.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(927401)`;
      const [viaMax, sectionMax] = await Promise.all([
        tx.viaArrastreTorreon.aggregate({ _max: { id: true } }),
        tx.seccionArrastreTorreon.aggregate({ _max: { id: true } }),
      ]);
      let nextViaId = (viaMax._max.id ?? 0) + 1;
      let nextSectionId = (sectionMax._max.id ?? 0) + 1;

      await assertCompleteCatalog(tx, input);
      await stageExistingRecords(tx, input);

      for (const track of input.vias) {
        const savedTrack = track.id
          ? await tx.viaArrastreTorreon.update({
              where: { id: track.id },
              data: { numero: track.numero, nombre: track.nombre, activa: true },
            })
          : await tx.viaArrastreTorreon.create({
              data: { id: nextViaId++, localidadId: input.localidadId, numero: track.numero, nombre: track.nombre, activa: true },
            });

        for (const section of track.secciones) {
          if (section.id) {
            await tx.seccionArrastreTorreon.update({
              where: { id: section.id },
              data: { numero: section.numero, nombre: section.nombre, activa: true },
            });
          } else {
            await tx.seccionArrastreTorreon.create({
              data: { id: nextSectionId++, viaId: savedTrack.id, numero: section.numero, nombre: section.nombre, activa: true },
            });
          }
        }
      }
    });

    return this.listar(input.localidadId);
  }
}
