/**
 * @file MovimientoModel.ts
 *
 * Fachada del dominio de movimientos.
 * Mantiene el contrato histórico del proyecto y delega:
 * - lecturas a `MovimientoReadModel`
 * - mutaciones a `MovimientoWriteService`
 */

import { MovimientoReadModel } from './movimientoReadModel';
import { MovimientoWriteService } from './movimientoWriteService';
import type { EditableMovimientoInput } from './movimiento.shared';
import type { MovimientoPagination } from './movimiento.types';

type CreateMovimientoInput = Parameters<typeof MovimientoWriteService.nuevoMovimiento>[0];
type EditMovimientoInput = Parameters<typeof MovimientoWriteService.editarMovimiento>[1];
type EstadoMovimiento =
  Parameters<typeof MovimientoWriteService.cambiarEstadoMovimiento>[1];
type EstadoServicio =
  Parameters<typeof MovimientoWriteService.actualizarEstadoServicio>[1];

export class MovimientoModel {
  static async obtenerMovimientos() {
    return MovimientoReadModel.obtenerMovimientos();
  }

  static async obtenerMovimientosPaginados(pagination: MovimientoPagination) {
    return MovimientoReadModel.obtenerMovimientosPaginados(pagination);
  }

  static async buscarMovimientos(params: Parameters<typeof MovimientoReadModel.buscarMovimientos>[0]) {
    return MovimientoReadModel.buscarMovimientos(params);
  }

  static async obtenerMovimientoPorId(id: number) {
    return MovimientoReadModel.obtenerMovimientoPorId(id);
  }

  static async obtenerServiciosPendientes(filters: { localidadId?: number; empresaId?: number } = {}) {
    return MovimientoReadModel.obtenerServiciosPendientes(filters);
  }

  static async detenerMovimiento(id: number, razon?: string) {
    return MovimientoWriteService.detenerMovimiento(id, razon);
  }

  static async cancelarMovimiento(id: number, razonCancelacion: string, usuarioId?: number) {
    return MovimientoWriteService.cancelarMovimiento(id, razonCancelacion, usuarioId);
  }

  static async obtenerInfoEdicion(id: number) {
    return MovimientoReadModel.obtenerInfoEdicion(id);
  }

  static async guardarEdicion(id: number, payload: EditableMovimientoInput, actorId: number) {
    return MovimientoWriteService.guardarEdicion(id, payload, actorId);
  }

  static async reactivarMovimiento(id: number, maquinistaId?: number) {
    return MovimientoWriteService.reactivarMovimiento(id, maquinistaId);
  }

  static async cambiarEstadoMovimiento(
    id: number,
    nuevoEstado: EstadoMovimiento,
    opciones: Parameters<typeof MovimientoWriteService.cambiarEstadoMovimiento>[2] = {}
  ) {
    return MovimientoWriteService.cambiarEstadoMovimiento(id, nuevoEstado, opciones);
  }

  static async nuevoMovimiento(data: CreateMovimientoInput) {
    return MovimientoWriteService.nuevoMovimiento(data);
  }

  static async activarMovimientoTornoAgendado(id: number) {
    return MovimientoWriteService.activarMovimientoTornoAgendado(id);
  }

  static async actualizarEstadoServicio(
    id: number,
    nuevoEstado: EstadoServicio,
    opciones: Parameters<typeof MovimientoWriteService.actualizarEstadoServicio>[2] = {}
  ) {
    return MovimientoWriteService.actualizarEstadoServicio(id, nuevoEstado, opciones);
  }

  static async editarMovimiento(id: number, data: EditMovimientoInput) {
    return MovimientoWriteService.editarMovimiento(id, data);
  }

  static async listarServiciosPendientesFIFO(filters: { localidadId?: number; empresaId?: number } = {}) {
    return MovimientoReadModel.listarServiciosPendientesFIFO(filters);
  }

  static async solicitarServicioYEncolarFrenteR1(id: number) {
    return MovimientoWriteService.solicitarServicioYEncolarFrenteR1(id);
  }

  static async eliminarMovimiento(id: number) {
    return MovimientoWriteService.eliminarMovimiento(id);
  }

  static async cambiarPrioridad(id: number, prioridad: 'ALTA' | 'BAJA') {
    return MovimientoWriteService.cambiarPrioridad(id, prioridad);
  }

  static async obtenerMovimientosPendientes() {
    return MovimientoReadModel.obtenerMovimientosPendientes();
  }

  static async obtenerMovimientosPendientesPaginados(pagination: MovimientoPagination) {
    return MovimientoReadModel.obtenerMovimientosPendientesPaginados(pagination);
  }

  static async obtenerMovimientosPendientesPorEmpresa(empresaId: number) {
    return MovimientoReadModel.obtenerMovimientosPendientesPorEmpresa(empresaId);
  }

  static async obtenerMovimientosPendientesPorEmpresaPaginados(empresaId: number, pagination: MovimientoPagination) {
    return MovimientoReadModel.obtenerMovimientosPendientesPorEmpresaPaginados(empresaId, pagination);
  }

  static async obtenerTodosLosMovimientos() {
    return MovimientoReadModel.obtenerTodosLosMovimientos();
  }

  static async obtenerTodosLosMovimientosPaginados(pagination: MovimientoPagination) {
    return MovimientoReadModel.obtenerTodosLosMovimientosPaginados(pagination);
  }

  static async obtenerMovimientosPorEmpresa(empresaId: number) {
    return MovimientoReadModel.obtenerMovimientosPorEmpresa(empresaId);
  }

  static async obtenerMovimientosPorEmpresaPaginados(empresaId: number, pagination: MovimientoPagination) {
    return MovimientoReadModel.obtenerMovimientosPorEmpresaPaginados(empresaId, pagination);
  }

  static async obtenerMovimientosPendientesPorLocalidad(localidadId: number) {
    return MovimientoReadModel.obtenerMovimientosPendientesPorLocalidad(localidadId);
  }

  static async obtenerMovimientosPendientesPorLocalidadPaginados(localidadId: number, pagination: MovimientoPagination) {
    return MovimientoReadModel.obtenerMovimientosPendientesPorLocalidadPaginados(localidadId, pagination);
  }

  static async obtenerTodosMovimientosPorLocalidad(localidadId: number) {
    return MovimientoReadModel.obtenerTodosMovimientosPorLocalidad(localidadId);
  }

  static async obtenerTodosMovimientosPorLocalidadPaginados(localidadId: number, pagination: MovimientoPagination) {
    return MovimientoReadModel.obtenerTodosMovimientosPorLocalidadPaginados(localidadId, pagination);
  }

  static async obtenerMovimientosPorLocalidadEmpresa(localidadId: number, empresaId: number) {
    return MovimientoReadModel.obtenerMovimientosPorLocalidadEmpresa(localidadId, empresaId);
  }

  static async obtenerMovimientosPorLocalidadEmpresaPaginados(localidadId: number, empresaId: number, pagination: MovimientoPagination) {
    return MovimientoReadModel.obtenerMovimientosPorLocalidadEmpresaPaginados(localidadId, empresaId, pagination);
  }

  static async obtenerMovimientosPorEmpresaYLocalidad(empresaId: number, localidadId: number) {
    return MovimientoReadModel.obtenerMovimientosPorEmpresaYLocalidad(empresaId, localidadId);
  }

  static async obtenerMovimientosPorEmpresaYLocalidadPaginados(empresaId: number, localidadId: number, pagination: MovimientoPagination) {
    return MovimientoReadModel.obtenerMovimientosPorEmpresaYLocalidadPaginados(empresaId, localidadId, pagination);
  }

  static async obtenerMovimientosNoConcluidosPorEmpresaYLocalidad(empresaId: number, localidadId: number) {
    return MovimientoReadModel.obtenerMovimientosNoConcluidosPorEmpresaYLocalidad(empresaId, localidadId);
  }

  static async obtenerMovimientosNoConcluidosPorEmpresaYLocalidadPaginados(empresaId: number, localidadId: number, pagination: MovimientoPagination) {
    return MovimientoReadModel.obtenerMovimientosNoConcluidosPorEmpresaYLocalidadPaginados(empresaId, localidadId, pagination);
  }

  static async obtenerInfoPorRonda(rondaId: number) {
    return MovimientoReadModel.obtenerInfoPorRonda(rondaId);
  }

  static async iniciarMovimiento(id: number, maquinistaId: number) {
    return MovimientoWriteService.iniciarMovimiento(id, maquinistaId);
  }

  static async pausarMovimiento(id: number) {
    return MovimientoWriteService.pausarMovimiento(id);
  }

  static async reanudarMovimiento(id: number) {
    return MovimientoWriteService.reanudarMovimiento(id);
  }

  static async finalizarMovimiento(id: number) {
    return MovimientoWriteService.finalizarMovimiento(id);
  }
}
