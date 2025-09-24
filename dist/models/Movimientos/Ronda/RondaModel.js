"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RondaModel = void 0;
// src/models/Movimientos/Ronda/RondaModel.ts
const movimiento_logger_1 = require("../movimiento.logger");
const client_1 = require("@prisma/client");
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const prisma = new client_1.PrismaClient();
/**
 * Reglas claras:
 * - Supervisor/Coordinador: ENCOLAR servicio -> setea lavado/torno = true, posiciona en R1 detrás del bloque de ALTAS sin hold.
 *   No cambia estado del movimiento. Luego **reorganiza las BAJAS de esa empresa** (“sillas”: máx 1 por ronda).
 * - Maquinista: INICIAR servicio -> pone estado = 'EN_PROCESO' (+ fechaInicio), reubica en R1 según servicios activos
 *   y **reorganiza las BAJAS de esa empresa**.
 * - Motor “siguiente”: elige el primer movimiento con estado !== 'EN_PROCESO'. Para servicios pendientes, permite inicio.
 */
// ================== HOLD 10 MIN (INCIDENTE CERRADO/NO RESUELTO, SOLO 1 VEZ) ==================
const HOLD10M_MS = 10 * 60 * 1000;
const _hold10m = new Map(); // movimientoId -> expiresAt
const _hold10mOnce = new Set(); // ya aplicado una vez
function _isOnHold(movId) {
    const exp = _hold10m.get(movId);
    if (!exp)
        return false;
    if (Date.now() > exp) {
        _hold10m.delete(movId);
        return false;
    }
    return true;
}
// ================== FCM (solo fin de servicio) ==================
function ensureAdmin() {
    if (!firebase_admin_1.default.apps?.length)
        firebase_admin_1.default.initializeApp();
}
async function tokensDeUsuarios(ids, tx = prisma) {
    if (!ids.length)
        return [];
    const usuarios = await tx.usuario.findMany({
        where: { id: { in: ids }, activo: true },
        include: { fcmTokens: true }
    });
    return usuarios.flatMap(u => (u.fcmTokens ?? []).map(t => t.token).filter(Boolean));
}
// ================== CONSTANTES / GUARDAS ==================
const MAX_GUARD_ITERS = 1000;
const MAX_SCAN_ROUNDS = 500;
// ================== MODELO ==================
class RondaModel {
    // ---------- HELPERS CRUD RONDA ----------
    static async insertarEnPosicion(tx, localidadId, rondaNumero, orden, data) {
        await tx.ronda.updateMany({
            where: { localidadId, rondaNumero, concluido: false, orden: { gte: orden } },
            data: { orden: { increment: 1 } },
        });
        return tx.ronda.create({ data: { ...data, localidadId, rondaNumero, orden } });
    }
    static async moverRonda(tx, row, targetRonda, targetOrden) {
        if (targetRonda < 1)
            targetRonda = 1;
        if (targetOrden < 1)
            targetOrden = 1;
        const sameRound = row.rondaNumero === targetRonda;
        if (sameRound) {
            if (targetOrden === row.orden)
                return row;
            if (targetOrden > row.orden) {
                await tx.ronda.updateMany({
                    where: { localidadId: row.localidadId, rondaNumero: row.rondaNumero, concluido: false, orden: { gt: row.orden, lte: targetOrden } },
                    data: { orden: { decrement: 1 } },
                });
            }
            else {
                await tx.ronda.updateMany({
                    where: { localidadId: row.localidadId, rondaNumero: row.rondaNumero, concluido: false, orden: { gte: targetOrden, lt: row.orden } },
                    data: { orden: { increment: 1 } },
                });
            }
            await tx.ronda.update({ where: { id: row.id }, data: { orden: targetOrden } });
            return (await tx.ronda.findUnique({ where: { id: row.id } }));
        }
        await tx.ronda.updateMany({
            where: { localidadId: row.localidadId, rondaNumero: row.rondaNumero, concluido: false, orden: { gt: row.orden } },
            data: { orden: { decrement: 1 } },
        });
        await tx.ronda.updateMany({
            where: { localidadId: row.localidadId, rondaNumero: targetRonda, concluido: false, orden: { gte: targetOrden } },
            data: { orden: { increment: 1 } },
        });
        await tx.ronda.update({ where: { id: row.id }, data: { rondaNumero: targetRonda, orden: targetOrden } });
        return (await tx.ronda.findUnique({ where: { id: row.id } }));
    }
    static async tamanoDeRonda(tx, localidadId, rondaNumero) {
        return tx.ronda.count({ where: { localidadId, rondaNumero, concluido: false } });
    }
    static async primeraRondaLibreParaEmpresa(tx, localidadId, empresaId, desdeRonda) {
        let r = Math.max(1, desdeRonda);
        for (let guard = 0; guard < MAX_SCAN_ROUNDS; guard++) {
            const c = await tx.ronda.count({ where: { localidadId, rondaNumero: r, concluido: false, empresaId } });
            if (c === 0)
                return r;
            r++;
        }
        return r;
    }
    static async compactarOrdenesRonda(tx, localidadId, rondaNumero) {
        const filas = await tx.ronda.findMany({
            where: { localidadId, rondaNumero, concluido: false },
            orderBy: { orden: 'asc' },
            select: { id: true, orden: true },
        });
        for (let i = 0; i < filas.length; i++) {
            const esperado = i + 1;
            if (filas[i].orden !== esperado) {
                await tx.ronda.update({ where: { id: filas[i].id }, data: { orden: esperado } });
            }
        }
    }
    static async eliminarRondasHuerfanasYDuplicadas(tx, localidadId) {
        await tx.ronda.deleteMany({
            where: {
                localidadId,
                movimiento: { OR: [{ finalizado: true }, { estado: { in: ['CONCLUIDO', 'CANCELADO'] } }] }
            }
        });
        const filas = await tx.ronda.findMany({
            where: { localidadId, concluido: false },
            select: { id: true, movimientoId: true, rondaNumero: true, orden: true },
            orderBy: [{ movimientoId: 'asc' }, { rondaNumero: 'asc' }, { orden: 'asc' }]
        });
        for (let i = 0; i < filas.length;) {
            const movId = filas[i].movimientoId;
            const group = filas.filter(f => f.movimientoId === movId);
            if (group.length > 1) {
                const drop = group.slice(1).map(g => g.id);
                await tx.ronda.deleteMany({ where: { id: { in: drop } } });
            }
            i += group.length || 1;
        }
    }
    /** En BAJAS: máx 1 por empresa por ronda. En ALTAS: sin límite (cola FIFO en R1). */
    static async garantizarUnSlotBajasPorEmpresaPorRonda(tx, localidadId, startRound) {
        const filas = await tx.ronda.findMany({
            where: { localidadId, concluido: false, rondaNumero: { gte: startRound } },
            include: { movimiento: { select: { prioridad: true } } },
            orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }],
        });
        const bucket = new Map();
        for (const f of filas) {
            const key = `${f.rondaNumero}:${f.empresaId}`;
            const arr = bucket.get(key) ?? [];
            arr.push({ id: f.id, prioridad: f.movimiento.prioridad });
            bucket.set(key, arr);
        }
        for (const [key, rows] of bucket) {
            const bajas = rows.filter(r => r.prioridad !== 'ALTA');
            if (bajas.length <= 1)
                continue;
            const [rondaNumeroStr, empresaIdStr] = key.split(':');
            const rondaActual = parseInt(rondaNumeroStr, 10);
            const empresaId = parseInt(empresaIdStr, 10);
            for (let i = 1; i < bajas.length; i++) {
                const target = await this.primeraRondaLibreParaEmpresa(tx, localidadId, empresaId, rondaActual + 1);
                const tam = await this.tamanoDeRonda(tx, localidadId, target);
                await tx.ronda.update({ where: { id: bajas[i].id }, data: { rondaNumero: target, orden: tam + 1 } });
            }
        }
    }
    // ALTAS: FIFO en R1 (respeta HOLD: las ALTAS en hold se mueven fuera de R1)
    static async ordenarAltasR1_FIFO(tx, localidadId) {
        const filas = await tx.ronda.findMany({
            where: { localidadId, concluido: false },
            include: { movimiento: { select: { id: true, prioridad: true, createdAt: true } } },
            orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }],
        });
        let guard = 0;
        for (const f of filas) {
            if (++guard > MAX_GUARD_ITERS)
                break;
            if (f.movimiento.prioridad !== 'ALTA')
                continue;
            if (_isOnHold(f.movimiento.id)) {
                if (f.rondaNumero === 1) {
                    const tamR2 = await this.tamanoDeRonda(tx, localidadId, 2);
                    await this.moverRonda(tx, f, 2, tamR2 + 1);
                }
                continue;
            }
            if (f.rondaNumero !== 1) {
                const tamR1 = await this.tamanoDeRonda(tx, localidadId, 1);
                await this.moverRonda(tx, f, 1, tamR1 + 1);
            }
        }
        const r1 = await tx.ronda.findMany({
            where: { localidadId, rondaNumero: 1, concluido: false },
            include: { movimiento: { select: { id: true, prioridad: true, createdAt: true } } },
            orderBy: [{ orden: 'asc' }],
        });
        const altasOk = r1
            .filter(x => x.movimiento.prioridad === 'ALTA' && !_isOnHold(x.movimiento.id))
            .sort((a, b) => +new Date(a.movimiento.createdAt) - +new Date(b.movimiento.createdAt));
        const resto = r1.filter(x => x.movimiento.prioridad !== 'ALTA' || _isOnHold(x.movimiento.id));
        const nuevoOrden = [...altasOk.map(x => x.id), ...resto.map(x => x.id)];
        for (let i = 0; i < nuevoOrden.length; i++) {
            await tx.ronda.update({ where: { id: nuevoOrden[i] }, data: { orden: i + 1 } });
        }
    }
    // BAJAS: reequilibrio general (Ya no se usa en recomposición para preservar cascadas)
    static async reequilibrarBajasRobinHood(tx, localidadId) {
        const altas = await tx.ronda.findMany({
            where: { localidadId, concluido: false, movimiento: { prioridad: 'ALTA' } },
            select: { movimiento: { select: { id: true } } },
        });
        const hayAltasSinHold = altas.some(a => !_isOnHold(a.movimiento.id));
        const startRound = hayAltasSinHold ? 2 : 1;
        await this.garantizarUnSlotBajasPorEmpresaPorRonda(tx, localidadId, startRound);
        const bajas = await tx.ronda.findMany({
            where: { localidadId, concluido: false, rondaNumero: { gte: startRound }, movimiento: { prioridad: 'BAJA' } },
            orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }],
        });
        const porEmpresa = new Map();
        for (const r of bajas)
            porEmpresa.set(r.empresaId, [...(porEmpresa.get(r.empresaId) ?? []), r]);
        const empresas = [...porEmpresa.keys()];
        let ronda = startRound;
        let guard = 0;
        while ([...porEmpresa.values()].some(arr => arr.length > 0) && guard++ < MAX_GUARD_ITERS) {
            let orden = 1;
            for (const e of empresas) {
                const arr = porEmpresa.get(e);
                if (arr.length) {
                    const item = arr.shift();
                    await tx.ronda.update({ where: { id: item.id }, data: { rondaNumero: ronda, orden } });
                    orden++;
                }
            }
            await this.compactarOrdenesRonda(tx, localidadId, ronda);
            ronda++;
        }
        // Compactar numeración contigua
        const grupos = await tx.ronda.findMany({
            where: { localidadId, concluido: false },
            select: { rondaNumero: true }, distinct: ['rondaNumero'], orderBy: { rondaNumero: 'asc' }
        });
        let idx = 1;
        for (const g of grupos) {
            if (g.rondaNumero !== idx) {
                await tx.ronda.updateMany({ where: { localidadId, rondaNumero: g.rondaNumero }, data: { rondaNumero: idx } });
            }
            await this.compactarOrdenesRonda(tx, localidadId, idx);
            idx++;
        }
    }
    // ---------- REORGANIZACIÓN “SILLAS” SOLO PARA UNA EMPRESA (BAJAS) ----------
    /** Distribuye BAJAS de una empresa: 1 por ronda desde startRound, conservando FIFO de esa empresa. */
    static async reorganizarBajasDeEmpresa(tx, localidadId, empresaId) {
        // Determinar desde qué ronda empiezan las BAJAS (si hay ALTAS sin hold → desde R2)
        const altas = await tx.ronda.findMany({
            where: { localidadId, concluido: false, movimiento: { prioridad: 'ALTA' } },
            select: { movimiento: { select: { id: true } } },
        });
        const startRound = altas.some(a => !_isOnHold(a.movimiento.id)) ? 2 : 1;
        // Tomar solo BAJAS de la empresa (FIFO por posición actual)
        const bajas = await tx.ronda.findMany({
            where: { localidadId, concluido: false, empresaId, movimiento: { prioridad: 'BAJA' } },
            include: { movimiento: { select: { createdAt: true } } },
            orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }],
        });
        if (!bajas.length)
            return;
        let target = startRound;
        const touched = new Set();
        for (const row of bajas) {
            if (row.rondaNumero !== target) {
                const ord = (await this.tamanoDeRonda(tx, localidadId, target)) + 1;
                await this.moverRonda(tx, row, target, ord);
                touched.add(target);
                touched.add(row.rondaNumero);
            }
            else {
                touched.add(row.rondaNumero);
            }
            target++;
        }
        for (const r of touched) {
            await this.compactarOrdenesRonda(tx, localidadId, r);
        }
        // Hacer contigua la numeración de rondas (ligero, sin redistribución global)
        const grupos = await tx.ronda.findMany({
            where: { localidadId, concluido: false },
            select: { rondaNumero: true }, distinct: ['rondaNumero'], orderBy: { rondaNumero: 'asc' }
        });
        let idx = 1;
        for (const g of grupos) {
            if (g.rondaNumero !== idx) {
                await tx.ronda.updateMany({ where: { localidadId, rondaNumero: g.rondaNumero }, data: { rondaNumero: idx } });
            }
            await this.compactarOrdenesRonda(tx, localidadId, idx);
            idx++;
        }
    }
    // ---------- RECOMPOSICIÓN GENERAL (CLARA POR RONDAS) ----------
    static async recomponerRondasLocalidad(localidadId, tx = prisma) {
        await this.eliminarRondasHuerfanasYDuplicadas(tx, localidadId);
        await tx.ronda.deleteMany({ where: { localidadId, concluido: true } });
        const grupos = await tx.ronda.findMany({
            where: { localidadId, concluido: false },
            select: { rondaNumero: true },
            distinct: ['rondaNumero'],
            orderBy: { rondaNumero: 'asc' },
        });
        let idx = 1;
        for (const g of grupos) {
            if (g.rondaNumero !== idx) {
                await tx.ronda.updateMany({ where: { localidadId, rondaNumero: g.rondaNumero }, data: { rondaNumero: idx } });
            }
            await this.compactarOrdenesRonda(tx, localidadId, idx);
            idx++;
        }
        // 1) ALTAS → R1 (FIFO), ALTAS en HOLD fuera de R1
        await this.ordenarAltasR1_FIFO(tx, localidadId);
        // 2) BAJAS: preservar cascadas. Solo asegurar 1 por empresa por ronda y compactar.
        const altas2 = await tx.ronda.findMany({
            where: { localidadId, concluido: false, movimiento: { prioridad: 'ALTA' } },
            select: { movimiento: { select: { id: true } } },
        });
        const hayAltasSinHold = altas2.some(a => !_isOnHold(a.movimiento.id));
        const startRound = hayAltasSinHold ? 2 : 1;
        await this.garantizarUnSlotBajasPorEmpresaPorRonda(tx, localidadId, startRound);
        const grupos2 = await tx.ronda.findMany({
            where: { localidadId, concluido: false },
            select: { rondaNumero: true }, distinct: ['rondaNumero'], orderBy: { rondaNumero: 'asc' }
        });
        let idx2 = 1;
        for (const g of grupos2) {
            if (g.rondaNumero !== idx2) {
                await tx.ronda.updateMany({ where: { localidadId, rondaNumero: g.rondaNumero }, data: { rondaNumero: idx2 } });
            }
            await this.compactarOrdenesRonda(tx, localidadId, idx2);
            idx2++;
        }
    }
    /**
     * Encola un servicio (lavado/torno) y lo coloca al FRENTE de las BAJAS:
     * - No cambia estado del movimiento.
     * - Respeta el bloque de ALTAS (no lo toca).
     * - Reorganiza BAJAS garantizando 1 por empresa por ronda.
     *
     * Si el movimiento aún no está marcado como servicio, puede indicarse `tipo`
     * o se intenta inferir por nombre de vía destino (LAVADO/TORNO).
     */
    static async encolarServicioPrimero(movimientoId, tipo) {
        await prisma.$transaction(async (tx) => {
            const m = await tx.movimiento.findUnique({
                where: { id: movimientoId },
                select: {
                    id: true, localidadId: true, empresaId: true, estado: true, prioridad: true,
                    lavado: true, torno: true, viaDestino: { select: { nombre: true } }, createdAt: true
                }
            });
            if (!m)
                throw new Error(`Movimiento ${movimientoId} no encontrado`);
            // Asegurar flags de servicio SOLO al encolar
            let setLav = !!m.lavado, setTor = !!m.torno;
            if (!setLav && !setTor) {
                if (tipo) {
                    if (tipo === 'LAVADO')
                        setLav = true;
                    else
                        setTor = true;
                }
                else {
                    const n = (m.viaDestino?.nombre ?? '').toUpperCase();
                    if (/\bLAVAD/.test(n))
                        setLav = true;
                    else if (/\bTORN/.test(n))
                        setTor = true;
                }
                if (!setLav && !setTor) {
                    throw new Error('Debe indicar tipo de servicio (LAVADO|TORNO) o tener vía destino tipo LAVADO/TORNO');
                }
                await tx.movimiento.update({
                    where: { id: m.id },
                    data: { lavado: setLav, torno: setTor }
                });
            }
            // Asegurar ronda
            let r = await tx.ronda.findFirst({
                where: { movimientoId },
                orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }]
            });
            if (!r) {
                const ord = (await this.tamanoDeRonda(tx, m.localidadId, 1)) + 1;
                r = await tx.ronda.create({
                    data: { movimientoId, empresaId: m.empresaId, localidadId: m.localidadId, rondaNumero: 1, orden: ord }
                });
            }
            // Calcular bloque ALTAS en R1 (no se toca)
            const r1 = await tx.ronda.findMany({
                where: { localidadId: m.localidadId, rondaNumero: 1, concluido: false },
                include: { movimiento: { select: { id: true, prioridad: true, createdAt: true } } },
                orderBy: [{ orden: 'asc' }],
            });
            const bloqueAltasLen = r1.filter(x => x.movimiento.prioridad === 'ALTA' && !_isOnHold(x.movimiento.id)).length;
            // Mover al frente de las BAJAS (inmediatamente después del bloque de ALTAS)
            const targetOrden = Math.max(1, bloqueAltasLen + 1);
            await this.moverRonda(tx, r, 1, targetOrden);
            // Mantener FIFO de ALTAS en R1
            await this.ordenarAltasR1_FIFO(tx, m.localidadId);
            // Reorganizar BAJAS: “solo uno por empresa por ronda”, sin tocar ALTAS
            // startRound=1 para que también aplique a R1 (pero solo a BAJAS).
            await this.garantizarUnSlotBajasPorEmpresaPorRonda(tx, m.localidadId, 1);
            // Compactar ordenes R1 y renumerar rondas contiguas sin alterar ALTAS
            await this.compactarOrdenesRonda(tx, m.localidadId, 1);
            const grupos = await tx.ronda.findMany({
                where: { localidadId: m.localidadId, concluido: false },
                select: { rondaNumero: true }, distinct: ['rondaNumero'], orderBy: { rondaNumero: 'asc' }
            });
            let idx = 1;
            for (const g of grupos) {
                if (g.rondaNumero !== idx) {
                    await tx.ronda.updateMany({ where: { localidadId: m.localidadId, rondaNumero: g.rondaNumero }, data: { rondaNumero: idx } });
                }
                await this.compactarOrdenesRonda(tx, m.localidadId, idx);
                idx++;
            }
        }, { /* @ts-ignore */ isolationLevel: 'Serializable' });
    }
    // ---------- SERVICIO: INICIAR (Maquinista) ----------
    /**
     * El maquinista inicia el servicio: pone EN_PROCESO y reubica en R1 junto al bloque de servicios.
     * Luego reorganiza BAJAS de su empresa (“sillas”).
     */
    static async iniciarServicio(movimientoId, tipo) {
        return this.encolarServicioPrimero(movimientoId, tipo);
    }
    /** Compat: alias para código legado. */
    static async onServicioActivado(movimientoId) {
        return this.iniciarServicio(movimientoId);
    }
    // Reemplaza COMPLETO este método
    static async insertarAlFrenteR1(args, tx) {
        const run = async (q) => {
            // 1) por si ya tenía ronda (unicidad movimientoId)
            await q.ronda.deleteMany({ where: { movimientoId: args.movimientoId } });
            // 2) desplazar todo R1 de esa localidad (orden++)
            await q.ronda.updateMany({
                where: { localidadId: args.localidadId, rondaNumero: 1, concluido: false },
                data: { orden: { increment: 1 } },
            });
            // 3) crear en orden=1
            return q.ronda.create({
                data: {
                    movimientoId: args.movimientoId,
                    empresaId: args.empresaId,
                    localidadId: args.localidadId,
                    rondaNumero: 1,
                    orden: 1,
                    concluido: false,
                },
            });
        };
        // Si ya viene un tx, úsalo directo (no anidar transacciones)
        if (tx)
            return run(tx);
        // Si no, abre una transacción nueva y TIPAR q: Tx
        return prisma.$transaction(async (q) => run(q), { /* @ts-ignore */ isolationLevel: 'Serializable' });
    }
    // ---------- GENERACIÓN / INSERCIÓN ----------
    /**
     * ALTAS → R1 (opcionalmente fijar posición).
     * BAJAS → 1 por empresa por ronda; inicia en R2 si hay ALTAS sin hold, si no desde R1.
     */
    static async insertarRondaSolvente(data) {
        await prisma.$transaction(async (tx) => {
            const mov = await tx.movimiento.findUnique({ where: { id: data.movimientoId }, select: { id: true, estado: true } });
            if (!mov)
                throw new Error(`Movimiento ${data.movimientoId} no encontrado`);
            if (mov.estado === 'CANCELADO')
                return;
            const existe = await tx.ronda.findFirst({ where: { movimientoId: data.movimientoId } });
            if (existe)
                return;
            if (data.prioridad === 'ALTA') {
                const ord = data.preferirR1 ? (data.posicion ?? 1) : (await this.tamanoDeRonda(tx, data.localidadId, 1)) + 1;
                await this.insertarEnPosicion(tx, data.localidadId, 1, ord, {
                    movimientoId: data.movimientoId,
                    empresaId: data.empresaId,
                    localidadId: data.localidadId
                });
                await this.recomponerRondasLocalidad(data.localidadId, tx);
                return;
            }
            await this._insertarBajaConRobinHood(tx, {
                localidadId: data.localidadId,
                empresaId: data.empresaId,
                movimientoId: data.movimientoId
            });
            await this.recomponerRondasLocalidad(data.localidadId, tx);
        }, { /* @ts-ignore */ isolationLevel: 'Serializable' });
    }
    /** Compat: mismo nombre que antes. */
    static async generarRondaParaMovimiento(data) {
        return this.insertarRondaSolvente(data);
    }
    /** PRIVADO: inserción BAJA con robin-hood + compactación. */
    static async _insertarBajaConRobinHood(tx, params) {
        const { localidadId, empresaId, movimientoId } = params;
        const altas = await tx.ronda.findMany({
            where: { localidadId, concluido: false, movimiento: { prioridad: 'ALTA' } },
            select: { movimiento: { select: { id: true } } },
        });
        const hayAltasSinHold = altas.some(a => !_isOnHold(a.movimiento.id));
        const startRound = hayAltasSinHold ? 2 : 1;
        let r = startRound;
        for (let guard = 0; guard < MAX_SCAN_ROUNDS; guard++) {
            const ya = await tx.ronda.count({
                where: { localidadId, rondaNumero: r, concluido: false, empresaId, movimiento: { prioridad: 'BAJA' } }
            });
            if (ya === 0)
                break;
            r++;
        }
        const ord = (await this.tamanoDeRonda(tx, localidadId, r)) + 1;
        await tx.ronda.create({ data: { movimientoId, empresaId, localidadId, rondaNumero: r, orden: ord } });
        await this.garantizarUnSlotBajasPorEmpresaPorRonda(tx, localidadId, startRound);
        // Compactar/renumerar sin redistribución global
        const grupos = await tx.ronda.findMany({
            where: { localidadId, concluido: false },
            select: { rondaNumero: true }, distinct: ['rondaNumero'], orderBy: { rondaNumero: 'asc' }
        });
        let idx = 1;
        for (const g of grupos) {
            if (g.rondaNumero !== idx) {
                await tx.ronda.updateMany({ where: { localidadId, rondaNumero: g.rondaNumero }, data: { rondaNumero: idx } });
            }
            await this.compactarOrdenesRonda(tx, localidadId, idx);
            idx++;
        }
    }
    // ---------- ADELANTAR SERVICIO (LAVADO / TORNO) ----------
    /**
     * Adelanta un servicio de lavado/torno respetando reglas:
     * - Si es ALTA → va a R1 (después del bloque de ALTAS; luego se normaliza FIFO).
     * - Si es BAJA → se mueve a la ronda más temprana posible manteniendo Robin Hood
     *   (máx. 1 por empresa por ronda, iniciando en R2 si hay ALTAS sin hold; si no, desde R1).
     * Tras mover, **reorganiza las BAJAS de su empresa**.
     */
    static async adelantarServicio(movimientoId) {
        return prisma.$transaction(async (tx) => {
            const r = await tx.ronda.findFirst({
                where: { movimientoId, concluido: false },
                include: {
                    movimiento: {
                        select: {
                            id: true, prioridad: true, empresaId: true, localidadId: true,
                            lavado: true, torno: true, createdAt: true
                        }
                    }
                }
            });
            if (!r)
                throw new Error(`No hay ronda activa para el movimiento ${movimientoId}`);
            const m = r.movimiento;
            if (!m.lavado && !m.torno)
                throw new Error('El movimiento no es un servicio de lavado/torno');
            // ALTA → a R1
            if (m.prioridad === 'ALTA') {
                const r1 = await tx.ronda.findMany({
                    where: { localidadId: m.localidadId, rondaNumero: 1, concluido: false },
                    include: { movimiento: { select: { id: true, prioridad: true, createdAt: true } } },
                    orderBy: [{ orden: 'asc' }]
                });
                const lastAltaIdx = r1.reduce((acc, x, i) => (x.movimiento.prioridad === 'ALTA' && !_isOnHold(x.movimiento.id)) ? i : acc, -1);
                const targetOrden = lastAltaIdx >= 0 ? lastAltaIdx + 2 : 1;
                await this.moverRonda(tx, r, 1, targetOrden);
                await this.ordenarAltasR1_FIFO(tx, m.localidadId);
                await this.compactarOrdenesRonda(tx, m.localidadId, 1);
                // Reorganiza BAJAS de la empresa
                await this.reorganizarBajasDeEmpresa(tx, m.localidadId, m.empresaId);
                return await tx.ronda.findUnique({ where: { id: r.id } });
            }
            // BAJA → Robin Hood a la ronda más temprana posible
            const altas = await tx.ronda.findMany({
                where: { localidadId: m.localidadId, concluido: false, movimiento: { prioridad: 'ALTA' } },
                select: { movimiento: { select: { id: true } } },
            });
            const startRound = altas.some(a => !_isOnHold(a.movimiento.id)) ? 2 : 1;
            let target = startRound;
            while (target < r.rondaNumero) {
                const ya = await tx.ronda.count({
                    where: {
                        localidadId: m.localidadId, rondaNumero: target, concluido: false,
                        empresaId: m.empresaId, movimiento: { prioridad: 'BAJA' }
                    }
                });
                if (ya === 0)
                    break;
                target++;
            }
            if (target >= r.rondaNumero)
                target = r.rondaNumero;
            const tam = await this.tamanoDeRonda(tx, m.localidadId, target);
            await this.moverRonda(tx, r, target, tam + 1);
            // Reorganiza BAJAS de la empresa después del adelanto
            await this.reorganizarBajasDeEmpresa(tx, m.localidadId, m.empresaId);
            return await tx.ronda.findUnique({ where: { id: r.id } });
        }, { /* @ts-ignore */ isolationLevel: 'Serializable' });
    }
    // ---------- INCIDENTES (sin lógica de bloqueo de vía) ----------
    static async gestionarIncidente(movimientoId, opts) {
        await prisma.$transaction(async (tx) => {
            const r = await tx.ronda.findFirst({
                where: { movimientoId, concluido: false },
                include: { movimiento: { select: { id: true, prioridad: true, empresaId: true, localidadId: true, createdAt: true } } }
            });
            if (!r)
                throw new Error(`No hay ronda activa para el movimiento ${movimientoId}`);
            const { localidadId } = r;
            const esAlta = r.movimiento.prioridad === 'ALTA';
            if (opts?.cerradoNoResuelto && !_hold10mOnce.has(movimientoId)) {
                _hold10m.set(movimientoId, Date.now() + HOLD10M_MS);
                _hold10mOnce.add(movimientoId);
            }
            if (esAlta) {
                const r1Altas = await tx.ronda.findMany({
                    where: { localidadId, rondaNumero: 1, concluido: false, movimiento: { prioridad: 'ALTA' } },
                    include: { movimiento: { select: { id: true, createdAt: true } } },
                    orderBy: [{ movimiento: { createdAt: 'asc' } }, { orden: 'asc' }]
                });
                const ids = r1Altas.map(x => x.id);
                const self = r1Altas.find(x => x.movimiento.id === movimientoId);
                if (self) {
                    const nuevo = ids.filter(i => i !== self.id);
                    nuevo.push(self.id);
                    for (let i = 0; i < nuevo.length; i++) {
                        await tx.ronda.update({ where: { id: nuevo[i] }, data: { orden: i + 1 } });
                    }
                }
                await this.compactarOrdenesRonda(tx, localidadId, 1);
            }
            else {
                // Fast-path: única empresa en BAJAS en toda la localidad
                const empresasBaja = await tx.ronda.findMany({
                    where: { localidadId: r.localidadId, concluido: false, movimiento: { prioridad: 'BAJA' } },
                    select: { empresaId: true }, distinct: ['empresaId']
                });
                if (empresasBaja.length === 1) {
                    const filas = await tx.ronda.findMany({
                        where: { localidadId: r.localidadId, empresaId: r.empresaId, concluido: false, movimiento: { prioridad: 'BAJA' } },
                        orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }]
                    });
                    for (const row of filas) {
                        const nextRound = row.rondaNumero + 1;
                        const tam = await this.tamanoDeRonda(tx, row.localidadId, nextRound);
                        await this.moverRonda(tx, row, nextRound, tam + 1);
                    }
                    await this.recomponerRondasLocalidad(localidadId, tx);
                    return;
                }
                // Cascada normal: r0→pos(r1), r1→pos(r2)... último→fin de ronda siguiente
                const chain = await tx.ronda.findMany({
                    where: {
                        localidadId: r.localidadId,
                        empresaId: r.empresaId,
                        concluido: false,
                        rondaNumero: { gte: r.rondaNumero },
                        movimiento: { prioridad: 'BAJA' }
                    },
                    select: { id: true, rondaNumero: true, orden: true },
                    orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }],
                });
                if (chain.length === 1) {
                    const nextRound = r.rondaNumero + 1;
                    const tam = await this.tamanoDeRonda(tx, r.localidadId, nextRound);
                    await this.moverRonda(tx, r, nextRound, tam + 1);
                }
                else {
                    let current = await tx.ronda.findUnique({ where: { id: chain[0].id } });
                    for (let i = 1; i < chain.length; i++) {
                        const targetRow = await tx.ronda.findUnique({ where: { id: chain[i].id } });
                        await this.moverRonda(tx, current, targetRow.rondaNumero, targetRow.orden);
                        current = targetRow;
                    }
                    const last = chain[chain.length - 1];
                    const nextRound = last.rondaNumero + 1;
                    const tam = await this.tamanoDeRonda(tx, r.localidadId, nextRound);
                    await this.moverRonda(tx, (await tx.ronda.findUnique({ where: { id: last.id } })), nextRound, tam + 1);
                }
            }
            await this.recomponerRondasLocalidad(localidadId, tx);
        }, { /* @ts-ignore */ isolationLevel: 'Serializable' });
    }
    // ---------- MOTOR: SIGUIENTE (SIN BLOQUEOS) ----------
    static async siguienteParaMaquinista(localidadId) {
        return prisma.$transaction(async (tx) => {
            const candidatos = await tx.ronda.findMany({
                where: { localidadId, concluido: false },
                include: {
                    movimiento: {
                        select: {
                            id: true,
                            empresaId: true,
                            prioridad: true,
                            estado: true,
                            locomotiveNumber: true,
                            lavado: true,
                            torno: true,
                        },
                    },
                },
                orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }],
                take: 50,
            });
            if (!candidatos.length)
                return { vacio: true, motivo: 'sin_rondas' };
            // Política: el maquinista inicia todo lo que no esté en EN_PROCESO
            const rElegible = candidatos.find(c => c.movimiento.estado !== 'EN_PROCESO');
            const r = rElegible ?? candidatos[0];
            const m = r.movimiento;
            const permiteInicio = m.estado !== 'EN_PROCESO';
            return {
                rondaId: r.id,
                localidadId: r.localidadId,
                movimientoId: m.id,
                empresaId: m.empresaId,
                prioridad: m.prioridad,
                locomotiveNumber: m.locomotiveNumber ?? null,
                permiteInicio,
                motivo: rElegible ? 'ok' : ((m.lavado || m.torno) ? 'servicio_ya_en_proceso' : 'todos_en_proceso')
            };
        });
    }
    /** Wrapper por compatibilidad. */
    static async siguienteInteligente(localidadId) {
        return this.siguienteParaMaquinista(localidadId);
    }
    // ---------- FIN SERVICIO (LAVADO / TORNO) ----------
    static async notificarFinServicio(movimientoId, tipo, imagenesUrls) {
        ensureAdmin();
        const m = await prisma.movimiento.findUnique({
            where: { id: movimientoId },
            include: { empresa: { select: { nombre: true } }, localidad: { select: { id: true } } }
        });
        if (!m)
            throw new Error(`Movimiento ${movimientoId} no encontrado`);
        const ids = [m.clienteId, m.supervisorId, m.coordinadorId, m.operadorId]
            .filter(Boolean);
        const tokens = await tokensDeUsuarios(ids);
        if (!tokens.length)
            return;
        await firebase_admin_1.default.messaging().sendEachForMulticast({
            notification: {
                title: `${tipo} concluido`,
                body: `Concluido ${tipo.toLowerCase()} de la locomotora ${m.locomotiveNumber}. Crear movimiento para desocupar la sección.`
            },
            data: {
                tipo: 'fin_servicio',
                subtipo: tipo.toLowerCase(),
                movimientoId: String(m.id),
                empresa: String(m.empresa?.nombre ?? ''),
                localidadId: String(m.localidadId),
                imagenes: (imagenesUrls ?? []).slice(0, 5).join(',')
            },
            tokens
        });
    }
    // ---------- LIMPIEZA ----------
    static async limpiarYReorganizarRondasConcluidas() {
        const locs = await prisma.ronda.findMany({ select: { localidadId: true }, distinct: ['localidadId'] });
        for (const { localidadId } of locs) {
            await prisma.$transaction(async (tx) => {
                await tx.ronda.deleteMany({ where: { localidadId, concluido: true } });
                await this.eliminarRondasHuerfanasYDuplicadas(tx, localidadId);
                await this.recomponerRondasLocalidad(localidadId, tx);
            });
        }
    }
    // ---------- QUERIES VARIAS (compat front) ----------
    static async obtenerRondas() {
        try {
            return await prisma.ronda.findMany({
                include: { empresa: true, movimiento: { include: { empresa: true } } },
                orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }],
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
                            viaDestino: { select: { nombre: true } },
                        },
                    },
                },
                orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }],
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
                            id: true, locomotiveNumber: true, createdAt: true, estado: true, lavado: true, torno: true, prioridad: true,
                            viaOrigen: { select: { nombre: true } }, viaDestino: { select: { nombre: true } },
                        },
                    },
                },
                orderBy: [{ rondaNumero: 'asc' }, { orden: 'asc' }],
            });
        }
        catch (error) {
            movimiento_logger_1.movimientoError.error('Error al obtener rondas por localidad y estado', { localidadId, concluido, error });
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
                tx.ronda.findUnique({ where: { id: rondaBId } }),
            ]);
            if (!rondaA || !rondaB)
                throw new Error("Rondas o movimientos inválidos");
            const movimientoIdA = rondaA.movimientoId;
            const movimientoIdB = rondaB.movimientoId;
            await Promise.all([
                tx.ronda.delete({ where: { id: rondaAId } }),
                tx.ronda.delete({ where: { id: rondaBId } }),
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
                        concluido: rondaA.concluido,
                    },
                }),
                tx.ronda.create({
                    data: {
                        id: rondaBId,
                        movimientoId: movimientoIdA,
                        empresaId: rondaB.empresaId,
                        localidadId: rondaB.localidadId,
                        orden: rondaB.orden,
                        rondaNumero: rondaB.rondaNumero,
                        concluido: rondaB.concluido,
                    },
                }),
            ]);
            return [nuevaRondaA, nuevaRondaB];
        }, { /* @ts-ignore */ isolationLevel: 'Serializable' });
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
                data: { movimientoId: nuevoMovimientoId },
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
                include: { empresa: true, movimiento: { include: { viaOrigen: true, viaDestino: true } } },
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
    static async marcarRondaComoConcluida(id) {
        try {
            const rondaActualizada = await prisma.ronda.update({
                where: { id },
                data: { concluido: true, updatedAt: new Date() },
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
