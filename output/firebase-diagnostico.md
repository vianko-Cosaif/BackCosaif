# Diagnóstico de Firebase — backend local

Fecha: 18 de septiembre de 2026. Proyecto Firebase: `cosaifapp`. Base revisada: `cosaif_local` en este equipo.

La credencial anterior era rechazada con `invalid_grant: Invalid JWT Signature`. Se configuró la nueva credencial descargada por el usuario mediante `GOOGLE_APPLICATION_CREDENTIALS` en `.env`, guardando el JSON en `.private/firebase/` con permisos `600`. Google aceptó la autenticación. La clave privada no se incluyó en archivos versionados ni en este informe.

Se aplicó previamente `scripts/fcm-token-localidad.sql` a la base local. Añadió `localidadId` y `updatedAt`; los 10 registros originales se conservaron y las consultas Prisma ya funcionan.

## Resultado de los tokens

Todas las solicitudes usaron `dryRun=true`: no se enviaron notificaciones. No se eliminó ningún token.

| Registro | Usuario | Sufijo del token | Validación de Firebase |
| --- | --- | --- | --- |
| 8556 | 98 | …khRgKE | Aceptado |
| 8506 | 22 | …-lpew0 | Aceptado |
| 8504 | 71 | …bwW7KE | `registration-token-not-registered` |
| 8042 | 81 | …g1_wJk | `mismatched-credential` / `SenderId mismatch` |
| 8028 | 73 | …_y6rcc | `mismatched-credential` / `SenderId mismatch` |
| 7066 | 28 | …rhosbk | Aceptado |
| 6906 | 65 | …HZW7B8 | Aceptado |
| 6869 | 24 | …dvV1ho | Aceptado |
| 6868 | 24 | …KcAvuo | `registration-token-not-registered` |
| 6866 | 60 | …-g8VqU | Aceptado |

Los dispositivos asociados a tokens no registrados necesitan generar y registrar un token vigente. Los dos tokens con `SenderId mismatch` deben renovarse desde una app configurada para el proyecto `cosaifapp` (remitente `759843660527`). El error no identifica cuál es el otro proyecto.

Se validó también el mensaje construido por `sendMulticastCompat` con un token aceptado. Firebase aceptó ambas variantes de URL utilizadas en la comprobación. Esto no demuestra recepción en un dispositivo ni certifica el comportamiento del enlace al abrir una notificación web.

## Pendientes de los clientes

- En los archivos locales de iOS revisados, `CosaifLogistcs/ios/GoogleService-Info.plist` apunta a `cosaiflogistics`, con remitente distinto al del backend. En la consola de `cosaifapp`, la app Apple registrada usa además otro bundle ID y no tiene claves ni certificados APNs. Requiere alinear el registro iOS y configurar APNs antes de probar recepción.
- La clave pública VAPID de la web local coincide con Firebase. Posteriormente se corrigió `NEXT_PUBLIC_FIREBASE_API_KEY` en `CosaifWeb1/.env.local`, usando la configuración oficial obtenida de Firebase para la app web existente. También se activó `NEXT_PUBLIC_ENABLE_DEV_NOTIFICATIONS=true`; el backend local ya permitía el registro de desarrollo.
- Falta una prueba de entrega real a un dispositivo identificado por el usuario. Una validación aceptada no confirma permisos de notificación, conexión ni presentación del aviso.

La reparación inicial del backend corresponde exclusivamente a `BackCosaif2` local.

## Corrección posterior de la web local

Se revisó y corrigió `CosaifWeb1`. La credencial privada del backend sirve para los envíos a web y móvil; no se copió esa credencial al frontend. La tabla actual de tokens no contiene un campo de plataforma, así que no permite afirmar que los 10 registros sean todos móviles.

La CSP general de Next.js impedía que el service worker importara Firebase desde `www.gstatic.com`. La primera prueba real en Chrome reprodujo `ServiceWorker script evaluation failed`. La política de la ruta ahora permite el CDN de la versión usada por el worker y las conexiones a las APIs de Google. Se aplica una regla específica en `next.config.ts`, después de la regla general; la política de las páginas no se modificó.

Verificación en Chrome: worker `ACTIVO`, contexto seguro en `http://localhost:3012`, proyecto `cosaifapp`, app ID esperado y API key de 39 caracteres. Se retiraron el worker y la página temporales de prueba. Pasaron 14 pruebas de notificaciones y la revisión de tipos de TypeScript. No se enviaron notificaciones.

La web publicada también devolvía la CSP que bloquea el CDN al momento de la revisión. La corrección se hizo en los archivos locales y no se desplegó. En la web local falta iniciar sesión con el backend encendido, permitir notificaciones y comprobar el registro y la recepción en ese navegador. Para probar desde otro dispositivo por IP de red se necesita HTTPS con un certificado confiable; en este equipo puede usarse localhost.

Referencias: [configuración oficial de apps web de Firebase](https://firebase.google.com/docs/reference/firebase-management/rest/v1beta1/projects.webApps/getConfig) y [CSP de workers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy).
