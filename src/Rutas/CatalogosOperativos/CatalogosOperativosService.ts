import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { LocalidadModel } from "../../models/Locolidad/localidadModel";
import { ViaModel } from "../../models/Via/viaModel";
import { proxyToTornoMs } from "../../services/tornoMs/tornoMsClient";

const localidadSchema = z.object({
  id: z.number().int().positive().optional(),
  nombre: z.string().trim().min(2).max(80),
  estado: z.string().trim().min(2).max(40).default("ACTIVA"),
});

const seccionSchema = z.object({
  numero: z.number().int().positive(),
  nombre: z.string().trim().max(80).optional().nullable(),
});

const viaSchema = z.object({
  id: z.number().int().positive().optional(),
  numero: z.number().int().positive(),
  nombre: z.string().trim().max(80).optional(),
  secciones: z.number().int().min(0).max(200).optional(),
  seccionesDetalle: z.array(seccionSchema).optional(),
});

const tornoConfigSchema = z.object({
  configurar: z.boolean().default(false),
  cantidadNavajas: z.number().int().min(0).max(500).default(0),
});

export const localidadOperativaPayloadSchema = z.object({
  localidad: localidadSchema,
  vias: z.array(viaSchema).min(1).max(300),
  viasEliminadas: z.array(z.number().int().positive()).max(300).default([]),
  torno: tornoConfigSchema.default({ configurar: false, cantidadNavajas: 0 }),
}).superRefine((payload, ctx) => {
  const numeros = new Set<number>();
  const nombres = new Set<string>();
  const ids = new Set<number>();
  const eliminadas = new Set(payload.viasEliminadas);

  payload.vias.forEach((via, index) => {
    if (numeros.has(via.numero)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["vias", index, "numero"], message: "Numero de via duplicado" });
    }
    numeros.add(via.numero);

    const nombre = (via.nombre?.trim() || `Via ${via.numero}`).toLocaleLowerCase("es-MX");
    if (nombres.has(nombre)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["vias", index, "nombre"], message: "Nombre de via duplicado" });
    }
    nombres.add(nombre);

    if (via.id) {
      if (ids.has(via.id)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["vias", index, "id"], message: "Via repetida en la solicitud" });
      }
      if (eliminadas.has(via.id)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["vias", index, "id"], message: "Una via no puede editarse y eliminarse al mismo tiempo" });
      }
      ids.add(via.id);
    }
  });
});

export type LocalidadOperativaPayload = z.infer<typeof localidadOperativaPayloadSchema>;

type Warning = {
  scope: "localidad" | "via" | "seccion" | "torno";
  message: string;
};

type NavaRecord = {
  id: number;
  localidadId: number;
  cantidad: number;
};

export class CatalogConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogConflictError";
  }
}

function unwrapArray(input: unknown): any[] {
  if (Array.isArray(input)) return input;
  if (input && typeof input === "object") {
    const source = input as Record<string, unknown>;
    if (Array.isArray(source.data)) return source.data;
    if (Array.isArray(source.items)) return source.items;
    if (Array.isArray(source.rows)) return source.rows;
  }
  return [];
}

function asPositiveInt(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeSectionPlan(via: z.infer<typeof viaSchema>) {
  if (via.seccionesDetalle?.length) {
    return via.seccionesDetalle
      .map((seccion) => ({
        numero: seccion.numero,
        nombre: seccion.nombre?.trim() || `Seccion ${seccion.numero}`,
      }))
      .sort((a, b) => a.numero - b.numero);
  }

  const count = via.secciones ?? 0;
  return Array.from({ length: count }, (_, index) => {
    const numero = index + 1;
    return { numero, nombre: `Seccion ${numero}` };
  });
}

async function fetchNavajas(): Promise<NavaRecord[]> {
  const response = await proxyToTornoMs("/navajas", { method: "GET" });
  return unwrapArray(response.data)
    .map((item) => ({
      id: Number(item?.id),
      localidadId: Number(item?.localidadId),
      cantidad: Number(item?.cantidad),
    }))
    .filter((item) => Number.isInteger(item.id) && Number.isInteger(item.localidadId));
}

async function upsertNavajas(localidadId: number, cantidad: number): Promise<NavaRecord | null> {
  if (cantidad <= 0) return null;

  const currentResponse = await proxyToTornoMs(`/navajas?localidadId=${localidadId}`, { method: "GET" });
  const current = unwrapArray(currentResponse.data).find(
    (item) => Number(item?.localidadId) === localidadId
  );

  if (current?.id) {
    const updated = await proxyToTornoMs(`/navajas/${current.id}`, {
      method: "PATCH",
      body: { cantidad },
    });
    const data = updated.data as Record<string, unknown>;
    return {
      id: Number(data.id),
      localidadId: Number(data.localidadId),
      cantidad: Number(data.cantidad),
    };
  }

  const created = await proxyToTornoMs("/navajas", {
    method: "POST",
    body: { localidadId, cantidad },
  });
  const data = created.data as Record<string, unknown>;
  return {
    id: Number(data.id),
    localidadId: Number(data.localidadId),
    cantidad: Number(data.cantidad),
  };
}

export class CatalogosOperativosService {
  static async resumen() {
    const warnings: Warning[] = [];
    const [localidades, navajas] = await Promise.all([
      prisma.localidad.findMany({
        orderBy: { nombre: "asc" },
        include: {
          vias: {
            orderBy: { numero: "asc" },
            include: { secciones: { orderBy: { numero: "asc" } } },
          },
        },
      }),
      fetchNavajas().catch((error) => {
        warnings.push({
          scope: "torno",
          message: `No se pudo leer la configuracion de Torno: ${error?.message ?? String(error)}`,
        });
        return [] as NavaRecord[];
      }),
    ]);

    const navajasByLocalidad = new Map(navajas.map((nava) => [nava.localidadId, nava]));

    return {
      localidades: localidades.map((localidad) => {
        const nava = navajasByLocalidad.get(localidad.id) ?? null;
        const secciones = localidad.vias.reduce((total, via) => total + via.secciones.length, 0);

        return {
          id: localidad.id,
          nombre: localidad.nombre,
          estado: localidad.estado,
          totalVias: localidad.vias.length,
          totalSecciones: secciones,
          vias: localidad.vias.map((via) => ({
            id: via.id,
            numero: via.numero,
            nombre: via.nombre,
            secciones: via.secciones.map((seccion) => ({
              id: seccion.id,
              numero: seccion.numero,
              nombre: seccion.nombre,
              ocupada: seccion.ocupada,
              movimientoId: seccion.movimientoId,
            })),
          })),
          torno: {
            configurado: Boolean(nava),
            navaId: nava?.id ?? null,
            cantidadNavajas: nava?.cantidad ?? 0,
          },
        };
      }),
      warnings,
    };
  }

  static async guardar(payload: LocalidadOperativaPayload) {
    const warnings: Warning[] = [];
    const result = await prisma.$transaction(async (tx) => {
      const localidad = payload.localidad.id
        ? await tx.localidad.update({
            where: { id: payload.localidad.id },
            data: {
              nombre: payload.localidad.nombre,
              estado: payload.localidad.estado,
            },
          })
        : await tx.localidad.upsert({
            where: { nombre: payload.localidad.nombre },
            create: {
              nombre: payload.localidad.nombre,
              estado: payload.localidad.estado,
            },
            update: { estado: payload.localidad.estado },
          });

      const viasEliminadas = [...new Set(payload.viasEliminadas)];
      if (viasEliminadas.length) {
        const candidates = await tx.via.findMany({
          where: { id: { in: viasEliminadas } },
          select: {
            id: true,
            numero: true,
            nombre: true,
            localidadId: true,
            ocupada: true,
            movimientoId: true,
            secciones: { select: { ocupada: true, movimientoId: true } },
            _count: { select: { movimientosOrigen: true, movimientosDestino: true } },
          },
        });

        if (candidates.length !== viasEliminadas.length) {
          throw new CatalogConflictError("Una de las vias que intentas eliminar ya no existe");
        }

        for (const candidate of candidates) {
          if (candidate.localidadId !== localidad.id) {
            throw new CatalogConflictError(`La via ${candidate.id} no pertenece a la localidad ${localidad.nombre}`);
          }

          const hasActiveOperation = candidate.ocupada || candidate.movimientoId != null ||
            candidate.secciones.some((seccion) => seccion.ocupada || seccion.movimientoId != null);
          const hasHistory = candidate._count.movimientosOrigen > 0 || candidate._count.movimientosDestino > 0;

          if (hasActiveOperation || hasHistory) {
            throw new CatalogConflictError(
              `No se puede eliminar ${candidate.nombre || `Via ${candidate.numero}`} porque tiene movimientos relacionados`
            );
          }

          await tx.via.delete({ where: { id: candidate.id } });
        }
      }

      const existingViaIds = payload.vias.flatMap((via) => via.id ? [via.id] : []);
      if (existingViaIds.length) {
        const existingVias = await tx.via.findMany({
          where: { id: { in: existingViaIds } },
          select: { id: true, localidadId: true },
        });
        if (existingVias.length !== existingViaIds.length) {
          throw new CatalogConflictError("Una de las vias que intentas editar ya no existe");
        }
        if (existingVias.some((via) => via.localidadId !== localidad.id)) {
          throw new CatalogConflictError(`Una de las vias no pertenece a la localidad ${localidad.nombre}`);
        }

        // Libera temporalmente las llaves unicas para permitir intercambiar numeros o nombres.
        for (const via of existingVias) {
          await tx.via.update({
            where: { id: via.id },
            data: {
              numero: -2_000_000_000 + via.id,
              nombre: `__catalogos_operativos_${localidad.id}_${via.id}`,
            },
          });
        }
      }

      const vias = [];
      for (const viaInput of payload.vias) {
        const existing = viaInput.id
          ? await tx.via.findUnique({ where: { id: viaInput.id } })
          : await tx.via.findUnique({
              where: {
                numero_localidadId: {
                  numero: viaInput.numero,
                  localidadId: localidad.id,
                },
              },
            });

        if (existing && existing.localidadId !== localidad.id) {
          throw new CatalogConflictError(`La via ${existing.id} no pertenece a la localidad ${localidad.nombre}`);
        }

        const via = existing
          ? await tx.via.update({
              where: { id: existing.id },
              data: {
                numero: viaInput.numero,
                nombre: viaInput.nombre?.trim() || `Via ${viaInput.numero}`,
              },
            })
          : await tx.via.create({
              data: {
                numero: viaInput.numero,
                nombre: viaInput.nombre?.trim() || `Via ${viaInput.numero}`,
                localidadId: localidad.id,
              },
            });

        const sectionPlan = normalizeSectionPlan(viaInput);
        const desiredSectionNumbers = new Set(sectionPlan.map((seccion) => seccion.numero));
        const currentSections = await tx.seccionVia.findMany({
          where: { viaId: via.id },
          select: { id: true, numero: true, ocupada: true, movimientoId: true },
        });
        const sectionsOutsidePlan = currentSections.filter(
          (seccion) => !desiredSectionNumbers.has(seccion.numero)
        );
        const removableSectionIds = sectionsOutsidePlan
          .filter((seccion) => !seccion.ocupada && seccion.movimientoId == null)
          .map((seccion) => seccion.id);
        const protectedSections = sectionsOutsidePlan.filter(
          (seccion) => seccion.ocupada || seccion.movimientoId != null
        );

        if (removableSectionIds.length) {
          await tx.seccionVia.deleteMany({ where: { id: { in: removableSectionIds } } });
        }
        if (protectedSections.length) {
          warnings.push({
            scope: "seccion",
            message: `Via ${via.numero}: ${protectedSections.length} seccion(es) ocupada(s) se conservaron para proteger la operacion.`,
          });
        }

        for (const seccion of sectionPlan) {
          await tx.seccionVia.upsert({
            where: {
              viaId_numero: {
                viaId: via.id,
                numero: seccion.numero,
              },
            },
            create: {
              viaId: via.id,
              numero: seccion.numero,
              nombre: seccion.nombre,
              ocupada: false,
              movimientoId: null,
            },
            update: {
              nombre: seccion.nombre,
            },
          });
        }

        const secciones = await tx.seccionVia.findMany({
          where: { viaId: via.id },
          orderBy: { numero: "asc" },
        });
        vias.push({ ...via, secciones });
      }

      return { localidad, vias };
    });

    LocalidadModel.invalidateLiteCache();
    ViaModel.invalidateLiteCache();

    let torno: NavaRecord | null = null;
    if (payload.torno.configurar) {
      try {
        torno = await upsertNavajas(result.localidad.id, payload.torno.cantidadNavajas);
      } catch (error: any) {
        warnings.push({
          scope: "torno",
          message: `Localidad y vias guardadas; no se pudo sincronizar Torno: ${error?.message ?? String(error)}`,
        });
      }
    }

    return {
      localidad: result.localidad,
      vias: result.vias.map((via) => ({
        id: via.id,
        numero: via.numero,
        nombre: via.nombre,
        localidadId: via.localidadId,
        secciones: via.secciones.map((seccion) => ({
          id: seccion.id,
          numero: seccion.numero,
          nombre: seccion.nombre,
          ocupada: seccion.ocupada,
          movimientoId: seccion.movimientoId,
        })),
      })),
      torno,
      warnings,
    };
  }
}
