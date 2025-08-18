// src/models/RondaModel.ts
import { movimientoError } from "../movimiento.logger";
import type { Prisma, Ronda, Movimiento } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import admin from 'firebase-admin';

const prisma = new PrismaClient();
type Tx = Prisma.TransactionClient;

// ================== BUFFER DE NOTIFICACIONES (UNA SOLA VEZ) ==================
const TTL_MS = 60 * 60 * 1000; // 1h
const _notifBuffer = new Map<string, number>(); // key -> expiresAt
function _markNotified(key: string) { _notifBuffer.set(key, Date.now() + TTL_MS); }
function _wasNotified(key: string) {
  const exp = _notifBuffer.get(key);
  if (!exp) return false;
  if (Date.now() > exp) { _notifBuffer.delete(key); return false; }
  return true;
}
function _keySkip(localidadId: number, movimientoId: number) { return `skip:${localidadId}:${movimientoId}`; }
function _keyAllBlocked(localidadId: number) { return `allblocked:${localidadId}`; }
function _keyTapado(localidadId: number, movimientoId: number) { return `tapado:${localidadId}:${movimientoId}`; }

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

// ================== LOCALIDAD / HORA CLIENTE (solo Guadalajara 2) ==================
function _normalize(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
const _locFlagsCache = new Map<number, { any: boolean; gdl2: boolean }>();

async function _getLocalidadFlags(localidadId: number, tx: Tx = prisma) {
  if (_locFlagsCache.has(localidadId)) return _locFlagsCache.get(localidadId)!;
  const loc = await tx.localidad.findUnique({ where: { id: localidadId }, select: { nombre: true } });
  const name = _normalize(loc?.nombre ?? '');
  const any = name.includes('guadalajara'); // "GUadalajara", "guadalajara", "Guadalajara", con o sin texto extra
  // "Guadalajara2" | "Guadalajara 2" | "... Guadalajara 2 - Patio"
  const gdl2 = any && (/guadalajara\s*2\b/.test(name) || /guadalajara2\b/.test(name));
  const flags = { any, gdl2 };
  _locFlagsCache.set(localidadId, flags);
  return flags;
}

/** Hora local del CLIENTE (ISO local del cliente). */
function horaCliente(iso?: string): number | null {
  if (!iso || typeof iso !== 'string') return null;
  const m = iso.match(/T(\d{2}):(\d{2})/);
  return m ? parseInt(m[1], 10) : null;
}
/** Ventana lavado cliente: 22:00–03:59 */
function enVentanaLavadoCliente(iso?: string): boolean {
  const h = horaCliente(iso);
  return h !== null && (h >= 22 || h < 4);
}

/** Solo aplica ventana si la localidad es "Guadalajara 2" (tolera "Guadalajara2" / más texto). */
async function esVentanaLavadoGDL2(localidadId: number, clientLocalISO?: string, tx: Tx = prisma) {
  const flags = await _getLocalidadFlags(localidadId, tx);
  return flags.gdl2 && enVentanaLavadoCliente(clientLocalISO);
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

/** Una máquina que pueda estar bloqueando esa vía (best-effort). */
async function movimientoQueBloqueaVia(localidadId: number, viaId: number, tx: Tx = prisma) {
  const bloq = await tx.movimiento.findFirst({
    where: {
      localidadId,
      finalizado: false,
      OR: [{ viaOrigenId: viaId }, { viaDestinoId: viaId }],
    },
    include: { empresa: { select: { nombre: true } } },
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

/** Notifica que el movimiento está TAPADO y por quién (empresa, loco y vía). No reacomoda nada. */
async function notificarTapado(r: Ronda, tx: Tx = prisma) {
  const m = await tx.movimiento.findUnique({
    where: { id: r.movimientoId },
    include: {
      empresa: { select: { nombre: true } },
      viaDestino: { select: { id: true, nombre: true } },
    },
  });
  if (!m || !m.viaDestinoId) return;

  const key = _keyTapado(r.localidadId, m.id);
  if (_wasNotified(key)) return;

  const bloq = await movimientoQueBloqueaVia(r.localidadId, m.viaDestinoId, tx);
  const bloqueadorTxt = bloq
    ? `mov #${bloq.id} · Loco ${bloq.locomotiveNumber ?? 'N/D'} · Empresa ${bloq.empresa?.nombre ?? 'N/D'}`
    : 'N/D';

  const title = `Tu movimiento #${m.id} está TAPADO`;
  const body =
    `Bloqueado por ${bloqueadorTxt} en vía destino ${m.viaDestino?.nombre ?? 'N/D'}. ` +
    `En cuanto liberen, procederemos.`;

  const destinatarios: number[] = [];
  if ((m as any).clienteId) destinatarios.push((m as any).clienteId);
  if ((m as any).supervisorId) destinatarios.push((m as any).supervisorId);
  if ((m as any).coordinadorId) destinatarios.push((m as any).coordinadorId);

  const tokens = await tokensDeUsuarios(destinatarios, tx);
  if (!tokens.length) return;

  await admin.messaging().sendEachForMulticast({
    notification: { title, body },
    data: {
      tipo: 'tapado',
      movimientoId: String(m.id),
      localidadId: String(r.localidadId),
      viaDestino: String(m.viaDestino?.nombre ?? ''),
      bloqueadorId: bloq ? String(bloq.id) : '',
      locoBloqueador: bloq?.locomotiveNumber ?? '',
      empresaBloqueadora: bloq?.empresa?.nombre ?? '',
      timestamp: new Date().toISOString(),
    },
    tokens
  });
  _markNotified(key);
}

async function notificarBloqueos(localidadId: number, tx: Tx = prisma) {
  const keyAll = _keyAllBlocked(localidadId);
  if (_wasNotified(keyAll)) return;

  const rondas = await tx.ronda.findMany({
    where: { localidadId, concluido: false },
    include: { movimiento: { select: { id: true, empresaId: true, clienteId: true, supervisorId: true, coordinadorId: true, viaDestinoId: true } } },
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
      notification: { title: '⚠️ Movimientos bloqueados', body: `Empresa ${m.empresa?.nombre ?? 'N/D'}: vía/Secciones ocupadas en destino ${m.viaDestino?.nombre ?? 'N/D'}.` },
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

  // ----------- 1 slot por empresa / ronda (con excepción en R1 para ALTAS de LAVADO durante ventana GDL2) -----------
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

  private static async garantizarUnSlotPorEmpresaPorRonda(
    tx: Tx,
    localidadId: number,
    opts?: { enVentanaGDL2?: boolean }
  ) {
    const filas = await tx.ronda.findMany({
      where: { localidadId, concluido: false },
      select: { id: true, empresaId: true, rondaNumero: true, movimientoId: true },
      orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }],
    });

    // Traer prioridades/lavado para decidir excepción
    const movs = await tx.movimiento.findMany({
      where: { id: { in: [...new Set(filas.map(f => f.movimientoId))] } },
      select: { id: true, prioridad: true, lavado: true }
    });
    const movMap = new Map(movs.map(m => [m.id, m]));

    const map = new Map<string, { empresaId: number; ronda: number; rows: { id: number; movId: number }[] }>();
    for (const f of filas) {
      const key = `${f.rondaNumero}:${f.empresaId}`;
      const entry = map.get(key) ?? { empresaId: f.empresaId, ronda: f.rondaNumero, rows: [] };
      entry.rows.push({ id: f.id, movId: f.movimientoId });
      map.set(key, entry);
    }

    for (const { empresaId, ronda, rows } of map.values()) {
      if (rows.length <= 1) continue;

      // Mantener el primero; los demás se reubican salvo excepción
      for (let i = 1; i < rows.length; i++) {
        const mov = movMap.get(rows[i].movId);
        const excepcion =
          !!opts?.enVentanaGDL2 &&
          ronda === 1 &&
          mov?.prioridad === 'ALTA' &&
          !!mov?.lavado;

        if (excepcion) continue; // permitir repetido en R1 para ALTAS de lavado en ventana GDL2

        const target = await this.primeraRondaLibreParaEmpresa(tx, localidadId, empresaId, ronda + 1);
        const tam = await this.tamanoDeRonda(tx, localidadId, target);
        await tx.ronda.update({ where: { id: rows[i].id }, data: { rondaNumero: target, orden: tam + 1 } });
      }
    }
  }

  public static async recomponerRondasLocalidad(
    localidadId: number,
    tx: Tx = prisma,
    opts?: { clientLocalISO?: string }
  ) {
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
      await this.compactarOrdenesRonda(tx, localidadId, idx);
      idx++;
    }

    const enVentanaGDL2 = await esVentanaLavadoGDL2(localidadId, opts?.clientLocalISO, tx);
    await this.garantizarUnSlotPorEmpresaPorRonda(tx, localidadId, { enVentanaGDL2 });

    const max = await tx.ronda.aggregate({ where: { localidadId, concluido: false }, _max: { rondaNumero: true } });
    for (let r = 1; r <= (max._max.rondaNumero ?? 0); r++) {
      await this.compactarOrdenesRonda(tx, localidadId, r);
    }
  }

  // ---------- ORDEN ALTAS / LAVADO (solo GDL2 + hora cliente) ----------
  private static async reordenarAltasSegunReglas(
    localidadId: number,
    tx: Tx = prisma,
    opts?: { clientLocalISO?: string }
  ) {
    const enVentana = await esVentanaLavadoGDL2(localidadId, opts?.clientLocalISO, tx);

    if (enVentana) {
      // 1) R1 solo LAVADO (ALTAS y BAJAS de lavado). Lo demás se empuja a R2.
      const filas = await tx.ronda.findMany({
        where: { localidadId, concluido: false },
        include: { movimiento: { select: { prioridad: true, empresaId: true, lavado: true, createdAt: true } } },
        orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }],
      });

      for (const f of filas) {
        if (f.movimiento.lavado && f.rondaNumero !== 1) {
          const tamR1 = await this.tamanoDeRonda(tx, localidadId, 1);
          await this.moverRonda(tx, f, 1, tamR1 + 1);
        }
        if (!f.movimiento.lavado && f.rondaNumero === 1) {
          const tamR2 = await this.tamanoDeRonda(tx, localidadId, 2);
          await this.moverRonda(tx, f, 2, tamR2 + 1);
        }
      }

      // 2) Dentro de R1:
      //    - ALTAS (lavado) por FIFO de fecha (permitiendo varias de la misma empresa)
      //    - luego BAJAS (lavado) en RR por empresa
      const r1 = await tx.ronda.findMany({
        where: { localidadId, rondaNumero: 1, concluido: false },
        include: { movimiento: { select: { empresaId: true, prioridad: true, createdAt: true } } },
        orderBy: [{ orden: 'asc' }],
      });

      const altas = r1
        .filter(x => x.movimiento.prioridad === 'ALTA')
        .sort((a, b) => (+new Date(a.movimiento.createdAt)) - (+new Date(b.movimiento.createdAt)));

      const bajas  = r1.filter(x => x.movimiento.prioridad !== 'ALTA');

      const rr = (items: typeof bajas) => {
        const map = new Map<number, typeof bajas>();
        for (const it of items) map.set(it.movimiento.empresaId, [ ...(map.get(it.movimiento.empresaId) ?? []), it ]);
        const empresas = [...map.keys()];
        const salida: number[] = [];
        let hay = true;
        while (hay) {
          hay = false;
          for (const e of empresas) {
            const q = map.get(e)!;
            if (q.length) { salida.push(q.shift()!.id); hay = true; }
          }
        }
        return salida;
      };

      const nuevoOrdenIds = [...altas.map(x => x.id), ...rr(bajas)];
      for (let i = 0; i < nuevoOrdenIds.length; i++) {
        await tx.ronda.update({ where: { id: nuevoOrdenIds[i] }, data: { orden: i + 1 } });
      }

      await this.compactarOrdenesRonda(tx, localidadId, 1);
      await this.compactarOrdenesRonda(tx, localidadId, 2);
      return;
    }

    // Fuera de ventana (o no GDL2): R1 = ALTAS FIFO (pueden repetirse por empresa si así llegan)
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
  static async generarRondaParaMovimiento(
    data: { movimientoId: number; empresaId: number; localidadId: number; prioridad: 'ALTA' | 'BAJA' },
    opts?: { clientLocalISO?: string }
  ) {
    await prisma.$transaction(async (tx) => {
      const mov = await tx.movimiento.findUnique({ where: { id: data.movimientoId } });
      if (!mov) throw new Error(`Movimiento ${data.movimientoId} no encontrado`);
      const existe = await tx.ronda.findFirst({ where: { movimientoId: data.movimientoId } });
      if (existe) return;

      const hayAltas = await tx.ronda.count({
        where: { localidadId: data.localidadId, concluido: false, movimiento: { prioridad: 'ALTA' } }
      });

      const desde = data.prioridad === 'ALTA' ? 1 : (hayAltas ? 2 : 1);
      const targetRonda = await this.primeraRondaLibreParaEmpresa(tx, data.localidadId, data.empresaId, desde);
      const ord = (await this.tamanoDeRonda(tx, data.localidadId, targetRonda)) + 1;

      await tx.ronda.create({
        data: { movimientoId: data.movimientoId, empresaId: data.empresaId, localidadId: data.localidadId, rondaNumero: targetRonda, orden: ord },
      });

      await this.reordenarAltasSegunReglas(data.localidadId, tx, { clientLocalISO: opts?.clientLocalISO });
      await this.recomponerRondasLocalidad(data.localidadId, tx, { clientLocalISO: opts?.clientLocalISO });
    });
  }

  // ---------- INCIDENTES ----------
  static async aplicarIncidente(localidadId: number, movimientoId: number, opts?: { clientLocalISO?: string }) {
    const ronda = await prisma.ronda.findFirst({
      where: { localidadId, movimientoId, concluido: false },
      include: { movimiento: true },
    });
    if (!ronda) return;
    if (ronda.movimiento.prioridad === 'ALTA') {
      await this._incidenteAlta(ronda, opts);
    } else {
      await this._incidenteBajaCadenaCompleta(ronda);
    }
  }

  /** Reacomodo por incidente según reglas personalizadas */
  static async gestionarIncidente(
    movimientoId: number,
    opts?: { cerradoNoResuelto?: boolean; clientLocalISO?: string }
  ) {
    await prisma.$transaction(async (tx) => {
      const r = await tx.ronda.findFirst({
        where: { movimientoId, concluido: false },
        include: { movimiento: { select: { id: true, prioridad: true, empresaId: true, localidadId: true, lavado: true, torno: true } } }
      });
      if (!r) throw new Error(`No hay ronda activa para el movimiento ${movimientoId}`);

      const { localidadId, empresaId } = r;
      const esAlta = r.movimiento.prioridad === 'ALTA';

      const totalAltas = await tx.ronda.count({ where: { localidadId, concluido: false, movimiento: { prioridad: 'ALTA' } } });

      // Caso A: ALTA con varias ALTAS -> al final del grupo de ALTAS en la misma ronda
      if (esAlta && totalAltas >= 2) {
        const grupoAltas = await tx.ronda.findMany({
          where: { localidadId, rondaNumero: r.rondaNumero, concluido: false, movimiento: { prioridad: 'ALTA' } },
          orderBy: { orden: 'asc' },
          select: { id: true }
        });
        if (grupoAltas.length >= 2) {
          await RondaModel.moverRonda(tx, r, r.rondaNumero, grupoAltas.length);
          await RondaModel.compactarOrdenesRonda(tx, localidadId, r.rondaNumero);
          await RondaModel.recomponerRondasLocalidad(localidadId, tx, { clientLocalISO: opts?.clientLocalISO });
          return;
        }
      }

      // Caso B: única ALTA y hay BAJAS -> intercambia primer BAJA de R2 a R1 y ALTA baja a R2:1
      if (esAlta && totalAltas === 1) {
        const hayBajas = await tx.ronda.count({ where: { localidadId, concluido: false, movimiento: { prioridad: 'BAJA' } } });
        if (hayBajas > 0) {
          const r2p1 = await tx.ronda.findFirst({
            where: { localidadId, rondaNumero: 2, concluido: false, movimiento: { prioridad: 'BAJA' } },
            orderBy: { orden: 'asc' }
          });

          await tx.ronda.updateMany({
            where: { localidadId, rondaNumero: 2, concluido: false, orden: { gte: 1 } },
            data: { orden: { increment: 1 } }
          });
          await RondaModel.moverRonda(tx, r, 2, 1);

          if (r2p1) {
            await tx.ronda.updateMany({
              where: { localidadId, rondaNumero: r.rondaNumero, concluido: false, orden: { gte: 1 } },
              data: { orden: { increment: 1 } }
            });
            await tx.ronda.update({ where: { id: r2p1.id }, data: { rondaNumero: r.rondaNumero, orden: 1 } });
          }

          await RondaModel.compactarOrdenesRonda(tx, localidadId, r.rondaNumero);
          await RondaModel.compactarOrdenesRonda(tx, localidadId, 2);
          await RondaModel.recomponerRondasLocalidad(localidadId, tx, { clientLocalISO: opts?.clientLocalISO });
          return;
        }
      }

      // Caso C: solo BAJAS y NO es servicio -> intenta swap dentro de la empresa
      if (!esAlta) {
        const hayAltasLoc = await tx.ronda.count({ where: { localidadId, concluido: false, movimiento: { prioridad: 'ALTA' } } });
        const esServicio = !!(r.movimiento as any).lavado || !!(r.movimiento as any).torno;
        if (hayAltasLoc === 0 && !esServicio) {
          const slots = await tx.ronda.findMany({
            where: { localidadId, empresaId, concluido: false },
            include: { movimiento: { select: { id: true } } },
            orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }]
          });

          if (slots.length >= 2) {
            let idxAlt = -1;
            for (let i = 1; i < slots.length; i++) {
              const stub: Ronda = {
                id: slots[i].id, localidadId, empresaId,
                movimientoId: slots[i].movimiento.id,
                rondaNumero: slots[i].rondaNumero, orden: slots[i].orden,
                concluido: false, createdAt: new Date(), updatedAt: new Date(),
              } as any;
              const bloqueado = await estaBloqueadoPorVias(stub, tx);
              if (!bloqueado) { idxAlt = i; break; }
            }
            if (idxAlt >= 0) {
              const firstId = slots[0].movimiento.id;
              const altId   = slots[idxAlt].movimiento.id;
              await tx.ronda.update({ where: { id: slots[0].id },      data: { movimientoId: altId } });
              await tx.ronda.update({ where: { id: slots[idxAlt].id }, data: { movimientoId: firstId } });
              return;
            }
          }

          if (opts?.cerradoNoResuelto && !_hold10mOnce.has(movimientoId)) {
            _hold10m.set(movimientoId, Date.now() + HOLD10M_MS);
            _hold10mOnce.add(movimientoId);
          }
          return;
        }
      }
    });
  }

  private static async _incidenteAlta(ronda: Ronda & { movimiento: Movimiento }, opts?: { clientLocalISO?: string }) {
    await prisma.$transaction(async (tx) => {
      const { localidadId } = ronda;

      const altasR1 = await tx.ronda.findMany({
        where: { localidadId, rondaNumero: 1, concluido: false, movimiento: { prioridad: 'ALTA' } },
        orderBy: { orden: 'asc' },
      });

      if (altasR1.length === 0) {
        await tx.ronda.updateMany({ where: { localidadId, concluido: false }, data: { rondaNumero: { increment: 1 } } });
        const self = await tx.ronda.findUnique({ where: { id: ronda.id } });
        if (self) await this.moverRonda(tx, self, 1, 1);
      } else if (ronda.rondaNumero !== 1) {
        const tam = await this.tamanoDeRonda(tx, localidadId, 1);
        await this.moverRonda(tx, ronda, 1, tam + 1);
      }

      await this.reordenarAltasSegunReglas(localidadId, tx, { clientLocalISO: opts?.clientLocalISO });
      await this.recomponerRondasLocalidad(localidadId, tx, { clientLocalISO: opts?.clientLocalISO });
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
      const target = await this.primeraRondaLibreParaEmpresa(tx, localidadId, empresaId, last.rondaNumero + 1);
      const tam = await this.tamanoDeRonda(tx, localidadId, target);
      await this.moverRonda(tx, current, target, tam + 1);

      await this.recomponerRondasLocalidad(localidadId, tx);
    });
  }

  // ---------- MOTOR: SIGUIENTE INTELIGENTE ----------
  /**
   * Regresa el candidato AÚN SI ESTÁ BLOQUEADO.
   * Si está bloqueado, se notifica al cliente quién lo tapa (empresa, loco y vía) y se marca {bloqueado: true}.
   */
  public static async siguienteInteligente(localidadId: number, opts?: { clientLocalISO?: string }) {
    return prisma.$transaction(async (tx) => {
      await this.reordenarAltasSegunReglas(localidadId, tx, { clientLocalISO: opts?.clientLocalISO });

      const lista = await tx.ronda.findMany({
        where: { localidadId, concluido: false },
        include: {
          movimiento: { select: { id: true, empresaId: true, prioridad: true, estado: true, lavado: true, viaDestinoId: true, locomotiveNumber: true } }
        },
        orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }]
      });
      if (!lista.length) return { vacio: true as const };

      for (const r of lista) {
        if (_isOnHold(r.movimientoId)) continue;

        const bloqueado = await estaBloqueadoPorVias(r, tx);
        if (bloqueado) {
          await notificarTapado(r, tx);
          await RondaModel.compactarOrdenesRonda(tx, r.localidadId, r.rondaNumero);
          return { candidato: r, bloqueado: true as const };
        }

        await RondaModel.compactarOrdenesRonda(tx, r.localidadId, r.rondaNumero);
        return { candidato: r, bloqueado: false as const };
      }

      await notificarBloqueos(localidadId, tx);
      const head = lista[0];
      if (head) return { candidato: head, bloqueado: await estaBloqueadoPorVias(head, tx) as boolean };
      return { motivo: 'sin_candidatos' as const };
    });
  }

  // ---------- FIN SERVICIO (LAVADO / TORNO) ----------
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
