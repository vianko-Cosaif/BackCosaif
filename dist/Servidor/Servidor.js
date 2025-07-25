"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.iniciarServidor = iniciarServidor;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const passport_1 = __importDefault(require("../middlewares/passport"));
const LocalidadRutas_1 = __importDefault(require("../Rutas/Localidad/LocalidadRutas"));
const UsuarioRoutes_1 = __importDefault(require("../Rutas/Usuario/UsuarioRoutes"));
const EmpresaRoutes_1 = __importDefault(require("../Rutas/Empresa/EmpresaRoutes"));
const ViasRoutes_1 = __importDefault(require("../Rutas/Via/ViasRoutes"));
const movimientosRoutes_1 = __importDefault(require("../Rutas/Movimientos/movimientosRoutes"));
const RondaRoutes_1 = __importDefault(require("../Rutas/Movimientos/Ronda/RondaRoutes"));
const IncidenteRutas_1 = __importDefault(require("../Rutas/Incidente/IncidenteRutas"));
const fmcRoutes_1 = __importDefault(require("../FMC/fmcRoutes"));
const ActualizacionRoutes_1 = __importDefault(require("../Rutas/Actualizacion/ActualizacionRoutes"));
dotenv_1.default.config();
const PORT = process.env.PORT;
/**
 * Inicializa y arranca el servidor Express.
 *
 * @function iniciarServidor
 * @remarks
 * Esta funci�n:
 *  - Configura middleware global de JSON y CORS
 *  - Registra rutas agrupadas por entidad
 *  - Aplica autenticaci�n JWT con Passport
 *  - Lanza el servidor en el puerto definido
 *
 * En caso de error cr�tico, finaliza el proceso con `process.exit(1)`.
 */
function iniciarServidor() {
    try {
        const app = (0, express_1.default)();
        // Middleware global para parseo de JSON en requests
        app.use(express_1.default.json());
        // Middleware para habilitar CORS
        app.use((0, cors_1.default)());
        // Autenticaci�n JWT
        app.use(passport_1.default.initialize());
        // Registro de rutas por m�dulo
        app.use("/usuarios", UsuarioRoutes_1.default);
        app.use("/empresas", EmpresaRoutes_1.default);
        app.use("/localidades", LocalidadRutas_1.default);
        app.use("/vias", ViasRoutes_1.default);
        app.use("/movimientos", movimientosRoutes_1.default);
        app.use("/rondas", RondaRoutes_1.default);
        app.use("/fcm", fmcRoutes_1.default);
        app.use("/incidentes", IncidenteRutas_1.default);
        app.use("/actualizaciones", ActualizacionRoutes_1.default);
        // Inicia el servidor Express
        app.listen(PORT, () => {
            console.log(`Servidor corriendo en puerto ${PORT}`);
        });
    }
    catch (error) {
        process.exit(1);
    }
}
