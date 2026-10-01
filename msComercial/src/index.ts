const { loadCommercialEnvironment } = require("../configureDatabase.cjs");
loadCommercialEnvironment();

const { iniciarServidorComercial } = require("./Servidor");
void iniciarServidorComercial().catch(() => {
  console.error("msComercial no pudo iniciar; verifica configuración, conexión y migraciones");
  process.exitCode = 1;
});
