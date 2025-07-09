"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RondaModel = void 0;
const movimiento_logger_1 = require("../movimiento.logger");
const IncidenteModel_1 = require("../../Incidente/IncidenteModel");
const client_1 = require("@prisma/client");
/**
 * @file RondaModel.ts
 * @author Isaac Serrano Campos <isaac.serrano@vianko.com.mx>
 * @version 1.4.1 2025-05-16
 *
 * @description
 * Gestor de rondas para operaciones ferroviarias con sistema de prioridad.
 */
const prisma = new client_1.PrismaClient();
class RondaModel {
    /** Renumera todas las rondas abiertas de una localidad */
    static async recomponerRondasLocalidad(localidadId, tx = prisma) {
        // borra las concluidas
        await tx.ronda.deleteMany({ where: { localidadId, concluido: true } });
        // trae las abiertas ordenadas
        const abiertas = await tx.ronda.findMany({
            where: { localidadId, concluido: false },
            orderBy: { rondaNumero: 'asc' }
        });
        // reasigna 1,2,3...
        let nuevo = 1;
        for (const r of abiertas) {
            if (r.rondaNumero !== nuevo) {
                await tx.ronda.update({
                    where: { id: r.id },
                    data: { rondaNumero: nuevo }
                });
            }
            nuevo++;
        }
    }
    /**
     * Genera rondas para todos los movimientos en estado SOLICITADO sin ronda asignada.
     * @returns Rondas creadas.
     */
    static async generarRondaInteligente() {
        try {
            // Verificar si hay movimientos ALTA sin ronda
            const movimientosAltaPrioridad = await prisma.movimiento.findMany({
                where: {
                    estado: "SOLICITADO",
                    ronda: null,
                    prioridad: "ALTA"
                },
                orderBy: { createdAt: "asc" },
            });
            // Si hay movimientos ALTA, reorganizar todo
            if (movimientosAltaPrioridad.length > 0) {
                await this.eliminarTodasLasRondas();
                return await this.crearTodasLasRondas();
            }
            // Limpiar rondas concluidas
            await this.limpiarYReorganizarRondasConcluidas();
            // Para movimientos BAJA sin ronda asignada
            const movimientosBajaPrioridad = await prisma.movimiento.findMany({
                where: {
                    estado: "SOLICITADO",
                    ronda: null,
                    prioridad: "BAJA"
                },
                orderBy: { createdAt: "asc" },
            });
            if (movimientosBajaPrioridad.length === 0)
                return [];
            // Crear rondas para estos movimientos
            const rondasCreadas = [];
            for (const mov of movimientosBajaPrioridad) {
                const ronda = await this.crearRondaParaMovimientoBaja(mov.id, mov.empresaId, mov.localidadId);
                if (ronda)
                    rondasCreadas.push(ronda);
            }
            return rondasCreadas;
        }
        catch (error) {
            movimiento_logger_1.movimientoError.error("Error en generarRondaInteligente", { error });
            throw new Error("Error al generar ronda inteligente");
        }
    }
    /**
     * Elimina todas las rondas y crea nuevas respetando prioridades.
     * @private
     */
    static async crearTodasLasRondas() {
        try {
            // Obtener todos los movimientos en SOLICITADO
            const todosMovimientos = await prisma.movimiento.findMany({
                where: { estado: "SOLICITADO" },
                orderBy: [
                    { prioridad: "desc" }, // ALTA primero
                    { createdAt: "asc" } // Ordenados por fecha
                ],
            });
            // Separar por prioridad
            const movimientosAlta = todosMovimientos.filter(m => m.prioridad === "ALTA");
            const movimientosBaja = todosMovimientos.filter(m => m.prioridad === "BAJA");
            // Hay movimientos ALTA?
            const hayMovimientosAlta = movimientosAlta.length > 0;
            // Agrupar por localidad
            const movimientosPorLocalidad = new Map();
            // Clasificar todos los movimientos por localidad
            for (const mov of todosMovimientos) {
                if (!movimientosPorLocalidad.has(mov.localidadId)) {
                    movimientosPorLocalidad.set(mov.localidadId, {
                        alta: [],
                        baja: []
                    });
                }
                if (mov.prioridad === "ALTA") {
                    movimientosPorLocalidad.get(mov.localidadId).alta.push(mov);
                }
                else {
                    movimientosPorLocalidad.get(mov.localidadId).baja.push(mov);
                }
            }
            const rondasCreadas = [];
            // Para cada localidad
            for (const [localidadId, movs] of movimientosPorLocalidad.entries()) {
                // 1. Crear rondas para ALTA (todos en ronda 1)
                for (let i = 0; i < movs.alta.length; i++) {
                    const movAlta = movs.alta[i];
                    const nuevaRonda = await prisma.ronda.create({
                        data: {
                            movimientoId: movAlta.id,
                            empresaId: movAlta.empresaId,
                            localidadId: localidadId,
                            orden: i + 1,
                            rondaNumero: 1,
                        },
                    });
                    rondasCreadas.push(nuevaRonda);
                }
                // 2. Crear rondas para BAJA
                // Determinar ronda inicial (2 si hay ALTA, 1 si no hay)
                const rondaInicial = hayMovimientosAlta ? 2 : 1;
                // Rastrear qué empresas están en cada ronda
                const empresasEnRonda = new Map();
                // Para cada movimiento BAJA
                for (const movBaja of movs.baja) {
                    // Buscar la primera ronda donde no esté esta empresa
                    let rondaAsignada = null;
                    let numRonda = rondaInicial;
                    while (rondaAsignada === null) {
                        if (!empresasEnRonda.has(numRonda)) {
                            empresasEnRonda.set(numRonda, new Set());
                        }
                        // Si esta empresa no está en esta ronda
                        if (!empresasEnRonda.get(numRonda).has(movBaja.empresaId)) {
                            rondaAsignada = numRonda;
                            empresasEnRonda.get(numRonda).add(movBaja.empresaId);
                        }
                        else {
                            numRonda++;
                        }
                    }
                    // Contar movimientos para determinar orden
                    const ordenEnRonda = await prisma.ronda.count({
                        where: {
                            localidadId: localidadId,
                            rondaNumero: rondaAsignada,
                        },
                    }) + 1;
                    // Crear la ronda
                    const nuevaRonda = await prisma.ronda.create({
                        data: {
                            movimientoId: movBaja.id,
                            empresaId: movBaja.empresaId,
                            localidadId: localidadId,
                            orden: ordenEnRonda,
                            rondaNumero: rondaAsignada,
                        },
                    });
                    rondasCreadas.push(nuevaRonda);
                }
            }
            return rondasCreadas;
        }
        catch (error) {
            movimiento_logger_1.movimientoError.error("Error en crearTodasLasRondas", { error });
            throw new Error("Error al crear todas las rondas");
        }
    }
    /**
     * Limpia rondas concluidas y reorganiza la numeración.
     * @private
     */
    static async limpiarYReorganizarRondasConcluidas() {
        try {
            // Obtener todas las localidades con rondas
            const localidadesConRondas = await prisma.ronda.findMany({
                select: { localidadId: true },
                distinct: ['localidadId']
            });
            // Para cada localidad
            for (const { localidadId } of localidadesConRondas) {
                // Verificar si hay movimientos ALTA activos
                const hayAltaActivos = await prisma.movimiento.count({
                    where: {
                        localidadId,
                        estado: "SOLICITADO",
                        prioridad: "ALTA",
                        ronda: {
                            concluido: false
                        }
                    }
                }) > 0;
                // Obtener rondas ordenadas por número
                const rondas = await prisma.ronda.findMany({
                    where: { localidadId },
                    orderBy: { rondaNumero: 'asc' }
                });
                let desplazamiento = 0;
                let ultimoNumeroRonda = 0;
                // Para cada número de ronda único
                const numerosRonda = [...new Set(rondas.map(r => r.rondaNumero))].sort((a, b) => a - b);
                for (const numRonda of numerosRonda) {
                    ultimoNumeroRonda = numRonda;
                    // Obtener todas las rondas con este número
                    const rondasConEsteNumero = rondas.filter(r => r.rondaNumero === numRonda);
                    // Verificar si todas están concluidas
                    const todasConcluidas = rondasConEsteNumero.every(r => r.concluido === true);
                    if (todasConcluidas && rondasConEsteNumero.length > 0) {
                        // Eliminar estas rondas
                        await prisma.ronda.deleteMany({
                            where: { localidadId, rondaNumero: numRonda }
                        });
                        // Aumentar el desplazamiento
                        desplazamiento++;
                        movimiento_logger_1.movimientoError.info(`Eliminadas rondas ${numRonda} de localidad ${localidadId}`);
                    }
                    else if (desplazamiento > 0) {
                        // Actualizar números de ronda
                        await prisma.ronda.updateMany({
                            where: { localidadId, rondaNumero: numRonda },
                            data: { rondaNumero: numRonda - desplazamiento }
                        });
                        movimiento_logger_1.movimientoError.info(`Rondas ${numRonda} → ${numRonda - desplazamiento} en localidad ${localidadId}`);
                    }
                }
                // Caso especial: si no hay ALTA activos, permitir que BAJA usen ronda 1
                if (!hayAltaActivos && desplazamiento === 0 && ultimoNumeroRonda > 1) {
                    // Verificar si hay ALTA en ronda 1 completados
                    const altaCompletadosRonda1 = await prisma.ronda.findMany({
                        where: {
                            localidadId,
                            rondaNumero: 1,
                            concluido: true,
                            movimiento: {
                                prioridad: "ALTA"
                            }
                        }
                    });
                    // Si hay ALTA completados en ronda 1, eliminarlos y reorganizar
                    if (altaCompletadosRonda1.length > 0) {
                        // Eliminar rondas ALTA concluidas
                        await prisma.ronda.deleteMany({
                            where: {
                                localidadId,
                                rondaNumero: 1,
                                movimiento: {
                                    prioridad: "ALTA"
                                }
                            }
                        });
                        // Reorganizar todas las demás rondas
                        for (let i = 2; i <= ultimoNumeroRonda; i++) {
                            await prisma.ronda.updateMany({
                                where: { localidadId, rondaNumero: i },
                                data: { rondaNumero: i - 1 }
                            });
                        }
                        movimiento_logger_1.movimientoError.info(`Rondas reorganizadas en localidad ${localidadId}`);
                    }
                }
            }
        }
        catch (error) {
            movimiento_logger_1.movimientoError.error("Error al limpiar y reorganizar rondas", { error });
            throw new Error("Error al limpiar y reorganizar rondas");
        }
    }
    /**
     * Elimina todas las rondas existentes.
     */
    static async eliminarTodasLasRondas() {
        try {
            await prisma.ronda.deleteMany({});
        }
        catch (error) {
            movimiento_logger_1.movimientoError.error("Error al eliminar todas las rondas", { error });
            throw new Error("Error al eliminar todas las rondas");
        }
    }
    /**
     * CORRECCIÓN: RondaModel con lógica de incidentes
     * ===============================================
     */
    /**
     * Verifica si una empresa ya tiene movimientos ACTIVOS en una ronda específica
     * (No cuenta movimientos DETENIDOS por incidentes)
     */
    static async empresaTieneMovimientoActivoEnRonda(empresaId, localidadId, rondaNumero) {
        const movimientosActivos = await prisma.ronda.count({
            where: {
                localidadId,
                rondaNumero,
                empresaId,
                concluido: false,
                movimiento: {
                    estado: {
                        in: ['SOLICITADO', 'EN_PROCESO'] // ← Solo estados ACTIVOS
                        // NO incluye 'DETENIDO' (por incidentes)
                    }
                }
            }
        });
        return movimientosActivos > 0;
    }
    /**
     * Crear ronda para movimiento BAJA (CORREGIDO con incidentes)
     */
    static async crearRondaParaMovimientoBaja(movimientoId, empresaId, localidadId) {
        try {
            // Verificar si hay movimientos ALTA activos
            const hayAltaActivos = await prisma.movimiento.count({
                where: {
                    estado: "SOLICITADO",
                    prioridad: "ALTA",
                    localidadId: localidadId
                }
            }) > 0;
            // Ronda inicial (2 si hay ALTA, 1 si no hay)
            const rondaInicial = hayAltaActivos ? 2 : 1;
            // 🔄 NUEVA LÓGICA: Buscar ronda considerando incidentes
            let rondaAsignada = null;
            let numRonda = rondaInicial;
            while (rondaAsignada === null) {
                // ✅ Verificar si empresa tiene movimientos ACTIVOS en esta ronda
                const tieneMovimientoActivo = await this.empresaTieneMovimientoActivoEnRonda(empresaId, localidadId, numRonda);
                if (!tieneMovimientoActivo) {
                    rondaAsignada = numRonda;
                }
                else {
                    numRonda++;
                    // Limitar búsqueda para evitar bucles infinitos
                    if (numRonda > 100) {
                        rondaAsignada = numRonda;
                        movimiento_logger_1.movimientoError.warn("Búsqueda de ronda alcanzó 100 intentos", {
                            movimientoId, empresaId, localidadId
                        });
                    }
                }
            }
            // Contar movimientos en esta ronda para determinar orden
            const ordenEnRonda = await prisma.ronda.count({
                where: {
                    localidadId,
                    rondaNumero: rondaAsignada,
                    concluido: false
                }
            }) + 1;
            // Crear la ronda
            return await prisma.ronda.create({
                data: {
                    movimientoId,
                    empresaId,
                    localidadId,
                    orden: ordenEnRonda,
                    rondaNumero: rondaAsignada
                }
            });
        }
        catch (error) {
            movimiento_logger_1.movimientoError.error("Error en crearRondaParaMovimientoBaja", {
                movimientoId, empresaId, localidadId, error
            });
            return null;
        }
    }
    /**
     * Crear ronda para movimiento ALTA (ya estaba bien, pero agregamos consistencia)
     */
    static async crearRondaParaMovimientoAlta(movimientoId, empresaId, localidadId) {
        // Para ALTAs no hay restricción de empresa, pero mantengamos consistencia
        const ordenEnRonda = await prisma.ronda.count({
            where: {
                localidadId,
                rondaNumero: 1,
                concluido: false
            }
        }) + 1;
        return await prisma.ronda.create({
            data: {
                movimientoId,
                empresaId,
                localidadId,
                orden: ordenEnRonda,
                rondaNumero: 1
            }
        });
    }
    /**
     * Método principal actualizado
     */
    static async generarRondaParaMovimiento(data) {
        try {
            if (data.prioridad === "ALTA") {
                // ALTAs siguen reorganizando todo (lógica existente)
                await this.eliminarTodasLasRondas();
                await this.crearTodasLasRondas();
                return;
            }
            // Para BAJA, usar nueva lógica que considera incidentes
            await this.limpiarYReorganizarRondasConcluidas();
            await this.crearRondaParaMovimientoBaja(data.movimientoId, data.empresaId, data.localidadId);
        }
        catch (error) {
            movimiento_logger_1.movimientoError.error("Error al generar ronda para movimiento", { data, error });
            throw new Error("Error al generar ronda para movimiento");
        }
    }
    /**
     * Método helper adicional: obtener capacidad disponible de una ronda
     */
    static async obtenerCapacidadDisponibleRonda(localidadId, rondaNumero) {
        const [total, activos, detenidos] = await Promise.all([
            // Total de movimientos en la ronda
            prisma.ronda.count({
                where: { localidadId, rondaNumero, concluido: false }
            }),
            // Movimientos activos
            prisma.ronda.count({
                where: {
                    localidadId,
                    rondaNumero,
                    concluido: false,
                    movimiento: {
                        estado: { in: ['SOLICITADO', 'EN_PROCESO'] }
                    }
                }
            }),
            // Movimientos detenidos por incidentes
            prisma.ronda.count({
                where: {
                    localidadId,
                    rondaNumero,
                    concluido: false,
                    movimiento: {
                        estado: 'DETENIDO'
                    }
                }
            })
        ]);
        const CAPACIDAD_MAXIMA = 10; // O el valor que definas
        const disponible = CAPACIDAD_MAXIMA - activos; // Solo cuenta activos
        return {
            total,
            activos,
            detenidos,
            disponible: Math.max(0, disponible)
        };
    }
    // Resto de métodos siguen igual...
    /**
     * Obtiene todas las rondas con sus relaciones.
     */
    static async obtenerRondas() {
        try {
            return await prisma.ronda.findMany({
                include: {
                    empresa: true,
                    movimiento: {
                        include: {
                            empresa: true
                        }
                    }
                },
                orderBy: [
                    { rondaNumero: "asc" },
                    { orden: "asc" }
                ]
            });
        }
        catch (error) {
            movimiento_logger_1.movimientoError.error("Error al obtener rondas", { error });
            throw new Error("Error al obtener rondas");
        }
    }
    /**
     * Elimina una ronda por su ID.
     */
    static async eliminarRonda(id) {
        try {
            return await prisma.ronda.delete({ where: { id } });
        }
        catch (error) {
            movimiento_logger_1.movimientoError.error("Error al eliminar ronda", { id, error });
            throw new Error("Error al eliminar ronda");
        }
    }
    static async obtenerRondasPorLocalidad(localidadId) {
        try {
            // 1) Detectar movimientos detenidos en esta localidad
            const detenidos = await prisma.movimiento.findMany({
                where: {
                    localidadId,
                    estado: 'DETENIDO'
                },
                select: {
                    id: true,
                    empresaId: true,
                    localidadId: true
                }
            });
            // 2) Para cada uno, forzar reorganizaci�n de rondas
            for (const mov of detenidos) {
                await IncidenteModel_1.IncidenteModel.reorganizarRondasPorIncidente(mov.empresaId, mov.localidadId, mov.id);
            }
            // 3) Ya con las rondas reordenadas, devolver el listado
            return await prisma.ronda.findMany({
                where: { localidadId },
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
                orderBy: [
                    { rondaNumero: 'asc' },
                    { orden: 'asc' }
                ]
            });
        }
        catch (error) {
            movimiento_logger_1.movimientoError.error('Error al obtener rondas por localidad', { localidadId, error });
            throw new Error('Error al obtener rondas por localidad');
        }
    }
    /**
     * Obtiene rondas por localidad y estado de conclusi�n.
     * Si detecta movimientos en ESTADO = 'DETENIDO',
     * forzar� la reorganizaci�n llamando a IncidenteModel.reorganizarRondasPorIncidente(...)
     */
    static async obtenerRondasPorLocalidadConEstado(localidadId, concluido) {
        try {
            // 1) Detectar movimientos detenidos en esta localidad
            const detenidos = await prisma.movimiento.findMany({
                where: {
                    localidadId,
                    estado: 'DETENIDO'
                },
                select: {
                    id: true,
                    empresaId: true,
                    localidadId: true
                }
            });
            // 2) Para cada uno, forzar reorganizaci�n de rondas
            for (const mov of detenidos) {
                await IncidenteModel_1.IncidenteModel.reorganizarRondasPorIncidente(mov.empresaId, mov.localidadId, mov.id);
            }
            // 3) Devolver las rondas ya reordenadas seg�n el filtro de 'concluido'
            return await prisma.ronda.findMany({
                where: { localidadId, concluido },
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
                orderBy: [
                    { rondaNumero: 'asc' },
                    { orden: 'asc' }
                ]
            });
        }
        catch (error) {
            movimiento_logger_1.movimientoError.error('Error al obtener rondas por localidad y estado', {
                localidadId,
                concluido,
                error
            });
            throw new Error('Error al obtener rondas por localidad y estado');
        }
    }
    /**
     * Obtiene el siguiente movimiento pendiente.
     */
    static async obtenerSiguienteEnRonda(localidadId) {
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
                orderBy: [
                    { rondaNumero: 'asc' },
                    { orden: 'asc' }
                ],
            });
        }
        catch (error) {
            movimiento_logger_1.movimientoError.error('Error al obtener siguiente en ronda', { localidadId, error });
            throw new Error('Error al obtener el siguiente en la ronda');
        }
    }
    /**
     * Obtiene información detallada de una ronda.
     */
    static async obtenerInfoPorRonda(id) {
        try {
            const info = await prisma.ronda.findUnique({
                where: { id },
                include: {
                    empresa: true,
                    movimiento: {
                        include: {
                            viaOrigen: true,
                            viaDestino: true
                        }
                    },
                },
            });
            if (!info)
                throw new Error(`Ronda con ID ${id} no encontrada`);
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
        }
        catch (error) {
            movimiento_logger_1.movimientoError.error('Error al obtener info de ronda', { id, error });
            throw new Error('Error al obtener info de ronda');
        }
    }
    /**
     * Marca una ronda como concluida.
     */
    static async marcarRondaComoConcluida(id) {
        try {
            const rondaActualizada = await prisma.ronda.update({
                where: { id },
                data: {
                    concluido: true,
                    updatedAt: new Date(),
                },
                include: {
                    movimiento: true
                }
            });
            // Verificar si todas las rondas con el mismo número están concluidas
            const { localidadId, rondaNumero } = rondaActualizada;
            const todasRondasDelMismoNumero = await prisma.ronda.findMany({
                where: { localidadId, rondaNumero }
            });
            const todasConcluidas = todasRondasDelMismoNumero.every(r => r.concluido === true);
            // Si todas concluidas, reorganizar
            if (todasConcluidas) {
                await this.limpiarYReorganizarRondasConcluidas();
                movimiento_logger_1.movimientoError.info(`Ronda ${rondaNumero} en localidad ${localidadId} completamente concluida`);
            }
            return rondaActualizada;
        }
        catch (error) {
            movimiento_logger_1.movimientoError.error('Error al marcar ronda como concluida', { id, error });
            throw new Error('Error al marcar ronda como concluida');
        }
    }
}
exports.RondaModel = RondaModel;
