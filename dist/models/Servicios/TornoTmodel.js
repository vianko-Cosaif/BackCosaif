"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TornoTModel = void 0;
// src/models/Servicios/TornoTModel.ts
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
class TornoTModel {
    /** Crear registro de TornoT (requiere localidadId del movimiento). */
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
            return await prisma.tornoT.create({
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
            movimiento_logger_1.movimientoError.error('Error creando TornoT', { movimientoId, input, errName: error?.name, errMsg: error?.message, prismaCode: error?.code, prismaMeta: error?.meta });
            throw new Error('Error al crear registro de torno');
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
            return await prisma.tornoT.create({
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
            movimiento_logger_1.movimientoError.error('Error creando TornoT en blanco', { movimientoId, status, errName: error?.name, errMsg: error?.message, prismaCode: error?.code, prismaMeta: error?.meta });
            throw new Error('Error al crear registro de torno en blanco');
        }
    }
    /** Editar campos. */
    static async editar(id, input) {
        try {
            const actual = await prisma.tornoT.findUnique({ where: { id } });
            if (!actual)
                throw new Error(`TornoT ${id} no existe`);
            const inicio = input.inicio === undefined ? actual.inicio : input.inicio;
            const fin = input.fin === undefined ? actual.fin : input.fin;
            if (inicio && fin && fin < inicio)
                throw new Error('fin no puede ser anterior a inicio');
            return await prisma.tornoT.update({
                where: { id },
                data: {
                    status: input.status ?? actual.status,
                    inicio,
                    fin,
                },
            });
        }
        catch (error) {
            movimiento_logger_1.movimientoError.error('Error editando TornoT', { id, input, errName: error?.name, errMsg: error?.message, prismaCode: error?.code, prismaMeta: error?.meta });
            throw new Error('Error al editar registro de torno');
        }
    }
    /** Iniciar (marca EN_SERVICIO; setea inicio si no existe; opcional: asigna operador). */
    static async iniciar(id, usuarioId, inicio) {
        try {
            return await prisma.$transaction(async (tx) => {
                const row = await tx.tornoT.findUnique({ where: { id }, include: { movimiento: { select: MOV_MIN_SELECT } } });
                if (!row)
                    throw new Error(`TornoT ${id} no existe`);
                if (row.status === client_1.ServicioEstado.FINALIZADO)
                    throw new Error('No se puede iniciar: ya finalizado');
                const when = inicio ?? new Date();
                const up = await tx.tornoT.update({
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
            movimiento_logger_1.movimientoError.error('Error iniciando TornoT', { id, usuarioId, errName: error?.name, errMsg: error?.message });
            throw new Error('Error al iniciar el torno');
        }
    }
    /** Finalizar (marca FINALIZADO y setea fin). */
    static async finalizar(id, fin) {
        try {
            return await prisma.$transaction(async (tx) => {
                const row = await tx.tornoT.findUnique({ where: { id } });
                if (!row)
                    throw new Error(`TornoT ${id} no existe`);
                if (row.status === client_1.ServicioEstado.FINALIZADO)
                    return row;
                const when = fin ?? new Date();
                const inicio = row.inicio ?? when;
                return await tx.tornoT.update({
                    where: { id },
                    data: { status: client_1.ServicioEstado.FINALIZADO, inicio, fin: when },
                });
            });
        }
        catch (error) {
            movimiento_logger_1.movimientoError.error('Error finalizando TornoT', { id, errName: error?.name, errMsg: error?.message });
            throw new Error('Error al finalizar el torno');
        }
    }
    /** Asignar operador (usuario) al movimiento dueño del TornoT. */
    static async asignarOperador(id, usuarioId) {
        const row = await prisma.tornoT.findUnique({ where: { id }, select: { movimientoId: true } });
        if (!row)
            throw new Error(`TornoT ${id} no existe`);
        await prisma.movimiento.update({ where: { id: row.movimientoId }, data: { operadorId: usuarioId } });
    }
    /** EN_SERVICIO → devuelve SOLO UNO (el primero por prioridad/antigüedad). */
    static async enServicioUno(opts = {}) {
        try {
            const where = { ...whereFromOpts(opts), status: client_1.ServicioEstado.EN_SERVICIO };
            return await prisma.tornoT.findFirst({
                where,
                include: { movimiento: { select: MOV_MIN_SELECT } },
                orderBy: [{ movimiento: { prioridad: 'desc' } }, { createdAt: 'asc' }],
            });
        }
        catch (error) {
            movimiento_logger_1.movimientoError.error('Error obteniendo TornoT EN_SERVICIO (uno)', { opts, errName: error?.name, errMsg: error?.message });
            throw new Error('Error al obtener torno en servicio');
        }
    }
    /** Listar EN_SERVICIO (por si necesitas arreglo). */
    static async listarEnServicio(opts = {}) {
        try {
            const where = { ...whereFromOpts(opts), status: client_1.ServicioEstado.EN_SERVICIO };
            return await prisma.tornoT.findMany({
                where,
                include: { movimiento: { select: MOV_MIN_SELECT } },
                orderBy: [{ movimiento: { prioridad: 'desc' } }, { createdAt: 'asc' }],
            });
        }
        catch (error) {
            movimiento_logger_1.movimientoError.error('Error listando TornoT EN_SERVICIO', { opts, errName: error?.name, errMsg: error?.message });
            throw new Error('Error al listar tornos en servicio');
        }
    }
    /** Pendientes (NO EN_SERVICIO NI FINALIZADO). */
    static async listarNoEnProceso(opts = {}) {
        try {
            const where = {
                ...whereFromOpts(opts),
                status: { notIn: [client_1.ServicioEstado.EN_SERVICIO, client_1.ServicioEstado.FINALIZADO] },
            };
            return await prisma.tornoT.findMany({
                where,
                include: { movimiento: { select: MOV_MIN_SELECT } },
                orderBy: [{ movimiento: { prioridad: 'desc' } }, { createdAt: 'asc' }],
            });
        }
        catch (error) {
            movimiento_logger_1.movimientoError.error('Error listando TornoT no en proceso', { opts, errName: error?.name, errMsg: error?.message });
            throw new Error('Error al listar tornos pendientes');
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
            prisma.tornoT.count({ where }),
            prisma.tornoT.findMany({
                where,
                include: { movimiento: { select: MOV_MIN_SELECT } },
                orderBy: [{ movimiento: { prioridad: 'desc' } }, { createdAt: 'asc' }],
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
        ]);
        return { items, total, page, pageSize, hasMore: page * pageSize < total };
    }
    /** Siguiente para iniciar (SOLO UNO). */
    static async siguienteParaIniciar(opts = {}) {
        const where = {
            ...whereFromOpts(opts),
            status: { notIn: [client_1.ServicioEstado.EN_SERVICIO, client_1.ServicioEstado.FINALIZADO] },
        };
        return prisma.tornoT.findFirst({
            where,
            include: { movimiento: { select: MOV_MIN_SELECT } },
            orderBy: [{ movimiento: { prioridad: 'desc' } }, { createdAt: 'asc' }],
        });
    }
    /** Obtener por id. */
    static async obtener(id) {
        try {
            const row = await prisma.tornoT.findUnique({ where: { id } });
            if (!row)
                throw new Error(`TornoT ${id} no existe`);
            return row;
        }
        catch (error) {
            movimiento_logger_1.movimientoError.error('Error obteniendo TornoT', { id, errName: error?.name, errMsg: error?.message, prismaCode: error?.code, prismaMeta: error?.meta });
            throw new Error('Error al obtener registro de torno');
        }
    }
}
exports.TornoTModel = TornoTModel;
