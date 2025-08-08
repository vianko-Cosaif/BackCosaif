"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeccionViaModel = void 0;
// SeccionViaModel.ts
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// (Opcional) Errores de dominio
class NotFoundError extends Error {
}
class ConflictError extends Error {
}
class SeccionViaModel {
    static async obtenerSeccionesPorVia(viaId) {
        return prisma.seccionVia.findMany({
            where: { viaId },
            orderBy: { numero: 'asc' },
            include: { via: true, movimiento: true },
        });
    }
    static async obtenerSeccion(viaId, numero) {
        return prisma.seccionVia.findUnique({
            where: { viaId_numero: { viaId, numero } },
        });
    }
    static async asignarMovimientoASeccion(viaId, numeroSeccion, movimientoId) {
        return prisma.$transaction(async (tx) => {
            // 1) Tomamos la sección por clave compuesta
            const seccion = await tx.seccionVia.findUnique({
                where: { viaId_numero: { viaId, numero: numeroSeccion } },
                select: { id: true, ocupada: true, movimientoId: true },
            });
            if (!seccion)
                throw new NotFoundError(`Sección ${numeroSeccion} no existe en vía ${viaId}`);
            if (seccion.ocupada && seccion.movimientoId !== movimientoId) {
                throw new ConflictError(`Sección ${numeroSeccion} ya ocupada por otro movimiento`);
            }
            // 2) Verificamos estado de la vía
            const via = await tx.via.findUnique({
                where: { id: viaId },
                select: { id: true, ocupada: true, movimientoId: true },
            });
            if (!via)
                throw new NotFoundError(`Vía ${viaId} no existe`);
            if (via.movimientoId && via.movimientoId !== movimientoId) {
                throw new ConflictError(`Vía ${viaId} ocupada por otro movimiento`);
            }
            // 3) Intentamos ocupar sección condicionando que siga libre (optimistic locking)
            const updatedSection = await tx.seccionVia.updateMany({
                where: { id: seccion.id, OR: [{ ocupada: false }, { movimientoId: movimientoId }] },
                data: { ocupada: true, movimientoId },
            });
            if (updatedSection.count !== 1) {
                throw new ConflictError('La sección cambió de estado; reintenta.');
            }
            // 4) Marcamos la vía ocupada por este movimiento, solo si no lo estaba por otro
            const updatedVia = await tx.via.updateMany({
                where: {
                    id: viaId,
                    OR: [{ movimientoId: null }, { movimientoId }],
                },
                data: { ocupada: true, movimientoId },
            });
            if (updatedVia.count !== 1) {
                throw new ConflictError('La vía cambió de estado; reintenta.');
            }
            // (Opcional) devuelve el estado actualizado
            return tx.seccionVia.findUnique({
                where: { viaId_numero: { viaId, numero: numeroSeccion } },
                include: { via: true },
            });
        });
    }
    static async liberarSeccion(viaId, numeroSeccion, movimientoId) {
        return prisma.$transaction(async (tx) => {
            // 1) Liberar la sección solo si pertenece a ese movimiento
            const res = await tx.seccionVia.updateMany({
                where: {
                    viaId,
                    numero: numeroSeccion,
                    ocupada: true,
                    movimientoId,
                },
                data: { ocupada: false, movimientoId: null },
            });
            if (res.count !== 1) {
                throw new NotFoundError('La sección no estaba ocupada por ese movimiento.');
            }
            // 2) Si ya no quedan secciones ocupadas por este movimiento en la vía, libera la vía
            const quedanOcupadas = await tx.seccionVia.count({
                where: { viaId, ocupada: true, movimientoId },
            });
            if (quedanOcupadas === 0) {
                await tx.via.updateMany({
                    where: {
                        id: viaId,
                        movimientoId, // asegura liberar solo si seguía asignada a ese movimiento
                    },
                    data: { ocupada: false, movimientoId: null },
                });
            }
            return tx.seccionVia.findUnique({
                where: { viaId_numero: { viaId, numero: numeroSeccion } },
                include: { via: true },
            });
        });
    }
}
exports.SeccionViaModel = SeccionViaModel;
