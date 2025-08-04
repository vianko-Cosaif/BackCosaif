// src/routes/IncidenteRoutes.ts

import { Router } from 'express';
import passport from '../../middlewares/passport';
import {
  IncidenteController,
  uploadImagenes
} from './IncidenteController';

const router = Router();

// Todas las rutas requieren JWT
router.use(passport.authenticate('jwt', { session: false }));

// ——— RUTAS DE CONSULTA ———

// Listar incidentes paginados y/o filtrados by estado, empresa, localidad
// GET /incidentes?estado=&page=&pageSize=&empresaId=&localidadId=
router.get('/', IncidenteController.listar);

// Obtener un incidente por su ID
// GET /incidentes/:id
router.get('/:id', IncidenteController.obtenerPorId);

// Verificar periodo de verificación / bloqueo
// GET /incidentes/:id/verificacion
router.get('/:id/verificacion', IncidenteController.verificarPeriodo);

// Servir imagen de incidente
// GET /incidentes/imagen/:ruta
router.get('/imagen/:ruta(*)', IncidenteController.servirImagen);

// ——— RUTAS DE ESCRITURA ———

// Crear un nuevo incidente (hasta 4 imágenes)
// POST /incidentes
router.post('/', uploadImagenes, IncidenteController.crear);

// Editar un incidente existente (descripcion, estado, imágenes)
// PUT /incidentes/:id
router.put('/:id', uploadImagenes, IncidenteController.editar);

// Eliminar un incidente y sus imágenes
// DELETE /incidentes/:id
router.delete('/:id', IncidenteController.eliminar);

// Cerrar manualmente un incidente (cambia estado a CERRADO)
// POST /incidentes/:id/cerrar
router.post('/:id/cerrar', IncidenteController.cerrar);

export default router;
