const path = require("path");
const dotenv = require("dotenv");

function isLocalHost(hostname) {
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
}

function loadCommercialEnvironment(options = {}) {
  const root = path.resolve(__dirname, "..");
  dotenv.config({ path: path.join(root, ".env"), override: false });
  const loaded = dotenv.config({ path: path.join(__dirname, ".env.comercial"), override: true });
  if (loaded.error) throw loaded.error;

  const commercialRaw = process.env.COMERCIAL_DATABASE_URL;
  const operationalRaw = process.env.DATABASE_URL;
  if (!commercialRaw) throw new Error("COMERCIAL_DATABASE_URL no configurada");

  let reusedLocalCredentials = false;
  if (operationalRaw) {
    const commercial = new URL(commercialRaw);
    const operational = new URL(operationalRaw);
    if (isLocalHost(commercial.hostname) && isLocalHost(operational.hostname)) {
      commercial.username = operational.username;
      commercial.password = operational.password;
      commercial.hostname = operational.hostname;
      commercial.port = operational.port;
      process.env.COMERCIAL_DATABASE_URL = commercial.toString();
      reusedLocalCredentials = true;
    }
  }

  if (options.announce && reusedLocalCredentials) {
    const target = new URL(process.env.COMERCIAL_DATABASE_URL);
    process.stdout.write(`Comercial local: credenciales reutilizadas; base aislada ${target.pathname.slice(1)}\n`);
  }
  return { reusedLocalCredentials };
}

module.exports = { loadCommercialEnvironment };
