/**
 * IncidenteRoutes.ts - VERSI�N CORREGIDA
 *
 * Archivo de definici�n de rutas HTTP para la entidad Incidente.
 * CORRECCI�N: Las rutas no deben incluir '/incidentes' ya que se montan con ese prefijo
 */

import { Router } from 'express';
import { IncidenteController, uploadImagenes } from './IncidenteController';
import passport from '../../middlewares/passport';

const router = Router();

// Middleware de autenticaci�n aplicado a todas las rutas
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

// Ruta para obtener estad�sticas (DEBE IR ANTES que /:id)
router.get('/estadisticas', IncidenteController.obtenerEstadisticas);

// Ruta para obtener incidentes de un movimiento espec�fico
router.get('/movimiento/:movimientoId', IncidenteController.obtenerIncidentesPorMovimiento);

// Ruta para verificar per�odo de verificaci�n (DEBE IR ANTES que /:id)
router.get('/:id/verificacion', IncidenteController.verificarPeriodoVerificacion);

// Ruta para servir im�genes
router.get('/imagen/:rutaImagen(*)', IncidenteController.servirImagen);

// Ruta para obtener incidente por ID (DEBE IR AL FINAL de los GETs)
router.get('/:id', IncidenteController.obtenerIncidentePorId);

// Ruta para obtener todos los incidentes (con filtros opcionales)
router.get('/', IncidenteController.obtenerIncidentes);

// === RUTAS DE MODIFICACI�N ===

// Ruta para crear un nuevo incidente
router.post('/', uploadImagenes, IncidenteController.crearIncidente);

// Ruta para cerrar un incidente manualmente
router.post('/:id/cerrar', IncidenteController.cerrarIncidente);

// Ruta para editar un incidente
router.put('/:id', uploadImagenes, IncidenteController.editarIncidente);

// Ruta para eliminar un incidente
router.delete('/:id', IncidenteController.eliminarIncidente);

export default router;