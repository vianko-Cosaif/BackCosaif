"use strict";
/**
 * empresaModel.ts
 *
 * Modelo de acceso a datos para la entidad Empresa.
 *
 * Este módulo encapsula la lógica de interacción con la base de datos relacionada a empresas.
 * Utiliza Prisma ORM como capa de acceso y proporciona métodos estáticos para las operaciones
 * CRUD básicas: obtener, crear, editar y eliminar empresas.
 *
 * Cada operación se encuentra envuelta en un bloque try/catch con logging de errores.
 *
 * Dependencias:
 * - Prisma Client: para interacción con la base de datos.
 * - empresaError: logger dedicado a errores del modelo Empresa.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmpresaModel = void 0;
const client_1 = require("@prisma/client");
const empresa_logger_1 = require("./empresa.logger");
const prisma = new client_1.PrismaClient();
/**
 * Clase EmpresaModel
 *
 * Contiene métodos estáticos que representan las operaciones
 * disponibles sobre el modelo Empresa.
 */
class EmpresaModel {
    /**
     * Obtener todas las empresas registradas.
     * Incluye la relación con los usuarios asociados a cada empresa.
     *
     * @returns Lista de empresas con usuarios asociados.
     * @throws Error si ocurre un fallo durante la consulta.
     */
    static async obtenerEmpresas() {
        try {
            return await prisma.empresa.findMany({
                include: { usuarios: true },
            });
        }
        catch (error) {
            empresa_logger_1.empresaError.error('Error al obtener empresas', { error });
            throw new Error('Error al obtener empresas');
        }
    }
    /**
     * Crear una nueva empresa.
     *
     * @param nombre - Nombre de la empresa a crear.
     * @returns Objeto de la empresa creada.
     * @throws Error si ocurre un fallo durante la creación.
     */
    static async crearEmpresa(nombre) {
        try {
            return await prisma.empresa.create({ data: { nombre } });
        }
        catch (error) {
            empresa_logger_1.empresaError.error('Error al crear empresa', { error });
            throw new Error('Error al crear empresa');
        }
    }
    /**
     * Editar el nombre de una empresa existente.
     *
     * @param id - ID de la empresa a modificar.
     * @param nombre - Nuevo nombre de la empresa.
     * @returns Objeto de la empresa actualizada.
     * @throws Error si ocurre un fallo durante la actualización.
     */
    static async editarEmpresa(id, nombre) {
        try {
            return await prisma.empresa.update({
                where: { id },
                data: { nombre },
            });
        }
        catch (error) {
            empresa_logger_1.empresaError.error('Error al editar empresa', { error });
            throw new Error('Error al editar empresa');
        }
    }
    /**
     * Eliminar una empresa por su ID.
     *
     * @param id - ID de la empresa a eliminar.
     * @returns Objeto de la empresa eliminada.
     * @throws Error si ocurre un fallo durante la eliminación.
     */
    static async eliminarEmpresa(id) {
        try {
            return await prisma.empresa.delete({
                where: { id },
            });
        }
        catch (error) {
            empresa_logger_1.empresaError.error('Error al eliminar empresa', { error });
            throw new Error('Error al eliminar empresa');
        }
    }
}
exports.EmpresaModel = EmpresaModel;
