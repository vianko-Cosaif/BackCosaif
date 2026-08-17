# COSAIF — instalación, microservicios, bases de datos y recuperación

Guía operativa general para instalar, configurar, ejecutar, actualizar y recuperar COSAIF.

Última revisión: 21 de julio de 2026.

> Regla principal: cada dominio usa su propia base PostgreSQL. Antes de cualquier `db push`, restauración o cambio de esquema se debe generar un respaldo verificable.

## Contenido

1. [Arquitectura general](#arquitectura-general)
2. [Requisitos](#requisitos)
3. [Instalación inicial](#instalación-inicial)
4. [Variables de entorno](#variables-de-entorno)
5. [Creación de las bases de datos](#creación-de-las-bases-de-datos)
6. [Prisma: generate, db push y cambios de esquema](#prisma-generate-db-push-y-cambios-de-esquema)
7. [Arranque local](#arranque-local)
8. [Compilación e implementación](#compilación-e-implementación)
9. [Respaldos](#respaldos)
10. [Recuperación desde un dump](#recuperación-desde-un-dump)
11. [Actualización de una instalación existente](#actualización-de-una-instalación-existente)
12. [Verificación y pruebas](#verificación-y-pruebas)
13. [Problemas frecuentes](#problemas-frecuentes)
14. [Seguridad y lista de salida a producción](#seguridad-y-lista-de-salida-a-producción)

## Arquitectura general

COSAIF no usa una sola base para todo. La separación correcta es:

| Componente | Carpeta | Responsabilidad | Base / variable | Puerto de este proyecto | Salud |
|---|---|---|---|---:|---|
| API principal | `BackCosaif/src` | Usuarios, empresas, localidades, movimientos generales, rondas, incidentes, FCM, reportes y tiempo real | `DATABASE_URL` — ejemplo `cosaif_local` | 3000 | `GET /` |
| msTorno | `BackCosaif/msTorno` | Torneado, ruedas, rondas de torno, navajas e incidentes de torno | `TORNO_DATABASE_URL` — ejemplo `torno` | 3002 | `GET /health` |
| ms_torreon | `BackCosaif/ms_torreon` | Naturales y arrastres de Torreón, vagones, rondas, bloqueos e incidentes | `TORREON_DATABASE_URL` — ejemplo `torreon_development` | 3003 | `GET /health` |
| msComercial | `BackCosaif/msComercial` | Clientes comerciales, contratos, paquetes, cortes, planes y CRM | `COMERCIAL_DATABASE_URL` — ejemplo `cosaif_comercial` | 3004 | `GET /health` |
| Web | `CosaifWeb` | Aplicación Next.js, BFF, PWA, Firebase Web Push y paneles por rol | No usa Prisma | 3012 | `GET /login` |

El puerto de Torno puede tener un valor predeterminado distinto dentro del código, pero el valor vigente del proyecto es el configurado en `msTorno/.env.torno`. La variable de entorno siempre es la fuente de verdad.

### Flujo entre componentes

```text
Navegador / PWA
       |
       v
CosaifWeb :3012
       |
       v
API principal :3000
   |       |       |
   v       v       v
Torno    Torreón  Comercial
:3002    :3003    :3004
```

- El navegador no debe llamar directamente a los microservicios.
- La API principal valida el JWT del usuario y se comunica internamente con cada microservicio.
- Torno usa un token interno.
- Torreón y Comercial usan firmas HMAC.
- Los microservicios deben permanecer en `127.0.0.1` o en una red privada.
- La API principal también consulta la base de Torreón para reportería y funciones offline; por eso en producción debe conocer `TORREON_DATABASE_URL` además de la URL del servicio.
- Comercial puede leer datos operativos para analítica, pero su base no modifica movimientos, incidentes, lavados ni torneados.

Para detalles de dominio consulte también:

- [`msTorno/prisma/schema.prisma`](msTorno/prisma/schema.prisma)
- [`ms_torreon/README.md`](ms_torreon/README.md)
- [`msComercial/README.md`](msComercial/README.md)

## Requisitos

Recomendados para desarrollo y servidor:

- Node.js 20 LTS, que es la versión usada actualmente por el entorno del proyecto.
- npm compatible con el `package-lock.json`.
- PostgreSQL 15 o 16.
- Cliente PostgreSQL: `psql`, `pg_dump`, `pg_restore`, `createdb` y `dropdb`.
- Git.
- Chrome o Chromium para algunos PDF; puede indicarse con `CHROME_BIN` o `PUPPETEER_EXECUTABLE_PATH`.
- Redis es opcional. Solo se necesita cuando varias instancias de la API deben compartir eventos en tiempo real.
- Una cuenta Firebase y su credencial de administrador para notificaciones.

Verificación rápida:

```bash
node --version
npm --version
psql --version
pg_dump --version
```

Use una versión de `pg_dump` igual o más nueva que la versión mayor del servidor PostgreSQL.

## Instalación inicial

La estructura esperada es que backend y frontend sean carpetas hermanas:

```text

├── BackCosaif/
└── CosaifWeb/
```

### 1. Instalar el backend y los microservicios

Todos los microservicios comparten el `package.json` y `node_modules` de `BackCosaif`.

```bash
cd /ruta/a/eco/BackCosaif
npm ci
```

Use `npm install` solamente cuando se vaya a cambiar deliberadamente una dependencia. En una instalación o servidor nuevo, `npm ci` reproduce el lockfile.

### 2. Instalar el frontend

```bash
cd /ruta/a/eco/CosaifWeb
npm ci
```

### 3. Preparar secretos y archivos no versionados

Se necesitan:

- `BackCosaif/.env`
- `BackCosaif/msTorno/.env.torno`
- `BackCosaif/ms_torreon/.env.torreon`
- `BackCosaif/msComercial/.env.comercial`
- `CosaifWeb/.env.local`
- credencial Firebase Admin en `BackCosaif/src/config/cosaifapp-firebase-adminsdk-fbsvc-a3c14d6bfb.json`

No copie credenciales de producción a chats, tickets o repositorios públicos. Si una clave privada fue expuesta, revóquela y genere otra.

## Variables de entorno

Los siguientes bloques son plantillas. Sustituya todos los valores `CAMBIAR_*` y no reutilice secretos débiles.

Si una contraseña PostgreSQL contiene `@`, `:`, `/`, `?`, `#` o `%`, debe codificarse para URL antes de colocarla en `postgresql://...`.

Genere secretos fuertes con, por ejemplo:

```bash
openssl rand -hex 64
openssl rand -base64 48
```

### API principal — `.env`

```env
NODE_ENV=development
HOST=0.0.0.0
PORT=3000

DATABASE_URL="postgresql://cosaif_app:CAMBIAR_PASSWORD@127.0.0.1:5432/cosaif_local?schema=public"

JWT_SECRET="CAMBIAR_JWT_LARGO"
JWT_ISSUER="cosaif-api"
JWT_AUDIENCE="cosaif-web"
JWT_EXPIRES_IN="8h"

TORNO_MS_URL="http://127.0.0.1:3002"
TORNO_SERVICE_TOKEN="MISMO_TOKEN_QUE_EN_TORNO"

TORREON_MS_URL="http://127.0.0.1:3003"
TORREON_DATABASE_URL="postgresql://cosaif_app:CAMBIAR_PASSWORD@127.0.0.1:5432/torreon_development?schema=public"
TORREON_SERVICE_ID="cosaif-backend"
TORREON_SERVICE_SECRET="MISMO_SECRETO_QUE_EN_TORREON"

COMERCIAL_MS_URL="http://127.0.0.1:3004"
COMERCIAL_SERVICE_ID="cosaif-backend"
COMERCIAL_SERVICE_SECRET="MISMO_SECRETO_QUE_EN_COMERCIAL"

FCM_ALLOW_DEV_REGISTRATION=false
OFFLINE_PACKAGE_SECRET="CAMBIAR_SECRETO_OFFLINE"

# Opcionales para varias réplicas de la API
# REDIS_URL="redis://usuario:password@127.0.0.1:6379"
# REALTIME_REDIS_CHANNEL="cosaif:realtime:v1"
# INSTANCE_ID="backend-1"

# Opcionales para PDF en servidor
# CHROME_BIN="/usr/bin/google-chrome"
# PUPPETEER_EXECUTABLE_PATH="/usr/bin/chromium"
```

La API principal no tiene un puerto predeterminado seguro: `PORT` debe estar definido.

### msTorno — `msTorno/.env.torno`

```env
TORNO_HOST="127.0.0.1"
TORNO_PORT="3002"
TORNO_SERVICE_TOKEN="MISMO_TOKEN_QUE_EN_LA_API"

TORNO_DATABASE_URL="postgresql://cosaif_app:CAMBIAR_PASSWORD@127.0.0.1:5432/torno?schema=public"
TORNO_SHADOW_DATABASE_URL="postgresql://cosaif_app:CAMBIAR_PASSWORD@127.0.0.1:5432/backcosaif_torno_shadow?schema=public"
```

### ms_torreon — `ms_torreon/.env.torreon`

Se puede usar un par `ID + SECRET`:

```env
TORREON_HOST="127.0.0.1"
TORREON_PORT="3003"
TORREON_DATABASE_URL="postgresql://cosaif_app:CAMBIAR_PASSWORD@127.0.0.1:5432/torreon_development?schema=public"
TORREON_SHADOW_DATABASE_URL="postgresql://cosaif_app:CAMBIAR_PASSWORD@127.0.0.1:5432/torreon_shadow?schema=public"

TORREON_SERVICE_ID="cosaif-backend"
TORREON_SERVICE_SECRET="MISMO_SECRETO_QUE_EN_LA_API"
TORREON_SIGNATURE_TOLERANCE_MS="300000"
```

También se admite un mapa JSON para autorizar más de un servicio:

```env
TORREON_SERVICE_AUTH_SECRETS='{"cosaif-backend":"CAMBIAR_SECRETO"}'
```

Use una modalidad u otra de forma consistente. La API y el microservicio deben resolver exactamente el mismo ID y secreto.

### msComercial — `msComercial/.env.comercial`

```env
COMERCIAL_DATABASE_URL="postgresql://cosaif_app:CAMBIAR_PASSWORD@127.0.0.1:5432/cosaif_comercial?schema=public"
COMERCIAL_HOST="127.0.0.1"
COMERCIAL_PORT="3004"
COMERCIAL_SERVICE_ID="cosaif-backend"
COMERCIAL_SERVICE_SECRET="MISMO_SECRETO_QUE_EN_LA_API"
COMERCIAL_MS_URL="http://127.0.0.1:3004"
COMERCIAL_SIGNATURE_TOLERANCE_MS="300000"
```

En desarrollo local, `msComercial/configureDatabase.cjs` reutiliza el usuario y contraseña de `DATABASE_URL` cuando ambas bases están en `localhost` o `127.0.0.1`. Por esa razón, la instalación local más sencilla y compatible es que el mismo rol PostgreSQL sea dueño de `cosaif_local` y `cosaif_comercial`.

### Frontend — `CosaifWeb/.env.local`

```env
API_ORIGIN="http://127.0.0.1:3000"
NEXT_PUBLIC_API_BASE="/bff"
NEXT_PUBLIC_API_URL="/xapi"

JWT_COOKIE_NAME="token"
ROLE_COOKIE_NAME="rol"
COOKIE_MAX_AGE="28800"

NEXT_PUBLIC_FIREBASE_API_KEY="CAMBIAR"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="CAMBIAR.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="CAMBIAR"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="CAMBIAR.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="CAMBIAR"
NEXT_PUBLIC_FIREBASE_APP_ID="CAMBIAR"
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="CAMBIAR"
NEXT_PUBLIC_FIREBASE_VAPID_KEY="LLAVE_VAPID_PUBLICA"

NEXT_PUBLIC_REQUIRE_PUSH_NOTIFICATIONS="true"
NEXT_PUBLIC_ENABLE_DEV_NOTIFICATIONS="true"
```

La configuración `NEXT_PUBLIC_*` de Firebase y la llave VAPID pública pueden llegar al navegador. La credencial Firebase Admin del backend es privada y nunca debe incluirse en el frontend.

Web Push requiere HTTPS en producción. `localhost` es la excepción permitida por los navegadores; para probar desde un celular en la red local use el modo HTTPS del frontend.

## Creación de las bases de datos

### Instalación nueva

`prisma db push` no crea la base PostgreSQL. Primero deben existir la base y el usuario.

Abra PostgreSQL como administrador:

```bash
psql -U postgres -d postgres
```

Ejemplo compatible con el cargador local actual:

```sql
CREATE ROLE cosaif_app LOGIN PASSWORD 'CAMBIAR_PASSWORD';

CREATE DATABASE cosaif_local OWNER cosaif_app;
CREATE DATABASE torno OWNER cosaif_app;
CREATE DATABASE backcosaif_torno_shadow OWNER cosaif_app;
CREATE DATABASE torreon_development OWNER cosaif_app;
CREATE DATABASE torreon_shadow OWNER cosaif_app;
CREATE DATABASE cosaif_comercial OWNER cosaif_app;
```

En producción se pueden usar nombres terminados en `_prod`. Los nombres no son obligatorios; lo obligatorio es que cada variable apunte a la base correcta.

Las bases `*_shadow` están reservadas para herramientas Prisma. Nunca coloque datos operativos en ellas y nunca apunte una URL principal a una shadow.

### Verificar conexión antes de Prisma

```bash
psql "postgresql://cosaif_app:CAMBIAR_PASSWORD@127.0.0.1:5432/cosaif_local" -c "select current_database(), current_user;"
```

Repita la prueba con las URL de Torno, Torreón y Comercial. Si esta prueba falla, Prisma también fallará.

### Base nueva contra base recuperada

- **Base totalmente nueva:** crear base vacía y ejecutar `db push`.
- **Base recuperada de un dump:** restaurar primero; después generar clientes Prisma. Ejecute `db push` únicamente si el código contiene cambios posteriores al dump y ya existe un respaldo del estado restaurado.
- Nunca ejecute seeds sobre una base restaurada sin comprobar antes qué registros contiene.

## Prisma: generate, db push y cambios de esquema

Los esquemas fuente son:

| Dominio | Esquema fuente | Cliente generado |
|---|---|---|
| Principal | `prisma/schema.prisma` | `node_modules/@prisma/client` |
| Torno | `msTorno/prisma/schema.prisma` | `msTorno/generated` |
| Torreón | `ms_torreon/prisma/schema.prisma` | `ms_torreon/generated` |
| Comercial | `msComercial/prisma/schema.prisma` | `msComercial/generated` |

Nunca edite manualmente una carpeta `generated`. Se regenera desde su `schema.prisma`.

### Qué hace cada comando

- `prisma generate`: genera TypeScript/JavaScript del cliente. **No crea tablas, no altera columnas y no toca datos.**
- `prisma db push`: compara el `schema.prisma` con la base indicada y sincroniza su estructura. **Sí puede alterar la base.**
- `prisma migrate`: administra migraciones versionadas. El procedimiento operativo actual de este proyecto no depende de `migrate deploy`; no mezcle ambos flujos sin una decisión técnica y una prueba de restauración.

`migrate` no borra una base por definición. Los riesgos vienen de una migración destructiva, de un historial inconsistente o de usar comandos de reset. El estándar actual de COSAIF es respaldo + revisión + `db push`.

### Primera generación y sincronización

Desde `BackCosaif`:

```bash
# Base principal
npx prisma validate --schema prisma/schema.prisma
npx prisma generate --schema prisma/schema.prisma
npx prisma db push --schema prisma/schema.prisma

# Torno
npm run prisma:torno:generate
npm run prisma:torno:push

# Torreón
npm run prisma:torreon:generate
npm run prisma:torreon:push

# Comercial
npm run prisma:comercial:generate
npm run prisma:comercial:push
```

Los cuatro `push` deben apuntar a cuatro bases distintas. Revise siempre el nombre de base y servidor que Prisma imprime antes de aceptar cualquier cambio.

### Flujo seguro para agregar un modelo, columna o enum

1. Identifique a qué dominio pertenece el cambio.
2. Edite únicamente el `schema.prisma` de ese dominio.
3. Respalde la base afectada.
4. Ejecute `generate` para validar el esquema y actualizar el cliente.
5. En una base local o copia de restauración, ejecute `db push`.
6. Si Prisma advierte pérdida de datos, cancele. No use automáticamente `--accept-data-loss`.
7. Compile y ejecute pruebas.
8. En producción, detenga escrituras, genere otro respaldo inmediato y aplique el mismo `db push`.
9. Reinicie el proceso que usa ese cliente Prisma.
10. Verifique salud y una operación real de lectura/escritura.

Nunca use en una base con datos sin una autorización y un plan de recuperación:

```text
prisma db push --force-reset
prisma migrate reset
prisma db push --accept-data-loss
```

### Datos iniciales de Torreón en la base principal

Solo para una instalación nueva que todavía no tenga localidad/vías de Torreón:

```bash
npm run seed:torreon:cosaif
```

Este seed se conecta a `DATABASE_URL`, es decir, a la base principal. No se conecta a `TORREON_DATABASE_URL`. Usa `upsert`, pero aun así debe verificarse el catálogo antes de ejecutarlo en producción.

La normalización de IDs de arrastre es un procedimiento independiente y de alto impacto:

```bash
npm run check:torreon:normalize-arrastre-ids
```

El comando anterior solo revisa. La variante `migrate:torreon:normalize-arrastre-ids` modifica IDs y referencias; requiere respaldo, ventana de mantenimiento y revisión explícita.

## Arranque local

Abra una terminal por proceso. Orden recomendado:

### Terminal 1 — msTorno

```bash
cd /ruta/a/eco/BackCosaif
npm run dev:torno
```

### Terminal 2 — ms_torreon

```bash
cd /ruta/a/eco/BackCosaif
npm run ms:torreon
```

### Terminal 3 — msComercial

```bash
cd /ruta/a/eco/BackCosaif
npm run dev:comercial
```

### Terminal 4 — API principal

```bash
cd /ruta/a/eco/BackCosaif
npm run dev
```

### Terminal 5 — frontend

```bash
cd /ruta/a/eco/CosaifWeb
npm run dev
```

Abra `http://localhost:3012`.

### Comprobar salud

```bash
curl http://127.0.0.1:3002/health
curl http://127.0.0.1:3003/health
curl http://127.0.0.1:3004/health
curl http://127.0.0.1:3000/
curl -I http://127.0.0.1:3012/login
```

### Probar el frontend por HTTPS

En localhost:

```bash
cd /ruta/a/eco/CosaifWeb
npm run dev:https
```

Para un celular en la red local:

```bash
cd /ruta/a/eco/CosaifWeb
npm run dev:https:lan
```

Use la URL que imprime el script y acepte/instale el certificado de desarrollo según corresponda. En producción se debe usar un certificado TLS válido.

### Si un puerto ya está ocupado

Primero identifique el proceso; no mate puertos a ciegas:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
lsof -nP -iTCP:3002 -sTCP:LISTEN
lsof -nP -iTCP:3003 -sTCP:LISTEN
lsof -nP -iTCP:3004 -sTCP:LISTEN
lsof -nP -iTCP:3012 -sTCP:LISTEN
```

Compruebe el PID y comando:

```bash
ps -p PID -o pid,ppid,command
```

Detenga únicamente el proceso confirmado como propio, preferentemente desde su terminal con `Ctrl+C` o con `kill PID`. Reserve `kill -9` para un proceso realmente bloqueado.

## Compilación e implementación

### Compilar backend y microservicios

```bash
cd /ruta/a/eco/BackCosaif
npm run build
npm run build:torno
npm run build:torreon
npm run build:comercial
```

Los tres microservicios usan clientes Prisma personalizados. TypeScript no copia automáticamente esas carpetas a `dist`, por lo que deben empaquetarse después de compilar:

```bash
cp -R msTorno/generated msTorno/dist/
cp -R ms_torreon/generated ms_torreon/dist/
cp -R msComercial/generated msComercial/dist/
```

En un pipeline de despliegue limpio, elimine o recree previamente solo los directorios de artefactos `dist` para evitar archivos generados obsoletos. Nunca elimine los `generated` fuente antes de ejecutar su correspondiente `prisma:*:generate`.

Salidas principales:

```text
dist/index.js
msTorno/dist/src/Servidor.js
msTorno/dist/generated/
ms_torreon/dist/src/Servidor.js
ms_torreon/dist/generated/
msComercial/dist/src/Servidor.js
msComercial/dist/generated/
```

La compilación principal copia los JSON requeridos desde `src/config` hacia `dist/config`.

### Compilar frontend

Las variables `NEXT_PUBLIC_*` se incorporan durante el build. Configure `.env.local` antes de compilar.

```bash
cd /ruta/a/eco/CosaifWeb
npm run build
npm run start
```

### Ejecución compilada sin copiar secretos a `dist`

Los procesos deben arrancarse desde la raíz `BackCosaif`. La API principal carga `.env` directamente:

```bash
node dist/index.js
```

Para los microservicios, el supervisor de procesos debe inyectar su archivo de entorno. Estos comandos son equivalentes y no copian el `.env` dentro de `dist`:

Antes de ejecutarlos confirme que el paso de copiado de `generated` terminó. Si se omite, el proceso puede fallar con `Cannot find module '../../generated'` aunque el build de TypeScript haya sido exitoso.

```bash
DOTENV_CONFIG_PATH=msTorno/.env.torno \
node -r dotenv/config -e "require('./msTorno/dist/src/Servidor').iniciarServidorTorno()"
```

```bash
DOTENV_CONFIG_PATH=ms_torreon/.env.torreon \
node -r dotenv/config -e "require('./ms_torreon/dist/src/Servidor').iniciarServidorTorreon()"
```

```bash
DOTENV_CONFIG_PATH=msComercial/.env.comercial \
node -r dotenv/config -e "require('./msComercial/dist/src/Servidor').iniciarServidorComercial()"
```

En un servidor real use `systemd`, PM2, Docker u otro supervisor para:

- reiniciar procesos si fallan;
- inyectar secretos sin guardarlos en Git;
- iniciar en el orden Torno/Torreón/Comercial → API → Web;
- conservar logs con rotación;
- ejecutar con un usuario sin privilegios de root.

### Red y proxy inverso

- Publique el frontend mediante HTTPS.
- La API puede estar detrás del mismo proxy o permanecer accesible solo para el BFF mediante `API_ORIGIN`.
- No publique 3002, 3003 ni 3004 en Internet.
- Mantenga hora y zona del servidor sincronizadas. Las firmas HMAC rechazan solicitudes fuera de su ventana de tiempo.
- Configure límites de carga suficientes para imágenes de incidentes, pero no exponga endpoints internos.

## Respaldos

Una recuperación completa necesita más que la base principal:

1. dump de `DATABASE_URL`;
2. dump de `TORNO_DATABASE_URL`;
3. dump de `TORREON_DATABASE_URL`;
4. dump de `COMERCIAL_DATABASE_URL`;
5. carpeta `uploads/`;
6. variables de entorno guardadas en un gestor seguro;
7. credencial Firebase Admin;
8. versión o commit exacto del código.

Redis transporta eventos y no es la fuente permanente de datos de negocio.

### Respaldo manual en formato custom

El formato custom permite listar, validar y restaurar selectivamente con `pg_restore`.

```bash
mkdir -p "$HOME/backups/cosaif/$(date +%F)"
```

Con las URL exportadas en la sesión o por el supervisor:

```bash
pg_dump --format=custom --no-owner --no-acl \
  --dbname="$DATABASE_URL" \
  --file="$HOME/backups/cosaif/$(date +%F)/cosaif_$(date +%F_%H-%M).dump"

pg_dump --format=custom --no-owner --no-acl \
  --dbname="$TORNO_DATABASE_URL" \
  --file="$HOME/backups/cosaif/$(date +%F)/torno_$(date +%F_%H-%M).dump"

pg_dump --format=custom --no-owner --no-acl \
  --dbname="$TORREON_DATABASE_URL" \
  --file="$HOME/backups/cosaif/$(date +%F)/torreon_$(date +%F_%H-%M).dump"

pg_dump --format=custom --no-owner --no-acl \
  --dbname="$COMERCIAL_DATABASE_URL" \
  --file="$HOME/backups/cosaif/$(date +%F)/comercial_$(date +%F_%H-%M).dump"
```

Para no dejar contraseñas en el historial del shell, use `.pgpass`, variables entregadas por el supervisor o un gestor de secretos.

### Respaldar archivos subidos

```bash
tar -czf "$HOME/backups/cosaif/$(date +%F)/uploads_$(date +%F_%H-%M).tar.gz" uploads/
```

### Verificar el respaldo

Un archivo existente no garantiza que sea restaurable.

```bash
pg_restore --list /ruta/al/respaldo.dump
shasum -a 256 /ruta/al/respaldo.dump
```

En Linux puede usar `sha256sum`.

La prueba real consiste en restaurar periódicamente a una base temporal y ejecutar las verificaciones de la aplicación.

### Descargar el último dump de un servidor

Ejemplo sin fijar IP ni nombre de servidor en el repositorio:

```bash
SERVIDOR="root@TU_SERVIDOR"
ULTIMO=$(ssh "$SERVIDOR" 'ls -t /root/cosaif_*.dump | head -1')
scp "${SERVIDOR}:${ULTIMO}" "$HOME/Downloads/"
```

Después:

```bash
pg_restore --list "$HOME/Downloads/NOMBRE_DEL_ARCHIVO.dump"
shasum -a 256 "$HOME/Downloads/NOMBRE_DEL_ARCHIVO.dump"
```

Un archivo `cosaif_*.dump` normalmente representa la base principal. No asuma que también contiene Torno, Torreón o Comercial; confirme el procedimiento de respaldo del servidor.

Referencia para no cruzar respaldos:

| Prefijo recomendado | Base destino | Variable | Esquema Prisma |
|---|---|---|---|
| `cosaif_*.dump` | Principal | `DATABASE_URL` | `prisma/schema.prisma` |
| `torno_*.dump` | Torno | `TORNO_DATABASE_URL` | `msTorno/prisma/schema.prisma` |
| `torreon_*.dump` | Torreón | `TORREON_DATABASE_URL` | `ms_torreon/prisma/schema.prisma` |
| `comercial_*.dump` | Comercial | `COMERCIAL_DATABASE_URL` | `msComercial/prisma/schema.prisma` |

## Recuperación desde un dump

### Principios de recuperación

- Nunca restaure un dump sin confirmar servidor, base destino y fecha.
- Detenga procesos que escriben en la base.
- Genere un respaldo de emergencia del estado actual, aunque parezca dañado.
- Pruebe primero el dump en una base temporal.
- No restaure una base principal sobre Torno, Torreón o Comercial.
- No ejecute `db push` hasta comprobar que la restauración terminó correctamente.

### 1. Identificar el formato

Para un dump custom:

```bash
pg_restore --list /ruta/cosaif_2026-07-13_16-46.dump
```

Si `pg_restore` indica que es texto plano, se restaura con `psql`:

```bash
psql "$DATABASE_URL" --set ON_ERROR_STOP=on --file=/ruta/respaldo.sql
```

### 2. Restaurar primero a una base temporal

Como administrador PostgreSQL:

```bash
createdb -U postgres -O cosaif_app cosaif_restore_test
pg_restore --exit-on-error --no-owner --no-acl \
  -U postgres \
  --dbname=cosaif_restore_test \
  /ruta/cosaif_2026-07-13_16-46.dump
```

Verifique:

```bash
psql -U postgres -d cosaif_restore_test -c "select count(*) as tablas from pg_tables where schemaname='public';"
psql -U postgres -d cosaif_restore_test -c '\dt'
```

Conecte temporalmente una copia de la aplicación a esa base o use Prisma para validar que las tablas críticas puedan leerse.

### 3. Reemplazo seguro conservando rollback

En una ventana de mantenimiento:

1. Detenga Web, API y los procesos que escriben en la base afectada.
2. Respalde la base actual.
3. Cierre conexiones activas.
4. Renombre la base actual en vez de borrarla.
5. Cree una base limpia con el nombre original.
6. Restaure el dump.

Ejemplo para la base principal; sustituya nombres deliberadamente:

Ejecute este bloque conectado a la base administrativa `postgres`, no a `cosaif_local`:

```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'cosaif_local'
  AND pid <> pg_backend_pid();

ALTER DATABASE cosaif_local RENAME TO cosaif_local_before_restore_20260721;
CREATE DATABASE cosaif_local OWNER cosaif_app;
```

Después restaure:

```bash
pg_restore --exit-on-error --no-owner --no-acl \
  -U postgres \
  --dbname=cosaif_local \
  /ruta/cosaif_2026-07-13_16-46.dump
```

La base renombrada permite volver atrás si la validación falla. No la elimine hasta completar pruebas funcionales y conservar al menos otro respaldo externo.

### Rollback inmediato de una restauración fallida

Si la base nueva falla y la base anterior sigue renombrada:

1. detenga nuevamente todos los procesos;
2. termine conexiones a la base nueva;
3. renombre la base fallida para conservar evidencia;
4. devuelva a la base anterior su nombre original;
5. reinicie y valide.

Ejemplo conectado a `postgres`:

```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'cosaif_local'
  AND pid <> pg_backend_pid();

ALTER DATABASE cosaif_local RENAME TO cosaif_local_failed_restore_20260721;
ALTER DATABASE cosaif_local_before_restore_20260721 RENAME TO cosaif_local;
```

No elimine la restauración fallida hasta entender la causa y conservar los logs de `pg_restore`.

### 4. Ajustar propietarios si es necesario

Con `--no-owner`, los objetos pertenecen al usuario que ejecutó la restauración. Si se restauró como `postgres`, transfiera la propiedad o restaure conectado como el dueño esperado.

Ejemplo:

```sql
REASSIGN OWNED BY postgres TO cosaif_app;
```

No ejecute ese comando en una sesión que incluya objetos ajenos al sistema COSAIF sin revisar su alcance.

### 5. Regenerar clientes y reconciliar esquema

Después de una restauración:

```bash
npx prisma generate --schema prisma/schema.prisma
npm run prisma:torno:generate
npm run prisma:torreon:generate
npm run prisma:comercial:generate
```

Genere solo los clientes presentes en el servidor, pero hacerlo para los cuatro es seguro porque `generate` no modifica datos.

Si el dump es más antiguo que el código actual:

1. genere otro dump del estado recién restaurado;
2. ejecute el `db push` únicamente del dominio restaurado;
3. deténgase si Prisma advierte pérdida de datos;
4. compile y pruebe antes de reabrir tráfico.

### 6. Restaurar uploads y reiniciar

```bash
tar -xzf /ruta/uploads_FECHA.tar.gz -C /ruta/a/BackCosaif
```

Revise propietario y permisos del directorio. Reinicie en orden:

1. msTorno;
2. ms_torreon;
3. msComercial;
4. API principal;
5. frontend.

### 7. Validación posterior

- Healthchecks de los cinco procesos.
- Inicio de sesión.
- Listado de empresas, usuarios y localidades.
- Lectura de movimientos naturales.
- Lectura de arrastres de Torreón.
- Historial de Torno y cambios de navajas.
- Contratos/paquetes de Comercial.
- Apertura y resolución controlada de un incidente de prueba.
- Recepción de una notificación FCM.
- Descarga de un reporte.

## Actualización de una instalación existente

Orden recomendado para desplegar una nueva versión:

1. Registre el commit o versión actual.
2. Genere dumps de las cuatro bases y respaldo de `uploads/`.
3. Verifique al menos el listado de cada dump.
4. Descargue el código nuevo.
5. Ejecute `npm ci` en backend y frontend si cambió el lockfile.
6. Compare los cuatro `schema.prisma` con la versión desplegada.
7. Ejecute los cuatro `generate`.
8. Pruebe cada `db push` requerido sobre copias restauradas.
9. Compile backend, microservicios y frontend.
10. Ejecute pruebas.
11. Abra ventana de mantenimiento y detenga escrituras.
12. Genere un segundo respaldo inmediato.
13. Aplique únicamente los `db push` que correspondan.
14. Reinicie en orden y ejecute smoke tests.
15. Conserve código anterior, dumps y base renombrada hasta confirmar estabilidad.

No ejecute todos los `db push` por costumbre si solo cambió un dominio. La salida de Git y la comparación de schemas deben determinar qué base necesita sincronización.

## Verificación y pruebas

### Backend y microservicios

```bash
npm run build
npm run build:torno
npm run build:torreon
npm run build:comercial
```

Pruebas disponibles:

```bash
npm run test:realtime
npm run test:fcm:natural
npm run test:fcm:service
npm run test:fcm:torreon
npm run test:comercial
npm run test:comercial:excel
```

El script genérico `npm test` todavía no representa la suite del proyecto; use los scripts específicos.

### Frontend

```bash
cd /ruta/a/eco/CosaifWeb
npx tsc --noEmit --incremental false
npm run lint
npm run build
```

### Revisión de base

```bash
psql "$DATABASE_URL" -c "select current_database(), current_user, now();"
psql "$TORNO_DATABASE_URL" -c "select current_database(), current_user, now();"
psql "$TORREON_DATABASE_URL" -c "select current_database(), current_user, now();"
psql "$COMERCIAL_DATABASE_URL" -c "select current_database(), current_user, now();"
```

## Problemas frecuentes

### Prisma P1000: credenciales inválidas

Mensaje típico:

```text
Authentication failed against database server
```

Revisión:

1. Confirme usuario, contraseña, host, puerto y nombre de base.
2. Pruebe la misma URL con `psql`.
3. Revise caracteres especiales sin codificar.
4. Verifique que el microservicio cargue el archivo `.env` correcto.
5. En Comercial local, recuerde que el cargador puede reutilizar las credenciales de `DATABASE_URL`.

### Prisma P1001: servidor inaccesible

- PostgreSQL no está iniciado.
- Host o puerto incorrectos.
- Firewall o contenedor sin red.
- La base está en otra máquina y escucha solo en localhost.

### Prisma P2022: falta una columna

Ejemplo:

```text
The column Cambio.status does not exist in the current database
```

El cliente Prisma y la base no tienen la misma estructura. Confirme primero que la URL apunta a la base correcta. Después:

1. respalde esa base;
2. ejecute el `db push` del dominio correcto;
3. ejecute su `generate`;
4. reinicie el proceso.

Para `Cambio.status`, el dominio correcto es msTorno, no la base principal.

### Valor inválido para un enum

Ejemplo:

```text
invalid input value for enum "Rol": "COMERCIAL"
```

El código conoce un valor que PostgreSQL todavía no tiene. Respalde la base principal, sincronice `prisma/schema.prisma`, regenere el cliente y reinicie la API.

### Comercial funciona en analítica pero no muestra contratos

- Confirme `http://127.0.0.1:3004/health`.
- Verifique `COMERCIAL_DATABASE_URL`.
- Compruebe que `COMERCIAL_SERVICE_ID` y `COMERCIAL_SERVICE_SECRET` sean iguales en API y microservicio.
- Revise que el cliente operativo tenga una ficha en Comercial.

### Error 401 entre API y microservicio

- Torno: el `TORNO_SERVICE_TOKEN` debe coincidir.
- Torreón: ID, secreto, timestamp y reloj del servidor deben coincidir.
- Comercial: ID y secreto deben coincidir; el actor debe ser `ADMINISTRADOR` o `COMERCIAL`.
- No coloque `/api` dos veces en la URL base.

### Las notificaciones web no llegan

- Use HTTPS o `localhost`.
- Verifique permiso del navegador para el origen exacto.
- Confirme la llave VAPID pública del mismo proyecto Firebase.
- Compruebe las variables `NEXT_PUBLIC_FIREBASE_*` antes del build.
- Verifique que la credencial Firebase Admin pertenezca al mismo proyecto.
- Revise que el service worker `/firebase-messaging-sw.js` responda.
- En macOS/Windows revise también permisos de notificaciones del sistema operativo y modo no molestar.

### Puerto ocupado

Use `lsof` y `ps` como se describe en [Si un puerto ya está ocupado](#si-un-puerto-ya-está-ocupado). No cierre un proceso hasta saber a quién pertenece.

### El reporte PDF falla en servidor

Configure Chrome/Chromium y una de estas variables:

```env
CHROME_BIN=/usr/bin/google-chrome
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

Verifique permisos del usuario que ejecuta la API.

## Seguridad y lista de salida a producción

### Seguridad mínima

- [ ] `.env`, dumps, `.pgpass`, certificados privados y credenciales Firebase no están en un repositorio público.
- [ ] Cualquier secreto expuesto anteriormente fue rotado.
- [ ] JWT, Torno, Torreón, Comercial y Offline usan secretos distintos.
- [ ] PostgreSQL no está publicado libremente en Internet.
- [ ] Puertos 3002, 3003 y 3004 están limitados a localhost o red privada.
- [ ] El frontend usa HTTPS válido.
- [ ] El servidor sincroniza hora mediante NTP.
- [ ] El usuario del proceso no es root.
- [ ] `uploads/` tiene permisos mínimos y respaldo.
- [ ] Los logs tienen rotación y no registran tokens ni contraseñas.

### Base de datos

- [ ] Las cuatro URL apuntan a cuatro bases correctas.
- [ ] Las bases shadow no contienen datos operativos.
- [ ] Existe respaldo previo al despliegue.
- [ ] `pg_restore --list` funciona para cada dump.
- [ ] Se hizo una restauración de prueba reciente.
- [ ] No se usó `--force-reset` ni `--accept-data-loss`.

### Aplicación

- [ ] Los cuatro clientes Prisma fueron generados.
- [ ] Backend y tres microservicios compilan.
- [ ] Frontend compila con las variables de producción.
- [ ] Healthchecks responden.
- [ ] Login y permisos por rol funcionan.
- [ ] Naturales, arrastre, Torno y Comercial leen datos.
- [ ] FCM móvil y web fueron probados.
- [ ] Reportes PDF/Excel se descargan.
- [ ] Existe un procedimiento documentado para volver a la versión y base anteriores.

## Mapa funcional rápido

### API principal

- Rutas: `src/Rutas/**`
- Modelos y reglas: `src/models/**`
- Reportería: `src/reporteria/**`
- Notificaciones: `src/services/NotificadorFCM.ts` y reglas FCM en `src/services/*FcmRouting.ts`
- Tiempo real: `src/realtime/**`
- Offline: `src/offline/**`

### Movimientos e incidentes

- Los movimientos generales viven en la base principal.
- Incidentes abiertos pueden detener movimientos y afectar rondas.
- Las transiciones importantes notifican por FCM y publican eventos en tiempo real.
- Los movimientos de Torno se coordinan desde la API, pero el detalle de Torno vive en su propia base.
- Naturales y arrastres de Torreón viven en la base de Torreón.

### Comercial

- Solo `ADMINISTRADOR` y `COMERCIAL` acceden al CRM.
- Clientes, contratos, paquetes y cortes viven exclusivamente en `cosaif_comercial`.
- Los IDs de empresa/localidad/movimiento son referencias externas, no llaves foráneas hacia la base operativa.
- La reportería puede consolidar principal, Torreón y servicios sin editar la operación.

---

Ante una duda durante una intervención de base, la decisión segura es detenerse, confirmar la URL destino y producir un dump antes de continuar.
