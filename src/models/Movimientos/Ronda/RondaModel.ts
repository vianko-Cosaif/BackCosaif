// RondaModel.ts
import { movimientoError } from "../movimiento.logger";
import {
  PrismaClient,
  Prisma,
  Ronda,
  Prioridad,
  TipoRonda,
} from "@prisma/client";

const prisma = new PrismaClient();

// ---- Config de política ----
const NIGHT_START_HOUR = 21; // 21:00
const NIGHT_END_HOUR = 4;    // 04:00
function esNocturno(d = new Date()) {
  const h = d.getHours();
  return h >= NIGHT_START_HOUR || h < NIGHT_END_HOUR;
}

// Prefijos temporales para identificar vías de servicio
const SERVICE_PREFIX: Record<Exclude<TipoRonda, "NATURAL">, string> = {
  LAVADO: "Lavado",
  TORNO: "Torno",
};

export class RondaModel {
  // =============== HELPERS BÁSICOS ===============

  private static async hayAltas(
    localidadId: number,
    tipoRonda: TipoRonda,
    tx: Prisma.TransactionClient = prisma
  ) {
    const c = await tx.ronda.count({
      where: {
        localidadId,
        tipoRonda,
        concluido: false,
        movimiento: { prioridad: "ALTA" as Prioridad },
      },
    });
    return c > 0;
  }

  private static async tamanoDeRonda(
    tx: Prisma.TransactionClient,
    localidadId: number,
    tipoRonda: TipoRonda,
    rondaNumero: number
  ) {
    return tx.ronda.count({
      where: { localidadId, tipoRonda, rondaNumero, concluido: false },
    });
  }

  /** Capacidad libre = secciones libres en vías de servicio */
  private static async capacidadLibreServicio(
    localidadId: number,
    tipo: Exclude<TipoRonda, "NATURAL">,
    tx: Prisma.TransactionClient = prisma
  ) {
    const prefix = SERVICE_PREFIX[tipo];
    const libres = await tx.seccionVia.count({
      where: {
        ocupada: false,
        via: { localidadId, nombre: { startsWith: prefix, mode: "insensitive" } },
      },
    });
    return libres;
  }

  /** Última empresa atendida (mirando cursor más reciente de cualquier cola) */
  private static async getLastEmpresaGlobal(localidadId: number, tx: Prisma.TransactionClient = prisma) {
    const curs = await tx.rondaCursor.findMany({
      where: { localidadId },
      orderBy: { updatedAt: "desc" },
      take: 1,
    });
    return curs[0]?.lastEmpresaId ?? null;
  }

  /** Tocar cursor de un tipo (alimenta el global por updatedAt) */
  private static async touchCursor(
    localidadId: number,
    tipoRonda: TipoRonda,
    empresaId: number,
    tx: Prisma.TransactionClient = prisma
  ) {
    await tx.rondaCursor.upsert({
      where: { localidadId_tipoRonda: { localidadId, tipoRonda } },
      create: { localidadId, tipoRonda, lastEmpresaId: empresaId },
      update: { lastEmpresaId: empresaId, updatedAt: new Date() },
    });
  }

  // =============== COMPACTACIÓN POR TIPO ===============

  public static async recomponerRondasLocalidad(
    localidadId: number,
    tx: Prisma.TransactionClient = prisma
  ) {
    await tx.ronda.deleteMany({ where: { localidadId, concluido: true } });

    for (const tipo of [TipoRonda.NATURAL, TipoRonda.LAVADO, TipoRonda.TORNO]) {
      const grupos = await tx.ronda.findMany({
        where: { localidadId, tipoRonda: tipo, concluido: false },
        select: { rondaNumero: true },
        distinct: ["rondaNumero"],
        orderBy: { rondaNumero: "asc" },
      });

      let idx = 1;
      for (const g of grupos) {
        if (g.rondaNumero !== idx) {
          await tx.ronda.updateMany({
            where: { localidadId, tipoRonda: tipo, rondaNumero: g.rondaNumero },
            data: { rondaNumero: idx },
          });
        }
        idx++;
      }
    }
  }

  private static async reordenarAltaFIFO(
    localidadId: number,
    tipoRonda: TipoRonda,
    tx: Prisma.TransactionClient = prisma
  ) {
    const altas = await tx.ronda.findMany({
      where: {
        localidadId,
        tipoRonda,
        rondaNumero: 1,
        concluido: false,
        movimiento: { prioridad: "ALTA" as Prioridad },
      },
      include: { movimiento: { select: { createdAt: true } } },
      orderBy: [{ movimiento: { createdAt: "asc" } }],
    });

    for (let i = 0; i < altas.length; i++) {
      const orden = i + 1;
      if (altas[i].orden !== orden) {
        await tx.ronda.update({ where: { id: altas[i].id }, data: { orden } });
      }
    }
  }

  private static async primeraRondaDisponibleParaBaja(
    localidadId: number,
    empresaId: number,
    tipoRonda: TipoRonda,
    tx: Prisma.TransactionClient = prisma
  ) {
    const existenAltas = await this.hayAltas(localidadId, tipoRonda, tx);
    let r = existenAltas ? 2 : 1;

    for (let steps = 0; steps < 200; steps++) {
      const yaEsta = await tx.ronda.count({
        where: { localidadId, tipoRonda, rondaNumero: r, concluido: false, empresaId },
      });
      if (yaEsta === 0) return r;
      r++;
    }

    const max = await tx.ronda.aggregate({
      where: { localidadId, tipoRonda, concluido: false },
      _max: { rondaNumero: true },
    });
    return (max._max.rondaNumero ?? 0) + 1;
  }

  // =============== PICKERS (UNO / VARIOS) ===============

  private static async pickUno(
    localidadId: number,
    tipoRonda: TipoRonda,
    avoidEmpresaId?: number | null,
    tx: Prisma.TransactionClient = prisma
  ) {
    const lista = await tx.ronda.findMany({
      where: { localidadId, tipoRonda, concluido: false },
      orderBy: [{ rondaNumero: "asc" }, { orden: "asc" }],
      take: 60,
    });
    if (lista.length === 0) return null;

    if (avoidEmpresaId) {
      const alt = lista.find((r) => r.empresaId !== avoidEmpresaId);
      return alt ?? lista[0];
    }
    return lista[0];
  }

  private static async pickVarios(
    localidadId: number,
    tipoRonda: TipoRonda,
    k: number,
    avoidEmpresaId?: number | null,
    tx: Prisma.TransactionClient = prisma
  ): Promise<Ronda[]> {
    if (k <= 0) return [];
    const buffer = await tx.ronda.findMany({
      where: { localidadId, tipoRonda, concluido: false },
      orderBy: [{ rondaNumero: "asc" }, { orden: "asc" }],
      take: 300,
    });

    const res: Ronda[] = [];
    let avoid = avoidEmpresaId ?? null;

    for (const r of buffer) {
      if (res.length >= k) break;
      if (avoid !== null && r.empresaId === avoid) continue;
      res.push(r);
      avoid = r.empresaId;
    }
    if (res.length < k) {
      for (const r of buffer) {
        if (res.length >= k) break;
        if (res.some((x) => x.id === r.id)) continue;
        res.push(r);
      }
    }
    return res.slice(0, k);
  }

  // =============== SELECCIÓN (UNO) ===============

  /**
   * UNO siguiente según política:
   * - Noche (21–04): primero LAVADO si hay cupo; si no, NATURAL; si no, TORNO si hay cupo; si no, NATURAL.
   * - Día: NATURAL; si no, LAVADO si hay cupo; si no, TORNO si hay cupo; si no, NATURAL.
   */
  static async obtenerSiguienteEnRonda(localidadId: number) {
    try {
      return await prisma.$transaction(async (tx) => {
        const avoid = await this.getLastEmpresaGlobal(localidadId, tx);
        const night = esNocturno();
        const capLav = await this.capacidadLibreServicio(localidadId, TipoRonda.LAVADO, tx);
        const capTor = await this.capacidadLibreServicio(localidadId, TipoRonda.TORNO, tx);

        if (night) {
          if (capLav > 0) {
            const r = await this.pickUno(localidadId, TipoRonda.LAVADO, avoid, tx);
            if (r) return { tipoRonda: TipoRonda.LAVADO, ronda: r };
          }
          const nat = await this.pickUno(localidadId, TipoRonda.NATURAL, avoid, tx);
          if (nat) return { tipoRonda: TipoRonda.NATURAL, ronda: nat };
          if (capTor > 0) {
            const t = await this.pickUno(localidadId, TipoRonda.TORNO, avoid, tx);
            if (t) return { tipoRonda: TipoRonda.TORNO, ronda: t };
          }
          const nat2 = await this.pickUno(localidadId, TipoRonda.NATURAL, null, tx);
          if (nat2) return { tipoRonda: TipoRonda.NATURAL, ronda: nat2 };
          return null;
        }

        // Día
        const nat = await this.pickUno(localidadId, TipoRonda.NATURAL, avoid, tx);
        if (nat) return { tipoRonda: TipoRonda.NATURAL, ronda: nat };
        if (capLav > 0) {
          const l = await this.pickUno(localidadId, TipoRonda.LAVADO, avoid, tx);
          if (l) return { tipoRonda: TipoRonda.LAVADO, ronda: l };
        }
        if (capTor > 0) {
          const t = await this.pickUno(localidadId, TipoRonda.TORNO, avoid, tx);
          if (t) return { tipoRonda: TipoRonda.TORNO, ronda: t };
        }
        const nat2 = await this.pickUno(localidadId, TipoRonda.NATURAL, null, tx);
        if (nat2) return { tipoRonda: TipoRonda.NATURAL, ronda: nat2 };
        return null;
      });
    } catch (error) {
      movimientoError.error("Error en obtenerSiguienteEnRonda", { localidadId, error });
      throw new Error("Error al obtener el siguiente en la ronda");
    }
  }

// === swaps entre rondas (robustos) ===
static async intercambiarMovimientosEntreRondas(rondaAId: number, rondaBId: number) {
  return prisma.$transaction(async (tx) => {
    const [A, B] = await Promise.all([
      tx.ronda.findUnique({ where: { id: rondaAId }, include: { movimiento: { select: { empresaId: true, localidadId: true, lavado: true, torno: true } } } }),
      tx.ronda.findUnique({ where: { id: rondaBId }, include: { movimiento: { select: { empresaId: true, localidadId: true, lavado: true, torno: true } } } }),
    ]);
    if (!A || !B) throw new Error("Rondas inválidas");
    if (A.concluido || B.concluido) throw new Error("No se puede intercambiar rondas concluidas");
    if (A.localidadId !== B.localidadId) throw new Error("Intercambio inválido: distinta localidad");
    if (A.tipoRonda !== B.tipoRonda) throw new Error("Intercambio inválido: distinto tipoRonda");

    // Verifica que los movimientos pertenezcan a la misma localidad
    if (A.movimiento.localidadId !== A.localidadId || B.movimiento.localidadId !== B.localidadId) {
      throw new Error("Movimiento/localidad inconsistente");
    }

    // Swap de movimientoId y sincronización de empresaId (manteniendo tipoRonda/rondaNumero/orden)
    await Promise.all([
      tx.ronda.update({
        where: { id: A.id },
        data: { movimientoId: B.movimientoId, empresaId: B.movimiento.empresaId },
      }),
      tx.ronda.update({
        where: { id: B.id },
        data: { movimientoId: A.movimientoId, empresaId: A.movimiento.empresaId },
      }),
    ]);

    const [A2, B2] = await Promise.all([
      tx.ronda.findUnique({ where: { id: A.id } }),
      tx.ronda.findUnique({ where: { id: B.id } }),
    ]);
    return [A2!, B2!];
  });
}

static async intercambiarMovimientoEnRonda(rondaId: number, nuevoMovimientoId: number) {
  return prisma.$transaction(async (tx) => {
    const [r, m] = await Promise.all([
      tx.ronda.findUnique({ where: { id: rondaId } }),
      tx.movimiento.findUnique({ where: { id: nuevoMovimientoId }, select: { empresaId: true, localidadId: true, lavado: true, torno: true } }),
    ]);
    if (!r) throw new Error("Ronda no encontrada");
    if (!m) throw new Error("Movimiento no encontrado");
    if (r.concluido) throw new Error("La ronda ya está concluida");
    if (m.localidadId !== r.localidadId) throw new Error("Movimiento de distinta localidad");

    // Enforce tipoRonda del movimiento contra la fila destino
    const tipoMovimiento: TipoRonda = m.lavado ? "LAVADO" : m.torno ? "TORNO" : "NATURAL";
    if (tipoMovimiento !== r.tipoRonda) {
      throw new Error("El movimiento no corresponde al tipo de esta ronda");
    }

    // Actualiza movimiento y empresa para mantener reglas de una-por-empresa-por-ronda
    const updated = await tx.ronda.update({
      where: { id: r.id },
      data: { movimientoId: nuevoMovimientoId, empresaId: m.empresaId },
    });
    return updated;
  });
}


static async intercambiarMovimientoEnRonda(rondaId: number, nuevoMovimientoId: number) {
  return prisma.ronda.update({
    where: { id: rondaId },
    data: { movimientoId: nuevoMovimientoId },
  });
}

// === wrappers de compatibilidad con código legado ===
static async marcarRondasDeMovimientoComoConcluidas(movimientoId: number) {
  const ids = await prisma.ronda.findMany({
    where: { movimientoId, concluido: false },
    select: { id: true },
  });
  await this.marcarRondasComoConcluidas(ids.map(r => r.id));
}

static async removerDeTodasLasRondas(movimientoId: number, tx?: Prisma.TransactionClient) {
  const db = tx ?? prisma;
  await db.ronda.deleteMany({ where: { movimientoId } });
}

  // =============== SELECCIÓN (BATCH / SIMULTÁNEO) ===============

  /**
   * BATCH multi-cola:
   * - NATURAL: hasta `maxNaturales` (por defecto 2 en diurno, 0 en nocturno si hay cupo de lavado).
   * - LAVADO: hasta `capacidadLavado` (secciones libres).
   * - TORNO:  hasta `capacidadTorno`  (secciones libres).
   * Siempre rota empresas (uno-y-uno) dentro del lote.
   */
  static async obtenerSiguientesDisponibles(
    localidadId: number,
    opts?: { maxNaturales?: number }
  ) {
    const night = esNocturno();
    const maxNatDefault = night ? 0 : 2; // de día sacamos 2 NATURAL por defecto; de noche 0 si hay cupo de lavado
    const maxNaturalesParam = typeof opts?.maxNaturales === "number" ? opts!.maxNaturales : maxNatDefault;

    try {
      return await prisma.$transaction(async (tx) => {
        const avoid0 = await this.getLastEmpresaGlobal(localidadId, tx);
        const capLav = await this.capacidadLibreServicio(localidadId, TipoRonda.LAVADO, tx);
        const capTor = await this.capacidadLibreServicio(localidadId, TipoRonda.TORNO, tx);

        const picks = {
          NATURAL: [] as Ronda[],
          LAVADO: [] as Ronda[],
          TORNO: [] as Ronda[],
        };

        let avoid = avoid0 ?? null;

        // NATURAL (batch)
        // Regla nocturna: si hay cupo de LAVADO, NATURAL queda en 0; si no hay cupo, sí podemos sacar NATURAL.
        const maxNat =
          night && capLav > 0
            ? 0
            : Math.max(0, maxNaturalesParam);

        if (maxNat > 0) {
          const naturals = await this.pickVarios(localidadId, TipoRonda.NATURAL, maxNat, avoid, tx);
          picks.NATURAL.push(...naturals);
          avoid = naturals.at(-1)?.empresaId ?? avoid;
        }

        // LAVADO
        if (capLav > 0) {
          const lavs = await this.pickVarios(localidadId, TipoRonda.LAVADO, capLav, avoid, tx);
          picks.LAVADO.push(...lavs);
          avoid = lavs.at(-1)?.empresaId ?? avoid;
        }

        // TORNO
        if (capTor > 0) {
          const tors = await this.pickVarios(localidadId, TipoRonda.TORNO, capTor, avoid, tx);
          picks.TORNO.push(...tors);
          avoid = tors.at(-1)?.empresaId ?? avoid;
        }

        return {
          night,
          capacidad: { lavado: capLav, torno: capTor },
          picks,
        };
      });
    } catch (error) {
      movimientoError.error("Error en obtenerSiguientesDisponibles", { localidadId, error });
      throw new Error("Error al obtener los siguientes disponibles");
    }
  }

  // =============== CREACIÓN / ENCOLADO ===============

  static async eliminarTodasLasRondas() {
    await prisma.ronda.deleteMany({});
  }

  static async generarRondaInteligente() {
    await this.crearTodasLasRondas();
    return this.obtenerRondas();
  }

  private static async crearTodasLasRondas() {
    return prisma.$transaction(async (tx) => {
      await tx.ronda.deleteMany({});
      const movs = await tx.movimiento.findMany({
        where: { estado: "SOLICITADO" },
        orderBy: [{ createdAt: "asc" }],
      });

      const bucket = {
        [TipoRonda.NATURAL]: [] as typeof movs,
        [TipoRonda.LAVADO]: [] as typeof movs,
        [TipoRonda.TORNO]: [] as typeof movs,
      };
      for (const m of movs) {
        const tipo: TipoRonda = m.lavado ? TipoRonda.LAVADO : m.torno ? TipoRonda.TORNO : TipoRonda.NATURAL;
        bucket[tipo].push(m);
      }

      for (const tipo of [TipoRonda.NATURAL, TipoRonda.LAVADO, TipoRonda.TORNO]) {
        // ALTAS → ronda 1 FIFO
        const altas = bucket[tipo].filter((m) => m.prioridad === "ALTA");
        const locs = Array.from(new Set(altas.map((m) => m.localidadId)));
        for (const loc of locs) {
          const locAltas = altas.filter((m) => m.localidadId === loc);
          let ordenR1 = 1;
          for (const m of locAltas) {
            await tx.ronda.create({
              data: {
                movimientoId: m.id,
                empresaId: m.empresaId,
                localidadId: m.localidadId,
                tipoRonda: tipo,
                rondaNumero: 1,
                orden: ordenR1++,
              },
            });
          }
        }

        // BAJAS → una por empresa por ronda, arrancando en 2 si hay ALTAS
        const bajas = bucket[tipo].filter((m) => m.prioridad === "BAJA");
        const locsB = Array.from(new Set(bajas.map((m) => m.localidadId)));
        for (const loc of locsB) {
          const hayAlt = (await this.hayAltas(loc, tipo, tx)) || false;
          const inicio = hayAlt ? 2 : 1;

          const empresasPorRonda = new Map<number, Set<number>>();
          if (!hayAlt) empresasPorRonda.set(1, new Set());
          const registrar = (r: number, e: number) => {
            if (!empresasPorRonda.has(r)) empresasPorRonda.set(r, new Set());
            empresasPorRonda.get(r)!.add(e);
          };

          for (const m of bajas.filter((x) => x.localidadId === loc)) {
            let r = inicio;
            for (;;) {
              const set = empresasPorRonda.get(r) ?? new Set<number>();
              if (!set.has(m.empresaId)) {
                const ord = (await this.tamanoDeRonda(tx, loc, tipo, r)) + 1;
                await tx.ronda.create({
                  data: {
                    movimientoId: m.id,
                    empresaId: m.empresaId,
                    localidadId: m.localidadId,
                    tipoRonda: tipo,
                    rondaNumero: r,
                    orden: ord,
                  },
                });
                registrar(r, m.empresaId);
                break;
              }
              r++;
            }
          }
        }
      }

      const locsAll = await tx.ronda.findMany({
        select: { localidadId: true },
        distinct: ["localidadId"],
      });
      for (const { localidadId } of locsAll) {
        await this.recomponerRondasLocalidad(localidadId, tx);
      }
    });
  }

  static async generarRondaParaMovimiento(data:
    | { movimientoId: number; empresaId: number; localidadId: number; prioridad: "ALTA" | "BAJA"; tipoRonda: TipoRonda }
    | { movimientoId: number; empresaId: number; localidadId: number; prioridad: "ALTA" | "BAJA"; tipoRonda?: undefined }
  ) {
    return prisma.$transaction(async (tx) => {
      let tipo: TipoRonda;
      if ("tipoRonda" in data && data.tipoRonda) {
        tipo = data.tipoRonda;
      } else {
        const mv = await tx.movimiento.findUnique({
          where: { id: data.movimientoId },
          select: { lavado: true, torno: true },
        });
        tipo = mv?.lavado ? TipoRonda.LAVADO : mv?.torno ? TipoRonda.TORNO : TipoRonda.NATURAL;
      }

      const ya = await tx.ronda.findFirst({ where: { movimientoId: data.movimientoId, tipoRonda: tipo } });
      if (ya) return ya;

      if (data.prioridad === "ALTA") {
        const ord = (await this.tamanoDeRonda(tx, data.localidadId, tipo, 1)) + 1;
        const r = await tx.ronda.create({
          data: {
            movimientoId: data.movimientoId,
            empresaId: data.empresaId,
            localidadId: data.localidadId,
            tipoRonda: tipo,
            rondaNumero: 1,
            orden: ord,
          },
        });
        await this.reordenarAltaFIFO(data.localidadId, tipo, tx);
        await this.recomponerRondasLocalidad(data.localidadId, tx);
        return r;
      }

      const rnum = await this.primeraRondaDisponibleParaBaja(data.localidadId, data.empresaId, tipo, tx);
      const ord = (await this.tamanoDeRonda(tx, data.localidadId, tipo, rnum)) + 1;
      const r = await tx.ronda.create({
        data: {
          movimientoId: data.movimientoId,
          empresaId: data.empresaId,
          localidadId: data.localidadId,
          tipoRonda: tipo,
          rondaNumero: rnum,
          orden: ord,
        },
      });
      await this.recomponerRondasLocalidad(data.localidadId, tx);
      return r;
    });
  }

  // =============== INCIDENTES (por tipo) ===============

  static async aplicarIncidente(localidadId: number, movimientoId: number) {
    const ronda = await prisma.ronda.findFirst({
      where: { localidadId, movimientoId, concluido: false },
      include: { movimiento: true },
    });
    if (!ronda) return;
    if (ronda.movimiento.prioridad === "ALTA") {
      await this._incidenteAlta(ronda);
    } else {
      await this._incidenteBaja(ronda);
    }
  }

private static async _incidenteAlta(ronda: Ronda & { movimiento: { prioridad: string } }) {
  await prisma.$transaction(async (tx) => {
    const { localidadId, tipoRonda } = ronda;

    // ALTAS en R1 (mismo tipo)
    const altasR1 = await tx.ronda.findMany({
      where: {
        localidadId, tipoRonda, rondaNumero: 1, concluido: false,
        movimiento: { prioridad: "ALTA" as Prioridad },
      },
      orderBy: { orden: "asc" },
    });

    // Caso: varias ALTAS ⇒ enviar esta al final de R1 (FIFO)
    if (altasR1.length > 1) {
      const actual = altasR1.find(a => a.id === ronda.id);
      if (actual) {
        // compacta hueco en R1
        await tx.ronda.updateMany({
          where: { localidadId, tipoRonda, rondaNumero: 1, concluido: false, orden: { gt: actual.orden } },
          data: { orden: { decrement: 1 } },
        });
        const maxOrden = await tx.ronda.count({ where: { localidadId, tipoRonda, rondaNumero: 1, concluido: false } });
        await tx.ronda.update({ where: { id: actual.id }, data: { rondaNumero: 1, orden: maxOrden } });
      }
      await this.reordenarAltaFIFO(localidadId, tipoRonda, tx);
      await this.recomponerRondasLocalidad(localidadId, tx);
      return;
    }

    // Caso: ÚNICA ALTA ⇒ intentar swap R1:1 con R2:1
    const r1Primera = await tx.ronda.findFirst({
      where: { localidadId, tipoRonda, rondaNumero: 1, concluido: false },
      orderBy: { orden: "asc" },
    });
    const r2Primera = await tx.ronda.findFirst({
      where: { localidadId, tipoRonda, rondaNumero: 2, concluido: false },
      orderBy: { orden: "asc" },
    });

    if (r1Primera && r2Primera) {
      // swap posicional usando moverRonda
      await this.moverRonda(tx, r1Primera, 2, 1);
      const r2Ref = await tx.ronda.findUnique({ where: { id: r2Primera.id } });
      if (r2Ref) await this.moverRonda(tx, r2Ref, 1, 1);
      await this.reordenarAltaFIFO(localidadId, tipoRonda, tx);
      await this.recomponerRondasLocalidad(localidadId, tx);
      return;
    }

    // Si no existe R2 todavía, NO mover (mantén posición actual)
    await this.reordenarAltaFIFO(localidadId, tipoRonda, tx);
    await this.recomponerRondasLocalidad(localidadId, tx);
  });
}


  private static async _incidenteBaja(ronda: Ronda & { movimiento: { prioridad: string } }) {
    await prisma.$transaction(async (tx) => {
      const { localidadId, empresaId, tipoRonda } = ronda;
      const siguiente = await tx.ronda.findFirst({
        where: { localidadId, tipoRonda, concluido: false, empresaId, rondaNumero: { gt: ronda.rondaNumero } },
        orderBy: [{ rondaNumero: "asc" }, { orden: "asc" }],
      });

      if (siguiente) {
        const posA = { r: ronda.rondaNumero, o: ronda.orden };
        const posB = { r: siguiente.rondaNumero, o: siguiente.orden };

        await tx.ronda.updateMany({
          where: { localidadId, tipoRonda, rondaNumero: posB.r, concluido: false, orden: { gte: posB.o } },
          data: { orden: { increment: 1 } },
        });
        await tx.ronda.update({ where: { id: ronda.id }, data: { rondaNumero: posB.r, orden: posB.o } });
        await tx.ronda.updateMany({
          where: { localidadId, tipoRonda, rondaNumero: posA.r, concluido: false, orden: { gt: posA.o } },
          data: { orden: { decrement: 1 } },
        });
        await tx.ronda.updateMany({
          where: { localidadId, tipoRonda, rondaNumero: posA.r, concluido: false, orden: { gte: posA.o } },
          data: { orden: { increment: 1 } },
        });
        await tx.ronda.update({ where: { id: siguiente.id }, data: { rondaNumero: posA.r, orden: posA.o } });
      } else {
        const proxRonda = ronda.rondaNumero + 1;
        const tam = await this.tamanoDeRonda(tx, localidadId, tipoRonda, proxRonda);
        if (tam > 0) {
          await this.moverRonda(tx, ronda, proxRonda, tam + 1);
        } else {
          const max = await tx.ronda.aggregate({
            where: { localidadId, tipoRonda, concluido: false },
            _max: { rondaNumero: true },
          });
          const nueva = (max._max.rondaNumero ?? 0) + 1;
          await this.moverRonda(tx, ronda, nueva, 1);
        }
      }

      await this.recomponerRondasLocalidad(localidadId, tx);
    });
  }

  private static async moverRonda(
    tx: Prisma.TransactionClient,
    ronda: Ronda,
    toRondaNumero: number,
    toOrden: number
  ) {
    const { localidadId, tipoRonda, rondaNumero: fromRonda, orden: fromOrden, id } = ronda;
    await tx.ronda.updateMany({
      where: { localidadId, tipoRonda, rondaNumero: fromRonda, concluido: false, orden: { gt: fromOrden } },
      data: { orden: { decrement: 1 } },
    });
    await tx.ronda.updateMany({
      where: { localidadId, tipoRonda, rondaNumero: toRondaNumero, concluido: false, orden: { gte: toOrden } },
      data: { orden: { increment: 1 } },
    });
    await tx.ronda.update({ where: { id }, data: { rondaNumero: toRondaNumero, orden: toOrden } });
  }

  private static async limpiarYReorganizarRondasConcluidas() {
    const locs = await prisma.ronda.findMany({ select: { localidadId: true }, distinct: ["localidadId"] });
    for (const { localidadId } of locs) {
      await prisma.$transaction(async (tx) => {
        await tx.ronda.deleteMany({ where: { localidadId, concluido: true } });
        await this.recomponerRondasLocalidad(localidadId, tx);
      });
    }
  }

  // =============== API DE CONSULTA ===============

  static async obtenerRondas() {
    try {
      return await prisma.ronda.findMany({
        include: {
          empresa: true,
          movimiento: { include: { empresa: true } },
        },
        orderBy: [{ tipoRonda: "asc" }, { rondaNumero: "asc" }, { orden: "asc" }],
      });
    } catch (error) {
      movimientoError.error("Error al obtener rondas", { error });
      throw new Error("Error al obtener rondas");
    }
  }

  static async eliminarRonda(id: number) {
    try {
      return await prisma.ronda.delete({ where: { id } });
    } catch (error) {
      movimientoError.error("Error al eliminar ronda", { id, error });
      throw new Error("Error al eliminar ronda");
    }
  }

  static async obtenerRondasPorLocalidad(localidadId: number) {
    try {
      return await prisma.ronda.findMany({
        where: { localidadId },
        include: {
          empresa: true,
          movimiento: {
            include: {
              empresa: true,
              viaOrigen: { select: { nombre: true } },
              viaDestino: { select: { nombre: true } },
            },
          },
        },
        orderBy: [{ tipoRonda: "asc" }, { rondaNumero: "asc" }, { orden: "asc" }],
      });
    } catch (error) {
      movimientoError.error("Error al obtener rondas por localidad", { localidadId, error });
      throw new Error("Error al obtener rondas por localidad");
    }
  }

  static async obtenerRondasPorLocalidadConEstado(localidadId: number, concluido: boolean) {
    try {
      return await prisma.ronda.findMany({
        where: { localidadId, concluido },
        include: {
          empresa: true,
          movimiento: {
            select: {
              id: true,
              locomotiveNumber: true,
              createdAt: true,
              estado: true,
              lavado: true,
              torno: true,
              prioridad: true,
              viaOrigen: { select: { nombre: true } },
              viaDestino: { select: { nombre: true } },
            },
          },
        },
        orderBy: [{ tipoRonda: "asc" }, { rondaNumero: "asc" }, { orden: "asc" }],
      });
    } catch (error) {
      movimientoError.error("Error al obtener rondas por localidad y estado", { localidadId, concluido, error });
      throw new Error("Error al obtener rondas por localidad y estado");
    }
  }

  // =============== MARCADO COMO CONCLUIDO (BATCH) ===============

  /**
   * Marca varias rondas como concluidas EN ORDEN y actualiza cursors
   * (para mantener el uno-y-uno global en el siguiente ciclo).
   */
  static async marcarRondasComoConcluidas(ids: number[]) {
    if (!ids?.length) return [];
    return prisma.$transaction(async (tx) => {
      const rondas = await tx.ronda.findMany({
        where: { id: { in: ids } },
        orderBy: [{ tipoRonda: "asc" }, { rondaNumero: "asc" }, { orden: "asc" }],
      });
      for (const r of rondas) {
        await tx.ronda.update({ where: { id: r.id }, data: { concluido: true, updatedAt: new Date() } });
        await this.touchCursor(r.localidadId, r.tipoRonda, r.empresaId, tx);
      }
      if (rondas[0]) {
        await this.recomponerRondasLocalidad(rondas[0].localidadId, tx);
      }
      return rondas;
    });
  }

  // =============== INFO / UTIL ===============

  static async obtenerInfoPorRonda(id: number) {
    try {
      const info = await prisma.ronda.findUnique({
        where: { id },
        include: {
          empresa: true,
          movimiento: { include: { viaOrigen: true, viaDestino: true } },
        },
      });
      if (!info) throw new Error(`Ronda con ID ${id} no encontrada`);
      return {
        rondaId: info.id,
        tipoRonda: info.tipoRonda,
        rondaNumero: info.rondaNumero,
        orden: info.orden,
        concluido: info.concluido,
        empresa: info.empresa,
        movimiento: {
          id: info.movimiento.id,
          prioridad: info.movimiento.prioridad,
          viaOrigen: info.movimiento.viaOrigen,
          viaDestino: info.movimiento.viaDestino,
          lavado: info.movimiento.lavado,
          torno: info.movimiento.torno,
        },
      };
    } catch (error: any) {
      movimientoError.error("Error al obtener info de ronda", { id, error });
      throw new Error("Error al obtener info de ronda");
    }
  }

  static async marcarRondaComoConcluida(id: number) {
    try {
      const r = await prisma.ronda.update({
        where: { id },
        data: { concluido: true, updatedAt: new Date() },
      });
      await this.touchCursor(r.localidadId, r.tipoRonda, r.empresaId);
      await this.recomponerRondasLocalidad(r.localidadId);
      return r;
    } catch (error) {
      movimientoError.error("Error al marcar ronda como concluida", { id, error });
      throw new Error("Error al marcar ronda como concluida");
    }
  }
}
