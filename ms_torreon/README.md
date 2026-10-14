# ms_torreon

Microservicio de movimientos naturales y arrastres de Torreón. Este documento
explica el flujo natural vigente. Guadalajara y los otros servicios conservan
sus reglas y sus tablas.

## Cola de movimientos naturales

Cada solicitud conserva su ID, solicitante, locomotora, instrucciones, fotos e
incidentes. La unidad de atención determina qué solicitudes se ejecutan juntas:
una solicitud individual o un conjunto formado explícitamente por coordinación,
supervisión o administración. Capturar de 1 a 5 solicitudes en un lote no las agrupa.

- Una solicitud requiere vías de origen y destino, sus secciones cuando existen,
  tipo de movimiento, polo de salida y polo de llegada independientes (Norte/Sur).
  Remolcada requiere otra locomotora
  y Empujar/Jalar; esa máquina no crea otra solicitud.
- El cliente crea, consulta y edita las solicitudes pendientes de su empresa;
  puede cancelar sus propias solicitudes antes de iniciar.
- Coordinación/supervisión prioriza, forma conjuntos y asigna un maquinista activo
  de Torreón. Puede agrupar solicitudes de empresas diferentes.
- La cola atiende primero unidades habilitadas por solución de incidente, en orden
  de habilitación; luego prioridades manuales y después solicitudes por recepción.
- Cada maquinista atiende una sola unidad a la vez. Una unidad que se habilita
  no interrumpe su trabajo actual.
- El maquinista completa la inspección 360 en la app y usa **Iniciar**. Inicio y
  finalización no exigen fotos. Un conjunto inicia y finaliza todos sus miembros
  abiertos; los miembros cancelados o concluidos conservan su estado.

Estados de unidad: `PENDIENTE`, `EN_PROCESO`, `DETENIDA`, `LISTA_REANUDAR`,
`CONCLUIDA`, `CANCELADA`. Se guardan en `unidad_atencion_torreon`. La tabla
`bitacora_natural_torreon` registra actor, rol, fecha y transición. Las rondas
históricas permanecen consultables; sus mutaciones operativas devuelven `409`.

## Incidentes y continuidad

El maquinista asignado puede reportar un incidente de una maniobra iniciada con
motivo y de 1 a 4 fotos. El reporte detiene toda la unidad. La unidad detenida o
bloqueada por un recurso sale de la lista y del paquete offline del maquinista;
coordinación, supervisión y los clientes conservan su consulta según alcance.

Cliente, cliente administrador, cliente coordinador, coordinación, supervisión o
administración pueden confirmar la solución dentro de su alcance. Cuando todos
los impedimentos propios y de vías/secciones están resueltos, la unidad pasa a
`LISTA_REANUDAR`. Los movimientos siguen `DETENIDO` hasta que el maquinista vuelva
a usar **Iniciar**. Se conservan el grupo, IDs, fecha de inicio original y evidencias.
El maquinista no confirma soluciones ni dispone de una acción manual de reanudar.
Las rutas heredadas de reanudación devuelven `403`.

Los incidentes naturales no vencen, no cancelan solicitudes por tiempo o por número
de reportes, y no generan solicitudes de reemplazo. Cerrar un incidente natural
para cancelar la maniobra devuelve `409`. Estas reglas no cambian Arrastres.

## Tiempos e historial

Los campos `poloOrigen` y `poloDestino` se conservan por solicitud en cola, detalle,
búsquedas, lotes y paquetes offline. Capturar exige ambos; editar permite modificar
uno sin cambiar el otro. Los históricos con `null` se muestran como «No registrado»:
no se copia el antiguo `polo` ni se deduce desde instrucciones. Editar solamente
indicaciones conserva esos valores desconocidos y las secciones seleccionadas.

La cola y las respuestas enriquecidas de movimientos incluyen:

- `tiempoActivoSegundos`: ejecución acumulada, descontando todas las pausas y la
  espera entre solución y el siguiente inicio físico.
- `tiempoTotalSegundos`: tiempo desde el primer inicio hasta fin o el cálculo actual.
- `tiempoCalculadoEn`: fecha ISO de cálculo. Solo en `EN_PROCESO` el cliente puede
  avanzar el tiempo activo a partir de esta referencia.
- `tiempoActivoEstimado`: verdadero si un registro histórico sin bitácora de
  reanudación requirió usar la fecha de solución como aproximación.

Los reportes de cualquier integrante detienen el reloj de todo el conjunto.
Pausas superpuestas no se descuentan dos veces. La conclusión fija el tiempo final.

`GET /cola/:id/historial` devuelve la bitácora por orden de fecha e ID. Para clientes,
el gateway fija `empresaId` desde la sesión: permite consultar conjuntos que
contengan solicitudes propias y oculta solicitudes, incidentes y datos de otras
empresas. Las transiciones compartidas se conservan sin revelar esos datos.
El personal operativo autorizado conserva el historial completo.

## Endpoints

A través del gateway autenticado `/torreon`; el microservicio los monta bajo `/api`.
El actor y rol provienen de la sesión y de los encabezados firmados del gateway.

```text
POST  /movimientos
POST  /movimientos/lote                  { clientRequestId, movimientos: [1..5] }
GET   /movimientos
GET   /movimientos/buscar
GET   /movimientos/:id
GET   /movimientos/:id/edicion
PATCH /movimientos/:id/edicion
PATCH /movimientos/:id/cancelar           { razon }
GET   /cola                             ?localidadId=&historial=true|false
GET   /cola/siguiente                    ?localidadId=
PATCH /cola/priorizar                    { unidadIds, enConjunto }
PATCH /cola/:id/asignar                  { operadorId }
POST  /cola/:id/iniciar                  {}
POST  /cola/:id/finalizar                {}
GET   /cola/:id/historial
POST  /movimientos/:id/incidentes        { motivo, fotos }
PATCH /incidentes/:id/resolver?tipo=NATURAL { solucion }
GET   /incidentes/:id/fotos/:fotoId?tipo=NATURAL
```

También existen `POST /movimientos/:id/iniciar` y
`PATCH /movimientos/:id/finalizar`. En conjuntos operan la unidad completa.
El servidor valida turno, asignación e impedimentos al ejecutar cada acción.
Las transiciones requieren conexión; el paquete offline permite consultar la cola
válida y no habilita transiciones locales que el servidor no haya autorizado.

`GET /movimientos/buscar` exige `localidadId` y admite `empresaId`, `vista=ACTIVOS|PASADOS`,
`estados` separados por coma, `q`, `locomotiveNumber`, `locomotivePrefix`, `prioridad`,
`fechaCampo=solicitud|inicio|fin|creacion`, `fechaDesde`/`fechaHasta` ISO, `sortBy`,
`sortDir=asc|desc`, `page` y `pageSize` (1–100). Devuelve `{ data, meta }` con total
global y páginas reales. Los filtros y el orden se aplican antes de paginar, bajo
una misma lectura de la base. Los detenidos siguen activos; pasados contiene solo
concluidos y cancelados. El gateway fija empresa/localidad según la sesión.

## Evidencia opcional y obligatoria

Inicio/final permiten `fotos`, `capturas` o `fotosPorMovimiento`, sin exigirlas.
`POST /movimientos/:id/fotos` permite agregar de 1 a 4 fotos por etapa a una maniobra
iniciada (`ANTES_MOVIMIENTO`, `PROCESO_MOVIMIENTO` o `FIN_MOVIMIENTO`). Un incidente
sí requiere de 1 a 4 fotos. La evidencia pertenece siempre a su solicitud/incidente.

```json
{ "dataUrl": "data:image/jpeg;base64,...", "comentario": "opcional" }
```

Se acepta también `base64` con `mimeType`, `contenidoBase64` o una URL existente.
El servidor optimiza las capturas y guarda `url` y `storageKey`; la identidad del
fotógrafo se toma del actor autenticado.

## Instalación y comprobación

```sh
npm run prisma:torreon:generate
npm run build:torreon
npm run ms:torreon
npm run migrate:torreon:operativo          # vista previa, sin aplicar
npm run migrate:torreon:operativo -- --check
```

La activación y migraciones están descritas en
[`migrations/torreon-operativo-20261008/README.txt`](../migrations/torreon-operativo-20261008/README.txt).
Los polos separados requieren además la migración aditiva
[`torreon-polos-20261012`](../migrations/torreon-polos-20261012/README.txt), antes de
reiniciar gateway/workers/microservicio con el nuevo cliente Prisma. Desplegar API
antes de web/APK. Preparar los archivos o generar el cliente no aplica la migración.
No sustituir las migraciones por `db push`: el outbox necesita sus triggers.
Las pruebas aisladas relevantes se incluyen en `npm test`. La prueba de integración
`tests/torreon-operativo-integration.cjs` exige una base desechable nombrada
`torreon_operativo_test` (con sufijo opcional), nunca una base operativa.
`tests/torreon-search-integration.cjs` usa exclusivamente una base local vacía
`torreon_search_test` (con sufijo opcional) mediante `TORREON_TEST_DATABASE_URL`;
comprueba búsquedas y páginas posteriores a 100 registros, fechas y aislamiento.

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
