"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViaModel = void 0;
const client_1 = require("@prisma/client");
const via_logger_1 = require("./via.logger");
const SeccionViasModel_1 = require("./Secciones/SeccionViasModel");
const prisma = new client_1.PrismaClient(); // idealmente inyectar singleton
class NotFoundError extends Error {
}
class ConflictError extends Error {
}
class ViaModel {
    // Helper: contar secciones reales configuradas para la vía
    static async contarSecciones(viaId) {
        return prisma.seccionVia.count({ where: { viaId } });
    }
    /**
     * Regla:
     * - Si la vía NO tiene secciones configuradas (0) => se ocupa la vía completa.
     * - Si la vía tiene 2 o más secciones => se requiere numeroSeccion (1..N).
     *   (Si hubiera exactamente 1 por error de datos, se trata como “vía simple”).
     */
    static async asignarMovimientoASeccion(viaId, numeroSeccion, movimientoId) {
        try {
            const via = await prisma.via.findUnique({
                where: { id: viaId },
                select: { id: true },
            });
            if (!via)
                throw new NotFoundError(`Vía ${viaId} no existe`);
            const seccionesCount = await this.contarSecciones(viaId);
            // Vía “simple” (0 o 1 secciones registradas) => ocupar vía completa
            if (seccionesCount <= 1) {
                return await prisma.$transaction(async (tx) => {
                    const actual = await tx.via.findUnique({
                        where: { id: viaId },
                        select: { ocupada: true, movimientoId: true },
                    });
                    if (actual?.movimientoId && actual.movimientoId !== movimientoId) {
                        throw new ConflictError(`Vía ${viaId} ya está asignada a otro movimiento.`);
                    }
                    const updated = await tx.via.updateMany({
                        where: { id: viaId, OR: [{ movimientoId: null }, { movimientoId }] },
                        data: { ocupada: true, movimientoId },
                    });
                    if (updated.count !== 1)
                        throw new ConflictError('La vía cambió de estado; reintenta.');
                    return tx.via.findUnique({
                        where: { id: viaId },
                        include: { movimiento: true },
                    });
                });
            }
            // Vía con 2+ secciones => exigir numeroSeccion válido
            if (numeroSeccion == null) {
                throw new NotFoundError('Debes proporcionar numeroSeccion (la vía tiene secciones).');
            }
            if (numeroSeccion < 1 || numeroSeccion > seccionesCount) {
                throw new NotFoundError(`numeroSeccion fuera de rango (1..${seccionesCount}) para vía ${viaId}.`);
            }
            // Delegar a SeccionViaModel cuando hay secciones
            return await SeccionViasModel_1.SeccionViaModel.asignarMovimientoASeccion(viaId, numeroSeccion, movimientoId);
        }
        catch (error) {
            via_logger_1.viaError.error('Error en asignarMovimientoASeccion', { error, viaId, numeroSeccion, movimientoId });
            throw error;
        }
    }
    /**
     * Libera el movimiento:
     * - Vía “simple” => libera vía completa (si pertenece a ese movimiento).
     * - Vía con secciones (2+) => delega en SeccionViaModel.liberarMovimientoDeSeccion
     *   (ahí puedes liberar 1 sección o todas las del movimiento según tu API).
     */
    static async liberarMovimientoDeSeccion(viaId, movimientoId) {
        try {
            const viaExiste = await prisma.via.findUnique({
                where: { id: viaId },
                select: { id: true },
            });
            if (!viaExiste)
                throw new NotFoundError(`Vía ${viaId} no existe`);
            const seccionesCount = await this.contarSecciones(viaId);
            // Vía simple
            if (seccionesCount <= 1) {
                return await prisma.$transaction(async (tx) => {
                    const updated = await tx.via.updateMany({
                        where: { id: viaId, movimientoId },
                        data: { ocupada: false, movimientoId: null },
                    });
                    if (updated.count !== 1) {
                        throw new NotFoundError('La vía no estaba ocupada por ese movimiento.');
                    }
                    return tx.via.findUnique({ where: { id: viaId } });
                });
            }
            // Vía con secciones => delega (puedes exponer variantes: liberarSeccion() o liberarTodasPorMovimiento())
            return await SeccionViasModel_1.SeccionViaModel.liberarMovimientoDeSeccion(viaId, movimientoId);
        }
        catch (error) {
            via_logger_1.viaError.error('Error en liberarMovimientoDeSeccion', { error, viaId, movimientoId });
            throw error;
        }
    }
    /** Listado de vías */
    static async obtenerVias() {
        try {
            return await prisma.via.findMany({
                orderBy: [{ localidadId: 'asc' }, { numero: 'asc' }],
                include: {
                    localidad: true,
                    movimiento: true,
                    secciones: {
                        orderBy: { numero: 'asc' },
                        include: { movimiento: true },
                    },
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
    static async editarVia(id, data) {
        try {
            return await prisma.via.update({ where: { id }, data });
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
                    secciones: {
                        orderBy: { numero: 'asc' },
                        include: { movimiento: true },
                    },
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
                    secciones: {
                        orderBy: { numero: 'asc' },
                        include: { movimiento: true },
                    },
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
