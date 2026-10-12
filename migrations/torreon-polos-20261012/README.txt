Polos de salida y llegada independientes — movimientos naturales de Torreón

Estado: migración preparada. No se ha ejecutado sobre ninguna base de datos.

Alcance
- Sólo movimiento_torreon_ferro en la base del microservicio Torreón.
- Agrega polo_origen y polo_destino TEXT NULL, limitados a NORTE/SUR cuando existen.
- No modifica Guadalajara, arrastres, secciones, grupos ni los campos anteriores.
- No tiene valores predeterminados ni rellena registros históricos. El polo único
  no indica ambos extremos y permanece intacto; sus nuevos campos quedan NULL.

Contrato
- POST movimientos y movimientos/lote requieren poloOrigen y poloDestino.
- PATCH acepta cada campo opcional NORTE/SUR. Cambiar sólo uno conserva el otro.
  Editar instrucciones de un registro antiguo no obliga a completar polos NULL.
- Leer devuelve cada campo independiente; NULL significa «No registrado».
  Ningún cliente debe inferirlo desde polo, instrucciones u otro extremo.
- polo continúa como campo heredado compatible; no satisface la nueva captura.
- El identificador de reintento contempla ambos polos. Reutilizarlo cambiando
  cualquiera de ellos devuelve conflicto en lugar de repetir una solicitud.

Secuencia de despliegue (operador autorizado; estos pasos no se ejecutaron aquí)
1. Respaldar y comprobar que el destino es exclusivamente la base de Torreón,
   con la migración operativa torreon-operativo-20261008 ya instalada.
2. Revisar SQL y checksum sin conectar a la base:
   node scripts/security-migrate.cjs --version=torreon-polos-20261012 --target=torreon
3. Aplicar la migración aditiva antes de reiniciar cualquier proceso que cargue
   el nuevo Prisma Client (gateway, workers y microservicio):
   node scripts/security-migrate.cjs --version=torreon-polos-20261012 --target=torreon --apply
   node scripts/security-migrate.cjs --version=torreon-polos-20261012 --target=torreon --check
   El runner usa TORREON_DATABASE_URL y controla destino/checksum/transacción.
4. Generar el cliente y compilar el gateway y microservicio en el paquete:
   npm run prisma:torreon:generate
   npm run build:torreon
   npm run build
5. Publicar y reiniciar API/gateway/workers con el esquema ya migrado. Después
   publicar web y APK compatibles. Coordinar la actualización: capturas antiguas
   que envíen sólo polo ya no cumplen el contrato de las solicitudes nuevas.
6. Verificar captura NORTE→SUR, lectura en los cuatro roles, edición parcial,
   lote/reintento y un registro histórico con ambos polos «No registrado».

Validación local
Las pruebas con mocks incluyen persistencia asimétrica, edición que conserva
secciones y polos, reintentos, lote y legacy sin inferencia. Los tipos del cliente
se regeneran localmente sin consultar la base. La prueba PostgreSQL operativa,
si se ejecuta posteriormente, exige una base desechable nombrada
torreon_operativo_test (con sufijo opcional) y ambas migraciones ya aplicadas.
No usar db push como sustituto del despliegue ni borrar columnas al revertir código.
