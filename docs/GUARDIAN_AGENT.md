# Agentes de Medidor

Los cuatro procesos de este repositorio envían telemetría interna al Medidor sin exponer un endpoint administrativo nuevo:

- `cosaif-api` (puerto 3000)
- `torno` (puerto 3002)
- `torreon` (puerto 3003)
- `comercial` (puerto 3004)

`cosaif-api` usa estas variables en su archivo de entorno durante la primera fase de migración:

```dotenv
GUARDIAN_INGESTION_URL=http://127.0.0.1:4200/api/v1/agents/ingestions
GUARDIAN_AGENT_COSAIF_API_SECRET=una-llave-aleatoria-exclusiva-de-al-menos-32-caracteres
GUARDIAN_TELEMETRY_INTERVAL_SECONDS=10
```

La llave debe coincidir con `GUARDIAN_AGENT_COSAIF_API_SECRET` en Guardian Spring Boot. No se debe copiar una misma llave entre servicios.

Cada POST firma con HMAC-SHA256 la versión del protocolo, método, ruta, servicio, timestamp,
`requestId` y SHA-256 del cuerpo exacto. Guardian rechaza firmas inválidas, timestamps fuera de
ventana, identificadores contradictorios y cuerpos mayores de 64 KB. Los reintentos idénticos
son idempotentes.

La telemetría incluye métricas HTTP acumuladas, p95/p99, concurrencia, CPU del proceso, memoria RSS/heap, uptime del proceso y disponibilidad de PostgreSQL. `cosaif-api` agrega el conteo de movimientos del día. Las contraseñas, tokens, cuerpos HTTP y datos de negocio nunca se envían.

Para desarrollo local, primero levante Guardian Spring Boot y después `cosaif-api`. Al completar
la primera entrega imprime `canal HTTP autenticado conectado`. Torno, Torreón y Comercial se
migrarán como módulos independientes en fases posteriores.
