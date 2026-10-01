# Rendimiento y refactorización — 8 de septiembre de 2026

Implementación de los seis frentes acordados: medición, listados compactos, Rondas, reportes, separación de responsabilidades y paginación/índices. La corrección crítica de credenciales e historial Git reservada al propietario queda fuera de estos cambios.

## Qué cambia

1. **Medición.** Guardian mide desde la entrada de la petición, incluyendo autenticación y lectura del cuerpo. Cada petición registra cuántas operaciones Prisma terminó y cuánto tiempo sumaron. Se instrumentan los clientes principal, Torno y Torreón utilizados por la API. Los trabajos registran duración, espera en cola y reintentos. Una desconexión libera la concurrencia una sola vez y se registra como 499.
2. **Listados.** Nuevo `GET /movimientos/listado`: devuelve campos operativos, nombres, posición de ronda y cantidad de incidentes. Las instrucciones, imágenes y relaciones de usuarios completas se consultan mediante el detalle existente. Los conteos se agrupan únicamente para los IDs de la página; se evitó un plan de Prisma que agregaba toda la tabla de incidentes antes del `LIMIT`.
3. **Rondas.** Planes de orden independientes de Prisma, eliminación de recorridos cuadráticos, búsqueda de huecos mediante conjuntos y escrituras en lotes de 250. Las recomposiciones independientes usan transacciones serializables con hasta tres intentos ante conflictos; cuando un llamador proporciona transacción se conserva esa transacción. El mantenimiento visita localidades con actividad y reutiliza un único trabajo pendiente por localidad.
4. **Reportes.** Nuevo resumen agregado en PostgreSQL con caché de cinco segundos y agrupación de conteos comerciales sin traer cada incidente. Exportaciones de movimientos en CSV, Excel y PDF mediante una cola durable y un proceso separado de la API.
5. **Refactorización.** La búsqueda de Torreón y el agendado/recuperación de Torno salen de `MovimientoController` hacia módulos de aplicación. El controlador pasa de 2462 a 1846 líneas. Consultas, planes de Rondas, autorización de exportaciones, almacenamiento, generación de archivos y ejecución del worker tienen responsabilidades separadas. Se conservan los contratos anteriores.
6. **Paginación e índices.** Cursor por `createdAt DESC, id DESC`, sin depender de que siga existiendo la fila de anclaje, y conteo total opcional. Tres índices respaldan el orden global, por empresa y por localidad. Se descartó un índice candidato de Rondas que no mejoró de forma relevante la prueba.

Los nuevos listados/resúmenes/exportaciones consultan los movimientos base de COSAIF. La búsqueda y los reportes específicos de Torreón y Arrastre conservan sus rutas actuales. Los conteos comerciales optimizados sí cubren incidentes base, Torno, Lavado, Torreón natural y Arrastre.

## Activación

Estas instrucciones se ejecutan en el entorno de despliegue. Las migraciones realizadas durante la validación fueron exclusivamente sobre PostgreSQL temporal, con datos sintéticos.

1. Usar Node 24 y la instalación documentada en `actualizacion-seguridad-20260907.md`; sus cuatro migraciones de seguridad siguen siendo requisito.
2. Aplicar la nueva migración **antes de arrancar esta versión de la API**:

   ```sh
   npm run migrate:performance -- --apply
   npm run migrate:performance -- --check
   npm run prisma:generate:all
   npm run build
   ```

   Se usa la conexión principal configurada y se requiere `psql`. La migración es aditiva, transaccional y verifica su checksum. Crea `report_exports` y tres índices. La creación de índices bloquea escrituras mientras se ejecuta: usar una ventana de mantenimiento. Hay límites de espera de bloqueo de 5 segundos y ejecución de 120 segundos; ante un error la transacción se revierte. No se modifican los SQL de seguridad ya aplicados.

3. Configurar `REPORT_EXPORT_DIR` con la **misma ruta absoluta y volumen privado** para API y worker, ejecutados con el mismo usuario/UID del sistema (los archivos se crean con permisos 0600). El valor predeterminado es `.private/report-exports` relativo al directorio de ejecución. Si los procesos están en hosts distintos, necesitan almacenamiento compartido; no publicar este directorio como estático.
4. Reiniciar la API e iniciar un proceso supervisado independiente:

   ```sh
   npm run worker:reports
   ```

   En desarrollo: `npm run dev:worker:reports`. El worker necesita la conexión principal, Node 24 y Chrome para PDF (`CHROME_BIN` o `PUPPETEER_EXECUTABLE_PATH`). Usa el sandbox del navegador. Para finalizar, admite SIGTERM/SIGINT, termina el trabajo en curso y cierra conexiones.
5. Adoptar las nuevas rutas en el frontend. Las rutas anteriores mantienen sus respuestas; la reducción de carga del listado y la generación en segundo plano requieren que el cliente use las rutas nuevas. Los índices, el mantenimiento, la instrumentación y los conteos comerciales se aplican al desplegar el backend.

## Contratos para el frontend

Todas las rutas mantienen la autenticación de la API. Empresa y localidad se validan o completan con el alcance del usuario autenticado.

### Listado compacto

```http
GET /movimientos/listado?pageSize=20&empresaId=12&localidadId=3
```

Filtros: `empresaId`, `localidadId`, `locomotiveNumber`, `estado`, `prioridad`, `finalizado`, `desde`, `hasta`. Los IDs son enteros positivos; los booleanos en query son `true`/`false`; las fechas son ISO 8601 con zona horaria. `desde` es inclusivo y `hasta` exclusivo, sobre **createdAt**. Parámetros desconocidos se rechazan.

Devuelve `{ data, meta: { pageSize, hasNextPage, nextCursor, total, asOf } }`. Tamaño predeterminado 20, máximo 50. `total` es `null` salvo `includeTotal=true`. `data[].incidentes` se sustituye en este nuevo contrato por `data[]._count.incidentes`; el detalle existente conserva los incidentes completos.

Para continuar, enviar `cursor=meta.nextCursor`, los mismos filtros y el tamaño elegido. Un cursor no sirve para otra empresa/localidad/filtro. No hay salto directo a un número de página: el cliente conserva los cursores visitados si necesita volver atrás. El orden usa fecha e ID para resolver empates. `asOf` limita nuevas inserciones; las modificaciones o bajas posteriores siguen siendo visibles, por lo que no equivale a una fotografía transaccional de toda la navegación.

### Resumen

```http
GET /reporteria/movimientos/resumen?desde=2026-01-01T00%3A00%3A00Z&hasta=2026-02-01T00%3A00%3A00Z
```

Requiere permiso de lectura de movimientos. Acepta los mismos filtros operativos; exige período de hasta 366 días. Devuelve cantidades por estado, total, `asOf`, `dateField: "createdAt"` y `cacheSeconds: 5`. La duración media se expresa en segundos y usa únicamente movimientos concluidos con inicio/fin válidos. El caché es por filtros ya acotados, admite hasta 100 entradas por proceso y agrupa solicitudes simultáneas del mismo resumen. Los errores no quedan almacenados.

### Exportaciones

```http
POST /reporteria/exportaciones
Content-Type: application/json
X-Idempotency-Key: una-clave-unica-para-esta-solicitud

{
  "format": "xlsx",
  "filters": {
    "empresaId": 12,
    "desde": "2026-01-01T00:00:00Z",
    "hasta": "2026-02-01T00:00:00Z"
  }
}
```

`format`: `csv`, `xlsx` o `pdf`. Requiere lectura de movimientos y exportación de reportes. Respuesta `202` con ID y estado `QUEUED`. Conservar la misma clave de idempotencia al reintentar la solicitud.

Consultar `GET /reporteria/exportaciones/:id` hasta `COMPLETED` o `FAILED`. En `COMPLETED`, descargar `downloadUrl` (`GET /reporteria/exportaciones/:id/archivo`) usando la autenticación habitual. Consultar cada 2–5 segundos mientras la pantalla esté abierta y detenerse al recibir un estado final.

- Únicamente el propietario puede consultar o descargar; cambios de permisos o alcance invalidan el acceso. El worker vuelve a verificar usuario activo y permisos antes y después de generar.
- Hasta 100 000 filas para CSV/Excel y 1000 para PDF; período máximo 366 días. Un reporte demasiado grande termina en `FAILED` y pide reducir filtros.
- Lectura por lotes de 500. CSV y Excel escriben filas a disco; PDF tiene un límite menor por el costo del navegador. Se neutralizan fórmulas en CSV y se escapa HTML en PDF.
- Hasta 10 exportaciones pendientes por usuario y 100 globales; 20 solicitudes por usuario y 200 globales en 24 horas. El control se hace dentro de la misma transacción que registra el reporte y su trabajo.
- Archivos disponibles durante 24 horas. La limpieza del worker se ejecuta al iniciar y cada hora; los temporales huérfanos tienen margen de 48 horas. Los metadatos vencidos se retiran después de siete días adicionales, en lotes.
- Errores transitorios se reintentan hasta cinco veces mediante la cola. Cada intento escribe un archivo distinto y publica el resultado mediante renombrado y comprobación del intento activo, evitando descargas parciales.
- Las columnas son ID, locomotora, empresa, localidad, estado, prioridad, fechas UTC y cantidad de incidentes base. La selección se limita a registros creados antes de solicitar el reporte; los estados se leen durante la generación. No sustituye los formatos comerciales/contables específicos existentes.

## Métricas y verificación

La API conserva `/metrics` restringido a loopback. El worker expone `http://127.0.0.1:9331/metrics`; el puerto se cambia con `REPORT_WORKER_METRICS_PORT`. Cada proceso de worker necesita un puerto propio si comparte host.

Métricas nuevas: `cosaif_prisma_operation_seconds`, `cosaif_request_prisma_operations`, `cosaif_request_prisma_seconds`, `cosaif_job_duration_seconds`, `cosaif_job_queue_wait_seconds`, `cosaif_job_retries_total`. El worker añade memoria, CPU y métricas estándar de Node. Los clientes de los microservicios instrumentados aquí son los utilizados **desde la API**; cada proceso de microservicio conserva su Guardian HTTP independiente.

Se cuentan operaciones Prisma, no sentencias SQL individuales. Su duración incluye espera y materialización; operaciones paralelas suman tiempos y pueden superar la duración HTTP. SQL, parámetros, IDs de usuarios y tokens no son etiquetas de métricas. La comparación de benchmark sí cuenta sentencias mediante eventos del motor Prisma.

```sh
npm run typecheck
npm test
npm run test:integration
npm run test:performance:integration
```

Las integraciones requieren `SECURITY_TEST_DB_ADMIN_URL` con host `127.0.0.1` y puerto `55439`; rechazan otras conexiones. El preparador `node tests/security-db-setup.cjs --reset --baseline-ref=HEAD` elimina y recrea únicamente las cuatro bases `security_*` en ese clúster aislado y verifica ambas migraciones dos veces. La variante `node tests/performance-integration.cjs --pdf` añade una prueba real de Chrome.

CI ejecuta tipos de los cuatro proyectos, las 14 suites generales, seguridad con PostgreSQL y las integraciones nuevas de rendimiento, Rondas y worker. La prueba de PDF real se hizo localmente con Chrome; no depende de que CI tenga Chrome instalado.

El benchmark reproducible se ejecuta con `npm run benchmark:performance -- --output=/ruta/resultados.json` en ese mismo clúster aislado. Crea 60 000 movimientos ficticios. Comparación de listados con 20 filas, página profunda 50 y compactación de 1000 rondas. Usa 15 muestras por lectura y siete para compactación, tras calentamiento. No ejecutarlo simultáneamente con otras pruebas si se van a comparar tiempos.

Resultados locales y metodología detallada: `rendimiento-20260908-resultados.json`. Los tiempos corresponden a consultas locales con cachés calientes; no son una predicción de latencia ni capacidad en producción. Validar p95/p99, memoria del worker y espera de cola con tráfico real después de desplegar.


### Mediciones finales

| Operación | Antes, p50 | Después, p50 | Evidencia adicional |
| --- | ---: | ---: | --- |
| Listado de 20 movimientos | 1,819 ms | 1,298 ms | 7 → 5 sentencias SQL |
| Página 50 | 2,604 ms | 1,653 ms | Cursor frente a offset |
| Compactar 1000 filas de Rondas | 146,813 ms | 7,573 ms | 1001 → 5 sentencias SQL |
| Resumen de estados | 1,695 ms | 0,658 ms | Agregación en PostgreSQL |

El JSON del listado pasó de 65 914 a 11 989 bytes: **81,8 % menos**, sin compresión. El conjunto incluye instrucciones e imágenes de texto sintéticas; el ahorro real dependerá de los datos. Los tres índices se probaron también de manera independiente con `EXPLAIN ANALYZE`; sus planes y tiempos están registrados en el JSON de resultados.
