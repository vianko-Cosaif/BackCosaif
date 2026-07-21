// src/routes/IncidenteRoutes.ts

import { Router } from 'express';
import { authenticateAccess } from '../../auth/authenticateAccess';
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
router.get('/', IncidenteController.listar);

// Servir imagen de incidente (dos variantes)
// GET /incidentes/imagen?ruta=aaaa/mm/dd/archivo.jpg
router.get('/imagen', IncidenteController.servirImagen);
// GET /incidentes/imagen/:ruta
router.get('/imagen/:ruta(*)', IncidenteController.servirImagen);

// Verificar periodo de verificación / bloqueo
// GET /incidentes/:id/verificacion
router.get('/:id/verificacion', IncidenteController.verificarPeriodo);

// Obtener un incidente por su ID
// GET /incidentes/:id
router.get('/:id', IncidenteController.obtenerPorId);

// ——— RUTAS DE ESCRITURA ———

// Crear un nuevo incidente (hasta 4 imágenes)
// POST /incidentes
router.post('/', uploadImagenes, IncidenteController.crear);

// Editar un incidente existente (descripcion, estado, imágenes)
// PUT /incidentes/:id
router.put('/:id', uploadImagenes, IncidenteController.editar);

// Manejo de errores de subida (Multer)
router.use(manejarErroresUpload);

// Eliminar un incidente y sus imágenes
// DELETE /incidentes/:id
router.delete('/:id', IncidenteController.eliminar);

// Cerrar manualmente un incidente (cambia estado a CERRADO)
// POST /incidentes/:id/cerrar
router.post('/:id/cerrar', IncidenteController.cerrar);

// Continuar movimiento: marca CERRADO y reorganiza desde el modelo de rondas
// POST /incidentes/:id/continuar
router.post('/:id/continuar', IncidenteController.continuar);

// Cierre automático de vencidos (para cron/admin)
// POST /incidentes/cerrar-vencidos
router.post('/cerrar-vencidos', IncidenteController.cerrarVencidos);

// Ruta para marcar como resuelto y notificar
// POST /incidentes/:id/resuelto
router.post('/:id/resuelto', IncidenteController.resolver);


export default router;
