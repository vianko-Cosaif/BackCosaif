"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViaModel = void 0;
const client_1 = require("@prisma/client");
const via_logger_1 = require("./via.logger"); // Asegúrate de tener un logger configurado
const prisma = new client_1.PrismaClient();
class ViaModel {
    /**
     * Obtiene todas las vías.
     */
    static async obtenerVias() {
        try {
            return await prisma.via.findMany({
                include: {
                    localidad: true,
                    movimientosOrigen: true,
                    movimientosDestino: true,
                },
            });
        }
        catch (error) {
            via_logger_1.viaError.error('Error al obtener vías', { error });
            throw new Error('Error al obtener vías');
        }
    }
    /**
     * Crea una nueva vía.
     * @param numero - Número de la vía.
     * @param nombre - Nombre de la vía.
     * @param localidadId - ID de la localidad asociada.
     */
    static async crearVia(numero, nombre, localidadId) {
        try {
            return await prisma.via.create({
                data: { numero, nombre, localidadId },
            });
        }
        catch (error) {
            via_logger_1.viaError.error('Error al crear vía', { error, numero, nombre, localidadId });
            throw new Error('Error al crear vía');
        }
    }
    /**
     * Edita una vía existente.
     * @param id - ID de la vía a editar.
     * @param data - Datos a actualizar (pueden ser numero, nombre o localidadId).
     */
    static async editarVia(id, data) {
        try {
            return await prisma.via.update({
                where: { id },
                data,
            });
        }
        catch (error) {
            via_logger_1.viaError.error('Error al editar vía', { error, id, data });
            throw new Error('Error al editar vía');
        }
    }
    /**
     * Elimina una vía por su ID.
     * @param id - ID de la vía a eliminar.
     */
    static async eliminarVia(id) {
        try {
            return await prisma.via.delete({
                where: { id },
            });
        }
        catch (error) {
            via_logger_1.viaError.error('Error al eliminar vía', { error, id });
            throw new Error('Error al eliminar vía');
        }
    }
    /**
     * Busca todas las vías por el ID de la localidad.
     * @param localidadId - ID de la localidad a filtrar.
     */
    static async obtenerViasPorLocalidad(localidadId) {
        try {
            return await prisma.via.findMany({
                where: { localidadId },
                include: {
                    localidad: true,
                    movimientosOrigen: true,
                    movimientosDestino: true,
                },
            });
        }
        catch (error) {
            via_logger_1.viaError.error('Error al obtener vías por localidad', { error, localidadId });
            throw new Error('Error al obtener vías por localidad');
        }
    }
}
exports.ViaModel = ViaModel;
