# Notificaciones operativas

La misma política de destinatarios se aplica a FCM (web y móvil) y a las alertas visibles del canal realtime de la web. El canal realtime sigue distribuyendo actualizaciones autorizadas a los tableros, pero solo muestra un aviso si `recipientRoles` incluye al usuario.

| Evento | Movimiento natural | Arrastre de Torreón |
| --- | --- | --- |
| Nueva solicitud | COORDINADOR, SUPERVISOR, MAQUINISTA | COORDINADOR, SUPERVISOR, MAQUINISTA_ARRASTRE |
| Incidente | CLIENTE / CLIENTE_ADMIN / CLIENTE_COOR de la empresa, COORDINADOR, SUPERVISOR | ARRASTRE_TORREON de la empresa, COORDINADOR, SUPERVISOR |
| Resolución / continuación / cierre | COORDINADOR, SUPERVISOR, MAQUINISTA | COORDINADOR, SUPERVISOR, MAQUINISTA_ARRASTRE |
| Pendiente de iniciar durante una hora | COORDINADOR, SUPERVISOR, MAQUINISTA | COORDINADOR, SUPERVISOR, MAQUINISTA_ARRASTRE |

Los clientes de movimientos naturales no reciben incidentes de arrastres: sus permisos existentes separan esos dominios. Los demás avisos de avance de movimientos y los eventos internos de torno/lavado conservan su distribución específica.

## Patio y empresa

- El patio se obtiene del movimiento/arrastre, nunca de un ID fijo de Guadalajara o Torreón.
- Usuarios operativos: deben estar activos y asignados a ese patio. Un token antiguo registrado en otro patio no amplía sus permisos.
- Clientes: además deben pertenecer a la empresa de la operación. Nombres similares de empresas no cuentan como coincidencia.
- CLIENTE_ADMIN y CLIENTE_COOR pueden registrar el patio seleccionado en cada dispositivo, dentro de su empresa. Coordinadores y supervisores operativos permanecen limitados al patio de su cuenta.
- Un creador o responsable asignado no evita estos filtros. Sin empresa, patio o destinatarios explícitos no se envía el aviso.
- Los tokens antiguos sin localidad solo heredan la localidad asignada al usuario; nunca se consideran globales.

## Recordatorios

`startPendingMovementReminders()` se inicia con el backend. Revisa cada minuto los movimientos principales, movimientos naturales de Torreón y arrastres de Torreón. El worker de trabajos durables consulta cada cinco segundos: en condiciones normales el primer aviso se procesa en la primera revisión posterior a cumplir una hora.

Se cuenta desde `fechaSolicitud`, usando tiempo absoluto. Aplica a SOLICITADO, ESPERA y MODIFICADO en el backend principal; SOLICITADO/ASIGNADO en movimientos de Torreón; SOLICITADO en arrastres. Exige `fechaInicio` y `fechaFin` vacías y que no esté finalizado. AGENDADO todavía no es una solicitud activa y queda excluido.

Se crea un trabajo por origen, entidad, ID, fecha de solicitud y hora cumplida. La clave única de `durable_jobs` evita que instancias simultáneas o reinicios dupliquen esa hora. La reserva persistente por evento y dispositivo evita repetir la entrega. Si el sistema estuvo apagado, se agenda únicamente la hora actual; no se recupera una acumulación de avisos antiguos.

Antes de enviar se vuelve a consultar la operación. Si comenzó, terminó, se canceló, cambió la fecha de solicitud o venció la hora del trabajo, se descarta. Los recordatorios llevan la misma identidad en realtime y FCM y caducan al siguiente umbral horario en Android, APNs y Web Push. Como cualquier push ya entregado al dispositivo, un aviso mostrado no se puede retirar por el solo hecho de iniciar después el movimiento.

## Web y móvil

Ambos clientes comprueban `recipientRoles`, `empresaId`, `localidadId` y la caducidad antes de mostrar avisos en primer plano. FCM usa estas mismas reglas al seleccionar tokens para segundo plano. La web evita duplicar el aviso realtime con el push y resuelve el enlace genérico `/movimientos` al área del usuario autenticado.

En móvil se crean los canales `default` y `cosaif_operacion`, se usa `eventId` para deduplicar, no se vuelve a mostrar un push que el sistema operativo ya presentó y no se relanza al abrirlo. Una resolución no crea un nuevo incidente activo y solo limpia el incidente almacenado si coinciden su ID, origen y patio.

## Validación y ejecución local

- Backend: `npm test` y `npm run build`; pruebas nuevas en `tests/notification-audience.cjs` y `tests/pending-movement-reminders.cjs`, más regresiones de FCM y outbox.
- Web: pruebas `notification-audience`, `notification-delivery`, `notification-prompt` y `realtime-activity-notifications`; `next typegen` y `tsc --noEmit`.
- Móvil: pruebas unitarias `notificationAudience` y `notificationDelivery`; `tsc --noEmit`.
- Estas pruebas usan transportes simulados y no envían notificaciones a usuarios.

Las notificaciones no requieren una migración adicional: usan la tabla operativa existente `durable_jobs`, con reservas de tipo `fcm.delivery` creadas como completadas. Guardan únicamente una clave calculada a partir del evento y el hash del token; no contienen mensajes ni tokens. Las instalaciones que ya tienen `fcm_deliveries` siguen usando sus reservas anteriores para evitar reenvíos. El arranque no exige esa tabla opcional. Se requieren las credenciales Firebase configuradas.

Los cambios se prepararon localmente; no se desplegaron ni se arrancaron workers contra tokens reales. La entrega física requiere ejecutar las versiones actualizadas del backend, web y app y hacer una prueba en dispositivos. Sigue pendiente la configuración de iOS identificada en el diagnóstico anterior: el plist local apunta a otro proyecto Firebase y falta configurar APNs en el proyecto usado por este backend.
