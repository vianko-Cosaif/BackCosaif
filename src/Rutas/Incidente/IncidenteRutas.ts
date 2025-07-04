/**
 * IncidenteRoutes.ts - VERSIÓN CORREGIDA
 *
 * Archivo de definición de rutas HTTP para la entidad Incidente.
 * CORRECCIÓN: Las rutas no deben incluir '/incidentes' ya que se montan con ese prefijo
 */

import { Router } from 'express';
import { IncidenteController, uploadImagenes } from './IncidenteController';
import passport from '../../middlewares/passport';

const router = Router();

// Middleware de autenticación aplicado a todas las rutas
router.use(passport.authenticate('jwt', { session: false }));

// === RUTAS DE CONSULTA PAGINADAS (NUEVAS - DEBEN IR ANTES) ===

// Ruta para obtener incidentes paginados (DEBE IR ANTES que /:id)
router.get('/paginado', IncidenteController.obtenerIncidentesPaginados);

// Ruta para obtener incidentes por localidad paginados
router.get('/localidad/:localidadId', IncidenteController.obtenerIncidentesPorLocalidad);

// Ruta para obtener incidentes por empresa y localidad paginados  
router.get('/empresa/:empresaId/localidad/:localidadId', IncidenteController.obtenerIncidentesPorEmpresaYLocalidad);

// Ruta para obtener incidentes por empresa paginados
router.get('/empresa/:empresaId', IncidenteController.obtenerIncidentesPorEmpresa);


// === RUTAS DE CONSULTA EXISTENTES ===

// Ruta para obtener estadísticas (DEBE IR ANTES que /:id)
router.get('/estadisticas', IncidenteController.obtenerEstadisticas);

// Ruta para obtener incidentes de un movimiento específico
router.get('/movimiento/:movimientoId', IncidenteController.obtenerIncidentesPorMovimiento);

// Ruta para verificar período de verificación (DEBE IR ANTES que /:id)
router.get('/:id/verificacion', IncidenteController.verificarPeriodoVerificacion);

// Ruta para servir imágenes
router.get('/imagen/:rutaImagen(*)', IncidenteController.servirImagen);

// Ruta para obtener incidente por ID (DEBE IR AL FINAL de los GETs)
router.get('/:id', IncidenteController.obtenerIncidentePorId);

// Ruta para obtener todos los incidentes (con filtros opcionales)
router.get('/', IncidenteController.obtenerIncidentes);

// === RUTAS DE MODIFICACIÓN ===

// Ruta para crear un nuevo incidente
router.post('/', uploadImagenes, IncidenteController.crearIncidente);

// Ruta para cerrar un incidente manualmente
router.post('/:id/cerrar', IncidenteController.cerrarIncidente);

// Ruta para cerrar automáticamente incidentes vencidos
router.post('/cerrar-vencidos', IncidenteController.cerrarIncidentesVencidos);

// Ruta para editar un incidente
router.put('/:id', uploadImagenes, IncidenteController.editarIncidente);

// Ruta para eliminar un incidente
router.delete('/:id', IncidenteController.eliminarIncidente);

router.post('/:id/continuar', IncidenteController.continuarMovimiento);


export default router;