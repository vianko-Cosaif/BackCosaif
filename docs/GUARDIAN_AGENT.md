# Agentes de Medidor

Los cuatro procesos de este repositorio envían telemetría interna al Medidor sin exponer un endpoint administrativo nuevo:

- `cosaif-api` (puerto 3000)
- `torno` (puerto 3002)
- `torreon` (puerto 3003)
- `comercial` (puerto 3004)

Cada proceso usa estas variables en su archivo de entorno:

```dotenv
GUARDIAN_SOCKET_URL=http://127.0.0.1:4100/agents
GUARDIAN_AGENT_SECRET=una-llave-aleatoria-exclusiva-de-al-menos-32-caracteres
GUARDIAN_TELEMETRY_INTERVAL_SECONDS=10
```

La llave debe coincidir con la variable `AGENT_*_SECRET` correspondiente de `medidorBack/.env`. No se debe copiar una misma llave entre servicios.

El handshake se firma con HMAC-SHA256 e incluye servicio, timestamp y nonce. Medidor rechaza firmas inválidas, timestamps con más de 30 segundos de diferencia y nonces repetidos. El canal solo acepta WebSocket y limita cada mensaje a 64 KB.

La telemetría incluye métricas HTTP acumuladas, p95/p99, concurrencia, CPU del proceso, memoria RSS/heap, uptime del proceso y disponibilidad de PostgreSQL. `cosaif-api` agrega el conteo de movimientos del día. Las contraseñas, tokens, cuerpos HTTP y datos de negocio nunca se envían.

Para desarrollo local, primero levante Medidor y después los cuatro procesos. Al iniciar correctamente cada uno imprime `canal autenticado conectado`.
