Centro en salida y llegada de movimientos naturales de Torreón

Estado: preparada; no aplicada a ninguna base de datos.

Requiere torreon-operativo-20261008 y torreon-polos-20261012.
Amplía los dos CHECK existentes para admitir NORTE, CENTRO y SUR.
Conserva los registros y los NULL históricos; no cambia GDL, arrastres,
secciones ni el campo polo heredado. No modifica migraciones anteriores.

Revisión local, sin conectar a la base:
node scripts/security-migrate.cjs --version=torreon-polo-centro-20261013 --target=torreon

Despliegue: aplicar en la base de Torreón antes de publicar backend, web y APK
que permitan capturar Centro. El runner ejecuta el cambio en una transacción.
node scripts/security-migrate.cjs --version=torreon-polo-centro-20261013 --target=torreon --apply
node scripts/security-migrate.cjs --version=torreon-polo-centro-20261013 --target=torreon --check

Verificar captura Norte→Centro, Centro→Sur y Centro→Centro; edición parcial
de un polo sin alterar el otro; consulta del recorrido y respaldo offline.
