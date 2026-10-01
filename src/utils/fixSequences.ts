import { prisma } from '../lib/prisma';

async function fixSequences() {
  console.log('Starting sequence fix...');
  
  const tables = [
    'Empresa',
    'Localidad',
    'Usuario',
    'FcmToken',
    'Via',
    'SeccionVia',
    'Movimiento',
    'Incidente',
    'Ronda',
    'ServicioCola',
    'Actualizacion', // Mapped to 'actualizacion' below
    'TornoT',
    'LavadoT',
    'Navaja',
    'IncidenteTorno',
    'IncidenteLavado',
    'SeguimientoTorno',
    'SeguimientoLavado',
    'MedidasTornoI',
    'MedidasTornoF'
  ];

  for (const table of tables) {
    const tableName = table === 'Actualizacion' ? 'actualizacion' : table;
    try {
      // Postgres query to sync sequence
      // pg_get_serial_sequence returns the sequence name for a column
      // We assume the ID column is 'id'
      await prisma.$executeRawUnsafe(`
        SELECT setval(
          pg_get_serial_sequence('"${tableName}"', 'id'),
          COALESCE((SELECT MAX(id) FROM "${tableName}"), 0) + 1,
          false
        );
      `);
      console.log(`✅ Sequence fixed for table: ${tableName}`);
    } catch (error: any) {
      console.error(`❌ Failed to fix sequence for table: ${tableName}`, error.message);
    }
  }

  console.log('Finished sequence fix.');
}

fixSequences()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
