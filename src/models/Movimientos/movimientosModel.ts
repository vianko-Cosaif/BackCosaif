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
          actorId: actorId ?? 0, // si no hay actor, 0 ó crea un usuario “sistema”
          tipo,
          participantes: participantes ? participantes as any : undefined,
        },
      });
    } catch (e) {
      // Nunca abortar por auditoría; solo loggear
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

  /** Calcula capacidad de servicio: usa tabla; si capacidad=0 o no hay fila → suma de secciones en vías de servicio */
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

    const tot = await tx.seccionVia.count({
      where: { viaId: { in: vias.map(v => v.id) } },
    });
    return tot; // fallback: #secciones = capacidad
  }

  /** Ocupaciones activas de un servicio en la localidad */
  private static contarOcupacionesServicio(
    localidadId: number,
    servicio: TipoServicio,
    tx: Prisma.TransactionClient = prisma
  ) {
    return tx.ocupacionServicio.count({
      where: { localidadId, servicio, activo: true },
    });
  }

  /** Ocupa slot de servicio si hay cupo; idempotente por movimiento */
  private static async ocuparSlotServicio(
    tx: Prisma.TransactionClient,
    localidadId: number,
    servicio: TipoServicio,
    movimientoId: number,
  ) {
    // Ya tiene slot?
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
  private static async liberarSlotServicio(
    tx: Prisma.TransactionClient,
    movimientoId: number,
  ) {
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

  /** Intenta ocupar vía (vía simple o primera sección libre) */
  private static async intentarOcuparViaDestino(
    viaId: number,
    movimientoId: number,
    numeroSeccion: number | null | undefined,
    tx: Prisma.TransactionClient
  ) {
    await ViaModel.asignarMovimientoASeccion(viaId, numeroSeccion ?? null, movimientoId, tx);
  }

  /** Intento de auto‐ruteo a vías de servicio + ocupar una sección */
  private static async autoRuteoYOCuparServicio(
    tx: Prisma.TransactionClient,
    mov: { id: number; localidadId: number; viaDestinoId: number | null; lavado?: boolean | null; torno?: boolean | null }
  ): Promise<{ ok: boolean; viaDestinoId?: number }> {
    const servicio =
      mov.lavado ? TipoServicio.LAVADO :
      mov.torno ? TipoServicio.TORNO :
      null;

    if (!servicio) return { ok: !!mov.viaDestinoId, viaDestinoId: mov.viaDestinoId ?? undefined };

    // Si ya tiene viaDestino, intentar ocupar ahí
    if (mov.viaDestinoId) {
      try {
        const secc = await this.primeraSeccionLibre(mov.viaDestinoId, tx);
        if (secc == null) throw new ViaConflictError('Sin secciones libres en vía destino.');
        await this.intentarOcuparViaDestino(mov.viaDestinoId, mov.id, secc, tx);
        return { ok: true, viaDestinoId: mov.viaDestinoId };
      } catch {
        // seguimos a buscar otra
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
          DETENIDO: [EstadoMovimiento.EN_PROCESO, EstadoMovimiento.CANCELADO, EstadoMovimiento.CONCLUIDO],
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

      // Antes de mutar: si vamos a EN_PROCESO y es servicio → validar slot + (auto)ocupar sección
      if (nuevoEstado === EstadoMovimiento.EN_PROCESO) {
        const tipo = this.decidirTipoRonda({ lavado: mov.lavado, torno: mov.torno });
        if (tipo !== TipoRonda.NATURAL) {
          const servicio = tipo === TipoRonda.LAVADO ? TipoServicio.LAVADO : TipoServicio.TORNO;

          // Auto-ruteo a vía de servicio + ocupar sección (si no se había ocupado)
          const routed = await this.autoRuteoYOCuparServicio(tx, {
            id: mov.id,
            localidadId: mov.localidadId,
            viaDestinoId: mov.viaDestinoId ?? null,
            lavado: mov.lavado,
            torno: mov.torno,
          });

          if (!routed.ok) {
            // no hay sección libre en ninguna vía de servicio → marcar ESPERA
            await tx.movimiento.update({ where: { id }, data: { estado: EstadoMovimiento.ESPERA } });
            await this.logEvento(tx, id, EventoTipo.EDITADO, actorId, { motivo: 'Sin secciones libres (servicio)' });
            throw new ViaConflictError('Sin secciones libres en vías de servicio.');
          }

          // Tomar slot de servicio (capacidad)
          await this.ocuparSlotServicio(tx, mov.localidadId, servicio, id);
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

      // Si concluye/cancela → liberar ocupaciones (slot servicio + vía)
      if (nuevoEstado === EstadoMovimiento.CONCLUIDO || nuevoEstado === EstadoMovimiento.CANCELADO) {
        const tipo = this.decidirTipoRonda({ lavado: after.lavado ?? false, torno: after.torno ?? false });
        if (tipo !== TipoRonda.NATURAL) {
          await this.liberarSlotServicio(tx, id);
        }
        if (after.viaDestino?.id) {
          await ViaModel.liberarMovimientoDeSeccion(after.viaDestino.id, id, tx);
        }

        // Cerrar/limpiar rondas de este movimiento (todas)
        if (after.rondas?.length) {
          await RondaModel.marcarRondasDeMovimientoComoConcluidas?.(id)
            ?? tx.ronda.updateMany({ where: { movimientoId: id, concluido: false }, data: { concluido: true } });
          // Compactar
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
   * Crea un movimiento:
   * - decide tipoRonda,
   * - intenta auto‐ruteo a vía de servicio (si lavado/torno) y ocupar sección,
   * - si no hay espacio → estado ESPERA,
   * - encola en la ronda del tipo correspondiente.
   * - registra evento CREADO con participantes.
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
    return prisma.$transaction(async (tx) => {
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

      // registrar evento CREADO
      await this.logEvento(tx, mv.id, EventoTipo.CREADO, mv.creadoPorId, {
        empresaId: mv.empresaId,
        clienteId: mv.clienteId,
        supervisorId: mv.supervisorId,
        coordinadorId: mv.coordinadorId,
        operadorId: mv.operadorId,
      });

      // Si es servicio, intentar ocupar sección en vía de servicio (o en viaDestino si viene)
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
            estadoPost = EstadoMovimiento.ESPERA; // no había sección libre
          }
        } catch (e) {
          if (e instanceof ViaConflictError) {
            estadoPost = EstadoMovimiento.ESPERA;
          } else {
            throw e;
          }
        }
      } else if (mv.viaDestino?.id && data.numeroSeccion !== undefined) {
        // NATURAL con número de sección pedido explícito
        try {
          await this.intentarOcuparViaDestino(mv.viaDestino.id, mv.id, data.numeroSeccion ?? null, tx);
        } catch (e) {
          if (e instanceof ViaConflictError) estadoPost = EstadoMovimiento.ESPERA;
          else throw e;
        }
      }

      // si cambió estado por falta de espacio
      if (estadoPost !== mv.estado) {
        await tx.movimiento.update({ where: { id: mv.id }, data: { estado: estadoPost } });
      }

      // Encolar en la cola adecuada
      await (RondaModel.generarRondaParaMovimiento as any)({
        movimientoId: mv.id,
        empresaId: mv.empresaId,
        localidadId: mv.localidadId,
        prioridad: mv.prioridad,
        tipoRonda: tipo,
      });

      return tx.movimiento.findUnique({
        where: { id: mv.id },
        include: { empresa: true, localidad: true, viaDestino: true, rondas: true },
      });
    });
  }

  /**
   * Edita un movimiento. Si cambia viaDestinoId → liberar anterior y ocupar nueva (transaccional).
   * Si cambian flags lavado/torno → reubicar en colas por tipoRonda.
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
    return prisma.$transaction(async (tx) => {
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
      const movUpd = await tx.movimiento.update({ where: { id }, data: upd });

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
      const afterTipo = this.decidirTipoRonda({ lavado: movUpd.lavado, torno: movUpd.torno });
      if (afterTipo !== beforeTipo) {
        // Eliminar de todas las rondas actuales y re‐encolar en nueva cola
        if ((RondaModel.removerDeTodasLasRondas as any)) {
          await (RondaModel.removerDeTodasLasRondas as any)(id, tx);
        } else {
          await tx.ronda.deleteMany({ where: { movimientoId: id, concluido: false } });
        }
        await (RondaModel.generarRondaParaMovimiento as any)({
          movimientoId: id,
          empresaId: movUpd.empresaId,
          localidadId: movUpd.localidadId,
          prioridad: movUpd.prioridad,
          tipoRonda: afterTipo,
        });
      }

      // Evento EDITADO
      await this.logEvento(tx, id, EventoTipo.EDITADO, data.actorId, {
        cambios: Object.keys(data),
      });

      return movUpd;
    });
  }

  // ===================== Otras consultas existentes =====================

  static async eliminarMovimiento(id: number) {
    try {
      return await prisma.movimiento.delete({ where: { id } });
    } catch (error) {
      movimientoError.error('Error al eliminar movimiento', { id, error });
      throw new Error('Error al eliminar movimiento');
    }
  }

  static async cambiarPrioridad(id: number, prioridad: Prioridad) {
    try {
      const movimiento = await prisma.movimiento.findUnique({
        where: { id },
        include: { rondas: true },
      });
      if (!movimiento) throw new Error(`No se encontró movimiento ${id}`);
      if (movimiento.prioridad === prioridad) return movimiento;

      const act = await prisma.movimiento.update({
        where: { id },
        data: { prioridad },
      });

      // Re‐ordenar en su cola actual
      await (RondaModel.generarRondaParaMovimiento as any)({
        movimientoId: id,
        empresaId: act.empresaId,
        localidadId: act.localidadId,
        prioridad,
        tipoRonda: this.decidirTipoRonda({ lavado: act.lavado, torno: act.torno }),
      });

      return act;
    } catch (error) {
      movimientoError.error('Error al cambiar prioridad', { id, prioridad, error });
      throw new Error('Error al cambiar prioridad del movimiento');
    }
  }

  // (el resto de métodos de listados los dejo igual salvo cambiar `ronda` → `rondas`)
  static async obtenerMovimientosPendientes() {
    try {
      return await prisma.movimiento.findMany({
        where: { estado: { in: [EstadoMovimiento.SOLICITADO, EstadoMovimiento.EN_PROCESO, EstadoMovimiento.DETENIDO, EstadoMovimiento.CONCLUIDO] } },
        include: { empresa: true, creadoPor: true, localidad: true, viaOrigen: true, viaDestino: true, incidentes: true, rondas: true },
      });
    } catch (error) {
      movimientoError.error('Error al obtener movimientos pendientes', { error });
      throw new Error('Error al obtener movimientos pendientes');
    }
  }
  // ====== Helpers de include para queries ======
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
