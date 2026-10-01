# msComercial

Microservicio responsable del dominio comercial de COSAIF. Tiene su propia base PostgreSQL y no modifica directamente movimientos, incidentes, lavados ni torneados.

## Responsabilidades

- ficha comercial y contactos del cliente;
- contratos y ordenes de compra;
- tarifas con vigencia y fotografia del precio acordado;
- paquetes contratados por cliente, patio, origen y servicio;
- cortes contractuales por periodo y saldo manual opcional;
- planes de movimientos y servicios;
- analitica unificada de naturales, arrastre, lavado y torneado;
- reportes Excel ejecutivos, contractuales, de cobranza y auditoria.

La autenticacion de personas sigue perteneciendo al backend principal. `CosaifWeb1` llama a `/comercial/*` en el backend normal; este valida el JWT y firma la peticion interna hacia `msComercial` incluyendo usuario y rol.

## Aislamiento de datos

`COMERCIAL_DATABASE_URL` debe apuntar a una base nueva, por ejemplo `cosaif_comercial`. Nunca debe reutilizar `DATABASE_URL`, `TORNO_DATABASE_URL` ni la base de Torreon.

La base comercial guarda `empresaId`, `localidadId` y `movimientoId` como referencias externas. No existen llaves foraneas hacia la DB operativa. Los importes aprobados se guardan como fotografias para que un cambio futuro de tarifa no altere un plan historico.

## Preparacion local

1. Crear la base PostgreSQL exclusiva. Puede usar un usuario dedicado o, en desarrollo local, reutilizar el usuario de la base operativa:

   ```sql
   CREATE USER cosaif_comercial WITH PASSWORD 'UNA_CLAVE_SEGURA';
   CREATE DATABASE cosaif_comercial OWNER cosaif_comercial;
   ```

2. Copiar `.env.comercial.example` a `.env.comercial` y reemplazar credenciales y secreto. Si ambas URLs son locales, los scripts reutilizan de forma segura el usuario y la contraseña de `DATABASE_URL`, pero conservan el nombre `cosaif_comercial`.
3. Agregar al `.env` del backend principal las mismas variables `COMERCIAL_MS_URL`, `COMERCIAL_SERVICE_ID` y `COMERCIAL_SERVICE_SECRET`.
4. Generar el cliente y sincronizar solamente la base comercial:

   ```bash
   npm run prisma:comercial:generate
   npm run prisma:comercial:push
   ```

5. Ejecutar, en terminales separadas:

   ```bash
   npm run dev:comercial
   npm run dev
   ```

El servicio usa por defecto `127.0.0.1:3004`. Ninguno de estos comandos se ejecuta automaticamente.

## API expuesta por el backend principal

- `GET|POST /comercial/clientes`
- `GET|PATCH /comercial/clientes/:id`
- `POST /comercial/clientes/:id/contactos`
- `PATCH /comercial/clientes/:id/contactos/:contactoId`
- `GET|POST /comercial/contratos`
- `GET|PATCH /comercial/contratos/:id`
- `GET|POST /comercial/tarifas`
- `PATCH /comercial/tarifas/:id`
- `GET|POST /comercial/planes`
- `GET|PATCH /comercial/planes/:id`
- `POST /comercial/planes/:id/detalles`
- `PATCH|DELETE /comercial/planes/:id/detalles/:detailId`
- `GET|POST /comercial/paquetes`
- `GET|PATCH /comercial/paquetes/:id`
- `GET /comercial/cobranza/resumen`
- `GET|POST /comercial/cobranza/cortes`
- `GET|PATCH /comercial/cobranza/cortes/:id`
- `POST /comercial/cobranza/cortes/:id/pagos`
- `GET|POST /comercial/cobranza/gestiones`
- `GET /comercial/analitica`
- `POST /comercial/excel`

Solo `ADMINISTRADOR` y `COMERCIAL` tienen acceso. Las altas de clientes validan que `empresaId` exista en la DB operativa antes de crear su ficha comercial.

## Reglas de seguridad de negocio

- Un plan no puede aprobarse sin conceptos ni precios.
- Si el cliente exige orden de compra, el plan no puede aprobarse sin ella.
- Un plan aprobado queda congelado; solo permite avanzar de estado y agregar notas.
- Una tarifa usada por un plan aprobado no cambia de precio: se desactiva y se crea otra version.
- No se aceptan dos versiones activas del mismo concepto con vigencias traslapadas.
- Las reglas indican qué estados cuentan por contrato (`CONCLUIDO`, `CANCELADO`, `DETENIDO`, etc.), cliente, localidad, origen y servicio.
- El control principal es volumen por periodo. No se calcula dinero automáticamente; el saldo solo aparece si Comercial lo captura manualmente.
- Los pagos pueden ser parciales y el saldo se calcula a partir del corte, sin alterar operaciones.
- Naturales, naturales Torreon y arrastre se leen desde sus bases operativas, pero Comercial nunca las modifica.
- Los paquetes separan origen (`NATURAL` o `ARRASTRE`), servicio, unidad y periodicidad semanal, mensual, bimestral, semestral o anual.
- Las llamadas internas usan HMAC, marca de tiempo y nonce contra repeticion. La firma incluye ID y rol del usuario.

## Verificacion sin base de datos

```bash
npm run prisma:comercial:generate
npm run build:comercial
npm run test:comercial
npm run test:comercial:excel
```

## Activacion y alcance

Comercial no usa archivos SQL ni la carpeta `prisma/migrations`. Antes de ejecutar `npm run prisma:comercial:push`, confirme que `COMERCIAL_DATABASE_URL` apunta a una base exclusiva. `generate` solo actualiza el cliente Prisma; `push` sincroniza el esquema con PostgreSQL.

La pantalla comercial sigue mostrando la analitica operativa si `msComercial` no esta disponible. Contratos, paquetes, cortes, pagos y saldos se habilitan cuando el servicio y su base independiente estan activos.

## Ambientes del frontend comercial

El rol `COMERCIAL` tiene navegacion y rutas propias; no existe un componente monolitico que mezcle todo:

- `/comercial/reporte-general`: semana, mes, bimestre, semestre o año, siempre separable por localidad;
- `/comercial/clientes`: expedientes y contactos;
- `/comercial/contratos`: vigencias, ordenes de compra, reglas y dias de corte;
- `/comercial/paquetes`: incluido, consumido y excedentes por cliente, patio, origen, servicio y estados configurables;
- `/comercial/cobranza`: cierres de periodo y saldo manual opcional;
- `/comercial/reporteria`: constructor de Excel donde la usuaria selecciona hojas, columnas, cliente, localidad, periodo y tipo de operacion.

La API de Excel acepta `sections` y `operationColumns`; el servidor valida ambas listas antes de generar el archivo.
