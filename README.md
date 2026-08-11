# BackCosaif


## Arquitectura (rápida)
- **Routes**: `src/Rutas/**` (HTTP, JWT, validaciones mínimas)
- **Controllers**: `src/Rutas/**/ *Controller.ts` (orquesta llamadas)
- **Models**: `src/models/**` (reglas de negocio + Prisma)

## Módulos clave y cómo interactuar

### Movimientos
**Routes**: `src/Rutas/Movimientos/movimientosRoutes.ts`  
**Controller**: `src/Rutas/Movimientos/MovimientoController.ts`  
**Model**: `src/models/Movimientos/movimientosModel.ts`  
**Reads**: `src/models/Movimientos/movimientoReadModel.ts`  
**Writes**: `src/models/Movimientos/movimientoWriteService.ts`

**Búsqueda optimizada**
- `GET /movimientos/buscar`
  - query: `q`, `empresaId`, `localidadId`, `estado` (coma), `prioridad`, `finalizado`, `page`, `pageSize`
  - siempre responde `{ data, meta }`

**Listados (opt-in paginado)**
- `GET /movimientos`
- `GET /movimientos/all`
- `GET /movimientos/pendientes`
- `GET /movimientos/empresa/:empresaId`
- `GET /movimientos/empresa/:empresaId/pendientes`
- `GET /movimientos/localidad/:localidadId/all`
- `GET /movimientos/localidad/:localidadId/pendientes`
- `GET /movimientos/localidad/:localidadId/empresa/:empresaId`
- `GET /movimientos/empresa/:empresaId/localidad/:localidadId`
- `GET /movimientos/empresa/:empresaId/localidad/:localidadId/pendientes`

**Detalle**
- `GET /movimientos/:id`
- `GET /movimientos/:id/edicion`
- `GET /movimientos/ronda/:rondaId/info`

**Acciones**
- `POST /movimientos`
- `PATCH /movimientos/:id/iniciar`
- `PATCH /movimientos/:id/pausar`
- `PATCH /movimientos/:id/reanudar`
- `PATCH /movimientos/:id/finalizar`
- `PATCH /movimientos/:id/cancelar`
- `PATCH /movimientos/:id/prioridad`

**Servicios (lavado/torno)**
- `GET /movimientos/servicios/pendientes`
- `GET /movimientos/servicios/espera`
- `PATCH /movimientos/servicios/:id/estado`
- `PATCH /movimientos/servicios/:id/solicitar`

Notas de performance:
- Listados usan payload recortado (selects mínimos).
- Detalle completo solo en `GET /movimientos/:id`.
- npm run ms:torreon  para correr torreon
---

### Incidentes
**Routes**: `src/Rutas/Incidente/**`  
**Model**: `src/models/Incidente/IncidenteModel.ts`

Reglas relevantes:
- Incidente abierto detiene movimiento.
- Cierre no resuelto reprograma movimiento nuevo.
- Límite de 3 incidentes por locomotora cancela.
- Autocierre con timer a 10 minutos desde `fechaInicio`.

---

### Rondas
**Routes**: `src/Rutas/Movimientos/Ronda/**`  
**Model**: `src/models/Movimientos/Ronda/RondaModel.ts`

Reglas relevantes:
- Rondas activas se recomponen y renumeran.
- Se eliminan rondas activas vacías.
- Movimientos `DETENIDO + incidenteGlobal` no entran en cola.
- Reglas de reparto entre empresas por ronda.

---

### Empresas
**Routes**: `src/Rutas/Empresa/EmpresaRoutes.ts`  
**Controller**: `src/Rutas/Empresa/EmpresaController.ts`  
**Model**: `src/models/Empresa/empresaModel.ts`

**Lite (payload mínimo)**
- `GET /empresas/lite`

---

### Localidades
**Routes**: `src/Rutas/Localidad/LocalidadRutas.ts`  
**Controller**: `src/Rutas/Localidad/LocalidadController.ts`  
**Model**: `src/models/Locolidad/localidadModel.ts`

**Lite (payload mínimo)**
- `GET /localidades/lite`

---

### Vías
**Routes**: `src/Rutas/Via/ViasRoutes.ts`  
**Controller**: `src/Rutas/Via/viaController.ts`  
**Model**: `src/models/Via/viaModel.ts`

**Lite (payload mínimo)**
- `GET /vias/lite`
- `GET /vias/localidad/:localidadId/lite`

---

### Reportería para cliente
Reporte operativo por empresa, sin métricas de duración ni tiempo total. Usa `fechaSolicitud` como base para agrupar carga por locomotora, vía, día, hora, turno y usuario solicitante.

**JSON**
- `GET /reporteria/cliente/carga-operativa`

**PDF**
- `GET /reporteria/cliente/carga-operativa/pdf`

**Query**
- `fecha`: `YYYY-MM-DD`
- `periodo`: `DIA`, `SEMANA`, `QUINCENA`, `MES`, `BIMESTRE`, `SEMESTRE`, `ANUAL`
- `empresaId`: requerido para `ADMINISTRADOR`; otros roles usan su propia empresa autenticada
- `localidadId`: opcional
- `tz`: opcional, default `America/Mexico_City`
- `detalleLimit`: opcional, default `500`, máximo `1000`

Ejemplo:
- `/reporteria/cliente/carga-operativa/pdf?empresaId=1&fecha=2026-06-03&periodo=MES`

Reportes adicionales por empresa:
- `GET /reporteria/cliente/vias`
- `GET /reporteria/cliente/vias/pdf`
- `GET /reporteria/cliente/turnos`
- `GET /reporteria/cliente/turnos/pdf`
- `GET /reporteria/cliente/usuarios`
- `GET /reporteria/cliente/usuarios/pdf`
- `GET /reporteria/cliente/cumplimiento`
- `GET /reporteria/cliente/cumplimiento/pdf`
- `GET /reporteria/cliente/incidentes`
- `GET /reporteria/cliente/incidentes/pdf`
- `GET /reporteria/cliente/cronologia`
- `GET /reporteria/cliente/cronologia/pdf`

Estos reportes aceptan los mismos filtros base y agregan:
- `umbralMin`: opcional para demoras/excedidos, default `90`
- `detalleLimit`: opcional para incidentes/cronología, default `500`, máximo `1000`

Notas:
- `vias`: usos por vía, entradas, salidas, pendientes, cancelados, demoras e incidentes.
- `turnos`: Turno 1, 2 y 3 con solicitados, iniciados, finalizados, inicio+fin, cancelados, incidentes y promedios.
- `usuarios`: solicitudes por usuario, movimientos atendidos por operador, finalizados, cancelaciones y actividad por día/turno.
- `cumplimiento`: concluidos, pendientes, excedidos por umbral y promedios por locomotora/turno.
- `incidentes`: incidentes por locomotora, vía, turno y cancelaciones relacionadas.
- `cronologia`: datos crudos por movimiento, sin hora ni duraciones.

---

### Auth/Sesiones
**JWT + Tokens**: `src/middlewares/passport.ts`, `src/middlewares/token.service.ts`  
**Session policy**: `src/auth/sessionPolicy.ts`

Reglas relevantes:
- Roles extendidos (24h): ADMINISTRADOR, COORDINADOR, SUPERVISOR, CLIENTE.
- MAQUINISTA usa TTL default (8h) y no se extiende por request.

---

## Convención de paginación
Para listados que aceptan paginación:
- `page` inicia en 1
- `pageSize` default 20, máximo 50
- respuesta paginada: `{ data, meta }`

---

## Tiempo real

- WebSocket autenticado: `GET /realtime/ws-ticket` y upgrade en `/realtime/ws`.
- Respaldo SSE: `GET /realtime/events`.
- Salud (solo administrador): `GET /realtime/stats`.
- Los eventos se filtran por empresa y localidad antes de entregarse.
- Torreón publica snapshots compactos para actualizar una sola entidad en la web.

Escalamiento opcional entre varias instancias:

```env
REDIS_URL=redis://usuario:password@host:6379
REALTIME_REDIS_CHANNEL=cosaif:realtime:v1
INSTANCE_ID=backend-1
```

Sin `REDIS_URL`, el hub continúa en modo local. Con Redis, cada evento se distribuye a los sockets conectados en todas las réplicas.

Verificación:

```bash
npm run test:realtime
npm run build
```
