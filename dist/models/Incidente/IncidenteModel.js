"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidenteModel = void 0;
const client_1 = require("@prisma/client");
const incidente_logger_1 = require("./incidente.logger");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const sharp_1 = __importDefault(require("sharp"));
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const prisma = new client_1.PrismaClient();
/**
 * Configuracion para el manejo de imagenes
 */
const IMAGEN_CONFIG = {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 85,
    format: 'jpeg',
    carpetaBase: path_1.default.join(process.cwd(), 'uploads', 'incidentes')
};
/**
 * Configuracion de timeouts para incidentes
 */
const TIMEOUT_CONFIG = {
    verificacion: 10 * 60 * 1000, // 10 minutos en ms
    bloqueo: 5 * 60 * 1000, // 5 minutos en ms
};
class IncidenteModel {
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
        }
        catch (error) {
            incidente_logger_1.incidenteError.error('Error al obtener incidentes', { error });
            throw new Error('Error al obtener incidentes');
        }
    }
    /**
     * Editar un incidente existente.
     * Permite actualizar descripción, estado e imágenes.
     * Si se cierra el incidente, reactiva el movimiento asociado.
     *
     * @param id - ID del incidente a editar
     * @param data - Datos a actualizar
     * @returns Incidente actualizado con sus relaciones
     * @throws Error si el incidente no existe o hay error en la actualización
     */
    static async editarIncidente(id, data) {
        try {
            return await prisma.$transaction(async (tx) => {
                // Obtener el incidente actual con bloqueo para evitar condiciones de carrera
                const incidenteActual = await tx.incidente.findUnique({
                    where: { id },
                    include: {
                        movimiento: true
                    }
                });
                if (!incidenteActual) {
                    throw new Error(`No se encontró incidente con id ${id}`);
                }
                const estadoAnterior = incidenteActual.estado;
                // Validar cambio de estado
                if (data.estado === 'ABIERTO' && estadoAnterior === 'CERRADO') {
                    throw new Error('No se puede reabrir un incidente cerrado');
                }
                // Preparar datos de actualización
                const updateData = {};
                if (data.descripcion !== undefined) {
                    updateData.descripcion = data.descripcion;
                }
                if (data.estado !== undefined && data.estado !== estadoAnterior) {
                    updateData.estado = data.estado;
                    // Si se está cerrando el incidente, registrar fecha
                    if (data.estado === 'CERRADO') {
                        updateData.fechaFin = new Date();
                    }
                }
                // Procesar nuevas imágenes si se proporcionan
                if (data.imagenes?.length) {
                    // Eliminar imágenes anteriores del servidor
                    const imagenesAnteriores = [
                        incidenteActual.imagen1,
                        incidenteActual.imagen2,
                        incidenteActual.imagen3,
                        incidenteActual.imagen4
                    ].filter(Boolean);
                    for (const rutaImagen of imagenesAnteriores) {
                        if (rutaImagen) {
                            try {
                                const rutaCompleta = path_1.default.join(IMAGEN_CONFIG.carpetaBase, rutaImagen);
                                await promises_1.default.unlink(rutaCompleta);
                            }
                            catch (error) {
                                incidente_logger_1.incidenteError.warn('No se pudo eliminar imagen anterior', { rutaImagen, error });
                            }
                        }
                    }
                    // Procesar y guardar nuevas imágenes
                    const rutasImagenes = await this.procesarImagenes(data.imagenes, id);
                    updateData.imagen1 = rutasImagenes[0] ?? null;
                    updateData.imagen2 = rutasImagenes[1] ?? null;
                    updateData.imagen3 = rutasImagenes[2] ?? null;
                    updateData.imagen4 = rutasImagenes[3] ?? null;
                }
                // Actualizar el incidente
                const incidenteActualizado = await tx.incidente.update({
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
                // Si se cerró el incidente, reactivar el movimiento
                if (data.estado === 'CERRADO' && estadoAnterior === 'ABIERTO') {
                    await tx.movimiento.update({
                        where: { id: incidenteActual.movimientoId },
                        data: {
                            estado: 'EN_PROCESO',
                            fechaPausa: null,
                            incidenteGlobal: false
                        }
                    });
                    incidente_logger_1.incidenteError.info('Movimiento reactivado tras cierre de incidente', {
                        incidenteId: id,
                        movimientoId: incidenteActual.movimientoId
                    });
                }
                return incidenteActualizado;
            });
        }
        catch (error) {
            incidente_logger_1.incidenteError.error('Error al editar incidente', { id, data, error });
            throw error instanceof Error ? error : new Error('Error al editar incidente');
        }
    }
    /**
     * Crear un nuevo incidente y reorganizar rondas automáticamente.
     * También cambia el estado del movimiento a DETENIDO.
     *
     * @param data - Datos del incidente a crear
     * @returns Objeto del incidente creado
     * @throws Error si ocurre un fallo durante la creación
     */
    static async crearIncidente(data) {
        try {
            return await prisma.$transaction(async (tx) => {
                // 1. Verificar movimiento con bloqueo
                const movimiento = await tx.movimiento.findUnique({
                    where: { id: data.movimientoId },
                    include: {
                        empresa: true,
                        localidad: true,
                        ronda: {
                            where: { concluido: false }
                        }
                    }
                });
                if (!movimiento) {
                    throw new Error(`No se encontró movimiento con id ${data.movimientoId}`);
                }
                // Verificar que no exista ya un incidente abierto
                const incidenteExistente = await tx.incidente.findFirst({
                    where: {
                        movimientoId: data.movimientoId,
                        estado: 'ABIERTO'
                    }
                });
                if (incidenteExistente) {
                    throw new Error('Ya existe un incidente abierto para este movimiento');
                }
                // 2. Crear el incidente
                const nuevoIncidente = await tx.incidente.create({
                    data: {
                        descripcion: data.descripcion,
                        movimientoId: data.movimientoId,
                        usuarioId: data.usuarioId,
                        estado: 'ABIERTO'
                    }
                });
                // 3. Procesar imágenes si existen
                let updateImagenes = {};
                if (data.imagenes?.length) {
                    const rutasImagenes = await this.procesarImagenes(data.imagenes, nuevoIncidente.id);
                    updateImagenes = {
                        imagen1: rutasImagenes[0] ?? null,
                        imagen2: rutasImagenes[1] ?? null,
                        imagen3: rutasImagenes[2] ?? null,
                        imagen4: rutasImagenes[3] ?? null
                    };
                }
                // 4. Actualizar incidente con imágenes
                const incidenteConImagenes = await tx.incidente.update({
                    where: { id: nuevoIncidente.id },
                    data: updateImagenes,
                    include: {
                        movimiento: {
                            include: {
                                empresa: true,
                                localidad: true,
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
                // 5. Detener el movimiento
                await tx.movimiento.update({
                    where: { id: data.movimientoId },
                    data: {
                        estado: 'DETENIDO',
                        fechaPausa: new Date(),
                        incidenteGlobal: true
                    }
                });
                // 6. Reorganizar rondas según prioridad
                // Verificar si el movimiento tiene rondas activas
                const tieneRondasActivas = Array.isArray(movimiento.ronda)
                    ? movimiento.ronda.length > 0
                    : movimiento.ronda !== null;
                if (tieneRondasActivas) {
                    await this.reorganizarRondasPorIncidente(movimiento.empresaId, movimiento.localidadId, data.movimientoId);
                }
                return incidenteConImagenes;
            }, {
                isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable,
                timeout: 30000 // 30 segundos timeout
            });
        }
        catch (error) {
            incidente_logger_1.incidenteError.error('Error al crear incidente', { data, error });
            throw error instanceof Error ? error : new Error('Error al crear incidente');
        }
    }
    /**
     * Reorganiza las rondas cuando se reporta un incidente
     */
    static async reorganizarRondasPorIncidente(empresaId, localidadId, movimientoId) {
        try {
            await prisma.$transaction(async (tx) => {
                const rondaMovimiento = await tx.ronda.findFirst({
                    where: {
                        movimientoId,
                        localidadId,
                        concluido: false
                    },
                    include: { movimiento: true }
                });
                if (!rondaMovimiento || !rondaMovimiento.movimiento) {
                    incidente_logger_1.incidenteError.info('No se encontró ronda activa para el movimiento', {
                        movimientoId,
                        empresaId,
                        localidadId
                    });
                    return;
                }
                const { rondaNumero } = rondaMovimiento;
                const { prioridad } = rondaMovimiento.movimiento;
                // Verificar si es única empresa
                const unicaEmpresa = await this.esUnicaEmpresaEnRondasTx(tx, empresaId, localidadId);
                // Ejecutar lógica según prioridad
                if (prioridad === 'ALTA') {
                    await this.manejarIncidentePrioridadAlta(tx, localidadId, empresaId, movimientoId, rondaMovimiento);
                }
                else if (prioridad === 'BAJA') {
                    if (unicaEmpresa) {
                        await this.moverAlFinalDeLaRondaTx(tx, empresaId, localidadId, movimientoId, rondaMovimiento);
                    }
                    else {
                        await this.aplicarEfectoDominoTx(tx, empresaId, localidadId, movimientoId, rondaMovimiento);
                    }
                }
                // Reorganizar por empresa y normalizar
                await this.reorganizarRondasPorEmpresaTx(tx, empresaId, localidadId);
                await this.normalizarNumeracionRondasTx(tx, localidadId);
            }, {
                isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable,
                timeout: 30000
            });
        }
        catch (error) {
            incidente_logger_1.incidenteError.error('Error al reorganizar rondas por incidente', {
                empresaId,
                localidadId,
                movimientoId,
                error
            });
            throw new Error('Error al reorganizar rondas por incidente');
        }
    }
    /**
     * Maneja incidentes de prioridad ALTA
     */
    static async manejarIncidentePrioridadAlta(tx, localidadId, empresaId, movimientoId, rondaMovimiento) {
        const otrasAltas = await this.hayOtrasAltasEnRonda1Tx(tx, localidadId, movimientoId);
        if (otrasAltas) {
            await this.moverMovimientoARonda1AlFinalTx(tx, localidadId, empresaId, movimientoId);
        }
        else {
            await this.intercambiarConPrimerBajaDeRonda2Tx(tx, localidadId, empresaId, movimientoId, rondaMovimiento);
        }
    }
    /**
     * Verifica si hay otras ALTAS en ronda 1 (versión transaccional)
     */
    static async hayOtrasAltasEnRonda1Tx(tx, localidadId, movimientoIdExcluido) {
        const count = await tx.ronda.count({
            where: {
                localidadId,
                rondaNumero: 1,
                concluido: false,
                movimiento: {
                    prioridad: 'ALTA',
                    id: { not: movimientoIdExcluido }
                }
            }
        });
        return count > 0;
    }
    /**
     * Intercambia ALTA con BAJA (versión transaccional)
     */
    static async intercambiarConPrimerBajaDeRonda2Tx(tx, localidadId, empresaId, movimientoId, rondaA) {
        // 1. Eliminar A de ronda 1
        await tx.ronda.delete({ where: { id: rondaA.id } });
        // Compactar ronda 1
        await tx.ronda.updateMany({
            where: {
                localidadId,
                rondaNumero: 1,
                orden: { gt: rondaA.orden },
                concluido: false
            },
            data: { orden: { decrement: 1 } }
        });
        // 2. Buscar primer BAJA de ronda 2
        const rondaB = await tx.ronda.findFirst({
            where: {
                localidadId,
                rondaNumero: 2,
                concluido: false,
                movimiento: { prioridad: 'BAJA' }
            },
            orderBy: { orden: 'asc' }
        });
        // 3. Si existe B, intercambiar
        if (rondaB) {
            await tx.ronda.delete({ where: { id: rondaB.id } });
            // Compactar ronda 2
            await tx.ronda.updateMany({
                where: {
                    localidadId,
                    rondaNumero: 2,
                    orden: { gt: rondaB.orden },
                    concluido: false
                },
                data: { orden: { decrement: 1 } }
            });
            // Insertar B en ronda 1
            await tx.ronda.create({
                data: {
                    movimientoId: rondaB.movimientoId,
                    empresaId: rondaB.empresaId,
                    localidadId,
                    rondaNumero: 1,
                    orden: rondaA.orden
                }
            });
        }
        // 4. Insertar A al inicio de ronda 2
        await tx.ronda.updateMany({
            where: {
                localidadId,
                rondaNumero: 2,
                concluido: false
            },
            data: { orden: { increment: 1 } }
        });
        await tx.ronda.create({
            data: {
                movimientoId,
                empresaId,
                localidadId,
                rondaNumero: 2,
                orden: 1
            }
        });
        incidente_logger_1.incidenteError.info('Intercambio ALTA↔BAJA ejecutado', {
            movimientoAlta: movimientoId,
            movimientoBaja: rondaB?.movimientoId ?? 'sin BAJA',
            localidadId
        });
    }
    /**
     * Mueve movimiento al final de su ronda (versión transaccional)
     */
    static async moverAlFinalDeLaRondaTx(tx, empresaId, localidadId, movimientoId, rondaMovimiento) {
        const { rondaNumero, id: rondaId, orden: ordenOriginal } = rondaMovimiento;
        const movs = await tx.ronda.findMany({
            where: {
                localidadId,
                rondaNumero,
                concluido: false
            },
            orderBy: { orden: 'asc' }
        });
        if (movs.length <= 1)
            return;
        // Reorganizar órdenes
        const updates = [];
        let cursor = 1;
        for (const m of movs) {
            if (m.id === rondaId)
                continue;
            updates.push(tx.ronda.update({
                where: { id: m.id },
                data: { orden: cursor++ }
            }));
        }
        // Mover al final
        updates.push(tx.ronda.update({
            where: { id: rondaId },
            data: { orden: cursor }
        }));
        await Promise.all(updates);
        incidente_logger_1.incidenteError.info('Movimiento BAJA reubicado al final', {
            movimientoId,
            localidadId,
            rondaNumero,
            from: ordenOriginal,
            to: cursor
        });
    }
    /**
     * Aplica efecto dominó (versión transaccional)
     */
    static async aplicarEfectoDominoTx(tx, empresaId, localidadId, movimientoId, rondaMovimiento) {
        const desde = rondaMovimiento.rondaNumero;
        // Obtener ronda máxima
        const { _max } = await tx.ronda.aggregate({
            where: { localidadId, concluido: false },
            _max: { rondaNumero: true }
        });
        const maxRonda = _max.rondaNumero ?? desde;
        // Desplazar de arriba hacia abajo para evitar colisiones
        for (let r = maxRonda; r >= desde; r--) {
            await tx.ronda.updateMany({
                where: {
                    localidadId,
                    rondaNumero: r,
                    concluido: false
                },
                data: { rondaNumero: r + 1 }
            });
        }
        // Compactar órdenes en rondas afectadas
        for (let r = desde + 1; r <= maxRonda + 1; r++) {
            await this.reorganizarOrdenEnRondaTx(tx, localidadId, r);
        }
        incidente_logger_1.incidenteError.info('Efecto dominó aplicado', {
            movimientoId,
            empresaId,
            localidadId,
            desdeRonda: desde,
            hastaRonda: maxRonda + 1
        });
    }
    /**
     * Mueve ALTA al final de ronda 1 (versión transaccional)
     */
    static async moverMovimientoARonda1AlFinalTx(tx, localidadId, empresaId, movimientoId) {
        const rondaActual = await tx.ronda.findFirst({
            where: { movimientoId, concluido: false }
        });
        if (!rondaActual)
            return;
        // Eliminar de ronda actual
        await tx.ronda.delete({ where: { id: rondaActual.id } });
        // Compactar ronda original
        await tx.ronda.updateMany({
            where: {
                localidadId,
                rondaNumero: rondaActual.rondaNumero,
                orden: { gt: rondaActual.orden },
                concluido: false
            },
            data: { orden: { decrement: 1 } }
        });
        // Contar elementos en ronda 1
        const ultimo = await tx.ronda.count({
            where: {
                localidadId,
                rondaNumero: 1,
                concluido: false
            }
        });
        // Insertar al final de ronda 1
        await tx.ronda.create({
            data: {
                movimientoId,
                empresaId,
                localidadId,
                rondaNumero: 1,
                orden: ultimo + 1
            }
        });
        incidente_logger_1.incidenteError.info('ALTA movida al final de R1', {
            movimientoId,
            localidadId,
            ordenFinal: ultimo + 1
        });
    }
    /**
     * Normaliza numeración de rondas (versión transaccional)
     */
    static async normalizarNumeracionRondasTx(tx, localidadId) {
        const grupos = await tx.ronda.findMany({
            where: { localidadId, concluido: false },
            distinct: ['rondaNumero'],
            orderBy: { rondaNumero: 'asc' }
        });
        let expected = 1;
        for (const { rondaNumero } of grupos) {
            if (rondaNumero !== expected) {
                await tx.ronda.updateMany({
                    where: { localidadId, rondaNumero },
                    data: { rondaNumero: expected }
                });
            }
            expected++;
        }
    }
    /**
     * Reorganiza orden en ronda (versión transaccional)
     */
    static async reorganizarOrdenEnRondaTx(tx, localidadId, rondaNumero) {
        const movs = await tx.ronda.findMany({
            where: {
                localidadId,
                rondaNumero,
                concluido: false
            },
            orderBy: { orden: 'asc' }
        });
        const updates = [];
        for (let i = 0; i < movs.length; i++) {
            const correcto = i + 1;
            if (movs[i].orden !== correcto) {
                updates.push(tx.ronda.update({
                    where: { id: movs[i].id },
                    data: { orden: correcto }
                }));
            }
        }
        if (updates.length > 0) {
            await Promise.all(updates);
        }
    }
    /**
     * Reorganiza rondas por empresa (versión transaccional)
     */
    static async reorganizarRondasPorEmpresaTx(tx, empresaId, localidadId) {
        // Obtener todas las rondas activas
        const rondas = await tx.ronda.findMany({
            where: { localidadId, concluido: false },
            distinct: ['rondaNumero'],
            orderBy: { rondaNumero: 'asc' }
        });
        // Obtener secuencia de movimientos de la empresa
        const empMovs = await tx.ronda.findMany({
            where: {
                localidadId,
                empresaId,
                concluido: false
            },
            select: {
                id: true,
                rondaNumero: true
            },
            orderBy: { rondaNumero: 'asc' }
        });
        const seqMap = new Map();
        empMovs.forEach((m, idx) => seqMap.set(m.rondaNumero, { id: m.id, seq: idx + 1 }));
        // Reorganizar cada ronda
        for (const { rondaNumero } of rondas) {
            const all = await tx.ronda.findMany({
                where: {
                    localidadId,
                    rondaNumero,
                    concluido: false
                },
                orderBy: { orden: 'asc' }
            });
            const entry = seqMap.get(rondaNumero);
            if (!entry) {
                // Solo renumerar consecutivo
                await this.reorganizarOrdenEnRondaTx(tx, localidadId, rondaNumero);
                continue;
            }
            // Reorganizar con la posición de la empresa
            const others = all.filter(m => m.id !== entry.id);
            const target = Math.min(entry.seq, others.length + 1);
            const newOrder = [
                ...others.slice(0, target - 1).map(m => m.id),
                entry.id,
                ...others.slice(target - 1).map(m => m.id)
            ];
            const updates = [];
            for (let i = 0; i < newOrder.length; i++) {
                updates.push(tx.ronda.update({
                    where: { id: newOrder[i] },
                    data: { orden: i + 1 }
                }));
            }
            await Promise.all(updates);
        }
    }
    /**
     * Verifica si es única empresa (versión transaccional)
     */
    static async esUnicaEmpresaEnRondasTx(tx, empresaId, localidadId) {
        const empresas = await tx.ronda.findMany({
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
     * Versión no transaccional para compatibilidad
     */
    static async esUnicaEmpresaEnRondas(empresaId, localidadId) {
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
     * Procesa y optimiza las imagenes del incidente.
     * Crea carpetas organizadas por fecha para optimizar busquedas.
     *
     * @private
     * @param imagenes - Array de buffers de imagenes
     * @param incidenteId - ID del incidente para nombrar archivos
     * @returns Array de rutas donde se guardaron las imagenes
     */
    static async procesarImagenes(imagenes, incidenteId) {
        try {
            const fecha = new Date();
            const ano = fecha.getFullYear();
            const mes = String(fecha.getMonth() + 1).padStart(2, '0');
            const dia = String(fecha.getDate()).padStart(2, '0');
            // Crear estructura de carpetas: uploads/incidentes/2025/01/15/
            const carpetaDestino = path_1.default.join(IMAGEN_CONFIG.carpetaBase, String(ano), mes, dia);
            // Asegurar que existe la carpeta
            await promises_1.default.mkdir(carpetaDestino, { recursive: true });
            const rutasGuardadas = [];
            for (let i = 0; i < imagenes.length && i < 4; i++) {
                const nombreArchivo = `incidente_${incidenteId}_imagen_${i + 1}_${Date.now()}.${IMAGEN_CONFIG.format}`;
                const rutaCompleta = path_1.default.join(carpetaDestino, nombreArchivo);
                // Optimizar imagen con Sharp
                await (0, sharp_1.default)(imagenes[i])
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
                const rutaRelativa = path_1.default.relative(IMAGEN_CONFIG.carpetaBase, rutaCompleta);
                rutasGuardadas.push(rutaRelativa);
            }
            incidente_logger_1.incidenteError.info('Imagenes procesadas y guardadas', {
                incidenteId,
                cantidad: rutasGuardadas.length,
                carpeta: carpetaDestino
            });
            return rutasGuardadas;
        }
        catch (error) {
            incidente_logger_1.incidenteError.error('Error al procesar imagenes', { incidenteId, error });
            throw new Error('Error al procesar imagenes del incidente');
        }
    }
    /**
     * Obtener incidentes filtrados por estado.
     *
     * @param estado - Estado del incidente (ABIERTO o CERRADO)
     * @returns Lista de incidentes filtrados por estado
     * @throws Error si ocurre un fallo durante la consulta
     */
    static async obtenerIncidentesPorEstado(estado) {
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
        }
        catch (error) {
            incidente_logger_1.incidenteError.error('Error al obtener incidentes por estado', { estado, error });
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
    static async obtenerIncidentesPorMovimiento(movimientoId) {
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
        }
        catch (error) {
            incidente_logger_1.incidenteError.error('Error al obtener incidentes por movimiento', { movimientoId, error });
            throw new Error('Error al obtener incidentes por movimiento');
        }
    }
    /**
     * Notificar cambio de estado de un incidente
     */
    static async notificarCambioEstado(incidente, estadoAnterior) {
        try {
            const movimiento = await prisma.movimiento.findUnique({
                where: { id: incidente.movimientoId },
                include: { empresa: true, localidad: true }
            });
            if (!movimiento)
                return;
            // Obtener usuarios relevantes
            const ids = new Set();
            if (movimiento.clienteId)
                ids.add(movimiento.clienteId);
            if (movimiento.supervisorId)
                ids.add(movimiento.supervisorId);
            if (movimiento.coordinadorId)
                ids.add(movimiento.coordinadorId);
            if (movimiento.operadorId)
                ids.add(movimiento.operadorId);
            if (movimiento.creadoPorId)
                ids.add(movimiento.creadoPorId);
            const usuariosConTokens = await prisma.usuario.findMany({
                where: {
                    id: { in: Array.from(ids) },
                    activo: true
                },
                include: { fcmTokens: true }
            });
            const tokens = usuariosConTokens.flatMap(u => u.fcmTokens.map(t => t.token));
            if (tokens.length === 0)
                return;
            const empresaNombre = movimiento.empresa?.nombre ?? 'Sin Empresa';
            const descripcion = incidente.descripcion.length > 50
                ? incidente.descripcion.slice(0, 50) + '…'
                : incidente.descripcion;
            const titulo = incidente.estado === 'CERRADO'
                ? '✅ INCIDENTE RESUELTO'
                : '🔄 INCIDENTE ACTUALIZADO';
            const mensaje = {
                notification: {
                    title: titulo,
                    body: `ID #${incidente.id} • ${empresaNombre} • Loco ${movimiento.locomotiveNumber}`
                },
                data: {
                    pantalla: 'Incidente',
                    incidenteId: String(incidente.id),
                    movimientoId: String(incidente.movimientoId),
                    empresa: empresaNombre,
                    locomotora: String(movimiento.locomotiveNumber),
                    estadoAnterior,
                    estadoNuevo: incidente.estado,
                    descripcion,
                    tipo: 'cambio_estado_incidente',
                    fecha: new Date().toISOString()
                },
                tokens
            };
            await firebase_admin_1.default.messaging().sendEachForMulticast(mensaje);
            incidente_logger_1.incidenteError.info('Notificación enviada', {
                incidenteId: incidente.id,
                tokensEnviados: tokens.length
            });
        }
        catch (error) {
            incidente_logger_1.incidenteError.error('Error enviando notificación de cambio de estado', { error });
            // No lanzar error para no interrumpir el flujo principal
        }
    }
    /**
     * Eliminar un incidente por su ID.
     * También elimina las imágenes asociadas del servidor.
     *
     * @param id - ID del incidente a eliminar
     * @returns Objeto del incidente eliminado
     * @throws Error si ocurre un fallo durante la eliminación
     */
    static async eliminarIncidente(id) {
        try {
            return await prisma.$transaction(async (tx) => {
                // Obtener el incidente con sus imagenes
                const incidente = await tx.incidente.findUnique({
                    where: { id }
                });
                if (!incidente) {
                    throw new Error(`No se encontró incidente con id ${id}`);
                }
                // Verificar si puede ser eliminado
                if (incidente.estado === 'ABIERTO') {
                    const { enPeriodoVerificacion, enPeriodoBloqueo } = await this.verificarPeriodoVerificacion(id);
                    if (enPeriodoVerificacion || enPeriodoBloqueo) {
                        throw new Error('No se puede eliminar un incidente en período de verificación o bloqueo');
                    }
                }
                // Eliminar el incidente de la base de datos
                const incidenteEliminado = await tx.incidente.delete({
                    where: { id }
                });
                // Eliminar imágenes del servidor (fuera de la transacción)
                const imagenes = [
                    incidente.imagen1,
                    incidente.imagen2,
                    incidente.imagen3,
                    incidente.imagen4
                ].filter(Boolean);
                // Programar eliminación de imágenes de forma asíncrona
                setImmediate(async () => {
                    for (const rutaImagen of imagenes) {
                        if (rutaImagen) {
                            try {
                                const rutaCompleta = path_1.default.join(IMAGEN_CONFIG.carpetaBase, rutaImagen);
                                await promises_1.default.unlink(rutaCompleta);
                            }
                            catch (error) {
                                incidente_logger_1.incidenteError.warn('No se pudo eliminar imagen', { rutaImagen, error });
                            }
                        }
                    }
                });
                incidente_logger_1.incidenteError.info('Incidente eliminado correctamente', {
                    incidenteId: id,
                    imagenesParaEliminar: imagenes.length
                });
                return incidenteEliminado;
            });
        }
        catch (error) {
            incidente_logger_1.incidenteError.error('Error al eliminar incidente', { id, error });
            throw error instanceof Error ? error : new Error('Error al eliminar incidente');
        }
    }
    /**
     * Cerrar automáticamente incidentes que han superado el tiempo de verificación.
     * Se ejecuta periódicamente para mantener el flujo de trabajo.
     *
     * @returns Número de incidentes cerrados automáticamente
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
                },
                select: {
                    id: true,
                    movimientoId: true
                }
            });
            if (incidentesVencidos.length === 0) {
                return 0;
            }
            let incidentesCerrados = 0;
            const errores = [];
            // Procesar en lotes para evitar sobrecarga
            const BATCH_SIZE = 10;
            for (let i = 0; i < incidentesVencidos.length; i += BATCH_SIZE) {
                const batch = incidentesVencidos.slice(i, i + BATCH_SIZE);
                await Promise.all(batch.map(async (incidente) => {
                    try {
                        await this.editarIncidente(incidente.id, { estado: 'CERRADO' });
                        incidentesCerrados++;
                    }
                    catch (error) {
                        errores.push({ incidenteId: incidente.id, error });
                    }
                }));
            }
            if (errores.length > 0) {
                incidente_logger_1.incidenteError.warn('Algunos incidentes no pudieron ser cerrados', { errores });
            }
            if (incidentesCerrados > 0) {
                incidente_logger_1.incidenteError.info('Incidentes cerrados automáticamente por timeout', {
                    cantidad: incidentesCerrados,
                    errores: errores.length,
                    tiempoLimite: tiempoLimite.toISOString()
                });
            }
            return incidentesCerrados;
        }
        catch (error) {
            incidente_logger_1.incidenteError.error('Error al cerrar incidentes vencidos', { error });
            throw new Error('Error al cerrar incidentes vencidos');
        }
    }
    /**
     * Obtener la ruta completa de una imagen de incidente.
     *
     * @param rutaRelativa - Ruta relativa de la imagen
     * @returns Ruta completa del archivo
     */
    static obtenerRutaCompletaImagen(rutaRelativa) {
        if (!rutaRelativa) {
            throw new Error('Ruta relativa no puede estar vacía');
        }
        return path_1.default.join(IMAGEN_CONFIG.carpetaBase, rutaRelativa);
    }
    /**
     * Verificar si un incidente está en período de verificación.
     *
     * @param incidenteId - ID del incidente
     * @returns Información sobre el estado del período de verificación
     */
    static async verificarPeriodoVerificacion(incidenteId) {
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
                throw new Error(`No se encontró incidente con id ${incidenteId}`);
            }
            if (incidente.estado === 'CERRADO') {
                return {
                    enPeriodoVerificacion: false,
                    enPeriodoBloqueo: false,
                    tiempoRestante: 0,
                    mensaje: 'Incidente ya está cerrado'
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
                mensaje = 'Período de verificación activo';
            }
            else if (enPeriodoBloqueo) {
                tiempoRestante = (TIMEOUT_CONFIG.verificacion + TIMEOUT_CONFIG.bloqueo) - tiempoTranscurrido;
                mensaje = 'Período de bloqueo activo';
            }
            else {
                mensaje = 'Incidente puede ser cerrado';
            }
            return {
                enPeriodoVerificacion,
                enPeriodoBloqueo,
                tiempoRestante: Math.max(0, tiempoRestante),
                mensaje,
                tiempoTranscurridoMinutos: Math.floor(tiempoTranscurrido / 60000)
            };
        }
        catch (error) {
            incidente_logger_1.incidenteError.error('Error al verificar período de verificación', { incidenteId, error });
            throw error instanceof Error ? error : new Error('Error al verificar período de verificación');
        }
    }
    /**
     * Obtener un incidente por ID con todas sus relaciones
     */
    static async obtenerIncidentePorId(id) {
        try {
            const incidente = await prisma.incidente.findUnique({
                where: { id },
                include: {
                    movimiento: {
                        include: {
                            empresa: true,
                            localidad: true,
                            viaOrigen: true,
                            viaDestino: true,
                            ronda: {
                                where: { concluido: false }
                            }
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
            if (!incidente) {
                throw new Error(`No existe incidente con id ${id}`);
            }
            // Filtrar solo las rutas válidas
            const rutasRelativas = [
                incidente.imagen1,
                incidente.imagen2,
                incidente.imagen3,
                incidente.imagen4
            ].filter(Boolean);
            return {
                ...incidente,
                imagenes: rutasRelativas
            };
        }
        catch (error) {
            incidente_logger_1.incidenteError.error('Error al obtener incidente por ID', { id, error });
            throw error instanceof Error ? error : new Error('Error al obtener incidente');
        }
    }
    /**
     * Obtener incidentes paginados con filtros opcionales
     */
    static async obtenerIncidentesPaginados(page = 1, pageSize = 20, filtros) {
        try {
            // Validar parámetros de paginación
            page = Math.max(1, page);
            pageSize = Math.min(100, Math.max(1, pageSize));
            const skip = (page - 1) * pageSize;
            // Construir condiciones where
            const where = {};
            if (filtros?.estado) {
                where.estado = filtros.estado;
            }
            if (filtros?.fechaInicio || filtros?.fechaFin) {
                where.fechaInicio = {};
                if (filtros.fechaInicio) {
                    where.fechaInicio.gte = filtros.fechaInicio;
                }
                if (filtros.fechaFin) {
                    where.fechaInicio.lte = filtros.fechaFin;
                }
            }
            if (filtros?.empresaId || filtros?.localidadId) {
                where.movimiento = {};
                if (filtros.empresaId) {
                    where.movimiento.empresaId = filtros.empresaId;
                }
                if (filtros.localidadId) {
                    where.movimiento.localidadId = filtros.localidadId;
                }
            }
            const [incidentes, total] = await Promise.all([
                prisma.incidente.findMany({
                    where,
                    include: {
                        movimiento: {
                            include: {
                                empresa: true,
                                localidad: true
                            }
                        },
                        usuario: true
                    },
                    orderBy: { fechaInicio: 'desc' },
                    skip,
                    take: pageSize,
                }),
                prisma.incidente.count({ where })
            ]);
            return {
                data: incidentes,
                meta: {
                    total,
                    page,
                    pageSize,
                    totalPages: Math.ceil(total / pageSize),
                    hasNextPage: page * pageSize < total,
                    hasPreviousPage: page > 1
                }
            };
        }
        catch (error) {
            incidente_logger_1.incidenteError.error('Error al obtener incidentes paginados', { error });
            throw new Error('Error al obtener incidentes');
        }
    }
    /**
     * Obtener incidentes por localidad (paginado)
     */
    static async obtenerIncidentesPorLocalidad(localidadId, page = 1, pageSize = 20) {
        return this.obtenerIncidentesPaginados(page, pageSize, { localidadId });
    }
    /**
     * Obtener incidentes por empresa y localidad (paginado)
     */
    static async obtenerIncidentesPorEmpresaYLocalidad(empresaId, localidadId, page = 1, pageSize = 20) {
        return this.obtenerIncidentesPaginados(page, pageSize, { empresaId, localidadId });
    }
    /**
     * Obtener incidentes por empresa (paginado)
     */
    static async obtenerIncidentesPorEmpresa(empresaId, page = 1, pageSize = 20) {
        return this.obtenerIncidentesPaginados(page, pageSize, { empresaId });
    }
    /**
     * Continuar movimiento después de resolver incidente
     */
    static async continuarMovimiento(id, comentario) {
        try {
            return await prisma.$transaction(async (tx) => {
                const incidente = await tx.incidente.findUnique({
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
                if (!incidente) {
                    throw new Error('Incidente no encontrado');
                }
                if (incidente.estado === 'CERRADO') {
                    throw new Error('Incidente ya está cerrado');
                }
                // Verificar período de verificación
                const { enPeriodoVerificacion, enPeriodoBloqueo } = await this.verificarPeriodoVerificacion(id);
                if (enPeriodoVerificacion || enPeriodoBloqueo) {
                    throw new Error('No se puede continuar el movimiento durante el período de verificación o bloqueo');
                }
                // Cerrar incidente
                const actualizado = await tx.incidente.update({
                    where: { id },
                    data: {
                        estado: 'CERRADO',
                        fechaFin: new Date(),
                        descripcion: `${incidente.descripcion}\n\n[Resuelto] ${comentario}`
                    },
                    include: {
                        movimiento: {
                            include: {
                                empresa: true,
                                localidad: true
                            }
                        }
                    }
                });
                // Reactivar movimiento
                await tx.movimiento.update({
                    where: { id: incidente.movimientoId },
                    data: {
                        estado: 'EN_PROCESO',
                        fechaPausa: null,
                        incidenteGlobal: false
                    }
                });
                // Reorganizar rondas si es necesario
                if (incidente.movimiento) {
                    await this.reorganizarSiEsEmpresaUnica(incidente.movimiento);
                }
                return actualizado;
            });
        }
        catch (error) {
            incidente_logger_1.incidenteError.error('Error al continuar movimiento', { id, comentario, error });
            throw error instanceof Error ? error : new Error('Error al continuar movimiento');
        }
    }
    /**
     * Reorganizar si es empresa única
     */
    static async reorganizarSiEsEmpresaUnica(movimiento) {
        if (!movimiento?.empresaId || !movimiento?.localidadId) {
            return;
        }
        try {
            const esUnica = await this.esUnicaEmpresaEnRondas(movimiento.empresaId, movimiento.localidadId);
            if (esUnica && movimiento.id) {
                await this.reorganizarRondasPorIncidente(movimiento.empresaId, movimiento.localidadId, movimiento.id);
            }
        }
        catch (error) {
            incidente_logger_1.incidenteError.error('Error al reorganizar para empresa única', {
                movimientoId: movimiento.id,
                error
            });
            // No lanzar error para no interrumpir el flujo principal
        }
    }
    /**
     * Obtener estadísticas de incidentes
     */
    static async obtenerEstadisticas(filtros) {
        try {
            const where = {};
            if (filtros?.fechaInicio || filtros?.fechaFin) {
                where.fechaInicio = {};
                if (filtros.fechaInicio) {
                    where.fechaInicio.gte = filtros.fechaInicio;
                }
                if (filtros.fechaFin) {
                    where.fechaInicio.lte = filtros.fechaFin;
                }
            }
            if (filtros?.empresaId || filtros?.localidadId) {
                where.movimiento = {};
                if (filtros.empresaId) {
                    where.movimiento.empresaId = filtros.empresaId;
                }
                if (filtros.localidadId) {
                    where.movimiento.localidadId = filtros.localidadId;
                }
            }
            const [total, abiertos, cerrados, tiempoPromedio] = await Promise.all([
                prisma.incidente.count({ where }),
                prisma.incidente.count({ where: { ...where, estado: 'ABIERTO' } }),
                prisma.incidente.count({ where: { ...where, estado: 'CERRADO' } }),
                prisma.incidente.findMany({
                    where: { ...where, estado: 'CERRADO', fechaFin: { not: null } },
                    select: {
                        fechaInicio: true,
                        fechaFin: true
                    }
                })
            ]);
            // Calcular tiempo promedio de resolución
            let tiempoPromedioResolucion = 0;
            if (tiempoPromedio.length > 0) {
                const tiempos = tiempoPromedio.map(inc => {
                    if (inc.fechaFin) {
                        return inc.fechaFin.getTime() - inc.fechaInicio.getTime();
                    }
                    return 0;
                }).filter(t => t > 0);
                if (tiempos.length > 0) {
                    tiempoPromedioResolucion = tiempos.reduce((a, b) => a + b, 0) / tiempos.length;
                }
            }
            return {
                total,
                abiertos,
                cerrados,
                tasaResolucion: total > 0 ? (cerrados / total) * 100 : 0,
                tiempoPromedioResolucionMinutos: Math.round(tiempoPromedioResolucion / 60000)
            };
        }
        catch (error) {
            incidente_logger_1.incidenteError.error('Error al obtener estadísticas', { error });
            throw new Error('Error al obtener estadísticas de incidentes');
        }
    }
}
exports.IncidenteModel = IncidenteModel;
