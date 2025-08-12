// MovimientoModel.ts
import {
  Prisma,
  PrismaClient,
  TipoRonda,
  TipoServicio,
  EstadoMovimiento,
  Prioridad,
  EventoTipo,
} from '@prisma/client';
import { RondaModel } from './Ronda/RondaModel';
import { movimientoError } from './movimiento.logger';
import { ViaModel } from '../Via/viaModel';
import { ConflictError as ViaConflictError } from '../Via/Secciones/SeccionViasModel';

const prisma = new PrismaClient(); // TODO: inyectar singleton

export class MovimientoModel {
  // ===================== Helpers internos =====================

  /** Bitácora/Auditoría */
  private static async logEvento(
    tx: Prisma.TransactionClient,
    movimientoId: number,
    tipo: EventoTipo,
    actorId?: number | null,
    participantes?: Record<string, any>,
  ) {
    try {
      await tx.movimientoEvento.create({
        data: {
          movimientoId,
          actorId: actorId ?? 0,
          tipo,
          participantes: participantes ? (participantes as any) : undefined,
        },
      });
    } catch (e) {
      movimientoError.warn('No se pudo registrar MovimientoEvento', {
        movimientoId,
        tipo,
        actorId,
        error: (e as any)?.message,
      });
    }
  }

  /** Decide tipoRonda según flags */
  private static decidirTipoRonda(flags: { lavado?: boolean | null; torno?: boolean | null }): TipoRonda {
    if (flags.lavado) return TipoRonda.LAVADO;
    if (flags.torno) return TipoRonda.TORNO;
    return TipoRonda.NATURAL;
  }

  /** Encuentra vías de servicio por nombre (temporal) */
  private static async viasDeServicioPorNombre(
    localidadId: number,
    servicio: TipoServicio,
    tx: Prisma.TransactionClient = prisma
  ) {
    const prefix = servicio === TipoServicio.LAVADO ? 'Lavado' : 'Torno';
    return tx.via.findMany({
      where: {
        localidadId,
        nombre: { startsWith: prefix, mode: 'insensitive' as Prisma.QueryMode },
      },
      orderBy: [{ numero: 'asc' }],
      select: { id: true, numero: true, nombre: true },
    });
  }

  /** Capacidad de servicio (tabla o #secciones como fallback) */
  private static async capacidadServicio(
    localidadId: number,
    servicio: TipoServicio,
    tx: Prisma.TransactionClient = prisma
  ): Promise<number> {
    const fila = await tx.capacidadServicioLocalidad.findUnique({
      where: { localidadId_servicio: { localidadId, servicio } },
      select: { capacidad: true },
    });
    if (fila && fila.capacidad > 0) return fila.capacidad;

    const vias = await this.viasDeServicioPorNombre(localidadId, servicio, tx);
    if (vias.length === 0) return 0;

    const tot = await tx.seccionVia.count({ where: { viaId: { in: vias.map(v => v.id) } } });
    return tot;
  }

  /** Ocupaciones activas de un servicio en la localidad */
  private static contarOcupacionesServicio(
    localidadId: number,
    servicio: TipoServicio,
    tx: Prisma.TransactionClient = prisma
  ) {
    return tx.ocupacionServicio.count({ where: { localidadId, servicio, activo: true } });
  }

  /** Ocupa slot de servicio si hay cupo; idempotente por movimiento */
  private static async ocuparSlotServicio(
    tx: Prisma.TransactionClient,
    localidadId: number,
    servicio: TipoServicio,
    movimientoId: number,
  ) {
    const existente = await tx.ocupacionServicio.findUnique({ where: { movimientoId } });
    if (existente) {
      if (!existente.activo) {
        await tx.ocupacionServicio.update({
          where: { movimientoId },
          data: { activo: true, startedAt: new Date(), endedAt: null },
        });
      }
      return;
    }

    const [cap, enUso] = await Promise.all([
      this.capacidadServicio(localidadId, servicio, tx),
      this.contarOcupacionesServicio(localidadId, servicio, tx),
    ]);

    if (cap <= enUso) {
      throw new ViaConflictError(`No hay cupo en ${servicio} (cap=${cap} enUso=${enUso}).`);
    }

    await tx.ocupacionServicio.create({
      data: { localidadId, servicio, movimientoId, activo: true },
    });
  }

  /** Libera slot de servicio si existe */
  private static async liberarSlotServicio(tx: Prisma.TransactionClient, movimientoId: number) {
    const occ = await tx.ocupacionServicio.findUnique({ where: { movimientoId } });
    if (!occ || !occ.activo) return;
    await tx.ocupacionServicio.update({
      where: { movimientoId },
      data: { activo: false, endedAt: new Date() },
    });
  }

  /** Devuelve el número de la primera sección libre (o null si ninguna). */
  private static async primeraSeccionLibre(
    viaId: number,
    tx: Prisma.TransactionClient = prisma
  ): Promise<number | null> {
    const libre = await tx.seccionVia.findFirst({
      where: { viaId, ocupada: false },
      orderBy: { numero: 'asc' },
      select: { numero: true },
    });
    return libre?.numero ?? null;
  }

  /** Intenta ocupar vía destino (sección o vía simple) */
  private static async intentarOcuparViaDestino(
    viaId: number,
    movimientoId: number,
    numeroSeccion: number | null | undefined,
    tx: Prisma.TransactionClient
  ) {
    await ViaModel.asignarMovimientoASeccion(viaId, numeroSeccion ?? null, movimientoId, tx);
  }

  /** Auto‐ruteo a vías de servicio + ocupar una sección */
  private static async autoRuteoYOCuparServicio(
    tx: Prisma.TransactionClient,
    mov: { id: number; localidadId: number; viaDestinoId: number | null; lavado?: boolean | null; torno?: boolean | null }
  ): Promise<{ ok: boolean; viaDestinoId?: number }> {
    const servicio =
      mov.lavado ? TipoServicio.LAVADO :
      mov.torno ? TipoServicio.TORNO :
      null;

    if (!servicio) return { ok: !!mov.viaDestinoId, viaDestinoId: mov.viaDestinoId ?? undefined };

    // Ya tiene viaDestino → intentar ahí
    if (mov.viaDestinoId) {
      try {
        const secc = await this.primeraSeccionLibre(mov.viaDestinoId, tx);
        if (secc == null) throw new ViaConflictError('Sin secciones libres en vía destino.');
        await this.intentarOcuparViaDestino(mov.viaDestinoId, mov.id, secc, tx);
        return { ok: true, viaDestinoId: mov.viaDestinoId };
      } catch {
        // seguirá buscando otra
      }
    }

    // Buscar primera vía de servicio con sección libre
    const vias = await this.viasDeServicioPorNombre(mov.localidadId, servicio, tx);
    for (const v of vias) {
      const secc = await this.primeraSeccionLibre(v.id, tx);
      if (secc != null) {
        await this.intentarOcuparViaDestino(v.id, mov.id, secc, tx);
        await tx.movimiento.update({ where: { id: mov.id }, data: { viaDestinoId: v.id } });
        return { ok: true, viaDestinoId: v.id };
      }
    }
    return { ok: false };
  }

  // ===================== Consultas =====================

  static async obtenerMovimientos() {
    try {
      return await prisma.movimiento.findMany({
        include: {
          empresa: true,
          creadoPor: true,
          localidad: true,
          viaOrigen: true,
          viaDestino: true,
          incidentes: true,
          rondas: true,
          eventos: true,
        },
      });
    } catch (error) {
      movimientoError.error('Error al obtener movimientos', { error });
      throw new Error('Error al obtener movimientos');
    }
  }

  // ===================== Cambios de estado =====================

  static async cambiarEstadoMovimiento(
    id: number,
    nuevoEstado: EstadoMovimiento,
    opciones: { operadorId?: number; razon?: string; forzar?: boolean; actorId?: number } = {}
  ) {
    const { operadorId, razon, forzar = false, actorId } = opciones;

    return prisma.$transaction(async (tx) => {
      const mov = await tx.movimiento.findUnique({
        where: { id },
        include: { empresa: true, localidad: true, rondas: true, viaDestino: true },
      });
      if (!mov) throw new Error(`No se encontró movimiento ${id}`);

      // Validar transición si no es "forzar"
      if (!forzar) {
        const transiciones: Record<EstadoMovimiento, EstadoMovimiento[]> = {
          SOLICITADO: [EstadoMovimiento.EN_PROCESO, EstadoMovimiento.DETENIDO, EstadoMovimiento.CANCELADO],
          EN_PROCESO: [EstadoMovimiento.DETENIDO, EstadoMovimiento.CONCLUIDO, EstadoMovimiento.CANCELADO],
          DETENIDO:   [EstadoMovimiento.EN_PROCESO, EstadoMovimiento.CANCELADO, EstadoMovimiento.CONCLUIDO],
          ESPERA:     [EstadoMovimiento.EN_PROCESO, EstadoMovimiento.CANCELADO],
          MODIFICADO: [EstadoMovimiento.SOLICITADO, EstadoMovimiento.CANCELADO],
          CONCLUIDO:  [],
          CANCELADO:  [],
        };
        const permitidos = transiciones[mov.estado] ?? [];
        if (!permitidos.includes(nuevoEstado)) {
          throw new Error(`Transición inválida: ${mov.estado} → ${nuevoEstado}. Permitidas: ${permitidos.join(', ')}`);
        }
      }

      // Si vamos a EN_PROCESO y es servicio → intentar ruteo + sección + slot
      if (nuevoEstado === EstadoMovimiento.EN_PROCESO) {
        const tipo = this.decidirTipoRonda({ lavado: mov.lavado, torno: mov.torno });
        if (tipo !== TipoRonda.NATURAL) {
          const servicio = tipo === TipoRonda.LAVADO ? TipoServicio.LAVADO : TipoRonda.TORNO;

          const routed = await this.autoRuteoYOCuparServicio(tx, {
            id: mov.id,
            localidadId: mov.localidadId,
            viaDestinoId: mov.viaDestinoId ?? null,
            lavado: mov.lavado,
            torno: mov.torno,
          });

          if (!routed.ok) {
            // Sin secciones libres: quedar en ESPERA (no tocar rondas, no lanzar error)
            const espera = await tx.movimiento.update({
              where: { id },
              data: { estado: EstadoMovimiento.ESPERA, updatedAt: new Date() },
              include: { rondas: true, viaDestino: { select: { id: true } } },
            });
            await this.logEvento(tx, id, EventoTipo.EDITADO, actorId ?? operadorId ?? mov.creadoPorId, {
              motivo: 'Sin secciones libres (servicio)',
            });
            return espera;
          }

          // Tomar slot de servicio (capacidad)
          await this.ocuparSlotServicio(tx, mov.localidadId, TipoServicio[servicio as any] ?? TipoServicio.LAVADO, id);
        }
      }

      // Mutación base
      const ahora = new Date();
      const data: Prisma.MovimientoUpdateInput = { estado: nuevoEstado, updatedAt: ahora };
      if (nuevoEstado === EstadoMovimiento.EN_PROCESO) {
        Object.assign(data, { fechaInicio: ahora, fechaPausa: null, incidenteGlobal: false });
        if (operadorId) Object.assign(data, { operadorId });
      }
      if (nuevoEstado === EstadoMovimiento.DETENIDO) {
        Object.assign(data, { fechaPausa: ahora, instrucciones: razon ?? undefined });
      }
      if (nuevoEstado === EstadoMovimiento.CONCLUIDO) {
        Object.assign(data, { fechaFin: ahora, finalizado: true, incidenteGlobal: false, entregado: true });
      }
      if (nuevoEstado === EstadoMovimiento.CANCELADO) {
        Object.assign(data, {
          fechaFin: ahora,
          finalizado: true,
          incidenteGlobal: false,
          instrucciones: razon ? `CANCELADO: ${razon}` : undefined,
        });
      }

      const after = await tx.movimiento.update({
        where: { id },
        data,
        include: { rondas: true, viaDestino: { select: { id: true } } },
      });

      // Si concluye/cancela → liberar ocupaciones (slot servicio + vía) y cerrar rondas (SIN llamar a métodos con $transaction interno)
      if (nuevoEstado === EstadoMovimiento.CONCLUIDO || nuevoEstado === EstadoMovimiento.CANCELADO) {
        const tipo = this.decidirTipoRonda({ lavado: after.lavado ?? false, torno: after.torno ?? false });
        if (tipo !== TipoRonda.NATURAL) {
          await this.liberarSlotServicio(tx, id);
        }
        if (after.viaDestino?.id) {
          await ViaModel.liberarMovimientoDeSeccion(after.viaDestino.id, id, tx);
        }

        if (after.rondas?.length) {
          // cerrar filas de ronda del movimiento dentro de ESTE tx
          await tx.ronda.updateMany({ where: { movimientoId: id, concluido: false }, data: { concluido: true, updatedAt: new Date() } });
          await RondaModel.recomponerRondasLocalidad(after.localidadId, tx);
        }
      }

      // Auditoría
      const participantes = {
        empresaId: after.empresaId,
        clienteId: after.clienteId,
        supervisorId: after.supervisorId,
        coordinadorId: after.coordinadorId,
        operadorId: operadorId ?? after.operadorId,
      };
      const tipoEvento: EventoTipo =
        nuevoEstado === EstadoMovimiento.EN_PROCESO ? EventoTipo.INICIADO :
        nuevoEstado === EstadoMovimiento.DETENIDO   ? EventoTipo.PAUSADO  :
        nuevoEstado === EstadoMovimiento.CONCLUIDO  ? EventoTipo.CONCLUIDO:
        nuevoEstado === EstadoMovimiento.CANCELADO  ? EventoTipo.CANCELADO:
                                                      EventoTipo.EDITADO;

      await this.logEvento(tx, id, tipoEvento, actorId ?? operadorId ?? after.operadorId ?? after.creadoPorId, participantes);

      return after;
    });
  }

  // Azúcar para UX
  static async iniciarMovimiento(id: number, operadorId: number, actorId?: number) {
    return this.cambiarEstadoMovimiento(id, EstadoMovimiento.EN_PROCESO, { operadorId, actorId });
  }
  static async pausarMovimiento(id: number, actorId?: number, razon?: string) {
    return this.cambiarEstadoMovimiento(id, EstadoMovimiento.DETENIDO, { actorId, razon });
  }
  static async reanudarMovimiento(id: number, actorId?: number) {
    return this.cambiarEstadoMovimiento(id, EstadoMovimiento.EN_PROCESO, { actorId });
  }
  static async finalizarMovimiento(id: number, actorId?: number) {
    return this.cambiarEstadoMovimiento(id, EstadoMovimiento.CONCLUIDO, { actorId });
  }
  static async cancelarMovimiento(id: number, razonCancelacion: string, actorId?: number) {
    return this.cambiarEstadoMovimiento(id, EstadoMovimiento.CANCELADO, { actorId, razon: razonCancelacion });
  }

  // ===================== Creación / Edición =====================

  /**
   * Crea un movimiento y, DESPUÉS de commit, lo encola en Ronda.
   * (Evita transacciones anidadas que causan P2003 en FK de Ronda.movimientoId)
   */
  static async nuevoMovimiento(data: {
    empresaId: number;
    creadoPorId: number;
    localidadId: number;
    viaOrigenId: number;
    viaDestinoId?: number;
    numeroSeccion?: number;
    locomotiveNumber: number;
    prioridad?: Prioridad;
    tipoMovimiento?: 'MD_TRABAJANDO' | 'REMOLCADA';
    estado?: EstadoMovimiento;
    fechaSolicitud?: Date;
    instrucciones?: string;
    clienteId?: number;
    supervisorId?: number;
    coordinadorId?: number;
    operadorId?: number;
    lavado?: boolean;
    torno?: boolean;
    posicionCabina?: 'Sin_Solicitar' | 'DENTRO' | 'AFUERA';
    posicionChimenea?: 'Sin_Solicitar' | 'DENTRO' | 'AFUERA';
    direccionEmpuje?: 'Sin_Solicitar' | 'EMPUJAR' | 'JALAR';
  }) {
    // 1) Hacemos todo lo que toca al movimiento/vías dentro del tx
    const { movimiento, tipoRondaFinal } = await prisma.$transaction(async (tx) => {
      const payload: any = { ...data };
      payload.prioridad = payload.prioridad ?? Prioridad.BAJA;
      payload.estado = payload.estado ?? EstadoMovimiento.SOLICITADO;
      payload.posicionCabina = payload.posicionCabina || 'Sin_Solicitar';
      payload.posicionChimenea = payload.posicionChimenea || 'Sin_Solicitar';
      payload.direccionEmpuje = payload.direccionEmpuje || 'Sin_Solicitar';
      Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

      const mv = await tx.movimiento.create({
        data: payload,
        include: { empresa: true, localidad: true, viaDestino: true },
      });

      // evento CREADO
      await this.logEvento(tx, mv.id, EventoTipo.CREADO, mv.creadoPorId, {
        empresaId: mv.empresaId,
        clienteId: mv.clienteId,
        supervisorId: mv.supervisorId,
        coordinadorId: mv.coordinadorId,
        operadorId: mv.operadorId,
      });

      // servicio → intentar ocupar sección; si no hay, pasa a ESPERA
      let estadoPost = mv.estado;
      const tipo = this.decidirTipoRonda({ lavado: mv.lavado, torno: mv.torno });
      if (tipo !== TipoRonda.NATURAL) {
        try {
          const routed = await this.autoRuteoYOCuparServicio(tx, {
            id: mv.id,
            localidadId: mv.localidadId,
            viaDestinoId: mv.viaDestinoId ?? null,
            lavado: mv.lavado,
            torno: mv.torno,
          });
          if (!routed.ok) {
            estadoPost = EstadoMovimiento.ESPERA;
          }
        } catch (e) {
          if (e instanceof ViaConflictError) {
            estadoPost = EstadoMovimiento.ESPERA;
          } else {
            throw e;
          }
        }
      } else if (mv.viaDestino?.id && data.numeroSeccion !== undefined) {
        // NATURAL con número de sección pedido
        try {
          await this.intentarOcuparViaDestino(mv.viaDestino.id, mv.id, data.numeroSeccion ?? null, tx);
        } catch (e) {
          if (e instanceof ViaConflictError) estadoPost = EstadoMovimiento.ESPERA;
          else throw e;
        }
      }

      if (estadoPost !== mv.estado) {
        await tx.movimiento.update({ where: { id: mv.id }, data: { estado: estadoPost } });
      }

      return { movimiento: mv, tipoRondaFinal: tipo };
    });

    // 2) Fuera del tx (ya commit), ENCOLAR en Ronda usando el cliente global (evita P2003)
    await RondaModel.generarRondaParaMovimiento({
      movimientoId: movimiento.id,
      empresaId: movimiento.empresaId,
      localidadId: movimiento.localidadId,
      prioridad: movimiento.prioridad,
      tipoRonda: tipoRondaFinal,
    });

    // 3) Devolver con relaciones
    return prisma.movimiento.findUnique({
      where: { id: movimiento.id },
      include: { empresa: true, localidad: true, viaDestino: true, rondas: true },
    });
  }

  /**
   * Edita un movimiento. Si cambia viaDestinoId → liberar anterior y ocupar nueva (transaccional).
   * Si cambian flags lavado/torno → reubicar en colas por tipoRonda (re-encolar DESPUÉS de commit).
   */
  static async editarMovimiento(
    id: number,
    data: {
      empresaId?: number;
      creadoPorId?: number;
      clienteId?: number;
      supervisorId?: number;
      coordinadorId?: number;
      operadorId?: number;
      localidadId?: number;
      viaOrigenId?: number;
      viaDestinoId?: number;
      numeroSeccion?: number;
      locomotiveNumber?: number;
      lavado?: boolean;
      torno?: boolean;
      prioridad?: Prioridad;
      tipoMovimiento?: 'MD_TRABAJANDO' | 'REMOLCADA';
      estado?: EstadoMovimiento;
      fechaSolicitud?: Date;
      fechaInicio?: Date;
      fechaFin?: Date;
      fechaPausa?: Date;
      instrucciones?: string;
      incidenteGlobal?: boolean;
      finalizado?: boolean;
      posicionCabina?: 'Sin_Solicitar' | 'DENTRO' | 'AFUERA';
      posicionChimenea?: 'Sin_Solicitar' | 'DENTRO' | 'AFUERA';
      direccionEmpuje?: 'Sin_Solicitar' | 'EMPUJAR' | 'JALAR';
      actorId?: number; // quién edita (para evento)
    }
  ) {
    // Campos para re-encolar tras commit (evita transacción anidada)
    let requeue:
      | { movimientoId: number; empresaId: number; localidadId: number; prioridad: Prioridad; tipoRonda: TipoRonda }
      | null = null;

    const movUpd = await prisma.$transaction(async (tx) => {
      const actual = await tx.movimiento.findUnique({
        where: { id },
        include: { rondas: true },
      });
      if (!actual) throw new Error(`No existe movimiento ${id}`);

      const beforeTipo = this.decidirTipoRonda({ lavado: actual.lavado ?? false, torno: actual.torno ?? false });

      const upd: any = { ...data };
      upd.posicionCabina = upd.posicionCabina || 'Sin_Solicitar';
      upd.posicionChimenea = upd.posicionChimenea || 'Sin_Solicitar';
      upd.direccionEmpuje = upd.direccionEmpuje || 'Sin_Solicitar';
      Object.keys(upd).forEach((k) => upd[k] === undefined && delete upd[k]);

      // Actualiza sin tocar vías aún
      const movUpdInner = await tx.movimiento.update({ where: { id }, data: upd });

      // Si cambió viaDestino → liberar anterior y ocupar nueva
      if (data.viaDestinoId && data.viaDestinoId !== actual.viaDestinoId) {
        if (actual.viaDestinoId) {
          await ViaModel.liberarMovimientoDeSeccion(actual.viaDestinoId, id, tx);
        }
        try {
          await this.intentarOcuparViaDestino(data.viaDestinoId, id, data.numeroSeccion ?? null, tx);
        } catch (e) {
          if (e instanceof ViaConflictError) {
            await tx.movimiento.update({ where: { id }, data: { estado: EstadoMovimiento.ESPERA } });
          } else {
            throw e;
          }
        }
      }

      // Si cambiaron flags de servicio → reubicar en colas
      const afterTipo = this.decidirTipoRonda({ lavado: movUpdInner.lavado, torno: movUpdInner.torno });
      if (afterTipo !== beforeTipo) {
        // Eliminar filas actuales dentro del tx y marcar requeue para después
        await tx.ronda.deleteMany({ where: { movimientoId: id, concluido: false } });
        requeue = {
          movimientoId: id,
          empresaId: movUpdInner.empresaId,
          localidadId: movUpdInner.localidadId,
          prioridad: movUpdInner.prioridad,
          tipoRonda: afterTipo,
        };
      }

      // Evento EDITADO
      await this.logEvento(tx, id, EventoTipo.EDITADO, data.actorId, {
        cambios: Object.keys(data),
      });

      return movUpdInner;
    });

    // Re-encolar fuera del tx (evita nested $transaction)
    if (requeue) {
      await RondaModel.generarRondaParaMovimiento(requeue);
    }

    return movUpd;
  }

  static async eliminarMovimiento(id: number) {
    try {
      return await prisma.movimiento.delete({ where: { id } });
    } catch (error) {
      movimientoError.error('Error al eliminar movimiento', { id, error });
      throw new Error('Error al eliminar movimiento');
    }
  }

  static async cambiarPrioridad(id: number, prioridad: Prioridad) {
    // Igual: borrar filas dentro del tx y re-encolar tras commit
    let requeue:
      | { movimientoId: number; empresaId: number; localidadId: number; prioridad: Prioridad; tipoRonda: TipoRonda }
      | null = null;

    const act = await prisma.$transaction(async (tx) => {
      const mov = await tx.movimiento.findUnique({
        where: { id },
        select: { id: true, empresaId: true, localidadId: true, prioridad: true, lavado: true, torno: true },
      });
      if (!mov) throw new Error(`No se encontró movimiento ${id}`);
      if (mov.prioridad === prioridad) return mov;

      // Actualiza prioridad
      const updated = await tx.movimiento.update({
        where: { id },
        data: { prioridad },
        select: { id: true, empresaId: true, localidadId: true, prioridad: true, lavado: true, torno: true },
      });

      // Quitar de rondas dentro del tx
      await tx.ronda.deleteMany({ where: { movimientoId: id, concluido: false } });

      const tipo = updated.lavado ? TipoRonda.LAVADO : updated.torno ? TipoRonda.TORNO : TipoRonda.NATURAL;
      requeue = {
        movimientoId: id,
        empresaId: updated.empresaId,
        localidadId: updated.localidadId,
        prioridad: updated.prioridad,
        tipoRonda: tipo,
      };

      return updated;
    });

    if (requeue) {
      await RondaModel.generarRondaParaMovimiento(requeue);
    }

    return act;
  }

  // ===================== Listados =====================

  private static includeMov() {
    return {
      empresa: true,
      creadoPor: true,
      localidad: true,
      viaOrigen: true,
      viaDestino: true,
      incidentes: true,
      rondas: true,
    } as const;
  }

  static async obtenerMovimientosPendientes() {
    try {
      return await prisma.movimiento.findMany({
        where: { estado: { in: [EstadoMovimiento.SOLICITADO, EstadoMovimiento.EN_PROCESO, EstadoMovimiento.DETENIDO] } },
        include: this.includeMov(),
      });
    } catch (error) {
      movimientoError.error('Error al obtener movimientos pendientes', { error });
      throw new Error('Error al obtener movimientos pendientes');
    }
  }

  static async obtenerMovimientosPendientesPorEmpresa(empresaId: number) {
    try {
      return await prisma.movimiento.findMany({
        where: {
          empresaId,
          estado: { in: [EstadoMovimiento.SOLICITADO, EstadoMovimiento.EN_PROCESO, EstadoMovimiento.DETENIDO] },
        },
        include: this.includeMov(),
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      movimientoError.error('Error al obtener movimientos pendientes por empresa', { empresaId, error });
      throw new Error('Error al obtener movimientos pendientes por empresa');
    }
  }

  static async obtenerTodosLosMovimientos() {
    try {
      return await prisma.movimiento.findMany({
        include: this.includeMov(),
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      movimientoError.error('Error al obtener todos los movimientos', { error });
      throw new Error('Error al obtener todos los movimientos');
    }
  }

  static async obtenerMovimientosPorEmpresa(empresaId: number) {
    try {
      return await prisma.movimiento.findMany({
        where: { empresaId },
        include: this.includeMov(),
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      movimientoError.error('Error al obtener movimientos por empresa', { empresaId, error });
      throw new Error('Error al obtener movimientos por empresa');
    }
  }

  static async obtenerMovimientosPendientesPorLocalidad(localidadId: number) {
    try {
      return await prisma.movimiento.findMany({
        where: {
          localidadId,
          estado: { in: [EstadoMovimiento.SOLICITADO, EstadoMovimiento.EN_PROCESO, EstadoMovimiento.DETENIDO] },
        },
        include: this.includeMov(),
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      movimientoError.error('Error al obtener movimientos pendientes por localidad', { localidadId, error });
      throw new Error('Error al obtener movimientos pendientes por localidad');
    }
  }

  static async obtenerTodosMovimientosPorLocalidad(localidadId: number) {
    try {
      return await prisma.movimiento.findMany({
        where: { localidadId },
        include: this.includeMov(),
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      movimientoError.error('Error al obtener todos los movimientos por localidad', { localidadId, error });
      throw new Error('Error al obtener todos los movimientos por localidad');
    }
  }

  static async obtenerMovimientosPorLocalidadEmpresa(localidadId: number, empresaId: number) {
    try {
      return await prisma.movimiento.findMany({
        where: { localidadId, empresaId },
        include: this.includeMov(),
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      movimientoError.error('Error al obtener movimientos por localidad y empresa', { localidadId, empresaId, error });
      throw new Error('Error al obtener movimientos por localidad y empresa');
    }
  }

  static async obtenerMovimientosPorEmpresaYLocalidad(empresaId: number, localidadId: number) {
    try {
      return await prisma.movimiento.findMany({
        where: { empresaId, localidadId },
        include: this.includeMov(),
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      movimientoError.error('Error al obtener movimientos por empresa y localidad', { empresaId, localidadId, error });
      throw new Error('Error al obtener movimientos por empresa y localidad');
    }
  }

  static async obtenerMovimientosNoConcluidosPorEmpresaYLocalidad(empresaId: number, localidadId: number) {
    try {
      return await prisma.movimiento.findMany({
        where: { empresaId, localidadId, finalizado: false },
        include: this.includeMov(),
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      movimientoError.error('Error al obtener movimientos no concluidos por empresa y localidad', {
        empresaId, localidadId, error,
      });
      throw new Error('Error al obtener movimientos no concluidos por empresa y localidad');
    }
  }

  static async obtenerInfoPorRonda(rondaId: number) {
    try {
      const info = await RondaModel.obtenerInfoPorRonda(rondaId);
      if (!info) throw new Error(`Ronda con ID ${rondaId} no encontrada`);
      return {
        rondaId: info.rondaId,
        rondaNumero: info.rondaNumero,
        orden: info.orden,
        concluido: info.concluido,
        empresa: info.empresa,
        movimiento: {
          id: info.movimiento.id,
          viaOrigen: info.movimiento.viaOrigen,
          viaDestino: info.movimiento.viaDestino,
          lavado: info.movimiento.lavado,
          torno: info.movimiento.torno,
        },
      };
    } catch (error) {
      movimientoError.error('Error al obtener info de ronda desde MovimientoModel', { rondaId, error });
      throw new Error('Error al obtener información de la ronda');
    }
  }
}
