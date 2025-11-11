// src/models/RondaModel.ts
import { movimientoError } from "../movimiento.logger";
import type { Prisma, Ronda } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import admin from 'firebase-admin';

const prisma = new PrismaClient();
type Tx = Prisma.TransactionClient;

// ================== CONFIG / CONSTANTES ==================
const HOLD10M_MS = 10 * 60 * 1000;
const CAP_SLOTS_POR_RONDA = 4; // 4 posiciones totales por ronda

// HOLD 10 MIN (INCIDENTE CERRADO/NO RESUELTO, SOLO 1 VEZ)
const _hold10m = new Map<number, number>();     // movimientoId -> expiresAt
const _hold10mOnce = new Set<number>();         // ya aplicado una vez
function _isOnHold(movId: number) {
  const exp = _hold10m.get(movId);
  if (!exp) return false;
  if (Date.now() > exp) { _hold10m.delete(movId); return false; }
  return true;
}

// FCM (solo fin de servicio)
function ensureAdmin() {
  if (!admin.apps?.length) admin.initializeApp();
}
async function tokensDeUsuarios(ids: number[], tx: Tx = prisma) {
  if (!ids.length) return [];
  const usuarios = await tx.usuario.findMany({
    where: { id: { in: ids }, activo: true },
    include: { fcmTokens: true }
  });
  return usuarios.flatMap(u => (u.fcmTokens ?? []).map(t => t.token).filter(Boolean));
}

// GUARDAS
const MAX_GUARD_ITERS = 1000;
const MAX_SCAN_ROUNDS = 500;

// ================== MODELO ==================
export class RondaModel {
  // ---------- HELPERS CRUD RONDA ----------
  private static async tamanoDeRonda(tx: Tx, localidadId: number, rondaNumero: number) {
    // sólo activos (concluido: false)
    return tx.ronda.count({ where: { localidadId, rondaNumero, concluido: false } });
  }

  private static async tamanoDeRondaTotal(tx: Tx, localidadId: number, rondaNumero: number) {
    // totales, incluyendo placeholders concluidos
    return tx.ronda.count({ where: { localidadId, rondaNumero } });
  }

  private static async maxRondaNumero(tx: Tx, localidadId: number) {
    const agg = await tx.ronda.aggregate({
      where: { localidadId },
      _max: { rondaNumero: true }
    });
    return agg._max.rondaNumero ?? 0;
  }

  private static async primeraRondaConCapacidad(tx: Tx, localidadId: number, desdeRonda: number) {
    let r = Math.max(1, desdeRonda);
    for (let guard = 0; guard < MAX_SCAN_ROUNDS; guard++, r++) {
      const total = await this.tamanoDeRondaTotal(tx, localidadId, r);
      if (total < CAP_SLOTS_POR_RONDA) return r;
    }
    const max = await this.maxRondaNumero(tx, localidadId);
    return Math.max(r, max + 1);
  }

  private static async primeraRondaLibreParaEmpresa(
    tx: Tx, localidadId: number, empresaId: number, desdeRonda: number
  ): Promise<number> {
    let r = Math.max(1, desdeRonda);
    for (let guard = 0; guard < MAX_SCAN_ROUNDS; guard++) {
      const c = await tx.ronda.count({
        where: { localidadId, rondaNumero: r, empresaId, concluido: false }
      });
      const total = await this.tamanoDeRondaTotal(tx, localidadId, r);
      if (c === 0 && total < CAP_SLOTS_POR_RONDA) return r;
      r++;
    }
    const max = await this.maxRondaNumero(tx, localidadId);
    return Math.max(r, max + 1);
  }

  private static async insertarEnPosicion(
    tx: Tx,
    localidadId: number,
    rondaNumero: number,
    orden: number,
    data: Omit<Ronda, 'id'|'createdAt'|'updatedAt'|'concluido'|'rondaNumero'|'orden'>,
  ) {
    // respetar capacidad de 4 por ronda
    let targetRonda = rondaNumero;
    let total = await this.tamanoDeRondaTotal(tx, localidadId, targetRonda);
    if (total >= CAP_SLOTS_POR_RONDA) {
      targetRonda = await this.primeraRondaConCapacidad(tx, localidadId, targetRonda + 1);
      orden = (await this.tamanoDeRonda(tx, localidadId, targetRonda)) + 1;
    }

    await tx.ronda.updateMany({
      where: { localidadId, rondaNumero: targetRonda, concluido: false, orden: { gte: orden } },
      data: { orden: { increment: 1 } },
    });
    return tx.ronda.create({ data: { ...data, localidadId, rondaNumero: targetRonda, orden } as any });
  }

  private static async moverRonda(tx: Tx, row: Ronda, targetRonda: number, targetOrden: number): Promise<Ronda> {
    if (targetRonda < 1) targetRonda = 1;
    if (targetOrden < 1) targetOrden = 1;

    // Si la ronda destino está llena, busca la siguiente con capacidad
    let dest = targetRonda;
    let total = await this.tamanoDeRondaTotal(tx, row.localidadId, dest);
    if (total >= CAP_SLOTS_POR_RONDA) {
      dest = await this.primeraRondaConCapacidad(tx, row.localidadId, dest + 1);
      targetOrden = (await this.tamanoDeRonda(tx, row.localidadId, dest)) + 1;
    }

    const sameRound = row.rondaNumero === dest;
    if (sameRound) {
      if (targetOrden === row.orden) return row;
      if (targetOrden > row.orden) {
        await tx.ronda.updateMany({
          where: { localidadId: row.localidadId, rondaNumero: row.rondaNumero, concluido: false, orden: { gt: row.orden, lte: targetOrden } },
          data: { orden: { decrement: 1 } },
        });
      } else {
        await tx.ronda.updateMany({
          where: { localidadId: row.localidadId, rondaNumero: row.rondaNumero, concluido: false, orden: { gte: targetOrden, lt: row.orden } },
          data: { orden: { increment: 1 } },
        });
      }
      await tx.ronda.update({ where: { id: row.id }, data: { orden: targetOrden } });
      return (await tx.ronda.findUnique({ where: { id: row.id } }))!;
    }

    await tx.ronda.updateMany({
      where: { localidadId: row.localidadId, rondaNumero: row.rondaNumero, concluido: false, orden: { gt: row.orden } },
      data: { orden: { decrement: 1 } },
    });
    await tx.ronda.updateMany({
      where: { localidadId: row.localidadId, rondaNumero: dest, concluido: false, orden: { gte: targetOrden } },
      data: { orden: { increment: 1 } },
    });
    await tx.ronda.update({ where: { id: row.id }, data: { rondaNumero: dest, orden: targetOrden } });
    return (await tx.ronda.findUnique({ where: { id: row.id } }))!;
  }

  private static async compactarOrdenesRonda(tx: Tx, localidadId: number, rondaNumero: number) {
    // sólo compacta activos; placeholders se quedan donde estén
    const filas = await tx.ronda.findMany({
      where: { localidadId, rondaNumero, concluido: false },
      orderBy: { orden: 'asc' },
      select: { id: true, orden: true },
    });
    for (let i = 0; i < filas.length; i++) {
      const esperado = i + 1;
      if (filas[i].orden !== esperado) {
        await tx.ronda.update({ where: { id: filas[i].id }, data: { orden: esperado } });
      }
    }
  }

  private static async eliminarRondasHuerfanasYDuplicadas(tx: Tx, localidadId: number) {
    // No borrar placeholders ni ligas concluidas. Los duplicados activos sí.
    const filas = await tx.ronda.findMany({
      where: { localidadId, concluido: false },
      select: { id: true, movimientoId: true, rondaNumero: true, orden: true },
      orderBy: [{ movimientoId: 'asc' }, { rondaNumero: 'asc' }, { orden: 'asc' }]
    });

    for (let i = 0; i < filas.length; ) {
      const movId = filas[i].movimientoId;
      const group = filas.filter(f => f.movimientoId === movId);
      if (group.length > 1) {
        const drop = group.slice(1).map(g => g.id);
        await tx.ronda.deleteMany({ where: { id: { in: drop } } });
      }
      i += group.length || 1;
    }
  }

  /** En BAJAS: máx 1 por empresa por ronda. En ALTAS: sin límite lógico, pero respetando CAP_SLOTS y HOLD. */
  private static async garantizarUnSlotBajasPorEmpresaPorRonda(tx: Tx, localidadId: number, startRound: number) {
    const filas = await tx.ronda.findMany({
      where: { localidadId, rondaNumero: { gte: startRound } },
      include: { movimiento: { select: { prioridad: true } } },
      orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }],
    });

    const bucket = new Map<string, { id: number; empresaId?: number; prioridad: 'ALTA'|'BAJA'; rondaNumero: number }[]>();
    for (const f of filas) {
      const key = `${f.rondaNumero}:${f.empresaId}`;
      const arr = bucket.get(key) ?? [];
      arr.push({ id: f.id, empresaId: (f as any).empresaId, prioridad: f.movimiento.prioridad as 'ALTA'|'BAJA', rondaNumero: f.rondaNumero });
      bucket.set(key, arr);
    }

    for (const [key, rows] of bucket) {
      const bajas = rows.filter(r => r.prioridad !== 'ALTA');
      if (bajas.length <= 1) continue;

      const [rondaNumeroStr, empresaIdStr] = key.split(':');
      const rondaActual = parseInt(rondaNumeroStr, 10);
      const empresaId = parseInt(empresaIdStr, 10);

      for (let i = 1; i < bajas.length; i++) {
        const target = await this.primeraRondaLibreParaEmpresa(tx, localidadId, empresaId, rondaActual + 1);
        const vivos = await this.tamanoDeRonda(tx, localidadId, target);
        await tx.ronda.update({ where: { id: bajas[i].id }, data: { rondaNumero: target, orden: vivos + 1 } });
      }
    }
  }

  // ALTAS: FIFO en R1 (respeta HOLD y CAP_SLOTS; si R1 lleno, no sube).
  private static async ordenarAltasR1_FIFO(tx: Tx, localidadId: number) {
    const filas = await tx.ronda.findMany({
      where: { localidadId },
      include: { movimiento: { select: { id: true, prioridad: true, createdAt: true } } },
      orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }],
    });

    let guard = 0;
    for (const f of filas) {
      if (++guard > MAX_GUARD_ITERS) break;
      if (f.movimiento.prioridad !== 'ALTA') continue;

      if (_isOnHold(f.movimiento.id)) {
        // si está en hold y está en R1, empuja a R2 respetando cap
        if (f.rondaNumero === 1) {
          const rCap = await this.primeraRondaConCapacidad(tx, localidadId, 2);
          const tam = await this.tamanoDeRonda(tx, localidadId, rCap);
          await this.moverRonda(tx, f as any, rCap, tam + 1);
        }
        continue;
      }

      // si no está en R1 y R1 tiene capacidad total, súbelo a R1
      const totalR1 = await this.tamanoDeRondaTotal(tx, localidadId, 1);
      if (f.rondaNumero !== 1 && totalR1 < CAP_SLOTS_POR_RONDA) {
        const tamR1 = await this.tamanoDeRonda(tx, localidadId, 1);
        await this.moverRonda(tx, f as any, 1, tamR1 + 1);
      }
    }

    // Reordenar bloque de ALTAS en R1 por createdAt
    const r1 = await tx.ronda.findMany({
      where: { localidadId, rondaNumero: 1 },
      include: { movimiento: { select: { id: true, prioridad: true, createdAt: true } } },
      orderBy: [{ orden: 'asc' }],
    });

    const altasOk = r1
      .filter(x => x.movimiento.prioridad === 'ALTA' && !_isOnHold(x.movimiento.id))
      .sort((a, b) => +new Date(a.movimiento.createdAt) - +new Date(b.movimiento.createdAt));

    const resto = r1.filter(x => x.movimiento.prioridad !== 'ALTA' || _isOnHold(x.movimiento.id));

    const nuevoOrden = [...altasOk.map(x => x.id), ...resto.map(x => x.id)];
    for (let i = 0; i < nuevoOrden.length; i++) {
      await tx.ronda.update({ where: { id: nuevoOrden[i] }, data: { orden: i + 1 } });
    }
  }

  // BAJAS: reequilibrio general (no se usa para redistribuir global preservando cascadas)
  private static async reequilibrarBajasRobinHood(tx: Tx, localidadId: number) {
    const altas = await tx.ronda.findMany({
      where: { localidadId, movimiento: { prioridad: 'ALTA' } },
      select: { movimiento: { select: { id: true } } },
    });
    const hayAltasSinHold = altas.some(a => !_isOnHold(a.movimiento.id));
    const startRound = hayAltasSinHold ? 2 : 1;

    await this.garantizarUnSlotBajasPorEmpresaPorRonda(tx, localidadId, startRound);

    const bajas = await tx.ronda.findMany({
      where: { localidadId, rondaNumero: { gte: startRound }, movimiento: { prioridad: 'BAJA' } },
      orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }],
    });

    const porEmpresa = new Map<number, typeof bajas>();
    for (const r of bajas) porEmpresa.set(r.empresaId, [ ...(porEmpresa.get(r.empresaId) ?? []), r ]);
    const empresas = [...porEmpresa.keys()];

    let ronda = startRound;
    let guard = 0;
    while ([...porEmpresa.values()].some(arr => arr.length > 0) && guard++ < MAX_GUARD_ITERS) {
      // asegurar capacidad antes de asignar
      ronda = await this.primeraRondaConCapacidad(tx, localidadId, ronda);
      let orden = 1;
      for (const e of empresas) {
        const arr = porEmpresa.get(e)!;
        if (arr.length) {
          const item = arr.shift()!;
          await tx.ronda.update({ where: { id: item.id }, data: { rondaNumero: ronda, orden } });
          orden++;
          if (orden > CAP_SLOTS_POR_RONDA) break;
        }
      }
      await this.compactarOrdenesRonda(tx, localidadId, ronda);
      ronda++;
    }

    // Compactar numeración contigua (sin tocar concluidos)
    const grupos = await tx.ronda.findMany({
      where: { localidadId },
      select: { rondaNumero: true }, distinct: ['rondaNumero'], orderBy: { rondaNumero: 'asc' }
    });
    let idx = 1;
    for (const g of grupos) {
      if (g.rondaNumero !== idx) {
        await tx.ronda.updateMany({ where: { localidadId, rondaNumero: g.rondaNumero }, data: { rondaNumero: idx } });
      }
      await this.compactarOrdenesRonda(tx, localidadId, idx);
      idx++;
    }
  }

  // ---------- REGLA DE “MUERTE DE RONDA” ----------
  private static async rondaMuerta(tx: Tx, localidadId: number, rondaNumero: number) {
    const total = await tx.ronda.count({ where: { localidadId, rondaNumero } });
    if (!total) return false;
    const done = await tx.ronda.count({
      where: {
        localidadId, rondaNumero,
        OR: [
          { concluido: true },
          { movimiento: { OR: [{ finalizado: true }, { estado: { in: ['CONCLUIDO','CANCELADO'] } }] } }
        ]
      }
    });
    return total === done;
  }

  private static async avanzarSiRondaMuerta(tx: Tx, localidadId: number) {
    while (true) {
      const first = await tx.ronda.findFirst({
        where: { localidadId },
        select: { rondaNumero: true }, orderBy: { rondaNumero: 'asc' }
      });
      if (!first) break;
      const rNum = first.rondaNumero;
      const muerta = await this.rondaMuerta(tx, localidadId, rNum);
      if (!muerta) break;

      // 1) eliminar COMPLETAMENTE la ronda muerta (incluye placeholders)
      await tx.ronda.deleteMany({ where: { localidadId, rondaNumero: rNum } });

      // 2) shift: todas las posteriores suben una
      await tx.ronda.updateMany({
        where: { localidadId, rondaNumero: { gt: rNum } },
        data: { rondaNumero: { decrement: 1 } },
      });

      // 3) compactar nueva R1
      await this.compactarOrdenesRonda(tx, localidadId, 1);
    }
  }

  // ---------- RECOMPOSICIÓN GENERAL ----------
  public static async recomponerRondasLocalidad(localidadId: number, tx: Tx = prisma) {
    await this.eliminarRondasHuerfanasYDuplicadas(tx, localidadId);

    // Renumerar grupos sin borrar concluidos
    const grupos = await tx.ronda.findMany({
      where: { localidadId },
      select: { rondaNumero: true },
      distinct: ['rondaNumero'],
      orderBy: { rondaNumero: 'asc' },
    });
    let idx = 1;
    for (const g of grupos) {
      if (g.rondaNumero !== idx) {
        await tx.ronda.updateMany({ where: { localidadId, rondaNumero: g.rondaNumero }, data: { rondaNumero: idx } });
      }
      await this.compactarOrdenesRonda(tx, localidadId, idx);
      idx++;
    }

    // 1) ALTAS → R1 (FIFO), ALTAS en HOLD fuera de R1, respetando CAP_SLOTS
    await this.ordenarAltasR1_FIFO(tx, localidadId);

    // 2) BAJAS: 1 por empresa por ronda, respetando CAP_SLOTS
    const altas = await tx.ronda.findMany({
      where: { localidadId, movimiento: { prioridad: 'ALTA' } },
      select: { movimiento: { select: { id: true } } },
    });
    const hayAltasSinHold = altas.some(a => !_isOnHold(a.movimiento.id));
    const startRound = hayAltasSinHold ? 2 : 1;

    await this.garantizarUnSlotBajasPorEmpresaPorRonda(tx, localidadId, startRound);

    const grupos2 = await tx.ronda.findMany({
      where: { localidadId },
      select: { rondaNumero: true }, distinct: ['rondaNumero'], orderBy: { rondaNumero: 'asc' }
    });
    let idx2 = 1;
    for (const g of grupos2) {
      if (g.rondaNumero !== idx2) {
        await tx.ronda.updateMany({ where: { localidadId, rondaNumero: g.rondaNumero }, data: { rondaNumero: idx2 } });
      }
      await this.compactarOrdenesRonda(tx, localidadId, idx2);
      idx2++;
    }

    // Avanzar si R1 quedó muerta tras la recomposición
    await this.avanzarSiRondaMuerta(tx, localidadId);
  }

  // ---------- SERVICIO ACTIVADO (LAVADO / TORNO) ----------
  public static async onServicioActivado(movimientoId: number) {
    await prisma.$transaction(async (tx) => {
      const m = await tx.movimiento.findUnique({
        where: { id: movimientoId },
        select: { id: true, localidadId: true, empresaId: true, estado: true, lavado: true, torno: true, fechaInicio: true, createdAt: true }
      });
      if (!m) throw new Error(`Movimiento ${movimientoId} no encontrado`);
      if (!m.lavado && !m.torno) return;
      if (m.estado !== 'EN_PROCESO') return;

      let r = await tx.ronda.findFirst({ where: { movimientoId }, orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }] });
      if (!r) {
        // Inserta en R1 si hay capacidad, si no, siguiente con capacidad
        const rDest = await this.primeraRondaConCapacidad(tx, m.localidadId, 1);
        const ord = (await this.tamanoDeRonda(tx, m.localidadId, rDest)) + 1;
        r = await tx.ronda.create({
          data: { movimientoId, empresaId: m.empresaId, localidadId: m.localidadId, rondaNumero: rDest, orden: ord }
        });
      }

      const r1 = await tx.ronda.findMany({
        where: { localidadId: m.localidadId, rondaNumero: 1 },
        include: { movimiento: { select: { id: true, prioridad: true, fechaInicio: true, createdAt: true, lavado: true, torno: true } } },
        orderBy: [{ orden: 'asc' }],
      });

      const bloqueAltasLen = r1.filter(x => x.movimiento.prioridad === 'ALTA' && !_isOnHold(x.movimiento.id)).length;

      const serviciosActivos = r1
        .filter(x => (x.movimiento.lavado || x.movimiento.torno))
        .sort((a, b) =>
          +new Date(a.movimiento.fechaInicio ?? a.movimiento.createdAt) -
          +new Date(b.movimiento.fechaInicio ?? b.movimiento.createdAt)
        );

      const idxServicio = serviciosActivos.findIndex(x => x.id === r!.id);
      const targetOrden = Math.max(1, bloqueAltasLen + 1 + (idxServicio < 0 ? serviciosActivos.length : idxServicio));
      await this.moverRonda(tx, r!, 1, targetOrden);
      await this.compactarOrdenesRonda(tx, m.localidadId, 1);
    }, { /* @ts-ignore */ isolationLevel: 'Serializable' });
  }

  // ---------- GENERACIÓN / INSERCIÓN ----------
  /**
   * ALTAS → R1 (opcionalmente fijar posición) respetando CAP_SLOTS.
   * BAJAS → 1 por empresa por ronda; inicia en R2 si hay ALTAS sin hold, si no desde R1. Respeta CAP_SLOTS.
   */
  static async insertarRondaSolvente(data: {
    movimientoId: number;
    empresaId: number;
    localidadId: number;
    prioridad: 'ALTA' | 'BAJA';
    preferirR1?: boolean;
    posicion?: number;
  }) {
    await prisma.$transaction(async (tx) => {
      const mov = await tx.movimiento.findUnique({ where: { id: data.movimientoId }, select: { id: true, estado: true } });
      if (!mov) throw new Error(`Movimiento ${data.movimientoId} no encontrado`);
      if (mov.estado === 'CANCELADO') return;

      const existe = await tx.ronda.findFirst({ where: { movimientoId: data.movimientoId } });
      if (existe) return;

      if (data.prioridad === 'ALTA') {
        const rPreferida = data.preferirR1 ? 1 : await this.primeraRondaConCapacidad(tx, data.localidadId, 1);
        const totalRpref = await this.tamanoDeRondaTotal(tx, data.localidadId, rPreferida);
        const rDest = totalRpref < CAP_SLOTS_POR_RONDA ? rPreferida : await this.primeraRondaConCapacidad(tx, data.localidadId, rPreferida + 1);
        const ord = data.preferirR1 && data.posicion ? data.posicion : (await this.tamanoDeRonda(tx, data.localidadId, rDest)) + 1;
        await this.insertarEnPosicion(tx, data.localidadId, rDest, ord, {
          movimientoId: data.movimientoId,
          empresaId: data.empresaId,
          localidadId: data.localidadId
        } as any);
        await this.recomponerRondasLocalidad(data.localidadId, tx);
        return;
      }

      await this._insertarBajaConRobinHood(tx, {
        localidadId: data.localidadId,
        empresaId: data.empresaId,
        movimientoId: data.movimientoId
      });
      await this.recomponerRondasLocalidad(data.localidadId, tx);
    }, { /* @ts-ignore */ isolationLevel: 'Serializable' });
  }

  /** Compat: mismo nombre que antes. */
  static async generarRondaParaMovimiento(
    data: { movimientoId: number; empresaId: number; localidadId: number; prioridad: 'ALTA' | 'BAJA' }
  ) {
    return this.insertarRondaSolvente(data);
  }

  /** PRIVADO: inserción BAJA con robin-hood + compactación + CAP_SLOTS. */
  private static async _insertarBajaConRobinHood(
    tx: Tx,
    params: { localidadId: number; empresaId: number; movimientoId: number }
  ) {
    const { localidadId, empresaId, movimientoId } = params;

    const altas = await tx.ronda.findMany({
      where: { localidadId, movimiento: { prioridad: 'ALTA' } },
      select: { movimiento: { select: { id: true } } },
    });
    const hayAltasSinHold = altas.some(a => !_isOnHold(a.movimiento.id));
    const startRound = hayAltasSinHold ? 2 : 1;

    let r = startRound;
    for (let guard = 0; guard < MAX_SCAN_ROUNDS; guard++) {
      const ya = await tx.ronda.count({
        where: { localidadId, rondaNumero: r, empresaId, concluido: false, movimiento: { prioridad: 'BAJA' } }
      });
      const total = await this.tamanoDeRondaTotal(tx, localidadId, r);
      if (ya === 0 && total < CAP_SLOTS_POR_RONDA) break;
      r++;
    }

    const ord = (await this.tamanoDeRonda(tx, localidadId, r)) + 1;
    await tx.ronda.create({ data: { movimientoId, empresaId, localidadId, rondaNumero: r, orden: ord } });

    await this.garantizarUnSlotBajasPorEmpresaPorRonda(tx, localidadId, startRound);

    // Compactar/renumerar sin redistribución global
    const grupos = await tx.ronda.findMany({
      where: { localidadId },
      select: { rondaNumero: true }, distinct: ['rondaNumero'], orderBy: { rondaNumero: 'asc' }
    });
    let idx = 1;
    for (const g of grupos) {
      if (g.rondaNumero !== idx) {
        await tx.ronda.updateMany({ where: { localidadId, rondaNumero: g.rondaNumero }, data: { rondaNumero: idx } });
      }
      await this.compactarOrdenesRonda(tx, localidadId, idx);
      idx++;
    }
  }

  // ================== INCIDENTES ==================
  // NO MODIFICAR segun solicitud del usuario
  static async gestionarIncidente(
    movimientoId: number,
    opts?: { cerradoNoResuelto?: boolean }
  ) {
    await prisma.$transaction(async (tx) => {
      const r = await tx.ronda.findFirst({
        where: { movimientoId, concluido: false },
        include: {
          movimiento: {
            select: {
              id: true,
              prioridad: true,
              empresaId: true,
              localidadId: true,
              createdAt: true,
            },
          },
        },
      });
      if (!r) throw new Error(`No hay ronda activa para el movimiento ${movimientoId}`);

      const { localidadId } = r;
      const esAlta = r.movimiento.prioridad === 'ALTA';

      // ====================== ALTAS ======================
      // Se quedan en R1 pero al final del bloque de ALTAS
      if (esAlta) {
        const r1Altas = await tx.ronda.findMany({
          where: { localidadId, rondaNumero: 1, concluido: false, movimiento: { prioridad: 'ALTA' } },
          include: { movimiento: { select: { id: true, createdAt: true } } },
          orderBy: [{ movimiento: { createdAt: 'asc' } }, { orden: 'asc' }],
        });

        const ids = r1Altas.map((x) => x.id);
        const self = r1Altas.find((x) => x.movimiento.id === movimientoId);
        if (self) {
          const nuevo = ids.filter((i) => i !== self.id);
          nuevo.push(self.id); // al final del bloque de ALTA
          for (let i = 0; i < nuevo.length; i++) {
            await tx.ronda.update({ where: { id: nuevo[i] }, data: { orden: i + 1 } });
          }
        }

        await this.compactarOrdenesRonda(tx, localidadId, 1);
        await this.recomponerRondasLocalidad(localidadId, tx);
        return;
      }

      // ====================== BAJAS ======================
      const empresasBaja = await tx.ronda.findMany({
        where: { localidadId, concluido: false, movimiento: { prioridad: 'BAJA' } },
        select: { empresaId: true },
        distinct: ['empresaId'],
      });

      const chain = await tx.ronda.findMany({
        where: {
          localidadId,
          empresaId: r.empresaId,
          concluido: false,
          movimiento: { prioridad: 'BAJA' },
        },
        select: { id: true, rondaNumero: true, orden: true },
        orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }],
      });

      const ensureTargetRound = async (targetRonda: number): Promise<number> => {
        const existe = await tx.ronda.count({
          where: { localidadId, rondaNumero: targetRonda },
        });
        if (existe > 0) return (await this.tamanoDeRonda(tx, localidadId, targetRonda)) + 1;
        const max = await tx.ronda.aggregate({
          where: { localidadId },
          _max: { rondaNumero: true },
        });
        const nuevaRonda = Math.max(targetRonda, (max._max.rondaNumero ?? 0) + 1);
        return 1;
      };

      if (empresasBaja.length === 1) {
        for (let i = chain.length - 1; i >= 0; i--) {
          const row = chain[i];
          const targetRonda = row.rondaNumero === 1 ? 2 : 1;
          const next = chain[i + 1];
          if (next && next.rondaNumero === targetRonda) {
            await tx.ronda.updateMany({
              where: { localidadId, rondaNumero: targetRonda, concluido: false, orden: { gte: next.orden } },
              data: { orden: { increment: 1 } },
            });
            await this.moverRonda(tx, row as any, targetRonda, next.orden);
          } else {
            const tam = await this.tamanoDeRonda(tx, localidadId, targetRonda);
            await this.moverRonda(tx, row as any, targetRonda, tam + 1);
          }
        }
        await this.recomponerRondasLocalidad(localidadId, tx);
        return;
      }

      if (chain.length === 2) {
        for (let i = chain.length - 1; i >= 0; i--) {
          const row = chain[i];
          const targetRonda = row.rondaNumero + 1;
          const next = chain[i + 1];

          if (next && next.rondaNumero === targetRonda) {
            await tx.ronda.updateMany({
              where: { localidadId, rondaNumero: targetRonda, concluido: false, orden: { gte: next.orden } },
              data: { orden: { increment: 1 } },
            });
            await this.moverRonda(tx, row as any, targetRonda, next.orden);
          } else {
            const tam = await this.tamanoDeRonda(tx, localidadId, targetRonda);
            if (tam > 0) {
              await this.moverRonda(tx, row as any, targetRonda, tam + 1);
            } else {
              const max = await tx.ronda.aggregate({
                where: { localidadId },
                _max: { rondaNumero: true },
              });
              const nuevaRonda = Math.max(targetRonda, (max._max.rondaNumero ?? 0) + 1);
              await this.moverRonda(tx, row as any, nuevaRonda, 1);
            }
          }
        }

        await this.recomponerRondasLocalidad(localidadId, tx);
        return;
      }

      for (let i = chain.length - 1; i >= 0; i--) {
        const row = chain[i];
        const targetRonda = row.rondaNumero + 1;
        const next = chain[i + 1];

        if (next && next.rondaNumero === targetRonda) {
          await tx.ronda.updateMany({
            where: { localidadId, rondaNumero: targetRonda, concluido: false, orden: { gte: next.orden } },
            data: { orden: { increment: 1 } },
          });
          await this.moverRonda(tx, row as any, targetRonda, next.orden);
        } else {
          const tam = await this.tamanoDeRonda(tx, localidadId, targetRonda);
          if (tam > 0) {
            await this.moverRonda(tx, row as any, targetRonda, tam + 1);
          } else {
            const max = await tx.ronda.aggregate({
              where: { localidadId },
              _max: { rondaNumero: true },
            });
            const nuevaRonda = Math.max(targetRonda, (max._max.rondaNumero ?? 0) + 1);
            await this.moverRonda(tx, row as any, nuevaRonda, 1);
          }
        }
      }

      await this.recomponerRondasLocalidad(localidadId, tx);
    }, { /* @ts-ignore */ isolationLevel: 'Serializable' });
  }

  /** 
   * Cambia el movimiento a SOLICITADO y lo ENCOLA al FRENTE de R1 (orden=1).
   * No respeta CAP_SLOTS por ser acción forzada.
   */
  static async solicitarYEncolarFrenteR1(movimientoId: number) {
    const res = await prisma.$transaction(async (tx) => {
      const m = await tx.movimiento.findUnique({
        where: { id: movimientoId },
        select: { id: true, empresaId: true, localidadId: true, estado: true, finalizado: true },
      });
      if (!m) throw new Error(`Movimiento ${movimientoId} no encontrado`);
      if (m.finalizado || m.estado === 'CANCELADO' || m.estado === 'CONCLUIDO') {
        throw new Error(`Movimiento ${movimientoId} no puede encolarse (estado=${m.estado}, finalizado=${m.finalizado})`);
      }

      await tx.movimiento.update({
        where: { id: movimientoId },
        data: {
          estado: 'SOLICITADO',
          fechaSolicitud: new Date(),
          updatedAt: new Date(),
        },
      });

      await tx.ronda.updateMany({
        where: { localidadId: m.localidadId, rondaNumero: 1, concluido: false },
        data: { orden: { increment: 1 } },
      });

      const rExistente = await tx.ronda.findFirst({
        where: { movimientoId },
        select: { id: true, rondaNumero: true },
      });

      if (rExistente) {
        const oldRound = rExistente.rondaNumero;
        await tx.ronda.update({
          where: { id: rExistente.id },
          data: { rondaNumero: 1, orden: 1, updatedAt: new Date() },
        });
        if (oldRound !== 1) {
          await this.compactarOrdenesRonda(tx, m.localidadId, oldRound);
        }
      } else {
        await tx.ronda.create({
          data: {
            movimientoId,
            empresaId: m.empresaId,
            localidadId: m.localidadId,
            rondaNumero: 1,
            orden: 1,
          },
        });
      }

      await this.compactarOrdenesRonda(tx, m.localidadId, 1);

      return await tx.ronda.findFirst({
        where: { movimientoId },
        include: {
          movimiento: { select: { id: true, prioridad: true, estado: true, lavado: true, torno: true } },
        },
      });
    }, { /* @ts-ignore */ isolationLevel: 'Serializable' });

    try { await this.siguienteInteligente(res!.localidadId); } catch { /* noop */ }

    return res;
  }

  // ---------- MOTOR: SIGUIENTE ----------
  static async siguienteParaMaquinista(localidadId: number, usuarioId?: number) {
    return prisma.$transaction(async (tx) => {
      const r1 = await tx.ronda.findMany({
        where: { localidadId, concluido: false, rondaNumero: 1 },
        include: {
          movimiento: {
            select: {
              id: true,
              empresaId: true,
              prioridad: true,
              estado: true,
              locomotiveNumber: true,
              lavado: true,
              torno: true,
              operadorId: true,
            },
          },
        },
        orderBy: [{ orden: 'asc' }],
      });

      const candidatoR1 = r1.find((row) => {
        const m = row.movimiento;
        if (!m) return false;
        const esServicio = !!m.lavado || !!m.torno;
        const enProceso = m.estado === 'EN_PROCESO';
        if (enProceso && usuarioId && m.operadorId === usuarioId) return true; // re-tomar
        if (enProceso) return false;                 // en proceso de otro
        if (esServicio && enProceso) return false;
        return true;
      });

      if (candidatoR1) {
        const m = candidatoR1.movimiento;
        return {
          rondaId: candidatoR1.id,
          localidadId: candidatoR1.localidadId,
          movimientoId: m.id,
          empresaId: m.empresaId,
          prioridad: m.prioridad,
          locomotiveNumber: m.locomotiveNumber ?? null,
          rondaNumero: 1,
          orden: candidatoR1.orden,
          permiteInicio: true,
          motivo: 'r1_disponible',
        };
      }

      const resto = await tx.ronda.findMany({
        where: { localidadId, concluido: false, rondaNumero: { gte: 2 } },
        include: {
          movimiento: {
            select: {
              id: true,
              empresaId: true,
              prioridad: true,
              estado: true,
              locomotiveNumber: true,
              lavado: true,
              torno: true,
              operadorId: true,
            },
          },
        },
        orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }],
      });

      const candidato = resto.find((row) => {
        const m = row.movimiento;
        const esServicio = !!m.lavado || !!m.torno;
        const enProceso = m.estado === 'EN_PROCESO';
        if (enProceso && usuarioId && m.operadorId === usuarioId) return true;
        if (enProceso) return false;
        if (esServicio && enProceso) return false;
        return true;
      });

      if (!candidato) {
        return { vacio: true as const, motivo: 'todos_en_proceso' };
      }

      const m = candidato.movimiento;
      return {
        rondaId: candidato.id,
        localidadId: candidato.localidadId,
        movimientoId: m.id,
        empresaId: m.empresaId,
        prioridad: m.prioridad,
        locomotiveNumber: m.locomotiveNumber ?? null,
        rondaNumero: candidato.rondaNumero,
        orden: candidato.orden,
        permiteInicio: true,
        motivo: 'no_habia_r1_libre',
      };
    });
  }

  /** Wrapper por compatibilidad. */
  public static async siguienteInteligente(localidadId: number) {
    const res = await this.siguienteParaMaquinista(localidadId);
    if ((res as any).vacio) return res;

    const {
      rondaId,
      movimientoId,
      empresaId,
      prioridad,
      locomotiveNumber,
      localidadId: locId,
      rondaNumero,
      orden,
      permiteInicio,
      motivo,
    } = res as any;

    if (typeof rondaNumero !== 'number' || typeof orden !== 'number') {
      return { vacio: true as const, motivo: 'sin_ronda_orden' };
    }

    return {
      rondaId,
      movimientoId,
      empresaId,
      localidadId: locId,
      prioridad,
      locomotiveNumber: locomotiveNumber ?? null,
      rondaNumero,
      orden,
      permiteInicio: permiteInicio ?? true,
      motivo: motivo ?? 'ok',
    };
  }

  // ---------- FIN SERVICIO (LAVADO / TORNO) ----------
  static async notificarFinServicio(
    movimientoId: number,
    tipo: 'LAVADO' | 'TORNO',
    imagenesUrls?: string[]
  ) {
    ensureAdmin();
    const m = await prisma.movimiento.findUnique({
      where: { id: movimientoId },
      include: { empresa: { select: { nombre: true } }, localidad: { select: { id: true } } }
    });
    if (!m) throw new Error(`Movimiento ${movimientoId} no encontrado`);

    const ids = [ (m as any).clienteId, (m as any).supervisorId, (m as any).coordinadorId, (m as any).operadorId ]
      .filter(Boolean) as number[];
    const tokens = await tokensDeUsuarios(ids);
    if (!tokens.length) return;

    await admin.messaging().sendEachForMulticast({
      notification: {
        title: `${tipo} concluido`,
        body: `Concluido ${tipo.toLowerCase()} de la locomotora ${m.locomotiveNumber}. Crear movimiento para desocupar la sección.`
      },
      data: {
        tipo: 'fin_servicio',
        subtipo: tipo.toLowerCase(),
        movimientoId: String(m.id),
        empresa: String(m.empresa?.nombre ?? ''),
        localidadId: String(m.localidadId),
        imagenes: (imagenesUrls ?? []).slice(0, 5).join(',')
      },
      tokens
    });
  }

  // ---------- LIMPIEZA ----------
  private static async limpiarYReorganizarRondasConcluidas() {
    const locs = await prisma.ronda.findMany({ select: { localidadId: true }, distinct: ['localidadId'] });
    for (const { localidadId } of locs) {
      await prisma.$transaction(async (tx) => {
        // No borrar concluidos; avanzar sólo si la ronda está muerta
        await this.avanzarSiRondaMuerta(tx, localidadId);
        await this.eliminarRondasHuerfanasYDuplicadas(tx, localidadId);
        await this.recomponerRondasLocalidad(localidadId, tx);
      });
    }
  }

  // ---------- QUERIES VARIAS (compat front) ----------
  static async obtenerRondas() {
    try {
      return await prisma.ronda.findMany({
        include: { empresa: true, movimiento: { include: { empresa: true } } },
        orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }],
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
        orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }],
      });
    } catch (error) {
      movimientoError.error('Error al obtener rondas por localidad', { localidadId, error });
      throw new Error('Error al obtener rondas por localidad');
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
              id: true, locomotiveNumber: true, createdAt: true, estado: true, lavado: true, torno: true, prioridad: true,
              instrucciones: true,
              viaOrigen: { select: { nombre: true } }, viaDestino: { select: { nombre: true } },
            },
          },
        },
        orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }],
      });
    } catch (error) {
      movimientoError.error('Error al obtener rondas por localidad y estado', { localidadId, concluido, error });
      throw new Error('Error al obtener rondas por localidad y estado');
    }
  }

  static async obtenerSiguienteEnRonda(localidadId: number) {
    try {
      return await prisma.ronda.findFirst({
        where: { localidadId, concluido: false },
        include: {
          empresa: true,
          movimiento: {
            include: {
              empresa: true,
              viaOrigen: { select: { nombre: true } },
              viaDestino: { select: { nombre: true } }
            }
          }
        },
        orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }]
      });
    } catch (error) {
      movimientoError.error('Error al obtener siguiente en ronda', { localidadId, error });
      throw new Error('Error al obtener el siguiente en la ronda');
    }
  }

  static async intercambiarMovimientosEntreRondas(rondaAId: number, rondaBId: number): Promise<[Ronda, Ronda]> {
    if (rondaAId === rondaBId) throw new Error("Debe indicar dos rondas distintas para el intercambio");
    return await prisma.$transaction(async tx => {
      const [rondaA, rondaB] = await Promise.all([
        tx.ronda.findUnique({ where: { id: rondaAId } }),
        tx.ronda.findUnique({ where: { id: rondaBId } }),
      ]);
      if (!rondaA || !rondaB) throw new Error("Rondas o movimientos inválidos");

      const movimientoIdA = rondaA.movimientoId;
      const movimientoIdB = rondaB.movimientoId;

      await Promise.all([
        tx.ronda.delete({ where: { id: rondaAId } }),
        tx.ronda.delete({ where: { id: rondaBId } }),
      ]);

      const [nuevaRondaA, nuevaRondaB] = await Promise.all([
        tx.ronda.create({
          data: {
            id: rondaAId,
            movimientoId: movimientoIdB,
            empresaId: rondaA.empresaId,
            localidadId: rondaA.localidadId,
            orden: rondaA.orden,
            rondaNumero: rondaA.rondaNumero,
            concluido: rondaA.concluido,
          },
        }),
        tx.ronda.create({
          data: {
            id: rondaBId,
            movimientoId: movimientoIdA,
            empresaId: rondaB.empresaId,
            localidadId: rondaB.localidadId,
            orden: rondaB.orden,
            rondaNumero: rondaB.rondaNumero,
            concluido: rondaB.concluido,
          },
        }),
      ]);

      return [nuevaRondaA, nuevaRondaB];
    }, { /* @ts-ignore */ isolationLevel: 'Serializable' });
  }

  static async intercambiarMovimientoEnRonda(rondaId: number, nuevoMovimientoId: number) {
    try {
      const ronda = await prisma.ronda.findUnique({ where: { id: rondaId } });
      if (!ronda) throw new Error('Ronda no encontrada');
      const movimiento = await prisma.movimiento.findUnique({ where: { id: nuevoMovimientoId } });
      if (!movimiento) throw new Error('Movimiento no encontrado');

      return await prisma.ronda.update({
        where: { id: rondaId },
        data: { movimientoId: nuevoMovimientoId },
      });
    } catch (error) {
      movimientoError.error('Error al intercambiar movimiento en ronda', { rondaId, nuevoMovimientoId, error });
      throw new Error('Error al intercambiar movimiento en ronda');
    }
  }

  static async obtenerInfoPorRonda(id: number) {
    try {
      const info = await prisma.ronda.findUnique({
        where: { id },
        include: { empresa: true, movimiento: { include: { viaOrigen: true, viaDestino: true } } },
      });
      if (!info) throw new Error(`Ronda con ID ${id} no encontrada`);
      return {
        rondaId: info.id,
        rondaNumero: info.rondaNumero,
        orden: info.orden,
        concluido: info.concluido,
        empresa: info.empresa,
        movimiento: {
          id: info.movimiento.id,
          prioridad: info.movimiento.prioridad,
          viaOrigen: info.movimiento.viaOrigen,
          viaDestino: info.movimiento.viaDestino,
          lavado: (info.movimiento as any).lavado,
          torno: (info.movimiento as any).torno,
        },
      };
    } catch (error: any) {
      movimientoError.error('Error al obtener info de ronda', { id, error });
      throw new Error('Error al obtener info de ronda');
    }
  }

  static async marcarRondaComoConcluida(id: number) {
    try {
      const rondaActualizada = await prisma.$transaction(async (tx) => {
        const r = await tx.ronda.update({
          where: { id },
          data: { concluido: true, updatedAt: new Date() },
        });
        await this.avanzarSiRondaMuerta(tx, r.localidadId); // sólo avanza si la ronda murió
        return r;
      }, { /* @ts-ignore */ isolationLevel: 'Serializable' });
      return rondaActualizada;
    } catch (error) {
      movimientoError.error('Error al marcar ronda como concluida', { id, error });
      throw new Error('Error al marcar ronda como concluida');
    }
  }
}
