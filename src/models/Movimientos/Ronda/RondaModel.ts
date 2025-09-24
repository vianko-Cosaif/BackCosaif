// src/models/Movimientos/Ronda/RondaModel.ts

/**
 * @file RondaModel.ts
 * @author Isaac
 * @version 1.4.1 2025-08-18
 *
 * @overview
 * Capa de **dominio/modelo** para la gestión de *Rondas* y su relación con
 * *Movimientos* (cola operativa por localidad). Implementa:
 * - Reglas de ordenamiento:
 *    - **ALTAS** → Round 1 (R1) en **FIFO** por `createdAt` (sin límite por empresa),
 *      con excepción de **HOLD 10m** (se baja temporalmente de R1).
 *    - **BAJAS** → Reparto **robin-hood**: **máximo 1 por empresa por ronda**,
 *      distribuidas de forma balanceada desde R2 si hay ALTAS activas.
 * - Re-composición general de rondas tras inserciones / incidentes / conclusiones.
 * - Selección del **siguiente** candidato para el maquinista (uno a la vez).
 * - Validaciones para prevenir inconsistencias físicas (bloqueos de vía/sección).
 * - Notificaciones FCM (tapado y bloqueos), con *debounce/TTL* para evitar spam.
 *
 * @important
 * - **No** realiza ocupaciones/liberaciones reales de vías/secciones. Solo valida y ordena.
 * - Llamadas a FCM dentro de transacciones están presentes por simplicidad; para
 *   entornos de alta carga se recomienda patrón **Outbox** y publicar después del commit.
 *
 * @glossary
 * - **R1 / R2 / ...**: Número de ronda (bloque/grupo) para la cola de ejecución.
 * - **orden**: Posición dentro de una ronda.
 * - **HOLD 10m**: Penalización temporal aplicada al movimiento tras incidente
 *   "cerrado no resuelto". Evita que ALTAS vuelvan a R1 durante 10 minutos.
 *
 * @errors
 * - Lanza `Error` con mensajes claros cuando detecta inconsistencias o recursos ausentes.
 *   Los controladores capturan y traducen a HTTP 4xx/5xx.
 */

import type { Prisma, Ronda, Movimiento } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import admin from 'firebase-admin';
import { movimientoError } from '../movimiento.logger';

const prisma = new PrismaClient();
type Tx = Prisma.TransactionClient;

/* ==========================================================================
 *                              NOTIFICATION BUFFER
 *   Evita enviar la misma notificación repetidamente en una ventana de TTL.
 *   Claves:
 *     - allblocked:<localidadId>
 *     - tapado:<localidadId>:<movimientoId>
 * ========================================================================== */

const TTL_MS = 60 * 60 * 1000; // 1h
const _notifBuffer = new Map<string, number>(); // key -> expiresAt

/** Marca una clave como notificada hasta `TTL_MS`. */
function _markNotified(key: string) { _notifBuffer.set(key, Date.now() + TTL_MS); }

/** Indica si ya se notificó y aún no expira el TTL. */
function _wasNotified(key: string) {
  const exp = _notifBuffer.get(key);
  if (!exp) return false;
  if (Date.now() > exp) { _notifBuffer.delete(key); return false; }
  return true;
}

function _keyAllBlocked(localidadId: number) { return `allblocked:${localidadId}`; }
function _keyTapado(localidadId: number, movimientoId: number) { return `tapado:${localidadId}:${movimientoId}`; }

/* ==========================================================================
 *                              HOLD 10 MINUTOS
 *   Se aplica a movimientos con incidente "cerrado no resuelto" (solo una vez).
 * ========================================================================== */

const HOLD10M_MS = 10 * 60 * 1000;
const _hold10m = new Map<number, number>();     // movimientoId -> expiresAt
const _hold10mOnce = new Set<number>();         // ya aplicado una vez

/** Indica si un movimiento está en ventana HOLD. */
function _isOnHold(movId: number) {
  const exp = _hold10m.get(movId);
  if (!exp) return false;
  if (Date.now() > exp) { _hold10m.delete(movId); return false; }
  return true;
}

/* ==========================================================================
 *                      BLOQUEOS DE VÍAS / SECCIONES (Validaciones)
 *   Nota: Estas validaciones previenen inconsistencias en operaciones que
 *   modifican la composición de la ronda (intercambios/replace), pero no
 *   bloquean la determinación del “siguiente” (decide maquinista).
 * ========================================================================== */

/**
 * @summary ¿Hay algún movimiento activo (no finalizado) ocupando la vía?
 * @throws Nunca. Devuelve booleano.
 */
async function viaSimpleBloqueada(localidadId: number, viaId: number, excluirMovimientoId?: number, tx: Tx = prisma) {
  const activos = await tx.movimiento.count({
    where: {
      localidadId,
      id: { not: excluirMovimientoId ?? 0 },
      finalizado: false,
      OR: [{ viaOrigenId: viaId }, { viaDestinoId: viaId }],
    },
  });
  return activos > 0;
}

/**
 * @summary Devuelve un movimiento que bloquea la vía (o `null` si no hay).
 * @throws Nunca.
 */
async function movimientoQueBloqueaVia(localidadId: number, viaId: number, tx: Tx = prisma) {
  const bloq = await tx.movimiento.findFirst({
    where: {
      localidadId,
      finalizado: false,
      OR: [{ viaOrigenId: viaId }, { viaDestinoId: viaId }],
    },
    include: { empresa: { select: { nombre: true } } },
    orderBy: [{ updatedAt: 'asc' }] // más antiguo primero
  });
  return bloq || null;
}

/**
 * @summary ¿El movimiento asociado a la ronda está bloqueado por destino?
 * @description Considera vía simple o con secciones (requiere sección libre).
 */
async function estaBloqueadoPorVias(r: Ronda, tx: Tx = prisma) {
  const mov = await tx.movimiento.findUnique({
    where: { id: r.movimientoId },
    select: { id: true, localidadId: true, viaDestinoId: true }
  });
  if (!mov?.viaDestinoId) return false;

  const secciones = await tx.seccionVia.count({ where: { viaId: mov.viaDestinoId } });
  if (secciones === 0) {
    return await viaSimpleBloqueada(mov.localidadId, mov.viaDestinoId, mov.id, tx);
  }
  const libre = await tx.seccionVia.findFirst({
    where: { viaId: mov.viaDestinoId, ocupada: false },
    select: { id: true }
  });
  return !libre;
}

/**
 * @summary Asegura que el destino del movimiento tenga capacidad disponible.
 * @throws Error si la vía/sección de destino está bloqueada/sin hueco.
 *
 * @note Esta validación se usa **solo** en operaciones que podrían corromper
 *       el estado físico si se forzaran (p.ej. intercambios).
 */
async function assertViasLibres(localidadId: number, m: Movimiento, tx: Tx = prisma) {
  if (!m || !m.viaDestinoId) return;
  const secciones = await tx.seccionVia.count({ where: { viaId: m.viaDestinoId } });
  if (secciones === 0) {
    const bloqueada = await viaSimpleBloqueada(localidadId, m.viaDestinoId, m.id, tx);
    if (bloqueada) throw new Error(`Vía destino bloqueada para movimiento #${m.id}.`);
  } else {
    const libre = await tx.seccionVia.findFirst({ where: { viaId: m.viaDestinoId, ocupada: false } });
    if (!libre) throw new Error(`No hay secciones libres en vía destino para movimiento #${m.id}.`);
  }
}

/* ==========================================================================
 *                                 NOTIFICACIONES
 *   Recolecta tokens FCM y envía avisos con TTL para no saturar a usuarios.
 *   Destinatarios típicos: cliente, supervisor, coordinador.
 * ========================================================================== */

/** @summary Devuelve tokens FCM activos de una lista de usuarios. */
async function tokensDeUsuarios(ids: number[], tx: Tx = prisma) {
  if (!ids.length) return [];
  const usuarios = await tx.usuario.findMany({ where: { id: { in: ids }, activo: true }, include: { fcmTokens: true } });
  return usuarios.flatMap(u => u.fcmTokens.map(t => t.token));
}

/**
 * @summary Notifica por empresa cuando **no hay capacidad** en vías/sectores destino de varios movimientos.
 * @description Usa un *buffer global* por localidad para evitar spam (TTL 1h).
 * @sideEffects Envía FCM (IO externo dentro de transacción; considerar Outbox en el futuro).
 */
async function notificarBloqueos(localidadId: number, tx: Tx = prisma) {
  const keyAll = _keyAllBlocked(localidadId);
  if (_wasNotified(keyAll)) return;

  const rondas = await tx.ronda.findMany({
    where: { localidadId, concluido: false },
    include: { movimiento: { select: { id: true, empresaId: true, clienteId: true, supervisorId: true, coordinadorId: true, viaDestinoId: true } } },
    orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }]
  });

  const porEmpresa = new Map<number, number>();
  for (const r of rondas) {
    if (!(await estaBloqueadoPorVias(r, tx))) continue;
    if (!porEmpresa.has(r.movimiento.empresaId)) porEmpresa.set(r.movimiento.empresaId, r.movimiento.id);
  }

  for (const [empresaId, movimientoId] of porEmpresa) {
    const m = await tx.movimiento.findUnique({
      where: { id: movimientoId },
      include: { viaDestino: { select: { id: true, nombre: true } }, empresa: { select: { nombre: true } } }
    });
    if (!m) continue;

    const ids = [m.clienteId, m.supervisorId, m.coordinadorId].filter(Boolean) as number[];
    const tokens = await tokensDeUsuarios(ids, tx);
    if (!tokens.length) continue;

    await admin.messaging().sendEachForMulticast({
      notification: { title: '⚠️ Movimientos bloqueados', body: `Empresa ${m.empresa?.nombre ?? 'N/D'}: vía/secciones ocupadas en destino ${m.viaDestino?.nombre ?? 'N/D'}.` },
      data: { tipo: 'bloqueo_vias', localidadId: String(localidadId), empresaId: String(empresaId), movimientoId: String(movimientoId), timestamp: new Date().toISOString() },
      tokens
    });
  }

  _markNotified(keyAll);
}

/* ==========================================================================
 *                  INFO DE BLOQUEO + NOTIFICACIÓN "TAPADO" (simple)
 * ========================================================================== */

/**
 * @summary Devuelve detalle de bloqueo para un ítem de ronda.
 * @returns {
 *   bloqueado: boolean,
 *   viaDestino: string | null,
 *   bloqueador?: { id, locomotiveNumber?, empresa? }
 * }
 */
async function infoBloqueo(r: Ronda, tx: Tx = prisma) {
  const mov = await tx.movimiento.findUnique({
    where: { id: r.movimientoId },
    include: {
      empresa: { select: { nombre: true } },
      viaDestino: { select: { id: true, nombre: true } }
    }
  });
  if (!mov) return { bloqueado: false };

  let bloqueado = false;
  let bloqueador: { id: number; locomotiveNumber: number | null; empresa: string | null } | null = null;

  if (mov.viaDestinoId) {
    const secciones = await tx.seccionVia.count({ where: { viaId: mov.viaDestinoId } });
    if (secciones === 0) {
      bloqueado = await viaSimpleBloqueada(mov.localidadId, mov.viaDestinoId, mov.id, tx);
    } else {
      const libre = await tx.seccionVia.findFirst({ where: { viaId: mov.viaDestinoId, ocupada: false }, select: { id: true } });
      bloqueado = !libre;
    }
    if (bloqueado) {
      const bloq = await movimientoQueBloqueaVia(mov.localidadId, mov.viaDestinoId, tx);
      if (bloq) {
        bloqueador = { id: bloq.id, locomotiveNumber: bloq.locomotiveNumber ?? null, empresa: bloq.empresa?.nombre ?? null };
      }
    }
  }

  return {
    bloqueado,
    viaDestino: mov.viaDestino?.nombre ?? null,
    bloqueador
  };
}

/**
 * @summary Notifica “tapado” (obstrucción directa) para un movimiento concreto.
 * @sideEffects Envía FCM. Protegido con TTL por (localidadId, movimientoId).
 */
async function notificarTapadoSimple(
  r: Ronda,
  det: {
    viaDestino: string | null,
    bloqueador: null | { id: number; locomotiveNumber: number | null; empresa: string | null }
  },
  tx: Tx
) {
  const mov = await tx.movimiento.findUnique({
    where: { id: r.movimientoId },
    include: { empresa: { select: { nombre: true } } }
  });
  if (!mov) return;

  const key = _keyTapado(r.localidadId, mov.id);
  if (_wasNotified(key)) return;

  const locoTxt = det.bloqueador?.locomotiveNumber ?? 'N/D';
  const viaTxt  = det.viaDestino ?? 'N/D';

  // Destinatarios básicos (cliente/supervisor/coordinador)
  const ids: number[] = [];
  if ((mov as any).clienteId) ids.push((mov as any).clienteId);
  if ((mov as any).supervisorId) ids.push((mov as any).supervisorId);
  if ((mov as any).coordinadorId) ids.push((mov as any).coordinadorId);

  const tokens = await tokensDeUsuarios(ids, tx);
  if (!tokens.length) return;

  const title = `Movimiento #${mov.id} — vía ${viaTxt}`;
  const body  = `La máquina ${locoTxt} obstruye la vía ${viaTxt}. Si no es cierto, hacer caso omiso de esta notificación.`;

  await admin.messaging().sendEachForMulticast({
    notification: { title, body },
    data: {
      tipo: 'tapado_simple',
      movimientoId: String(mov.id),
      localidadId: String(r.localidadId),
      viaDestino: viaTxt,
      bloqueadorLoco: String(locoTxt),
      timestamp: new Date().toISOString(),
    },
    tokens
  });
  _markNotified(key);
}

/* ==========================================================================
 *                              INCIDENTES
 * ========================================================================== */

/** @summary ¿Existe incidente activo o cerrado (pendiente de confirmación) para el movimiento? */
async function tieneIncidenteActivo(tx: Tx, movimientoId: number) {
  const activos = await tx.incidente.count({
    where: {
      movimientoId,
      estado: { in: ['ABIERTO', 'CERRADO'] } // CERRADO pendiente de confirmación
    }
  });
  return activos > 0;
}

/* ==========================================================================
 *                               RONDA MODEL
 * ========================================================================== */

export class RondaModel {
  /* ------------------------------- CRUD Helpers ------------------------------- */

  /**
   * @summary Inserta una ronda en posición, desplazando elementos desde `orden`.
   * @internal
   */
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

  /**
   * @summary Mueve una fila de ronda a otra ronda/orden, reindexando el resto.
   * @internal
   */
  private static async moverRonda(tx: Tx, row: Ronda, targetRonda: number, targetOrden: number) {
    const sameRound = row.rondaNumero === targetRonda;
    if (sameRound) {
      if (targetOrden === row.orden) return;
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
      return;
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
  }

  /** @summary Tamaño (no concluidas) de una ronda. */
  private static async tamanoDeRonda(tx: Tx, localidadId: number, rondaNumero: number) {
    return tx.ronda.count({ where: { localidadId, rondaNumero, concluido: false } });
  }

  /**
   * @summary Primera ronda ≥ `desdeRonda` donde **no** exista ronda de esa empresa.
   * @description Aplica para **BAJAS** (1 por empresa por ronda).
   */
  private static async primeraRondaLibreParaEmpresa(
    tx: Tx, localidadId: number, empresaId: number, desdeRonda: number
  ): Promise<number> {
    let r = Math.max(1, desdeRonda);
    for (let guard = 0; guard < 200; guard++) {
      const c = await tx.ronda.count({ where: { localidadId, rondaNumero: r, concluido: false, empresaId } });
      if (c === 0) return r;
      r++;
    }
    return r;
  }

  /** @summary Reindexa `orden` en la ronda para que sea 1..N sin huecos. */
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

  /**
   * @summary Garantiza la regla **BAJA: 1 por empresa por ronda** a partir de `startRound`.
   * @description Excede → empuja excedentes a rondas siguientes.
   */
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
      // En esta función sólo limitamos BAJA
      const bajas = rows.filter(r => r.prioridad !== 'ALTA');
      if (bajas.length <= 1) continue;

      const [rondaNumeroStr, empresaIdStr] = key.split(':');
      const rondaActual = parseInt(rondaNumeroStr, 10);
      const empresaId = parseInt(empresaIdStr, 10);

      // Mantener 1, empujar resto a rondas sucesivas buscando primer hueco
      for (let i = 1; i < bajas.length; i++) {
        const target = await this.primeraRondaLibreParaEmpresa(tx, localidadId, empresaId, rondaActual + 1);
        const tam = await this.tamanoDeRonda(tx, localidadId, target);
        await tx.ronda.update({ where: { id: bajas[i].id }, data: { rondaNumero: target, orden: tam + 1 } });
      }
    }
  }

  /**
   * @summary ALTAS → FIFO en R1, respetando HOLD 10m (ALTAS en hold bajan a R2).
   * @description También reordena R1 colocando primero ALTAS sin hold por `createdAt`.
   */
  private static async ordenarAltasR1_FIFO(tx: Tx, localidadId: number) {
    const filas = await tx.ronda.findMany({
      where: { localidadId, concluido: false },
      include: { movimiento: { select: { id: true, prioridad: true, createdAt: true } } },
      orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }],
    });

    // 1) ALTAS sin hold a R1; ALTAS con hold, si están en R1, bajarlas a R2
    for (const f of filas) {
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

    // 2) Ordenar R1: ALTAS (sin hold) por createdAt y luego el resto
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

  /**
   * @summary BAJAS → repartir en **robin-hood**, comenzando en R2 si hay ALTAS sin hold.
   * @description Garantiza 1 BAJA por empresa por ronda y compacta numeraciones.
   */
  private static async reequilibrarBajasRobinHood(tx: Tx, localidadId: number) {
    // ¿Hay ALTAS activas (sin hold)?
    const altas = await tx.ronda.findMany({
      where: { localidadId, concluido: false, movimiento: { prioridad: 'ALTA' } },
      select: { movimiento: { select: { id: true } } },
    });
    const hayAltasSinHold = altas.some(a => !_isOnHold(a.movimiento.id));
    const startRound = hayAltasSinHold ? 2 : 1;

    // Garantizar 1 BAJA por empresa por ronda desde startRound
    await this.garantizarUnSlotBajasPorEmpresaPorRonda(tx, localidadId, startRound);

    // Tomar BAJAS desde startRound y repartir round-robin
    const bajas = await tx.ronda.findMany({
      where: { localidadId, concluido: false, rondaNumero: { gte: startRound }, movimiento: { prioridad: 'BAJA' } },
      include: { movimiento: { select: { id: true } } },
      orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }],
    });

    const porEmpresa = new Map<number, typeof bajas>();
    for (const r of bajas) porEmpresa.set(r.empresaId, [ ...(porEmpresa.get(r.empresaId) ?? []), r ]);
    const empresas = [...porEmpresa.keys()];

    let ronda = startRound;
    while ([...porEmpresa.values()].some(arr => arr.length > 0)) {
      let orden = 1;
      for (const e of empresas) {
        const arr = porEmpresa.get(e)!;
        if (arr.length) {
          const item = arr.shift()!;
          await tx.ronda.update({ where: { id: item.id }, data: { rondaNumero: ronda, orden } });
          orden++;
        }
      }
      await this.compactarOrdenesRonda(tx, localidadId, ronda);
      ronda++;
    }

    // Compactar numeración de rondas
    const grupos = await tx.ronda.findMany({
      where: { localidadId, concluido: false },
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

  /* --------------------------- Recomposición General --------------------------- */

  /**
   * @summary Recompone todas las rondas de una localidad (normaliza y reordena).
   * @description
   * 1) Limpia concluidas. 2) Normaliza numeración de rondas. 3) ALTAS → FIFO en R1.
   * 4) BAJAS → robin-hood (1 por empresa por ronda).
   */
  public static async recomponerRondasLocalidad(localidadId: number, tx: Tx = prisma) {
    // Limpiar concluidas
    await tx.ronda.deleteMany({ where: { localidadId, concluido: true } });

    // Normalizar numeración de rondas
    const grupos = await tx.ronda.findMany({
      where: { localidadId, concluido: false },
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

    // ALTAS: FIFO en R1 (sin límite por empresa)
    await this.ordenarAltasR1_FIFO(tx, localidadId);

    // BAJAS: repartir en robin-hood (1 por empresa por ronda)
    await this.reequilibrarBajasRobinHood(tx, localidadId);
  }

  /* ------------------------- Generación / Inserción ------------------------- */

  /**
   * @summary Inserción "solvente" en la cola de rondas.
   * @description
   * - ALTAS → R1 (FIFO). Puede forzarse posición si `preferirR1` y `posicion`.
   * - BAJAS → 1 por empresa por ronda (robin-hood). Inicia en R2 si hay ALTAS sin hold.
   * @throws Error si el movimiento no existe o transacción falla.
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
      const mov = await tx.movimiento.findUnique({ where: { id: data.movimientoId }, select: { id: true } });
      if (!mov) throw new Error(`Movimiento ${data.movimientoId} no encontrado`);

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
    });
  }

  /**
   * @summary Inserta **BAJA** respetando 1/empresa/ronda + reparto robin-hood.
   * @internal
   */
  private static async _insertarBajaConRobinHood(
    tx: Tx,
    params: { localidadId: number; empresaId: number; movimientoId: number }
  ) {
    const { localidadId, empresaId, movimientoId } = params;

    // Si hay ALTAS activas (sin hold) comenzamos desde R2, si no desde R1
    const altas = await tx.ronda.findMany({
      where: { localidadId, concluido: false, movimiento: { prioridad: 'ALTA' } },
      select: { movimiento: { select: { id: true } } },
    });
    const hayAltasSinHold = altas.some(a => !_isOnHold(a.movimiento.id));
    const startRound = hayAltasSinHold ? 2 : 1;

    // Buscar primera ronda >= startRound donde esta empresa no tenga BAJA
    let r = startRound;
    for (let guard = 0; guard < 500; guard++) {
      const ya = await tx.ronda.count({
        where: { localidadId, rondaNumero: r, concluido: false, empresaId, movimiento: { prioridad: 'BAJA' } }
      });
      if (ya === 0) break;
      r++;
    }

    const ord = (await this.tamanoDeRonda(tx, localidadId, r)) + 1;
    await tx.ronda.create({ data: { movimientoId, empresaId, localidadId, rondaNumero: r, orden: ord } });

    // Acomodar el resto: 1 BAJA por empresa por ronda y repartir robin-hood (incluye cascada)
    await this.garantizarUnSlotBajasPorEmpresaPorRonda(tx, localidadId, startRound);
    await this.reequilibrarBajasRobinHood(tx, localidadId);
  }

  /**
   * @summary Compatibilidad: wrapper de creación → usa `insertarRondaSolvente`.
   */
  static async generarRondaParaMovimiento(
    data: { movimientoId: number; empresaId: number; localidadId: number; prioridad: 'ALTA' | 'BAJA' }
  ) {
    return this.insertarRondaSolvente(data);
  }

  /* ------------------- Helpers de cadena por incidentes ------------------- */

  private static async obtenerSlotsEmpresaDesde(
    tx: Tx,
    localidadId: number,
    empresaId: number,
    desdeRonda: number
  ) {
    return tx.ronda.findMany({
      where: {
        localidadId,
        empresaId,
        concluido: false,
        rondaNumero: { gte: desdeRonda },
        movimiento: { prioridad: 'BAJA' }
      },
      select: { id: true, rondaNumero: true, orden: true },
      orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }],
    });
  }

  /**
   * @summary Aplica “empuje en cadena” dentro de una empresa tras incidente en BAJA.
   * @internal
   * @description Recoloca elementos y puede crear/usar nueva ronda al final.
   */
  private static async efectoCadenaBajaPorIncidente(tx: Tx, r: Ronda) {
    const chain = await this.obtenerSlotsEmpresaDesde(tx, r.localidadId, r.empresaId, r.rondaNumero);
    if (chain.length === 0) return;

    // Solo una participación → empujar a la ronda siguiente (o crear nueva)
    if (chain.length === 1) {
      const nextRound = r.rondaNumero + 1;
      const tam = await this.tamanoDeRonda(tx, r.localidadId, nextRound);
      if (tam > 0) {
        await this.moverRonda(tx, r, nextRound, tam + 1);
      } else {
        const max = await tx.ronda.aggregate({
          where: { localidadId: r.localidadId, concluido: false },
          _max: { rondaNumero: true }
        });
        await this.moverRonda(tx, r, (max._max.rondaNumero ?? 0) + 1, 1);
      }
      return;
    }

    // Rotación por empuje dentro de la empresa
    let current = await tx.ronda.findUnique({ where: { id: chain[0].id } });
    if (!current) return;

    for (let i = 1; i < chain.length; i++) {
      const targetRow = await tx.ronda.findUnique({ where: { id: chain[i].id } });
      if (!targetRow) continue;
      await this.moverRonda(tx, current, targetRow.rondaNumero, targetRow.orden);
      const pushed = await tx.ronda.findUnique({ where: { id: chain[i].id } });
      if (!pushed) break;
      current = pushed;
    }

    const last = chain[chain.length - 1];
    const nextRound = last.rondaNumero + 1;
    const tam = await this.tamanoDeRonda(tx, r.localidadId, nextRound);
    if (tam > 0) {
      await this.moverRonda(tx, current, nextRound, tam + 1);
    } else {
      const max = await tx.ronda.aggregate({
        where: { localidadId: r.localidadId, concluido: false },
        _max: { rondaNumero: true }
      });
      await this.moverRonda(tx, current, (max._max.rondaNumero ?? 0) + 1, 1);
    }
  }

  /**
   * @summary Gestiona incidente para un movimiento (aplica HOLD y reordena).
   * @param movimientoId
   * @param opts.cerradoNoResuelto Si es true, aplica **HOLD 10m** (solo una vez).
   */
  static async gestionarIncidente(
    movimientoId: number,
    opts?: { cerradoNoResuelto?: boolean }
  ) {
    await prisma.$transaction(async (tx) => {
      const r = await tx.ronda.findFirst({
        where: { movimientoId, concluido: false },
        include: { movimiento: { select: { id: true, prioridad: true, empresaId: true, localidadId: true } } }
      });
      if (!r) throw new Error(`No hay ronda activa para el movimiento ${movimientoId}`);

      const { localidadId } = r;
      const esAlta = r.movimiento.prioridad === 'ALTA';

      // HOLD 10m si aplica (una sola vez)
      if (opts?.cerradoNoResuelto && !_hold10mOnce.has(movimientoId)) {
        _hold10m.set(movimientoId, Date.now() + HOLD10M_MS);
        _hold10mOnce.add(movimientoId);
      }

      if (esAlta) {
        // === ALTAS ===
        const totalAltasR1 = await tx.ronda.count({
          where: { localidadId, rondaNumero: 1, concluido: false, movimiento: { prioridad: 'ALTA' } }
        });

        if (totalAltasR1 >= 2) {
          // Mover esta ALTA al final del bloque de ALTAS (FIFO)
          const r1Altas = await tx.ronda.findMany({
            where: { localidadId, rondaNumero: 1, concluido: false, movimiento: { prioridad: 'ALTA' } },
            include: { movimiento: { select: { id: true, createdAt: true } } },
            orderBy: [{ movimiento: { createdAt: 'asc' } }, { orden: 'asc' }]
          });
          const ids = r1Altas.map(x => x.id);
          const self = r1Altas.find(x => x.movimiento.id === movimientoId);
          if (self) {
            const nuevo = ids.filter(i => i !== self.id);
            nuevo.push(self.id);
            for (let i = 0; i < nuevo.length; i++) {
              await tx.ronda.update({ where: { id: nuevo[i] }, data: { orden: i + 1 } });
            }
          }
          await this.compactarOrdenesRonda(tx, localidadId, 1);
        } else {
          // ⚠️ Única ALTA: si hay BAJAS en cualquier ronda, forzar swap:
          //   - ALTA -> R2:1
          //   - Primera BAJA (en la ronda más baja) -> R1:1
          const primeraBaja = await tx.ronda.findFirst({
            where: { localidadId, concluido: false, movimiento: { prioridad: 'BAJA' } },
            orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }]
          });

          if (primeraBaja) {
            // Abrir hueco en R2:1 y bajar la ALTA
            await tx.ronda.updateMany({
              where: { localidadId, rondaNumero: 2, concluido: false, orden: { gte: 1 } },
              data: { orden: { increment: 1 } }
            });
            await this.moverRonda(tx, r, 2, 1);

            // Abrir hueco en R1:1 y subir la primera BAJA
            await tx.ronda.updateMany({
              where: { localidadId, rondaNumero: 1, concluido: false, orden: { gte: 1 } },
              data: { orden: { increment: 1 } }
            });
            await this.moverRonda(tx, primeraBaja, 1, 1);
          }
        }

        await this.recomponerRondasLocalidad(localidadId, tx);
        return;
      }

      // === BAJAS: empuje en cadena + recomposición ===
      await this.efectoCadenaBajaPorIncidente(tx, r);
      await this.recomponerRondasLocalidad(localidadId, tx);
    });
  }

  /* ---------------------- Motor: “Siguiente” (maquinista) ---------------------- */

  /**
   * @summary Devuelve el **siguiente** candidato para el maquinista (uno a la vez).
   * @rules
   * - Servicios (lavado/torno) → SOLO si `EN_PROCESO` (habilitados por coordinación).
   * - Resto → excluir los ya `EN_PROCESO`.
   * - Si hay bloqueo, **se notifica**, pero **se permite iniciar** (decide maquinista).
   */
  static async siguienteParaMaquinista(localidadId: number) {
    return prisma.$transaction(async (tx) => {
      // Ventana de candidatos por ronda/orden
      const candidatos = await tx.ronda.findMany({
        where: { localidadId, concluido: false },
        include: {
          movimiento: {
            select: {
              id: true,
              empresaId: true,
              prioridad: true,
              estado: true,
              viaDestinoId: true,
              locomotiveNumber: true,
              lavado: true,
              torno: true,
            },
          },
        },
        orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }],
        take: 50,
      });

      // Elegibilidad
      const r = candidatos.find((c) => {
        const m = c.movimiento;
        const esServicio = !!m.lavado || !!m.torno;
        if (esServicio) {
          // Solo cuando coordinación lo puso EN_PROCESO
          return m.estado === 'EN_PROCESO';
        }
        // Para lo demás, saltar los que ya están en proceso
        return m.estado !== 'EN_PROCESO';
      });

      if (!r) return { vacio: true as const, motivo: 'no_elegibles' };

      const det = await infoBloqueo(r, tx);
      if (det.bloqueado) {
        await notificarTapadoSimple(
          r,
          {
            viaDestino: det.viaDestino ?? null,
            bloqueador: det.bloqueador ?? null
          },
          tx
        );
      }

      // Siempre puede iniciar (decisión del maquinista)
      return {
        rondaId: r.id,
        localidadId: r.localidadId,
        movimientoId: r.movimiento.id,
        empresaId: r.movimiento.empresaId,
        prioridad: r.movimiento.prioridad,
        locomotiveNumber: r.movimiento.locomotiveNumber ?? null,
        viaDestino: det.viaDestino,
        bloqueado: det.bloqueado,
        permiteInicio: true
      };
    });
  }

  /** @summary Alias de compatibilidad. */
  public static async siguienteInteligente(localidadId: number) {
    return this.siguienteParaMaquinista(localidadId);
  }

  /* --------------------------- Eventos de servicio --------------------------- */

  /**
   * @summary Notifica fin de servicio (LAVADO/TORNO) a interesados.
   * @note Recomienda crear un movimiento para desocupar sección.
   */
  static async notificarFinServicio(
    movimientoId: number,
    tipo: 'LAVADO' | 'TORNO',
    imagenesUrls?: string[]
  ) {
    const m = await prisma.movimiento.findUnique({
      where: { id: movimientoId },
      include: {
        empresa: { select: { nombre: true } },
        localidad: { select: { id: true } },
      }
    });
    if (!m) throw new Error(`Movimiento ${movimientoId} no encontrado`);

    const ids = [ (m as any).clienteId, (m as any).supervisorId, (m as any).coordinadorId ]
      .filter(Boolean) as number[];
    const tokens = await tokensDeUsuarios(ids);
    if (!tokens.length) return;

    const title = `${tipo} concluido`;
    const body = `Concluido ${tipo.toLowerCase()} de la locomotora ${m.locomotiveNumber}. Por favor crear movimiento para desocupar la sección.`;

    await admin.messaging().sendEachForMulticast({
      notification: { title, body },
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

  /* ------------------------------ Limpieza global ------------------------------ */

  /**
   * @summary Limpia rondas concluidas por localidad y recompone.
   * @internal Útil para tareas programadas de mantenimiento.
   */
  private static async limpiarYReorganizarRondasConcluidas() {
    const locs = await prisma.ronda.findMany({ select: { localidadId: true }, distinct: ['localidadId'] });
    for (const { localidadId } of locs) {
      await prisma.$transaction(async (tx) => {
        await tx.ronda.deleteMany({ where: { localidadId, concluido: true } });
        await this.recomponerRondasLocalidad(localidadId, tx);
      });
    }
  }

  /* ------------------------------- Consultas varias ------------------------------- */

  /** @summary Lista rondas (todas) con empresa y movimiento. */
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

  /** @summary Elimina una ronda por ID. */
  static async eliminarRonda(id: number) {
    try {
      return await prisma.ronda.delete({ where: { id } });
    } catch (error) {
      movimientoError.error("Error al eliminar ronda", { id, error });
      throw new Error("Error al eliminar ronda");
    }
  }

  /** @summary Rondas por localidad (con detalles de vías). */
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

  /** @summary Rondas por localidad y estado de conclusión. */
  static async obtenerRondasPorLocalidadConEstado(localidadId: number, concluido: boolean) {
    try {
      return await prisma.ronda.findMany({
        where: { localidadId, concluido },
        include: {
          empresa: true,
          movimiento: {
            select: {
              id: true, locomotiveNumber: true, createdAt: true, estado: true, lavado: true, torno: true, prioridad: true,
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

  /**
   * @summary Devuelve el **primer** elemento de la cola (simple) por localidad.
   * @deprecated Usar `siguienteParaMaquinista` / `siguienteInteligente`.
   */
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

  /**
   * @summary Intercambia **movimientos** entre dos rondas (manteniendo posiciones).
   * @throws Error si alguna vía destino está bloqueada (validación previa).
   */
  static async intercambiarMovimientosEntreRondas(rondaAId: number, rondaBId: number): Promise<[Ronda, Ronda]> {
    if (rondaAId === rondaBId) throw new Error("Debe indicar dos rondas distintas para el intercambio");
    return await prisma.$transaction(async tx => {
      const [rondaA, rondaB] = await Promise.all([
        tx.ronda.findUnique({ where: { id: rondaAId } }),
        tx.ronda.findUnique({ where: { id: rondaBId } }),
      ]);
      if (!rondaA || !rondaB) throw new Error("Rondas o movimientos inválidos");

      const [movA, movB] = await Promise.all([
        tx.movimiento.findUnique({ where: { id: rondaA.movimientoId } }),
        tx.movimiento.findUnique({ where: { id: rondaB.movimientoId } }),
      ]);
      if (!movA || !movB) throw new Error('Movimiento no encontrado');

      // Validación para no corromper estado físico de vías
      await assertViasLibres(rondaA.localidadId, movA, tx);
      await assertViasLibres(rondaB.localidadId, movB, tx);

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
    });
  }

  /**
   * @summary Reemplaza el **movimiento** de una ronda por otro movimiento.
   * @throws Error si la vía/sección de destino del nuevo movimiento no está libre.
   */
  static async intercambiarMovimientoEnRonda(rondaId: number, nuevoMovimientoId: number) {
    try {
      const ronda = await prisma.ronda.findUnique({ where: { id: rondaId } });
      if (!ronda) throw new Error('Ronda no encontrada');
      const movimiento = await prisma.movimiento.findUnique({ where: { id: nuevoMovimientoId } });
      if (!movimiento) throw new Error('Movimiento no encontrado');

      // Validación solo para esta operación
      await assertViasLibres(ronda.localidadId, movimiento);

      return await prisma.ronda.update({
        where: { id: rondaId },
        data: { movimientoId: nuevoMovimientoId },
      });
    } catch (error) {
      movimientoError.error('Error al intercambiar movimiento en ronda', { rondaId, nuevoMovimientoId, error });
      throw new Error('Error al intercambiar movimiento en ronda');
    }
  }

  /** @summary Devuelve info enriquecida de una ronda (empresa, vías, flags de servicio). */
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

  /**
   * @summary Marca una ronda como concluida y recomponen el resto para la localidad.
   */
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
