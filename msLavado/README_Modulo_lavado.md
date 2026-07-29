# Contrato frontend — Módulo de Lavado

Este documento describe cómo integrar las pantallas web o móviles con el MVP de
Lavado. El frontend siempre consume el backend principal; nunca debe llamar
directamente al puerto interno de `msLavado`.

## Conexión y autenticación

Base local:

```txt
http://localhost:3000
```

Todas las rutas de Lavado requieren el JWT obtenido en:

```http
POST /usuarios/login
```

Enviar el token en cada petición:

```http
Authorization: Bearer <token>
```

La respuesta de login contiene el rol en `user.rol`. Para mostrar las pantallas
operativas del prototipo móvil:

```ts
const puedeOperarLavado =
  user.rol === "LAVADO" ||
  user.rol === "ADMINISTRADOR" ||
  user.rol === "SUPERVISOR" ||
  user.rol === "COORDINADOR";

const mostrarModuloLavado =
  user.rol === "LAVADO" ||
  user.rol === "ADMINISTRADOR";
```

`LAVADO` y `ADMINISTRADOR` tienen el mismo acceso completo dentro de este
módulo: listar, consultar, crear, editar antes de iniciar y avanzar fases.
`SUPERVISOR` y `COORDINADOR` también pueden operar por decisión del MVP.
Cualquier otro usuario autenticado solo puede consultar.

El rol `LAVADO` no obtiene permisos administrativos sobre usuarios, empresas u
otros módulos. Su equivalencia con Administrador se limita a Lavado y a la
política de sesión extendida.

## Pantallas sugeridas

1. **Inicio/Listado:** procesos pendientes, en curso y finalizados.
2. **Nuevo lavado:** selección del movimiento y tipo de lavado.
3. **Detalle:** resumen de unidad, empresa, localidad y progreso.
4. **Ejecución:** inicio y finalización secuencial de las seis fases.
5. **Bitácora:** eventos cronológicos del proceso.

El listado filtrado por `FINALIZADO` puede funcionar como pantalla de historial.

## Tipos TypeScript de referencia

```ts
export type TipoLavado = "MANUAL" | "AUTOMATICO" | "PROFUNDO";

export type EstadoLavadoProceso =
  | "PENDIENTE"
  | "EN_PROCESO"
  | "FINALIZADO";

export type EstadoLavadoFase =
  | "PENDIENTE"
  | "EN_PROCESO"
  | "FINALIZADA";

export type AccionLavadoBitacora =
  | "PROCESO_CREADO"
  | "PROCESO_ACTUALIZADO"
  | "FASE_INICIADA"
  | "FASE_FINALIZADA"
  | "PROCESO_FINALIZADO";

export interface LavadoFase {
  id: string;
  lavadoProcesoId: string;
  clave: string;
  nombre: string;
  orden: number;
  estado: EstadoLavadoFase;
  fechaInicio: string | null;
  fechaFin: string | null;
  duracionEstimadaMinutos: number | null;
  duracionRealSegundos: number | null;
  responsableId: number | null;
  observaciones: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LavadoBitacora {
  id: string;
  lavadoProcesoId: string;
  lavadoFaseId: string | null;
  accion: AccionLavadoBitacora;
  descripcion: string;
  realizadoPorId: number;
  createdAt: string;
}

export interface LavadoProceso {
  id: string;
  folio: string;
  movimientoId: number;
  locomotiveNumber: number;
  empresaId: number;
  empresaNombreSnapshot: string;
  localidadId: number;
  localidadNombreSnapshot: string;
  tipoLavado: TipoLavado;
  estado: EstadoLavadoProceso;
  fechaInicio: string | null;
  fechaFin: string | null;
  duracionEstimadaMinutos: number | null;
  duracionRealSegundos: number | null;
  creadoPorId: number;
  createdAt: string;
  updatedAt: string;
  fases: LavadoFase[];
  bitacora?: LavadoBitacora[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
```

Las fechas se reciben como strings ISO 8601. Las duraciones estimadas están en
minutos y las duraciones reales en segundos.

## 1. Obtener catálogos

```http
GET /lavado/catalogos
Authorization: Bearer <token>
```

Respuesta `200`:

```json
{
  "tiposLavado": ["MANUAL", "AUTOMATICO", "PROFUNDO"],
  "estadosProceso": ["PENDIENTE", "EN_PROCESO", "FINALIZADO"],
  "estadosFase": ["PENDIENTE", "EN_PROCESO", "FINALIZADA"],
  "fases": [
    { "clave": "PREPARACION", "nombre": "Preparación", "orden": 1 },
    { "clave": "PRELAVADO", "nombre": "Prelavado", "orden": 2 },
    { "clave": "LAVADO_PRINCIPAL", "nombre": "Lavado principal", "orden": 3 },
    { "clave": "LAVADO_BAJOS", "nombre": "Lavado de bajos", "orden": 4 },
    { "clave": "ENJUAGUE", "nombre": "Enjuague", "orden": 5 },
    { "clave": "SECADO", "nombre": "Secado", "orden": 6 }
  ]
}
```

Se recomienda cargar este endpoint al entrar al módulo y conservar el resultado
durante la sesión.

## 2. Listar procesos

```http
GET /lavado?page=1&pageSize=20
Authorization: Bearer <token>
```

Filtros opcionales:

| Query | Tipo | Ejemplo |
|---|---:|---|
| `estado` | enum | `EN_PROCESO` |
| `tipoLavado` | enum | `MANUAL` |
| `localidadId` | entero | `1` |
| `empresaId` | entero | `1` |
| `movimientoId` | entero | `125` |
| `locomotiveNumber` | entero | `4512` |

Ejemplo:

```http
GET /lavado?page=1&pageSize=20&estado=EN_PROCESO&localidadId=1
```

Fragmento de respuesta `200` (cada fase incluye además todos los campos de
`LavadoFase` definidos anteriormente):

```json
{
  "data": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "folio": "LAV-20260723-A1B2C3D4",
      "movimientoId": 125,
      "locomotiveNumber": 4512,
      "empresaId": 1,
      "empresaNombreSnapshot": "Vianko",
      "localidadId": 1,
      "localidadNombreSnapshot": "Guadalajara",
      "tipoLavado": "MANUAL",
      "estado": "PENDIENTE",
      "fechaInicio": null,
      "fechaFin": null,
      "duracionEstimadaMinutos": 90,
      "duracionRealSegundos": null,
      "creadoPorId": 5,
      "createdAt": "2026-07-23T20:00:00.000Z",
      "updatedAt": "2026-07-23T20:00:00.000Z",
      "fases": [
        { "clave": "PREPARACION", "nombre": "Preparación", "orden": 1, "estado": "PENDIENTE" },
        { "clave": "PRELAVADO", "nombre": "Prelavado", "orden": 2, "estado": "PENDIENTE" },
        { "clave": "LAVADO_PRINCIPAL", "nombre": "Lavado principal", "orden": 3, "estado": "PENDIENTE" },
        { "clave": "LAVADO_BAJOS", "nombre": "Lavado de bajos", "orden": 4, "estado": "PENDIENTE" },
        { "clave": "ENJUAGUE", "nombre": "Enjuague", "orden": 5, "estado": "PENDIENTE" },
        { "clave": "SECADO", "nombre": "Secado", "orden": 6, "estado": "PENDIENTE" }
      ]
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

El listado incluye las fases ordenadas, pero no incluye `bitacora`. Para obtener
la bitácora debe consultarse el detalle.

## 3. Obtener movimientos candidatos

Antes de crear un proceso se necesita un movimiento existente con
`lavado === true` y estado distinto de `CANCELADO`.

Opción recomendada:

```http
GET /movimientos/servicios/pendientes?localidadId=1
Authorization: Bearer <token>
```

El endpoint también puede devolver movimientos de Torno. El frontend debe
filtrar:

```ts
const candidatosLavado = movimientos.filter(
  (movimiento) =>
    movimiento.lavado === true &&
    movimiento.estado !== "CANCELADO"
);
```

Como respaldo para prototipo:

```http
GET /movimientos/all?page=1&pageSize=50
Authorization: Bearer <token>
```

Un movimiento que ya tenga proceso devolverá `409` al intentar crearlo de
nuevo. No se debe ocultar definitivamente del frontend solo por ese error; se
puede consultar `/lavado?movimientoId=<id>` para recuperar el proceso existente.

## 4. Crear un proceso

```http
POST /lavado
Authorization: Bearer <token>
Content-Type: application/json
```

Body:

```json
{
  "movimientoId": 125,
  "tipoLavado": "MANUAL",
  "duracionEstimadaMinutos": 90
}
```

`duracionEstimadaMinutos` es opcional y debe ser un entero positivo.

Respuesta `201`: `LavadoProceso` completo con seis fases `PENDIENTE` y una
entrada `PROCESO_CREADO` en la bitácora.

El frontend no envía locomotora, empresa, localidad ni usuario. El backend los
obtiene del movimiento y del JWT.

## 5. Obtener el detalle

```http
GET /lavado/:lavadoId
Authorization: Bearer <token>
```

Respuesta `200`: `LavadoProceso` con:

- `fases` ordenadas del 1 al 6.
- `bitacora` ordenada cronológicamente.
- Snapshots de empresa y localidad.
- Fechas y duraciones calculadas por el backend.

Usar este endpoint al entrar a Detalle/Ejecución y refrescarlo después de
recuperar la conexión.

## 6. Editar antes de iniciar

```http
PATCH /lavado/:lavadoId
Authorization: Bearer <token>
Content-Type: application/json
```

Body parcial:

```json
{
  "tipoLavado": "PROFUNDO",
  "duracionEstimadaMinutos": 120
}
```

Para eliminar la duración estimada:

```json
{
  "duracionEstimadaMinutos": null
}
```

Respuesta `200`: proceso actualizado.

Solo se permite mientras el proceso esté `PENDIENTE`. Después del primer inicio
responde `409`.

## 7. Iniciar una fase

```http
POST /lavado/:lavadoId/fases/:faseId/iniciar
Authorization: Bearer <token>
Content-Type: application/json
```

Body:

```json
{}
```

Respuesta `200`: proceso completo actualizado.

Reglas:

- Solo puede iniciar una fase `PENDIENTE`.
- La fase anterior debe estar `FINALIZADA`.
- No puede existir otra fase `EN_PROCESO`.
- Al iniciar Preparación, el proceso cambia a `EN_PROCESO`.
- `responsableId` se obtiene del JWT; no debe enviarlo el frontend.

## 8. Finalizar una fase

```http
POST /lavado/:lavadoId/fases/:faseId/finalizar
Authorization: Bearer <token>
Content-Type: application/json
```

Body:

```json
{
  "observaciones": "Fase completada sin incidencias"
}
```

`observaciones` es opcional y permite hasta 2000 caracteres.

Respuesta `200`: proceso completo actualizado.

Al finalizar Secado:

- El proceso cambia automáticamente a `FINALIZADO`.
- Se asignan `fechaFin` y `duracionRealSegundos`.
- Se registra `PROCESO_FINALIZADO` en bitácora.

No existe una petición separada para finalizar el proceso.

## Lógica recomendada para la pantalla de ejecución

```ts
const faseActiva = proceso.fases.find(
  (fase) => fase.estado === "EN_PROCESO"
);

const siguienteFase = proceso.fases.find(
  (fase) => fase.estado === "PENDIENTE"
);

const puedeIniciar =
  proceso.estado !== "FINALIZADO" &&
  !faseActiva &&
  Boolean(siguienteFase);

const progreso =
  proceso.fases.filter((fase) => fase.estado === "FINALIZADA").length /
  proceso.fases.length;
```

Después de iniciar o finalizar una fase debe reemplazarse el estado local con la
respuesta del servidor. Evitar enviar dos veces la acción: deshabilitar el botón
mientras la petición está en curso.

Ante `409`, refrescar `GET /lavado/:lavadoId`, porque otra petición pudo haber
avanzado el proceso.

## Errores

Formato general:

```json
{
  "error": "Descripción del error",
  "message": "Descripción del error",
  "details": null
}
```

| HTTP | Uso |
|---:|---|
| `400` | Body, query o UUID inválido |
| `401` | JWT ausente, vencido o revocado |
| `403` | Rol autenticado sin permiso de operación |
| `404` | Movimiento, proceso o fase inexistente |
| `409` | Duplicado, orden incorrecto o transición inválida |
| `500` | Error interno o base de Lavado no disponible |
| `502` | El backend principal no puede comunicarse con `msLavado` |

El mensaje visible puede resolverse con:

```ts
const mensaje =
  response.data?.message ??
  response.data?.error ??
  "No fue posible completar la operación";
```

## Flujo mínimo de prueba móvil

1. Login con usuario `LAVADO`.
2. Mostrar el acceso al módulo usando `user.rol`.
3. Consultar catálogos.
4. Consultar listado y movimientos candidatos.
5. Crear un proceso.
6. Mostrar el detalle y avanzar las seis fases.
7. Confirmar el cierre automático y mostrar la bitácora.

No almacenar el JWT en logs, capturas o mensajes. La aplicación debe utilizar el
mecanismo seguro de almacenamiento de credenciales disponible en su plataforma.
