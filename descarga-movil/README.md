# descarga-movil

Centro de descargas de COSAIF para Android, incorporado en el repositorio de BackCosaif2 y publicado en **https://cosaif-download.vianko.cloud**.

Código de origen: chat «Crear landing cosaif-download con», proyecto `cosaif-download`, revisión `ab2670e2c9f117c5824a40b353ad5b7ab90b09f7`. Se conserva la landing, el panel, la autenticación de BackCosaif2 y el flujo de versiones. Esta copia se ejecuta con Next.js en Node y almacena los datos en el sandbox.

## Funciones

- `/`: descarga anónima de la APK publicada, versión, tamaño, notas e instrucciones.
- `/login`: inicio de sesión con las cuentas existentes de BackCosaif2.
- `/admin`: acceso exclusivo para `ADMINISTRADOR`, carga de APKs, respaldos e historial.
- Publicar o restaurar cambia la descarga activa y conserva las APK anteriores.
- Cargas de hasta 512 MiB, divididas en partes de 8 MiB, validación estructural y SHA-256.
- Cada operación del panel consulta `/usuarios/me` para verificar el rol y la vigencia de la sesión. El JWT se conserva cifrado en una cookie HttpOnly, Secure y SameSite=Strict.

La primera APK debe cargarse y publicarse desde el panel; los archivos de las pruebas no se distribuyen como aplicaciones.

## Desarrollo

Requiere Node >=22.16; el sandbox utiliza Node 24.

```sh
cd descarga-movil
npm ci
npm run configure:local
npm run migrate
npm run dev
```

Abre http://127.0.0.1:3016. El backend predeterminado es http://127.0.0.1:3008. `configure:local` genera `.env.local` con una clave aleatoria y conserva la existente al repetirse.

```sh
npm test
npm run typecheck
npm run build
```

## Sandbox

Carpeta: `/var/www/BackCosaif/descarga-movil`. Servicio PM2: `cosaif-download`. Puerto interno: `127.0.0.1:3016`. nginx publica HTTPS en el dominio indicado y limita cada parte de la carga a 9 MiB.

Configura `.env.production` con las claves de `.env.example`. `APP_ORIGIN` debe ser exactamente `https://cosaif-download.vianko.cloud`; permite verificar el origen y emitir cookies HTTPS detrás del proxy. `BACKCOSAIF_URL` apunta al backend del mismo servidor para que las credenciales no salgan a la red pública.

`COSAIF_DOWNLOAD_DATA_DIR` contiene `releases.sqlite`, sus archivos WAL, las APK y las partes pendientes. Debe ser una carpeta privada y persistente, fuera de Git, preferiblemente `/var/lib/cosaif-download`. Respalda la carpeta completa con el servicio detenido o un respaldo consistente de SQLite. No se modifica ni se migra la base de Cosaif.

Las migraciones de `drizzle/` se aplican explícitamente con `npm run migrate` y se registran en `schema_migrations`. No crean tablas durante las solicitudes y no se repiten cuando ya están registradas.

Primera instalación:

```sh
cd /var/www/BackCosaif/descarga-movil
npm ci
NODE_ENV=production npm run migrate
npm run build
pm2 start ops/ecosystem.config.cjs
pm2 save
```

Instala `ops/nginx.conf` cuando exista el certificado del dominio y valida con `nginx -t` antes de recargar nginx.

Actualizaciones posteriores:

```sh
cd /var/www/BackCosaif
git pull --ff-only
cd descarga-movil
npm ci
NODE_ENV=production npm run migrate
npm run build
pm2 restart cosaif-download
```

Conserva `.env.production` y `/var/lib/cosaif-download` al actualizar. La landing y el servicio de descargas tienen dependencias propias; no requieren recompilar ni reiniciar Cosaif, Torreón o CosaifWeb.
