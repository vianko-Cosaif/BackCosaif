// src/models/RondaModel.ts
import { movimientoError } from "../movimiento.logger";
import { Prisma, PrismaClient } from '@prisma/client';
import type { Ronda } from '@prisma/client';
import admin from 'firebase-admin';
import { sendMulticastCompat } from "../../../services/fcmCompat";
import { tokensAudienciaOperacion } from "../../../services/fcmAudience";
import { resolverAudienciaFcmMovimiento } from "../../../services/serviceFcmRouting";

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

// ================== CONSTANTES / GUARDAS ==================
const MAX_GUARD_ITERS = 1000;
const MAX_SCAN_ROUNDS = 500;
const AUTO_CIERRE_EN_PROCESO_MS = 2 * 60 * 60 * 1000; // 2 horas
const AUTO_CIERRE_DURACION_MS = 30 * 60 * 1000; // 30 minutos

// Movimiento bloqueado al operador que lo inició por 30 min
const BLOQUEO_OPERADOR_MS = 30 * 60 * 1000; // 30 minutos

function esReasignablePorTiempo(mov: any): boolean {
  // AJUSTA estos campos al nombre real en tu Prisma:
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

// Fecha base para ordenar BAJAS (más viejo primero).
function fechaOrdenBaja(mov: any): number {
  const base = mov?.fechaSolicitud ?? mov?.createdAt ?? mov?.updatedAt ?? 0;
  const t = base instanceof Date ? base.getTime() : new Date(base).getTime();
  return Number.isFinite(t) ? t : 0;
}

// Prioridad por estado en BAJAS: DETENIDO va al final para dejar pasar a los demás.
function prioridadEstadoBaja(estado: string): number {
  return estado === 'DETENIDO' ? 1 : 0;
}

// Detecta si una ronda BAJA quedó desordenada (o con empresas duplicadas).
function necesitaReequilibrarBajas(rondas: any[]): boolean {
  let rondaActual = -1;
  let ultimaFecha = -Infinity;
  let ultimaPrioridad = -1;
  const empresasEnRonda = new Set<number>();

  for (const r of rondas) {
    if (r.rondaNumero !== rondaActual) {
      rondaActual = r.rondaNumero;
      ultimaFecha = -Infinity;
      ultimaPrioridad = -1;
      empresasEnRonda.clear();
    }

    const mov = r.movimiento as any;
    if (!mov || mov.prioridad !== 'BAJA') continue;
    if (!['SOLICITADO', 'EN_PROCESO', 'DETENIDO'].includes(mov.estado)) continue;

    if (empresasEnRonda.has(r.empresaId)) return true;

    const prioridad = prioridadEstadoBaja(mov.estado);
    const fecha = fechaOrdenBaja(mov);
    if (prioridad < ultimaPrioridad) return true;
    if (prioridad === ultimaPrioridad && fecha < ultimaFecha) return true;

    empresasEnRonda.add(r.empresaId);
    ultimaPrioridad = prioridad;
    ultimaFecha = fecha;
  }

  return false;
}

function tieneEstructuraDeOrdenInvalida(rondas: any[]): boolean {
  let rondaActual: number | null = null;
  let siguienteRondaEsperada = 1;
  let siguienteOrdenEsperado = 1;

  for (const r of rondas) {
    if (!Number.isInteger(r.rondaNumero) || r.rondaNumero <= 0) return true;
    if (!Number.isInteger(r.orden) || r.orden <= 0) return true;

    if (r.rondaNumero !== rondaActual) {
      if (r.rondaNumero !== siguienteRondaEsperada) return true;
      rondaActual = r.rondaNumero;
      siguienteRondaEsperada += 1;
      siguienteOrdenEsperado = 1;
    }

    if (r.orden !== siguienteOrdenEsperado) return true;
    siguienteOrdenEsperado += 1;
  }

  return false;
}

function tieneAltasR1Desordenadas(rondas: any[]): boolean {
  const r1 = rondas.filter((r) => r.rondaNumero === 1);
  const altasActivas = r1
    .filter((r) => r.movimiento?.prioridad === 'ALTA' && !_isOnHold(r.movimiento.id))
    .sort(
      (a, b) =>
        +new Date(a.movimiento.createdAt) -
        +new Date(b.movimiento.createdAt)
    );

  if (!altasActivas.length) return false;

  for (let i = 0; i < altasActivas.length; i++) {
    if (r1[i]?.id !== altasActivas[i].id) return true;
  }

  return false;
}

// ================== MODELO ==================
export class RondaModel {
  // ---------- HELPERS INTERNOS (SIN CRON) ----------

  /**
   * Corrige movimientos trabados:
   * si ya tienen fechaFin pero siguen en EN_PROCESO, se concluyen de inmediato.
   */
  private static async cerrarMovimientosEnProcesoConFechaFin(
    tx: Tx,
    localidadId: number
  ) {
    const movimientosTrabados = await tx.movimiento.findMany({
      where: {
        localidadId,
        estado: 'EN_PROCESO',
        fechaFin: { not: null },
      },
      select: {
        id: true,
        fechaFin: true,
        ronda: { select: { id: true } },
      },
    });

    if (!movimientosTrabados.length) return;

    for (const movimiento of movimientosTrabados) {
      await tx.movimiento.update({
        where: { id: movimiento.id },
        data: {
          estado: 'CONCLUIDO',
          finalizado: true,
          updatedAt: new Date(),
          incidenteGlobal: false,
        },
      });

      if (movimiento.ronda) {
        await tx.ronda.update({
          where: { id: movimiento.ronda.id },
          data: { concluido: true, updatedAt: new Date() },
        });
      }
    }

    await this.recomponerRondasLocalidad(localidadId, tx);

    movimientoError.warn('Movimientos corregidos por fechaFin existente', {
      localidadId,
      cantidad: movimientosTrabados.length,
      movimientos: movimientosTrabados.map((movimiento) => movimiento.id),
    });
  }


  /**
   * Cierra movimientos EN_PROCESO que llevan más de AUTO_CIERRE_EN_PROCESO_MS.
   * El cierre es "perezoso": ocurre cuando se consulta la ronda/localidad.
   *
   * Regla de negocio:
   * - Si el movimiento inició a las 12:30, su fechaFin automática será 13:00.
   * - No usa la hora actual de autocierre como fechaFin operativa.
   */
  private static async cerrarMovimientosEnProcesoPorTimeout(
    tx: Tx,
    localidadId: number
  ) {
    const limite = new Date(Date.now() - AUTO_CIERRE_EN_PROCESO_MS);
    const movimientosVencidos = await tx.movimiento.findMany({
      where: {
        localidadId,
        estado: 'EN_PROCESO',
        finalizado: false,
        fechaInicio: { not: null, lte: limite },
      },
      select: {
        id: true,
        fechaInicio: true,
        localidadId: true,
        ronda: { select: { id: true } },
      },
    });

    if (!movimientosVencidos.length) return;

    for (const movimiento of movimientosVencidos) {
      const fechaInicio = movimiento.fechaInicio;
      if (!fechaInicio) continue;

      const fechaFinAutomatica = new Date(fechaInicio.getTime() + AUTO_CIERRE_DURACION_MS);

      await tx.movimiento.update({
        where: { id: movimiento.id },
        data: {
          estado: 'CONCLUIDO',
          finalizado: true,
          fechaFin: fechaFinAutomatica,
          updatedAt: new Date(),
          incidenteGlobal: false,
        },
      });

      if (movimiento.ronda) {
        await tx.ronda.update({
          where: { id: movimiento.ronda.id },
          data: { concluido: true, updatedAt: new Date() },
        });
      }
    }

    await this.recomponerRondasLocalidad(localidadId, tx);

    movimientoError.warn('Movimientos autocerrados por timeout EN_PROCESO', {
      localidadId,
      timeoutMs: AUTO_CIERRE_EN_PROCESO_MS,
      duracionOperativaMs: AUTO_CIERRE_DURACION_MS,
      cantidad: movimientosVencidos.length,
      movimientos: movimientosVencidos.map((movimiento) => movimiento.id),
    });
  }

  private static async normalizarMovimientosEnProceso(localidadId: number, tx: Tx = prisma) {
    try {
      await this.cerrarMovimientosEnProcesoConFechaFin(tx, localidadId);
      await this.cerrarMovimientosEnProcesoPorTimeout(tx, localidadId);
    } catch (error: any) {
      movimientoError.error('Error al normalizar movimientos EN_PROCESO', {
        localidadId,
        errName: error?.name,
        errMsg: error?.message,
        errStack: error?.stack,
      });
    }
  }

  // ---------- HELPERS CRUD RONDA ----------
  private static async insertarEnPosicion(
    tx: Tx,
    localidadId: number,
    rondaNumero: number,
    orden: number,
    data: Omit<Ronda, 'id' | 'createdAt' | 'updatedAt' | 'concluido' | 'rondaNumero' | 'orden'>,
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

  private static async primeraRondaLibreParaEmpresaBaja(
    tx: Tx, localidadId: number, empresaId: number, desdeRonda: number
  ): Promise<number> {
    let r = Math.max(1, desdeRonda);
    for (let guard = 0; guard < MAX_SCAN_ROUNDS; guard++) {
      const c = await tx.ronda.count({
        where: {
          localidadId,
          rondaNumero: r,
          concluido: false,
          empresaId,
          movimiento: { prioridad: 'BAJA' },
        },
      });
      if (c === 0) return r;
      r++;
    }
    return r;
  }

  // Compacta órdenes internos de una ronda (1..N).
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

  // Ordena BAJAS dentro de una ronda:
  // 1) SOLICITADO/EN_PROCESO primero; 2) DETENIDO al final; 3) por fechaSolicitud.
  private static ordenarBajasPorTiempoEnRonda<T extends { empresaId: number; movimiento: any }>(arr: T[]): T[] {
    return arr.sort((a, b) => {
      const pa = prioridadEstadoBaja((a.movimiento as any).estado);
      const pb = prioridadEstadoBaja((b.movimiento as any).estado);
      if (pa !== pb) return pa - pb;
      const ta = fechaOrdenBaja(a.movimiento);
      const tb = fechaOrdenBaja(b.movimiento);
      if (ta !== tb) return ta - tb;
      return a.empresaId - b.empresaId;
    });
  }

  // Evita que la última empresa de una ronda sea la primera de la siguiente,
  // salvo que en la ronda siguiente no exista alternativa.
  private static equilibrarBordeEntreRondas<T extends { empresaId: number }>(
    rondasOrdenadas: Array<[number, T[]]>
  ) {
    let ultimaEmpresaRondaAnterior: number | null = null;

    for (const [, arr] of rondasOrdenadas) {
      if (!arr.length) continue;

      if (ultimaEmpresaRondaAnterior != null && arr.length > 1 && arr[0].empresaId === ultimaEmpresaRondaAnterior) {
        const idxAlterno = arr.findIndex((row) => row.empresaId !== ultimaEmpresaRondaAnterior);
        if (idxAlterno > 0) {
          const [alterno] = arr.splice(idxAlterno, 1);
          arr.unshift(alterno);
        }
      }

      ultimaEmpresaRondaAnterior = arr[arr.length - 1]?.empresaId ?? ultimaEmpresaRondaAnterior;
    }
  }

  // Elimina duplicados (misma movimientoId) sin borrar movimientos concluidos.
  private static async eliminarRondasHuerfanasYDuplicadas(tx: Tx, localidadId: number) {
    const filas = await tx.ronda.findMany({
      where: { localidadId, concluido: false },
      select: { id: true, movimientoId: true, rondaNumero: true, orden: true },
      orderBy: [{ movimientoId: 'asc' }, { rondaNumero: 'asc' }, { orden: 'asc' }]
    });

    for (let i = 0; i < filas.length;) {
      const movId = filas[i].movimientoId;
      const group = filas.filter(f => f.movimientoId === movId);
      if (group.length > 1) {
        const drop = group.slice(1).map(g => g.id);
        await tx.ronda.deleteMany({ where: { id: { in: drop } } });
      }
      i += group.length || 1;
    }
  }

  // Saca de la cola operativa movimientos detenidos por incidente abierto.
  private static async eliminarRondasDetenidasZombie(tx: Tx, localidadId: number) {
    await tx.ronda.deleteMany({
      where: {
        localidadId,
        concluido: false,
        movimiento: {
          estado: 'DETENIDO',
          finalizado: false,
          incidenteGlobal: true,
        },
      },
    });
  }

  // Borra solo rondas activas cuya carga ya terminó por completo.
  private static async eliminarRondasCompletadas(tx: Tx, localidadId: number) {
    const grupos = await tx.ronda.findMany({
      where: { localidadId, concluido: false },
      select: { rondaNumero: true },
      distinct: ['rondaNumero'],
      orderBy: { rondaNumero: 'asc' },
    });

    for (const g of grupos) {
      const activos = await tx.ronda.count({
        where: {
          localidadId,
          concluido: false,
          rondaNumero: g.rondaNumero,
          movimiento: {
            finalizado: false,
            estado: { in: ['SOLICITADO', 'EN_PROCESO', 'DETENIDO'] as any },
          },
        },
      });
      if (activos === 0) {
        await tx.ronda.deleteMany({ where: { localidadId, concluido: false, rondaNumero: g.rondaNumero } });
      }
    }
  }

  // Renumera solo rondas activas a 1..N y compacta órdenes.
  private static async renumerarRondas(tx: Tx, localidadId: number) {
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
          where: { localidadId, concluido: false, rondaNumero: g.rondaNumero },
          data: { rondaNumero: idx },
        });
      }
      await this.compactarOrdenesRonda(tx, localidadId, idx);
      idx++;
    }
  }

  /** En BAJAS: máx 1 por empresa por ronda. En ALTAS: sin límite (cola FIFO en R1). */
  private static async garantizarUnSlotBajasPorEmpresaPorRonda(tx: Tx, localidadId: number, startRound: number) {
    const filas = await tx.ronda.findMany({
      where: { localidadId, concluido: false, rondaNumero: { gte: startRound } },
      include: { movimiento: { select: { prioridad: true, fechaSolicitud: true, createdAt: true } } },
      orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }],
    });

    const bucket = new Map<string, { id: number; prioridad: 'ALTA' | 'BAJA'; fecha: number }[]>();
    for (const f of filas) {
      const key = `${f.rondaNumero}:${f.empresaId}`;
      const arr = bucket.get(key) ?? [];
      arr.push({
        id: f.id,
        prioridad: f.movimiento.prioridad as 'ALTA' | 'BAJA',
        fecha: fechaOrdenBaja(f.movimiento),
      });
      bucket.set(key, arr);
    }

    for (const [key, rows] of bucket) {
      const bajas = rows
        .filter(r => r.prioridad !== 'ALTA')
        .sort((a, b) => a.fecha - b.fecha);
      if (bajas.length <= 1) continue;

      const [rondaNumeroStr, empresaIdStr] = key.split(':');
      const rondaActual = parseInt(rondaNumeroStr, 10);
      const empresaId = parseInt(empresaIdStr, 10);

      // Mantener el más viejo de esa empresa en esta ronda; mover el resto hacia abajo.
      for (let i = 1; i < bajas.length; i++) {
        const target = await this.primeraRondaLibreParaEmpresaBaja(tx, localidadId, empresaId, rondaActual + 1);
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

  // BAJAS: normalización estable por ronda (sin re-balancear entre rondas).
  // - Respeta: máx 1 BAJA por empresa por ronda.
  // - Orden en cada ronda: SOLICITADO/EN_PROCESO primero, luego DETENIDO; por fechaSolicitud.
  private static async reequilibrarBajasRobinHood(tx: Tx, localidadId: number) {
    // 1) Ver si hay ALTAS sin hold para arrancar desde R2
    const altas = await tx.ronda.findMany({
      where: { localidadId, concluido: false, movimiento: { prioridad: 'ALTA' } },
      select: { movimiento: { select: { id: true } } },
    });
    const hayAltasSinHold = altas.some(a => !_isOnHold(a.movimiento.id));
    const startRound = hayAltasSinHold ? 2 : 1;

    // 2) Asegurar máx 1 BAJA por empresa por ronda a partir de startRound
    await this.garantizarUnSlotBajasPorEmpresaPorRonda(tx, localidadId, startRound);

    // 3) Reordenar SOLO dentro de cada ronda (no mover entre rondas)
    const bajas = await tx.ronda.findMany({
      where: {
        localidadId,
        concluido: false,
        rondaNumero: { gte: startRound },
        movimiento: {
          prioridad: 'BAJA',
          estado: { in: ['SOLICITADO', 'EN_PROCESO', 'DETENIDO'] as any },
        },
      },
      include: {
        movimiento: { select: { fechaSolicitud: true, createdAt: true, estado: true } },
      },
      orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }],
    });

    if (!bajas.length) return;

    // Agrupar por rondaNumero
    const porRonda = new Map<number, typeof bajas>();
    for (const r of bajas) {
      const arr = porRonda.get(r.rondaNumero) ?? [];
      arr.push(r);
      porRonda.set(r.rondaNumero, arr);
    }

    const rondasOrdenadas = Array.from(porRonda.entries()).sort((a, b) => a[0] - b[0]);

    for (const [, arr] of rondasOrdenadas) {
      this.ordenarBajasPorTiempoEnRonda(arr);
    }

    this.equilibrarBordeEntreRondas(rondasOrdenadas);

    for (const [rondaNumero, arr] of rondasOrdenadas) {
      for (let i = 0; i < arr.length; i++) {
        const row = arr[i];
        const nuevoOrden = i + 1;
        if (row.orden !== nuevoOrden) {
          await tx.ronda.update({ where: { id: row.id }, data: { orden: nuevoOrden } });
          row.orden = nuevoOrden;
        }
      }

      await this.compactarOrdenesRonda(tx, localidadId, rondaNumero);
    }
  }


  // ---------- RECOMPOSICIÓN GENERAL (CLARA POR RONDAS) ----------
  public static async recomponerRondasLocalidad(localidadId: number, tx: Tx = prisma) {
    // 0) Limpiar duplicadas (no borrar concluidas aquí)
    await this.eliminarRondasHuerfanasYDuplicadas(tx, localidadId);

    // 0.1) Sacar detenidos zombi de la cola operativa
    await this.eliminarRondasDetenidasZombie(tx, localidadId);

    // 1) Eliminar rondas COMPLETADAS (todas sus movimientos ya terminaron)
    await this.eliminarRondasCompletadas(tx, localidadId);

    // 2) Renumerar rondas existentes (1..N) y compactar órdenes activos
    await this.renumerarRondas(tx, localidadId);

    // 3) ALTAS → R1 (FIFO), respetando HOLD
    await this.ordenarAltasR1_FIFO(tx, localidadId);

    // 4) BAJAS → normalización por ronda (sin re-balancear entre rondas)
    await this.reequilibrarBajasRobinHood(tx, localidadId);

    // 5) Si quedaron rondas vacías tras reordenar, limpiar y renumerar de nuevo
    await this.eliminarRondasCompletadas(tx, localidadId);
    await this.renumerarRondas(tx, localidadId);
  }

  public static async asegurarOrdenRondasLocalidad(localidadId: number) {
    await this.normalizarMovimientosEnProceso(localidadId);

    const rondas = await prisma.ronda.findMany({
      where: {
        localidadId,
        concluido: false,
      },
      include: {
        movimiento: {
          select: {
            id: true,
            prioridad: true,
            estado: true,
            fechaSolicitud: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: [
        { rondaNumero: 'asc' },
        { orden: 'asc' },
        { id: 'asc' },
      ],
    });

    if (!rondas.length) {
      return { reorganizado: false, motivo: 'sin_rondas' as const };
    }

    const requiereRecomponer =
      tieneEstructuraDeOrdenInvalida(rondas) ||
      tieneAltasR1Desordenadas(rondas) ||
      necesitaReequilibrarBajas(rondas);

    if (!requiereRecomponer) {
      return { reorganizado: false, motivo: 'orden_ok' as const };
    }

    await this.recomponerRondasLocalidad(localidadId);
    return { reorganizado: true, motivo: 'orden_recompuesto' as const };
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
  /**
   * ALTAS → R1 (opcionalmente fijar posición).
   * BAJAS → 1 por empresa por ronda; inicia en R2 si hay ALTAS sin hold, si no desde R1.
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

  /** Compat: mismo nombre que antes. */
  static async generarRondaParaMovimiento(
    data: { movimientoId: number; empresaId: number; localidadId: number; prioridad: 'ALTA' | 'BAJA' }
  ) {
    return this.insertarRondaSolvente(data);
  }
  /** PRIVADO: inserción BAJA con robin-hood + compactación. */
  private static async _insertarBajaConRobinHood(
    tx: Tx,
    params: { localidadId: number; empresaId: number; movimientoId: number }
  ) {
    const { localidadId, empresaId, movimientoId } = params;

    // 1) ¿Hay ALTAS sin hold? → Bajas arrancan desde R2, si no desde R1.
    const altas = await tx.ronda.findMany({
      where: { localidadId, concluido: false, movimiento: { prioridad: 'ALTA' } },
      select: { movimiento: { select: { id: true } } },
    });
    const hayAltasSinHold = altas.some(a => !_isOnHold(a.movimiento.id));
    const startRound = hayAltasSinHold ? 2 : 1;

    // 2) Ver si ESTA empresa ya tiene bajas “en cola” (cualquier ronda)
    const aggEmpresa = await tx.ronda.aggregate({
      where: {
        localidadId,
        empresaId,
        concluido: false,
        movimiento: { prioridad: 'BAJA' },
      },
      _max: { rondaNumero: true },
    });

    // valor por defecto para que TS siempre tenga algo
    let rondaDestino: number = startRound;

    if (aggEmpresa._max.rondaNumero != null) {
      // Ya tiene cadena de Bajas:
      // - Si tiene algo en R2/R3/etc → la nueva va DESPUÉS de la más lejana.
      // - Nunca subimos por encima de startRound (por si hay ALTAS y startRound=2).
      const maxEmpresa = aggEmpresa._max.rondaNumero!;
      rondaDestino = Math.max(maxEmpresa + 1, startRound);
    } else {
      // Primera BAJA de esta empresa → buscar la primera ronda >= startRound
      // sin BAJA de esta empresa.
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
      // si por guard no encontró hueco, se queda con el último r probado
      // (o con startRound si ni siquiera entró al for)
    }

    // 3) Insertar al final de esa ronda destino
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

    // 4) Regla de "máx 1 BAJA por empresa por ronda" + compactación local
    await this.garantizarUnSlotBajasPorEmpresaPorRonda(tx, localidadId, startRound);

    // 5) Compactar/renumerar rondas a 1..N
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
      // Siempre reacomoda toda la empresa
      const empresasBaja = await tx.ronda.findMany({
        where: { localidadId, concluido: false, movimiento: { prioridad: 'BAJA' } },
        select: { empresaId: true },
        distinct: ['empresaId'],
      });

      // toda la cadena de ESA empresa
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

      // helper: asegura que exista la ronda y regresa orden donde insertar
      const ensureTargetRound = async (targetRonda: number): Promise<number> => {
        const existe = await tx.ronda.count({
          where: { localidadId, rondaNumero: targetRonda, concluido: false },
        });
        if (existe > 0) return existe + 1; // al final
        // no existe → crear número de ronda al vuelo
        const max = await tx.ronda.aggregate({
          where: { localidadId, concluido: false },
          _max: { rondaNumero: true },
        });
        const nuevaRonda = Math.max(targetRonda, (max._max.rondaNumero ?? 0) + 1);
        // al mover, moverRonda se encarga; aquí solo decimos que el primer orden es 1
        return 1;
      };

      // ========== CASO: solo hay una empresa en bajas ==========
      // alternar 1 ↔ 2 pero respetando orden relativo
      if (empresasBaja.length === 1) {
        // procesar de atrás hacia adelante para no pisar órdenes
        for (let i = chain.length - 1; i >= 0; i--) {
          const row = chain[i];
          const targetRonda = row.rondaNumero === 1 ? 2 : 1;

          // si en la ronda destino hay otro movimiento de la misma empresa que estaba después,
          // lo ponemos ANTES de ese para respetar el orden.
          const next = chain[i + 1];
          if (next && next.rondaNumero === targetRonda) {
            // insertar antes del next
            await tx.ronda.updateMany({
              where: { localidadId, rondaNumero: targetRonda, concluido: false, orden: { gte: next.orden } },
              data: { orden: { increment: 1 } },
            });
            await this.moverRonda(tx, row as any, targetRonda, next.orden);
          } else {
            const tam = await this.tamanoDeRonda(tx, localidadId, targetRonda);
            // si no hay ronda, tam será 0, moverRonda la crea con ese numero
            await this.moverRonda(tx, row as any, targetRonda, tam + 1);
          }
        }

        await this.recomponerRondasLocalidad(localidadId, tx);
        return;
      }

      // ========== CASO: hay más empresas en bajas y esta empresa tiene exactamente 2 movimientos ==========
      // m1 en R1, m2 en R2 → m1→R2 antes de m2, m2→R3 (nueva si no existe)
      if (chain.length === 2) {
        // mover el ÚLTIMO primero
        for (let i = chain.length - 1; i >= 0; i--) {
          const row = chain[i];
          const targetRonda = row.rondaNumero + 1;
          const next = chain[i + 1];

          if (next && next.rondaNumero === targetRonda) {
            // hay “siguiente” de la misma empresa en la ronda destino → insertamos antes
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
              // no existe la ronda → crearla al vuelo y ponerlo en 1
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

      // ========== CASO GENERAL: varias bajas de esa empresa y varias empresas en la localidad ==========
      // Todos bajan 1 ronda, pero respetando el orden relativo entre ellos en la ronda destino.
      for (let i = chain.length - 1; i >= 0; i--) {
        const row = chain[i];
        const targetRonda = row.rondaNumero + 1;
        const next = chain[i + 1];

        if (next && next.rondaNumero === targetRonda) {
          // hay “siguiente” de la misma empresa ya en la ronda destino → insertar antes que él
          await tx.ronda.updateMany({
            where: { localidadId, rondaNumero: targetRonda, concluido: false, orden: { gte: next.orden } },
            data: { orden: { increment: 1 } },
          });
          await this.moverRonda(tx, row as any, targetRonda, next.orden);
        } else {
          // no hay siguiente de la misma empresa en esa ronda
          const tam = await this.tamanoDeRonda(tx, localidadId, targetRonda);
          if (tam > 0) {
            await this.moverRonda(tx, row as any, targetRonda, tam + 1);
          } else {
            // no existe esa ronda → la creamos al vuelo y metemos en primer lugar
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



  /** 
   * Cambia el movimiento a SOLICITADO y lo ENCOLA al FRENTE de R1 (orden=1),
   * sin importar si es ALTA o BAJA. Desplaza el resto y compacta.
   * No llama a recomposición para no perder el puesto 1.
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

      // 1) Forzar estado = SOLICITADO (marca/actualiza fechaSolicitud si no existe)
      await tx.movimiento.update({
        where: { id: movimientoId },
        data: {
          estado: 'SOLICITADO',
          fechaSolicitud: new Date(),
          updatedAt: new Date(),
        },
      });

      // 2) Empujar todos en R1 hacia abajo
      await tx.ronda.updateMany({
        where: { localidadId: m.localidadId, rondaNumero: 1, concluido: false },
        data: { orden: { increment: 1 } },
      });

      // 3) Mover/crear la ronda del movimiento en R1:1
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

    // Opcional: recalcular sugerencia de siguiente (no afecta el puesto 1 recién forzado)
    try { await this.siguienteInteligente(res!.localidadId); } catch { /* noop */ }

    return res;
  }


  // ---------- MOTOR: SIGUIENTE (POR USUARIO) ----------
  static async siguienteParaMaquinista(localidadId: number, usuarioId?: number) {
    return prisma.$transaction(async (tx) => {
      // 0. Limpieza perezosa de EN_PROCESO viejos
      await this.normalizarMovimientosEnProceso(localidadId, tx);

      // 1. Traer TODA la R1
      const r1 = await tx.ronda.findMany({
        where: { localidadId, concluido: false, rondaNumero: 1 },
        include: {
          movimiento: {
            select: {
              id: true,
              empresaId: true,
              prioridad: true,
              estado: true,
              incidenteGlobal: true,
              locomotiveNumber: true,
              lavado: true,
              torno: true,
              operadorId: true,        // quién lo está atendiendo
            },
          },
        },
        orderBy: [{ orden: 'asc' }],
      });

      // 2. Buscar el primer slot de R1 que:
      //    - no esté en proceso, o
      //    - esté en proceso PERO:
      //        a) no tiene operador (estado recuperable/inconsistente), o
      //        b) lo atiende el mismo usuario
      const candidatoR1 = r1.find((row) => {
        const m = row.movimiento;
        if (!m) return false;
        if (m.estado === 'DETENIDO' && m.incidenteGlobal) return false;

        if (m.estado === 'EN_PROCESO') {
          // EN_PROCESO sin operador → se considera recuperable
          if (!m.operadorId) return true;

          // EN_PROCESO con el mismo operador → se lo puede regresar
          if (usuarioId && m.operadorId === usuarioId) return true;

          // EN_PROCESO con otro operador distinto y vigente → no
          return false;
        }

        // si no está en proceso → libre
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

      // 3. Si en R1 no hay nada “libre para mí”, buscar en todo lo demás
      const resto = await tx.ronda.findMany({
        where: { localidadId, concluido: false },
        include: {
          movimiento: {
            select: {
              id: true,
              empresaId: true,
              prioridad: true,
              estado: true,
              incidenteGlobal: true,
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
        if (m.estado === 'DETENIDO' && m.incidenteGlobal) return false;

        if (m.estado === 'EN_PROCESO') {
          // EN_PROCESO sin operador → se considera recuperable
          if (!m.operadorId) return true;

          // EN_PROCESO con el mismo operador → sí
          if (usuarioId && m.operadorId === usuarioId) return true;

          // EN_PROCESO de otro operador → no
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
  await this.normalizarMovimientosEnProceso(localidadId);

  let rondas = await prisma.ronda.findMany({
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

  // Auto-corrección: si hay BAJAS desordenadas o repetidas en una ronda, recomponer y re-leer.
  if (necesitaReequilibrarBajas(rondas)) {
    await this.recomponerRondasLocalidad(localidadId);
    rondas = await prisma.ronda.findMany({
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
  }

  // 1) Si el usuario ya tiene un movimiento EN_PROCESO < 30 min, siempre se le regresa ese
  if (userId) {
      const propia = rondas.find((r: any) => {
        const mov = r.movimiento as any;
        if (!mov) return false;
        if (mov.estado !== 'EN_PROCESO') return false;
        if (mov.operadorId !== userId && mov.maquinistaId !== userId) return false; // ajusta a tu schema
        return !esReasignablePorTiempo(mov); // todavía dentro de los 30 min
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
          // IMPORTANTE: este flag lo puedes usar en frontend para NO mostrar "Iniciar"
          permiteInicio: false,
          enCursoPropio: true,
        };
      }
    }

    // 2) Buscar el siguiente elegible para cualquiera (maquinista que sea)
    for (const r of rondas) {
      const mov = r.movimiento as any;
      if (!mov) continue;
      if (mov.estado === 'DETENIDO' && mov.incidenteGlobal) continue;

      const esServicio = !!(mov.lavado || mov.torno);
      const esReasignable = mov.estado === 'EN_PROCESO' && esReasignablePorTiempo(mov);

      // ===== SERVICIOS (LAVADO / TORNO) =====
      // Deben aparecer si están: SOLICITADO, DETENIDO o EN_PROCESO
      if (esServicio) {
        if (!['EN_PROCESO', 'SOLICITADO', 'DETENIDO'].includes(mov.estado)) {
          // cancelado, concluido, etc → se ignora
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
          permiteInicio: true, // puede iniciar/continuar servicio cuando le toque
        };
      }

      // ===== NO SERVICIO =====
      // - Si está EN_PROCESO y NO es reasignable todavía → se salta
      if (mov.estado === 'EN_PROCESO' && !esReasignable) {
        continue;
      }

    // Aquí ya permite:
    // - SOLICITADO
    // - DETENIDO
    // - EN_PROCESO PERO ya reasignable (>30 min)
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

    const routing = resolverAudienciaFcmMovimiento('fin_servicio', m);
    const { tokens } = await tokensAudienciaOperacion({
      empresaId: m.empresaId,
      localidadId: m.localidadId,
      usuarioIds: [(m as any).clienteId, (m as any).supervisorId, (m as any).coordinadorId, (m as any).operadorId],
      roles: routing?.roles,
    });
    if (!tokens.length) return;

    await sendMulticastCompat({
      notification: {
        title: `${tipo} concluido`,
        body: `Concluido ${tipo.toLowerCase()} de la locomotora ${m.locomotiveNumber}. Crear movimiento para desocupar la sección.`
      },
      data: {
        tipo: 'fin_servicio',
        subtipo: tipo.toLowerCase(),
        movimientoId: String(m.id),
        empresa: String(m.empresa?.nombre ?? ''),
        empresaId: String(m.empresaId),
        localidadId: String(m.localidadId),
        imagenes: (imagenesUrls ?? []).slice(0, 5).join(','),
        audience: String(routing?.audience ?? ''),
        servicio: tipo,
        source: tipo.toLowerCase(),
        url: routing?.url ?? '/movimientos',
        tag: `movimiento:${m.id}:fin_servicio:${tipo.toLowerCase()}`,
        timestamp: new Date().toISOString(),
      },
      tokens
    });
  }

  // ---------- LIMPIEZA ----------
  private static async limpiarYReorganizarRondasConcluidas() {
    const locs = await prisma.ronda.findMany({ select: { localidadId: true }, distinct: ['localidadId'] });
    for (const { localidadId } of locs) {
      await prisma.$transaction(async (tx) => {
        await this.eliminarRondasConcluidasCompletas(localidadId, tx);
        await this.eliminarRondasHuerfanasYDuplicadas(tx, localidadId);
        await this.recomponerRondasLocalidad(localidadId, tx);
      });
    }
  }

  /**
   * Elimina rondas concluidas SOLO si TODA la rondaNumero está concluida.
   * Regla: si en la ronda hay al menos 1 concluido=false, no se borra ninguna.
   */
  private static async eliminarRondasConcluidasCompletas(localidadId: number, tx: Tx = prisma) {
    const grupos = await tx.$queryRaw<{ rondaNumero: number }[]>(Prisma.sql`
      SELECT "rondaNumero"
      FROM "Ronda"
      WHERE "localidadId" = ${localidadId}
      GROUP BY "rondaNumero"
      HAVING bool_and("concluido") = true
    `);

    for (const g of grupos) {
      await tx.ronda.deleteMany({ where: { localidadId, rondaNumero: g.rondaNumero } });
    }
  }

  private static async eliminarRondaGrupoSiConcluida(localidadId: number, rondaNumero: number, tx: Tx = prisma) {
    const pendientes = await tx.ronda.count({ where: { localidadId, rondaNumero, concluido: false } });
    if (pendientes === 0) {
      await tx.ronda.deleteMany({ where: { localidadId, rondaNumero } });
    }
  }

  // ---------- QUERIES VARIAS (compat front) ----------
  static async obtenerRondas() {
    try {
      await this.limpiarYReorganizarRondasConcluidas();
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
      await this.eliminarRondasConcluidasCompletas(localidadId);
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
      await this.eliminarRondasConcluidasCompletas(localidadId);
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
      await this.eliminarRondasConcluidasCompletas(rondaActualizada.localidadId);
      await this.eliminarRondaGrupoSiConcluida(rondaActualizada.localidadId, rondaActualizada.rondaNumero);
      return rondaActualizada;
    } catch (error) {
      movimientoError.error('Error al marcar ronda como concluida', { id, error });
      throw new Error('Error al marcar ronda como concluida');
    }
  }
}
