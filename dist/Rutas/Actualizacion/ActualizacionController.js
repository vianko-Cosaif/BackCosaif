"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActualizacionController = void 0;
const modelo = __importStar(require("../../models/Actualizacion/actualizacionModel"));
const parseFecha = (valor) => {
    if (typeof valor === 'string' || valor instanceof Date) {
        const f = new Date(valor);
        if (!isNaN(f.getTime()))
            return f;
    }
    return undefined;
};
class ActualizacionController {
}
exports.ActualizacionController = ActualizacionController;
_a = ActualizacionController;
/** GET /actualizaciones */
ActualizacionController.obtenerActualizaciones = async (_req, res) => {
    try {
        const lista = await modelo.obtenerActualizaciones();
        res.json(lista);
    }
    catch (err) {
        console.error('Error al obtener actualizaciones:', err);
        res.status(500).json({ error: 'No se pudieron obtener las actualizaciones' });
    }
};
/** GET /actualizaciones/ultima */
ActualizacionController.obtenerUltimaActualizacion = async (_req, res) => {
    try {
        const ultima = await modelo.obtenerUltimaActualizacion();
        if (!ultima) {
            res.status(404).json({ error: 'No hay actualizaciones registradas' });
            return;
        }
        res.json(ultima);
    }
    catch (err) {
        console.error('Error al obtener la última actualización:', err);
        res.status(500).json({ error: 'No se pudo obtener la última actualización' });
    }
};
/** POST /actualizaciones */
ActualizacionController.crearActualizacion = async (req, res) => {
    const { nombre, fechalanzamiento, estado } = req.body;
    if (!nombre || !fechalanzamiento) {
        res.status(400).json({ error: 'Se requieren nombre y fechalanzamiento' });
        return;
    }
    const fecha = parseFecha(fechalanzamiento);
    if (!fecha) {
        res.status(400).json({ error: 'fechalanzamiento debe ser fecha ISO válida' });
        return;
    }
    try {
        const creada = await modelo.crearActualizacion(nombre, fecha, estado);
        res.status(201).json(creada);
    }
    catch (err) {
        console.error('Error al crear actualización:', err);
        res.status(500).json({ error: 'Error al crear la actualización' });
    }
};
/** PUT /actualizaciones/:id */
ActualizacionController.actualizarActualizacion = async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
        res.status(400).json({ error: 'ID de actualización inválido' });
        return;
    }
    const { nombre, fechalanzamiento, estado } = req.body;
    const cambios = {};
    if (nombre !== undefined)
        cambios.nombre = nombre;
    if (fechalanzamiento !== undefined) {
        const fecha = parseFecha(fechalanzamiento);
        if (!fecha) {
            res.status(400).json({ error: 'fechalanzamiento debe ser fecha ISO válida' });
            return;
        }
        cambios.fechalanzamiento = fecha;
    }
    if (estado !== undefined)
        cambios.estado = estado;
    try {
        const actualizado = await modelo.actualizarActualizacion(id, cambios);
        res.json(actualizado);
    }
    catch (err) {
        console.error(`Error al actualizar con ID ${id}:`, err);
        res.status(500).json({ error: 'Error al actualizar la actualización' });
    }
};
