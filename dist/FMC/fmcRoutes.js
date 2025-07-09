"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/fmc.routes.ts
const express_1 = require("express");
const passport_1 = __importDefault(require("../middlewares/passport"));
const FmcController_1 = require("./FmcController"); // ajusta si tu path difiere
const router = (0, express_1.Router)();
/* ---------------------------------------------------------------
 *  TODAS las rutas requieren JWT, porque el dispositivo ya inici�
 *  sesi�n y obtuvo su token de acceso en /login.
 * --------------------------------------------------------------*/
router.use(passport_1.default.authenticate('jwt', { session: false }));
/* GET /fcm                ? Lista global de tokens (s�lo admin) */
router.get('/', FmcController_1.FmcController.obtenerTokens);
/* GET /fcm/usuario/:id    ? Tokens de un usuario concreto       */
router.get('/usuario/:usuarioId', FmcController_1.FmcController.obtenerTokensPorUsuario);
/* POST /fcm               ? Upsert de token { usuarioId, token } */
router.post('/', FmcController_1.FmcController.registrarToken);
/* DELETE /fcm/:token      ? Elimina un token por valor          */
router.delete('/:token', FmcController_1.FmcController.eliminarToken);
/* DELETE /fcm/usuario/:id ? Elimina todos los tokens de usuario */
router.delete('/usuario/:usuarioId', FmcController_1.FmcController.eliminarTokensPorUsuario);
exports.default = router;
