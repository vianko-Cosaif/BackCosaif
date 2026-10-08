Torreón: modelo operativo natural, versión 1.1 del 7 de octubre de 2026

ALCANCE
Solo movimientos naturales del microservicio Torreón y sus pantallas web/móviles.
Guadalajara conserva sus rondas. Arrastres, Torno y Lavado conservan sus flujos.
Los registros históricos de rondas Torreón quedan disponibles para consulta.

REGLAS IMPLEMENTADAS
- Captura atómica de 1 a 5 solicitudes completas e independientes.
- Remolcada exige Empujar/Jalar y el número de otra locomotora que remolca.
  Esa locomotora no genera una solicitud adicional.
- Cola: reanudaciones por fecha de habilitación, prioridades manuales en el
  orden seleccionado y solicitudes ordinarias por fecha de recepción.
- Coordinación/supervisión ordena y asigna; En conjunto es una elección
  explícita para dos o más solicitudes. Subir varias solicitudes no las agrupa.
- Una unidad por maquinista. Un conjunto inicia y se detiene completo; cada
  solicitud conserva su ID, evidencia y registro de conclusión.
- Los incidentes no vencen, no cancelan después de tres reportes y no crean
  solicitudes de reemplazo. La unidad detenida queda fuera de la cola disponible.
- Confirmar todas las soluciones habilita LISTA_REANUDAR; el maquinista registra
  la reanudación. Nunca interrumpe el trabajo que ya tiene en curso.
- La bitácora registra actor, rol, fecha y acciones. Los avisos de asignación
  y reanudación se envían al maquinista asignado.

ACTIVACIÓN
Esta entrega no ejecuta migraciones contra la base operativa ni publica servicios.
Coordinar la actualización del gateway principal, microservicio Torreón, web y app.
Requiere la migración security-20260907 de Torreón para el outbox durable.
Si ya está aplicada, verificarla con el mismo runner; no modificar su SQL.

1. Preparar respaldo y detener temporalmente escrituras de movimientos naturales
   Torreón durante el cambio de versión. Retirar el proceso anterior que ejecutaba
   vencimientos de incidentes.
2. Configurar TORREON_DATABASE_URL para el entorno que se va a actualizar y psql.
   Vista previa sin conexión ni cambios:
     npm run migrate:torreon:operativo
   Aplicar exclusivamente a la base Torreón:
     npm run migrate:torreon:operativo -- --apply
   Verificar checksum aplicado:
     npm run migrate:torreon:operativo -- --check
   El runner guarda versión/checksum y omite la segunda aplicación.
3. Publicar juntos gateway y microservicio compatibles con el cliente Prisma
   actualizado; después publicar web y distribuir la nueva app.
4. Verificar captura, prioridad independiente, conjunto explícito, incidencia,
   solución, reanudación y conclusión por solicitud en Torreón. Comprobar una
   operación de Guadalajara con sus rondas existentes.

La migración es aditiva: conserva IDs, campos originales, fotos e incidentes.
Crea una unidad individual por solicitud histórica; no infiere conjuntos.
Una pausa histórica sin impedimentos abiertos queda lista para reanudar; sus
movimientos siguen detenidos hasta que el maquinista registre la reanudación.
Una pausa con impedimentos abiertos conserva su estado detenido.
Los clientes antiguos no deben seguir usando mutaciones de rondas Torreón o
cierres por tiempo: esas operaciones devuelven un conflicto explícito.

API DEL NUEVO FLUJO (a través del gateway autenticado /torreon)
POST  /movimientos/lote       { clientRequestId, movimientos: [1..5] }
GET   /cola                  ?localidadId=&historial=true|false
GET   /cola/siguiente         ?localidadId=
PATCH /cola/priorizar         { unidadIds: [...], enConjunto: true|false }
PATCH /cola/:id/asignar       { operadorId }
POST  /cola/:id/iniciar       { fotosPorMovimiento: [{ movimientoId, fotos }] }
POST  /movimientos/:id/incidentes  { motivo, fotos }
PATCH /incidentes/:id/resolver?tipo=NATURAL  { solucion }
POST  /cola/:id/reanudar      {}
POST  /cola/:id/finalizar     { fotosPorMovimiento: [{ movimientoId, fotos }] }
GET   /cola/:id/historial
GET   /incidentes/:id/fotos/:fotoId?tipo=NATURAL

El actor y rol proceden de la sesión. Origen/destino y secciones se verifican
contra el catálogo principal de Torreón. El servidor decide turno y asignación.
Inicio, pausa, reanudación y cierre requieren conexión para validar el turno;
las reglas y el paquete offline de Guadalajara conservan su implementación.

VALIDACIÓN REAL CON BASE DESECHABLE
tests/torreon-operativo-integration.cjs exige un nombre de base exclusivo de
pruebas torreon_operativo_test (o sufijo). No debe ejecutarse en producción.
Sobre el esquema previo vacío, sembrar datos históricos con --seed-legacy,
aplicar las dos migraciones con el runner y ejecutar la prueba sin ese argumento.
TORREON_TEST_DATABASE_URL y TORREON_TEST_BASELINE permiten aislar cada ejecución.
Se verifican preservación histórica, lote/rollback/reintento, orden, agrupación,
evidencia, pausas persistentes, múltiples impedimentos, FIFO de reanudaciones,
reasignación, IDs originales, bitácora y exclusión de inicios concurrentes.
