# Actualización de seguridad y procesos

Implementación de los hallazgos S02–S10, P01–P04 y las optimizaciones de la revisión del 7 de septiembre de 2026. S01 (credenciales, archivos de secretos e historial Git) queda a cargo del responsable del proyecto, por su instrucción expresa. Este cambio no despliega ni modifica bases operativas.

## Cambios

| Área | Comportamiento nuevo |
| --- | --- |
| Datos de usuarios | Movimientos e incidentes seleccionan campos públicos; excluyen hashes y datos internos de autenticación. |
| Autorización | Torno valida ruta, método, permiso y referencias antes del proxy; filtra listados, imágenes, estadísticas y programados. Torreón, secciones, vías y FCM contrastan empresa/localidad según la política central. Los actores se obtienen de la sesión. |
| Sesiones | Logout de la sesión actual o de todas las sesiones. Duración absoluta máxima de siete días; renovaciones espaciadas al menos cinco minutos. Realtime revalida usuario, sesión y alcance antes de emitir eventos y durante el heartbeat. |
| Recursos | Límites de tramas, conexiones, tickets y clientes lentos de WebSocket; JSON normal de 1 MB y solicitudes con imágenes autenticadas con concurrencia acotada. Listados de Torno: 20 registros por defecto, máximo 100. |
| Producción | CORS exige orígenes explícitos; auditoría habilitada con clave independiente y cadena válida antes de iniciar. La verificación del archivo se hace por streaming y la cola de escritura está limitada. Un fallo de auditoría bloquea nuevas mutaciones. |
| Contraseñas y dependencias | Argon2id con 19 MiB, dos iteraciones y paralelismo uno; rehash al iniciar sesión. Login con tamaño e intentos limitados y máximo ocho verificaciones simultáneas por proceso. Prisma 6.19.3 y correcciones transitivas fijadas en el lockfile. |
| Cobranza | Pagos y cambios de corte bloquean la misma fila antes de calcular saldo. Aritmética en centavos, dos decimales máximo, estado PAGADO requiere saldo cero. Clave única de pago, escritura y recibo en la misma transacción. |
| Reintentos generales | Respuesta idempotente persistida antes de enviarla. Claves antiguas PROCESSING o con resultado incierto nunca vuelven a ejecutar automáticamente el negocio. |
| Incidentes | Cierre y trabajo pendiente en una transacción; barrido periódico en todos los workers. La reprogramación guarda su resultado junto al movimiento, serializa sobre la fila original y retoma efectos pendientes al reintentar. |
| Servicios | Torno y Torreón registran eventos con triggers dentro de la transacción operativa. La API importa eventos a una cola durable, procesa y reintenta fallos. |
| Rendimiento | Cliente Prisma compartido por base/proceso, navegador PDF compartido con una sola promesa de arranque y máximo cuatro páginas. Llamadas entre servicios con plazo de 20 segundos. Mantenimiento de rondas y recuperación de Torno en workers; las consultas de recuperación agrupan lecturas. |

## Instalación y validación

Usar Node 24 (`.nvmrc`; mínimo compatible 22.12). Desde la raíz:

```sh
nvm use
npm ci --ignore-scripts
npm run prisma:generate:all
npm run typecheck
npm test
npm audit --audit-level=moderate
```

La instalación omite scripts automáticos; la generación de los cuatro clientes es explícita y obligatoria antes de compilar/arrancar. Los clientes generados que ya están rastreados no sustituyen este paso. Para PDF, instalar Chrome/Chromium compatible y configurar `PUPPETEER_EXECUTABLE_PATH`, o instalar el navegador mediante `npx puppeteer browsers install chrome`. El sandbox del navegador está habilitado por defecto. `PDF_DISABLE_SANDBOX=true` está disponible únicamente para contenedores que ya aportan el aislamiento requerido.

El workflow de GitHub ejecuta instalación limpia, generación, TypeScript, pruebas, migraciones y transacciones reales con PostgreSQL 16 desechable. No envía FCM ni usa datos del negocio.

## Migraciones antes del arranque

Los SQL de `migrations/security-20260907` son aditivos y específicos para una base existente con el esquema del proyecto. No sustituyen una migración completa de instalaciones vacías. Necesitan `psql`, permisos DDL para la instalación y permisos DML para el usuario de ejecución.

El ejecutor usa la URL de la variable correspondiente; si no existe, conserva el fallback de archivo de entorno del servicio. No imprime conexiones ni credenciales. Cada base guarda versión y SHA-256: una segunda aplicación se omite y un SQL modificado después de aplicarse se rechaza.

| Target | Variable |
| --- | --- |
| main | `DATABASE_URL` |
| comercial | `COMERCIAL_DATABASE_URL` |
| torno | `TORNO_DATABASE_URL` |
| torreon | `TORREON_DATABASE_URL` |

Con respaldo verificado, aplicar primero en un entorno de ensayo. Para el despliegue coordinado, pausar escrituras y detener la versión anterior de la API y servicios; aplicar los cuatro SQL y arrancar la versión nueva. No mezclar la API antigua, que notifica directamente, con el worker nuevo.

```sh
npm run migrate:security -- --target=main --apply
npm run migrate:security -- --target=comercial --apply
npm run migrate:security -- --target=torno --apply
npm run migrate:security -- --target=torreon --apply
npm run migrate:security -- --target=main --check
npm run migrate:security -- --target=comercial --check
npm run migrate:security -- --target=torno --check
npm run migrate:security -- --target=torreon --check
npm run build
npm run build:torno
npm run build:torreon
npm run build:comercial
```

Sin `--apply`/`--check`, el ejecutor solo informa versión/checksum. No usar `db push` para instalar estos cambios: no crea los triggers. No borrar tablas, claves o eventos pendientes para revertir código. Ante un rollback, detener consumidores y escrituras y conservar las tablas para conciliar las operaciones.

Configurar antes de iniciar la API principal:

- `NODE_ENV=production`, `CORS_MODE=enforce` y `CORS_ORIGINS` con los orígenes HTTPS completos separados por comas.
- `AUDIT_ENABLED=true`, `AUDIT_HMAC_KEY` independiente de JWT y de al menos 32 caracteres aleatorios, `AUDIT_LOG_PATH` en almacenamiento persistente escribible solo por el servicio.
- Un `NODE_APP_INSTANCE` distinto por proceso y rutas de auditoría que no se compartan entre hosts. Todos los consumidores acceden a las mismas bases de cada servicio.
- Conexión directa de la API a las bases de Torno/Torreón con acceso a las entidades de alcance y sus tablas `operational_outbox`; permisos sobre la cola en la base principal.

La API principal y Comercial comprueban sus tablas operativas antes de escuchar. La API principal también verifica que las colas de los dos servicios existan. Las claves de producción se suministran por el mecanismo de despliegue; no se añaden a este documento.

## Compatibilidad con los clientes

- Registrar cada pago con `operacionId` o `X-Idempotency-Key` estable, de 8–128 caracteres (`A-Z`, `a-z`, números, `.`, `_`, `:`, `-`; comienza con letra o número). Mantener la misma clave y cuerpo ante timeout/reintento. Una nueva clave representa un pago nuevo.
- `POST /usuarios/logout` revoca la sesión actual; `POST /usuarios/logout-all` revoca todas las del usuario. Ambos requieren autenticación y responden 204. Tras siete días debe iniciarse sesión otra vez.
- Los listados de Torno sin paginación mantienen el array pero se acotan a 20. Enviar `page` y `pageSize` para recorrerlos. Se filtra adicionalmente por empresa después de la paginación del servicio: una página puede quedar vacía aunque existan páginas siguientes. Para usuarios acotados, `meta` no expone totales globales; recorrer `hasNextPage`.
- FCM devuelve metadatos y los últimos seis caracteres del token para diagnóstico. Las consultas/modificaciones fuera de alcance devuelven 403.
- Los efectos entre servicios se procesan normalmente en los siguientes ciclos de cinco segundos. El éxito de la escritura indica que la operación y su evento quedaron registrados; no significa que todos los clientes hayan recibido una notificación.

## Recuperación, retención y observabilidad

Los efectos externos tienen entrega **al menos una vez**: una caída después de que FCM acepte un mensaje puede repetir la notificación. Los clientes deben deduplicar por identificador/tag de entidad y refrescar el estado canónico. No se promete entrega exactamente una vez a servicios externos.

En `durable_jobs`, observar cantidad y antigüedad de filas con `completed_at IS NULL`, `attempts` y `last_error`. El reclamo usa `FOR UPDATE SKIP LOCKED`, lease renovable y reintentos exponenciales hasta una hora entre intentos. Si falla una dependencia, recuperar la dependencia; no borrar/recrear el trabajo. En cada servicio, observar antigüedad de `operational_outbox.processed_at IS NULL`. Los logs `jobs:retry`, `jobs:worker_error`, `outbox:import_failed` y `security:audit_append_failed` requieren atención operativa.

La idempotencia general evita repetir una escritura incierta, pero no integra automáticamente todas las transacciones de todos los controladores. Un 425 indica operación en curso. `IDEMPOTENCY_REVIEW_REQUIRED` (409/503) requiere consultar el recurso y los registros operativos antes de decidir el resultado. No reintentar con otra clave. No existe un endpoint público que libere estos registros. Cobranza sí conserva el recibo dentro de la transacción de pago y permite repetir la misma clave con seguridad.

Una tarea horaria procesa lotes de 1 000 filas: elimina payloads de trabajos completados hace siete días, respuestas generales vencidas y eventos de servicio importados hace 30 días; elimina trabajos de mantenimiento de rondas completados hace 30 días. Las claves de operación se conservan para impedir duplicados. Una respuesta cuyo contenido venció devuelve `IDEMPOTENCY_RESULT_EXPIRED` y requiere consultar el recurso. No se eliminan pagos, recibos de pago, checkpoints de incidentes ni trabajos pendientes. El volumen de claves pequeñas aún crece con las operaciones y debe vigilarse.

La auditoría conserva archivos con permisos 0600 y verifica HMAC/continuidad al arrancar. Enviar sus segmentos a almacenamiento externo con control de acceso y protección contra sobrescritura; retención operativa inicial de 90 días, ajustable al contrato y obligaciones del sistema. Rotar con el proceso detenido: verificar con `npm run audit:verify`, archivar el archivo completo y el resultado de verificación (`lastHash`, cantidad, instancia y fechas), verificar la copia externa y asignar un archivo nuevo. Cada segmento comienza en GENESIS; el manifiesto externo mantiene la relación entre segmentos. No truncar/copiar con el escritor activo. Si hay una cola saturada, archivo incompleto o fallo de disco, investigar y reparar antes de reiniciar.

## Pruebas con base desechable

El harness exige explícitamente PostgreSQL en `127.0.0.1:55439` y nunca toma `DATABASE_URL` del proyecto. Crea únicamente `security_main`, `security_comercial`, `security_torno` y `security_torreon`:

```sh
export SECURITY_TEST_DB_ADMIN_URL=postgresql://security_test@127.0.0.1:55439/postgres
node tests/security-db-setup.cjs
npm run test:integration
```

`--reset` en el setup elimina exclusivamente esas cuatro bases de prueba. La integración comprueba saldo/estado, pagos concurrentes y duplicados, ausencia de hashes en movimientos, autocierre concurrente, caída después del commit y recuperación, rollback del outbox y reintento de trabajos. Las pruebas aisladas cubren permisos, alcance, actores, FCM, revocación, frames grandes, presión de escritura y respuesta idempotente con Express real. No sustituyen pruebas de carga ni certifican el entorno de producción.

## Validación local del 8 de septiembre de 2026

| Verificación | Resultado |
| --- | --- |
| Instalación limpia con `npm ci --ignore-scripts` | Correcta; 553 paquetes instalados y cero vulnerabilidades reportadas en la auditoría completa. |
| Generación Prisma | Los cuatro clientes generados con 6.19.3. Se conservan actualizados los artefactos que el repositorio ya rastreaba. |
| TypeScript | API principal, Torno, Torreón y Comercial sin errores. |
| `npm test` | Nueve suites existentes y cuatro nuevas suites de regresión, todas correctas. Incluye concurrencia del navegador y despacho de eventos. |
| Migraciones de actualización | Las cuatro bases creadas con los esquemas del HEAD anterior a estos cambios; SQL aplicado dos veces y checksum verificado. Se usó `--reset --baseline-ref=HEAD` únicamente en el cluster aislado. |
| Integración PostgreSQL | Pagos concurrentes, reintentos, saldos exactos, recuperación de incidentes, dos incidentes simultáneos, outbox transaccional y retención de payloads correctos. |
| Chrome real | PDF sintético válido de 18 658 bytes, sandbox habilitado; navegador cerrado al terminar. |
| Argon2id | Ocho hashes simultáneos y una verificación en 72 ms en este equipo. Es una muestra local, no una capacidad garantizada de producción. |
| S01 y entorno | Los cinco archivos críticos comparados con HEAD permanecen intactos. El PostgreSQL temporal del puerto 55439 quedó detenido. |

El workflow queda listo para su primera ejecución en GitHub; no se ejecutó remotamente en esta tarea. La política de autorización cambia a versión 3 para que los clientes puedan invalidar capacidades almacenadas.
