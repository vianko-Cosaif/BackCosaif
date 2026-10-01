# ms_torreon

Microservicio para movimientos naturales de Torreon.

## DB base

Tablas iniciales:

```txt
movimiento_torreon_ferro
ronda_torreon
ronda_torreon_movimiento
incidente_torreon_ferro
movimiento_torreon_foto
incidente_torreon_foto
```

Incidentes:

```txt
ABIERTO
RESUELTO
```

Un incidente `ABIERTO` bloquea la via o seccion registrada en `incidente_torreon_ferro`.
Los movimientos de la ronda que tengan que pasar por ese recurso quedan `BLOQUEADO` en
`ronda_torreon_movimiento` hasta que el incidente pase a `RESUELTO`.

No hay estados `CERRADO` ni `CANCELADO` para incidente.

## Modelos de dominio

```txt
movimientos/movimiento.model.ts
- Crear movimiento.
- Iniciar con captura ANTES_MOVIMIENTO.
- Registrar fotos de proceso.
- Finalizar con captura FIN_MOVIMIENTO.
- Detener/reanudar como transiciones del movimiento, delegando incidente y ronda.

incidentes/incidente.model.ts
- Crear incidente ABIERTO con minimo 1 foto y maximo 4.
- Resolver incidente y reencolar primero el movimiento ligado.
- Cerrar incidente cancelando el movimiento ligado.
- Buscar incidentes que bloquean una via/seccion.
- Al abrir/resolver, afecta rondas mediante RondaModel.

rondas/ronda.model.ts
- Crear/reutilizar ronda activa.
- Insertar movimiento con orden/prioridad.
- Marcar movimiento ACTIVO, CONCLUIDO o BLOQUEADO.
- Bloquear/desbloquear movimientos por incidente abierto/resuelto.
```

Fotos:

```txt
movimiento_torreon_foto.tipo:
ANTES_MOVIMIENTO
PROCESO_MOVIMIENTO
FIN_MOVIMIENTO
```

El movimiento debe registrar evidencia al iniciar y al terminar. Si durante el proceso
se toma evidencia adicional, se guarda como `PROCESO_MOVIMIENTO`.

El incidente guarda sus fotos en `incidente_torreon_foto` con `orden` unico por incidente.
La API debe validar que el incidente tenga sus 4 evidencias requeridas antes de permitir
el flujo que corresponda.

Las capturas reales se reciben como `dataUrl`, `base64` o `contenidoBase64`.
El micro las optimiza con la misma regla de incidentes del back principal
(maximo 1920x1080, JPEG calidad 85) y las guarda bajo `uploads/incidentes`
en carpetas `YYYY/MM/DD`. La ruta relativa queda en `url` y `storageKey`
de las tablas de Torreon. Si se envia una `url` ya existente, se conserva como
referencia externa.

## Scripts

```bash
npm run ms:torreon
npm run build:torreon
npm run prisma:torreon:generate
npm run prisma:torreon:push
```

## Endpoints operativos

Todos bajo `/api` y firmados con HMAC.

```txt
POST   /api/movimientos
GET    /api/movimientos
GET    /api/movimientos/:id
POST   /api/movimientos/:id/iniciar
POST   /api/movimientos/:id/fotos
PATCH  /api/movimientos/:id/finalizar
POST   /api/movimientos/:id/detener
POST   /api/movimientos/:id/incidentes
PATCH  /api/movimientos/:id/reanudar
PATCH  /api/incidentes/:id/resolver
PATCH  /api/incidentes/:id/cerrar
GET    /api/rondas
GET    /api/rondas/:id
```

Reglas:

```txt
Crear movimiento:
- Requiere empresa_id, creado_por_id, localidad_id, locomotora y al menos una via/seccion.
- Crea o reutiliza ronda activa.
- Inserta el movimiento en ronda_torreon_movimiento.
- Si la via/seccion ya tiene incidente ABIERTO, entra a ronda como BLOQUEADO.

Iniciar movimiento:
- Requiere minimo 1 captura.
- Guarda captura como ANTES_MOVIMIENTO.
- Rechaza si la ruta esta bloqueada por incidente ABIERTO.
- Cambia movimiento a EN_PROCESO y detalle de ronda a ACTIVO.

Capturas durante proceso:
- POST /api/movimientos/:id/fotos con tipo PROCESO_MOVIMIENTO.

Finalizar movimiento:
- Requiere minimo 1 captura.
- Guarda captura como FIN_MOVIMIENTO.
- Rechaza si hay incidente ABIERTO del movimiento.
- Cambia movimiento a CONCLUIDO y detalle de ronda a CONCLUIDO.

Detener movimiento:
- Crea incidente_torreon_ferro ABIERTO.
- Requiere minimo 1 captura del incidente y permite maximo 4.
- Usa via/seccion enviada o, si no viene, toma destino del movimiento.
- Cambia movimiento a DETENIDO.
- Bloquea movimientos de rondas activas que usen esa via/seccion.

Resolver incidente:
- Cambia incidente a RESUELTO.
- Desbloquea movimientos bloqueados por ese incidente.
- Regresa el movimiento ligado a SOLICITADO y lo coloca primero en la cola disponible.

Cerrar incidente:
- Registra el incidente como RESUELTO con la auditoria de cierre.
- Cambia el movimiento o arrastre ligado a CANCELADO y lo retira de la cola activa.

Reanudar movimiento:
- Requiere que el movimiento este DETENIDO.
- Si el incidente sigue ABIERTO, lo resuelve con solucion y resuelto_por_id.
- Cambia movimiento a EN_PROCESO y detalle de ronda a ACTIVO.
```

Payload de captura:

```json
{
  "dataUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...",
  "tomadaPorId": 10,
  "comentario": "opcional"
}
```

Tambien se acepta `{ "base64": "...", "mimeType": "image/jpeg" }` o una
`url` ya existente. Los endpoints aceptan `fotos` o `capturas` como arreglo.

## Seguridad entre servicios

Los endpoints bajo `/api` requieren firma HMAC por request. No se usa token plano.

Headers requeridos:

```txt
x-service-id
x-timestamp
x-nonce
x-content-sha256
x-signature
```

Payload firmado:

```txt
METHOD
PATH_WITH_QUERY
TIMESTAMP
NONCE
BODY_SHA256
```

`x-signature` debe enviarse como:

```txt
v1=<hmac_sha256_hex>
```

La firma usa el secreto correspondiente al `x-service-id` configurado en `TORREON_SERVICE_AUTH_SECRETS`.
La ventana por default es de 5 minutos y se rechazan nonces repetidos dentro de esa ventana.
