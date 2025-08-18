// RondaModel.ts
import { movimientoError } from "../movimiento.logger";
import type { Prisma, Ronda, Movimiento } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import admin from 'firebase-admin';

const prisma = new PrismaClient();
type Tx = Prisma.TransactionClient;

// ================== BUFFER DE NOTIFICACIONES (UNA SOLA VEZ) ==================
const TTL_MS = 60 * 60 * 1000; // 1h
const _notifBuffer = new Map<string, number>(); // key -> expiresAt

function _markNotified(key: string) {
  _notifBuffer.set(key, Date.now() + TTL_MS);
}
function _wasNotified(key: string) {
  const exp = _notifBuffer.get(key);
  if (!exp) return false;
  if (Date.now() > exp) {
    _notifBuffer.delete(key);
    return false;
  }
  return true;
}
function _keySkip(localidadId: number, movimientoId: number) {
  return `skip:${localidadId}:${movimientoId}`;
}
function _keyAllBlocked(localidadId: number) {
  return `allblocked:${localidadId}`;
}

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

// ================== UTILIDADES DE TIEMPO / PRIORIDAD ==================
function esVentanaLavado(d = new Date()) {
  const h = d.getHours();
  // 21:00–04:59
  return h >= 21 || h < 5;
}

async function hayLavadosPendientes(localidadId: number, tx: Tx = prisma) {
  const c = await tx.movimiento.count({
    where: {
      localidadId,
      finalizado: false,
      lavado: true,
    }
  });
  return c > 0;
}

async function hayUnaSolaEmpresa(localidadId: number, tx: Tx = prisma) {
  const empresas = await tx.ronda.findMany({
    where: { localidadId, concluido: false },
    select: { empresaId: true },
    distinct: ['empresaId'],
  });
  return empresas.length <= 1;
}

// ================== BLOQUEOS (VÍAS / SECCIONES) ==================

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

/** Busca *una* máquina que pueda estar bloqueando esa vía (best-effort). */
async function movimientoQueBloqueaVia(localidadId: number, viaId: number, tx: Tx = prisma) {
  const bloq = await tx.movimiento.findFirst({
    where: {
      localidadId,
      finalizado: false,
      OR: [{ viaOrigenId: viaId }, { viaDestinoId: viaId }],
    },
    orderBy: [{ updatedAt: 'desc' }]
  });
  return bloq || null;
}

/** ¿El movimiento de la ronda está bloqueado por falta de sección/vía de destino? */
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

async function assertViasLibres(localidadId: number, m: Movimiento, tx: Tx = prisma) {
  if (!m) return;
  if (m.viaDestinoId) {
    const secciones = await tx.seccionVia.count({ where: { viaId: m.viaDestinoId } });
    if (secciones === 0) {
      const bloqueada = await viaSimpleBloqueada(localidadId, m.viaDestinoId, m.id, tx);
      if (bloqueada) throw new Error(`Vía destino bloqueada para movimiento #${m.id}.`);
    } else {
      const libre = await tx.seccionVia.findFirst({ where: { viaId: m.viaDestinoId, ocupada: false } });
      if (!libre) throw new Error(`No hay secciones libres en vía destino para movimiento #${m.id}.`);
    }
  }
}

// ================== NOTIFICACIONES ==================

async function tokensDeUsuarios(ids: number[], tx: Tx = prisma) {
  if (!ids.length) return [];
  const usuarios = await tx.usuario.findMany({ where: { id: { in: ids }, activo: true }, include: { fcmTokens: true } });
  return usuarios.flatMap(u => u.fcmTokens.map(t => t.token));
}

async function notificarRolesLocalidad(localidadId: number, titulo: string, body: string, data: Record<string,string>) {
  const usuarios = await prisma.usuario.findMany({
    where: { localidadId, activo: true, rol: { in: ['ADMINISTRADOR', 'COORDINADOR', 'SUPERVISOR'] as any } },
    include: { fcmTokens: true },
  });
  const tokens = usuarios.flatMap(u => u.fcmTokens.map(t => t.token));
  if (!tokens.length) return;
  await admin.messaging().sendEachForMulticast({ notification: { title: titulo, body }, data, tokens });
}

async function notificarSaltoPorBloqueo(r: Ronda, motivo: string, tx: Tx = prisma) {
  const m = await tx.movimiento.findUnique({
    where: { id: r.movimientoId },
    include: {
      empresa: { select: { nombre: true } },
      viaOrigen: { select: { nombre: true } },
      viaDestino: { select: { id: true, nombre: true } },
    },
  });
  if (!m) return;
  if (m.estado === 'DETENIDO') return; // no spamear detenidos

  const key = _keySkip(r.localidadId, m.id);
  if (_wasNotified(key)) return;

  // intentar identificar bloqueador
  let bloqueadorTxt = '';
  if (m.viaDestinoId) {
    const bloq = await movimientoQueBloqueaVia(m.localidadId, m.viaDestinoId, tx);
    if (bloq) bloqueadorTxt = `; bloqueada por mov #${bloq.id} (loco ${bloq.locomotiveNumber ?? 'N/D'})`;
  }

  const title = `Se saltó tu movimiento #${m.id}`;
  const body =
    `Motivo: ${motivo}${bloqueadorTxt}. ` +
    `Empresa: ${m.empresa?.nombre ?? 'N/D'} · Loco: ${m.locomotiveNumber} · ` +
    `Origen: ${m.viaOrigen?.nombre ?? 'N/D'} → Destino: ${m.viaDestino?.nombre ?? 'N/D'}. ` +
    `Seguiremos con el siguiente disponible.`;

  const destinatarios: number[] = [];
  if ((m as any).clienteId) destinatarios.push((m as any).clienteId);
  if ((m as any).supervisorId) destinatarios.push((m as any).supervisorId);
  if ((m as any).coordinadorId) destinatarios.push((m as any).coordinadorId);

  const tokens = await tokensDeUsuarios(destinatarios, tx);
  if (tokens.length) {
    await admin.messaging().sendEachForMulticast({
      notification: { title, body },
      data: {
        tipo: 'salto_por_bloqueo',
        movimientoId: String(m.id),
        localidadId: String(r.localidadId),
        viaDestino: String(m.viaDestino?.nombre ?? ''),
        motivo
      },
      tokens
    });
    _markNotified(key);
  }
}

async function notificarBloqueos(localidadId: number, tx: Tx = prisma) {
  const keyAll = _keyAllBlocked(localidadId);
  if (_wasNotified(keyAll)) return;

  // Por empresa, toma el primer movimiento bloqueado y avisa a cliente/supervisor/coordinador
  const rondas = await tx.ronda.findMany({
    where: { localidadId, concluido: false },
    include: { movimiento: { select: { id: true, empresaId: true, clienteId: true, supervisorId: true, coordinadorId: true } } },
    orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }]
  });

  const porEmpresa = new Map<number, number>(); // empresaId -> movimientoId
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
      notification: { title: '⚠️ Todos los movimientos bloqueados', body: `Empresa ${m.empresa?.nombre ?? 'N/D'}: vía/Secciones ocupadas en destino ${m.viaDestino?.nombre ?? 'N/D'}.` },
      data: { tipo: 'bloqueo_vias', localidadId: String(localidadId), empresaId: String(empresaId), movimientoId: String(movimientoId), timestamp: new Date().toISOString() },
      tokens
    });
  }

  _markNotified(keyAll);
}

// ================== MODELO ==================

export class RondaModel {
  // ---------- HELPERS CRUD RONDA ----------
  private static async hayAltas(localidadId: number, tx: Tx = prisma) {
    const c = await tx.ronda.count({ where: { localidadId, concluido: false, movimiento: { prioridad: 'ALTA' } } });
    return c > 0;
  }

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

  private static async tamanoDeRonda(tx: Tx, localidadId: number, rondaNumero: number) {
    return tx.ronda.count({ where: { localidadId, rondaNumero, concluido: false } });
  }

  // +++++++++++++ NUEVO: compactar órdenes por ronda
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

  // +++++++++++++ NUEVO: último slot de una empresa a partir de una ronda
  private static async ultimoSlotEmpresaDesde(
    tx: Tx, localidadId: number, empresaId: number, desdeRonda: number
  ): Promise<{ rondaNumero: number; orden: number } | null> {
    const last = await tx.ronda.findFirst({
      where: { localidadId, concluido: false, empresaId, rondaNumero: { gte: desdeRonda } },
      orderBy: [{ rondaNumero: 'desc' }, { orden: 'desc' }],
      select: { rondaNumero: true, orden: true },
    });
    return last ?? null;
  }

  public static async recomponerRondasLocalidad(localidadId: number, tx: Tx = prisma) {
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
        await tx.ronda.updateMany({ where: { localidadId, rondaNumero: g.rondaNumero }, data: { rondaNumero: idx } });
      }
      // compactar órdenes de cada ronda normalizada
      await this.compactarOrdenesRonda(tx, localidadId, idx);
      idx++;
    }
  }

  // ---------- ORDEN ALTAS / LAVADO ----------
  private static async reordenarAltasSegunReglas(localidadId: number, tx: Tx = prisma) {
    const enVentana = esVentanaLavado();

    if (enVentana) {
      // 1) Mover todos los movimientos de LAVADO a R1; sacar de R1 los que NO son lavado
      const filas = await tx.ronda.findMany({
        where: { localidadId, concluido: false },
        include: { movimiento: { select: { prioridad: true, empresaId: true, lavado: true } } },
        orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }],
      });

      for (const f of filas) {
        if (f.movimiento.lavado && f.rondaNumero !== 1) {
          const tamR1 = await this.tamanoDeRonda(tx, localidadId, 1);
          await this.moverRonda(tx, f, 1, tamR1 + 1);
        }
        if (!f.movimiento.lavado && f.rondaNumero === 1) {
          // empujarlo a R2 (o crear) al final
          const tamR2 = await this.tamanoDeRonda(tx, localidadId, 2);
          await this.moverRonda(tx, f, 2, tamR2 + 1);
        }
      }

      // 2) Dentro de R1 (solo lavado): ALTAS primero RR por empresa, luego BAJAS RR por empresa
      const r1 = await tx.ronda.findMany({
        where: { localidadId, rondaNumero: 1, concluido: false },
        include: { movimiento: { select: { empresaId: true, prioridad: true } } },
        orderBy: [{ orden: 'asc' }],
      });
      const altas = r1.filter(x => x.movimiento.prioridad === 'ALTA');
      const bajas = r1.filter(x => x.movimiento.prioridad !== 'ALTA');

      const rr = (items: typeof r1) => {
        const map = new Map<number, Ronda[]>();
        for (const it of items) {
          const arr = map.get(it.movimiento.empresaId) ?? [];
          arr.push(it);
          map.set(it.movimiento.empresaId, arr);
        }
        const empresas = [...map.keys()];
        const salida: number[] = [];
        let hay = true;
        while (hay) {
          hay = false;
          for (const e of empresas) {
            const q = map.get(e)!;
            if (q.length) {
              salida.push(q.shift()!.id);
              hay = true;
            }
          }
        }
        return salida;
      };

      const nuevoOrdenIds = [...rr(altas), ...rr(bajas)];
      for (let i = 0; i < nuevoOrdenIds.length; i++) {
        await tx.ronda.update({ where: { id: nuevoOrdenIds[i] }, data: { orden: i + 1 } });
      }

      // 3) R2+ quedan como están (altas no-lavado y bajas), compactar por prolijidad
      await this.compactarOrdenesRonda(tx, localidadId, 1);
      await this.compactarOrdenesRonda(tx, localidadId, 2);
      return;
    }

    // Fuera de ventana: R1 = ALTAS (lavado o no). Orden por antigüedad (FIFO).
    const altasFuera = await tx.ronda.findMany({
      where: { localidadId, rondaNumero: 1, concluido: false, movimiento: { prioridad: 'ALTA' } },
      include: { movimiento: { select: { createdAt: true } } },
      orderBy: [{ movimiento: { createdAt: 'asc' } }, { orden: 'asc' }],
    });
    for (let i = 0; i < altasFuera.length; i++) {
      const orden = i + 1;
      if (altasFuera[i].orden !== orden) {
        await tx.ronda.update({ where: { id: altasFuera[i].id }, data: { orden } });
      }
    }
  }

  // ---------- GENERACIÓN / INSERCIÓN ----------
  static async generarRondaParaMovimiento(data: {
    movimientoId: number;
    empresaId: number;
    localidadId: number;
    prioridad: 'ALTA' | 'BAJA';
  }) {
    if (data.prioridad === 'ALTA') {
      await prisma.$transaction(async (tx) => {
        const mov = await tx.movimiento.findUnique({ where: { id: data.movimientoId } });
        if (!mov) throw new Error(`Movimiento ${data.movimientoId} no encontrado`);
        const existe = await tx.ronda.findFirst({ where: { movimientoId: data.movimientoId } });
        if (existe) return;

        const hayAltaR1 = await tx.ronda.count({
          where: { localidadId: data.localidadId, rondaNumero: 1, concluido: false, movimiento: { prioridad: 'ALTA' } },
        });

        if (hayAltaR1 === 0) {
          await tx.ronda.updateMany({ where: { localidadId: data.localidadId, concluido: false }, data: { rondaNumero: { increment: 1 } } });
          await notificarRolesLocalidad(
            data.localidadId,
            'Reordenamiento por ALTA',
            `Se creó la ronda 1 para ALTAS; rondas existentes desplazadas.`,
            { tipo: 'ronda_alta_insert', localidadId: String(data.localidadId) }
          );
        }

        const ord = (await this.tamanoDeRonda(tx, data.localidadId, 1)) + 1;
        await tx.ronda.create({
          data: { movimientoId: data.movimientoId, empresaId: data.empresaId, localidadId: data.localidadId, rondaNumero: 1, orden: ord },
        });

        await this.reordenarAltasSegunReglas(data.localidadId, tx);
        await this.recomponerRondasLocalidad(data.localidadId, tx);

        if (esVentanaLavado() && (mov as any).lavado) {
          await notificarRolesLocalidad(
            data.localidadId,
            'Prioridad LAVADO aplicada',
            `Movimiento #${mov.id} priorizado en ventana de lavado.`,
            { tipo: 'prioridad_lavado', movimientoId: String(mov.id) }
          );
        }
      });
      return;
    }

    // BAJA
    await prisma.$transaction(async (tx) => {
      const mov = await tx.movimiento.findUnique({ where: { id: data.movimientoId } });
      if (!mov) throw new Error('Movimiento no encontrado');

      const existenAltas = await this.hayAltas(data.localidadId, tx);
      let r = existenAltas ? 2 : 1;
      for (let guard = 0; guard < 200; guard++) {
        const ya = await tx.ronda.count({
          where: { localidadId: data.localidadId, rondaNumero: r, concluido: false, empresaId: data.empresaId },
        });
        if (ya === 0) break;
        r++;
      }
      const ord = (await this.tamanoDeRonda(tx, data.localidadId, r)) + 1;
      await tx.ronda.create({
        data: { movimientoId: data.movimientoId, empresaId: data.empresaId, localidadId: data.localidadId, rondaNumero: r, orden: ord },
      });
      await this.recomponerRondasLocalidad(data.localidadId, tx);
    });
  }

  // ---------- INCIDENTES (REGLAS + HOLD 10m) ----------
  static async aplicarIncidente(localidadId: number, movimientoId: number) {
    const ronda = await prisma.ronda.findFirst({
      where: { localidadId, movimientoId, concluido: false },
      include: { movimiento: true },
    });
    if (!ronda) return;

    if (await hayUnaSolaEmpresa(localidadId)) return;

    if (ronda.movimiento.prioridad === 'ALTA') {
      await this._incidenteAlta(ronda);
    } else {
      await this._incidenteBajaCadenaCompleta(ronda);
    }
  }

  /** Reacomodo por incidente según reglas personalizadas */
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
              id: true, prioridad: true, empresaId: true, localidadId: true,
              lavado: true, torno: true,
            }
          }
        }
      });
      if (!r) throw new Error(`No hay ronda activa para el movimiento ${movimientoId}`);

      const { localidadId, empresaId } = r;
      const esAlta = r.movimiento.prioridad === 'ALTA';

      const totalAltas = await tx.ronda.count({
        where: { localidadId, concluido: false, movimiento: { prioridad: 'ALTA' } }
      });

      // Caso A: ALTA con varias ALTAS en espera -> mandarlo al último de ALTAS de su grupo
      if (esAlta && totalAltas >= 2) {
        const grupoAltas = await tx.ronda.findMany({
          where: { localidadId, rondaNumero: r.rondaNumero, concluido: false, movimiento: { prioridad: 'ALTA' } },
          orderBy: { orden: 'asc' },
          select: { id: true }
        });
        if (grupoAltas.length >= 2) {
          await RondaModel.moverRonda(tx, r, r.rondaNumero, grupoAltas.length);
          await RondaModel.compactarOrdenesRonda(tx, localidadId, r.rondaNumero);
          await RondaModel.recomponerRondasLocalidad(localidadId, tx);
          return;
        }
      }

      // Caso B: única ALTA y hay BAJAS -> bajar ALTA a R2:1 y subir R2:1 (BAJA) a R1:1
      if (esAlta && totalAltas === 1) {
        const hayBajas = await tx.ronda.count({
          where: { localidadId, concluido: false, movimiento: { prioridad: 'BAJA' } }
        });
        if (hayBajas > 0) {
          const r2p1 = await tx.ronda.findFirst({
            where: { localidadId, rondaNumero: 2, concluido: false, movimiento: { prioridad: 'BAJA' } },
            orderBy: { orden: 'asc' }
          });

          // Bajar ALTA a R2:1
          await tx.ronda.updateMany({
            where: { localidadId, rondaNumero: 2, concluido: false, orden: { gte: 1 } },
            data: { orden: { increment: 1 } }
          });
          await RondaModel.moverRonda(tx, r, 2, 1);

          // Subir r2p1 a R1:1
          if (r2p1) {
            await tx.ronda.updateMany({
              where: { localidadId, rondaNumero: r.rondaNumero, concluido: false, orden: { gte: 1 } },
              data: { orden: { increment: 1 } }
            });
            await tx.ronda.update({ where: { id: r2p1.id }, data: { rondaNumero: r.rondaNumero, orden: 1 } });
          }

          await RondaModel.compactarOrdenesRonda(tx, localidadId, r.rondaNumero);
          await RondaModel.compactarOrdenesRonda(tx, localidadId, 2);
          await RondaModel.recomponerRondasLocalidad(localidadId, tx);
          return;
        }
      }

      // Caso C: solo BAJAS en cola y NO es servicio (lavado/torno)
      if (!esAlta) {
        const hayAltasLoc = await tx.ronda.count({
          where: { localidadId, concluido: false, movimiento: { prioridad: 'ALTA' } }
        });
        const esServicio = !!(r.movimiento as any).lavado || !!(r.movimiento as any).torno;
        if (hayAltasLoc === 0 && !esServicio) {
          const slots = await tx.ronda.findMany({
            where: { localidadId, empresaId, concluido: false },
            include: { movimiento: { select: { id: true } } },
            orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }]
          });

          if (slots.length >= 2) {
            // buscar alternativa no bloqueada (a partir del 2º slot)
            let idxAlt = -1;
            for (let i = 1; i < slots.length; i++) {
              const stub: Ronda = {
                id: slots[i].id,
                localidadId,
                empresaId,
                movimientoId: slots[i].movimiento.id,
                rondaNumero: slots[i].rondaNumero,
                orden: slots[i].orden,
                concluido: false,
                createdAt: new Date(),
                updatedAt: new Date(),
              } as any;
              if (!(await estaBloqueadoPorVias(stub, tx))) { idxAlt = i; break; }
            }

            if (idxAlt >= 0) {
              // swap de IDs de movimiento manteniendo posiciones
              const firstId = slots[0].movimiento.id;
              const altId   = slots[idxAlt].movimiento.id;

              await tx.ronda.update({ where: { id: slots[0].id },      data: { movimientoId: altId } });
              await tx.ronda.update({ where: { id: slots[idxAlt].id }, data: { movimientoId: firstId } });

              return;
            }
          }

          // No hay alternativa -> HOLD de 10 minutos (una sola vez)
          if (opts?.cerradoNoResuelto && !_hold10mOnce.has(movimientoId)) {
            _hold10m.set(movimientoId, Date.now() + HOLD10M_MS);
            _hold10mOnce.add(movimientoId);
          }
          return;
        }
      }
    });
  }

  private static async _incidenteAlta(ronda: Ronda & { movimiento: Movimiento }) {
    await prisma.$transaction(async (tx) => {
      const { localidadId, movimiento } = ronda;

      const altasR1 = await tx.ronda.findMany({
        where: { localidadId, rondaNumero: 1, concluido: false, movimiento: { prioridad: 'ALTA' } },
        orderBy: { orden: 'asc' },
      });

      if (altasR1.length === 0) {
        await tx.ronda.updateMany({ where: { localidadId, concluido: false }, data: { rondaNumero: { increment: 1 } } });
        const self = await tx.ronda.findUnique({ where: { id: ronda.id } });
        if (self) await this.moverRonda(tx, self, 1, 1);
      } else {
        if (ronda.rondaNumero !== 1) {
          const tam = await this.tamanoDeRonda(tx, localidadId, 1);
          await this.moverRonda(tx, ronda, 1, tam + 1);
        }
        await this.reordenarAltasSegunReglas(localidadId, tx);
      }

      await this.recomponerRondasLocalidad(localidadId, tx);

      if (esVentanaLavado() && ((movimiento as any).lavado || (movimiento as any).torno)) {
        await notificarRolesLocalidad(
          localidadId,
          'Prioridad LAVADO/TORNO aplicada',
          `Incidente en ALTA #${movimiento.id}: priorizado en ventana de lavado.`,
          { tipo: 'incidente_alta_lavado', movimientoId: String(movimiento.id) }
        );
      }
    });
  }

  private static async _incidenteBajaCadenaCompleta(ronda: Ronda & { movimiento: Movimiento }) {
    await prisma.$transaction(async (tx) => {
      const { localidadId, empresaId } = ronda;

      const chain = await tx.ronda.findMany({
        where: { localidadId, empresaId, concluido: false, rondaNumero: { gte: ronda.rondaNumero } },
        orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }],
      });
      if (chain.length === 0) return;

      let current = await tx.ronda.findUnique({ where: { id: chain[0].id } });
      if (!current) return;

      for (let i = 1; i < chain.length; i++) {
        const target = await tx.ronda.findUnique({ where: { id: chain[i].id } });
        if (!target) continue;
        await this.moverRonda(tx, current, target.rondaNumero, target.orden);
        const pushed = await tx.ronda.findUnique({ where: { id: chain[i].id } });
        if (!pushed) break;
        current = pushed;
      }

      const last = chain[chain.length - 1];
      const nextRound = last.rondaNumero + 1;
      const tam = await this.tamanoDeRonda(tx, localidadId, nextRound);
      if (tam > 0) {
        await this.moverRonda(tx, current, nextRound, tam + 1);
      } else {
        const max = await tx.ronda.aggregate({ where: { localidadId, concluido: false }, _max: { rondaNumero: true } });
        await this.moverRonda(tx, current, (max._max.rondaNumero ?? 0) + 1, 1);
      }

      await this.recomponerRondasLocalidad(localidadId, tx);
    });
  }

  // ---------- MOTOR: SIGUIENTE INTELIGENTE ----------
  public static async siguienteInteligente(localidadId: number) {
    return prisma.$transaction(async (tx) => {
      // Reordenar ALTAS / LAVADO según reglas
      await this.reordenarAltasSegunReglas(localidadId, tx);

      // Lista ordenada global
      const lista = await tx.ronda.findMany({
        where: { localidadId, concluido: false },
        include: {
          movimiento: {
            select: {
              id: true, empresaId: true, prioridad: true, estado: true,
              lavado: true, viaDestinoId: true, locomotiveNumber: true
            }
          }
        },
        orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }]
      });
      if (lista.length === 0) return { vacio: true as const };

      for (const r of lista) {
        // respetar holds de 10 min
        if (_isOnHold(r.movimientoId)) continue;

        const bloqueado = await estaBloqueadoPorVias(r, tx);
        if (!bloqueado) {
          await RondaModel.compactarOrdenesRonda(tx, r.localidadId, r.rondaNumero);
          return { candidato: r };
        }

        // notificar salto (una vez)
        await notificarSaltoPorBloqueo(
          r,
          r.movimiento.viaDestinoId ? 'vía/secciones de destino ocupadas' : 'destino no disponible',
          tx
        );

        // === REACOMODO EN CASCADA POR EMPRESA ===
        await tx.ronda.updateMany({
          where: { localidadId: r.localidadId, rondaNumero: r.rondaNumero, concluido: false, orden: { gt: r.orden } },
          data: { orden: { decrement: 1 } },
        });

        const ultimo = await RondaModel.ultimoSlotEmpresaDesde(tx, r.localidadId, r.empresaId, r.rondaNumero);
        if (ultimo) {
          const tam = await RondaModel.tamanoDeRonda(tx, r.localidadId, ultimo.rondaNumero);
          await tx.ronda.update({
            where: { id: r.id },
            data: { rondaNumero: ultimo.rondaNumero, orden: Math.min(tam + 1, ultimo.orden + 1) },
          });
          await RondaModel.compactarOrdenesRonda(tx, r.localidadId, ultimo.rondaNumero);
        } else {
          const tam = await RondaModel.tamanoDeRonda(tx, r.localidadId, r.rondaNumero);
          await tx.ronda.update({ where: { id: r.id }, data: { orden: tam } });
          await RondaModel.compactarOrdenesRonda(tx, r.localidadId, r.rondaNumero);
        }
      }

      await notificarBloqueos(localidadId, tx);
      return { motivo: 'todos_bloqueados' as const };
    });
  }

  // ---------- FIN SERVICIO (LAVADO / TORNO) ----------
  static async notificarFinServicio(
    movimientoId: number,
    tipo: 'LAVADO' | 'TORNO',
    imagenesUrls?: string[]
  ) {
    // Persistencia de imágenes: delegar a otro servicio/tabla (no definido aquí)
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
    const body =
      `Concluido ${tipo.toLowerCase()} de la locomotora ${m.locomotiveNumber}. ` +
      `Por favor crear movimiento para desocupar la sección.`;

    await admin.messaging().sendEachForMulticast({
      notification: { title, body },
      data: {
        tipo: 'fin_servicio',
        subtipo: tipo.toLowerCase(),
        movimientoId: String(m.id),
        empresa: String(m.empresa?.nombre ?? ''),
        localidadId: String(m.localidadId),
        imagenes: (imagenesUrls ?? []).slice(0, 5).join(',') // opcional, máx 5 en data
      },
      tokens
    });
  }

  // ---------- LIMPIEZA ----------
  private static async limpiarYReorganizarRondasConcluidas() {
    const locs = await prisma.ronda.findMany({ select: { localidadId: true }, distinct: ['localidadId'] });
    for (const { localidadId } of locs) {
      await prisma.$transaction(async (tx) => {
        await tx.ronda.deleteMany({ where: { localidadId, concluido: true } });
        await this.recomponerRondasLocalidad(localidadId, tx);
      });
    }
  }

  // ---------- QUERIES VARIAS ----------
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

      const [movA, movB] = await Promise.all([
        tx.movimiento.findUnique({ where: { id: rondaA.movimientoId } }),
        tx.movimiento.findUnique({ where: { id: rondaB.movimientoId } }),
      ]);
      if (!movA || !movB) throw new Error('Movimiento no encontrado');

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

  static async intercambiarMovimientoEnRonda(rondaId: number, nuevoMovimientoId: number) {
    try {
      const ronda = await prisma.ronda.findUnique({ where: { id: rondaId } });
      if (!ronda) throw new Error('Ronda no encontrada');
      const movimiento = await prisma.movimiento.findUnique({ where: { id: nuevoMovimientoId } });
      if (!movimiento) throw new Error('Movimiento no encontrado');

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
