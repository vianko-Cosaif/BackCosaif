/**
 * IncidenteModel.ts
 *
 * Modelo de acceso a datos para la entidad Incidente.
 *
 * Este modulo encapsula la logica de interaccion con la base de datos relacionada a incidentes.
 * Utiliza Prisma ORM como capa de acceso y proporciona metodos estaticos para las operaciones
 * CRUD basicas: obtener, crear, editar y eliminar incidentes.
 *
 * Caracteristicas principales:
 * - Gestion de imagenes con optimizacion automatica
 * - Reorganizacion automatica de rondas cuando se reporta un incidente
 * - Sistema de timeout para resolucion de incidentes
 * - Integracion con MovimientoModel para cambios de estado
 *
 * Dependencias:
 * - Prisma Client: para interaccion con la base de datos
 * - RondaModel: para reorganizacion de rondas
 * - incidenteError: logger dedicado a errores del modelo Incidente
 */

import { PrismaClient, Incidente } from '@prisma/client';
import { incidenteError } from './incidente.logger';
import { RondaModel } from '../Movimientos/Ronda/RondaModel';
import { NotificadorFCM } from '../../services/NotificadorFCM';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import admin from 'firebase-admin';

const prisma = new PrismaClient();

/**
 * Configuracion para el manejo de imagenes
 */
const IMAGEN_CONFIG = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 85,
  format: 'jpeg' as const,
  carpetaBase: path.join(process.cwd(), 'uploads', 'incidentes')
};

/**
 * Configuracion de timeouts para incidentes
 */
const TIMEOUT_CONFIG = {
  verificacion: 10 * 60 * 1000, // 10 minutos en ms
  bloqueo: 5 * 60 * 1000,       // 5 minutos en ms
};

export class IncidenteModel {
  /**
   * Obtener todos los incidentes con sus relaciones.
   * Incluye informacion del movimiento y usuario asociado.
   *
   * @returns Lista de incidentes con relaciones incluidas
   * @throws Error si ocurre un fallo durante la consulta
   */
  static async obtenerIncidentes() {
    try {
      return await prisma.incidente.findMany({
        include: {
          movimiento: {
            include: {
              empresa: true,
              localidad: true,
              viaOrigen: true,
              viaDestino: true,
              ronda: true
            }
          },
          usuario: {
            select: {
              id: true,
              nombre: true,
              email: true,
              empresa: true
            }
          }
        },
        orderBy: {
          fechaInicio: 'desc'
        }
      });
    } catch (error) {
      incidenteError.error('Error al obtener incidentes', { error });
      throw new Error('Error al obtener incidentes');
    }
  }

  /**
   * Editar un incidente existente.
   * Permite actualizar descripci�n, estado e im�genes.
   * Si se cierra el incidente, reactiva el movimiento asociado.
   *
   * @param id - ID del incidente a editar
   * @param data - Datos a actualizar
   * @returns Incidente actualizado con sus relaciones
   * @throws Error si el incidente no existe o hay error en la actualizaci�n
   */
  static async editarIncidente(id: number, data: {
    descripcion?: string;
    estado?: 'ABIERTO' | 'CERRADO';
    imagenes?: Buffer[];
  }) {
    try {
      // Obtener el incidente actual
      const incidenteActual = await prisma.incidente.findUnique({
        where: { id },
        include: {
          movimiento: true
        }
      });

      if (!incidenteActual) {
        throw new Error(`No se encontr� incidente con id ${id}`);
      }

      const estadoAnterior = incidenteActual.estado;

      // Preparar datos de actualizaci�n
      const updateData: any = {};
      
      if (data.descripcion !== undefined) {
        updateData.descripcion = data.descripcion;
      }
      
      if (data.estado !== undefined) {
        updateData.estado = data.estado;
        
        // Si se est� cerrando el incidente, registrar fecha
        if (data.estado === 'CERRADO' && incidenteActual.estado === 'ABIERTO') {
          updateData.fechaFin = new Date();
        }
      }

      // Procesar nuevas im�genes si se proporcionan
      if (data.imagenes?.length) {
        // Eliminar im�genes anteriores del servidor
        const imagenesAnteriores = [
          incidenteActual.imagen1,
          incidenteActual.imagen2,
          incidenteActual.imagen3,
          incidenteActual.imagen4
        ];

        for (const rutaImagen of imagenesAnteriores) {
          if (rutaImagen) {
            try {
              const rutaCompleta = path.join(IMAGEN_CONFIG.carpetaBase, rutaImagen);
              await fs.unlink(rutaCompleta);
            } catch (error) {
              incidenteError.warn('No se pudo eliminar imagen anterior', { rutaImagen, error });
            }
          }
        }

        // Procesar y guardar nuevas im�genes
        const rutasImagenes = await this.procesarImagenes(data.imagenes, id);
        
        updateData.imagen1 = rutasImagenes[0] ?? null;
        updateData.imagen2 = rutasImagenes[1] ?? null;
        updateData.imagen3 = rutasImagenes[2] ?? null;
        updateData.imagen4 = rutasImagenes[3] ?? null;
      }

      // Actualizar el incidente
      const incidenteActualizado = await prisma.incidente.update({
        where: { id },
        data: updateData,
        include: {
          movimiento: {
            include: {
              empresa: true,
              localidad: true,
              viaOrigen: true,
              viaDestino: true,
              ronda: true
            }
          },
          usuario: {
            select: {
              id: true,
              nombre: true,
              email: true,
              empresa: true
            }
          }
        }
      });

      // Si se cerr� el incidente, reactivar el movimiento
      if (data.estado === 'CERRADO' && incidenteActual.estado === 'ABIERTO') {
        await prisma.movimiento.update({
          where: { id: incidenteActual.movimientoId },
          data: {
            estado: 'EN_PROCESO',
            fechaPausa: null,
            incidenteGlobal: false
          }
        });

        incidenteError.info('Movimiento reactivado tras cierre de incidente', {
          incidenteId: id,
          movimientoId: incidenteActual.movimientoId
        });
      }

      // Notificar cambio de estado si aplica
      if (data.estado && data.estado !== estadoAnterior) {
        await this.notificarCambioEstado(incidenteActualizado, estadoAnterior);
      }

      incidenteError.info('Incidente actualizado correctamente', {
        incidenteId: id,
        cambios: Object.keys(updateData),
        estadoAnterior,
        estadoNuevo: incidenteActualizado.estado
      });

      return incidenteActualizado;

    } catch (error) {
      incidenteError.error('Error al editar incidente', { id, data, error });
      throw new Error('Error al editar incidente');
    }
  }

  /**
   * Obtener incidentes filtrados por estado.
   *
   * @param estado - Estado del incidente (ABIERTO o CERRADO)
   * @returns Lista de incidentes filtrados por estado
   * @throws Error si ocurre un fallo durante la consulta
   */
  static async obtenerIncidentesPorEstado(estado: 'ABIERTO' | 'CERRADO') {
    try {
      return await prisma.incidente.findMany({
        where: { estado },
        include: {
          movimiento: {
            include: {
              empresa: true,
              localidad: true,
              viaOrigen: true,
              viaDestino: true,
              ronda: true
            }
          },
          usuario: {
            select: {
              id: true,
              nombre: true,
              email: true,
              empresa: true
            }
          }
        },
        orderBy: {
          fechaInicio: 'desc'
        }
      });
    } catch (error) {
      incidenteError.error('Error al obtener incidentes por estado', { estado, error });
      throw new Error('Error al obtener incidentes por estado');
    }
  }

  /**
   * Obtener incidentes por movimiento.
   *
   * @param movimientoId - ID del movimiento
   * @returns Lista de incidentes del movimiento especificado
   * @throws Error si ocurre un fallo durante la consulta
   */
  static async obtenerIncidentesPorMovimiento(movimientoId: number) {
    try {
      return await prisma.incidente.findMany({
        where: { movimientoId },
        include: {
          usuario: {
            select: {
              id: true,
              nombre: true,
              email: true,
              empresa: true
            }
          }
        },
        orderBy: {
          fechaInicio: 'desc'
        }
      });
    } catch (error) {
      incidenteError.error('Error al obtener incidentes por movimiento', { movimientoId, error });
      throw new Error('Error al obtener incidentes por movimiento');
    }
  }

  /**
   * Procesa y optimiza las imagenes del incidente.
   * Crea carpetas organizadas por fecha para optimizar busquedas.
   *
   * @private
   * @param imagenes - Array de buffers de imagenes
   * @param incidenteId - ID del incidente para nombrar archivos
   * @returns Array de rutas donde se guardaron las imagenes
   */
  private static async procesarImagenes(imagenes: Buffer[], incidenteId: number): Promise<string[]> {
    try {
      const fecha = new Date();
      const ano = fecha.getFullYear();
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const dia = String(fecha.getDate()).padStart(2, '0');
      
      // Crear estructura de carpetas: uploads/incidentes/2025/01/15/
      const carpetaDestino = path.join(IMAGEN_CONFIG.carpetaBase, String(ano), mes, dia);
      
      // Asegurar que existe la carpeta
      await fs.mkdir(carpetaDestino, { recursive: true });
      
      const rutasGuardadas: string[] = [];
      
      for (let i = 0; i < imagenes.length && i < 4; i++) {
        const nombreArchivo = `incidente_${incidenteId}_imagen_${i + 1}_${Date.now()}.${IMAGEN_CONFIG.format}`;
        const rutaCompleta = path.join(carpetaDestino, nombreArchivo);
        
        // Optimizar imagen con Sharp
        await sharp(imagenes[i])
          .resize(IMAGEN_CONFIG.maxWidth, IMAGEN_CONFIG.maxHeight, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ 
            quality: IMAGEN_CONFIG.quality,
            progressive: true,
            mozjpeg: true
          })
          .toFile(rutaCompleta);
        
        // Guardar ruta relativa desde la carpeta base
        const rutaRelativa = path.relative(IMAGEN_CONFIG.carpetaBase, rutaCompleta);
        rutasGuardadas.push(rutaRelativa);
      }
      
      incidenteError.info('Imagenes procesadas y guardadas', {
        incidenteId,
        cantidad: rutasGuardadas.length,
        carpeta: carpetaDestino
      });
      
      return rutasGuardadas;
    } catch (error) {
      incidenteError.error('Error al procesar imagenes', { incidenteId, error });
      throw new Error('Error al procesar imagenes del incidente');
    }
  }

  /**
   * Reorganiza las rondas cuando se reporta un incidente en un movimiento espec�fico.
   * REGLA ALTA o RONDA 1: El movimiento se mueve al final de la misma ronda.
   * REGLA BAJA (RONDA 2+): El movimiento se mueve a la siguiente ronda con efecto domin�.
   * Despu�s, renumera todas las rondas de la localidad, reubicando solo los movimientos
   * de la empresa que gener� el incidente seg�n su nueva secuencia.
   *
   * @private
   * @param empresaId - ID de la empresa afectada
   * @param localidadId - ID de la localidad donde ocurre el incidente
   * @param movimientoId - ID del movimiento espec�fico con incidente
   */
  public static async reorganizarRondasPorIncidente(
    empresaId: number,
    localidadId: number,
    movimientoId: number
  ) {
    try {
      const rondaMovimiento = await prisma.ronda.findFirst({
        where: { movimientoId, localidadId, concluido: false },
        include: { movimiento: true }
      });

      if (!rondaMovimiento) {
        incidenteError.info('No se encontr� ronda para el movimiento', {
          movimientoId,
          empresaId,
          localidadId
        });
        return;
      }

      const rondaOriginal = rondaMovimiento.rondaNumero;
      const { prioridad } = rondaMovimiento.movimiento || {};

      const unicaEmpresa = await this.esUnicaEmpresaEnRondas(empresaId, localidadId);

      incidenteError.info('Iniciando reorganizaci�n por incidente', {
        movimientoId,
        empresaId,
        rondaOriginal,
        localidadId,
        prioridad,
        unicaEmpresa
      });

      // === L�GICA ACTUALIZADA ===
      if (prioridad === 'ALTA') {
        // Siempre mover a ronda 1 al final
        await this.moverMovimientoARonda1AlFinal(
          localidadId,
          empresaId,
          movimientoId
        );
      } else if (prioridad === 'BAJA') {
        if (unicaEmpresa) {
          // Si es la �nica empresa, solo se reordena internamente
          await this.moverAlFinalDeLaRonda(
            empresaId,
            localidadId,
            movimientoId,
            rondaMovimiento
          );
        } else {
          // Aplica efecto domin� normal
          await this.aplicarEfectoDomino(
            empresaId,
            localidadId,
            movimientoId,
            rondaMovimiento
          );
        }
      }

      // Finalmente, renumera todas las rondas de la localidad,
      // reubicando solo los movimientos de la empresa implicada
      await this.reorganizarRondasPorEmpresa(empresaId, localidadId);

    } catch (error) {
      incidenteError.error('Error al reorganizar rondas por incidente', {
        empresaId,
        localidadId,
        movimientoId,
        error
      });
      throw new Error('Error al reorganizar rondas por incidente');
    }
  }

  /**
   * Mueve un movimiento al final de su ronda actual
   */
  private static async moverAlFinalDeLaRonda(
    empresaId: number,
    localidadId: number,
    movimientoId: number,
    rondaMovimiento: any
  ) {
    const rondaNumero = rondaMovimiento.rondaNumero;
    const ordenOriginal = rondaMovimiento.orden;

    await prisma.$transaction(async (tx) => {
      const movimientosRonda = await tx.ronda.findMany({
        where: { localidadId, rondaNumero, concluido: false },
        orderBy: { orden: 'asc' }
      });

      const nuevosOrdenes: { id: number; orden: number }[] = [];
      let next = 1;

      for (const mov of movimientosRonda) {
        if (mov.id !== rondaMovimiento.id) {
          nuevosOrdenes.push({ id: mov.id, orden: next++ });
        }
      }
      nuevosOrdenes.push({ id: rondaMovimiento.id, orden: next });

      for (const { id, orden } of nuevosOrdenes) {
        await tx.ronda.update({ where: { id }, data: { orden } });
      }

      incidenteError.info('Movimiento movido al final de la ronda', {
        movimientoId,
        rondaNumero,
        posicionOriginal: ordenOriginal,
        posicionFinal: next
      });
    });
  }

  /**
   * Aplica efecto domin� para prioridad BAJA:
   * - Incrementa +1 rondaNumero para todos los movimientos afectados
   * - Luego renumera �rdenes en cada ronda 1�N
   */
  private static async aplicarEfectoDomino(
    empresaId: number,
    localidadId: number,
    movimientoId: number,
    rondaMovimiento: any
  ) {
    const desde = rondaMovimiento.rondaNumero;

    await prisma.$transaction(async (tx) => {
      incidenteError.info('Iniciando efecto domin�', {
        movimientoId,
        empresaId,
        desdeRonda: desde
      });

      await tx.ronda.updateMany({
        where: {
          localidadId,
          rondaNumero: { gte: desde },
          concluido: false
        },
        data: { rondaNumero: { increment: 1 } }
      });

      const { _max } = await tx.ronda.aggregate({
        where: { localidadId, concluido: false },
        _max: { rondaNumero: true }
      });
      const hasta = _max.rondaNumero ?? desde + 1;

      for (let r = desde; r <= hasta; r++) {
        await this.reorganizarOrdenEnRonda(tx, localidadId, r);
      }

      incidenteError.info('Efecto domin� completado', {
        movimientoId,
        empresaId,
        rondasAjustadas: hasta - desde + 1
      });
    });
  }

  /**
   * Renumera los �rdenes en una ronda para que queden 1,2,3�
   */
  private static async reorganizarOrdenEnRonda(
    tx: any,
    localidadId: number,
    rondaNumero: number
  ) {
    const movs = await tx.ronda.findMany({
      where: { localidadId, rondaNumero, concluido: false },
      orderBy: { orden: 'asc' }
    });
    for (let i = 0; i < movs.length; i++) {
      const correcto = i + 1;
      if (movs[i].orden !== correcto) {
        await tx.ronda.update({
          where: { id: movs[i].id },
          data: { orden: correcto }
        });
      }
    }
  }

  /**
   * Reorganiza todas las rondas de una localidad, pero solo reubica
   * los movimientos de la empresa indicada en la "secuencia" que les
   * corresponde, y renumera el resto para que queden consecutivos.
   */
  private static async reorganizarRondasPorEmpresa(
    empresaId: number,
    localidadId: number
  ) {
    await prisma.$transaction(async (tx) => {
      // 1) Traer todas las rondas activas
      const rondas = await tx.ronda.findMany({
        where: { localidadId, concluido: false },
        distinct: ['rondaNumero'],
        orderBy: { rondaNumero: 'asc' }
      });

      // 2) Secuencia de movimientos de la empresa
      const empMovs = await tx.ronda.findMany({
        where: { localidadId, empresaId, concluido: false },
        select: { id: true, rondaNumero: true },
        orderBy: { rondaNumero: 'asc' }
      });
      const seqMap = new Map<number, { id: number; seq: number }>();
      empMovs.forEach((m, idx) =>
        seqMap.set(m.rondaNumero, { id: m.id, seq: idx + 1 })
      );

      // 3) Para cada ronda, reconstruir el orden
      for (const { rondaNumero } of rondas) {
        const all = await tx.ronda.findMany({
          where: { localidadId, rondaNumero, concluido: false },
          orderBy: { orden: 'asc' }
        });

        const entry = seqMap.get(rondaNumero);
        if (!entry) {
          // Solo renumera consecutivo
          for (let i = 0; i < all.length; i++) {
            if (all[i].orden !== i + 1) {
              await tx.ronda.update({
                where: { id: all[i].id },
                data: { orden: i + 1 }
              });
            }
          }
          continue;
        }

        // Separar y reinsertar en su slot
        const others = all.filter(m => m.id !== entry.id);
        const target = Math.min(entry.seq, others.length + 1);
        const newOrder = [
          ...others.slice(0, target - 1).map(m => m.id),
          entry.id,
          ...others.slice(target - 1).map(m => m.id)
        ];

        for (let i = 0; i < newOrder.length; i++) {
          await tx.ronda.update({
            where: { id: newOrder[i] },
            data: { orden: i + 1 }
          });
        }
      }
    });
  }

  /**
   * Busca todas las rondas posteriores donde el movimiento debe insertarse.
   * 
   * @private
   * @param localidadId - ID de la localidad
   * @param empresaId - ID de la empresa
   * @param rondaActual - Numero de ronda actual del movimiento
   * @returns Array de inserciones a realizar
   */
  private static async buscarRondasParaInsertar(
    localidadId: number, 
    empresaId: number, 
    rondaActual: number
  ): Promise<Array<{
    rondaNumero: number;
    posicionInsercion: number;
    hayMovimientosEmpresa: boolean;
  }>> {
    try {
      const inserciones: Array<{
        rondaNumero: number;
        posicionInsercion: number;
        hayMovimientosEmpresa: boolean;
      }> = [];

      // Empezar a buscar desde la ronda siguiente
      let rondaBuscada = rondaActual + 1;

      while (true) {
        // Verificar si la empresa ya participa en esta ronda
        const movimientosEmpresaEnRonda = await prisma.ronda.findMany({
          where: {
            localidadId,
            rondaNumero: rondaBuscada,
            empresaId,
            concluido: false
          },
          orderBy: { orden: 'asc' }
        });

        if (movimientosEmpresaEnRonda.length === 0) {
          // Empresa NO participa en esta ronda! Se agrega aqui y termina
          
          // Contar total de movimientos en esta ronda para agregar al final
          const totalMovimientosEnRonda = await prisma.ronda.count({
            where: {
              localidadId,
              rondaNumero: rondaBuscada,
              concluido: false
            }
          });

          inserciones.push({
            rondaNumero: rondaBuscada,
            posicionInsercion: totalMovimientosEnRonda + 1,
            hayMovimientosEmpresa: false
          });

          // Terminar busqueda
          break;
        } else {
          // Empresa SI participa, insertar al inicio y continuar
          inserciones.push({
            rondaNumero: rondaBuscada,
            posicionInsercion: 1, // Se inserta al inicio, recorriendo los demas
            hayMovimientosEmpresa: true
          });

          // Continuar buscando en la siguiente ronda
          rondaBuscada++;

          // Proteccion contra bucle infinito
          if (rondaBuscada > rondaActual + 100) {
            incidenteError.warn('Busqueda de rondas alcanzo limite', {
              localidadId, empresaId, rondaActual, rondaBuscada
            });
            break;
          }
        }
      }

      // Si no se encontro ninguna ronda libre, crear una nueva al final
      if (inserciones.length === 0) {
        const ultimaRonda = await prisma.ronda.findFirst({
          where: { localidadId },
          orderBy: { rondaNumero: 'desc' },
          select: { rondaNumero: true }
        });

        const nuevaRondaNumero = (ultimaRonda?.rondaNumero || 0) + 1;

        inserciones.push({
          rondaNumero: nuevaRondaNumero,
          posicionInsercion: 1,
          hayMovimientosEmpresa: false
        });
      }

      return inserciones;

    } catch (error) {
      incidenteError.error('Error al buscar rondas para insertar', { 
        localidadId, empresaId, rondaActual, error 
      });
      
      // Fallback: crear nueva ronda al final
      const ultimaRonda = await prisma.ronda.findFirst({
        where: { localidadId },
        orderBy: { rondaNumero: 'desc' },
        select: { rondaNumero: true }
      });

      return [{
        rondaNumero: (ultimaRonda?.rondaNumero || 0) + 1,
        posicionInsercion: 1,
        hayMovimientosEmpresa: false
      }];
    }
  }

  private static async moverMovimientoARonda1AlFinal(
    localidadId: number,
    empresaId: number,
    movimientoId: number
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      /* ronda actual del movimiento (si la hay) */
      const rondaActual = await tx.ronda.findFirst({
        where: { movimientoId }
      });
      if (rondaActual) {
        /* 1) quitarlo de su ronda original y compactar */
        await tx.ronda.delete({ where: { id: rondaActual.id } });
        await tx.ronda.updateMany({
          where: {
            localidadId,
            rondaNumero: rondaActual.rondaNumero,
            orden: { gt: rondaActual.orden }
          },
          data: { orden: { decrement: 1 } }
        });
      }

      /* 2) calcular el �ltimo orden de la ronda 1 en esa localidad */
      const ultimoOrden = await tx.ronda.count({
        where: { localidadId, rondaNumero: 1 }
      });

      /* 3) insertar al final de la ronda 1 */
      await tx.ronda.create({
        data: {
          movimientoId,
          empresaId,
          localidadId,
          rondaNumero: 1,
          orden: ultimoOrden + 1
        }
      });
    });
  }

  /**
   * Crear un nuevo incidente y reorganizar rondas automaticamente.
   * Tambien cambia el estado del movimiento a DETENIDO.
   *
   * @param data - Datos del incidente a crear
   * @returns Objeto del incidente creado
   * @throws Error si ocurre un fallo durante la creacion
   */
  static async crearIncidente(data: {
    descripcion: string;
    movimientoId: number;
    usuarioId: number;
    imagenes?: Buffer[];
  }) {
    try {
      /* - 1. verificar movimiento ------------------------------- */
      const movimiento = await prisma.movimiento.findUnique({
        where: { id: data.movimientoId },
        include: { empresa: true, localidad: true, ronda: true }
      });
      if (!movimiento) {
        throw new Error(`No se encontro movimiento con id ${data.movimientoId}`);
      }

      /* - 2. crear el incidente (obtenemos id) ------------------- */
      const nuevoIncidente = await prisma.incidente.create({
        data: {
          descripcion: data.descripcion,
          movimientoId: data.movimientoId,
          usuarioId: data.usuarioId,
          estado: 'ABIERTO'
        }
      });

      /* - 3. procesar im�genes, si existen ----------------------- */
      let rutasImagenes: string[] = [];
      if (data.imagenes?.length) {
        rutasImagenes = await this.procesarImagenes(
          data.imagenes,
          nuevoIncidente.id
        );
      }

      const incidenteConImagenes = await prisma.incidente.update({
        where: { id: nuevoIncidente.id },
        data: {
          imagen1: rutasImagenes[0] ?? null,
          imagen2: rutasImagenes[1] ?? null,
          imagen3: rutasImagenes[2] ?? null,
          imagen4: rutasImagenes[3] ?? null
        },
        include: {
          movimiento: {
            include: {
              empresa: true,
              localidad: true,
              ronda: true
            }
          },
          usuario: {
            select: { id: true, nombre: true, email: true, empresa: true }
          }
        }
      });

      /* - 4. detener el movimiento ------------------------------- */
      await prisma.movimiento.update({
        where: { id: data.movimientoId },
        data: {
          estado: 'DETENIDO',
          fechaPausa: new Date(),
          incidenteGlobal: true
        }
      });

      /* - 5. mover o reorganizar la ronda seg�n prioridad -------- */
      if (movimiento.prioridad === 'ALTA') {
        await this.moverMovimientoARonda1AlFinal(
          movimiento.localidadId,
          movimiento.empresaId,
          data.movimientoId
        );
      } else if (movimiento.ronda) {
        await this.reorganizarRondasPorIncidente(
          movimiento.empresaId,
          movimiento.localidadId,
          data.movimientoId
        );
      }

      /* - 6. notificar (FCM) ------------------------------------- */
      await NotificadorFCM.notificarNuevoIncidente(incidenteConImagenes);

      incidenteError.info('Incidente creado y procesado', {
        incidenteId: nuevoIncidente.id,
        movimientoId: data.movimientoId,
        empresaId: movimiento.empresaId,
        localidadId: movimiento.localidadId,
        imagenesGuardadas: rutasImagenes.length
      });

      return incidenteConImagenes;
    } catch (error) {
      incidenteError.error('Error al crear incidente', { data, error });
      throw new Error('Error al crear incidente');
    }
  }

  /**
   * Notificar cambio de estado de un incidente (ABIERTO ? CERRADO o actualizaci�n)
   */
  static async notificarCambioEstado(
    incidente: Incidente,
    estadoAnterior: string
  ): Promise<void> {
    try {
      const movimiento = await prisma.movimiento.findUnique({
        where: { id: incidente.movimientoId },
        include: { empresa: true, localidad: true }
      });
      if (!movimiento) return;

      // usuarios relevantes
      const ids: number[] = [];
      if (movimiento.clienteId)     ids.push(movimiento.clienteId);
      if (movimiento.supervisorId)  ids.push(movimiento.supervisorId);
      if (movimiento.coordinadorId) ids.push(movimiento.coordinadorId);
      if (movimiento.operadorId)    ids.push(movimiento.operadorId);
      if (movimiento.creadoPorId)   ids.push(movimiento.creadoPorId);

      const usuariosConTokens = await prisma.usuario.findMany({
        where: { id: { in: ids }, activo: true },
        include: { fcmTokens: true }
      });
      const tokens = usuariosConTokens.flatMap(u => u.fcmTokens.map(t => t.token));
      if (tokens.length === 0) return;

      const empresaNombre   = movimiento.empresa?.nombre   ?? 'Sin Empresa';
      const descripcion     = incidente.descripcion.length > 50
        ? incidente.descripcion.slice(0, 50) + '�'
        : incidente.descripcion;

      const titulo =
        incidente.estado === 'CERRADO'
          ? '? INCIDENTE RESUELTO'
          : '?? INCIDENTE ACTUALIZADO';

      const mensaje = {
        notification: {
          title: titulo,
          body:  `ID #${incidente.id} � ${empresaNombre} � Loco ${movimiento.locomotiveNumber}`
        },
        data: {
          pantalla:      'Incidente',
          incidenteId:   String(incidente.id),
          movimientoId:  String(incidente.movimientoId),
          empresa:       empresaNombre,
          locomotora:    String(movimiento.locomotiveNumber),
          estadoAnterior,
          estadoNuevo:   incidente.estado,
          descripcion,
          tipo:          'cambio_estado_incidente',
          fecha:         new Date().toISOString()
        },
        tokens
      };

      await admin.messaging().sendEachForMulticast(mensaje);
    } catch (error) {
      console.error('? Error enviando notificaci�n de cambio de estado:', error);
      throw error;
    }
  }

  /**
   * Eliminar un incidente por su ID.
   * Tambien elimina las imagenes asociadas del servidor.
   *
   * @param id - ID del incidente a eliminar
   * @returns Objeto del incidente eliminado
   * @throws Error si ocurre un fallo durante la eliminacion
   */
  static async eliminarIncidente(id: number) {
    try {
      // Obtener el incidente con sus imagenes antes de eliminarlo
      const incidente = await prisma.incidente.findUnique({
        where: { id }
      });

      if (!incidente) {
        throw new Error(`No se encontro incidente con id ${id}`);
      }

      // Eliminar imagenes del servidor
      const imagenes = [incidente.imagen1, incidente.imagen2, incidente.imagen3, incidente.imagen4];
      
      for (const rutaImagen of imagenes) {
        if (rutaImagen) {
          try {
            const rutaCompleta = path.join(IMAGEN_CONFIG.carpetaBase, rutaImagen);
            await fs.unlink(rutaCompleta);
          } catch (error) {
            incidenteError.warn('No se pudo eliminar imagen', { rutaImagen, error });
          }
        }
      }

      // Eliminar el incidente de la base de datos
      const incidenteEliminado = await prisma.incidente.delete({
        where: { id }
      });

      incidenteError.info('Incidente eliminado correctamente', {
        incidenteId: id,
        imagenesEliminadas: imagenes.filter(Boolean).length
      });

      return incidenteEliminado;
    } catch (error) {
      incidenteError.error('Error al eliminar incidente', { id, error });
      throw new Error('Error al eliminar incidente');
    }
  }

  /**
   * Cerrar automaticamente incidentes que han superado el tiempo de verificacion.
   * Se ejecuta periodicamente para mantener el flujo de trabajo.
   *
   * @returns Numero de incidentes cerrados automaticamente
   */
  static async cerrarIncidentesVencidos() {
    try {
      const tiempoLimite = new Date(Date.now() - (TIMEOUT_CONFIG.verificacion + TIMEOUT_CONFIG.bloqueo));
      
      const incidentesVencidos = await prisma.incidente.findMany({
        where: {
          estado: 'ABIERTO',
          fechaInicio: {
            lte: tiempoLimite
          }
        }
      });

      let incidentesCerrados = 0;

      for (const incidente of incidentesVencidos) {
        await this.editarIncidente(incidente.id, { estado: 'CERRADO' });
        incidentesCerrados++;
      }

      if (incidentesCerrados > 0) {
        incidenteError.info('Incidentes cerrados automaticamente por timeout', {
          cantidad: incidentesCerrados,
          tiempoLimite: tiempoLimite.toISOString()
        });
      }

      return incidentesCerrados;
    } catch (error) {
      incidenteError.error('Error al cerrar incidentes vencidos', { error });
      throw new Error('Error al cerrar incidentes vencidos');
    }
  }

  /**
   * Obtener la ruta completa de una imagen de incidente.
   *
   * @param rutaRelativa - Ruta relativa de la imagen
   * @returns Ruta completa del archivo
   */
  static obtenerRutaCompletaImagen(rutaRelativa: string): string {
    return path.join(IMAGEN_CONFIG.carpetaBase, rutaRelativa);
  }

  /**
   * Verificar si un incidente esta en periodo de verificacion.
   *
   * @param incidenteId - ID del incidente
   * @returns Informacion sobre el estado del periodo de verificacion
   */
  static async verificarPeriodoVerificacion(incidenteId: number) {
    try {
      const incidente = await prisma.incidente.findUnique({
        where: { id: incidenteId },
        select: {
          id: true,
          estado: true,
          fechaInicio: true
        }
      });

      if (!incidente) {
        throw new Error(`No se encontro incidente con id ${incidenteId}`);
      }

      if (incidente.estado === 'CERRADO') {
        return {
          enPeriodoVerificacion: false,
          enPeriodoBloqueo: false,
          tiempoRestante: 0,
          mensaje: 'Incidente ya esta cerrado'
        };
      }

      const ahora = new Date();
      const tiempoTranscurrido = ahora.getTime() - incidente.fechaInicio.getTime();
      
      const enPeriodoVerificacion = tiempoTranscurrido <= TIMEOUT_CONFIG.verificacion;
      const enPeriodoBloqueo = tiempoTranscurrido > TIMEOUT_CONFIG.verificacion && 
                              tiempoTranscurrido <= (TIMEOUT_CONFIG.verificacion + TIMEOUT_CONFIG.bloqueo);

      let tiempoRestante = 0;
      let mensaje = '';

      if (enPeriodoVerificacion) {
        tiempoRestante = TIMEOUT_CONFIG.verificacion - tiempoTranscurrido;
        mensaje = 'Periodo de verificacion activo';
      } else if (enPeriodoBloqueo) {
        tiempoRestante = (TIMEOUT_CONFIG.verificacion + TIMEOUT_CONFIG.bloqueo) - tiempoTranscurrido;
        mensaje = 'Periodo de bloqueo activo';
      } else {
        mensaje = 'Incidente puede ser cerrado';
      }

      return {
        enPeriodoVerificacion,
        enPeriodoBloqueo,
        tiempoRestante: Math.max(0, tiempoRestante),
        mensaje
      };
    } catch (error) {
      incidenteError.error('Error al verificar periodo de verificacion', { incidenteId, error });
      throw new Error('Error al verificar periodo de verificacion');
    }
  }

  static async obtenerIncidentePorId(id: number) {
    const incidente = await prisma.incidente.findUnique({
      where: { id },
      include: {
        movimiento: {
          include: {
            empresa:   true,
            localidad: true,
            viaOrigen: true,
            viaDestino:true,
            ronda:     true
          }
        },
        usuario: {
          select: {
            id:     true,
            nombre: true,
            email:  true,
            empresa:true
          }
        }
      }
    });

    if (!incidente) {
      throw new Error(`No existe incidente con id ${id}`);
    }

    // Solo las rutas relativas que vienen guardadas en BD
    const rutasRelativas = [
      incidente.imagen1,
      incidente.imagen2,
      incidente.imagen3,
      incidente.imagen4
    ].filter(Boolean) as string[];

    return {
      id:           incidente.id,
      descripcion:  incidente.descripcion,
      estado:       incidente.estado,
      fechaInicio:  incidente.fechaInicio,
      fechaFin:     incidente.fechaFin,
      usuario:      incidente.usuario,
      movimiento:   incidente.movimiento,
      imagenes:     rutasRelativas
    };
  }

  /**
   * 1. Obtener todos los incidentes paginados
   */
  static async obtenerIncidentesPaginados(page = 1, pageSize = 20) {
    try {
      const skip = (page - 1) * pageSize;
      const [incidentes, total] = await Promise.all([
        prisma.incidente.findMany({
          include: { movimiento: true, usuario: true },
          orderBy: { fechaInicio: 'desc' },
          skip,
          take: pageSize,
        }),
        prisma.incidente.count()
      ]);
      return {
        data: incidentes,
        meta: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize)
        }
      };
    } catch (error) {
      incidenteError.error('Error al obtener incidentes paginados', { error });
      throw new Error('Error al obtener incidentes');
    }
  }

  /**
   * 2. Obtener incidentes a partir de una localidad (pag.)
   */
  static async obtenerIncidentesPorLocalidad(
    localidadId: number,
    page = 1,
    pageSize = 20
  ) {
    try {
      const skip = (page - 1) * pageSize;
      const [incidentes, total] = await Promise.all([
        prisma.incidente.findMany({
          where: { movimiento: { localidadId } },
          include: { movimiento: true, usuario: true },
          orderBy: { fechaInicio: 'desc' },
          skip,
          take: pageSize,
        }),
        prisma.incidente.count({
          where: { movimiento: { localidadId } }
        })
      ]);
      return {
        data: incidentes,
        meta: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize)
        }
      };
    } catch (error) {
      incidenteError.error('Error al obtener incidentes por localidad', { localidadId, error });
      throw new Error('Error al obtener incidentes por localidad');
    }
  }

  /**
   * 3. Obtener incidentes de una empresa Y de una localidad (pag.)
   */
  static async obtenerIncidentesPorEmpresaYLocalidad(
    empresaId: number,
    localidadId: number,
    page = 1,
    pageSize = 20
  ) {
    try {
      const skip = (page - 1) * pageSize;
      const [incidentes, total] = await Promise.all([
        prisma.incidente.findMany({
          where: {
            movimiento: {
              empresaId,
              localidadId
            }
          },
          include: { movimiento: true, usuario: true },
          orderBy: { fechaInicio: 'desc' },
          skip,
          take: pageSize,
        }),
        prisma.incidente.count({
          where: {
            movimiento: {
              empresaId,
              localidadId
            }
          }
        })
      ]);
      return {
        data: incidentes,
        meta: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize)
        }
      };
    } catch (error) {
      incidenteError.error('Error al obtener incidentes por empresa y localidad', { empresaId, localidadId, error });
      throw new Error('Error al obtener incidentes por empresa y localidad');
    }
  }

  private static async esUnicaEmpresaEnRondas(
    empresaId: number,
    localidadId: number
  ): Promise<boolean> {
    const empresas = await prisma.ronda.findMany({
      where: {
        localidadId,
        concluido: false
      },
      select: {
        empresaId: true
      },
      distinct: ['empresaId']
    });

    return empresas.length === 1 && empresas[0].empresaId === empresaId;
  }

  /**
   * 4. Obtener incidentes de una empresa (pag.)
   */
  static async obtenerIncidentesPorEmpresa(
    empresaId: number,
    page = 1,
    pageSize = 20
  ) {
    try {
      const skip = (page - 1) * pageSize;
      const [incidentes, total] = await Promise.all([
        prisma.incidente.findMany({
          where: { movimiento: { empresaId } },
          include: { movimiento: true, usuario: true },
          orderBy: { fechaInicio: 'desc' },
          skip,
          take: pageSize,
        }),
        prisma.incidente.count({
          where: { movimiento: { empresaId } }
        })
      ]);
      return {
        data: incidentes,
        meta: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize)
        }
      };
    } catch (error) {
      incidenteError.error('Error al obtener incidentes por empresa', { empresaId, error });
      throw new Error('Error al obtener incidentes por empresa');
    }
  }

  static async continuarMovimiento(id: number, comentario: string): Promise<Incidente> {
    const incidente = await prisma.incidente.findUnique({
      where: { id },
      include: {
        movimiento: {
          include: {
            empresa: true,
            localidad: true,
          }
        }
      }
    });

    if (!incidente) throw new Error('Incidente no encontrado');
    if (incidente.estado === 'CERRADO') throw new Error('Incidente ya cerrado');

    // Cerrar incidente
    const actualizado = await prisma.incidente.update({
      where: { id },
      data: {
        estado: 'CERRADO',
        fechaFin: new Date()
      },
      include: { movimiento: true }
    });

    // ? Reorganiza rondas si aplica (una sola empresa en las rondas)
    await this.reorganizarSiEsEmpresaUnica(incidente.movimiento);

    // ? Buscar usuarios activos de la empresa en la localidad
    const usuarios = await prisma.usuario.findMany({
      where: {
        localidadId: incidente.movimiento.localidadId,
        empresaId: incidente.movimiento.empresaId,
        activo: true,
        rol: { in: ['CLIENTE', 'SUPERVISOR', 'OPERADOR', 'COORDINADOR', 'MAQUINISTA'] }
      },
      include: { fcmTokens: true }
    });

    const tokens = usuarios.flatMap(u => u.fcmTokens.map(t => t.token));
    if (tokens.length > 0) {
      const empresa = incidente.movimiento.empresa?.nombre ?? 'Sin Empresa';
      const loco = incidente.movimiento.locomotiveNumber;

      await admin.messaging().sendEachForMulticast({
        notification: {
          title: '? INCIDENTE RESUELTO',
          body: `Incidente resuelto con un comentario del cliente: "${comentario}"`
        },
        data: {
          pantalla: 'Incidente',
          incidenteId: String(actualizado.id),
          movimientoId: String(incidente.movimientoId),
          empresa,
          locomotora: String(loco),
          tipo: 'incidente_resuelto_cliente',
          timestamp: new Date().toISOString()
        },
        tokens
      });
    }

    return actualizado;
  }

  static async reorganizarSiEsEmpresaUnica(movimiento: any) {
    if (!movimiento || !movimiento.empresaId || !movimiento.localidadId) {
      return;
    }

    const esUnica = await this.esUnicaEmpresaEnRondas(
      movimiento.empresaId,
      movimiento.localidadId
    );

    if (esUnica && movimiento.id) {
      // Si es la �nica empresa, reorganizar sus rondas internamente
      await this.reorganizarRondasPorIncidente(
        movimiento.empresaId,
        movimiento.localidadId,
        movimiento.id
      );
    }
  }
}