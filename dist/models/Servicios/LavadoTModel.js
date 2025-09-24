"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LavadoTModel = void 0;
// src/models/Servicios/LavadoTModel.ts
const client_1 = require("@prisma/client");
const movimiento_logger_1 = require("../Movimientos/movimiento.logger");
const prisma = global.__PRISMA__ ?? new client_1.PrismaClient();
if (process.env.NODE_ENV !== 'production')
    global.__PRISMA__ = prisma;
const MOV_MIN_SELECT = {
    id: true, empresaId: true, localidadId: true, locomotiveNumber: true, prioridad: true, operadorId: true,
};
function whereFromOpts(opts) {
    const mov = {};
    if (opts?.empresaId)
        mov.empresaId = opts.empresaId;
    if (opts?.localidadId)
        mov.localidadId = opts.localidadId;
    const where = {};
    if (opts?.movimientoId)
        where.movimientoId = opts.movimientoId;
    if (Object.keys(mov).length)
        where.movimiento = { is: mov };
    return where;
}
class LavadoTModel {
    /** Crear registro de LavadoT (requiere localidadId del movimiento). */
    static async crear(input) {
        const { movimientoId, status, inicio = null, fin = null } = input;
        try {
            const mov = await prisma.movimiento.findUnique({
                where: { id: movimientoId },
                select: { id: true, localidadId: true },
            });
            if (!mov)
                throw new Error(`Movimiento ${movimientoId} no existe`);
            if (inicio && fin && fin < inicio)
                throw new Error('fin no puede ser anterior a inicio');
            return await prisma.lavadoT.create({
                data: {
                    movimientoId,
                    localidadId: mov.localidadId,
                    status: status ?? client_1.ServicioEstado.DETENIDO,
                    inicio,
                    fin,
                },
            });
        }
        catch (error) {
            movimiento_logger_1.movimientoError.error('Error creando LavadoT', { movimientoId, input, errName: error?.name, errMsg: error?.message, prismaCode: error?.code, prismaMeta: error?.meta });
            throw new Error('Error al crear registro de lavado');
        }
    }
    /** Crear en blanco (status por defecto DETENIDO). */
    static async crearEnBlanco(movimientoId, status) {
        try {
            const mov = await prisma.movimiento.findUnique({
                where: { id: movimientoId },
                select: { id: true, localidadId: true },
            });
            if (!mov)
                throw new Error(`Movimiento ${movimientoId} no existe`);
            return await prisma.lavadoT.create({
                data: {
                    movimientoId,
                    localidadId: mov.localidadId,
                    status: status ?? client_1.ServicioEstado.DETENIDO,
                    inicio: null,
                    fin: null,
                },
            });
        }
        catch (error) {
            movimiento_logger_1.movimientoError.error('Error creando LavadoT en blanco', { movimientoId, status, errName: error?.name, errMsg: error?.message, prismaCode: error?.code, prismaMeta: error?.meta });
            throw new Error('Error al crear registro de lavado en blanco');
        }
    }
    /** Editar campos. */
    static async editar(id, input) {
        try {
            const actual = await prisma.lavadoT.findUnique({ where: { id } });
            if (!actual)
                throw new Error(`LavadoT ${id} no existe`);
            const inicio = input.inicio === undefined ? actual.inicio : input.inicio;
            const fin = input.fin === undefined ? actual.fin : input.fin;
            if (inicio && fin && fin < inicio)
                throw new Error('fin no puede ser anterior a inicio');
            return await prisma.lavadoT.update({
                where: { id },
                data: {
                    status: input.status ?? actual.status,
                    inicio,
                    fin,
                },
            });
        }
        catch (error) {
            movimiento_logger_1.movimientoError.error('Error editando LavadoT', { id, input, errName: error?.name, errMsg: error?.message, prismaCode: error?.code, prismaMeta: error?.meta });
            throw new Error('Error al editar registro de lavado');
        }
    }
    /** Iniciar (marca EN_SERVICIO, setea inicio si no existe y opcionalmente asigna operador al movimiento). */
    static async iniciar(id, usuarioId, inicio) {
        try {
            return await prisma.$transaction(async (tx) => {
                const row = await tx.lavadoT.findUnique({ where: { id }, include: { movimiento: { select: MOV_MIN_SELECT } } });
                if (!row)
                    throw new Error(`LavadoT ${id} no existe`);
                if (row.status === client_1.ServicioEstado.FINALIZADO)
                    throw new Error('No se puede iniciar: ya finalizado');
                const when = inicio ?? new Date();
                const up = await tx.lavadoT.update({
                    where: { id },
                    data: {
                        status: client_1.ServicioEstado.EN_SERVICIO,
                        inicio: row.inicio ?? when,
                        fin: row.fin && row.fin < when ? null : row.fin,
                    },
                });
                if (usuarioId) {
                    await tx.movimiento.update({ where: { id: row.movimientoId }, data: { operadorId: usuarioId } });
                }
                return up;
            });
        }
        catch (error) {
            movimiento_logger_1.movimientoError.error('Error iniciando LavadoT', { id, usuarioId, errName: error?.name, errMsg: error?.message });
            throw new Error('Error al iniciar el lavado');
        }
    }
    /** Finalizar (marca FINALIZADO y setea fin). */
    static async finalizar(id, fin) {
        try {
            return await prisma.$transaction(async (tx) => {
                const row = await tx.lavadoT.findUnique({ where: { id } });
                if (!row)
                    throw new Error(`LavadoT ${id} no existe`);
                if (row.status === client_1.ServicioEstado.FINALIZADO)
                    return row;
                const when = fin ?? new Date();
                const inicio = row.inicio ?? when; // si nunca se marcó inicio, igualarlo a fin
                return await tx.lavadoT.update({
                    where: { id },
                    data: { status: client_1.ServicioEstado.FINALIZADO, inicio, fin: when },
                });
            });
        }
        catch (error) {
            movimiento_logger_1.movimientoError.error('Error finalizando LavadoT', { id, errName: error?.name, errMsg: error?.message });
            throw new Error('Error al finalizar el lavado');
        }
    }
    /** Asignar operador (usuario) al movimiento dueño del LavadoT. */
    static async asignarOperador(id, usuarioId) {
        const row = await prisma.lavadoT.findUnique({ where: { id }, select: { movimientoId: true } });
        if (!row)
            throw new Error(`LavadoT ${id} no existe`);
        await prisma.movimiento.update({ where: { id: row.movimientoId }, data: { operadorId: usuarioId } });
    }
    /** Listar EN_SERVICIO (con filtros). */
    static async listarEnServicio(opts = {}) {
        try {
            const where = { ...whereFromOpts(opts), status: client_1.ServicioEstado.EN_SERVICIO };
            return await prisma.lavadoT.findMany({
                where,
                include: { movimiento: { select: MOV_MIN_SELECT } },
                orderBy: [{ movimiento: { prioridad: 'desc' } }, { createdAt: 'asc' }],
            });
        }
        catch (error) {
            movimiento_logger_1.movimientoError.error('Error listando LavadoT EN_SERVICIO', { opts, errName: error?.name, errMsg: error?.message });
            throw new Error('Error al listar lavados en servicio');
        }
    }
    /** Lista que NO están EN_SERVICIO NI FINALIZADO (pendientes). */
    static async listarNoEnProceso(opts = {}) {
        try {
            const where = {
                ...whereFromOpts(opts),
                status: { notIn: [client_1.ServicioEstado.EN_SERVICIO, client_1.ServicioEstado.FINALIZADO] },
            };
            return await prisma.lavadoT.findMany({
                where,
                include: { movimiento: { select: MOV_MIN_SELECT } },
                orderBy: [{ movimiento: { prioridad: 'desc' } }, { createdAt: 'asc' }],
            });
        }
        catch (error) {
            movimiento_logger_1.movimientoError.error('Error listando LavadoT no en proceso', { opts, errName: error?.name, errMsg: error?.message });
            throw new Error('Error al listar lavados pendientes');
        }
    }
    /** Paginado con filtros y status opcional. */
    static async listarPaginado(opts = {}) {
        const page = Math.max(1, opts.page ?? 1);
        const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
        const base = whereFromOpts(opts);
        const where = { ...base };
        if (opts.status === 'PENDIENTES')
            where.status = { notIn: [client_1.ServicioEstado.EN_SERVICIO, client_1.ServicioEstado.FINALIZADO] };
        else if (opts.status)
            where.status = opts.status;
        const [total, items] = await prisma.$transaction([
            prisma.lavadoT.count({ where }),
            prisma.lavadoT.findMany({
                where,
                include: { movimiento: { select: MOV_MIN_SELECT } },
                orderBy: [{ movimiento: { prioridad: 'desc' } }, { createdAt: 'asc' }],
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
        ]);
        return { items, total, page, pageSize, hasMore: page * pageSize < total };
    }
    /** Siguientes para iniciar (máx `limit`, default 2). */
    static async siguientesParaIniciar(opts = {}) {
        const limit = Math.min(10, Math.max(1, opts.limit ?? 2));
        const where = {
            ...whereFromOpts(opts),
            status: { notIn: [client_1.ServicioEstado.EN_SERVICIO, client_1.ServicioEstado.FINALIZADO] },
        };
        return prisma.lavadoT.findMany({
            where,
            include: { movimiento: { select: MOV_MIN_SELECT } },
            orderBy: [{ movimiento: { prioridad: 'desc' } }, { createdAt: 'asc' }],
            take: limit,
        });
    }
    /** Obtener por id. */
    static async obtener(id) {
        try {
            const row = await prisma.lavadoT.findUnique({ where: { id } });
            if (!row)
                throw new Error(`LavadoT ${id} no existe`);
            return row;
        }
        catch (error) {
            movimiento_logger_1.movimientoError.error('Error obteniendo LavadoT', { id, errName: error?.name, errMsg: error?.message, prismaCode: error?.code, prismaMeta: error?.meta });
            throw new Error('Error al obtener registro de lavado');
        }
    }
}
exports.LavadoTModel = LavadoTModel;
