"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RondaModel = void 0;
const movimiento_logger_1 = require("../movimiento.logger");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class RondaModel {
    // =============== HELPERS DE CONSULTA =================
    /** ¿Hay ALTAS activas (SOLICITADO) en esta localidad? */
    static async hayAltas(localidadId, tx = prisma) {
        const c = await tx.ronda.count({
            where: {
                localidadId,
                concluido: false,
                movimiento: { prioridad: 'ALTA' }
            }
        });
        return c > 0;
    }
    /** BORRA todas las rondas (uso del controller) */
    static async eliminarTodasLasRondas() {
        await prisma.ronda.deleteMany({});
    }
    /** Recalcula TODA la ronda desde cero (inteligente) y devuelve el resultado */
    static async generarRondaInteligente() {
        await this.crearTodasLasRondas(); // usa tu método privado
        return this.obtenerRondas(); // devuelve ya ordenado
    }
    /** Ordena FIFO las ALTAS de ronda 1 por movimiento.createdAt */
    static async reordenarAltaFIFO(localidadId, tx = prisma) {
        const altas = await tx.ronda.findMany({
            where: { localidadId, rondaNumero: 1, concluido: false, movimiento: { prioridad: 'ALTA' } },
            include: { movimiento: { select: { createdAt: true } } },
            orderBy: [{ movimiento: { createdAt: 'asc' } }]
        });
        for (let i = 0; i < altas.length; i++) {
            const orden = i + 1;
            if (altas[i].orden !== orden) {
                await tx.ronda.update({ where: { id: altas[i].id }, data: { orden } });
            }
        }
    }
    /** Primera ronda disponible donde la empresa NO participa (para BAJA) */
    static async primeraRondaDisponibleParaBaja(localidadId, empresaId, tx = prisma) {
        const existenAltas = await this.hayAltas(localidadId, tx);
        let r = existenAltas ? 2 : 1;
        // Buscamos la primera ronda donde NO esté esta empresa
        for (let steps = 0; steps < 200; steps++) {
            const yaEsta = await tx.ronda.count({
                where: { localidadId, rondaNumero: r, concluido: false, empresaId }
            });
            if (yaEsta === 0)
                return r;
            r++;
        }
        // Fallback extremo
        const max = await tx.ronda.aggregate({
            where: { localidadId, concluido: false },
            _max: { rondaNumero: true }
        });
        return (max._max.rondaNumero ?? 0) + 1;
    }
    /** Inserta en (rondaNumero, orden) desplazando a la derecha */
    static async insertarEnPosicion(tx, localidadId, rondaNumero, orden, data) {
        // Desplazar a la derecha >= orden
        await tx.ronda.updateMany({
            where: { localidadId, rondaNumero, concluido: false, orden: { gte: orden } },
            data: { orden: { increment: 1 } }
        });
        return tx.ronda.create({
            data: {
                ...data,
                localidadId,
                rondaNumero,
                orden
            }
        });
    }
    /** Mueve una ronda (fila) a otra ronda/orden ajustando huecos y desplazamientos */
    static async moverRonda(tx, ronda, toRondaNumero, toOrden) {
        const { localidadId, rondaNumero: fromRonda, orden: fromOrden, id } = ronda;
        // 1) cerrar hueco en origen
        await tx.ronda.updateMany({
            where: {
                localidadId,
                rondaNumero: fromRonda,
                concluido: false,
                orden: { gt: fromOrden }
            },
            data: { orden: { decrement: 1 } }
        });
        // 2) abrir hueco en destino
        await tx.ronda.updateMany({
            where: {
                localidadId,
                rondaNumero: toRondaNumero,
                concluido: false,
                orden: { gte: toOrden }
            },
            data: { orden: { increment: 1 } }
        });
        // 3) mover
        await tx.ronda.update({
            where: { id },
            data: { rondaNumero: toRondaNumero, orden: toOrden }
        });
    }
    /** Tamaño actual de una ronda (abierta) */
    static async tamanoDeRonda(tx, localidadId, rondaNumero) {
        return tx.ronda.count({
            where: { localidadId, rondaNumero, concluido: false }
        });
    }
    /** Promueve el primer BAJA de ronda 2 a ronda 1 (si existe), a pos 1 */
    static async promoverPrimerBajaARonda1(localidadId, tx = prisma) {
        const baja = await tx.ronda.findFirst({
            where: {
                localidadId,
                rondaNumero: 2,
                concluido: false,
                movimiento: { prioridad: 'BAJA' }
            },
            orderBy: { orden: 'asc' }
        });
        if (!baja)
            return;
        // mover baja a ronda 1 pos 1
        await this.moverRonda(tx, baja, 1, 1);
    }
    /** Compacta rondas: respeta grupos por ronda y elimina huecos 1..N */
    static async recomponerRondasLocalidad(localidadId, tx = prisma) {
        // Borra concluidas
        await tx.ronda.deleteMany({ where: { localidadId, concluido: true } });
        // Obtener lista de rondaNumero distintos ordenados
        const grupos = await tx.ronda.findMany({
            where: { localidadId, concluido: false },
            select: { rondaNumero: true },
            distinct: ['rondaNumero'],
            orderBy: { rondaNumero: 'asc' }
        });
        // Map old->new (1..k)
        let idx = 1;
        for (const g of grupos) {
            if (g.rondaNumero !== idx) {
                await tx.ronda.updateMany({
                    where: { localidadId, rondaNumero: g.rondaNumero },
                    data: { rondaNumero: idx }
                });
            }
            idx++;
        }
    }
    // =============== GENERACIÓN / CREACIÓN =================
    /** Construye TODA la grilla desde cero respetando reglas */
    static async crearTodasLasRondas() {
        return prisma.$transaction(async (tx) => {
            // Limpiar
            await tx.ronda.deleteMany({});
            // Traer todos SOLICITADO
            const movs = await tx.movimiento.findMany({
                where: { estado: 'SOLICITADO' },
                orderBy: [{ createdAt: 'asc' }]
            });
            // 1) ALTAS → siempre ronda 1, FIFO por createdAt
            let ordenR1 = 1;
            for (const m of movs.filter(m => m.prioridad === 'ALTA')) {
                await tx.ronda.create({
                    data: {
                        movimientoId: m.id,
                        empresaId: m.empresaId,
                        localidadId: m.localidadId,
                        rondaNumero: 1,
                        orden: ordenR1++
                    }
                });
            }
            // 2) BAJAS → desde 2 si hay ALTAS, si no desde 1. Una por empresa por ronda.
            const hayAltas = ordenR1 > 1;
            const inicio = hayAltas ? 2 : 1;
            // Mapa: rondaNumero -> Set(empresaId) ya colocadas
            const empresasPorRonda = new Map();
            // precargar las de ronda 1 si hay ALTAS (empresas de alta no restringen BAJA)
            if (!hayAltas)
                empresasPorRonda.set(1, new Set());
            // preparar rondas existentes
            const registrarEmpresa = (r, e) => {
                if (!empresasPorRonda.has(r))
                    empresasPorRonda.set(r, new Set());
                empresasPorRonda.get(r).add(e);
            };
            for (const m of movs.filter(m => m.prioridad === 'BAJA')) {
                // buscar primera ronda >= inicio donde empresa no esté
                let r = inicio;
                for (;;) {
                    const set = empresasPorRonda.get(r) ?? new Set();
                    if (!set.has(m.empresaId)) {
                        // ordenar al final de r
                        const ord = (await this.tamanoDeRonda(tx, m.localidadId, r)) + 1;
                        await tx.ronda.create({
                            data: {
                                movimientoId: m.id,
                                empresaId: m.empresaId,
                                localidadId: m.localidadId,
                                rondaNumero: r,
                                orden: ord
                            }
                        });
                        registrarEmpresa(r, m.empresaId);
                        break;
                    }
                    r++;
                }
            }
            await this.recomponerRondasLocalidad(movs[0]?.localidadId ?? 0, tx);
        });
    }
    /** Crea ronda para un movimiento puntual (respeta reglas ALTA/BAJA) */
    static async crearRondaParaMovimientoBaja(movimientoId, empresaId, localidadId) {
        return prisma.$transaction(async (tx) => {
            const r = await this.primeraRondaDisponibleParaBaja(localidadId, empresaId, tx);
            const ord = (await this.tamanoDeRonda(tx, localidadId, r)) + 1;
            return tx.ronda.create({
                data: { movimientoId, empresaId, localidadId, rondaNumero: r, orden: ord }
            });
        });
    }
    static async generarRondaParaMovimiento(data) {
        if (data.prioridad === 'ALTA') {
            // Insertar en ronda 1 y reordenar FIFO por createdAt
            await prisma.$transaction(async (tx) => {
                const existe = await tx.ronda.findFirst({ where: { movimientoId: data.movimientoId } });
                if (!existe) {
                    const ord = (await this.tamanoDeRonda(tx, data.localidadId, 1)) + 1;
                    await tx.ronda.create({
                        data: {
                            movimientoId: data.movimientoId,
                            empresaId: data.empresaId,
                            localidadId: data.localidadId,
                            rondaNumero: 1,
                            orden: ord
                        }
                    });
                }
                await this.reordenarAltaFIFO(data.localidadId, tx);
                await this.recomponerRondasLocalidad(data.localidadId, tx);
            });
            return;
        }
        // BAJA
        await this.limpiarYReorganizarRondasConcluidas();
        await this.crearRondaParaMovimientoBaja(data.movimientoId, data.empresaId, data.localidadId);
        await this.recomponerRondasLocalidad(data.localidadId);
    }
    // =============== INCIDENTES =================
    /** Aplica reglas de incidente según prioridad del movimiento */
    static async aplicarIncidente(localidadId, movimientoId) {
        const ronda = await prisma.ronda.findFirst({
            where: { localidadId, movimientoId, concluido: false },
            include: { movimiento: true }
        });
        if (!ronda)
            return;
        if (ronda.movimiento.prioridad === 'ALTA') {
            await this._incidenteAlta(ronda);
        }
        else {
            await this._incidenteBaja(ronda);
        }
    }
    /** Incidente para ALTA */
    static async _incidenteAlta(ronda) {
        await prisma.$transaction(async (tx) => {
            const { localidadId } = ronda;
            // ¿Cuántas ALTAS hay en ronda 1?
            const altas = await tx.ronda.findMany({
                where: { localidadId, rondaNumero: 1, concluido: false, movimiento: { prioridad: 'ALTA' } },
                orderBy: { orden: 'asc' }
            });
            if (altas.length > 1) {
                // mandar este ALTA al final de ronda 1
                const maxOrden = altas[altas.length - 1].orden;
                const actual = altas.find(a => a.id === ronda.id);
                // cerrar hueco
                await tx.ronda.updateMany({
                    where: { localidadId, rondaNumero: 1, concluido: false, orden: { gt: actual.orden } },
                    data: { orden: { decrement: 1 } }
                });
                // colocar al final
                await tx.ronda.update({
                    where: { id: ronda.id },
                    data: { orden: maxOrden }
                });
            }
            else {
                // Era el único ALTA ⇒ bajar a ronda 2 (pos 1) y promover una BAJA a ronda 1 (pos 1)
                await this.moverRonda(tx, ronda, 2, 1);
                await this.promoverPrimerBajaARonda1(localidadId, tx);
            }
            await this.reordenarAltaFIFO(localidadId, tx);
            await this.recomponerRondasLocalidad(localidadId, tx);
        });
    }
    /** Incidente para BAJA */
    static async _incidenteBaja(ronda) {
        await prisma.$transaction(async (tx) => {
            const { localidadId, empresaId } = ronda;
            // Buscar siguiente participación de la MISMA EMPRESA en rondas posteriores
            const siguiente = await tx.ronda.findFirst({
                where: {
                    localidadId,
                    concluido: false,
                    empresaId,
                    rondaNumero: { gt: ronda.rondaNumero }
                },
                orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }]
            });
            if (siguiente) {
                // SWAP posiciones (simula “cambio al próximo slot de la empresa”)
                const posA = { r: ronda.rondaNumero, o: ronda.orden };
                const posB = { r: siguiente.rondaNumero, o: siguiente.orden };
                // Para garantizar integridad, mueve B a hueco temporal, luego A->B, luego temp->A
                // 1) crear hueco en B (desplazar >= oB)
                await tx.ronda.updateMany({
                    where: { localidadId, rondaNumero: posB.r, concluido: false, orden: { gte: posB.o } },
                    data: { orden: { increment: 1 } }
                });
                // 2) mover A a posB
                await tx.ronda.update({
                    where: { id: ronda.id },
                    data: { rondaNumero: posB.r, orden: posB.o }
                });
                // 3) cerrar hueco original A (desplazar > oA -1)
                await tx.ronda.updateMany({
                    where: { localidadId, rondaNumero: posA.r, concluido: false, orden: { gt: posA.o } },
                    data: { orden: { decrement: 1 } }
                });
                // 4) reinsertar B en posA (abrir hueco)
                await tx.ronda.updateMany({
                    where: { localidadId, rondaNumero: posA.r, concluido: false, orden: { gte: posA.o } },
                    data: { orden: { increment: 1 } }
                });
                await tx.ronda.update({
                    where: { id: siguiente.id },
                    data: { rondaNumero: posA.r, orden: posA.o }
                });
            }
            else {
                // No hay siguiente participación de la empresa
                const proxRonda = ronda.rondaNumero + 1;
                // ¿Existe ronda siguiente con gente?
                const tam = await this.tamanoDeRonda(tx, localidadId, proxRonda);
                if (tam > 0) {
                    // Mandar al final de proxRonda
                    await this.moverRonda(tx, ronda, proxRonda, tam + 1);
                }
                else {
                    // Crear “nueva ronda” efectiva = última + 1, y mandar a pos 1
                    const max = await tx.ronda.aggregate({
                        where: { localidadId, concluido: false },
                        _max: { rondaNumero: true }
                    });
                    const nueva = (max._max.rondaNumero ?? 0) + 1;
                    await this.moverRonda(tx, ronda, nueva, 1);
                }
            }
            await this.recomponerRondasLocalidad(localidadId, tx);
        });
    }
    // =============== LIMPIEZA/REORG ===============
    static async limpiarYReorganizarRondasConcluidas() {
        // Esto ya compacta eliminando concluidas y normaliza números 1..N por localidad
        const locs = await prisma.ronda.findMany({
            select: { localidadId: true },
            distinct: ['localidadId']
        });
        for (const { localidadId } of locs) {
            await prisma.$transaction(async (tx) => {
                await tx.ronda.deleteMany({ where: { localidadId, concluido: true } });
                await this.recomponerRondasLocalidad(localidadId, tx);
            });
        }
    }
    // =============== QUERIES VARIAS (igual que antes) ===============
    static async obtenerRondas() {
        try {
            return await prisma.ronda.findMany({
                include: {
                    empresa: true,
                    movimiento: { include: { empresa: true } }
                },
                orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }]
            });
        }
        catch (error) {
            movimiento_logger_1.movimientoError.error("Error al obtener rondas", { error });
            throw new Error("Error al obtener rondas");
        }
    }
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
                orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }]
            });
        }
        catch (error) {
            movimiento_logger_1.movimientoError.error('Error al obtener rondas por localidad', { localidadId, error });
            throw new Error('Error al obtener rondas por localidad');
        }
    }
    static async obtenerRondasPorLocalidadConEstado(localidadId, concluido) {
        try {
            return await prisma.ronda.findMany({
                where: { localidadId, concluido },
                include: {
                    empresa: true,
                    movimiento: {
                        select: {
                            id: true,
                            locomotiveNumber: true,
                            createdAt: true,
                            estado: true,
                            lavado: true,
                            torno: true,
                            prioridad: true,
                            viaOrigen: { select: { nombre: true } },
                            viaDestino: { select: { nombre: true } }
                        }
                    }
                },
                orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }]
            });
        }
        catch (error) {
            movimiento_logger_1.movimientoError.error('Error al obtener rondas por localidad y estado', {
                localidadId, concluido, error
            });
            throw new Error('Error al obtener rondas por localidad y estado');
        }
    }
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
                orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }]
            });
        }
        catch (error) {
            movimiento_logger_1.movimientoError.error('Error al obtener siguiente en ronda', { localidadId, error });
            throw new Error('Error al obtener el siguiente en la ronda');
        }
    }
    static async intercambiarMovimientosEntreRondas(rondaAId, rondaBId) {
        if (rondaAId === rondaBId)
            throw new Error("Debe indicar dos rondas distintas para el intercambio");
        return await prisma.$transaction(async (tx) => {
            const [rondaA, rondaB] = await Promise.all([
                tx.ronda.findUnique({ where: { id: rondaAId } }),
                tx.ronda.findUnique({ where: { id: rondaBId } })
            ]);
            if (!rondaA || !rondaB)
                throw new Error("Rondas o movimientos inválidos");
            const movimientoIdA = rondaA.movimientoId;
            const movimientoIdB = rondaB.movimientoId;
            await Promise.all([
                tx.ronda.delete({ where: { id: rondaAId } }),
                tx.ronda.delete({ where: { id: rondaBId } })
            ]);
            const [nuevaRondaA, nuevaRondaB] = await Promise.all([
                tx.ronda.create({
                    data: {
                        id: rondaAId,
                        movimientoId: movimientoIdB,
                        empresaId: rondaA.empresaId,
                        localidadId: rondaA.localidadId,
                        orden: rondaA.orden,
                        rondaNumero: rondaA.rondaNumero,
                        concluido: rondaA.concluido
                    }
                }),
                tx.ronda.create({
                    data: {
                        id: rondaBId,
                        movimientoId: movimientoIdA,
                        empresaId: rondaB.empresaId,
                        localidadId: rondaB.localidadId,
                        orden: rondaB.orden,
                        rondaNumero: rondaB.rondaNumero,
                        concluido: rondaB.concluido
                    }
                })
            ]);
            return [nuevaRondaA, nuevaRondaB];
        });
    }
    static async intercambiarMovimientoEnRonda(rondaId, nuevoMovimientoId) {
        try {
            const ronda = await prisma.ronda.findUnique({ where: { id: rondaId } });
            if (!ronda)
                throw new Error('Ronda no encontrada');
            const movimiento = await prisma.movimiento.findUnique({ where: { id: nuevoMovimientoId } });
            if (!movimiento)
                throw new Error('Movimiento no encontrado');
            return await prisma.ronda.update({
                where: { id: rondaId },
                data: { movimientoId: nuevoMovimientoId }
            });
        }
        catch (error) {
            movimiento_logger_1.movimientoError.error('Error al intercambiar movimiento en ronda', { rondaId, nuevoMovimientoId, error });
            throw new Error('Error al intercambiar movimiento en ronda');
        }
    }
    static async obtenerInfoPorRonda(id) {
        try {
            const info = await prisma.ronda.findUnique({
                where: { id },
                include: {
                    empresa: true,
                    movimiento: { include: { viaOrigen: true, viaDestino: true } }
                }
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
                    torno: info.movimiento.torno
                }
            };
        }
        catch (error) {
            movimiento_logger_1.movimientoError.error('Error al obtener info de ronda', { id, error });
            throw new Error('Error al obtener info de ronda');
        }
    }
    static async marcarRondaComoConcluida(id) {
        try {
            const rondaActualizada = await prisma.ronda.update({
                where: { id },
                data: { concluido: true, updatedAt: new Date() }
            });
            await this.recomponerRondasLocalidad(rondaActualizada.localidadId);
            return rondaActualizada;
        }
        catch (error) {
            movimiento_logger_1.movimientoError.error('Error al marcar ronda como concluida', { id, error });
            throw new Error('Error al marcar ronda como concluida');
        }
    }
}
exports.RondaModel = RondaModel;
