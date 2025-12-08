// src/models/RondaModel.ts
import { movimientoError } from "../movimiento.logger";
import type { Prisma, Ronda } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import admin from 'firebase-admin';

const prisma = new PrismaClient();
type Tx = Prisma.TransactionClient;

// ================== HOLD 10 MIN (INCIDENTE CERRADO/NO RESUELTO, SOLO 1 VEZ) ==================
const HOLD10M_MS = 10 * 60 * 1000;
const _hold10m = new Map<number, number>();     // movimientoId -> expiresAt
const _hold10mOnce = new Set<number>();         // ya aplicado una vez
function _isOnHold(movId: number) {
  const exp = _hold10m.get(movId);
  if (!exp) return false;
  if (Date.now() > exp) { _hold10m.delete(movId); return false; }
  return true;
}

// ================== FCM (solo fin de servicio) ==================
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

// ================== CONSTANTES / GUARDAS ==================
const MAX_GUARD_ITERS = 1000;
const MAX_SCAN_ROUNDS = 500;
const TIMEOUT_EN_PROCESO_MS = 60 * 60 * 1000; // 60 minutos

// Movimiento bloqueado al operador que lo inició por 30 min
const BLOQUEO_OPERADOR_MS = 30 * 60 * 1000; // 30 minutos

// Máximo de rondas activas antes de hacer un reset suave
const MAX_RONDAS_ACTIVAS = 5;

function esReasignablePorTiempo(mov: any): boolean {
  const base =
    mov.inicioReal ||
    mov.inicioOperacion ||
    mov.fechaInicio ||
    mov.updatedAt ||
    mov.createdAt;

  if (!base) return false;

  const t = base instanceof Date ? base.getTime() : new Date(base).getTime();
  return Date.now() - t >= BLOQUEO_OPERADOR_MS;
}

// ================== MODELO ==================
export class RondaModel {
  // ---------- HELPERS INTERNOS (SIN CRON) ----------

  private static async liberarMovimientosEnProcesoPorTimeout(
    tx: Tx,
    localidadId: number
  ) {
    const limite = new Date(Date.now() - TIMEOUT_EN_PROCESO_MS);

    const { count } = await tx.movimiento.updateMany({
      where: {
        localidadId,
        estado: 'EN_PROCESO',
        finalizado: false,
        operadorId: { not: null },
        fechaInicio: { lte: limite },
      },
      data: {
        operadorId: null,
      },
    });

    if (count > 0) {
      movimientoError.error('Movimientos liberados por timeout EN_PROCESO', {
        localidadId,
        timeoutMs: TIMEOUT_EN_PROCESO_MS,
        cantidad: count,
      });
    }
  }

  // ---------- HELPERS CRUD RONDA ----------
  private static async insertarEnPosicion(
    tx: Tx,
    localidadId: number,
    rondaNumero: number,
    orden: number,
    data: Omit<Ronda, 'id'|'createdAt'|'updatedAt'|'concluido'|'rondaNumero'|'orden'>,
  ) {
    await tx.ronda.updateMany({
      where: { localidadId, rondaNumero, concluido: false, orden: { gte: orden } },
      data: { orden: { increment: 1 } },
    });
    return tx.ronda.create({ data: { ...data, localidadId, rondaNumero, orden } as any });
  }

  private static async moverRonda(tx: Tx, row: Ronda, targetRonda: number, targetOrden: number): Promise<Ronda> {
    if (targetRonda < 1) targetRonda = 1;
    if (targetOrden < 1) targetOrden = 1;

    const sameRound = row.rondaNumero === targetRonda;
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
      where: { localidadId: row.localidadId, rondaNumero: targetRonda, concluido: false, orden: { gte: targetOrden } },
      data: { orden: { increment: 1 } },
    });
    await tx.ronda.update({ where: { id: row.id }, data: { rondaNumero: targetRonda, orden: targetOrden } });
    return (await tx.ronda.findUnique({ where: { id: row.id } }))!;
  }

  private static async tamanoDeRonda(tx: Tx, localidadId: number, rondaNumero: number) {
    return tx.ronda.count({ where: { localidadId, rondaNumero, concluido: false } });
  }

  private static async primeraRondaLibreParaEmpresa(
    tx: Tx, localidadId: number, empresaId: number, desdeRonda: number
  ): Promise<number> {
    let r = Math.max(1, desdeRonda);
    for (let guard = 0; guard < MAX_SCAN_ROUNDS; guard++) {
      const c = await tx.ronda.count({ where: { localidadId, rondaNumero: r, concluido: false, empresaId } });
      if (c === 0) return r;
      r++;
    }
    return r;
  }

  private static async compactarOrdenesRonda(tx: Tx, localidadId: number, rondaNumero: number) {
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

  /** En BAJAS: máx 1 por empresa por ronda. En ALTAS: sin límite (cola FIFO en R1). */
  private static async garantizarUnSlotBajasPorEmpresaPorRonda(tx: Tx, localidadId: number, startRound: number) {
    const filas = await tx.ronda.findMany({
      where: { localidadId, concluido: false, rondaNumero: { gte: startRound } },
      include: { movimiento: { select: { prioridad: true } } },
      orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }],
    });

    const bucket = new Map<string, { id: number; prioridad: 'ALTA'|'BAJA' }[]>();
    for (const f of filas) {
      const key = `${f.rondaNumero}:${f.empresaId}`;
      const arr = bucket.get(key) ?? [];
      arr.push({ id: f.id, prioridad: f.movimiento.prioridad as 'ALTA'|'BAJA' });
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
        const tam = await this.tamanoDeRonda(tx, localidadId, target);
        await tx.ronda.update({ where: { id: bajas[i].id }, data: { rondaNumero: target, orden: tam + 1 } });
      }
    }
  }

  // ALTAS: FIFO en R1 (respeta HOLD: las ALTAS en hold se mueven fuera de R1)
  private static async ordenarAltasR1_FIFO(tx: Tx, localidadId: number) {
    const filas = await tx.ronda.findMany({
      where: { localidadId, concluido: false },
      include: { movimiento: { select: { id: true, prioridad: true, createdAt: true } } },
      orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }],
    });

    let guard = 0;
    for (const f of filas) {
      if (++guard > MAX_GUARD_ITERS) break;
      if (f.movimiento.prioridad !== 'ALTA') continue;

      if (_isOnHold(f.movimiento.id)) {
        if (f.rondaNumero === 1) {
          const tamR2 = await this.tamanoDeRonda(tx, localidadId, 2);
          await this.moverRonda(tx, f, 2, tamR2 + 1);
        }
        continue;
      }

      if (f.rondaNumero !== 1) {
        const tamR1 = await this.tamanoDeRonda(tx, localidadId, 1);
        await this.moverRonda(tx, f, 1, tamR1 + 1);
      }
    }

    const r1 = await tx.ronda.findMany({
      where: { localidadId, rondaNumero: 1, concluido: false },
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

  // BAJAS: reequilibrio general tipo "Robin Hood"
  private static async reequilibrarBajasRobinHood(tx: Tx, localidadId: number) {
    const altas = await tx.ronda.findMany({
      where: { localidadId, concluido: false, movimiento: { prioridad: 'ALTA' } },
      select: { movimiento: { select: { id: true } } },
    });
    const hayAltasSinHold = altas.some(a => !_isOnHold(a.movimiento.id));
    const startRound = hayAltasSinHold ? 2 : 1;

    await this.garantizarUnSlotBajasPorEmpresaPorRonda(tx, localidadId, startRound);

    const bajas = await tx.ronda.findMany({
      where: {
        localidadId,
        concluido: false,
        rondaNumero: { gte: startRound },
        movimiento: {
          prioridad: 'BAJA',
          estado: { in: ['ESPERA', 'SOLICITADO', 'EN_PROCESO'] as any },
        },
      },
      include: {
        movimiento: {
          select: {
            id: true,
            createdAt: true,
            estado: true,
          },
        },
      },
      orderBy: [
        { rondaNumero: 'asc' },
        { orden: 'asc' },
      ],
    });

    if (!bajas.length) return;

    const porEmpresa = new Map<number, typeof bajas>();
    for (const r of bajas) {
      const arr = porEmpresa.get(r.empresaId) ?? [];
      arr.push(r);
      porEmpresa.set(r.empresaId, arr);
    }

    for (const [empresaId, arr] of porEmpresa) {
      arr.sort((a, b) => {
        const da = new Date((a.movimiento as any).createdAt).getTime();
        const db = new Date((b.movimiento as any).createdAt).getTime();
        return da - db;
      });
      porEmpresa.set(empresaId, arr);
    }

    const empresas = [...porEmpresa.keys()].sort((a, b) => a - b);

    let ronda = startRound;
    let guard = 0;
    while ([...porEmpresa.values()].some(arr => arr.length > 0) && guard++ < MAX_GUARD_ITERS) {
      let orden = 1;
      for (const e of empresas) {
        const arr = porEmpresa.get(e)!;
        if (!arr.length) continue;

        const item = arr.shift()!;
        await tx.ronda.update({
          where: { id: item.id },
          data: { rondaNumero: ronda, orden },
        });
        orden++;
      }
      await this.compactarOrdenesRonda(tx, localidadId, ronda);
      ronda++;
    }

    const grupos = await tx.ronda.findMany({
      where: { localidadId, concluido: false },
      select: { rondaNumero: true },
      distinct: ['rondaNumero'],
      orderBy: { rondaNumero: 'asc' },
    });

    let idx = 1;
    for (const g of grupos) {
      if (g.rondaNumero !== idx) {
        await tx.ronda.updateMany({
          where: { localidadId, rondaNumero: g.rondaNumero },
          data: { rondaNumero: idx },
        });
      }
      await this.compactarOrdenesRonda(tx, localidadId, idx);
      idx++;
    }
  }

  // Reset suave cuando hay demasiadas rondas activas: se recortan las más antiguas
  private static async resetSiExcesoDeRondas(tx: Tx, localidadId: number) {
    const grupos = await tx.ronda.findMany({
      where: { localidadId, concluido: false },
      select: { rondaNumero: true },
      distinct: ['rondaNumero'],
      orderBy: { rondaNumero: 'asc' },
    });

    if (grupos.length <= MAX_RONDAS_ACTIVAS) return;

    const roundsToDrop = grupos.slice(0, grupos.length - MAX_RONDAS_ACTIVAS).map(g => g.rondaNumero);

    if (roundsToDrop.length) {
      await tx.ronda.deleteMany({
        where: { localidadId, concluido: false, rondaNumero: { in: roundsToDrop } },
      });
    }

    const activos = await tx.ronda.findMany({
      where: { localidadId, concluido: false },
      select: { rondaNumero: true },
      distinct: ['rondaNumero'],
      orderBy: { rondaNumero: 'asc' },
    });

    let idx = 1;
    for (const g of activos) {
      if (g.rondaNumero !== idx) {
        await tx.ronda.updateMany({
          where: { localidadId, rondaNumero: g.rondaNumero },
          data: { rondaNumero: idx },
        });
      }
      await this.compactarOrdenesRonda(tx, localidadId, idx);
      idx++;
    }
  }

  // ---------- RECOMPOSICIÓN GENERAL ----------
  public static async recomponerRondasLocalidad(localidadId: number, tx: Tx = prisma) {
    await this.eliminarRondasHuerfanasYDuplicadas(tx, localidadId);

    await tx.ronda.deleteMany({
      where: {
        localidadId,
        movimiento: { OR: [{ finalizado: true }, { estado: { in: ['CONCLUIDO', 'CANCELADO'] } }] }
      }
    });

    await tx.ronda.deleteMany({ where: { localidadId, concluido: true } });

    const grupos = await tx.ronda.findMany({
      where: { localidadId, concluido: false },
      select: { rondaNumero: true },
      distinct: ['rondaNumero'],
      orderBy: { rondaNumero: 'asc' },
    });

    let idx = 1;
    for (const g of grupos) {
      if (g.rondaNumero !== idx) {
        await tx.ronda.updateMany({
          where: { localidadId, rondaNumero: g.rondaNumero },
          data: { rondaNumero: idx },
        });
      }
      await this.compactarOrdenesRonda(tx, localidadId, idx);
      idx++;
    }

    await this.ordenarAltasR1_FIFO(tx, localidadId);
    await this.reequilibrarBajasRobinHood(tx, localidadId);
    await this.resetSiExcesoDeRondas(tx, localidadId);
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
        const ord = (await this.tamanoDeRonda(tx, m.localidadId, 1)) + 1;
        r = await tx.ronda.create({
          data: { movimientoId, empresaId: m.empresaId, localidadId: m.localidadId, rondaNumero: 1, orden: ord }
        });
      }

      const r1 = await tx.ronda.findMany({
        where: { localidadId: m.localidadId, rondaNumero: 1, concluido: false },
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
        const ord = data.preferirR1 ? (data.posicion ?? 1) : (await this.tamanoDeRonda(tx, data.localidadId, 1)) + 1;
        await this.insertarEnPosicion(tx, data.localidadId, 1, ord, {
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

  static async generarRondaParaMovimiento(
    data: { movimientoId: number; empresaId: number; localidadId: number; prioridad: 'ALTA' | 'BAJA' }
  ) {
    return this.insertarRondaSolvente(data);
  }

  private static async _insertarBajaConRobinHood(
    tx: Tx,
    params: { localidadId: number; empresaId: number; movimientoId: number }
  ) {
    const { localidadId, empresaId, movimientoId } = params;

    const altas = await tx.ronda.findMany({
      where: { localidadId, concluido: false, movimiento: { prioridad: 'ALTA' } },
      select: { movimiento: { select: { id: true } } },
    });
    const hayAltasSinHold = altas.some(a => !_isOnHold(a.movimiento.id));
    const startRound = hayAltasSinHold ? 2 : 1;

    const aggEmpresa = await tx.ronda.aggregate({
      where: {
        localidadId,
        empresaId,
        concluido: false,
        movimiento: { prioridad: 'BAJA' },
      },
      _max: { rondaNumero: true },
    });

    let rondaDestino: number = startRound;

    if (aggEmpresa._max.rondaNumero != null) {
      const maxEmpresa = aggEmpresa._max.rondaNumero!;
      rondaDestino = Math.max(maxEmpresa + 1, startRound);
    } else {
      let r = startRound;
      for (let guard = 0; guard < MAX_SCAN_ROUNDS; guard++) {
        const ya = await tx.ronda.count({
          where: {
            localidadId,
            rondaNumero: r,
            concluido: false,
            empresaId,
            movimiento: { prioridad: 'BAJA' },
          },
        });
        if (ya === 0) {
          rondaDestino = r;
          break;
        }
        r++;
      }
    }

    const ord = (await this.tamanoDeRonda(tx, localidadId, rondaDestino)) + 1;
    await tx.ronda.create({
      data: {
        movimientoId,
        empresaId,
        localidadId,
        rondaNumero: rondaDestino,
        orden: ord,
      },
    });

    await this.garantizarUnSlotBajasPorEmpresaPorRonda(tx, localidadId, startRound);

    const grupos = await tx.ronda.findMany({
      where: { localidadId, concluido: false },
      select: { rondaNumero: true },
      distinct: ['rondaNumero'],
      orderBy: { rondaNumero: 'asc' },
    });

    let idx = 1;
    for (const g of grupos) {
      if (g.rondaNumero !== idx) {
        await tx.ronda.updateMany({
          where: { localidadId, rondaNumero: g.rondaNumero },
          data: { rondaNumero: idx },
        });
      }
      await this.compactarOrdenesRonda(tx, localidadId, idx);
      idx++;
    }
  }

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
          nuevo.push(self.id);
          for (let i = 0; i < nuevo.length; i++) {
            await tx.ronda.update({ where: { id: nuevo[i] }, data: { orden: i + 1 } });
          }
        }

        await this.compactarOrdenesRonda(tx, localidadId, 1);
        await this.recomponerRondasLocalidad(localidadId, tx);
        return;
      }

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
          where: { localidadId, rondaNumero: targetRonda, concluido: false },
        });
        if (existe > 0) return existe + 1;
        const max = await tx.ronda.aggregate({
          where: { localidadId, concluido: false },
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
                where: { localidadId, concluido: false },
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
              where: { localidadId, concluido: false },
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

  static async siguienteParaMaquinista(localidadId: number, usuarioId?: number) {
    return prisma.$transaction(async (tx) => {
      await this.liberarMovimientosEnProcesoPorTimeout(tx, localidadId);

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

        if (m.estado === 'EN_PROCESO') {
          if (!m.operadorId) return true;
          if (usuarioId && m.operadorId === usuarioId) return true;
          return false;
        }

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
        where: { localidadId, concluido: false },
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
        if (!m) return false;

        if (m.estado === 'EN_PROCESO') {
          if (!m.operadorId) return true;
          if (usuarioId && m.operadorId === usuarioId) return true;
          return false;
        }

        return true;
      });

      if (!candidato) {
        return { vacio: true as const, motivo: 'sin_rondas_libres' };
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

  static async siguienteInteligente(localidadId: number, userId?: number) {
    const rondas = await prisma.ronda.findMany({
      where: {
        localidadId,
        concluido: false,
      },
      include: {
        movimiento: {
          include: {
            viaDestino: true,
            viaOrigen: true,
          },
        },
        empresa: true,
      },
      orderBy: [
        { rondaNumero: 'asc' },
        { orden: 'asc' },
      ],
    });

    if (!rondas.length) {
      return { vacio: true, motivo: 'Sin rondas activas en la localidad' };
    }

    if (userId) {
      const propia = rondas.find((r: any) => {
        const mov = r.movimiento as any;
        if (!mov) return false;
        if (mov.estado !== 'EN_PROCESO') return false;
        if (mov.operadorId !== userId && mov.maquinistaId !== userId) return false;
        return !esReasignablePorTiempo(mov);
      });

      if (propia) {
        const mov = propia.movimiento as any;
        return {
          rondaId: propia.id,
          movimientoId: mov.id,
          empresaId: mov.empresaId,
          prioridad: mov.prioridad,
          locomotiveNumber: mov.locomotora ?? mov.locomotiveNumber ?? null,
          viaDestino: mov.viaDestino?.nombre ?? null,
          bloqueado: false,
          permiteInicio: false,
          enCursoPropio: true,
        };
      }
    }

    for (const r of rondas) {
      const mov = r.movimiento as any;
      if (!mov) continue;

      const esServicio = !!(mov.lavado || mov.torno);
      const esReasignable = mov.estado === 'EN_PROCESO' && esReasignablePorTiempo(mov);

      if (esServicio) {
        if (!['EN_PROCESO', 'SOLICITADO', 'DETENIDO'].includes(mov.estado)) {
          continue;
        }

        return {
          rondaId: r.id,
          movimientoId: mov.id,
          empresaId: mov.empresaId,
          prioridad: mov.prioridad,
          locomotiveNumber: mov.locomotora ?? mov.locomotiveNumber ?? null,
          viaDestino: mov.viaDestino?.nombre ?? null,
          bloqueado: false,
          permiteInicio: true,
        };
      }

      if (mov.estado === 'EN_PROCESO' && !esReasignable) {
        continue;
      }

      if (!['EN_PROCESO', 'SOLICITADO', 'DETENIDO'].includes(mov.estado)) continue;

      return {
        rondaId: r.id,
        movimientoId: mov.id,
        empresaId: mov.empresaId,
        prioridad: mov.prioridad,
        locomotiveNumber: mov.locomotora ?? mov.locomotiveNumber ?? null,
        viaDestino: mov.viaDestino?.nombre ?? null,
        bloqueado: false,
        permiteInicio: true,
      };
    }

    return {
      vacio: true,
      motivo:
        'Hay rondas pero todos los movimientos están en proceso reciente de otro operador (<30 min)',
    };
  }

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

    const ids = [ (m as any).clienteId, (m as any).supervisorId, (m as any).coordinadorId, (m as any).operadorId ].filter(Boolean) as number[];
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

  private static async limpiarYReorganizarRondasConcluidas() {
    const locs = await prisma.ronda.findMany({ select: { localidadId: true }, distinct: ['localidadId'] });
    for (const { localidadId } of locs) {
      await prisma.$transaction(async (tx) => {
        await tx.ronda.deleteMany({ where: { localidadId, concluido: true } });
        await this.eliminarRondasHuerfanasYDuplicadas(tx, localidadId);
        await this.recomponerRondasLocalidad(localidadId, tx);
      });
    }
  }

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
          fechaInicio: info.movimiento.fechaInicio,
          fechaFin: info.movimiento.fechaFin,
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
      const rondaActualizada = await prisma.ronda.update({
        where: { id },
        data: { concluido: true, updatedAt: new Date() },
      });
      await this.recomponerRondasLocalidad(rondaActualizada.localidadId);
      return rondaActualizada;
    } catch (error) {
      movimientoError.error('Error al marcar ronda como concluida', { id, error });
      throw new Error('Error al marcar ronda como concluida');
    }
  }
}
