"use strict";
// ViaModel.ts
/**
 * ============================================================================
 *  Ítem de información: ViaModel (Módulo de Dominio)
 *  Versión: 1.1.0
 *  Fecha: 2025-08-08
 *  Estado: Aprobado
 * ============================================================================
 *
 *  # Propósito
 *  Coordinar ocupación/liberación de vías y delegar a SeccionViaModel cuando
 *  existan secciones, manteniendo la política “la sección rige a la vía”.
 *
 *  # Política
 *  - Si la vía tiene **≥1 secciones**: NUNCA escribir directamente `via.ocupada`
 *    ni `via.movimientoId`; delegar a SeccionViaModel (que sincroniza la vía).
 *  - Si la vía tiene **0 secciones**: la vía es “simple”, se escribe directo.
 *
 *  # Notas
 *  - En asignación, si hay secciones y no se pasa `numeroSeccion`, toma la
 *    **primera sección libre**; si no hay libres → ConflictError.
 *  - `editarVia` filtra cambios a `ocupada/movimientoId` si hay secciones.
 * ============================================================================
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViaModel = void 0;
const client_1 = require("@prisma/client");
const via_logger_1 = require("./via.logger");
const SeccionViasModel_1 = require("./Secciones/SeccionViasModel");
const prisma = new client_1.PrismaClient(); // TODO: inyectar singleton
class ViaModel {
    // -------------------- Helpers --------------------
    static async contarSecciones(viaId) {
        return prisma.seccionVia.count({ where: { viaId } });
    }
    /** Devuelve el número de la primera sección libre (o null si ninguna). */
    static async primeraSeccionLibre(viaId) {
        const libre = await prisma.seccionVia.findFirst({
            where: { viaId, ocupada: false },
            orderBy: { numero: 'asc' },
            select: { numero: true },
        });
        return libre?.numero ?? null;
    }
    // -------------------- Ocupación / Liberación --------------------
    /**
     * Asignar movimiento:
     * - 0 secciones -> ocupa la vía completa.
     * - ≥1 secciones -> delega a SeccionViaModel (elige sección si no se pasa).
     */
    static async asignarMovimientoASeccion(viaId, numeroSeccion, movimientoId) {
        try {
            const via = await prisma.via.findUnique({ where: { id: viaId }, select: { id: true } });
            if (!via)
                throw new SeccionViasModel_1.NotFoundError(`Vía ${viaId} no existe`);
            const seccionesCount = await this.contarSecciones(viaId);
            // Vía simple (0 secciones): escribir directo en Via
            if (seccionesCount === 0) {
                return await prisma.$transaction(async (tx) => {
                    const actual = await tx.via.findUnique({
                        where: { id: viaId },
                        select: { ocupada: true, movimientoId: true },
                    });
                    if (actual?.movimientoId && actual.movimientoId !== movimientoId) {
                        throw new SeccionViasModel_1.ConflictError(`Vía ${viaId} ya está asignada a otro movimiento.`);
                    }
                    const updated = await tx.via.updateMany({
                        where: { id: viaId, OR: [{ movimientoId: null }, { movimientoId }] },
                        data: { ocupada: true, movimientoId },
                    });
                    if (updated.count !== 1)
                        throw new SeccionViasModel_1.ConflictError('La vía cambió de estado; reintenta.');
                    return tx.via.findUnique({ where: { id: viaId }, include: { movimiento: true } });
                });
            }
            // Vía con secciones (≥1): delegar a SeccionViaModel
            let targetSeccion = numeroSeccion ?? null;
            if (targetSeccion == null) {
                targetSeccion = await this.primeraSeccionLibre(viaId);
                if (targetSeccion == null) {
                    throw new SeccionViasModel_1.ConflictError(`La vía ${viaId} no tiene secciones libres.`);
                }
            }
            return await SeccionViasModel_1.SeccionViaModel.asignarMovimientoASeccion(viaId, targetSeccion, movimientoId);
        }
        catch (error) {
            via_logger_1.viaError.error('Error en asignarMovimientoASeccion', { error, viaId, numeroSeccion, movimientoId });
            throw error;
        }
    }
    /**
     * Liberar movimiento:
     * - 0 secciones -> libera la vía completa si pertenece al movimiento.
     * - ≥1 secciones -> delega a SeccionViaModel.liberarMovimientoDeSeccion (libera todas las secciones del movimiento).
     */
    static async liberarMovimientoDeSeccion(viaId, movimientoId) {
        try {
            const viaExiste = await prisma.via.findUnique({ where: { id: viaId }, select: { id: true } });
            if (!viaExiste)
                throw new SeccionViasModel_1.NotFoundError(`Vía ${viaId} no existe`);
            const seccionesCount = await this.contarSecciones(viaId);
            if (seccionesCount === 0) {
                return await prisma.$transaction(async (tx) => {
                    const updated = await tx.via.updateMany({
                        where: { id: viaId, movimientoId },
                        data: { ocupada: false, movimientoId: null },
                    });
                    if (updated.count !== 1) {
                        throw new SeccionViasModel_1.NotFoundError('La vía no estaba ocupada por ese movimiento.');
                    }
                    return tx.via.findUnique({ where: { id: viaId } });
                });
            }
            // Con secciones: delega (la vía se sincroniza dentro de ese flujo)
            return await SeccionViasModel_1.SeccionViaModel.liberarMovimientoDeSeccion(viaId, movimientoId);
        }
        catch (error) {
            via_logger_1.viaError.error('Error en liberarMovimientoDeSeccion', { error, viaId, movimientoId });
            throw error;
        }
    }
    // -------------------- CRUD y consultas --------------------
    /** Listado de vías (con secciones ordenadas y relaciones útiles). */
    static async obtenerVias() {
        try {
            return await prisma.via.findMany({
                orderBy: [{ localidadId: 'asc' }, { numero: 'asc' }],
                include: {
                    localidad: true,
                    movimiento: true,
                    secciones: { orderBy: { numero: 'asc' }, include: { movimiento: true } },
                    movimientosOrigen: true,
                    movimientosDestino: true,
                },
            });
        }
        catch (error) {
            via_logger_1.viaError.error('Error al obtener vías', { error });
            throw error;
        }
    }
    static async crearVia(numero, nombre, localidadId) {
        try {
            return await prisma.via.create({ data: { numero, nombre, localidadId } });
        }
        catch (error) {
            via_logger_1.viaError.error('Error al crear vía', { error, numero, nombre, localidadId });
            throw error;
        }
    }
    /**
     * Edita una vía.
     * Si la vía tiene secciones, **ignora** cambios a `ocupada` y `movimientoId`
     * para no romper la coherencia (la sección rige el estado).
     */
    static async editarVia(id, data) {
        try {
            const seccionesCount = await this.contarSecciones(id);
            const payload = { ...data };
            if (seccionesCount > 0) {
                // No permitir que se editen estos campos cuando hay secciones
                if ('ocupada' in payload)
                    delete payload.ocupada;
                if ('movimientoId' in payload)
                    delete payload.movimientoId;
            }
            return await prisma.via.update({ where: { id }, data: payload });
        }
        catch (error) {
            via_logger_1.viaError.error('Error al editar vía', { error, id, data });
            throw error;
        }
    }
    static async eliminarVia(id) {
        try {
            return await prisma.via.delete({ where: { id } });
        }
        catch (error) {
            via_logger_1.viaError.error('Error al eliminar vía', { error, id });
            throw error;
        }
    }
    static async obtenerViasPorLocalidad(localidadId) {
        try {
            return await prisma.via.findMany({
                where: { localidadId },
                orderBy: { numero: 'asc' },
                include: {
                    localidad: true,
                    movimiento: true,
                    secciones: { orderBy: { numero: 'asc' }, include: { movimiento: true } },
                    movimientosOrigen: true,
                    movimientosDestino: true,
                },
            });
        }
        catch (error) {
            via_logger_1.viaError.error('Error al obtener vías por localidad', { error, localidadId });
            throw error;
        }
    }
    static async obtenerViaPorId(id) {
        try {
            return await prisma.via.findUnique({
                where: { id },
                include: {
                    localidad: true,
                    movimiento: true,
                    secciones: { orderBy: { numero: 'asc' }, include: { movimiento: true } },
                    movimientosOrigen: true,
                    movimientosDestino: true,
                },
            });
        }
        catch (error) {
            via_logger_1.viaError.error('Error al obtener vía por id', { error, id });
            throw error;
        }
    }
}
exports.ViaModel = ViaModel;
