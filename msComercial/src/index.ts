const { loadCommercialEnvironment } = require("../configureDatabase.cjs");
loadCommercialEnvironment();

const { iniciarServidorComercial } = require("./Servidor");
iniciarServidorComercial();
