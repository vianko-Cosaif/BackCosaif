// rutasPdf.ts  (en la carpeta raíz de rutas)
// Aquí centralizas TODO lo PDF.
// Ojo: si este router se monta como app.use('/reporteria', rutasPdf)
// entonces NO pongas '/reporteria' aquí o te sale /reporteria/reporteria...

import { Router } from 'express';
import { MovimientoPdfController } from '../controller/movimeintoPdf';

const router = Router();

/**
 * Si montas así:
 *   app.use('/reporteria', rutasPdf)
 * entonces esta URL final queda:
 *   GET /reporteria/movimientos/pdf
 */
router.get('/pdf', MovimientoPdfController.generar);

/**
 * Si en cambio montas así:
 *   app.use('/', rutasPdf)
 * entonces usa esta ruta (y BORRA la de arriba):
 * router.get('/reporteria/movimientos/pdf', MovimientoPdfController.generar);
 */

export default router;
