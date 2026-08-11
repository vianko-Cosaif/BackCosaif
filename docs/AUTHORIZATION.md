# Autorización central del ecosistema COSAIF

## Principio de seguridad

El frontend nunca es la autoridad. El JWT identifica una sesión, pero cada petición protegida valida firma, `jti`, vigencia, propietario de la sesión, usuario activo y `tokenVersion`. Después carga el rol vigente desde la base de datos y construye la autorización.

Las capacidades enviadas a web y móvil sirven para navegación y experiencia de usuario. Modificarlas del lado cliente no concede acceso: las rutas sensibles vuelven a comprobar permisos en el backend.

## Contrato para clientes

`POST /usuarios/login` conserva todos sus campos anteriores y agrega `authorization` tanto en la raíz como dentro de `user`.

`GET /usuarios/me` devuelve el perfil seguro actualizado, la operación por localidad, vencimiento de sesión y el mismo objeto `authorization`.

```json
{
  "authorization": {
    "policyVersion": 2,
    "role": "COORDINADOR",
    "roleLabel": "Coordinador",
    "platforms": { "web": true, "mobile": true },
    "scope": {
      "mode": "LOCALITY",
      "empresaId": 1,
      "localidadId": 2
    },
    "permissions": ["users.manage", "movements.operate"],
    "capabilities": {
      "home": "/coordinador",
      "canUseWeb": true,
      "canManageUsers": true,
      "navModules": ["dashboard", "movimientos", "torno", "usuarios", "incidentes", "reporteria"]
    }
  }
}
```

El frontend debe usar `capabilities` para mostrar u ocultar acciones. No debe inferir permisos nuevos a partir del nombre del rol.

## Matriz funcional vigente

| Rol | Alcance | Acciones principales |
|---|---|---|
| ADMINISTRADOR | Global | Empresas, configuración, usuarios, operación, reportes CEO/coordinación/comercial |
| COMERCIAL | Dominio comercial | Analítica, clientes, contratos, paquetes, cobranza y exportaciones comerciales |
| COORDINADOR | Localidad asignada | Usuarios permitidos, localidad/vías, movimientos, incidentes, torno y reportes de coordinación |
| SUPERVISOR | Localidad asignada | Supervisión de movimientos, incidentes y torno; sin usuarios ni configuración |
| OPERADOR | Localidad asignada | Operación de movimientos e incidentes desde móvil |
| MAQUINISTA | Localidad asignada | Operación natural y paquete offline propio |
| MAQUINISTA_ARRASTRE | Localidad asignada | Operación de arrastre Torreón y paquete offline propio |
| CLIENTE | Empresa y localidad asignadas | Solicitar, consultar, editar y cancelar movimientos permitidos; rondas e incidentes de su alcance |
| CLIENTE_ADMIN | Empresa asignada | Vista amplia de empresa y solicitudes de arrastre Torreón |
| CLIENTE_COOR | Empresa asignada | Mismo alcance empresarial operativo que cliente administrador |
| ARRASTRE_TORREON | Empresa y localidad asignadas | Solicitar/consultar arrastre Torreón e incidentes relacionados |
| TORNO | Localidad asignada | Operación de torno e incidentes de torno |
| LAVADO | Localidad asignada | Operación de lavado/movimientos e incidentes relacionados |

## Rutas endurecidas en esta fase

- Usuarios: sólo administrador y coordinador, conservando las restricciones adicionales del controlador.
- Coordinadores locales: el listado y las mutaciones de usuarios quedan limitados a su localidad; se conserva la excepción central ya existente para Guadalajara.
- Empresas: lectura para roles operativos; mutación sólo administrador.
- Localidades, vías y secciones: lectura operativa; mutación administrador/coordinador.
- Ocupación de secciones: sólo perfiles que crean u operan movimientos.
- Actualizaciones: lectura autenticada y mutación sólo administrador.
- Paquetes offline: sólo maquinista y maquinista de arrastre.
- Reportería: permisos separados para CEO, coordinación, cliente, comercial y exportación.
- Reportes de coordinación y cliente: empresa/localidad se fuerzan desde la sesión; un query param no puede ampliar alcance.
- Movimientos: lectura, creación, edición, cancelación, eliminación y operación tienen permisos separados. Los listados globales aplican empresa/localidad de la sesión aun cuando el cliente omita los filtros.
- Creación de movimientos: `creadoPorId` sale del usuario autenticado; para clientes también se fuerza `clienteId`. Vías y referencias a movimientos agendados deben pertenecer al mismo alcance.
- Operación de movimientos: `operadorId` sale de la sesión autenticada y no del cuerpo enviado por web/móvil.
- Rondas: lectura, creación, edición, eliminación y operación están separadas. Creaciones y reemplazos validan movimiento, empresa y localidad; los intercambios no pueden cruzar localidades.
- Incidentes: lectura, creación, edición, resolución, eliminación y mantenimiento están separados. `usuarioId` sale de la sesión y las imágenes se validan contra el incidente y su movimiento.

## Defensa en profundidad

- Respuestas de login y perfil usan `Cache-Control: no-store`.
- Se eliminó `X-Powered-By` y se agregaron encabezados anti-sniffing, anti-frame, privacidad y HSTS cuando la conexión llega por HTTPS.
- Una sesión sólo es válida si el `jti` pertenece al usuario firmado y es de tipo `ACCESS`.
- La renovación es atómica y no puede quitar una revocación ya aplicada.
- Los rechazos de autorización generan auditoría sin registrar token, contraseña ni cuerpo de la petición.
- El login directo aplica bloqueo temporal después de 12 fallos del mismo usuario/origen en 15 minutos. Con `REDIS_URL` el contador se comparte entre instancias; si Redis no está disponible, cae al contador local sin tumbar el login. Un login correcto limpia el contador; errores 500 no cuentan.
- Los listados de localidades y usuarios ya no incluyen relaciones completas, `jti`, tokens FCM, IPs ni hashes de contraseña; sólo entregan los campos funcionales consumidos por las aplicaciones.
- Las mutaciones autenticadas generan un registro append-only con secuencia y cadena HMAC. No se guarda cuerpo, contraseña ni token; sólo huellas no reversibles y metadatos operativos.

## Activación gradual de CORS

El valor predeterminado `CORS_MODE=compat` conserva el comportamiento previo para no cortar web, app móvil ni integraciones. Para cerrar producción:

1. Registrar todos los orígenes HTTPS reales en `CORS_ORIGINS`, separados por coma.
2. Probar web, preflight y BFF con `CORS_MODE=enforce` en staging.
3. Activar `enforce` en producción. Peticiones móviles o servidor-a-servidor sin encabezado `Origin` siguen permitidas; un origen de navegador no registrado recibe `403 CORS_ORIGIN_FORBIDDEN`.

## Auditoría y límite de la palabra “inmutable”

`AUDIT_HMAC_KEY` debe ser una llave aleatoria independiente de `JWT_SECRET`, de al menos 32 caracteres. Mientras se configura, el servicio puede usar `JWT_SECRET` como compatibilidad y emite una advertencia; no es el estado final recomendado. Cada entrada incluye el hash de la anterior; una modificación, eliminación o reordenamiento queda detectable. En PM2 se genera un archivo por `NODE_APP_INSTANCE` para evitar carreras entre procesos.

Esto es **append-only y resistente a manipulación**, no almacenamiento físicamente inmutable: alguien con control total del servidor y de la llave todavía podría reemplazar archivos. Inmutabilidad fuerte requiere enviar la cadena a almacenamiento WORM/SIEM externo con retención bloqueada y acceso separado.

La cadena activa se comprueba con `npm run audit:verify` usando el mismo `AUDIT_HMAC_KEY` del servicio.

Variables relevantes: `CORS_MODE`, `CORS_ORIGINS`, `REDIS_URL`, `AUTH_LOGIN_*`, `AUDIT_ENABLED`, `AUDIT_HMAC_KEY` y `AUDIT_LOG_PATH`. Consulte [`.env.example`](../.env.example).

## Siguientes capas sin activación brusca

1. Activar `CORS_MODE=enforce` después de inventariar los dominios reales de producción.
2. Provisionar Redis con autenticación/TLS y alertas de disponibilidad; después extender límites a recuperación de contraseña, exportaciones y operaciones costosas.
3. Enviar la auditoría a almacenamiento WORM/SIEM externo y alertar sobre fallos de cadena o rechazos repetidos.
4. Rotar claves JWT y migrar planificadamente a firma asimétrica, sin invalidar sesiones de golpe.
5. Eliminar efectos de mantenimiento dentro de rutas `GET` de rondas y pasarlos a jobs explícitos con permisos operativos.
