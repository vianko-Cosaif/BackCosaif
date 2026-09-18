# Un aviso por evento y destinatario

Migración histórica opcional. El backend ya no la necesita para arrancar ni para
deduplicar: si la tabla no existe, utiliza reservas completadas en `durable_jobs`.
No aplicar esta migración como requisito del despliegue actual.

Los siguientes comandos se conservan como referencia para instalaciones que
eligieron la tabla dedicada:

```sh
node scripts/security-migrate.cjs --target=main --version=notifications-20260917 --apply
node scripts/security-migrate.cjs --target=main --version=notifications-20260917 --check
```

La tabla guarda una reserva por evento durable y hash del token; no almacena
credenciales ni contenido. No borrar reservas mientras el evento pueda volver a
ejecutarse. La clave del evento permanece igual entre reintentos y reinicios.

Se reserva antes de llamar a Firebase. Si Firebase devuelve un resultado incierto,
no se vuelve a enviar: se prioriza como máximo un intento de aviso por destinatario.
Si falla la reserva, no se envía y el trabajo puede reintentarse. Los eventos nuevos
siguen notificándose. Las reservas no afectan la entrega de eventos de tiempo real.

Prueba sin enviar notificaciones reales: `node tests/fcm-delivery-regressions.cjs`.
