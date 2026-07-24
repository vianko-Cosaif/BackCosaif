# msLavado

Microservicio independiente para el MVP de lavado industrial. Su base de datos no
comparte tablas ni llaves foraneas con la base principal de BackCosaif.

## Alcance

El MVP administra:

- Un proceso de lavado por movimiento.
- Seis fases fijas y secuenciales.
- Bitacora automatica de cambios.

No incluye operarios como catalogo, maquinaria, insumos, evidencias, pausas,
cancelaciones ni eliminacion de procesos.

## Configuracion

Copiar `.env.lavado.example` como `.env.lavado` y reemplazar todas las credenciales:

```dotenv
LAVADO_HOST=127.0.0.1
LAVADO_PORT=3004
LAVADO_SERVICE_AUTH_SECRETS={"back-cosaif":"secreto-compartido"}
LAVADO_SIGNATURE_TOLERANCE_MS=300000
LAVADO_DATABASE_URL=postgresql://usuario:password@localhost:5432/cosaif_lavado
LAVADO_SHADOW_DATABASE_URL=postgresql://usuario:password@localhost:5432/cosaif_lavado_shadow
```

Agregar al `.env` del backend principal:

```dotenv
LAVADO_MS_URL=http://127.0.0.1:3004
LAVADO_SERVICE_ID=back-cosaif
LAVADO_SERVICE_SECRET=secreto-compartido
```

`LAVADO_SERVICE_ID` debe existir como clave dentro de
`LAVADO_SERVICE_AUTH_SECRETS` y ambos lados deben usar el mismo secreto.

## Inicializacion a cargo del responsable de la base

Estos comandos se documentan, pero no se ejecutan automaticamente:

```bash
npm run prisma:lavado:generate
npm run prisma:lavado:push
npm run dev:lavado
```

La compilacion opcional se encuentra en `npm run build:lavado`.

## API para el frontend

El frontend nunca debe llamar directamente al puerto 3004. Debe usar el backend
principal con su JWT:

```txt
GET    /lavado/catalogos
GET    /lavado
POST   /lavado
GET    /lavado/:id
PATCH  /lavado/:id
POST   /lavado/:id/fases/:faseId/iniciar
POST   /lavado/:id/fases/:faseId/finalizar
```

Filtros de listado:

```txt
page
pageSize
estado
tipoLavado
localidadId
empresaId
movimientoId
locomotiveNumber
```

Ejemplo de alta:

```http
POST /lavado
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "movimientoId": 125,
  "tipoLavado": "MANUAL",
  "duracionEstimadaMinutos": 90
}
```

El backend principal obtiene del movimiento la locomotora, empresa y localidad,
inyecta `creadoPorId` desde el JWT y firma la peticion interna.

Ejemplo de edicion antes de iniciar:

```http
PATCH /lavado/11111111-1111-4111-8111-111111111111
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "tipoLavado": "PROFUNDO",
  "duracionEstimadaMinutos": 120
}
```

Ejemplo de operacion:

```http
POST /lavado/11111111-1111-4111-8111-111111111111/fases/22222222-2222-4222-8222-222222222222/iniciar
Authorization: Bearer <jwt>
Content-Type: application/json

{}
```

```http
POST /lavado/11111111-1111-4111-8111-111111111111/fases/22222222-2222-4222-8222-222222222222/finalizar
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "observaciones": "Fase completada sin incidencias"
}
```

Al finalizar `SECADO`, el proceso se cierra automaticamente. El detalle del
proceso incluye las fases ordenadas y la bitacora cronologica.

## Respuestas y permisos

- Los listados responden `{ "data": [], "meta": {} }`.
- Validacion: `400`.
- JWT ausente o invalido: `401`.
- Rol sin permiso de escritura: `403`.
- Recurso inexistente: `404`.
- Duplicado o transicion invalida: `409`.
- Microservicio no disponible: `502`.

Cualquier usuario autenticado puede consultar. Solo `LAVADO`, `SUPERVISOR`,
`COORDINADOR` y `ADMINISTRADOR` pueden crear, editar o avanzar fases.

## Casos de humo recomendados

1. Crear un lavado para un movimiento valido y comprobar sus seis fases.
2. Repetir el alta para el mismo movimiento y esperar `409`.
3. Probar movimientos inexistentes, cancelados o con `lavado=false`.
4. Intentar iniciar una fase fuera de orden y esperar `409`.
5. Intentar finalizar una fase pendiente y esperar `409`.
6. Iniciar la primera fase e intentar editar el proceso; debe responder `409`.
7. Completar las seis fases y comprobar estado `FINALIZADO`, duraciones y bitacora.
8. Probar lectura con cualquier JWT y escritura con un rol no operativo.
9. Llamar directamente al microservicio sin firma, con firma vencida y con nonce repetido.
