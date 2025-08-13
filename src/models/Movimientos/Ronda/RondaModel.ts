// RondaModel.ts
import { movimientoError } from "../movimiento.logger";
import type { Prisma, Ronda, Movimiento, Usuario } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import admin from 'firebase-admin';

const prisma = new PrismaClient();
type Tx = Prisma.TransactionClient;

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
      estado: { in: ['SOLICITADO','ESPERA','DETENIDO','EN_PROCESO'] },
      lavado: true
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

/** Vía simple: bloqueada si existe algún movimiento activo que la use (origen/destino). */
async function viaSimpleBloqueada(localidadId: number, viaId: number, excluirMovimientoId?: number, tx: Tx = prisma) {
  const activos = await tx.movimiento.count({
    where: {
      localidadId,
      id: { not: excluirMovimientoId ?? 0 },
      finalizado: false,
      estado: { in: ['EN_PROCESO','DETENIDO','ASIGNADO','SOLICITADO','ESPERA'] as any },
      OR: [{ viaOrigenId: viaId }, { viaDestinoId: viaId }],
    },
  });
  return activos > 0;
}

/** ¿El movimiento de la ronda está bloqueado por falta de sección/vía de destino? */
async function estaBloqueadoPorVias(r: Ronda, tx: Tx = prisma) {
  const mov = await tx.movimiento.findUnique({
    where: { id: r.movimientoId },
    select: { id: true, localidadId: true, viaDestinoId: true, lavado: true, torno: true }
  });
  if (!mov?.viaDestinoId) return false;

  // ¿Tiene secciones?
  const secciones = await tx.seccionVia.count({ where: { viaId: mov.viaDestinoId } });
  if (secciones === 0) {
    // Vía simple: considera bloqueada si algún otro movimiento la ocupa/usa
    return await viaSimpleBloqueada(mov.localidadId, mov.viaDestinoId, mov.id, tx);
  }

  // Vía con secciones: si no hay ninguna libre, bloqueado
  const libre = await tx.seccionVia.findFirst({
    where: { viaId: mov.viaDestinoId, ocupada: false },
    select: { id: true }
  });
  return !libre;
}

/** Falla dura si las vías del movimiento están bloqueadas (para operaciones que NO deben reordenar). */
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

async function notificarRolesLocalidad(localidadId: number, titulo: string, body: string, data: Record<string,string>) {
  const usuarios = await prisma.usuario.findMany({
    where: { localidadId, activo: true, rol: { in: ['ADMIN', 'COORDINADOR', 'SUPERVISOR'] as any } },
    include: { fcmTokens: true },
  });
  const tokens = usuarios.flatMap(u => u.fcmTokens.map(t => t.token));
  if (tokens.length === 0) return;
  await admin.messaging().sendEachForMulticast({ notification: { title: titulo, body }, data, tokens });
}

async function notificarBloqueos(localidadId: number, tx: Tx = prisma) {
  // Por empresa, toma el primer movimiento que bloquea y avisa a cliente/supervisor/coordinador
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
    const m = await tx.movimiento.findUnique({ where: { id: movimientoId }, select: { clienteId: true, supervisorId: true, coordinadorId: true } });
    const ids = [m?.clienteId, m?.supervisorId, m?.coordinadorId].filter(Boolean) as number[];
    if (!ids.length) continue;
    const usuarios = await tx.usuario.findMany({ where: { id: { in: ids }, activo: true }, include: { fcmTokens: true } });
    const tokens = usuarios.flatMap(u => u.fcmTokens.map(t => t.token));
    if (!tokens.length) continue;

    await admin.messaging().sendEachForMulticast({
      notification: { title: '⚠️ Movimiento bloqueado', body: 'Se requiere mover la máquina: sin secciones/vías disponibles para lavado/torno.' },
      data: { tipo: 'bloqueo_vias', localidadId: String(localidadId), empresaId: String(empresaId), movimientoId: String(movimientoId), timestamp: new Date().toISOString() },
      tokens
    });
  }
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
      idx++;
    }
  }

  // ---------- ORDEN ALTAS (R1) ----------

  /** ALTAS en ronda 1: fuera de ventana -> FIFO por createdAt; en ventana con lavados -> round-robin por empresa. */
  private static async reordenarAltasSegunReglas(localidadId: number, tx: Tx = prisma) {
    const enVentana = esVentanaLavado();
    const hayLavados = enVentana ? await hayLavadosPendientes(localidadId, tx) : false;

    const altas = await tx.ronda.findMany({
      where: { localidadId, rondaNumero: 1, concluido: false, movimiento: { prioridad: 'ALTA' } },
      include: { movimiento: { select: { createdAt: true, empresaId: true } } },
      orderBy: [{ movimiento: { createdAt: 'asc' } }, { orden: 'asc' }]
    });

    if (!hayLavados) {
      // FIFO simple
      for (let i = 0; i < altas.length; i++) {
        const orden = i + 1;
        if (altas[i].orden !== orden) {
          await tx.ronda.update({ where: { id: altas[i].id }, data: { orden } });
        }
      }
      return;
    }

    // Round-robin por empresa (respetando FIFO dentro de cada empresa)
    const porEmpresa = new Map<number, Array<typeof altas[number]>>();
    for (const a of altas) {
      const arr = porEmpresa.get(a.movimiento.empresaId) ?? [];
      arr.push(a);
      porEmpresa.set(a.movimiento.empresaId, arr);
    }

    const empresas = [...porEmpresa.keys()];
    const nuevoOrden: number[] = [];
    let avanzan = true;
    while (avanzan) {
      avanzan = false;
      for (const e of empresas) {
        const q = porEmpresa.get(e)!;
        if (q.length) {
          nuevoOrden.push(q.shift()!.id);
          avanzan = true;
        }
      }
    }

    for (let i = 0; i < nuevoOrden.length; i++) {
      await tx.ronda.update({ where: { id: nuevoOrden[i] }, data: { orden: i + 1 } });
    }
  }

  // ---------- GENERACIÓN / INSERCIÓN ----------

  /** Inserta un movimiento en rondas respetando reglas (ALTAS no destruye: crea R1 si hace falta desplazando +1). */
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

        // (ALTAS pueden llegar aun con vías ocupadas; no bloqueamos la inserción en ronda)
        const hayAltaR1 = await tx.ronda.count({
          where: { localidadId: data.localidadId, rondaNumero: 1, concluido: false, movimiento: { prioridad: 'ALTA' } },
        });

        if (hayAltaR1 === 0) {
          // Crea R1 para ALTAS desplazando todo +1
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

        if (esVentanaLavado() && mov.lavado) {
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

    // BAJA normal (no incidente)
    await prisma.$transaction(async (tx) => {
      const mov = await tx.movimiento.findUnique({ where: { id: data.movimientoId } });
      if (!mov) throw new Error('Movimiento no encontrado');

      // Primera ronda donde la empresa NO participa; si ninguna, crear nueva al final
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

  // ---------- INCIDENTES ----------

  /** Aplica reglas de incidente: ALTA (R1) / BAJA (efecto-cadena por empresa). */
  static async aplicarIncidente(localidadId: number, movimientoId: number) {
    const ronda = await prisma.ronda.findFirst({
      where: { localidadId, movimientoId, concluido: false },
      include: { movimiento: true },
    });
    if (!ronda) return;

    // Una sola empresa → evita reorden para no repetir
    if (await hayUnaSolaEmpresa(localidadId)) return;

    if (ronda.movimiento.prioridad === 'ALTA') {
      await this._incidenteAlta(ronda);
    } else {
      await this._incidenteBajaCadenaCompleta(ronda);
    }
  }

  /** Incidente ALTA: si R1 no tenía ALTAS, crea R1 y coloca; si ya hay ALTAS, manda al final y reordena por reglas. */
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

      if (esVentanaLavado() && (movimiento.lavado || movimiento.torno)) {
        await notificarRolesLocalidad(
          localidadId,
          'Prioridad LAVADO/TORNO aplicada',
          `Incidente en ALTA #${movimiento.id}: priorizado en ventana de lavado.`,
          { tipo: 'incidente_alta_lavado', movimientoId: String(movimiento.id) }
        );
      }
    });
  }

  /** Incidente BAJA: rota TODOS los slots de la empresa hacia adelante; el último cae a ronda siguiente o a nueva ronda. */
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

  // ---------- MOTOR DE SELECCIÓN (ENDPOINT INTELIGENTE) ----------

  /** Retorna el siguiente candidato listo; salta bloqueados sin incidentar. Notifica si todos bloqueados. */
  public static async siguienteInteligente(localidadId: number) {
    return prisma.$transaction(async (tx) => {
      // Reordenar ALTAS de R1 según reglas (solo afecta R1)
      await this.reordenarAltasSegunReglas(localidadId, tx);

      const unicaEmpresa = await hayUnaSolaEmpresa(localidadId, tx);

      // Lista ordenada global
      const lista = await tx.ronda.findMany({
        where: { localidadId, concluido: false },
        include: { movimiento: { select: { id: true, empresaId: true, prioridad: true, lavado: true, viaDestinoId: true } } },
        orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }]
      });
      if (lista.length === 0) return { vacio: true as const };

      for (const r of lista) {
        const bloqueado = await estaBloqueadoPorVias(r, tx);
        if (!bloqueado) {
          return { candidato: r };
        }

        // si bloqueado y hay más elementos en su misma ronda y NO es única empresa → mandarlo al final de su ronda
        const tam = await this.tamanoDeRonda(tx, r.localidadId, r.rondaNumero);
        if (!unicaEmpresa && tam > 1) {
          await tx.ronda.updateMany({
            where: { localidadId, rondaNumero: r.rondaNumero, concluido: false, orden: { gt: r.orden } },
            data: { orden: { decrement: 1 } }
          });
          await tx.ronda.update({ where: { id: r.id }, data: { orden: tam } });
        }
      }

      // Todos bloqueados
      await notificarBloqueos(localidadId, tx);
      return { motivo: 'todos_bloqueados' as const };
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
          lavado: info.movimiento.lavado,
          torno: info.movimiento.torno,
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
