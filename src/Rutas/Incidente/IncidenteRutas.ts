// src/routes/IncidenteRoutes.ts

import { Router } from 'express';
import { authenticateAccess } from '../../auth/authenticateAccess';
import { PERMISSIONS } from '../../auth/accessPolicy';
import { enforceQueryScope, requirePermission } from '../../auth/authorize';
import {
  enforceIncidentCreationScope,
  requireIncidentImageScope,
  requireIncidentScope,
} from '../../auth/resourceScope';
import { idempotentMutation } from '../../middlewares/idempotentMutation';
import {
  IncidenteController,
  uploadImagenes,
  manejarErroresUpload, // <-- capturar errores de Multer
} from './IncidenteController';

const router = Router();

// Todas las rutas requieren JWT
router.use(authenticateAccess);
router.use(idempotentMutation);


// ——— RUTAS DE CONSULTA ———

// Listar incidentes paginados y/o filtrados by estadox, empresa, localidad
// GET /incidentes?estado=&page=&pageSize=&empresaId=&localidadId=
router.get(
  '/',
  requirePermission(PERMISSIONS.INCIDENTS_READ),
  enforceQueryScope,
  IncidenteController.listar,
);

// Servir imagen de incidente (dos variantes)
// GET /incidentes/imagen?ruta=aaaa/mm/dd/archivo.jpg
router.get(
  '/imagen',
  requirePermission(PERMISSIONS.INCIDENTS_READ),
  requireIncidentImageScope,
  IncidenteController.servirImagen,
);
// GET /incidentes/imagen/:ruta
router.get(
  '/imagen/:ruta(*)',
  requirePermission(PERMISSIONS.INCIDENTS_READ),
  requireIncidentImageScope,
  IncidenteController.servirImagen,
);

// Verificar periodo de verificación / bloqueo
// GET /incidentes/:id/verificacion
router.get(
  '/:id/verificacion',
  requirePermission(PERMISSIONS.INCIDENTS_READ),
  requireIncidentScope(),
  IncidenteController.verificarPeriodo,
);

// Obtener un incidente por su ID
// GET /incidentes/:id
router.get(
  '/:id',
  requirePermission(PERMISSIONS.INCIDENTS_READ),
  requireIncidentScope(),
  IncidenteController.obtenerPorId,
);

// ——— RUTAS DE ESCRITURA ———

// Crear un nuevo incidente (hasta 4 imágenes)
// POST /incidentes
router.post(
  '/',
  requirePermission(PERMISSIONS.INCIDENTS_CREATE),
  uploadImagenes,
  enforceIncidentCreationScope,
  IncidenteController.crear,
);

// Editar un incidente existente (descripcion, estado, imágenes)
// PUT /incidentes/:id
router.put(
  '/:id',
  requirePermission(PERMISSIONS.INCIDENTS_UPDATE),
  requireIncidentScope(),
  uploadImagenes,
  IncidenteController.editar,
);

// Manejo de errores de subida (Multer)
router.use(manejarErroresUpload);

// Eliminar un incidente y sus imágenes
// DELETE /incidentes/:id
router.delete(
  '/:id',
  requirePermission(PERMISSIONS.INCIDENTS_DELETE),
  requireIncidentScope(),
  IncidenteController.eliminar,
);

// Cerrar manualmente un incidente (cambia estado a CERRADO)
// POST /incidentes/:id/cerrar
router.post(
  '/:id/cerrar',
  requirePermission(PERMISSIONS.INCIDENTS_RESOLVE),
  requireIncidentScope(),
  IncidenteController.cerrar,
);

// Continuar movimiento: marca CERRADO y reorganiza desde el modelo de rondas
// POST /incidentes/:id/continuar
router.post(
  '/:id/continuar',
  requirePermission(PERMISSIONS.INCIDENTS_RESOLVE),
  requireIncidentScope(),
  IncidenteController.continuar,
);

// Cierre automático de vencidos (para cron/admin)
// POST /incidentes/cerrar-vencidos
router.post(
  '/cerrar-vencidos',
  requirePermission(PERMISSIONS.INCIDENTS_MAINTENANCE),
  IncidenteController.cerrarVencidos,
);

// Ruta para marcar como resuelto y notificar
// POST /incidentes/:id/resuelto
router.post(
  '/:id/resuelto',
  requirePermission(PERMISSIONS.INCIDENTS_RESOLVE),
  requireIncidentScope(),
  IncidenteController.resolver,
);


export default router;
