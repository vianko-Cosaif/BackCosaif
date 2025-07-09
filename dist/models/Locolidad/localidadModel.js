"use strict";
/**
 * localidad.service.ts
 *
 * Servicio de acceso a datos para la entidad Localidad.
 *
 * Funcionalidades:
 * - Obtener todas las localidades con sus relaciones.
 * - Crear una nueva localidad.
 * - Buscar localidad por ID.
 * - Buscar localidad por nombre (opcional).
 *
 * Dependencias:
 * - PrismaClient para acceso a la base de datos.
 * - localidadLogger para manejo de errores.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buscarLocalidadPorNombre = exports.buscarLocalidadPorId = exports.crearLocalidad = exports.obtenerLocalidades = void 0;
const client_1 = require("@prisma/client");
const localidad_logger_1 = require("./localidad.logger");
const prisma = new client_1.PrismaClient();
/**
 * Obtiene todas las localidades.
 *
 * @returns Lista de localidades con nombre, estado, y relaciones opcionales.
 */
const obtenerLocalidades = async () => {
    try {
        return await prisma.localidad.findMany({
            include: {
                vias: true,
                usuarios: true,
                movimientos: true,
            },
        });
    }
    catch (error) {
        localidad_logger_1.localidadLogger.error('Error al obtener localidades', { error });
        throw new Error('No se pudieron obtener las localidades');
    }
};
exports.obtenerLocalidades = obtenerLocalidades;
/**
 * Crea una nueva localidad.
 *
 * @param nombre - Nombre de la localidad.
 * @param estado - Estado de la localidad.
 * @returns La localidad recién creada.
 */
const crearLocalidad = async (nombre, estado) => {
    try {
        return await prisma.localidad.create({
            data: { nombre, estado },
        });
    }
    catch (error) {
        localidad_logger_1.localidadLogger.error(`Error al crear localidad ${nombre}`, { error });
        throw new Error('Error al crear la localidad');
    }
};
exports.crearLocalidad = crearLocalidad;
/**
 * Busca una localidad por su ID.
 *
 * @param id - ID de la localidad.
 * @returns La localidad encontrada o null si no existe.
 */
const buscarLocalidadPorId = async (id) => {
    try {
        return await prisma.localidad.findUnique({
            where: { id },
        });
    }
    catch (error) {
        localidad_logger_1.localidadLogger.error(`Error al buscar localidad con ID ${id}`, { error });
        throw new Error('Error al buscar la localidad');
    }
};
exports.buscarLocalidadPorId = buscarLocalidadPorId;
/**
 * (Opcional) Busca una localidad por nombre.
 *
 * @param nombre - Nombre de la localidad.
 * @returns La localidad encontrada o null.
 */
const buscarLocalidadPorNombre = async (nombre) => {
    try {
        return await prisma.localidad.findFirst({
            where: { nombre },
        });
    }
    catch (error) {
        localidad_logger_1.localidadLogger.error(`Error al buscar localidad con nombre ${nombre}`, { error });
        throw new Error('Error al buscar localidad por nombre');
    }
};
exports.buscarLocalidadPorNombre = buscarLocalidadPorNombre;
